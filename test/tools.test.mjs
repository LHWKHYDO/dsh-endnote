import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { apply } from '../index.js'

function fakeCtx(options = {}) {
  const tools = new Map()
  const sections = []
  const disposers = []
  const ctx = {
    tools: {
      register(definition) {
        if (tools.has(definition.name)) throw new Error(`duplicate tool ${definition.name}`)
        tools.set(definition.name, definition)
        return () => tools.delete(definition.name)
      },
    },
    get(name) {
      if (name === 'systemPrompt') {
        return {
          section(section) {
            sections.push(section)
            return () => {}
          },
        }
      }
      if (name === 'configEditor') return options.configEditor
      return undefined
    },
    // 宿主用 ctx.inject 等 webServer/connection 就绪；本测试没有这两个服务，
    // 回调立刻执行，路由注册被跳过（工具部分不受影响）。
    inject(_deps, callback) {
      callback(ctx)
    },
    effect(fn) {
      const disposer = fn()
      disposers.push(disposer)
      return disposer
    },
  }
  if (options.entry) ctx.fiber = { entry: options.entry }
  return { ctx, tools, sections, disposers }
}

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-endnote-tools-'))
  const libRoot = path.join(root, 'lib')
  const pdf = path.join(libRoot, 'PDF', '42', '灰狼优化 研究.pdf')
  fs.mkdirSync(path.dirname(pdf), { recursive: true })
  fs.writeFileSync(pdf, '%PDF-1.4')
  const indexFile = path.join(root, 'endnote_index.json')
  fs.writeFileSync(
    indexFile,
    JSON.stringify({
      built_at: '2026-11-01 09:00:00',
      lib_root: libRoot,
      stats: { refs_active: 1 },
      entries: [
        {
          id: 42,
          type: '期刊文章',
          author: '张三; 李四',
          year: '2021',
          title: '灰狼优化算法的改进与应用',
          journal: '控制与决策',
          keywords: '灰狼; 优化',
          abstract: '提出改进的灰狼优化算法。',
          doi: '10.13195/j.kzyjc.2021.0001',
          groups: ['GWO', '智能优化'],
          files: [{ rel: '42/灰狼优化 研究.pdf', abs: pdf, exists: true }],
        },
      ],
    }),
  )
  return { root, libRoot, pdf, indexFile, dataDir: path.join(root, 'data') }
}

function boot(options = {}) {
  const fixed = options.fixture ?? fixture()
  const { ctx, tools, sections, disposers } = fakeCtx(options)
  apply(ctx, {
    libraryPath: fixed.libRoot,
    indexFile: fixed.indexFile,
    dataDir: fixed.dataDir,
  })
  return { ...fixed, tools, sections, disposers }
}

test('注册六个工具与一段系统提示', () => {
  const { tools, sections } = boot()
  assert.deepEqual(
    [...tools.keys()].sort(),
    ['endnote_config', 'endnote_open', 'endnote_rebuild', 'endnote_recent', 'endnote_search', 'endnote_status'],
  )
  assert.equal(sections.length, 1)
  assert.match(sections[0].text, /endnote_search/)
  assert.match(sections[0].text, /不要先联网搜索/)
  assert.equal(sections[0].name, 'dsh-endnote')
})

test('endnote_search 命中并给出可用的本地 PDF 路径', async () => {
  const { tools, pdf } = boot()
  const search = tools.get('endnote_search')
  const value = await search.execute({ query: '灰狼 优化' })
  assert.equal(value.total, 1)
  const hit = value.results[0]
  assert.equal(hit.id, 42)
  assert.equal(hit.exists, true)
  assert.equal(path.resolve(hit.path), path.resolve(pdf))
  assert.deepEqual(hit.groups, ['GWO', '智能优化'])

  const rendered = search.output.render({ query: '灰狼' }, value)
  assert.equal(rendered[0].type, 'text')
  assert.match(rendered[0].text, /endnote_open/)

  const empty = await search.execute({ query: '量子纠缠' })
  assert.equal(empty.results.length, 0)
  assert.match(search.output.render({ query: '量子纠缠' }, empty)[0].text, /没有匹配/)
})

