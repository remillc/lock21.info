// TODO #75: the colour correction of each clip of a dive, from its rendered frames (read only): the average colour of
// --frames frames spread over each clip (linear light, 400 px wide), pulled --share of the way to neutral (grey world),
// and the median of the clips (the passes; --skip leaves out the charts and others), the dive's common correction
// (Christian, 2026-10-27: one correction per dive, so that the texture shows no bands between passes). Gains in
// linear light; slopes for Resolve's Rec.709 gamma 2.4 values (gain^(1/2.4)). Writes a JSON (--out).
// Usage: node tools/color-grading/clip_gains.mjs -d O:/data/2024-07-12/zone-3/frames-lens-corrected-n10
//          -o O:/temp/gains-2024-07-12.json --skip GX033601 GX033701 GX035201 GX036801 [-f 20] [-s 0.75]
import { readdirSync, writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import sharp from 'sharp'

const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    dir: { type: 'string', short: 'd' },
    out: { type: 'string', short: 'o' },
    frames: { type: 'string', short: 'f', default: '20' },
    share: { type: 'string', short: 's', default: '0.75' },
    skip: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h' },
  },
})
if (args.help || !args.dir) {
  console.log('node tools/color-grading/clip_gains.mjs -d <frames folder> [-o out.json] [-f 20] [-s 0.75] [--skip CLIP...]\n' +
    "Each clip's grey-world correction from its frames, and the median of the clips (the dive's common correction).")
  process.exit(args.help ? 0 : 1)
}
const skip = new Set(args.skip ? positionals : [])
const FRAMES = Number(args.frames)
const SHARE = Number(args.share)
const dir = args.dir.replace(/[\\/]?$/, '/')
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const LIN = Array.from({ length: 256 }, (_, i) => toLin(i / 255))
const median = (list) => [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)]

const clips = new Map()
for (const f of readdirSync(dir).filter((f) => /\.tiff?$/i.test(f)).sort()) {
  const clip = f.split('.')[0]
  if (!clips.has(clip)) clips.set(clip, [])
  clips.get(clip).push(f)
}
const result = { dir, share: SHARE, clips: {} }
for (const [clip, list] of clips) {
  const picked = list.length <= FRAMES ? list : Array.from({ length: FRAMES }, (_, i) => list[Math.round((i * (list.length - 1)) / (FRAMES - 1))])
  const mean = [0, 0, 0]
  for (const f of picked) {
    const { data } = await sharp(dir + f).resize(400).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const sum = [0, 0, 0]
    for (let i = 0; i < data.length; i++) sum[i % 3] += LIN[data[i]]
    for (let c = 0; c < 3; c++) mean[c] += sum[c] / (data.length / 3) / picked.length
  }
  const grey = (mean[0] + mean[1] + mean[2]) / 3
  const gain = mean.map((m) => +(1 + SHARE * (grey / m - 1)).toFixed(3))
  result.clips[clip] = { frames: list.length, sampled: picked.length, skipped: skip.has(clip), mean: mean.map((m) => +m.toFixed(4)), gain }
  console.log(clip, list.length, skip.has(clip) ? '(skipped)' : '', 'gain', gain.join(' '))
}
const kept = Object.values(result.clips).filter((c) => !c.skipped)
result.median = [0, 1, 2].map((c) => median(kept.map((k) => k.gain[c])))
result.slope = result.median.map((g) => +(g ** (1 / 2.4)).toFixed(3))
console.log('median gain', result.median.join(' '), 'slope', result.slope.join(' '), `(${kept.length} clips)`)
if (args.out) writeFileSync(args.out, JSON.stringify(result, null, 1) + '\n')
