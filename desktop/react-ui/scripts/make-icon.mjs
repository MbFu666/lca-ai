import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const S = 256
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

function encodePng(size, px) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const px = Buffer.alloc(S * S * 4)
const cx = S / 2
const cy = S / 2

function put(x, y, r, g, b) {
  const i = (y * S + x) * 4
  px[i] = r
  px[i + 1] = g
  px[i + 2] = b
  px[i + 3] = 255
}

for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    const dx = x - cx
    const dy = y - cy
    const d = Math.sqrt(dx * dx + dy * dy)
    const t = 1 - y / S
    if (d <= 82) {
      put(x, y, Math.round(63 + 40 * t), Math.round(138 + 50 * t), Math.round(92 + 40 * t))
    } else if (d <= 92) {
      put(x, y, 46, 52, 48)
    } else {
      put(x, y, 23, 25, 28)
    }
  }
}

for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    const dx = x - cx
    const dy = y - cy
    const d = Math.sqrt(dx * dx + dy * dy)
    if (d <= 82 && Math.abs(dx) <= 5 && dy > -20) {
      put(x, y, 23, 25, 28)
    }
    if (d <= 82 && Math.abs(dy + 20) <= 5 && dx < 30) {
      put(x, y, 23, 25, 28)
    }
  }
}

const png = encodePng(S, px)

const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(1, 4)
const entry = Buffer.alloc(16)
entry[0] = 0
entry[1] = 0
entry[2] = 0
entry[3] = 0
entry.writeUInt16LE(1, 4)
entry.writeUInt16LE(32, 6)
entry.writeUInt32LE(png.length, 8)
entry.writeUInt32LE(22, 12)

const outDir = path.join(root, 'buildResources')
mkdirSync(outDir, { recursive: true })
writeFileSync(path.join(outDir, 'icon.ico'), Buffer.concat([header, entry, png]))
writeFileSync(path.join(outDir, 'icon.png'), png)
console.log('icon written:', path.join(outDir, 'icon.ico'), png.length, 'bytes png payload')
