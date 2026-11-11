import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { exportAnnotatedPdf } from '../lib/pdf-export.js'

const mupdf = await import('../vendor/mupdf/mupdf.js')

/**
 * 手写一个带真实内容流的 PDF：每页画一块实心矩形 + 一段文字。
 * 内容流必须真的存在于输出里 —— pdf-lib 重写加密/增量更新过的论文 PDF 时
 * 会把整页内容流写坏，这个断言就是那次的回归保护。
 * 手写而不是用库生成：测试不引入额外依赖，对象号与 xref 完全可控。
 */
function makeSource(file, pageCount = 2) {
  const objects = []
  const fontId = 3 + pageCount * 2
  const kids = []
  for (let index = 0; index < pageCount; index += 1) kids.push(`${3 + index * 2} 0 R`)
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>'
  objects[2] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pageCount} >>`
  for (let index = 0; index < pageCount; index += 1) {
    const pageId = 3 + index * 2
    const contentId = pageId + 1
    const stream = '0.2 0.3 0.8 rg 60 600 300 120 re f\nBT /F1 18 Tf 60 560 Td (page content) Tj ET\n'
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`
    objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}endstream`
  }
  objects[fontId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'

  let pdf = '%PDF-1.7\n'
  const offsets = [0]
  for (let id = 1; id <= fontId; id += 1) {
    offsets[id] = pdf.length
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`
  }
  const xrefAt = pdf.length
  pdf += `xref\n0 ${fontId + 1}\n0000000000 65535 f \n`
  for (let id = 1; id <= fontId; id += 1) {
    pdf += String(offsets[id]).padStart(10, '0') + ' 00000 n \n'
  }
  pdf += `trailer\n<< /Size ${fontId + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`
  fs.writeFileSync(file, Buffer.from(pdf, 'latin1'))
}

/** 渲染一页，返回非白像素占比：内容丢失时这个值会掉到接近 0。 */
function inkRatio(bytes, pageIndex = 0) {
  const doc = mupdf.Document.openDocument(new Uint8Array(bytes), 'application/pdf')
  const page = doc.loadPage(pageIndex)
  const pixmap = page.toPixmap([1, 0, 0, 1, 0, 0], mupdf.ColorSpace.DeviceRGB, false)
  const samples = pixmap.getPixels()
  let ink = 0
  for (let offset = 0; offset < samples.length; offset += 4) {
    if (samples[offset] !== 255 || samples[offset + 1] !== 255 || samples[offset + 2] !== 255) ink += 1
  }
  const ratio = ink / (samples.length / 4)
  pixmap.destroy()
  page.destroy()
  doc.destroy()
  return ratio
}

function fixture(pageCount = 2) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-endnote-export-'))
  const source = path.join(root, 'paper.pdf')
  makeSource(source, pageCount)
  return { root, source, outputDir: path.join(root, 'exports') }
}

test('高亮写为原生 Highlight 并保留多行 QuadPoints', async () => {
  const { source, outputDir } = fixture()
  const result = await exportAnnotatedPdf(source, [
    { id: 'h1', type: 'highlight', page: 1, color: '#ffe066', rects: [[0.1, 0.12, 0.5, 0.03], [0.1, 0.16, 0.4, 0.03]], text: '需求弹性被高估' },
  ], outputDir)

  assert.equal(result.written, 1)
  assert.equal(result.skipped, 0)
  assert.ok(fs.existsSync(result.outputPath))

  const doc = mupdf.Document.openDocument(new Uint8Array(fs.readFileSync(result.outputPath)), 'application/pdf')
  const annots = doc.loadPage(0).getAnnotations()
  assert.equal(annots.length, 1)
  assert.equal(annots[0].getType(), 'Highlight')
  assert.equal(annots[0].getContents(), '需求弹性被高估')
  // 两行选区 → 两组 quad；坐标按页面尺寸换算（595 × 842）。
  const quads = annots[0].getQuadPoints()
  assert.equal(quads.length, 2)
  assert.ok(Math.abs(quads[0][0] - 59.5) < 2, 'quad x0 应贴合归一化 0.1')
  assert.ok(Math.abs(quads[0][1] - 0.12 * 842) < 3, 'quad y0 应贴合归一化 0.12')
  doc.destroy()
})

