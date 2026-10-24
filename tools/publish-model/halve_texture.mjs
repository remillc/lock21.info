// Halves a zone's texture for its light tile set (tile_zone.ps1 -Light): phones and tablets, whose frames are far
// smaller than a computer's, load tiles with textures four times lighter (Christian, 2026-10-24: an old iPad and an
// iPhone 14 waited one to two minutes). The size stays a multiple of 32 px: Obj2Tiles halves the texture at each
// coarser level (3 times for a long zone, 4 levels), and a KTX2 texture whose size is not a multiple of 4 can show
// black (see README, step 5); at 16 px, zone 7's coarsest came to 798 px.
//
// Usage: node halve_texture.mjs <texture.jpg> <half.jpg>
//        node halve_texture.mjs -h | --help
import sharp from 'sharp'

// -h/--help: print the header comment of this file
if (process.argv.slice(2).some((a) => a === '-h' || a === '--help')) {
  const { readFileSync } = await import('node:fs')
  const { fileURLToPath } = await import('node:url')
  const header = readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//'))
  console.log(header.map((l) => l.replace(/^\/\/ ?/, '')).join('\n'))
  process.exit(0)
}

const [source, target] = process.argv.slice(2)
if (!source || !target) throw new Error('usage: node halve_texture.mjs <texture.jpg> <half.jpg>')

// Large textures (zone 12: 12,467 px) exceed sharp's default pixel limit
sharp.cache(false)
const image = sharp(source, { limitInputPixels: false })
const { width, height } = await image.metadata()
const half = (n) => Math.max(32, Math.round(n / 2 / 32) * 32)
await image.resize(half(width), half(height), { kernel: 'lanczos3' }).jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toFile(target)
console.log(`${source}: ${width} x ${height} -> ${half(width)} x ${half(height)}`)
