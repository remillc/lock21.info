// TODO #75: checks a dive's frames against its Metashape mask (read only), before they replace the old ones: over
// --frames frames spread over the folder (and the mask), 500 px wide:
// - the measuring rod (bright orange: red well above blue, saturated) outside the mask's black area: rod pixels the
//   mask misses (the frames moved, or the rod did);
// - open water, the « green background »: smooth (little local detail), dark to mid, green-cyan-dominated pixels, not
//   masked: its share per frame, and the frames where it covers more than --water of the frame.
// Writes a contact sheet of the worst frames (--sheet) with the mask, the rod outside it (red) and the water (cyan).
// Usage: node tools/color-grading/check_masks.mjs -d O:/data/2024-07-12/zone-3/frames-lens-corrected-graded-n10
//          -m O:/data/2024-07-12/zone-3/_masks/guide-mask.png [-f 200] [--water 0.2] [--sheet O:/temp/masks.jpg]
import { readdirSync } from 'node:fs'
import { parseArgs } from 'node:util'
import sharp from 'sharp'

const { values: args } = parseArgs({
  options: {
    dir: { type: 'string', short: 'd' },
    mask: { type: 'string', short: 'm' },
    frames: { type: 'string', short: 'f', default: '200' },
    water: { type: 'string', default: '0.2' },
    sheet: { type: 'string', short: 's' },
    help: { type: 'boolean', short: 'h' },
  },
})
if (args.help || !args.dir || !args.mask) {
  console.log('node tools/color-grading/check_masks.mjs -d <frames folder> -m <mask.png> [-f 200] [--water 0.2] [-s sheet.jpg]\n' +
    'The rod outside the mask, and the open water (« green background ») not masked, per frame.')
  process.exit(args.help ? 0 : 1)
}
const W = 500
const dir = args.dir.replace(/[\\/]?$/, '/')
const files = readdirSync(dir).filter((f) => /\.tiff?$/i.test(f)).sort()
const N = Number(args.frames)
const picked = files.length <= N ? files : Array.from({ length: N }, (_, i) => files[Math.round((i * (files.length - 1)) / (N - 1))])
const mask = await sharp(args.mask).resize(W).greyscale().raw().toBuffer({ resolveWithObject: true })
const H = mask.info.height
const masked = (i) => mask.data[i] < 128

const results = []
for (const f of picked) {
  const { data } = await sharp(dir + f).resize(W, H, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const lum = new Float32Array(W * H)
  for (let i = 0; i < W * H; i++) lum[i] = 0.2126 * data[3 * i] + 0.7152 * data[3 * i + 1] + 0.0722 * data[3 * i + 2]
  let rodOut = 0
  let rodIn = 0
  let water = 0
  const flags = new Uint8Array(W * H)
  for (let y = 2; y < H - 2; y++) {
    for (let x = 2; x < W - 2; x++) {
      const i = y * W + x
      const [r, g, b] = [data[3 * i], data[3 * i + 1], data[3 * i + 2]]
      const rod = r > 150 && r - b > 90 && r > g + 25
      if (rod) {
        if (masked(i)) rodIn++
        else {
          rodOut++
          flags[i] = 1
        }
      }
      // local detail: the spread of luminance in a 5 x 5 window
      let min = 255
      let max = 0
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const v = lum[i + dy * W + dx]
        if (v < min) min = v
        if (v > max) max = v
      }
      if (!masked(i) && max - min < 6 && lum[i] < 140 && g >= r && g + b > 2 * r) {
        water++
        flags[i] = 2
      }
    }
  }
  results.push({ f, rodOut, rodIn, water: water / (W * H), flags, data })
}
const share = Number(args.water)
const rodMissed = results.filter((r) => r.rodOut > 40)
const watery = results.filter((r) => r.water > share)
console.log(`${picked.length} frames of ${files.length}`)
console.log(`rod outside the mask (> 40 px of ${W} px wide): ${rodMissed.length} frames${rodMissed.length ? ': ' + rodMissed.slice(0, 12).map((r) => `${r.f} (${r.rodOut})`).join(', ') : ''}`)
console.log(`open water over ${share * 100} % of the frame: ${watery.length} frames${watery.length ? ': ' + watery.slice(0, 12).map((r) => `${r.f} (${Math.round(r.water * 100)} %)`).join(', ') : ''}`)
console.log(`open water, average share: ${Math.round((100 * results.reduce((s, r) => s + r.water, 0)) / results.length)} %`)

if (args.sheet) {
  const worst = [...new Set([...rodMissed, ...watery.sort((a, b) => b.water - a.water)])].slice(0, 12)
  const tiles = []
  for (const [k, r] of worst.entries()) {
    const buf = Buffer.from(r.data)
    for (let i = 0; i < W * H; i++) {
      if (masked(i)) for (let c = 0; c < 3; c++) buf[3 * i + c] = buf[3 * i + c] >> 2
      if (r.flags[i] === 1) buf.set([255, 0, 0], 3 * i)
      if (r.flags[i] === 2) buf.set([0, Math.max(buf[3 * i + 1], 180), 255], 3 * i)
    }
    tiles.push({ input: await sharp(buf, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer(), left: (k % 3) * (W + 6), top: Math.floor(k / 3) * (H + 6) })
  }
  if (tiles.length) {
    await sharp({ create: { width: 3 * (W + 6), height: Math.ceil(tiles.length / 3) * (H + 6), channels: 3, background: '#000' } }).composite(tiles).jpeg({ quality: 85 }).toFile(args.sheet)
    console.log('sheet:', args.sheet, worst.map((r) => r.f).join(' '))
  }
}
