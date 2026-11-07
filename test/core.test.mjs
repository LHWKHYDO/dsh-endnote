import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  IndexStore,
  parseCsv,
  parseCsvIndex,
  parseJsonIndex,
  relativeToPdfDir,
  resolveConfig,
  withResolvedFiles,
} from '../lib/index-store.js'
import { searchEntries, tokenize } from '../lib/search.js'

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-endnote-'))
}

test('parseCsv 支持引号、内嵌逗号与 CRLF', () => {
  const rows = parseCsv('a,b\r\n"x,1","he said ""hi"""\r\n1,2\r\n')
  assert.deepEqual(rows, [
    ['a', 'b'],
    ['x,1', 'he said "hi"'],
    ['1', '2'],
  ])
})

test('parseCsvIndex 解析列、分组与 PDF 相对路径', () => {
  const text = [
    '编号,简洁名称,类型,备注,本地路径,年份,作者,期刊,DOI,标题来源,处理状态,分组',
    '1,灰狼优化算法,期刊,"备注, 含逗号",D:\\lib\\PDF\\1\\gwo.pdf,2024,"Zhang, Y.; Li, M.",Journal of Heuristics,10.1000/x1,原标题,已读,群体智能;路径规划',
    '2,测试论文,会议,,D:\\lib\\PDF\\2\\t.pdf,2023,Wang,会议集,,,,测试',
  ].join('\r\n')
  const parsed = parseCsvIndex(text)
  assert.equal(parsed.entries.length, 2)
  const first = parsed.entries[0]
  assert.equal(first.id, 1)
  assert.equal(first.title, '灰狼优化算法')
  assert.equal(first.authors, 'Zhang, Y.; Li, M.')
  assert.equal(first.year, '2024')
  assert.deepEqual(first.groups, ['群体智能', '路径规划'])
  assert.ok(first.files[0].path.toLowerCase().endsWith('.pdf'))
  assert.equal(first.files[0].rel, '1/gwo.pdf', '相对路径应落在 PDF 目录内')
  assert.deepEqual(parsed.entries[1].groups, ['测试'])
})

test('parseJsonIndex 归一化作者/摘要/附件字段', () => {
  const parsed = parseJsonIndex(
    JSON.stringify({
      built_at: '2026-10-01 10:00:00',
      lib_root: 'D:\\lib',
      stats: { refs_active: 1 },
      entries: [
        {
          id: 7,
          title: 'T',
          author: 'A; B',
          year: '2020',
          groups: ['G'],
          files: [{ rel: '1/t.pdf', abs: 'D:\\lib\\PDF\\1\\t.pdf', exists: true }],
        },
      ],
    }),
  )
  assert.equal(parsed.entries[0].authors, 'A; B')
  assert.equal(parsed.entries[0].files[0].path, 'D:\\lib\\PDF\\1\\t.pdf')
  assert.equal(parsed.entries[0].files[0].exists, false, '存在性只由磁盘核对决定')
})

test('relativeToPdfDir 从绝对路径取 PDF 目录下相对路径', () => {
  assert.equal(relativeToPdfDir('D:\\lib\\PDF\\123\\a.pdf'), '123/a.pdf')
  assert.equal(relativeToPdfDir('/lib/PDF/x/y.pdf'), 'x/y.pdf')
  assert.equal(relativeToPdfDir('D:\\misc\\only.pdf'), 'only.pdf')
})

test('withResolvedFiles 把库搬迁后的路径重新指向新库并核对存在性', () => {
  const root = tmpDir()
  const pdf = path.join(root, 'PDF', '42', 'paper.pdf')
  fs.mkdirSync(path.dirname(pdf), { recursive: true })
  fs.writeFileSync(pdf, '%PDF-1.4 test')
  const entry = {
    id: 1,
    title: 'Paper',
    authors: '',
    year: '',
    journal: '',
    doi: '',
    type: '',
    groups: [],
    keywords: '',
    abstract: '',
    files: [{ rel: '42/paper.pdf', path: 'D:\\missing\\PDF\\42\\paper.pdf', exists: false }],
  }
  const resolved = withResolvedFiles(entry, 'D:\\old', root)
  assert.equal(resolved.files[0].exists, true)
  assert.equal(path.resolve(resolved.files[0].path), path.resolve(pdf))
})

test('IndexStore 按 mtime+size 缓存，文件变化后重载', () => {
  const dir = tmpDir()
  const file = path.join(dir, 'endnote_index.json')
  const write = (title) =>
    fs.writeFileSync(
      file,
      JSON.stringify({ built_at: 'x', lib_root: dir, stats: {}, entries: [{ id: 1, title }] }),
    )
  write('第一版')
  const store = new IndexStore({ ...resolveConfig({}, dir), indexFile: file })
  assert.equal(store.load().entries[0].title, '第一版')
  write('第二版，更长一些')
  assert.equal(store.load().entries[0].title, '第二版，更长一些')
})

test('resolveConfig 校验非法类型并给出默认值', () => {
  const config = resolveConfig({ limit: 5 }, 'C:\\plugin')
  assert.equal(config.limit, 5)
  assert.equal(config.openInSidebar, true)
  assert.ok(config.libraryPath.includes('EndNote'))
  assert.equal(config.dataDir, path.join('C:\\plugin', '.data'))
  assert.throws(() => resolveConfig({ limit: -1 }, 'x'), /必须是正数/)
  assert.throws(() => resolveConfig({ libraryPath: 123 }, 'x'), /必须是字符串/)
})

test('tokenize 处理中英文标点', () => {
  assert.deepEqual(tokenize('灰狼 优化，算法;MOGWO'), ['灰狼', '优化', '算法', 'mogwo'])
})

test('searchEntries：DOI 精确命中排第一，多关键词为 AND', () => {
  const entries = [
    {
      id: 1,
      title: '灰狼优化算法的改进',
      authors: '张三',
      year: '2021',
      journal: '控制与决策',
      doi: '10.1/abc',
      type: '期刊文章',
      groups: ['GWO'],
      keywords: '灰狼; 优化',
      abstract: '提出一种改进的灰狼优化算法。',
      files: [{ rel: '1/a.pdf', path: '', exists: false }],
    },
    {
      id: 2,
      title: '多目标灰狼优化算法',
      authors: '李四',
      year: '2022',
      journal: '自动化学报',
      doi: '10.1/xyz',
      type: '期刊文章',
      groups: ['MOGWO'],
      keywords: '多目标',
      abstract: '多目标灰狼优化。',
      files: [{ rel: '2/b.pdf', path: '', exists: false }],
    },
    {
      id: 3,
      title: '粒子群算法综述',
      authors: '王五',
      year: '2020',
      journal: '计算机学报',
      doi: '10.1/psw',
      type: '综述',
      groups: [],
      keywords: '粒子群',
      abstract: '综述。',
      files: [],
    },
  ]
  const byDoi = searchEntries(entries, { query: '10.1/abc' })
  assert.equal(byDoi.hits[0].entry.id, 1)

  const andHits = searchEntries(entries, { query: '灰狼 多目标' })
  assert.deepEqual(andHits.hits.map((hit) => hit.entry.id), [2])

  const grouped = searchEntries(entries, { query: '灰狼', group: 'gwo' })
  assert.deepEqual(grouped.hits.map((hit) => hit.entry.id), [1])

  const limited = searchEntries(entries, { query: '灰狼', limit: 1 })
  assert.equal(limited.hits.length, 1)
  assert.equal(limited.total, 2)

  const none = searchEntries(entries, { query: '量子计算' })
  assert.equal(none.hits.length, 0)
})
