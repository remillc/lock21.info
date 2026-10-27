// TODO #75: before and after of a few frames, to choose a correction (read only): each frame, then the same frame
// with its average colour pulled each --shares of the way to neutral (grey world, in linear light), or with fixed
// gains (--gain R G B), side by side, the frames stacked; one JPEG (--out), to open in an image viewer.
// Usage: node tools/color-grading/grade_preview.mjs -o O:/temp/preview.jpg [-s 0.5,0.75,1] [-g 0.732 0.962 2.195]
//          O:/data/2024-07-12/zone-3/frames-lens-corrected-n10/GX035501.0025.tif ...
import { parseArgs } from 'node:util'
import sharp from 'sharp'

const { values: args, positionals: frames } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: 'string', short: 'o' },
    shares: { type: 'string', short: 's', default: '0.5,0.75,1' },
    gain: { type: 'boolean', short: 'g', default: false },
    width: { type: 'string', short: 'w', default: '560' },
    original: { type: 'boolean', default: true },
    help: { type: 'boolean', short: 'h' },
  },
})
if (args.help || !args.out || !frames.length) {
  console.log('node tools/color-grading/grade_preview.mjs -o out.jpg [-s 0.5,0.75,1] [-g R G B] [-w 560] <frame.tif...>\n' +
    'Each frame as it is, then corrected (grey world at each share, or the given gains), side by side, frames stacked.')
  process.exit(args.help ? 0 : 1)
}
// -g: the first three positionals are the gains
const gains = args.gain ? frames.splice(0, 3).map(Number) : null
const shares = args.shares.split(',').map(Number)
const W = Number(args.width)
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const toSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

const rows = []
for (const frame of frames) {
  const { data, info } = await sharp(frame).resize(W).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const n = info.width * info.height
  const lin = Float32Array.from(data, (v) => toLin(v / 255))
  const mean = [0, 0, 0]
  for (let i = 0; i < lin.length; i++) mean[i % 3] += lin[i] / n
  const grey = (mean[0] + mean[1] + mean[2]) / 3
  const variants = [[1, 1, 1], ...(gains ? [gains] : shares.map((k) => mean.map((m) => 1 + k * (grey / m - 1))))]
  const tiles = []
  for (const gain of variants) {
    const buf = Buffer.from(lin.map((v, i) => 255 * Math.min(1, Math.max(0, toSrgb(v * gain[i % 3])))))
    tiles.push({ input: await sharp(buf, { raw: { width: info.width, height: info.height, channels: 3 } }).png().toBuffer(), left: tiles.length * (W + 8), top: 0 })
  }
  rows.push({ input: await sharp({ create: { width: variants.length * (W + 8) - 8, height: info.height, channels: 3, background: '#000' } }).composite(tiles).png().toBuffer(), height: info.height, width: variants.length * (W + 8) - 8 })
}
let top = 0
const composite = rows.map((r) => {
  const tile = { input: r.input, left: 0, top }
  top += r.height + 12
  return tile
})
await sharp({ create: { width: rows[0].width, height: top - 12, channels: 3, background: '#000' } }).composite(composite).jpeg({ quality: 88 }).toFile(args.out)
console.log(`${args.out}: ${frames.length} frames, ${gains ? 'gains ' + gains.join(' ') : 'shares ' + shares.join(', ')}`)
