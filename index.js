/**
 * dsh-endnote 主机半边。
 *
 * 职责：
 *  1. 读取可配置的 EndNote 文献库索引（JSON / CSV），提供毫秒级检索；
 *  2. 注册 endnote_search / endnote_open / endnote_recent / endnote_status / endnote_config / endnote_rebuild 六个工具；
 *  3. 向系统提示注入「文献调研先查 EndNote」的规则；
 *  4. 客户端半边据 endnote_open 的调用参数把 PDF 打开在 DSH 右侧栏；
 *  5. 经 webServer 注册「侧栏面板数据 / 打开文件夹」两条同源路由（connection 栅栏；服务缺失时降级）。
 *
 * 严格只读：任何情况下都不写 EndNote 库目录，索引缓存只落在插件 dataDir。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile, spawn } from 'node:child_process'
import z from './vendor/node_modules/@deepseek-ai/schemastery/lib/index.mjs'
import { IndexStore, pickIndexFile, preferredIndexFile, resolveConfig, DEFAULT_LIBRARY_PATH } from './lib/index-store.js'
import { searchEntries } from './lib/search.js'

export const name = 'dsh-endnote'

/** ctx.tools 必需；systemPrompt / webServer / connection 各自缺失时单独降级（缺面板路由不影响工具）。 */
export const inject = ['tools']

/**
 * 生效配置。七个字段全部声明为 `.volatile()`：
 *  - 设置页（插件页 → 配置）与 endnote_config 工具的修改立即生效，不重启插件；
 *  - 运行时这些字段以 `{ get() }` 访问器形式传入 apply，由 resolveConfig 统一解包。
 */
export const Config = z.object({
  /** 当前生效库；配置页「切换」一键写它，工具每次执行前重读。 */
  libraryPath: z.string().default(DEFAULT_LIBRARY_PATH).volatile(),
  /** 已存库列表，第 1 个为主库。 */
  libraries: z.array(z.object({ name: z.string(), path: z.string() })).default([]).volatile(),
  indexFile: z.string().default('').volatile(),
  dataDir: z.string().default('').volatile(),
  pythonPath: z.string().default('python').volatile(),
  openInSidebar: z.boolean().default(true).volatile(),
  limit: z.number().min(1).default(8).volatile(),
})

const packageDir = path.dirname(fileURLToPath(import.meta.url))

/** 侧栏面板数据路由（浏览器同源相对路径 fetch，官方 open-in-app 同款模式）。 */
const PANEL_DATA_PATH = '/dsh-endnote/panel-data'
/** 打开本地文件夹路由（explorer / open / xdg-open）。 */
const OPEN_FOLDER_PATH = '/dsh-endnote/open-folder'
/** JSON 请求体上限（与官方 open-in-app 一致）。 */
const MAX_BODY_BYTES = 64 * 1024

const TEXT = {
  search: '检索本地 EndNote 文献库（严格只读）。多关键词为 AND 关系，命中范围覆盖标题、作者、年份、期刊、关键词、DOI、类型、分组、附件路径与摘要前 800 字；可用 read 参数按 EndNote 已读(read)/未读(unread)状态过滤，结果会标注每条的已读状态与评分。当用户要查文献、找论文、了解某主题的既有研究时，先调用本工具而不是联网搜索。结果里的 path 是本地 PDF 绝对路径，可直接交给 endnote_open 在右侧栏打开。0 命中时走补救链：先联网检索该关键词拿到规范的完整标题/作者/DOI，再用这些字段回查本工具做二次关联；仍无结果或候选有歧义时，向用户列出候选并询问是哪一篇。',
  open: '把本地 EndNote 库里的 PDF 在 DeepSeek Harness 右侧栏打开，便于用户边读原文边对话。path 必须来自 endnote_search 返回的 path。每次成功打开都会记入阅读日志，供 endnote_recent 统计最近阅读。',
  recent: '按最近阅读时间倒序列出文献（markdown 表格：标题、已读状态、评分、最近阅读时间与本地文件夹路径）。数据来源=插件阅读日志（endnote_open 打开过的）+ EndNote 数据库的读状态变更时间；两者都没有的条目不会出现。用户问「最近在读/读过哪些文献」「读了哪些论文」时调用。',
  status: '查看 dsh-endnote 的当前配置与索引状态：库路径、索引文件、条目数、已读数、有多少条带本地 PDF。索引为空或配置指向错误时先调用本工具排查。',
  config: '修改 dsh-endnote 的配置（写入当前 profile 的插件行，全部字段为 volatile，保存后立即生效）。可改 libraryPath（当前库）与 libraries（多库列表，第 1 个为主库，如 [{name,path}]）。改库路径后用 endnote_status 复核，必要时再 endnote_rebuild 重建索引（每个库首次切换后需重建一次）。也可以在侧栏「插件」页的 dsh-endnote 行打开配置页图形化修改。',
  rebuild: '从配置的 EndNote 库重建只读索引（调用插件自带的 Python 解析脚本，只读 sdb/sdb.eni 与 PDF 目录）。库内容有增删后运行。',
}