test('方框写为 Square，框内文字进入 Contents', async () => {
  const { source, outputDir } = fixture()
  const result = await exportAnnotatedPdf(source, [
    { id: 'r1', type: 'rect', page: 2, color: '#8ce99a', rects: [[0.2, 0.3, 0.3, 0.15]], note: '这里的假设需要复核。' },
    { id: 't1', type: 'text', page: 2, color: '#74c0fc', rects: [[0.2, 0.5, 0.36, 0.1]], note: '旁注' },
  ], outputDir)

  assert.equal(result.written, 2)
  const doc = mupdf.Document.openDocument(new Uint8Array(fs.readFileSync(result.outputPath)), 'application/pdf')
  const annots = doc.loadPage(1).getAnnotations()
  assert.equal(annots.length, 2)
  for (const annot of annots) assert.equal(annot.getType(), 'Square')
  const contents = annots.map((annot) => annot.getContents()).sort()
  assert.deepEqual(contents, ['旁注', '这里的假设需要复核。'].sort())
  const rect = annots[0].getRect()
  assert.ok(Math.abs(rect[0] - 0.2 * 595) < 2)
  doc.destroy()
})

test('重写是副本：页数不变、页面内容流不丢', async () => {
  const { source, outputDir } = fixture(3)
  const sourceInk = inkRatio(fs.readFileSync(source), 0)
  assert.ok(sourceInk > 0.01, '源文件本身要有内容')

  const result = await exportAnnotatedPdf(source, [
    { id: 'a', type: 'highlight', page: 1, color: '#ffe066', rects: [[0.1, 0.7, 0.2, 0.02]], text: 'x' },
  ], outputDir)

  const outBytes = fs.readFileSync(result.outputPath)
  const doc = mupdf.Document.openDocument(new Uint8Array(outBytes), 'application/pdf')
  assert.equal(doc.countPages(), 3)
  doc.destroy()
  // 高亮只覆盖很小一块，墨迹比例不应有明显变化。
  assert.ok(Math.abs(inkRatio(outBytes, 0) - sourceInk) < 0.02, '页面内容不能丢')
  // 原件保持原样。
  assert.deepEqual(fs.readFileSync(source), fs.readFileSync(source))
})

test('越界页与空矩形跳过并报告，不影响其它标注', async () => {
  const { source, outputDir } = fixture()
  const result = await exportAnnotatedPdf(source, [
    { id: 'ok', type: 'highlight', page: 1, color: '#ffe066', rects: [[0.1, 0.1, 0.2, 0.02]], text: 'ok' },
    { id: 'no-page', type: 'highlight', page: 9, color: '#ffe066', rects: [[0.1, 0.1, 0.2, 0.02]], text: 'nope' },
    { id: 'no-rects', type: 'highlight', page: 1, color: '#ffe066', rects: [], text: 'nope' },
  ], outputDir)
  assert.equal(result.written, 1)
  assert.equal(result.skipped, 2)
})

test('重复导出覆盖同一个文件，不堆副本', async () => {
  const { source, outputDir } = fixture()
  const annotations = [{ id: 'a', type: 'highlight', page: 1, color: '#ffe066', rects: [[0.1, 0.1, 0.2, 0.02]], text: 'v1' }]
  const first = await exportAnnotatedPdf(source, annotations, outputDir)
  const second = await exportAnnotatedPdf(source, [{ ...annotations[0], text: 'v2' }], outputDir)
  assert.equal(first.outputPath, second.outputPath)
  assert.deepEqual(fs.readdirSync(outputDir), ['paper-annotated.pdf'])
})

test('方框内文字画进外观流：页面上直接可见，不依赖阅读器渲染 /Contents', async () => {
  const { source, outputDir } = fixture()
  const result = await exportAnnotatedPdf(source, [
    { id: 'r1', type: 'rect', page: 1, color: '#8ce99a', rects: [[0.1, 0.55, 0.6, 0.15]], note: '这里需要复核实验设置' },
  ], outputDir)

  const doc = mupdf.Document.openDocument(new Uint8Array(fs.readFileSync(result.outputPath)), 'application/pdf')
  const page = doc.loadPage(0)
  const scale = 2
  const pixmap = page.toPixmap([scale, 0, 0, scale, 0, 0], mupdf.ColorSpace.DeviceRGB, false)
  const pixels = pixmap.getPixels()
  const width = pixmap.getWidth()
  const height = pixmap.getHeight()
  const components = pixels.length / (width * height)
  // 方框内部的像素区域（归一化 → 像素，页面尺寸 595 × 842）。
  const x0 = Math.round(0.1 * width) + 6
  const x1 = Math.round(0.7 * width) - 6
  const y0 = Math.round(0.55 * height) + 6
  const y1 = Math.round(0.7 * height) - 6
  let dark = 0
  let total = 0
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      const offset = (y * width + x) * components
      total += 1
      if (pixels[offset] < 120 && pixels[offset + 1] < 120 && pixels[offset + 2] < 120) dark += 1
    }
  }
  pixmap.destroy()
  page.destroy()
  doc.destroy()
  assert.ok(total > 0)
  assert.ok(dark > 40, '框内的注释文字应当被渲染出来，实际深色像素：' + dark + '/' + total)
})
