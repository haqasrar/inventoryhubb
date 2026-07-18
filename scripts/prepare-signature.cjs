/**
 * Lifts the signature off the photo of ruled paper and writes public/signature.png
 * with a transparent background.
 *
 * The logo could be cleaned with a brightness threshold because it was black on
 * white. That fails here: the ruled lines are darker than the paper, and part of the
 * page is in shadow, so "dark" does not mean "ink". Ballpoint ink is strongly blue
 * though, while paper, ruled lines and shadow all stay roughly neutral however dark
 * they get — so `blue - red` separates ink from everything else and drops the shadow
 * for free.
 *
 * The photo also contains other writing (notes along the top, a scribble at the right
 * edge, the notebook's blue margin rule), so a fixed CROP box selects the signature
 * before any of that is considered.
 *
 * Input must be PNG. If the photo is a JPEG, convert it first:
 *   powershell -c "Add-Type -AssemblyName System.Drawing; \
 *     $i=[System.Drawing.Image]::FromFile('in.jpeg'); \
 *     $i.Save('out.png',[System.Drawing.Imaging.ImageFormat]::Png)"
 */
const fs = require('fs')
const zlib = require('zlib')
const path = require('path')

const ROOT = process.argv[2] ?? '.'
const SRC = path.join(ROOT, 'assets', 'signature-raw.png')
const OUT = path.join(ROOT, 'public', 'signature.png')

/** Region of the source photo holding the signature and nothing else. */
const CROP = { x0: 541, y0: 363, x1: 1199, y1: 615 }
const PAD = 12

/** Ink starts to show above LOW and is solid by HIGH, measured as blue - red. */
const LOW = 18
const HIGH = 55

/** Everything is redrawn in one steady pen colour. */
const INK = [28, 42, 105]

const TARGET_W = 520

/* ------------------------------- PNG decode ------------------------------- */

function decodePNG(buf) {
  const width = buf.readUInt32BE(16)
  const height = buf.readUInt32BE(20)
  const colorType = buf[25]
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0
  if (buf[24] !== 8 || !channels) {
    throw new Error(`Expected 8-bit RGB or RGBA, got colorType=${colorType}`)
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

/* ---------------------------------- run ----------------------------------- */

const src = decodePNG(fs.readFileSync(SRC))
console.log(`source: ${src.width}x${src.height}, ${src.channels} channels`)

const x0 = Math.max(0, CROP.x0 - PAD)
const y0 = Math.max(0, CROP.y0 - PAD)
const x1 = Math.min(src.width - 1, CROP.x1 + PAD)
const y1 = Math.min(src.height - 1, CROP.y1 + PAD)
const cw = x1 - x0 + 1
const ch = y1 - y0 + 1

const keyed = Buffer.alloc(cw * ch * 4)
let inkPixels = 0
for (let y = 0; y < ch; y++) {
  for (let x = 0; x < cw; x++) {
    const si = ((y0 + y) * src.width + (x0 + x)) * src.channels
    const blueness = src.data[si + 2] - src.data[si]

    let alpha = 0
    if (blueness >= HIGH) alpha = 255
    else if (blueness > LOW) alpha = Math.round(((blueness - LOW) / (HIGH - LOW)) * 255)

    const di = (y * cw + x) * 4
    keyed[di] = INK[0]
    keyed[di + 1] = INK[1]
    keyed[di + 2] = INK[2]
    keyed[di + 3] = alpha
    if (alpha > 40) inkPixels++
  }
}
console.log(`cropped to ${cw}x${ch}, ${inkPixels} ink pixels`)

/** Box-average downscale, averaging alpha only since the colour is uniform. */
function resize(width, height, data, targetW) {
  if (targetW >= width) return { width, height, data }
  const scale = width / targetW
  const w = targetW
  const h = Math.max(1, Math.round(height / scale))
  const out = Buffer.alloc(w * h * 4)

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx0 = Math.floor(x * scale), sx1 = Math.min(width, Math.ceil((x + 1) * scale))
      const sy0 = Math.floor(y * scale), sy1 = Math.min(height, Math.ceil((y + 1) * scale))
      let a = 0, n = 0
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          a += data[(sy * width + sx) * 4 + 3]
          n++
        }
      }
      const i = (y * w + x) * 4
      out[i] = INK[0]
      out[i + 1] = INK[1]
      out[i + 2] = INK[2]
      out[i + 3] = n ? Math.round(a / n) : 0
    }
  }
  return { width: w, height: h, data: out }
}

const final = resize(cw, ch, keyed, TARGET_W)
fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, encodePNG(final))
console.log(`wrote ${OUT} ${final.width}x${final.height}`)