function textRender(lines) {
  return () => [{ type: 'text', text: lines }]
}

/**
 * 构造一个最小的工具定义（schema + execute + render），无需依赖 dsh-tools。
 * @param {{ name: string, description: string, parameters: object, outputSchema: object, render: (value: any) => string, execute: (args: any, exec: any) => Promise<any> }} spec
 */
function tool(spec) {
  return {
    name: spec.name,
    description: spec.description,
    parameters: spec.parameters,
    output: {
      schema: spec.outputSchema,
      render: (_args, value) => textRender(spec.render(value))(),
      // 客户端半边凭这条 meta 决定是否在右侧栏打开：只有成功执行且开启了 openInSidebar 才会带上 open。
      presentationMeta: (_args, value) =>
        value && typeof value === 'object' && typeof value.path === 'string' && value.path
          ? { plugin: 'dsh-endnote', path: value.path, open: value.openInSidebar === true }
          : {},
    },
    async execute(args) {
      return spec.execute(args ?? {}, arguments)
    },
  }
}

const emptyObject = { type: 'object', properties: {}, additionalProperties: false }

const resultItemSchema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    title: { type: 'string' },
    authors: { type: 'string' },
    year: { type: 'string' },
    journal: { type: 'string' },
    type: { type: 'string' },
    doi: { type: 'string' },
    groups: { type: 'array', items: { type: 'string' } },
    keywords: { type: 'string' },
    abstract: { type: 'string' },
    read: { type: 'string', enum: ['read', 'unread', 'unknown'] },
    rating: { type: 'number' },
    path: { type: 'string' },
    exists: { type: 'boolean' },
  },
  required: ['id', 'title', 'authors', 'year', 'journal', 'type', 'doi', 'groups', 'keywords', 'abstract', 'path', 'exists'],
  additionalProperties: false,
}

function formatEntry(item, index) {
  const head = `${index + 1}. [${item.id}] ${item.title || '（无标题）'} — ${item.authors || '佚名'} (${item.year || 'n.d.'})`
  const status = item.read === 'read' ? '已读✓' : item.read === 'unread' ? '未读○' : ''
  const stars = item.rating > 0 ? `★${item.rating}` : ''
  const meta = [status, stars, item.journal, item.type, item.groups.length ? `分组: ${item.groups.join(' / ')}` : ''].filter(Boolean).join(' · ')
  const body = meta ? `\n   ${meta}` : ''
  const pdf = item.exists
    ? `\n   PDF: ${item.path}`
    : '\n   PDF: 索引未登记或磁盘缺失（不要调用 endnote_open）'
  return head + body + pdf
}

/**
 * @typedef {object} DshContext
 * @property {{ register: (definition: any) => () => void }} tools
 * @property {(name: string) => any} get
 * @property {(fn: () => (() => void) | void) => void} effect
 * @property {{ entry?: unknown }} [fiber]
 */

/**
 * @param {DshContext} ctx
 * @param {Record<string, unknown>} rawConfig
 */
