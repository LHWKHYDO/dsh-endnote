import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  annotationFile,
  pdfStamp,
  readAnnotations,
  sanitizeAnnotations,
  writeAnnotations,
} from '../lib/annotations.js'

function workspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-endnote-ann-'))
  const dataDir = path.join(root, 'data')
  const pdf = path.join(root, 'paper.pdf')
  fs.writeFileSync(pdf, '%PDF-1.7\n')
  return { root, dataDir, pdf }
}

test('清洗标注：保留合法字段，丢弃无落点/非法类型', () => {
  const clean = sanitizeAnnotations([
    { id: 'a1', type: 'highlight', page: 2, color: '#ffe066', rects: [[0.1, 0.2, 0.3, 0.04]], text: '结论' },
    { id: 'a2', type: 'rect', page: 1, color: 'nope', rect: [0.2, 0.3, 0.4, 0.2], note: '方框内标注' },
    { id: 'bad-type', type: 'arrow', page: 1, rect: [0, 0, 0.1, 0.1] },
    { id: 'no-rect', type: 'text', page: 1, note: '没有落点' },
    { id: 'a1', type: 'highlight', page: 3, rect: [0.1, 0.1, 0.1, 0.1] },
  ])
  assert.equal(clean.length, 2)
  assert.equal(clean[0].id, 'a1')
  assert.equal(clean[0].page, 2)
  assert.equal(clean[1].id, 'a2')
  // 非法颜色回退到默认高亮色。
  assert.equal(clean[1].color, '#ffe066')
  assert.deepEqual(clean[1].rects, [[0.2, 0.3, 0.4, 0.2]])
})

test('清洗标注：坐标夹到 0..1 且不越出页面', () => {
  const [annotation] = sanitizeAnnotations([
    { type: 'rect', page: 1, rect: [0.8, 0.9, 0.5, 0.5] },
  ])
  const [x, y, w, h] = annotation.rects[0]
  assert.equal(x, 0.8)
  assert.equal(y, 0.9)
  assert.ok(Math.abs(w - 0.2) < 1e-9)
  assert.ok(Math.abs(h - 0.1) < 1e-9)
})

test('标注读写往返：只落插件数据目录，不动 PDF', () => {
  const { dataDir, pdf } = workspace()
  const before = fs.statSync(pdf).mtimeMs
  const wrote = writeAnnotations(dataDir, pdf, [
    { type: 'highlight', page: 1, color: '#8ce99a', rects: [[0.1, 0.1, 0.2, 0.02]], text: '摘要' },
  ])
  assert.equal(wrote.annotations.length, 1)
  assert.ok(fs.existsSync(annotationFile(dataDir, pdf)))
  assert.equal(fs.statSync(pdf).mtimeMs, before)

  const loaded = readAnnotations(dataDir, pdf)
  assert.equal(loaded.annotations.length, 1)
  assert.equal(loaded.annotations[0].text, '摘要')
  assert.equal(loaded.updatedAt, wrote.updatedAt)
  assert.equal(loaded.pdfStamp, pdfStamp(pdf))
})

test('不同 PDF 使用不同侧车；不存在时返回空列表', () => {
  const { root, dataDir, pdf } = workspace()
  const other = path.join(root, 'other.pdf')
  fs.writeFileSync(other, '%PDF-1.4\n')
  writeAnnotations(dataDir, pdf, [{ type: 'rect', page: 1, rect: [0.1, 0.1, 0.2, 0.2] }])
  assert.notEqual(annotationFile(dataDir, pdf), annotationFile(dataDir, other))
  assert.deepEqual(readAnnotations(dataDir, other).annotations, [])
  assert.deepEqual(readAnnotations(dataDir, path.join(root, 'missing.pdf')).annotations, [])
})

test('损坏的侧车不阻塞阅读', () => {
  const { dataDir, pdf } = workspace()
  const file = annotationFile(dataDir, pdf)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, '{not json')
  assert.deepEqual(readAnnotations(dataDir, pdf), { annotations: [], updatedAt: null, pdfStamp: pdfStamp(pdf) })
})
