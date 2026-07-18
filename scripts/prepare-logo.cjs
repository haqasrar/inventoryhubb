/**
 * Removes the baked-in checkerboard background from assets/logo.png, crops the
 * result, and writes transparent PNGs into public/.
 *
 * Pure Node: decodes and re-encodes PNG with zlib only, no image libraries.
 */
const fs = require('fs')
const zlib = require('zlib')
const path = require('path')

const ROOT = process.argv[2]
const SRC = path.join(ROOT, 'assets', 'logo.png')
const OUT_DIR = path.join(ROOT, 'public')

/* ------------------------------- PNG decode ------------------------------- */

function decodePNG(buf) {
  const width = buf.readUInt32BE(16)
  const height = buf.readUInt32BE(20)
  const bitDepth = buf[24]
  const colorType = buf[25]
  if (bitDepth !== 8 || colorType !== 6) {
    throw new Error(`Expected 8-bit RGBA, got bitDepth=${bitDepth} colorType=${colorType}`)
  }

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
  const bpp = 4
  const stride = width * bpp
  const out = Buffer.alloc(height * stride)

  // Undo per-scanline PNG filters.
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    const line = raw.slice(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    const cur = out.slice(y * stride, (y + 1) * stride)
    const prev = y > 0 ? out.slice((y - 1) * stride, y * stride) : Buffer.alloc(stride)

    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0
      const b = prev[x]
      const c = x >= bpp ? prev[x - bpp] : 0
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

  return { width, height, data: out }
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
    raw[y * (stride + 1)] = 0 // filter: none
    data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 6   // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* ------------------------------ processing -------------------------------- */

/**
 * The artwork is pure black line art sitting on a white/grey checkerboard.
 * Anything lighter than LIGHT is background; anything darker than DARK is ink;
 * the band between them is the anti-aliased edge and gets a proportional alpha.
 */
const LIGHT = 200
const DARK = 90

function removeBackground({ width, height, data }) {
  const out = Buffer.alloc(data.length)
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    let alpha
    if (lum >= LIGHT) alpha = 0
    else if (lum <= DARK) alpha = 255
    else alpha = Math.round(((LIGHT - lum) / (LIGHT - DARK)) * 255)

    out[i] = 0; out[i + 1] = 0; out[i + 2] = 0 // force ink to pure black
    out[i + 3] = alpha
  }
  return { width, height, data: out }
}

/** Tightest box containing any visible pixel. */
function contentBox({ width, height, data }, x0 = 0, y0 = 0, x1 = width, y1 = height) {
  let minX = x1, minY = y1, maxX = x0 - 1, maxY = y0 - 1
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  return { minX, minY, maxX, maxY }
}

function crop(img, box, pad = 0) {
  const minX = Math.max(0, box.minX - pad)
  const minY = Math.max(0, box.minY - pad)
  const maxX = Math.min(img.width - 1, box.maxX + pad)
  const maxY = Math.min(img.height - 1, box.maxY + pad)
  const w = maxX - minX + 1
  const h = maxY - minY + 1
  const out = Buffer.alloc(w * h * 4)
  for (let y = 0; y < h; y++) {
    img.data.copy(out, y * w * 4, ((minY + y) * img.width + minX) * 4, ((minY + y) * img.width + minX + w) * 4)
  }
  return { width: w, height: h, data: out }
}

/** Box-average downscale — good enough and keeps edges smooth. */
function resize(img, targetW) {
  if (targetW >= img.width) return img
  const scale = img.width / targetW
  const w = targetW
  const h = Math.max(1, Math.round(img.height / scale))
  const out = Buffer.alloc(w * h * 4)

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx0 = Math.floor(x * scale), sx1 = Math.min(img.width, Math.ceil((x + 1) * scale))
      const sy0 = Math.floor(y * scale), sy1 = Math.min(img.height, Math.ceil((y + 1) * scale))
      let a = 0, n = 0
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          a += img.data[(sy * img.width + sx) * 4 + 3]
          n++
        }
      }
      const i = (y * w + x) * 4
      out[i] = 0; out[i + 1] = 0; out[i + 2] = 0
      out[i + 3] = n ? Math.round(a / n) : 0
    }
  }
  return { width: w, height: h, data: out }
}

/** Finds the blank horizontal band separating the icon from the wordmark. */
function findSplitRow(img, box) {
  const rowHasInk = []
  for (let y = box.minY; y <= box.maxY; y++) {
    let ink = false
    for (let x = box.minX; x <= box.maxX; x++) {
      if (img.data[(y * img.width + x) * 4 + 3] > 8) { ink = true; break }
    }
    rowHasInk.push({ y, ink })
  }

  let best = null, run = null
  for (const r of rowHasInk) {
    if (!r.ink) {
      run = run ?? { start: r.y, end: r.y }
      run.end = r.y
    } else if (run) {
      if (!best || run.end - run.start > best.end - best.start) best = run
      run = null
    }
  }
  return best
}

/* ---------------------------------- run ----------------------------------- */

const src = decodePNG(fs.readFileSync(SRC))
console.log(`source: ${src.width}x${src.height}`)

const clear = removeBackground(src)
const box = contentBox(clear)
console.log(`content box: x ${box.minX}-${box.maxX}, y ${box.minY}-${box.maxY}`)

const gap = findSplitRow(clear, box)
console.log(`icon/wordmark gap: rows ${gap ? `${gap.start}-${gap.end}` : 'none found'}`)

fs.mkdirSync(OUT_DIR, { recursive: true })

// Full logo: icon + wordmark
const full = resize(crop(clear, box, 8), 720)
fs.writeFileSync(path.join(OUT_DIR, 'logo.png'), encodePNG(full))
console.log(`wrote public/logo.png ${full.width}x${full.height}`)

// Icon only, for the small square spot in the sidebar
if (gap) {
  const iconBox = contentBox(clear, box.minX, box.minY, box.maxX + 1, gap.start)
  const icon = resize(crop(clear, iconBox, 6), 256)
  fs.writeFileSync(path.join(OUT_DIR, 'logo-mark.png'), encodePNG(icon))
  console.log(`wrote public/logo-mark.png ${icon.width}x${icon.height}`)
}
