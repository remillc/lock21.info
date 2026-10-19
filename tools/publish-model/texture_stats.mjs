// Average colour of a zone texture, in linear light (the space where the viewer multiplies the texture by a
// colour). The viewer derives each zone's colour balance from it: see `color` in manifest.json and
// `colorBalance` in viewer/src/main.js. Near-black pixels (empty atlas background) are left out.
//
// Usage: node texture_stats.mjs <image>         prints "r g b" (linear, 0 to 1)
//        node texture_stats.mjs -h | --help
import sharp from 'sharp'

// -h/--help: print the header comment of this file
if (process.argv.slice(2).some((a) => a === '-h' || a === '--help')) {
  const { readFileSync } = await import('node:fs')
  const { fileURLToPath } = await import('node:url')
  const header = readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//'))
  console.log(header.map((l) => l.replace(/^\/\/ ?/, '')).join('\n'))
  process.exit(0)
}

const image = process.argv[2]
if (!image) throw new Error('usage: node texture_stats.mjs <image>')

sharp.cache(false)
// A 1024 px thumbnail is enough for an average and keeps 16k textures fast
const { data } = await sharp(image, { limitInputPixels: false })
  .resize(1024, 1024, { fit: 'inside' })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

const linear = new Float64Array(256).map((_, i) => {
  const c = i / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
})
const sum = [0, 0, 0]
let n = 0
for (let i = 0; i < data.length; i += 3) {
  if (data[i] + data[i + 1] + data[i + 2] <= 30) continue
  for (let c = 0; c < 3; c++) sum[c] += linear[data[i + c]]
  n++
}
if (!n) throw new Error(`${image}: no usable pixel`)
console.log(sum.map((s) => (s / n).toFixed(5)).join(' '))
