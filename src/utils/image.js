/**
 * Turns a picked image file into a small data URL that can be stored straight in the
 * shop's Firestore document.
 *
 * Firebase Storage would be the usual home for uploads, but it needs the paid Blaze
 * plan, and a shop should not have to add a card to put its logo on a bill. A logo
 * and a signature shrunk to the sizes below come to a few tens of kilobytes — well
 * inside Firestore's 1 MB limit for a whole document — and they arrive with the shop
 * details in one read, so a bill printed offline still carries them.
 *
 * PNG is tried first because logos and signatures are usually line art on
 * transparency, which JPEG cannot keep. A photographed signature compresses terribly
 * as PNG, so anything still too big falls back to JPEG on white.
 */

/** Roughly 90 KB of base64 per image, leaving plenty of room in the document. */
const MAX_BYTES = 90_000

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('That file could not be opened as an image.'))
    }
    img.src = url
  })
}

/** Data URLs are base64, so the string length is a close enough measure of size. */
const byteSize = (dataUrl) => Math.ceil((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75)

/**
 * @param file      the File from an <input type="file">
 * @param maxWidth  longest edge across
 * @param maxHeight longest edge down
 * @returns a PNG or JPEG data URL, shrunk to fit
 */
export async function fileToDataUrl(file, { maxWidth = 600, maxHeight = 300 } = {}) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file — a PNG or a JPG.')
  }
  // A guard against a 40 MP phone photo being decoded before it is shrunk.
  if (file.size > 12_000_000) {
    throw new Error('That image is very large. Please choose one under 12 MB.')
  }

  const img = await loadImage(file)

  const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1)
  const width = Math.max(1, Math.round(img.width * scale))
  const height = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, width, height)

  const png = canvas.toDataURL('image/png')
  if (byteSize(png) <= MAX_BYTES) return png

  // Photographs of signatures land here. Flatten onto white first, because JPEG has
  // no transparency and would otherwise render it black.
  ctx.globalCompositeOperation = 'destination-over'
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  for (const quality of [0.85, 0.7, 0.55, 0.4]) {
    const jpeg = canvas.toDataURL('image/jpeg', quality)
    if (byteSize(jpeg) <= MAX_BYTES) return jpeg
  }

  throw new Error('That image is too detailed to store. Try a smaller or simpler one.')
}
