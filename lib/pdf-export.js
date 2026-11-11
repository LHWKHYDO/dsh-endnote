/**
 * 导出带原生注释的 PDF 副本。
 *
 * 侧车 JSON 只服务本插件；要把标注带到 Acrobat / 预览 / 其他阅读器，就得写成
 * PDF 注释对象。这里用**副本**：EndNote 库与原始 PDF 永远不被修改。
 *
 * 为什么是 MuPDF 而不是 pdf-lib：论文 PDF 常见“仅限制编辑”的权限加密
 * （/Encrypt + 空用户密码）。pdf-lib 不解密内容流，重写后整页变成空白，
 * 且对带尾部垃圾字节的文件会解析失败。MuPDF 是完整 PDF 引擎，空密码自动
 * 解密、内容流原样保留，坐标也已应用 /Rotate。
 *
 * 坐标：侧车存的是页面归一化 0..1 矩形（原点左上）。MuPDF 的页面坐标同样
 * 是左上原点、y 向下，按 getBounds() 换算即可，旋转页自动一致。
 */
import fs from 'node:fs'
import path from 'node:path'

/** 延迟加载 wasm：不用导出就不付 10 MB 的加载成本。 */
let mupdfPromise = null
function loadMupdf() {
  if (mupdfPromise === null) {
    const entry = new URL('../vendor/mupdf/mupdf.js', import.meta.url).href
    mupdfPromise = import(/* @vite-ignore */ entry).catch((error) => {
      throw new Error('缺少 vendor/mupdf（MuPDF 运行时）：' + (error instanceof Error ? error.message : String(error)))
    })
  }
  return mupdfPromise
}

/**
 * 解析 `#rrggbb` / `#rgb` 颜色为 0..1 三元组。
 * @param {unknown} value
 * @returns {number[]}
 */
function parseColor(value) {
  const text = typeof value === 'string' ? value.trim() : ''
  const short = /^#([0-9a-fA-F]{3})$/.exec(text)
  if (short) {
    return short[1].split('').map((char) => parseInt(char + char, 16) / 255)
  }
  const long = /^#([0-9a-fA-F]{6})/i.exec(text)
  if (long) {
    return [
      parseInt(long[1].slice(0, 2), 16) / 255,
      parseInt(long[1].slice(2, 4), 16) / 255,
      parseInt(long[1].slice(4, 6), 16) / 255,
    ]
  }
  return [1, 0.878, 0.4]
}

/**
 * 归一化矩形 → 页面坐标 [x0, y0, x1, y1]（MuPDF 页面空间，左上原点）。
 * @param {number[]} rect `[x, y, w, h]`，原点左上
 * @param {number[]} bounds `page.getBounds()`
 * @returns {number[]}
 */
function toPageRect(rect, bounds) {
  const left = bounds[0]
  const top = bounds[1]
  const width = bounds[2] - bounds[0]
  const height = bounds[3] - bounds[1]
  return [
    left + rect[0] * width,
    top + rect[1] * height,
    left + (rect[0] + rect[2]) * width,
    top + (rect[1] + rect[3]) * height,
  ]
}

/** 三种文本标记对应的 PDF 注释类型。 */
const MARK_TYPES = { highlight: 'Highlight', underline: 'Underline', strike: 'StrikeOut' }

const IDENTITY_MATRIX = [1, 0, 0, 1, 0, 0]

/** 中日韩字符按全角宽度排版，其余按 0.55 em 估算。 */
function isWideChar(char) {
  const code = char.codePointAt(0) || 0
  return (code >= 0x2e80 && code <= 0x9fff) || (code >= 0xf900 && code <= 0xfaff) || (code >= 0xff00 && code <= 0xff60)
}

/**
 * 框内文字排版：按框宽折行、按框高限行。
 * @param {string} text
 * @param {number} width 可用宽度（pt）
 * @param {number} height 可用高度（pt）
 * @returns {{ lines: string[], size: number, lineHeight: number }}
 */
function layoutNote(text, width, height) {
  const size = height > 48 ? 9 : 8
  const lineHeight = size * 1.35
  const maxLines = Math.max(1, Math.floor(height / lineHeight))
  const lines = []
  let line = ''
  let used = 0
  for (const char of String(text)) {
    if (char === '\n') {
      lines.push(line)
      line = ''
      used = 0
      continue
    }
    const advance = isWideChar(char) ? size : size * 0.55
    if (line !== '' && used + advance > width) {
      lines.push(line)
      line = ''
      used = 0
    }
    line += char
    used += advance
  }
  if (line !== '') lines.push(line)
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines)
    kept[kept.length - 1] = kept[kept.length - 1].slice(0, -1) + '…'
    return { lines: kept, size, lineHeight }
  }
  return { lines, size, lineHeight }
}

/**
 * 给方框/文字注释生成可见外观（边框 + 框内文字）。
 *
 * Square 注释的 /Contents 只会出现在阅读器的注释面板里，页面上看不见。
 * 这里把边框和排版后的文字画成 appearance stream，任何阅读器打开都能直接读到
 * 「这个框里写了什么」，同时注释本身仍是可编辑、可删除的正常注释。
 *
 * @param {object} mupdf MuPDF 模块
 * @param {object} annot PDFAnnotation
 * @param {number[]} rect `[x0, y0, x1, y1]`，页面坐标
 * @param {number[]} color 0..1 三元组
 * @param {string} note 框内文字
 */
