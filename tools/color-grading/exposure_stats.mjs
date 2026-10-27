// TODO #75: exposure and contrast of a dive's frames (read only), with an optional correction applied first (--slope,
// on the 8-bit values, then --contrast around --pivot, as the LUT on Resolve's timeline does): over --frames frames
// spread over the folder, the luminance (Rec.709) of each pixel, 400 px wide: its mean, percentiles (1, 5, 50, 95, 99), and the shares of pixels
// near black (< 5) and near white (> 250), per channel too.
// Usage: node tools/color-grading/exposure_stats.mjs -d O:/data/2024-07-12/zone-3/frames-lens-corrected-n10
//          [--slope 0.878 0.984 1.388] [-c 1.1] [--pivot 110] [-f 60] [--skip GX033601 GX033701]
import { readdirSync } from 'node:fs'
import { parseArgs } from 'node:util'
import sharp from 'sharp'

const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    dir: { type: 'string', short: 'd' },
    frames: { type: 'string', short: 'f', default: '60' },
    slope: { type: 'boolean', default: false },
    contrast: { type: 'string', short: 'c', default: '1' },
    pivot: { type: 'string', default: '110' },
    skip: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h' },
  },
})
if (args.help || !args.dir) {
  console.log('node tools/color-grading/exposure_stats.mjs -d <frames folder> [--slope R G B] [-c 1.1] [--pivot 110] [-f 60] [--skip CLIP...]\n' +
    "Exposure and contrast of a dive's frames: luminance mean and percentiles, near-black and near-white shares.")
  process.exit(args.help ? 0 : 1)
}
const slope = args.slope ? positionals.splice(0, 3).map(Number) : [1, 1, 1]
const skip = new Set(args.skip ? positionals : [])
const CONTRAST = Number(args.contrast)
const PIVOT = Number(args.pivot)
const dir = args.dir.replace(/[\\/]?$/, '/')
const files = readdirSync(dir).filter((f) => /\.tiff?$/i.test(f) && !skip.has(f.split('.')[0])).sort()
const N = Number(args.frames)
const picked = files.length <= N ? files : Array.from({ length: N }, (_, i) => files[Math.round((i * (files.length - 1)) / (N - 1))])
const hist = new Float64Array(256)
const clipped = { black: [0, 0, 0], white: [0, 0, 0] }
let pixels = 0
let sum = 0
for (const f of picked) {
  const { data } = await sharp(dir + f).resize(400).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  for (let i = 0; i < data.length; i += 3) {
    const c = [0, 1, 2].map((k) => Math.max(0, Math.min(255, PIVOT + CONTRAST * (data[i + k] * slope[k] - PIVOT))))
    for (let k = 0; k < 3; k++) {
      if (c[k] < 5) clipped.black[k]++
      if (c[k] > 250) clipped.white[k]++
    }
    const y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
    hist[Math.round(y)]++
    sum += y
    pixels++
  }
}
const pct = (p) => {
  let acc = 0
  for (let v = 0; v < 256; v++) if ((acc += hist[v]) >= (p / 100) * pixels) return v
  return 255
}
const share = (n) => `${((100 * n) / pixels).toFixed(2)} %`
console.log(`${picked.length} frames of ${files.length}; slope ${slope.join(' ')}, contrast ${CONTRAST} around ${PIVOT}`)
console.log(`luminance: mean ${(sum / pixels).toFixed(0)}, p1 ${pct(1)}, p5 ${pct(5)}, p50 ${pct(50)}, p95 ${pct(95)}, p99 ${pct(99)}`)
console.log(`near black (<5) R G B: ${clipped.black.map(share).join(' ')}; near white (>250): ${clipped.white.map(share).join(' ')}`)
