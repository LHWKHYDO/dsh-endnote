/**
 * 纯函数检索：不做 I/O，便于单测。
 *
 * 规则与既有 find-endnote-pdf skill 一致——多关键词是 AND 关系，
 * 命中范围覆盖标题、作者、年份、期刊、关键词、DOI、类型、分组、附件路径与摘要。
 * 在此之上加了相关性打分：DOI/标题精确命中优先，其次标题词覆盖、作者、分组、期刊、摘要。
 */

/**
 * 归一化文本：全角转半角、小写、压缩空白。
 * @param {unknown} value
 * @returns {string}
 */
export function normalize(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * 把查询串切成关键词。空白、常见中英文标点都作为分隔符。
 * @param {string} query
 * @returns {string[]}
 */
export function tokenize(query) {
  return normalize(query)
    .split(/[\s,;:，；：、。!?！？/|()（）[\]{}<>"'“”‘’]+/)
    .map((token) => token.trim())
    .filter(Boolean)
}

/** 一条文献可供检索的全部文本。 */
function searchableText(entry) {
  return normalize(
    [
      entry.title,
      entry.authors,
      entry.year,
      entry.journal,
      entry.keywords,
      entry.doi,
      entry.type,
      entry.groups.join(' '),
      entry.files.map((file) => file.rel).join(' '),
      entry.abstract.slice(0, 800),
    ].join(' '),
  )
}

/**
 * 计算一条文献对查询的得分；0 表示不相关。
 * @param {any} entry
 * @param {string} query 原始查询
 * @param {string[]} tokens 归一化关键词
 * @returns {number}
 */
export function scoreEntry(entry, query, tokens) {
  const phrase = normalize(query)
  const title = normalize(entry.title)
  const doi = normalize(entry.doi)
  const authors = normalize(entry.authors)
  const groups = normalize(entry.groups.join(' '))
  const journal = normalize(entry.journal)
  const keywords = normalize(entry.keywords)
  const abstract = normalize(entry.abstract)
  const rel = normalize(entry.files.map((file) => file.rel).join(' '))

  let score = 0
  if (!tokens.length) return 0
  if (doi && phrase === doi) score += 1200
  if (title && phrase === title) score += 1000
  else if (title && title.startsWith(phrase)) score += 700
  else if (title && title.includes(phrase)) score += 600

  for (const token of tokens) {
    if (title.includes(token)) score += 120
    if (authors.includes(token)) score += 60
    if (groups.includes(token)) score += 50
    if (journal.includes(token)) score += 40
    if (keywords.includes(token)) score += 30
    if (rel.includes(token)) score += 20
    if (abstract.includes(token)) score += 10
  }
  return score
}

/**
 * 先按 AND 过滤，再按得分排序。
 * @param {any[]} entries
 * @param {{ query?: string, group?: string, read?: 'read'|'unread'|'', limit?: number }} options
 * @returns {{ hits: { entry: any, score: number }[], total: number, tokens: string[] }}
 */
export function searchEntries(entries, options = {}) {
  const query = String(options.query ?? '')
  const tokens = tokenize(query)
  const groupFilter = normalize(options.group ?? '')
  const readFilter = String(options.read ?? '').toLowerCase()
  const requested = Number(options.limit)
  const limit = Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : 8

  let candidates = entries
  if (groupFilter === '(ungrouped)') {
    candidates = candidates.filter((entry) => entry.groups.length === 0)
  } else if (groupFilter) {
    // 组名优先精确匹配（避免 GWO 误命中 MOGWO），没有精确同名组时退回包含匹配。
    const exact = candidates.filter((entry) => entry.groups.some((group) => normalize(group) === groupFilter))
    candidates = exact.length
      ? exact
      : candidates.filter((entry) => entry.groups.some((group) => normalize(group).includes(groupFilter)))
  }
  // 已读/未读过滤（EndNote read_status）；read=null 的旧索引条目两边都不算。
  if (readFilter === 'read') {
    candidates = candidates.filter((entry) => entry.read === true)
  } else if (readFilter === 'unread') {
    candidates = candidates.filter((entry) => entry.read === false)
  }

  const hits = []
  for (const entry of candidates) {
    if (tokens.length) {
      const haystack = searchableText(entry)
      if (!tokens.every((token) => haystack.includes(token))) continue
    }
    const score = tokens.length ? scoreEntry(entry, query, tokens) : 1
    if (tokens.length && score <= 0) continue
    hits.push({ entry, score })
  }

  hits.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score
    const yearDelta = Number(right.entry.year || 0) - Number(left.entry.year || 0)
    if (yearDelta) return yearDelta
    return left.entry.id - right.entry.id
  })

  return { hits: hits.slice(0, limit), total: hits.length, tokens }
}
