/**
 * PDF 标注侧车存储。
 *
 * 标注永远不写回 EndNote 库（库是只读的），而是按 PDF 绝对路径的哈希落到
 * 插件的 dataDir 下：`<dataDir>/annotations/<sha1>.json`。同一份 PDF 在库内
 * 移动位置后会得到新键，旧标注留在原键下（不误挂到别的文献上）。
 *
 * 坐标统一为「页面归一化坐标」：`[x, y, w, h]`，取值 0..1，原点是页面左上角。
 * 这样缩放、不同像素密度都不影响标注位置。
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

/** 侧车 JSON 的结构版本；读取未知版本时按空标注处理。 */
export const ANNOTATION_VERSION = 1

/** 单份 PDF 允许的标注条数上限（防止异常输入把内存/磁盘撑爆）。 */
const MAX_ANNOTATIONS = 2000
/** 单条高亮允许的矩形段数上限。 */
const MAX_RECTS = 200
/** 各字段长度上限。 */
const MAX_NOTE = 4000
const MAX_TEXT = 2000
const MAX_ID = 80

/**
 * 归一化 PDF 路径，作为侧车键的输入。
 * Windows 下大小写不敏感，统一转小写，避免同一份文件出现两个键。
 * @param {string} pdfPath
 * @returns {string}
 */
function normalizeKeyPath(pdfPath) {
  const resolved = path.resolve(String(pdfPath))
  const slashed = resolved.replace(/\\/g, '/')
  return process.platform === 'win32' ? slashed.toLowerCase() : slashed
}

/**
 * 一份 PDF 对应的侧车文件路径。
 * @param {string} dataDir 插件数据目录
 * @param {string} pdfPath PDF 绝对路径
 * @returns {string}
 */
export function annotationFile(dataDir, pdfPath) {
  const key = crypto.createHash('sha1').update(normalizeKeyPath(pdfPath)).digest('hex')
  return path.join(dataDir, 'annotations', key + '.json')
}

/**
 * PDF 的内容指纹：大小 + mtime。用于判断标注是否还对应同一版文件。
 * @param {string} pdfPath
 * @returns {string} 文件不存在时返回空串
 */
export function pdfStamp(pdfPath) {
  try {
    const stat = fs.statSync(pdfPath)
    if (!stat.isFile()) return ''
    return `${stat.size}:${Math.round(stat.mtimeMs)}`
  } catch {
    return ''
  }
}

/**
 * 把一个数夹到区间里；非数字返回 undefined。
 * @param {unknown} value
 * @param {number} min
 * @param {number} max
 * @returns {number | undefined}
 */
function clampNumber(value, min, max) {
  const number = typeof value === 'number' ? value : NaN
  if (!Number.isFinite(number)) return undefined
  return Math.min(max, Math.max(min, number))
}

/**
 * 读一个字符串字段并截断。
 * @param {unknown} value
 * @param {number} max
 * @returns {string}
 */
function cleanString(value, max) {
  if (typeof value !== 'string') return ''
  return value.length > max ? value.slice(0, max) : value
}

/**
 * 清洗一个矩形：限制在 0..1，宽高至少留一点，避免零尺寸标注永远不可见。
 * @param {unknown} value
 * @returns {number[] | null}
 */
function cleanRect(value) {
  if (!Array.isArray(value) || value.length !== 4) return null
  const x = clampNumber(value[0], 0, 1)
  const y = clampNumber(value[1], 0, 1)
  const w = clampNumber(value[2], 0.0005, 1)
  const h = clampNumber(value[3], 0.0005, 1)
  if (x === undefined || y === undefined || w === undefined || h === undefined) return null
  return [x, y, Math.min(w, 1 - x), Math.min(h, 1 - y)]
}

/**
 * 清洗一条标注。无法修复的字段直接丢弃该条。
 * @param {unknown} raw
 * @returns {object | null}
 */
function cleanAnnotation(raw) {
  if (!raw || typeof raw !== 'object') return null
  const source = /** @type {Record<string, unknown>} */ (raw)
  const type = source.type
  if (type !== 'highlight' && type !== 'rect' && type !== 'text') return null
  const page = clampNumber(source.page, 1, 10000)
  if (page === undefined) return null
  const rects = []
  if (Array.isArray(source.rects)) {
    for (const item of source.rects.slice(0, MAX_RECTS)) {
      const rect = cleanRect(item)
      if (rect !== null) rects.push(rect)
    }
  }
  // 矩形的 rect 字段与高亮的 rects 统一收集；两者都空说明标注没有落点。
  if (rects.length === 0) {
    const rect = cleanRect(source.rect)
    if (rect !== null) rects.push(rect)
  }
  if (rects.length === 0) return null
  const color = /^#[0-9a-fA-F]{3,8}$/.test(String(source.color ?? '')) ? String(source.color) : '#ffe066'
  return {
    id: cleanString(source.id, MAX_ID) || crypto.randomUUID(),
    type,
    page: Math.round(page),
    color,
    rects,
    text: cleanString(source.text, MAX_TEXT),
    note: cleanString(source.note, MAX_NOTE),
    createdAt: cleanString(source.createdAt, 40) || new Date().toISOString(),
  }
}

/**
 * 清洗整份标注数组：去重（同 id 保留第一条）、限制条数。
 * @param {unknown} input
 * @returns {object[]}
 */
export function sanitizeAnnotations(input) {
  if (!Array.isArray(input)) return []
  const seen = new Set()
  const result = []
  for (const raw of input) {
    if (result.length >= MAX_ANNOTATIONS) break
    const annotation = cleanAnnotation(raw)
    if (annotation === null) continue
    if (seen.has(annotation.id)) continue
    seen.add(annotation.id)
    result.push(annotation)
  }
  return result
}

/**
 * 读取一份 PDF 的标注。
 * 侧车不存在、损坏或版本不符时返回空列表，绝不阻塞阅读。
 * @param {string} dataDir
 * @param {string} pdfPath
 * @returns {{ annotations: object[], updatedAt: string | null, pdfStamp: string }}
 */
export function readAnnotations(dataDir, pdfPath) {
  const stamp = pdfStamp(pdfPath)
  try {
    const raw = fs.readFileSync(annotationFile(dataDir, pdfPath), 'utf8')
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.version !== ANNOTATION_VERSION) {
      return { annotations: [], updatedAt: null, pdfStamp: stamp }
    }
    return {
      annotations: sanitizeAnnotations(parsed.annotations),
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
      pdfStamp: stamp,
    }
  } catch {
    return { annotations: [], updatedAt: null, pdfStamp: stamp }
  }
}

/**
 * 原子写入一份 PDF 的标注（先写临时文件再 rename，避免半截 JSON）。
 * @param {string} dataDir
 * @param {string} pdfPath
 * @param {unknown} annotations
 * @returns {{ annotations: object[], updatedAt: string, pdfStamp: string, file: string }}
 */
export function writeAnnotations(dataDir, pdfPath, annotations) {
  const clean = sanitizeAnnotations(annotations)
  const updatedAt = new Date().toISOString()
  const file = annotationFile(dataDir, pdfPath)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const payload = {
    version: ANNOTATION_VERSION,
    pdfPath: path.resolve(String(pdfPath)),
    pdfStamp: pdfStamp(pdfPath),
    updatedAt,
    annotations: clean,
  }
  const tmp = file + '.' + process.pid + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8')
  fs.renameSync(tmp, file)
  return { annotations: clean, updatedAt, pdfStamp: payload.pdfStamp, file }
}