export function apply(ctx, rawConfig) {
  let config = resolveConfig(rawConfig, packageDir)
  const store = new IndexStore(config)

  /**
   * volatile 配置可在不重启插件的情况下被设置页 / endnote_config 原地更新。
   * 每个工具执行前重新解析一次；值有变化时同步给索引仓库（换库路径立即生效）。
   */
  const syncConfig = () => {
    const next = resolveConfig(rawConfig, packageDir)
    if (JSON.stringify(next) !== JSON.stringify(config)) {
      config = next
      store.config = next
      store.file = pickIndexFile(next)
      store.invalidate()
    }
    return config
  }

  const loadOrExplain = () => {
    const index = store.load()
    if (!index.file || !fs.existsSync(index.file)) {
      throw new Error(
        `dsh-endnote: 未找到文献索引。请先设置 indexFile，或运行 endnote_rebuild 从库目录重建。当前库路径: ${config.libraryPath}`,
      )
    }
    if (!index.entries.length) {
      throw new Error(`dsh-endnote: 索引 ${index.file} 里没有可用条目，请检查文件格式或执行 endnote_rebuild。`)
    }
    return index
  }

  const cleanTitle = (value) => String(value ?? '').trim()

  ctx.effect(() =>
    ctx.tools.register(
      tool({
        name: 'endnote_search',
        description: TEXT.search,
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: '关键词，多个用空格分隔（AND）。中文、英文、DOI 均可。' },
            group: { type: 'string', description: '可选：限定分组名（不分大小写）；未分组用 (ungrouped)。' },
            read: { type: 'string', enum: ['read', 'unread'], description: '可选：只返回已读(read)或未读(unread)文献（来自 EndNote 数据库 read_status）。' },
            limit: { type: 'number', description: '可选：返回条数上限，默认取插件配置。' },
          },
          required: ['query'],
          additionalProperties: false,
        },
        outputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            total: { type: 'number' },
            indexFile: { type: 'string' },
            builtAt: { type: 'string' },
            results: { type: 'array', items: resultItemSchema },
          },
          required: ['query', 'total', 'indexFile', 'builtAt', 'results'],
          additionalProperties: false,
        },
        render: (value) => {
          if (!value.results.length) {
            return `EndNote 库内没有匹配「${value.query}」的文献（索引 ${value.indexFile}，共 ${value.total} 条命中）。补救链：先联网检索该关键词拿到规范的完整标题/作者/DOI，再用这些字段回查本工具二次关联；仍无结果时告知用户本地库未收录，并列出候选（标题/作者/年份）询问用户指的是哪一篇。`
          }
          const lines = value.results.map((item, i) => formatEntry(item, i)).join('\n')
          return `EndNote 命中 ${value.total} 条，显示前 ${value.results.length} 条（索引 ${value.indexFile}）：\n${lines}\n\n需要阅读原文时，对带 PDF 的条目调用 endnote_open(path=...) 在右侧栏打开。`
        },
        async execute(args) {
          syncConfig()
          const query = cleanTitle(args.query)
          if (!query) throw new Error('dsh-endnote: query 不能为空')
          const index = loadOrExplain()
          const limit = Number(args.limit) > 0 ? Number(args.limit) : config.limit
          const { hits, total } = searchEntries(index.entries, { query, group: cleanTitle(args.group), read: cleanTitle(args.read), limit })
          return {
            query,
            total,
            indexFile: index.file ?? '',
            builtAt: index.builtAt,
            results: hits.map(({ entry }) => {
              const pdf = entry.files.find((file) => file.exists) ?? entry.files[0]
              return {
                id: entry.id,
                title: entry.title,
                authors: entry.authors,
                year: entry.year,
                journal: entry.journal,
                type: entry.type,
                doi: entry.doi,
                groups: entry.groups,
                keywords: entry.keywords,
                abstract: entry.abstract,
                read: entry.read === true ? 'read' : entry.read === false ? 'unread' : 'unknown',
                rating: entry.rating || 0,
                path: pdf ? pdf.path : '',
                exists: Boolean(pdf && pdf.exists),
              }
            }),
          }
        },
      }),
    ),
  )

  ctx.effect(() =>
    ctx.tools.register(
      tool({
        name: 'endnote_open',
        description: TEXT.open,
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'endnote_search 返回的 PDF 绝对路径。' },
            title: { type: 'string', description: '可选：右侧栏标签页标题，默认用文件名。' },
          },
          required: ['path'],
          additionalProperties: false,
        },
        outputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            title: { type: 'string' },
            path: { type: 'string' },
            openInSidebar: { type: 'boolean' },
          },
          required: ['id', 'title', 'path', 'openInSidebar'],
          additionalProperties: false,
        },
        render: (value) => value.openInSidebar
          ? `已请求在右侧栏打开《${value.title}》：${value.path}\n基于这份 PDF 原文回答用户，必要时用 pdftotext 提取正文。`
          : `本地 PDF 路径：${value.path}\n（插件配置 openInSidebar=false，未自动打开）`,
        async execute(args) {
          syncConfig()
          const raw = cleanTitle(args.path)
          if (!raw) throw new Error('dsh-endnote: path 不能为空')
          const target = path.resolve(raw)
          if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
            throw new Error(`dsh-endnote: 文件不存在: ${target}`)
          }
          const index = store.load()
          const known = index.entries.find((entry) => entry.files.some((file) => path.resolve(file.path) === target))
          // 阅读日志：追加写到 dataDir/read-log.jsonl（JSONL 追加天然安全），供 endnote_recent 汇总。
          if (known && known.id > 0) {
            try {
              fs.mkdirSync(config.dataDir, { recursive: true })
              fs.appendFileSync(
                path.join(config.dataDir, 'read-log.jsonl'),
                `${JSON.stringify({ id: known.id, ts: Math.floor(Date.now() / 1000), path: target })}\n`,
                'utf8',
              )
            } catch {
              // 日志失败不影响打开 PDF。
            }
          }
          return {
            id: known ? known.id : 0,
            title: cleanTitle(args.title) || (known && known.title) || path.basename(target, path.extname(target)),
            path: target,
            openInSidebar: config.openInSidebar,
          }
        },
      }),
    ),
  )

  ctx.effect(() =>
    ctx.tools.register(
      tool({
        name: 'endnote_recent',
        description: TEXT.recent,
        parameters: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: '可选：返回条数上限，默认 15。' },
          },
          additionalProperties: false,
        },
        outputSchema: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  title: { type: 'string' },
                  year: { type: 'string' },
                  read: { type: 'string', enum: ['read', 'unread', 'unknown'] },
                  rating: { type: 'number' },
                  lastReadAt: { type: 'string' },
                  source: { type: 'string' },
                  folder: { type: 'string' },
                  path: { type: 'string' },
                },
                required: ['id', 'title', 'year', 'read', 'rating', 'lastReadAt', 'source', 'folder', 'path'],
                additionalProperties: false,
              },
            },
          },
          required: ['total', 'items'],
          additionalProperties: false,
        },
        render: (value) => {
          if (!value.items.length) {
            return '还没有阅读记录：用 endnote_open 打开过 PDF，或在 EndNote 里标记过读状态的文献才会出现在这里。'
          }
          const cell = (text) => String(text ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim()
          const short = (text, max) => {
            const value = cell(text)
            return value.length > max ? `${value.slice(0, max - 1)}…` : value
          }
          const rows = value.items.map((item, i) => {
            const status = item.read === 'read' ? '已读✓' : item.read === 'unread' ? '未读○' : '未知'
            const stars = item.rating > 0 ? ` ★${item.rating}` : ''
            const source = item.source === 'plugin-log' ? '本插件打开' : 'EndNote 改读状态'
            return `| ${i + 1} | [${item.id}] ${short(item.title, 60)} | ${cell(item.year) || 'n.d.'} | ${status}${stars} | ${cell(item.lastReadAt)} | ${source} | ${item.folder ? cell(item.folder) : '—'} |`
          })
          return [
            `最近阅读文献 ${value.total} 条（按时间倒序，显示 ${value.items.length} 条）：`,
            '| # | 文献 | 年份 | 状态 | 最近阅读 | 来源 | 文件夹 |',
            '| --- | --- | --- | --- | --- | --- | --- |',
            ...rows,
            '',
            '来源「本插件打开」= 曾用 endnote_open 在右侧栏打开过；「EndNote 改读状态」= 在 EndNote 中变更过已读/未读。要打开某篇 PDF 或定位文件夹，回复表格里的编号即可（我会调 endnote_open）。',
          ].join('\n')
        },
        async execute(args) {
          syncConfig()
          const index = loadOrExplain()
          const requested = Number(args.limit)
          const limit = Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : 15
          const log = readReadLog(path.join(config.dataDir, 'read-log.jsonl'))
          const merged = []
          for (const entry of index.entries) {
            const logTs = log[entry.id] || 0
            const dbTs = entry.readAt || 0
            const ts = Math.max(logTs, dbTs)
            if (!ts) continue
            const pdf = entry.files.find((file) => file.exists) ?? entry.files[0]
            merged.push({
              ts,
              item: {
                id: entry.id,
                title: entry.title || '（无标题）',
                year: entry.year || '',
                read: entry.read === true ? 'read' : entry.read === false ? 'unread' : 'unknown',
                rating: entry.rating || 0,
                lastReadAt: formatEpoch(ts),
                source: logTs >= dbTs && logTs > 0 ? 'plugin-log' : 'endnote-readstatus',
                folder: pdf ? path.dirname(pdf.path) : '',
                path: pdf ? pdf.path : '',
              },
            })
          }
          merged.sort((left, right) => right.ts - left.ts || right.item.id - left.item.id)
          return { total: merged.length, items: merged.slice(0, limit).map((row) => row.item) }
        },
      }),
    ),
  )

  ctx.effect(() =>
    ctx.tools.register(
      tool({
        name: 'endnote_status',
        description: TEXT.status,
        parameters: emptyObject,
        outputSchema: {
          type: 'object',
          properties: {
            libraryPath: { type: 'string' },
            libraryExists: { type: 'boolean' },
            libraries: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  path: { type: 'string' },
                  primary: { type: 'boolean' },
                  active: { type: 'boolean' },
                },
                required: ['name', 'path', 'primary', 'active'],
                additionalProperties: false,
              },
            },
            indexFile: { type: 'string' },
            indexExists: { type: 'boolean' },
            builtAt: { type: 'string' },
            entries: { type: 'number' },
            readCount: { type: 'number' },
            withPdf: { type: 'number' },
            openInSidebar: { type: 'boolean' },
            dataDir: { type: 'string' },
            pythonPath: { type: 'string' },
          },
          required: ['libraryPath', 'libraryExists', 'libraries', 'indexFile', 'indexExists', 'builtAt', 'entries', 'readCount', 'withPdf', 'openInSidebar', 'dataDir', 'pythonPath'],
          additionalProperties: false,
        },
        render: (value) => [
          `库路径: ${value.libraryPath}（${value.libraryExists ? '存在' : '不存在'}）`,
          `已存库: ${value.libraries.length} 个${value.libraries.length ? `｜${value.libraries.map((lib) => `${lib.primary ? '★主' : '☆'}${lib.name}${lib.active ? '（当前）' : ''}`).join(' ')}` : '（配置页可添加，第 1 个为主库）'}`,
          `索引: ${value.indexFile || '未找到'}（${value.indexExists ? '已加载' : '缺失'}）`,
          `条目: ${value.entries} 条，已读 ${value.readCount} 条，其中 ${value.withPdf} 条有本地 PDF${value.builtAt ? `；构建于 ${value.builtAt}` : ''}`,
          `自动在右侧栏打开: ${value.openInSidebar ? '开' : '关'} ｜ 数据目录: ${value.dataDir}`,
          value.entries ? '可以开始检索。' : '索引为空：先确认库路径，再调用 endnote_rebuild。',
        ].join('\n'),
        async execute() {
          syncConfig()
          const file = pickIndexFile(config)
          const index = file ? store.load() : { builtAt: '', entries: [] }
          return {
            libraryPath: config.libraryPath,
            libraryExists: fs.existsSync(config.libraryPath),
            libraries: config.libraries.map((lib, i) => ({
              name: lib.name,
              path: lib.path,
              primary: i === 0,
              active: lib.path.toLowerCase() === config.libraryPath.toLowerCase(),
            })),
            indexFile: file ?? '',
            indexExists: Boolean(file && fs.existsSync(file)),
            builtAt: index.builtAt,
            entries: index.entries.length,
            readCount: index.entries.filter((entry) => entry.read === true).length,
            withPdf: index.entries.filter((entry) => entry.files.some((f) => f.exists)).length,
            openInSidebar: config.openInSidebar,
            dataDir: config.dataDir,
            pythonPath: config.pythonPath,
          }
        },
      }),
    ),
  )

  ctx.effect(() =>
    ctx.tools.register(
      tool({
        name: 'endnote_config',
        description: TEXT.config,
        parameters: {
          type: 'object',
          properties: {
            libraryPath: { type: 'string', description: 'EndNote 库根目录（...\\xxx.Data），即当前生效库。' },
            libraries: {
              type: 'array',
              description: '已存库列表（整体替换；第 1 个为主库）。每项 {name, path}。',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: '显示名，空则用目录名。' },
                  path: { type: 'string', description: '库根目录（...\\xxx.Data）。' },
                },
                required: ['path'],
                additionalProperties: false,
              },
            },
            indexFile: { type: 'string', description: '索引文件路径（JSON 或 CSV）；空字符串表示自动探测。' },
            dataDir: { type: 'string', description: '索引缓存目录；空字符串表示 <插件目录>/.data。' },
            pythonPath: { type: 'string', description: '重建索引时使用的 Python 解释器。' },
            openInSidebar: { type: 'boolean', description: '是否在命中后自动在右侧栏打开 PDF。' },
            limit: { type: 'number', description: '单次检索默认返回条数。' },
          },
          additionalProperties: false,
        },
        outputSchema: {
          type: 'object',
          properties: {
            saved: { type: 'boolean' },
            config: { type: 'string' },
          },
          required: ['saved', 'config'],
          additionalProperties: false,
        },
        render: (value) => value.saved
          ? `配置已保存（立即生效，无需重启）：\n${value.config}`
          : `配置未保存：${value.config}`,
        async execute(args) {
          syncConfig()
          const entry = ctx.fiber && ctx.fiber.entry
          const editor = ctx.get('configEditor')
          if (!entry || !editor) throw new Error('dsh-endnote: 当前 profile 不支持保存配置；请手动修改该插件行的 config。')
          /** @type {Record<string, unknown>} */
          const patch = {}
          for (const key of ['libraryPath', 'indexFile', 'dataDir', 'pythonPath']) {
            if (typeof args[key] === 'string') patch[key] = args[key].trim()
          }
          if (args.openInSidebar !== undefined) patch.openInSidebar = args.openInSidebar === true || args.openInSidebar === 'true'
          if (args.limit !== undefined && Number(args.limit) > 0) patch.limit = Number(args.limit)
          if (args.libraries !== undefined) {
            if (!Array.isArray(args.libraries)) throw new Error('dsh-endnote: libraries 必须是数组')
            patch.libraries = args.libraries
              .map((item) => ({
                name: String((item && item.name) ?? '').trim(),
                path: String((item && item.path) ?? '').trim(),
              }))
              .filter((item) => item.path)
          }
          if (!Object.keys(patch).length) throw new Error('dsh-endnote: 没有需要修改的配置项')
          const next = await editor.edit(entry, (current) => ({ ...current, ...patch }))
          return { saved: true, config: formatConfig(next ?? {}) }
        },
      }),
    ),
  )

  ctx.effect(() =>
    ctx.tools.register(
      tool({
        name: 'endnote_rebuild',
        description: TEXT.rebuild,
        parameters: emptyObject,
        outputSchema: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            indexFile: { type: 'string' },
            entries: { type: 'number' },
            withPdf: { type: 'number' },
            output: { type: 'string' },
          },
          required: ['ok', 'indexFile', 'entries', 'withPdf', 'output'],
          additionalProperties: false,
        },
        render: (value) => value.ok
          ? `索引已重建：${value.indexFile}（${value.entries} 条，${value.withPdf} 条有 PDF）\n${value.output}`
          : `索引重建失败：\n${value.output}`,
        async execute() {
          syncConfig()
          const out = preferredIndexFile(config)
          fs.mkdirSync(config.dataDir, { recursive: true })
          const script = path.join(packageDir, 'scripts', 'endnote_index.py')
          const run = await runPython(config.pythonPath, [script, '--lib', config.libraryPath, '--out', out])
          store.invalidate()
          const built = run.ok && fs.existsSync(out) ? new IndexStore({ ...config, indexFile: out }).load() : null
          return {
            ok: Boolean(built && built.entries.length),
            indexFile: out,
            entries: built ? built.entries.length : 0,
            withPdf: built ? built.entries.filter((entry) => entry.files.some((file) => file.exists)).length : 0,
            output: run.output,
          }
        },
      }),
    ),
  )

  /** 面板数据：统计汇总 + 最近阅读 + 最近导入（只读，每次请求重算）。 */
  const buildPanelPayload = (recentN, addedN) => {
    syncConfig()
    const payload = {
      ok: false,
      generatedAt: Math.floor(Date.now() / 1000),
      library: { path: config.libraryPath, name: path.basename(config.libraryPath) || config.libraryPath },
      stats: null,
      recentRead: [],
      recentAdded: [],
      error: '',
    }
    let index = null
    try {
      index = loadOrExplain()
    } catch (error) {
      payload.error = String((error && error.message) || error)
      return payload
    }
    const entries = index.entries
    const fileOf = (entry) => {
      const file = (entry.files || []).find((item) => item.exists) || (entry.files || [])[0] || null
      return file ? file.path : ''
    }
    const readLabel = (entry) => (entry.read === true ? 'read' : entry.read === false ? 'unread' : 'unknown')

    // 最近阅读：插件阅读日志 ∪ EndNote 读状态变更时间，取大者倒序。
    const log = readReadLog(path.join(config.dataDir, 'read-log.jsonl'))
    payload.recentRead = entries
      .map((entry) => ({ entry, lastReadAt: Math.max(Number(log[entry.id] || 0), Number(entry.readAt || 0)) }))
      .filter((row) => row.lastReadAt > 0)
      .sort((a, b) => b.lastReadAt - a.lastReadAt)
      .slice(0, recentN)
      .map(({ entry, lastReadAt }) => {
        const file = fileOf(entry)
        return {
          id: entry.id,
          title: entry.title || '（无标题）',
          year: entry.year || '',
          read: readLabel(entry),
          rating: Number(entry.rating || 0),
          lastReadAt,
          folder: file ? path.dirname(file) : '',
          path: file,
        }
      })

    // 最近导入：EndNote 的入库时间（added_to_library）倒序。
    payload.recentAdded = entries
      .filter((entry) => Number(entry.addedAt || 0) > 0)
      .sort((a, b) => Number(b.addedAt || 0) - Number(a.addedAt || 0))
      .slice(0, addedN)
      .map((entry) => {
        const file = fileOf(entry)
        return {
          id: entry.id,
          title: entry.title || '（无标题）',
          year: entry.year || '',
          read: readLabel(entry),
          rating: Number(entry.rating || 0),
          addedAt: Number(entry.addedAt || 0),
          folder: file ? path.dirname(file) : '',
          path: file,
        }
      })

    // 初步统计汇总。
    const groups = new Set()
    let withPdf = 0
    let readCount = 0
    let unreadCount = 0
    let unknownCount = 0
    let rated = 0
    for (const entry of entries) {
      if ((entry.files || []).some((file) => file.exists)) withPdf += 1
      if (entry.read === true) readCount += 1
      else if (entry.read === false) unreadCount += 1
      else unknownCount += 1
      if (Number(entry.rating || 0) > 0) rated += 1
      for (const group of entry.groups || []) groups.add(String(group))
    }
    payload.ok = true
    payload.stats = {
      total: entries.length,
      withPdf,
      read: readCount,
      unread: unreadCount,
      unknown: unknownCount,
      rated,
      groups: groups.size,
      builtAt: index.builtAt || '',
      indexFile: index.file || '',
    }
    return payload
  }

  // ------------------------------------------------------------------
  // 侧栏面板数据 + 打开文件夹：webServer 同源路由（官方 open-in-app 同款）。
  // 用 ctx.inject 等待 webServer/connection 就绪后再注册：启动早期 apply 时这两个服务
  // 可能还没出现，直接 ctx.get 会拿到 undefined 而静默跳过注册（面板随后 HTTP 404）。
  // ------------------------------------------------------------------
  ctx.inject(['webServer', 'connection'], (webCtx) => {
    const webServer = webCtx.get('webServer')
    const connection = webCtx.get('connection')
    if (
      !webServer || typeof webServer.register !== 'function' ||
      !connection || typeof connection.requestRejection !== 'function'
    ) {
      console.warn('[dsh-endnote] 缺少 webServer/connection 服务：侧栏面板数据与「打开文件夹」未注册（检索等工具不受影响）')
      return
    }
    // 面板数据：?recent=N（最近阅读条数）&added=N（最近导入条数，0=不返回）。
    webCtx.effect(() => webServer.register({
      kind: 'exact',
      path: PANEL_DATA_PATH,
      handler: async (req, res) => {
        try {
          const rejection = connection.requestRejection(req)
          if (rejection !== undefined) { res.statusCode = rejection; res.end(); return }
          if (req.method !== 'GET') { res.statusCode = 405; res.setHeader('allow', 'GET'); res.end(); return }
          const url = new URL(String(req.url || PANEL_DATA_PATH), 'http://127.0.0.1')
          const recentN = clampInt(url.searchParams.get('recent'), 10, 1, 100)
          const addedN = clampInt(url.searchParams.get('added'), 10, 0, 100)
          sendJson(res, 200, buildPanelPayload(recentN, addedN))
        } catch (error) {
          sendJson(res, 500, { ok: false, error: String((error && error.message) || error) })
        }
      },
    }), `dsh-endnote: GET ${PANEL_DATA_PATH}`)

    // 打开文件夹：POST {path}，绝对路径 + 确实是目录才执行。
    webCtx.effect(() => webServer.register({
      kind: 'exact',
      path: OPEN_FOLDER_PATH,
      handler: async (req, res) => {
        try {
          const rejection = connection.requestRejection(req)
          if (rejection !== undefined) { res.statusCode = rejection; res.end(); return }
          if (req.method !== 'POST') { res.statusCode = 405; res.setHeader('allow', 'POST'); res.end(); return }
          const contentType = String(req.headers['content-type'] || '').split(';', 1)[0].trim().toLowerCase()
          if (contentType !== 'application/json') { sendJson(res, 415, { ok: false, error: 'content-type must be application/json' }); return }
          const body = await readBoundedBody(req)
          if (body === null) { sendJson(res, 413, { ok: false, error: 'body too large' }); return }
          let parsed = null
          try {
            parsed = JSON.parse(body)
          } catch {
            sendJson(res, 400, { ok: false, error: 'invalid JSON' })
            return
          }
          const target = parsed && parsed.path
          if (typeof target !== 'string' || !path.isAbsolute(target)) { sendJson(res, 400, { ok: false, error: 'path must be an absolute string' }); return }
          try {
            const stat = await fs.promises.stat(target)
            if (!stat.isDirectory()) { sendJson(res, 400, { ok: false, error: 'path is not a directory' }); return }
          } catch {
            sendJson(res, 404, { ok: false, error: 'directory does not exist' })
            return
          }
          if (!openDirectory(target)) { sendJson(res, 500, { ok: false, error: 'could not start the system file manager' }); return }
          sendJson(res, 200, { ok: true })
        } catch (error) {
          sendJson(res, 500, { ok: false, error: String((error && error.message) || error) })
        }
      },
    }), `dsh-endnote: POST ${OPEN_FOLDER_PATH}`)
  })

  const systemPrompt = ctx.get('systemPrompt')
  if (systemPrompt && typeof systemPrompt.section === 'function') {
    ctx.effect(() =>
      systemPrompt.section({
        name: 'dsh-endnote',
        order: 60,
        text: [
          '## 文献调研：先查本地 EndNote 库（dsh-endnote）',
          '用户要查文献、找论文、问某篇论文或某个主题的既有研究时：',
          '1. 先调用 endnote_search，不要先联网搜索。多关键词是 AND；中文、英文、DOI 都可查。',
          '2. 命中且结果带本地 PDF 时，立刻调用 endnote_open(path=...)——PDF 会在右侧栏打开，用户可边读边问。',
          '3. 回答以本地原文为准；需要正文时用 pdftotext 只读提取，并给出文献编号与本地路径。',
          '4. 本地未命中（0 条或结果与问题明显不相关）时走补救链：① 先联网检索该关键词，拿到规范的完整标题、作者、年份、DOI；② 再用这些字段调 endnote_search 回本地库二次关联（DOI、英文标题通常一击命中）。',
          '5. 二次关联命中 → 按 2/3 打开作答；仍关联不上 → 明确告知用户「本地库未收录该文献」，列出网络检索到的候选（标题/作者/年份/来源链接）并询问用户指的是哪一篇，等确认后再作答；不要编造本地路径。',
          '6. 本地或网络出现多条候选、无法确定用户所指时，同样先列出候选（本地的带文献编号、网络的带链接）询问用户是哪一篇，不要替用户猜。',
          '7. 用户明确要求外部来源、或第 5 步确认本地确实没有时，才以网络来源作答，并注明「未收录本地库」。',
          '8. 索引为空或库路径变更时，用 endnote_status 排查，用 endnote_config / endnote_rebuild 修复；库路径也可在侧栏「插件」页 dsh-endnote 行的配置页里图形化切换（保存即生效）。',
          '9. 用户问「最近读过/在读哪些文献」时用 endnote_recent（表格含状态与本地文件夹）；按已读/未读筛选文献用 endnote_search(read=\'read\' 或 \'unread\')。',
        ].join('\n'),
      }),
    )
  }
}

