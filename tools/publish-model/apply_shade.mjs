// Multiplies a texture by a brightness correction baked by delight_texture.py (<slug>-shade.u16 + .json), in
// linear light. The correction is small (e.g. 4096 px) and smooth; it is read bilinearly at the texture's size.
//
// Usage: node apply_shade.mjs <texture.jpg> <shade.u16> <output.jpg>
//        node apply_shade.mjs -h | --help
import { readFileSync } from 'node:fs'
import sharp from 'sharp'

// -h/--help: print the header comment of this file
if (process.argv.slice(2).some((a) => a === '-h' || a === '--help')) {
  const { fileURLToPath } = await import('node:url')
  const header = readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//'))
  console.log(header.map((l) => l.replace(/^\/\/ ?/, '')).join('\n'))
  process.exit(0)
}

const [input, shadePath, output] = process.argv.slice(2)
if (!output) throw new Error('usage: node apply_shade.mjs <texture.jpg> <shade.u16> <output.jpg>')
const meta = JSON.parse(readFileSync(shadePath.replace(/\.u16$/, '.json'), 'utf8'))
const raw = readFileSync(shadePath)
const shade = new Uint16Array(raw.buffer, raw.byteOffset, raw.byteLength / 2)
const sw = meta.width
const sh = meta.height

sharp.cache(false)
const { data, info } = await sharp(input, { limitInputPixels: false }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const { width: w, height: h } = info

// sRGB <-> linear lookup tables
const toLinear = new Float32Array(256).map((_, i) => {
  const c = i / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
})
const STEPS = 4096
const toSrgb = new Uint8Array(STEPS + 1).map((_, i) => {
  const c = i / STEPS
  const s = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055
  return Math.round(Math.min(Math.max(s, 0), 1) * 255)
})

for (let y = 0; y < h; y++) {
  const sy = Math.min(Math.max(((y + 0.5) / h) * sh - 0.5, 0), sh - 1)
  const y0 = Math.floor(sy)
  const y1 = Math.min(y0 + 1, sh - 1)
  const fy = sy - y0
  for (let x = 0; x < w; x++) {
    const sx = Math.min(Math.max(((x + 0.5) / w) * sw - 0.5, 0), sw - 1)
    const x0 = Math.floor(sx)
    const x1 = Math.min(x0 + 1, sw - 1)
    const fx = sx - x0
    const f = ((shade[y0 * sw + x0] * (1 - fx) + shade[y0 * sw + x1] * fx) * (1 - fy) +
      (shade[y1 * sw + x0] * (1 - fx) + shade[y1 * sw + x1] * fx) * fy) / meta.scale
    const o = (y * w + x) * 3
    for (let c = 0; c < 3; c++) {
      data[o + c] = toSrgb[Math.min(Math.round(toLinear[data[o + c]] * f * STEPS), STEPS)]
    }
  }
}
await sharp(data, { raw: { width: w, height: h, channels: 3 }, limitInputPixels: false }).jpeg({ quality: 92 }).toFile(output)
console.log(`texture corrected: ${output}`)
