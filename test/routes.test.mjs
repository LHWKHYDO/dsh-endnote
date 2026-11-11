import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'
import { apply } from '../index.js'

/** 构造请求：可写方法、URL 与 JSON 请求体。 */
function makeRequest(method, url, body) {
  const stream = Readable.from(body === undefined ? [] : [Buffer.from(body)])
  stream.method = method
  stream.url = url
  stream.headers = body === undefined ? {} : { 'content-type': 'application/json' }
  return stream
}

/** 构造响应：记录状态码、响应头与正文。 */
function makeResponse() {
  const chunks = []
  let finish = () => {}
  const done = new Promise((resolve) => { finish = resolve })
  return {
    statusCode: 200,
    headers: {},
    done,
    writable: true,
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = value },
    write(chunk) { chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))); return true },
    on() { return this },
    once() { return this },
    emit() { return false },
    end(chunk) {
      if (chunk !== undefined) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)))
      finish()
    },
    destroy() { this.destroyed = true; finish() },
    get body() { return Buffer.concat(chunks).toString('utf8') },
    json() { return JSON.parse(this.body) },
  }
}

function boot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-endnote-routes-'))
  const libRoot = path.join(root, 'lib')
  const pdf = path.join(libRoot, 'PDF', '1', 'paper.pdf')
  fs.mkdirSync(path.dirname(pdf), { recursive: true })
  fs.writeFileSync(pdf, '%PDF-1.4')
  const indexFile = path.join(root, 'index.json')
  fs.writeFileSync(indexFile, JSON.stringify({ lib_root: libRoot, stats: {}, entries: [] }))

  const routes = new Map()
  const webServer = {
    register(route) {
      routes.set(route.path, route)
      return () => routes.delete(route.path)
    },
  }
  const connection = { requestRejection: () => undefined }
  const ctx = {
    tools: { register: () => () => {} },
    get(name) {
      if (name === 'webServer') return webServer
      if (name === 'connection') return connection
      return undefined
    },
    inject(_deps, callback) { callback(ctx) },
    effect(fn) { return fn() },
  }
  apply(ctx, { libraryPath: libRoot, indexFile, dataDir: path.join(root, 'data') })

  const of = (routePath) => {
    const route = routes.get(routePath)
    assert.ok(route, `route not registered: ${routePath}`)
    return route
  }
  return { root, pdf, routes, of }
}

test('注册标注路由与 PDF.js 静态路由', () => {
  const { of } = boot()
  assert.ok(of('/dsh-endnote/pdf-annotations'))
  assert.equal(of('/dsh-endnote/vendor/pdfjs').kind, 'prefix')
})

test('PDF.js 静态路由只下发白名单文件', async () => {
  const { of } = boot()
  const handler = of('/dsh-endnote/vendor/pdfjs').handler

  const ok = makeResponse()
  await handler(makeRequest('GET', '/dsh-endnote/vendor/pdfjs/build/pdf.min.mjs'), ok)
  await ok.done
  assert.equal(ok.statusCode, 200)
  assert.match(String(ok.headers['content-type']), /javascript/)
  assert.ok(ok.body.length > 1000)

  const traversal = makeResponse()
  await handler(makeRequest('GET', '/dsh-endnote/vendor/pdfjs/../../package.json'), traversal)
  assert.ok([403, 404].includes(traversal.statusCode), `unexpected ${traversal.statusCode}`)

  const denied = makeResponse()
  await handler(makeRequest('GET', '/dsh-endnote/vendor/pdfjs/build/pdf.mjs.map'), denied)
  assert.equal(denied.statusCode, 404)

  const method = makeResponse()
  await handler(makeRequest('POST', '/dsh-endnote/vendor/pdfjs/build/pdf.min.mjs'), method)
  assert.equal(method.statusCode, 405)
})

test('标注 POST 保存后 GET 能读回，且只写插件数据目录', async () => {
  const { root, pdf, of } = boot()
  const handler = of('/dsh-endnote/pdf-annotations').handler

  const save = makeResponse()
  await handler(makeRequest('POST', '/dsh-endnote/pdf-annotations', JSON.stringify({
    path: pdf,
    annotations: [
      { id: 'h1', type: 'highlight', page: 1, color: '#ffe066', rects: [[0.1, 0.1, 0.2, 0.02]], text: '摘要' },
      { id: 'r1', type: 'rect', page: 1, color: '#8ce99a', rect: [0.2, 0.2, 0.3, 0.2], note: '方框内标注' },
    ],
  })), save)
  assert.equal(save.statusCode, 200)
  assert.equal(save.json().count, 2)

  const read = makeResponse()
  await handler(makeRequest('GET', '/dsh-endnote/pdf-annotations?path=' + encodeURIComponent(pdf)), read)
  assert.equal(read.statusCode, 200)
  const loaded = read.json()
  assert.equal(loaded.annotations.length, 2)
  assert.equal(loaded.annotations[1].note, '方框内标注')

  // 侧车落在 dataDir，库目录里没有新增文件。
  const libFiles = fs.readdirSync(path.join(root, 'lib'), { recursive: true })
  assert.ok(libFiles.every((entry) => !String(entry).endsWith('.json')))
})

test('标注路由拒绝非法输入', async () => {
  const { of } = boot()
  const handler = of('/dsh-endnote/pdf-annotations').handler

  const relative = makeResponse()
  await handler(makeRequest('GET', '/dsh-endnote/pdf-annotations?path=paper.pdf'), relative)
  assert.equal(relative.statusCode, 400)

  const notPdf = makeResponse()
  await handler(makeRequest('POST', '/dsh-endnote/pdf-annotations', JSON.stringify({
    path: path.join(os.tmpdir(), 'x.txt'),
    annotations: [],
  })), notPdf)
  assert.equal(notPdf.statusCode, 400)

  const missing = makeResponse()
  await handler(makeRequest('POST', '/dsh-endnote/pdf-annotations', JSON.stringify({
    path: path.join(os.tmpdir(), 'definitely-missing.pdf'),
    annotations: [],
  })), missing)
  assert.equal(missing.statusCode, 404)

  const badShape = makeResponse()
  await handler(makeRequest('POST', '/dsh-endnote/pdf-annotations', JSON.stringify({ path: '/tmp/a.pdf' })), badShape)
  assert.equal(badShape.statusCode, 400)
})