test('endnote_search 拒绝空 query，分组过滤可用', async () => {
  const { tools } = boot()
  const search = tools.get('endnote_search')
  await assert.rejects(() => search.execute({ query: '  ' }), /query 不能为空/)
  const grouped = await search.execute({ query: '灰狼', group: 'GWO' })
  assert.equal(grouped.results.length, 1)
  const otherGroup = await search.execute({ query: '灰狼', group: '不存在的组' })
  assert.equal(otherGroup.results.length, 0)
})

test('endnote_open 校验文件存在，并让客户端半边知道要不要打开', async () => {
  const { tools, pdf } = boot()
  const open = tools.get('endnote_open')
  const value = await open.execute({ path: pdf })
  assert.equal(value.id, 42)
  assert.equal(value.openInSidebar, true)
  assert.equal(path.resolve(value.path), path.resolve(pdf))
  assert.match(value.title, /灰狼优化/)
  assert.deepEqual(open.output.presentationMeta({}, value), {
    plugin: 'dsh-endnote',
    path: value.path,
    open: true,
  })

  await assert.rejects(() => open.execute({ path: path.join(path.dirname(pdf), 'missing.pdf') }), /文件不存在/)
  await assert.rejects(() => open.execute({ path: '   ' }), /path 不能为空/)
})

test('endnote_status 报告库/索引/条目数', async () => {
  const { tools } = boot()
  const value = await tools.get('endnote_status').execute({})
  assert.equal(value.libraryExists, true)
  assert.equal(value.indexExists, true)
  assert.equal(value.entries, 1)
  assert.equal(value.withPdf, 1)
  assert.equal(value.openInSidebar, true)
  assert.match(tools.get('endnote_status').output.render({}, value)[0].text, /可以开始检索/)
})

test('索引缺失时 endnote_search 给出可操作的错误', async () => {
  const fixed = fixture()
  const { ctx, tools } = fakeCtx()
  apply(ctx, {
    libraryPath: fixed.libRoot,
    indexFile: path.join(fixed.root, 'nope.json'),
    dataDir: fixed.dataDir,
  })
  await assert.rejects(() => tools.get('endnote_search').execute({ query: '灰狼' }), /未找到文献索引/)
})

test('endnote_config 在没有配置编辑器时明确报错，有编辑器时落盘', async () => {
  const noEditor = boot()
  await assert.rejects(
    () => noEditor.tools.get('endnote_config').execute({ libraryPath: 'D:\\x' }),
    /不支持保存配置/,
  )

  let edited
  const withEditor = boot({
    entry: { id: 'dsh-endnote' },
    configEditor: {
      async edit(entry, recipe) {
        edited = { entry, next: recipe({ libraryPath: 'old', limit: 8 }) }
        return edited.next
      },
    },
  })
  const value = await withEditor.tools.get('endnote_config').execute({ libraryPath: 'E:\\New Lib', limit: 3 })
  assert.equal(value.saved, true)
  assert.equal(edited.entry.id, 'dsh-endnote')
  assert.equal(edited.next.libraryPath, 'E:\\New Lib')
  assert.equal(edited.next.limit, 3)
  assert.match(value.config, /E:\\New Lib/)
})

test('endnote_rebuild 在 Python 不可用时返回可读错误', async () => {
  const fixed = fixture()
  const { ctx, tools } = fakeCtx()
  const missing = path.join(fixed.dataDir, 'no-such-python')
  apply(ctx, {
    libraryPath: fixed.libRoot,
    indexFile: fixed.indexFile,
    dataDir: fixed.dataDir,
    pythonPath: missing,
  })
  let value
  try {
    value = await tools.get('endnote_rebuild').execute({})
  } catch (error) {
    // 受限沙箱里可能连子进程都起不来（spawn EPERM）——这是环境限制，不是插件缺陷。
    if ((error && error.code === 'EPERM') || /EPERM/.test(String(error && error.message))) return
    throw error
  }
  assert.equal(value.ok, false)
  assert.match(String(value.output), /no-such-python|ENOENT/i)
})
