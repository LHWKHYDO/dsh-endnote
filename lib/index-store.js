/**
 * EndNote 文献索引的加载、归一化与路径解析。
 *
 * 支持两种索引来源：
 *  - 插件自建 / 旧版 JSON 索引（endnote_index.json，含摘要、关键词、分组、附件相对路径）
 *  - 自定义 CSV 索引（编号,简洁名称,类型,备注,本地路径,年份,作者,期刊,DOI,标题来源,处理状态,分组）
 *
 * 只读：本模块绝不写入 EndNote 库，缓存产物只落在插件的 dataDir。
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

/**
 * 可选的「历史索引」后备位置（默认空）。
 * 想复用旧索引可填绝对路径，或在配置里显式设置 indexFile；这里不内置任何本机路径。
 */
export const DEFAULT_INDEX_CANDIDATES = []

/**
 * 默认 EndNote 库根目录：`~/Documents/My EndNote Library.Data`（常见安装位置）。
 * 该目录不存在时请在配置页选择实际库目录（`.Data` 文件夹）。
 */
export const DEFAULT_LIBRARY_PATH = path.join(os.homedir(), 'Documents', 'My EndNote Library.Data')

/**
 * 解开配置值的包裹：声明为 `.volatile()` 的字段在 apply 里以 `{ get() }` 访问器
 * 形式传入（值可在不重启插件的情况下原地更新），这里统一取其当前值。
 * @param {unknown} value
 * @returns {unknown}
 */
function unbox(value) {
  if (value && (typeof value === 'object' || typeof value === 'function') && typeof value.get === 'function') {
    try {
      return value.get()
    } catch {
      return undefined
    }
  }
  return value
}

/**
 * 规范化多库列表：只保留带路径的对象项，缺名称时用目录名，按路径去重（大小写不敏感）。
 * @param {unknown} value
 * @returns {{ name: string, path: string }[]}
 */
export function normalizeLibraries(value) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  const out = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const libPath = typeof item.path === 'string' ? item.path.trim() : ''
    if (!libPath) continue
    const key = libPath.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const name = typeof item.name === 'string' && item.name.trim() ? item.name.trim() : path.basename(libPath)
    out.push({ name, path: libPath })
  }
  return out
}

/** 库路径 → 稳定短键，用于每库独立的索引文件名。 */
function libraryKey(libraryPath) {
  const norm = path.resolve(String(libraryPath)).replace(/[\\/]+/g, '/').toLowerCase()
  return crypto.createHash('sha1').update(norm).digest('hex').slice(0, 10)
}

/**
 * 当前库应写入（也优先读取）的索引文件：
 * 显式 indexFile 优先；否则 dataDir 下每库一份 `endnote_index_<key>.json`，
 * 多库切换时互不串档。
 * @param {ResolvedConfig} config
 * @returns {string}
 */
export function preferredIndexFile(config) {
  if (config.indexFile) return config.indexFile
  return path.join(config.dataDir, `endnote_index_${libraryKey(config.libraryPath)}.json`)
}

/** 旧版单文件索引是否属于当前库（lib_root 匹配；旧索引没有 lib_root 时按可用处理）。 */
function legacyIndexMatches(file, libraryPath) {
  try {
    const text = fs.readFileSync(file, 'utf8')
    const data = JSON.parse(text.charAt(0) === '﻿' ? text.slice(1) : text)
    const root = String(data && data.lib_root ? data.lib_root : '')
    if (!root) return true
    const norm = (value) => path.resolve(value).replace(/[\\/]+/g, '/').toLowerCase()
    return norm(root) === norm(libraryPath)
  } catch {
    return false
  }
}

/**
 * 解析生效配置，缺省值集中在这里。
 * @param {Record<string, unknown> | undefined} raw 插件行传入的原始配置
 * @param {string} packageDir 插件包目录
 * @returns {ResolvedConfig}
 */
export function resolveConfig(raw, packageDir) {
  const config = raw && typeof raw === 'object' ? raw : {}
  const str = (key, fallback) => {
    const value = unbox(config[key])
    if (value === undefined || value === null || value === '') return fallback
    if (typeof value !== 'string') throw new TypeError(`dsh-endnote: 配置项 ${key} 必须是字符串`)
    return value.trim()
  }
  const bool = (key, fallback) => {
    const value = unbox(config[key])
    if (value === undefined || value === null) return fallback
    return value === true || value === 'true'
  }
  const num = (key, fallback) => {
    const value = unbox(config[key])
    if (value === undefined || value === null || value === '') return fallback
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed <= 0) throw new TypeError(`dsh-endnote: 配置项 ${key} 必须是正数`)
    return parsed
  }
  const dataDir = str('dataDir', path.join(packageDir, '.data'))
  return {
    libraryPath: str('libraryPath', DEFAULT_LIBRARY_PATH),
    libraries: normalizeLibraries(unbox(config.libraries)),
    indexFile: str('indexFile', ''),
    dataDir,
    pythonPath: str('pythonPath', 'python'),
    openInSidebar: bool('openInSidebar', true),
    limit: num('limit', 8),
    packageDir,
  }
}