function applyBoxAppearance(mupdf, annot, rect, color, note) {
  const width = rect[2] - rect[0]
  const height = rect[3] - rect[1]
  if (!(width > 6) || !(height > 6)) return

  const list = new mupdf.DisplayList([0, 0, width, height])
  const device = new mupdf.DisplayListDevice(list)
  // 半透明白底：框通常画在正文上，不铺底的话注释文字会和原文叠印。
  // 同时它把 display list 的 bounds 钉死在 [0,0,width,height] —— 否则 MuPDF
  // 用内容包围盒当 BBox，映射回注释矩形时会把文字拉伸。
  const background = new mupdf.Path()
  background.rect(0, 0, width, height)
  device.fillPath(background, false, IDENTITY_MATRIX, mupdf.ColorSpace.DeviceRGB, [1, 1, 1], 0.96)

  const border = new mupdf.Path()
  border.rect(0.75, 0.75, width - 0.75, height - 0.75)
  const stroke = new mupdf.StrokeState({ lineCap: 'Round', lineJoin: 'Round', lineWidth: 1.5, miterLimit: 10, dashes: [] })
  device.strokePath(border, stroke, IDENTITY_MATRIX, mupdf.ColorSpace.DeviceRGB, color, 1)

  const text = String(note || '').trim()
  if (text !== '') {
    const { lines, size, lineHeight } = layoutNote(text, width - 8, height - 6)
    if (lines.length > 0) {
      const font = new mupdf.Font(/[\u2e80-\u9fff]/.test(text) ? 'zh-Hans' : 'Helvetica')
      const painted = new mupdf.Text()
      lines.forEach((line, index) => {
        painted.showString(font, [size, 0, 0, size, 4, 4 + size + index * lineHeight], line)
      })
      // display list 内容是 y 向上的 PDF 空间，而 AP 流会再翻转一次；
      // 这里把 ctm 反过来，文字才不会上下颠倒。
      device.fillText(painted, [1, 0, 0, -1, 0, height], mupdf.ColorSpace.DeviceRGB, [0.08, 0.08, 0.1], 1)
    }
  }
  device.close()
  annot.setAppearanceFromDisplayList('N', null, IDENTITY_MATRIX, list)
}

/**
 * 导出带原生注释的副本。
 * @param {string} sourcePath 原始 PDF 绝对路径
 * @param {object[]} annotations 侧车里的标注数组
 * @param {string} outputDir 输出目录（插件数据目录下的 exports）
 * @returns {Promise<{ outputPath: string, written: number, skipped: number, skippedPages: number[], encrypted: boolean }>}
 */
export async function exportAnnotatedPdf(sourcePath, annotations, outputDir) {
  const mupdf = await loadMupdf()
  const bytes = await fs.promises.readFile(sourcePath)
  const doc = mupdf.Document.openDocument(bytes, 'application/pdf')

  // 权限加密（用户密码为空）是论文 PDF 的常态：空密码即可拿到权限。
  // 真需要打开密码的文件会在这里失败，由调用方给出可读错误。
  let encrypted = false
  if (typeof doc.needsPassword === 'function' && doc.needsPassword()) {
    encrypted = true
    if (doc.authenticatePassword('') !== true) {
      throw new Error('这个 PDF 需要用密码打开，无法生成带注释的副本')
    }
  }

  const pageCount = doc.countPages()
  let written = 0
  let skipped = 0
  const skippedPages = new Set()

  for (const annotation of Array.isArray(annotations) ? annotations : []) {
    const rects = Array.isArray(annotation.rects) ? annotation.rects : []
    const pageNumber = Math.round(Number(annotation.page) || 0)
    if (rects.length === 0 || pageNumber < 1 || pageNumber > pageCount) {
      skipped += 1
      if (pageNumber >= 1 && pageNumber <= pageCount) skippedPages.add(pageNumber)
      continue
    }
    const page = doc.loadPage(pageNumber - 1)
    try {
      const bounds = page.getBounds()
      const color = parseColor(annotation.color)
      const subtype = MARK_TYPES[annotation.type] || 'Square'
      const annot = page.createAnnotation(subtype)
      if (annot === undefined || annot === null) {
        skipped += 1
        skippedPages.add(pageNumber)
        continue
      }
      annot.setColor(color)
      annot.setAuthor('dsh-endnote')

      if (subtype === 'Square') {
        const rect = toPageRect(rects[0], bounds)
        annot.setRect(rect)
        const note = String(annotation.note || '').trim()
        if (note !== '') annot.setContents(note)
        applyBoxAppearance(mupdf, annot, rect, color, note)
      } else {
        // 每行一个 quad：ul、ur、ll、lr（页面左上原点）。
        const quads = rects.map((rect) => {
          const [x0, y0, x1, y1] = toPageRect(rect, bounds)
          return [x0, y0, x1, y0, x0, y1, x1, y1]
        })
        annot.setQuadPoints(quads)
        const text = String(annotation.text || annotation.note || '').trim()
        if (text !== '') annot.setContents(text)
      }
      annot.update()
      written += 1
    } finally {
      page.destroy()
    }
  }

  const base = path.basename(sourcePath, path.extname(sourcePath))
  await fs.promises.mkdir(outputDir, { recursive: true })
  // 固定文件名、每次从原件重算并覆盖：导出结果是“当前标注快照”，不是追加历史。
  const outputPath = path.join(outputDir, base + '-annotated.pdf')
  const buffer = doc.saveToBuffer({ compress: true })
  doc.destroy()
  await fs.promises.writeFile(outputPath, buffer.asUint8Array())
  return { outputPath, written, skipped, skippedPages: [...skippedPages], encrypted }
}
