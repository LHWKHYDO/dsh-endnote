import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

let loads = 0

/** 用 __ModuleLoader__ 捕获客户端模块注册，再拿到 factory 的返回值。 */
async function loadClientModule() {
  let captured
  globalThis.window = {
    __ModuleLoader__: {
      load(spec) {
        captured = spec
      },
    },
  }
  const url = pathToFileURL(path.resolve(import.meta.dirname, '..', 'client.js'))
  // 每个用例都重新执行一遍模块体（浏览器里每个页面只执行一次，这里用查询串破缓存）。
  await import(`${url.href}?case=${(loads += 1)}`)
  assert.ok(captured, 'client.js 应通过 __ModuleLoader__.load 注册')
  assert.equal(captured.id, 'dsh-endnote')
  return captured.factory(() => ({}))
}

function harness(sessionId = 'session-1') {
  const opened = []
  const retained = []
  const released = []
  const listeners = new Set()
  const entries = []
  const mountedListeners = new Set()

  const source = {
    getSnapshot: () => ({ entries: [...entries], hasMore: false, revision: entries.length, change: null }),
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
  const sidebar = {
    mounted: {
      getSnapshot: () => sessionId,
      subscribe(listener) {
        mountedListeners.add(listener)
        return () => mountedListeners.delete(listener)
      },
    },
    openResource(address) {
      opened.push(address)
    },
  }
  const sessions = {
    retain(id, options) {
      retained.push({ id, options })
      return {
        binding: { eventSource: source },
        release() {
          released.push(id)
        },
      }
    },
  }
  const ctx = {
    sidebarRight: sidebar,
    get: (name) => (name === 'sessions' ? sessions : undefined),
    effect(fn) {
      fn()
    },
  }
  const push = (event) => {
    entries.push({ type: 'event', event })
    for (const listener of listeners) listener()
  }
  return { ctx, opened, retained, released, push, sidebar, sessions }
}

function toolResult(seq, meta, time = Date.now()) {
  return {
    type: 'tool/result',
    seq,
    time,
    data: {
      turn: 1,
      step: 1,
      message: { role: 'tool', toolCallId: 'call-1' },
      meta,
    },
  }
}

test('apply 声明 sidebarRight 依赖', async () => {
  const module = await loadClientModule()
  assert.deepEqual(module.inject, ['sidebarRight'])
  assert.equal(typeof module.apply, 'function')
})

test('只有成功且 open=true 的 endnote_open 结果才会打开右侧栏', async () => {
  const module = await loadClientModule()
  const run = harness()
  module.apply(run.ctx)

  assert.deepEqual(run.retained.map((item) => item.id), ['session-1'])
  assert.equal(run.retained[0].options.source, 'dsh-endnote')

  run.push(toolResult(1, { plugin: 'dsh-endnote', path: 'D:\\lib\\PDF\\42\\论文 1.pdf', open: true }))
  assert.equal(run.opened.length, 1)
  assert.equal(
    run.opened[0],
    'dsh-resource://file/session/session-1/D%3A/lib/PDF/42/%E8%AE%BA%E6%96%87%201.pdf',
  )

  run.push(toolResult(2, { plugin: 'dsh-endnote', path: 'D:\\lib\\PDF\\42\\b.pdf', open: false }))
  run.push(toolResult(3, { plugin: 'other', path: 'D:\\lib\\PDF\\42\\c.pdf', open: true }))
  run.push(toolResult(4, {}))
  assert.equal(run.opened.length, 1)

  run.push(toolResult(5, { plugin: 'dsh-endnote', path: 'D:\\lib\\PDF\\42\\d.pdf', open: true }))
  assert.equal(run.opened.length, 2)
})

test('会话挂载前已在窗口里的历史结果不会触发打开', async () => {
  const module = await loadClientModule()
  const run = harness()
  run.push(toolResult(1, { plugin: 'dsh-endnote', path: 'D:\\lib\\old.pdf', open: true }, Date.now() - 60_000))
  module.apply(run.ctx)
  assert.equal(run.opened.length, 0)

  run.push(toolResult(2, { plugin: 'dsh-endnote', path: 'D:\\lib\\new.pdf', open: true }))
  assert.equal(run.opened.length, 1)
  assert.match(run.opened[0], /new\.pdf$/)
})

test('缺少 sessions / sidebarRight 时安静降级', async () => {
  const module = await loadClientModule()
  const warnings = []
  const original = console.warn
  console.warn = (...args) => warnings.push(args.join(' '))
  try {
    module.apply({ get: () => undefined, effect: (fn) => fn() })
    module.apply({ sidebarRight: { openResource() {} }, get: () => undefined, effect: (fn) => fn() })
  } finally {
    console.warn = original
  }
  assert.ok(warnings.some((line) => line.includes('sidebarRight')))
  assert.ok(warnings.some((line) => line.includes('sessions')))
})
