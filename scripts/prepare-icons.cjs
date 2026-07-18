/**
 * Builds the home-screen icons from public/logo-mark.png.
 *
 * The mark is black line art on transparency. Dropped straight onto a launcher it
 * would be invisible on a dark wallpaper, so each icon is composited onto solid
 * white and padded.
 *
 * Two shapes are produced:
 *   icon-192 / icon-512 — normal icons, modest padding
 *   maskable-512        — Android may crop this to a circle or squircle, so the
 *                         artwork sits inside the 80% safe zone
 */
const fs = require('fs')
const zlib = require('zlib')
const path = require('path')

const ROOT = process.argv[2] ?? '.'
const SRC = path.join(ROOT, 'public', 'logo-mark.png')
const OUT_DIR = path.join(ROOT, 'public')

const BG = [255, 255, 255]

/* ------------------------------- PNG decode ------------------------------- */

function decodePNG(buf) {
  const width = buf.readUInt32BE(16)
  const height = buf.readUInt32BE(20)
  const colorType = buf[25]
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0
  if (buf[24] !== 8 || !channels) throw new Error(`Expected 8-bit RGB/RGBA, got ${colorType}`)

  const idat = []
  let off = 8
  while (off < buf.length) {
    const len = buf.readUInt32BE(off)
    const type = buf.slice(off + 4, off + 8).toString()
    if (type === 'IDAT') idat.push(buf.slice(off + 8, off + 8 + len))
    if (type === 'IEND') break
    off += 12 + len
  }

  const raw = zlib.inflateSync(Buffer.concat(idat))
  const stride = width * channels
  const out = Buffer.alloc(height * stride)

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    const line = raw.slice(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    const cur = out.slice(y * stride, (y + 1) * stride)
    const prev = y > 0 ? out.slice((y - 1) * stride, y * stride) : Buffer.alloc(stride)

    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0
      const b = prev[x]
      const c = x >= channels ? prev[x - channels] : 0
      const v = line[x]
      let val
      switch (filter) {
        case 0: val = v; break
        case 1: val = v + a; break
        case 2: val = v + b; break
        case 3: val = v + ((a + b) >> 1); break
        case 4: {
          const p = a + b - c
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
          val = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)
          break
        }
        default: throw new Error('Unknown filter ' + filter)
      }
      cur[x] = val & 0xff
    }
  }
  return { width, height, channels, data: out }
}

/* ------------------------------- PNG encode ------------------------------- */

const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crc])
}

function encodePNG({ width, height, data }) {
  const stride = width * 4
  const raw = Buffer.alloc(height * (stride + 1))
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* -------------------------------- compose --------------------------------- */

/** Sample the source with box-averaging, returning premultiplied coverage. */
function sampleAlpha(src, sx0, sx1, sy0, sy1) {
  let a = 0, n = 0
  for (let y = sy0; y < sy1; y++) {
    for (let x = sx0; x < sx1; x++) {
      if (x < 0 || y < 0 || x >= src.width || y >= src.height) { n++; continue }
      a += src.data[(y * src.width + x) * src.channels + 3]
      n++
    }
  }
  return n ? a / n : 0
}

/**
 * Draws the mark centred on a white square of `size`, with `safe` fraction of the
 * square available to the artwork.
 */
function buildIcon(src, size, safe) {
  const out = Buffer.alloc(size * size * 4)

  // Fill white, fully opaque.
  for (let i = 0; i < out.length; i += 4) {
    out[i] = BG[0]; out[i + 1] = BG[1]; out[i + 2] = BG[2]; out[i + 3] = 255
  }

  const box = size * safe
  const scale = Math.min(box / src.width, box / src.height)
  const drawW = Math.round(src.width * scale)
  const drawH = Math.round(src.height * scale)
  const offX = Math.round((size - drawW) / 2)
  const offY = Math.round((size - drawH) / 2)
  const step = src.width / drawW

  for (let y = 0; y < drawH; y++) {
    for (let x = 0; x < drawW; x++) {
      const alpha = sampleAlpha(
        src,
        Math.floor(x * step), Math.ceil((x + 1) * step),
        Math.floor(y * step), Math.ceil((y + 1) * step),
      ) / 255

      if (alpha <= 0) continue
      const di = ((offY + y) * size + (offX + x)) * 4
      // Black ink over white background.
      out[di] = Math.round(BG[0] * (1 - alpha))
      out[di + 1] = Math.round(BG[1] * (1 - alpha))
      out[di + 2] = Math.round(BG[2] * (1 - alpha))
      out[di + 3] = 255
    }
  }
  return { width: size, height: size, data: out }
}

/* ---------------------------------- run ----------------------------------- */

const src = decodePNG(fs.readFileSync(SRC))
console.log(`source: ${src.width}x${src.height}`)

const targets = [
  ['icon-192.png', 192, 0.78],
  ['icon-512.png', 512, 0.78],
  ['apple-touch-icon.png', 180, 0.74],
  // Android crops maskable icons, so keep the mark well inside the safe zone.
  ['maskable-512.png', 512, 0.6],
]

for (const [name, size, safe] of targets) {
  fs.writeFileSync(path.join(OUT_DIR, name), encodePNG(buildIcon(src, size, safe)))
  console.log(`wrote public/${name} ${size}x${size} (safe ${safe})`)
}
