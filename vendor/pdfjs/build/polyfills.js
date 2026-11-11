/**
 * PDF.js 6.x 的运行时 polyfill。
 *
 * PDF.js 6 直接使用了一批 2024-2025 才进入标准、旧版 Chromium / Electron
 * 尚未实现的方法（Uint8Array#toHex、Map#getOrInsertComputed 等）。缺了它们
 * 会在解析阶段直接抛 TypeError。主线程与 worker 都 import 本文件。
 *
 * 只补缺失的方法，不覆盖宿主已有的原生实现。
 */

const TypedArrayProto = Uint8Array.prototype

if (typeof TypedArrayProto.toHex !== 'function') {
  Object.defineProperty(TypedArrayProto, 'toHex', {
    configurable: true,
    writable: true,
    value() {
      let out = ''
      for (let index = 0; index < this.length; index += 1) out += this[index].toString(16).padStart(2, '0')
      return out
    },
  })
}

if (typeof TypedArrayProto.toBase64 !== 'function') {
  Object.defineProperty(TypedArrayProto, 'toBase64', {
    configurable: true,
    writable: true,
    value() {
      let binary = ''
      for (let index = 0; index < this.length; index += 1) binary += String.fromCharCode(this[index])
      return btoa(binary)
    },
  })
}

if (typeof Uint8Array.fromHex !== 'function') {
  Object.defineProperty(Uint8Array, 'fromHex', {
    configurable: true,
    writable: true,
    value(text) {
      const clean = String(text)
      const out = new Uint8Array(Math.floor(clean.length / 2))
      for (let index = 0; index < out.length; index += 1) {
        out[index] = parseInt(clean.slice(index * 2, index * 2 + 2), 16)
      }
      return out
    },
  })
}

if (typeof Uint8Array.fromBase64 !== 'function') {
  Object.defineProperty(Uint8Array, 'fromBase64', {
    configurable: true,
    writable: true,
    value(text) {
      const binary = atob(String(text))
      const out = new Uint8Array(binary.length)
      for (let index = 0; index < binary.length; index += 1) out[index] = binary.charCodeAt(index)
      return out
    },
  })
}

if (typeof Promise.withResolvers !== 'function') {
  Promise.withResolvers = function withResolvers() {
    let resolve
    let reject
    const promise = new Promise((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve, reject }
  }
}

/** Map / WeakMap 的 getOrInsert 提案（PDF.js 用于内部缓存）。 */
for (const Ctor of [Map, WeakMap]) {
  if (typeof Ctor.prototype.getOrInsert !== 'function') {
    Object.defineProperty(Ctor.prototype, 'getOrInsert', {
      configurable: true,
      writable: true,
      value(key, value) {
        if (this.has(key)) return this.get(key)
        this.set(key, value)
        return value
      },
    })
  }
  if (typeof Ctor.prototype.getOrInsertComputed !== 'function') {
    Object.defineProperty(Ctor.prototype, 'getOrInsertComputed', {
      configurable: true,
      writable: true,
      value(key, compute) {
        if (this.has(key)) return this.get(key)
        const value = compute(key)
        this.set(key, value)
        return value
      },
    })
  }
}

if (typeof Math.sumPrecise !== 'function') {
  // 精确求和（Neumaier 补偿），PDF.js 用它累加字形宽度。
  Math.sumPrecise = function sumPrecise(values) {
    let sum = 0
    let compensation = 0
    for (const value of values) {
      const next = sum + value
      compensation += Math.abs(sum) >= Math.abs(value) ? (sum - next) + value : (value - next) + sum
      sum = next
    }
    return sum + compensation
  }
}

if (typeof Math.f16round !== 'function') {
  // 半精度舍入的近似实现；只用于数值稳定性，精度要求不高。
  Math.f16round = function f16round(value) {
    const float = Math.fround(value)
    if (!Number.isFinite(float)) return float
    const buffer = new ArrayBuffer(4)
    const view = new DataView(buffer)
    view.setFloat32(0, float)
    const bits = view.getUint32(0)
    const sign = bits & 0x80000000
    const exponent = (bits >>> 23) & 0xff
    const mantissa = bits & 0x7fffff
    if (exponent === 0xff) return float
    const halfExponent = exponent - 127 + 15
    if (halfExponent >= 0x1f) return (sign ? -1 : 1) * Infinity
    if (halfExponent <= 0) return (sign ? -1 : 1) * 0
    view.setUint32(0, sign | (halfExponent << 23) | mantissa)
    return view.getFloat32(0)
  }
}

if (typeof Object.groupBy !== 'function') {
  Object.groupBy = function groupBy(items, callback) {
    const out = Object.create(null)
    let index = 0
    for (const item of items) {
      const key = String(callback(item, index))
      if (out[key] === undefined) out[key] = []
      out[key].push(item)
      index += 1
    }
    return out
  }
}

if (typeof Map.groupBy !== 'function') {
  Map.groupBy = function groupBy(items, callback) {
    const out = new Map()
    let index = 0
    for (const item of items) {
      const key = callback(item, index)
      const bucket = out.get(key)
      if (bucket === undefined) out.set(key, [item])
      else bucket.push(item)
      index += 1
    }
    return out
  }
}

/**
 * PDF.js 6 用 ReadableStream#bytes() 读取内嵌字体。Chrome 133 之前没有这个方法，
 * 缺了它字体会加载失败（控制台 “t.bytes is not a function”），页面缺字、文本层
 * 也可能一直等不到结果。这里按规范补一个：读完整个流，返回 Uint8Array。
 */
if (typeof ReadableStream !== 'undefined' && typeof ReadableStream.prototype.bytes !== 'function') {
  Object.defineProperty(ReadableStream.prototype, 'bytes', {
    configurable: true,
    writable: true,
    value: async function bytes() {
      const reader = this.getReader()
      const chunks = []
      let total = 0
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          chunks.push(value)
          total += value.length
        }
      }
      const out = new Uint8Array(total)
      let offset = 0
      for (const chunk of chunks) {
        out.set(chunk, offset)
        offset += chunk.length
      }
      return out
    },
  })
}

/**
 * PDF.js 6 用 `new Response(stream).bytes()` 读字体/图像数据。Response#bytes()
 * 是 Chrome 130 之后才有的方法，缺了它字体会加载失败（“t.bytes is not a function”），
 * 页面缺字、文本层也拿不到内容。这里按规范补上。
 */
if (typeof Response !== 'undefined' && typeof Response.prototype.bytes !== 'function') {
  Object.defineProperty(Response.prototype, 'bytes', {
    configurable: true,
    writable: true,
    value: async function bytes() {
      return new Uint8Array(await this.arrayBuffer())
    },
  })
}

/**
 * 同上：PDF.js 6 也直接调用 Blob#bytes()（Chrome 133+）。缺了它字体解析会抛
 * “t.bytes is not a function”，随后 render 永远等不到完成回调。
 */
if (typeof Blob !== 'undefined' && typeof Blob.prototype.bytes !== 'function') {
  Object.defineProperty(Blob.prototype, 'bytes', {
    configurable: true,
    writable: true,
    value: async function bytes() {
      return new Uint8Array(await this.arrayBuffer())
    },
  })
}
