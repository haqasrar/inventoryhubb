/**
 * Builds the app's own branding from assets/main.png.
 *
 * This is the InventoryHub mark — the app itself, not any one shop. Shops upload
 * their own logo under Shop details and it is theirs alone; this one is the login
 * screen, the sidebar and the home-screen icon.
 *
 * assets/main.png already carries a clean alpha channel: the artwork is cut out and
 * the grey backdrop behind it sits at alpha 0. So nothing has to be keyed out here —
 * the work is cropping away the empty space, splitting the cube from the wordmark,
 * and building the icons.
 *
 * Colour is preserved throughout, unlike scripts/prepare-logo.cjs, which flattens
 * black line art. Resampling is done on premultiplied alpha, so the grey still
 * sitting in the RGB of the transparent pixels cannot bleed into the edges.
 *
 * Pure Node: zlib only, no image libraries.
 *
 *   node scripts/prepare-brand.cjs .
 */
const fs = require('fs')
const zlib = require('zlib')
const path = require('path')

const ROOT = process.argv[2] ?? '.'
const SRC = path.join(ROOT, 'assets', 'main.png')
const OUT_DIR = path.join(ROOT, 'public')

/** Icons sit on near-black: the mark is a glowing cube that would wash out on white. */
const ICON_BG = [15, 23, 42] // slate-900, matching the app's dark surfaces

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
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* ------------------------------- geometry --------------------------------- */

const VISIBLE = 8

/** Tightest box containing any visible pixel, within an optional column range. */
function contentBox(img, x0 = 0, x1 = img.width) {
  let minX = x1, minY = img.height, maxX = x0 - 1, maxY = -1
  for (let y = 0; y < img.height; y++) {
    for (let x = x0; x < x1; x++) {
      if (img.data[(y * img.width + x) * 4 + 3] > VISIBLE) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < minX) throw new Error('Found no artwork in that range.')
  return { minX, minY, maxX, maxY }
}

function crop(img, box) {
  const w = box.maxX - box.minX + 1
  const h = box.maxY - box.minY + 1
  const out = Buffer.alloc(w * h * 4)
  for (let y = 0; y < h; y++) {
    const from = ((box.minY + y) * img.width + box.minX) * 4
    img.data.copy(out, y * w * 4, from, from + w * 4)
  }
  return { width: w, height: h, data: out }
}

/**
 * The lockup is a cube, a gap, then the wordmark. Finding the widest fully empty
 * column run means the split survives the artwork being redrawn at another size.
 */
function widestGap(img, box) {
  const runs = []
  let start = null

  for (let x = box.minX; x <= box.maxX; x++) {
    let filled = false
    for (let y = box.minY; y <= box.maxY && !filled; y++) {
      if (img.data[(y * img.width + x) * 4 + 3] > VISIBLE) filled = true
    }
    if (!filled) {
      if (start === null) start = x
    } else {
      if (start !== null) runs.push([start, x - 1])
      start = null
    }
  }

  if (runs.length === 0) throw new Error('No gap found between the mark and the wordmark.')
  return runs.sort((a, b) => b[1] - b[0] - (a[1] - a[0]))[0]
}

/**
 * Box-average downscale on premultiplied alpha, so the colour of fully transparent
 * pixels cannot leak into the visible edge as a grey fringe.
 */
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

      let r = 0, g = 0, b = 0, a = 0, n = 0
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const i = (sy * img.width + sx) * 4
          const alpha = img.data[i + 3] / 255
          r += img.data[i] * alpha
          g += img.data[i + 1] * alpha
          b += img.data[i + 2] * alpha
          a += img.data[i + 3]
          n++
        }
      }

      const i = (y * w + x) * 4
      const avgA = n ? a / n : 0
      // Undo the premultiply, guarding against dividing by an almost-zero alpha.
      const k = avgA > 0.5 ? 255 / avgA / n : 0
      out[i] = Math.min(255, Math.round(r * k))
      out[i + 1] = Math.min(255, Math.round(g * k))
      out[i + 2] = Math.min(255, Math.round(b * k))
      out[i + 3] = Math.round(avgA)
    }
  }

  return { width: w, height: h, data: out }
}

/** Draws the mark centred on a solid square, with `safe` of the square usable. */
function buildIcon(mark, size, safe) {
  const out = Buffer.alloc(size * size * 4)
  for (let i = 0; i < out.length; i += 4) {
    out[i] = ICON_BG[0]; out[i + 1] = ICON_BG[1]; out[i + 2] = ICON_BG[2]; out[i + 3] = 255
  }

  const box = size * safe
  const scale = Math.min(box / mark.width, box / mark.height)
  const drawW = Math.max(1, Math.round(mark.width * scale))
  const scaled = resize(mark, drawW)
  const offX = Math.round((size - scaled.width) / 2)
  const offY = Math.round((size - scaled.height) / 2)

  for (let y = 0; y < scaled.height; y++) {
    for (let x = 0; x < scaled.width; x++) {
      const si = (y * scaled.width + x) * 4
      const alpha = scaled.data[si + 3] / 255
      if (alpha <= 0) continue

      const di = ((offY + y) * size + (offX + x)) * 4
      for (let c = 0; c < 3; c++) {
        out[di + c] = Math.round(scaled.data[si + c] * alpha + ICON_BG[c] * (1 - alpha))
      }
      out[di + 3] = 255
    }
  }

  return { width: size, height: size, data: out }
}

/* -------------------------------- run ------------------------------------- */

const write = (name, img) => {
  const file = path.join(OUT_DIR, name)
  fs.writeFileSync(file, encodePNG(img))
  console.log(`  ${name.padEnd(20)} ${img.width}×${img.height}  ${(fs.statSync(file).size / 1024).toFixed(1)} KB`)
}

const src = decodePNG(fs.readFileSync(SRC))
console.log(`Source ${src.width}×${src.height}`)

const full = contentBox(src)
const gap = widestGap(src, full)
console.log(`Artwork x${full.minX}–${full.maxX}, split at the gap x${gap[0]}–${gap[1]}`)

const lockup = resize(crop(src, full), 900)
const mark = resize(crop(src, contentBox(src, full.minX, gap[0])), 512)

console.log('\nWriting:')
write('app-logo.png', lockup)
// The icons are built from the full-size mark, but the app only ever draws it about
// 40px across — shipping 512px of gradient for that is a waste of a phone's data.
write('app-mark.png', resize(mark, 160))

// Android may crop a maskable icon to a circle, so its artwork keeps to the 80% zone.
write('icon-192.png', buildIcon(mark, 192, 0.72))
write('icon-512.png', buildIcon(mark, 512, 0.72))
write('maskable-512.png', buildIcon(mark, 512, 0.58))
write('apple-touch-icon.png', buildIcon(mark, 180, 0.72))