/**
 * 选出实际使用的索引文件。
 * 顺序：显式 indexFile → 每库独立索引 `endnote_index_<key>.json` →
 * dataDir 旧单文件索引（仅当其 lib_root 属于当前库）→ 项目内既有索引。
 * @param {ResolvedConfig} config
 * @returns {string | undefined}
 */
export function pickIndexFile(config) {
  if (config.indexFile) return config.indexFile
  const perLib = preferredIndexFile(config)
  if (fs.existsSync(perLib)) return perLib
  const legacy = path.join(config.dataDir, 'endnote_index.json')
  if (fs.existsSync(legacy) && legacyIndexMatches(legacy, config.libraryPath)) return legacy
  return DEFAULT_INDEX_CANDIDATES.find((file) => fs.existsSync(file))
}

/**
 * 索引仓库：按 mtime + size 缓存，文件变化后自动重载。
 */
export class IndexStore {
  /** @param {ResolvedConfig} config */
  constructor(config) {
    this.config = config
    this.file = pickIndexFile(config)
    this.mtimeKey = ''
    this.index = null
  }

  /** @returns {{ file: string | undefined, builtAt: string, libRoot: string, entries: Entry[], stats: Record<string, unknown> }} */
  load() {
    if (!this.file) return { file: undefined, builtAt: '', libRoot: this.config.libraryPath, entries: [], stats: {} }
    let stat
    try {
      stat = fs.statSync(this.file)
    } catch {
      return { file: this.file, builtAt: '', libRoot: this.config.libraryPath, entries: [], stats: {} }
    }
    const key = `${stat.mtimeMs}:${stat.size}`
    if (this.index && this.mtimeKey === key) return this.index
    const text = fs.readFileSync(this.file, 'utf8').replace(/^\uFEFF/, '')
    const parsed = this.file.toLowerCase().endsWith('.csv') ? parseCsvIndex(text) : parseJsonIndex(text)
    const entries = parsed.entries.map((entry) => withResolvedFiles(entry, parsed.libRoot, this.config.libraryPath))
    this.index = {
      file: this.file,
      builtAt: parsed.builtAt,
      libRoot: parsed.libRoot || this.config.libraryPath,
      entries,
      stats: {
        ...parsed.stats,
        entries: entries.length,
        withPdf: entries.filter((entry) => entry.files.some((file) => file.exists)).length,
      },
    }
    this.mtimeKey = key
    return this.index
  }

  /** 强制下次 load 重新读盘。 */
  invalidate() {
    this.mtimeKey = ''
    this.index = null
  }
}

/**
 * @typedef {object} ResolvedConfig
 * @property {string} libraryPath 当前生效库（一键切换写这个字段）
 * @property {{ name: string, path: string }[]} libraries 已存库列表，第 1 个为主库
 * @property {string} indexFile
 * @property {string} dataDir
 * @property {string} pythonPath
 * @property {boolean} openInSidebar
 * @property {number} limit
 * @property {string} packageDir
 */

/**
 * @typedef {object} IndexFile
 * @property {string} rel EndNote PDF 目录下的相对路径（/ 分隔）
 * @property {string} path 解析后的绝对路径
 * @property {boolean} exists 磁盘上是否存在
 */

/**
 * @typedef {object} Entry
 * @property {number} id
 * @property {string} title
 * @property {string} authors
 * @property {string} year
 * @property {string} journal
 * @property {string} doi
 * @property {string} type
 * @property {string[]} groups
 * @property {string} keywords
 * @property {string} abstract
 * @property {boolean|null} read EndNote 已读状态；null=索引未含该字段
 * @property {number} rating 0-5 星
 * @property {number} addedAt 入库时间（epoch 秒，0=未知）
 * @property {number} updatedAt 记录最后更新（epoch 秒，0=未知）
 * @property {number} readAt 读状态最近变更（epoch 秒，0=未知）
 * @property {IndexFile[]} files
 */

/**
 * JSON 索引解析（插件自建索引与旧版 endnote_index.json 同构）。
 * @param {string} text
 */