/**
 * 执行 Python 索引脚本，收集输出与错误。
 * @param {string} python
 * @param {string[]} args
 * @returns {Promise<{ ok: boolean, output: string }>}
 */
function runPython(python, args) {
  return new Promise((resolve) => {
    const env = { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' }
    execFile(python, args, { windowsHide: true, env, timeout: 300_000, maxBuffer: 4 * 1024 * 1024 }, (error, stdout, stderr) => {
      const combined = [stdout, stderr].filter(Boolean).join('\n').trim()
      if (error && !combined) resolve({ ok: false, output: `${error.message}` })
      else resolve({ ok: !error, output: combined })
    })
  })
}

/**
 * 读取阅读日志（JSONL，每行 {id, ts, path}），按 id 取最大时间戳。
 * 只取最后 2000 行，日志再大也不拖慢工具。
 * @param {string} file
 * @returns {Record<string, number>}
 */
function readReadLog(file) {
  /** @type {Record<string, number>} */
  const log = {}
  let text = ''
  try {
    text = fs.readFileSync(file, 'utf8')
  } catch {
    return log // 没有日志文件 = 还没用 endnote_open 打开过。
  }
  const lines = text.split('\n')
  for (const line of lines.slice(Math.max(0, lines.length - 2000))) {
    if (!line.trim()) continue
    try {
      const row = JSON.parse(line)
      const id = Number(row.id)
      const ts = Number(row.ts)
      if (id > 0 && ts > 0 && (!log[id] || ts > log[id])) log[id] = ts
    } catch {
      // 忽略残行（追加写中途断电等情况）。
    }
  }
  return log
}

/** epoch 秒 → 本地时间 `YYYY-MM-DD HH:MM`。 */
function formatEpoch(ts) {
  const date = new Date(ts * 1000)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** @param {Record<string, unknown>} config */
function formatConfig(config) {
  return Object.entries(config)
    .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
    .join('\n')
}

/** JSON 响应（no-store，避免浏览器缓存过期的面板数据）。 */
function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(payload))
}

/** 读取 JSON 请求体；超过 MAX_BODY_BYTES 时排空后续字节并返回 null（内存有界）。 */
async function readBoundedBody(req) {
  let size = 0
  const chunks = []
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) {
      chunks.length = 0 // 超限后只排空不保存，保证还能正常回 413。
      continue
    }
    chunks.push(chunk)
  }
  return size > MAX_BODY_BYTES ? null : Buffer.concat(chunks).toString('utf8')
}

/** 查询参数 → 受限整数（NaN/越界回退）。 */
function clampInt(raw, fallback, min, max) {
  const value = Math.floor(Number(raw))
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
}

/** 用系统文件管理器打开目录（仅导航，不读取内容）。 */
function openDirectory(target) {
  try {
    const options = { stdio: 'ignore', detached: true }
    const child = process.platform === 'win32'
      ? spawn('explorer.exe', [target], options)
      : process.platform === 'darwin'
        ? spawn('open', [target], options)
        : spawn('xdg-open', [target], options)
    child.on('error', (error) => console.warn('[dsh-endnote] 打开文件夹失败:', error.message))
    child.unref()
    return true
  } catch {
    return false
  }
}