export function parseJsonIndex(text) {
  const data = JSON.parse(text)
  const entries = Array.isArray(data.entries) ? data.entries : []
  return {
    builtAt: String(data.built_at ?? ''),
    libRoot: String(data.lib_root ?? ''),
    stats: data.stats && typeof data.stats === 'object' ? data.stats : {},
    entries: entries.map((raw, i) => ({
      id: Number(raw.id ?? i + 1),
      title: String(raw.title ?? '').trim(),
      authors: String(raw.author ?? raw.authors ?? '').trim(),
      year: String(raw.year ?? '').trim(),
      journal: String(raw.journal ?? '').trim(),
      doi: String(raw.doi ?? '').trim(),
      type: String(raw.type ?? '').trim(),
      groups: Array.isArray(raw.groups) ? raw.groups.map(String) : [],
      keywords: String(raw.keywords ?? '').trim(),
      abstract: String(raw.abstract ?? '').trim(),
      // 读状态三态：true/false 来自 EndNote read_status；null=旧索引未重建，未知。
      read: typeof raw.read === 'boolean' ? raw.read : null,
      rating: Number(raw.rating) || 0,
      addedAt: Number(raw.added_at) || 0,
      updatedAt: Number(raw.updated_at) || 0,
      readAt: Number(raw.read_at) || 0,
      files: (Array.isArray(raw.files) ? raw.files : []).map((file) => ({
        rel: String(file.rel ?? ''),
        path: String(file.abs ?? file.path ?? ''),
        exists: false,
      })),
    })),
  }
}

/**
 * 自定义论文索引 CSV 解析。列：编号,简洁名称,类型,备注,本地路径,年份,作者,期刊,DOI,标题来源,处理状态,分组
 * @param {string} text
 */
export function parseCsvIndex(text) {
  const rows = parseCsv(text)
  if (rows.length < 2) return { builtAt: '', libRoot: '', stats: {}, entries: [] }
  const header = rows[0].map((cell) => cell.trim())
  const at = (name) => header.indexOf(name)
  const col = {
    id: at('编号'),
    title: at('简洁名称'),
    type: at('类型'),
    path: at('本地路径'),
    year: at('年份'),
    authors: at('作者'),
    journal: at('期刊'),
    doi: at('DOI'),
    groups: at('分组'),
  }
  const entries = []
  for (const row of rows.slice(1)) {
    if (!row.length || row.every((cell) => cell.trim() === '')) continue
    const pick = (index) => (index >= 0 ? (row[index] ?? '').trim() : '')
    const absPath = pick(col.path)
    if (!absPath) continue
    entries.push({
      id: Number(pick(col.id)) || entries.length + 1,
      title: pick(col.title),
      authors: pick(col.authors),
      year: pick(col.year),
      journal: pick(col.journal),
      doi: pick(col.doi),
      type: pick(col.type),
      groups: pick(col.groups)
        .split(/[;；]/)
        .map((group) => group.trim())
        .filter(Boolean),
      keywords: '',
      abstract: '',
      read: null,
      rating: 0,
      addedAt: 0,
      updatedAt: 0,
      readAt: 0,
      files: [{ rel: relativeToPdfDir(absPath), path: absPath, exists: false }],
    })
  }
  return { builtAt: '', libRoot: '', stats: { source: 'csv' }, entries }
}

/**
 * 把登记路径换到当前配置的库目录，并核对磁盘存在性。
 * 索引里的绝对路径可能在库搬迁后失效，此时用相对路径在 libraryPath 下重新拼接。
 * @param {Entry} entry
 * @param {string} indexedRoot 建索引时的库根目录
 * @param {string} libraryPath 当前配置的库根目录
 * @returns {Entry}
 */
export function withResolvedFiles(entry, indexedRoot, libraryPath) {
  const files = entry.files.map((file) => {
    const rel = file.rel || relativeToPdfDir(file.path)
    const direct = file.path
    const candidates = []
    if (direct && sameRoot(indexedRoot, libraryPath)) candidates.push(direct)
    if (rel) candidates.push(path.join(libraryPath, 'PDF', ...rel.split('/')))
    if (direct) candidates.push(direct)
    const resolved = candidates.find((candidate) => candidate && fs.existsSync(candidate))
    return { rel, path: resolved || candidates[0] || direct, exists: Boolean(resolved) }
  })
  return { ...entry, files }
}

/** @param {string} left @param {string} right */
function sameRoot(left, right) {
  if (!left || !right) return true
  return path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase()
}

/**
 * 从绝对路径推导 EndNote PDF 目录下的相对路径。
 * @param {string} absPath
 * @returns {string}
 */
export function relativeToPdfDir(absPath) {
  const normalized = absPath.replace(/\\/g, '/')
  const marker = normalized.toLowerCase().lastIndexOf('/pdf/')
  if (marker !== -1) return normalized.slice(marker + 5)
  const parts = normalized.split('/')
  return parts[parts.length - 1]
}

/**
 * 最小 RFC4180 解析：支持引号、转义引号、CRLF 与末尾换行。
 * @param {string} text
 * @returns {string[][]}
 */
export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 1
        } else {
          quoted = false
        }
      } else {
        field += char
      }
      continue
    }
    if (char === '"') {
      quoted = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field.replace(/\r$/, ''))
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }
  if (field !== '' || row.length) {
    row.push(field.replace(/\r$/, ''))
    rows.push(row)
  }
  return rows
}
