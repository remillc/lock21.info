// The viewer's yellow perch (src/viewer/perch.js) from a photo (Christian, 2026-10-27: the fish drawn from the
// species' descriptions did not look real): a yellow perch on a white background, side view, by Sam Stukel, U.S. Fish
// and Wildlife Service (public domain; Wikimedia Commons, « Yellow Perch (Perca flavescens) white background.jpg »;
// original in O:\modeles\creatures\perch\yellow-perch-usfws.jpg). The shape of the fins checked against the Florida
// Museum's plate of a young yellow perch (Christian, 2026-10-27; a reference only, not used: not free). Writes:
// - the texture (WebP, with alpha: the white background transparent, so that the fins take their outline from the
//   photo): the fish turned to face left, u along it from the snout (0) to the tail's tip (1), v its height, HALF of
//   its length above and below its axis (the body's middle where it is deepest);
// - its shape (JSON), measured by hand on the photo turned left and 1200 px wide (STATIONS: the body's top and bottom
//   without its fins; FINS: an outline around each fin, cut by the texture's alpha), in shares of its length: s from
//   the snout, y up from the axis.
// Usage: node tools/creatures/make_perch.mjs [-i photo] [-o texture.webp] [-p shape.json]
import { writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import sharp from 'sharp'

const { values: args } = parseArgs({
  options: {
    input: { type: 'string', short: 'i', default: 'O:/modeles/creatures/perch/yellow-perch-usfws.jpg' },
    out: { type: 'string', short: 'o', default: 'public/viewer/creatures/perch.webp' },
    profile: { type: 'string', short: 'p', default: 'src/viewer/perch-shape.json' },
    help: { type: 'boolean', short: 'h' },
  },
})
if (args.help) {
  console.log('node tools/creatures/make_perch.mjs [-i photo] [-o texture.webp] [-p shape.json]\n' +
    'The perch texture and shape for src/viewer/perch.js, from a side photo on a white background.')
  process.exit(0)
}

// The photo turned left and 1200 px wide: the snout's tip and the tail's tip (x), the axis (y)
const MEASURED_WIDTH = 1200
const SNOUT = 68
const TAIL = 1172
const AXIS = 395
// The body without its fins: x, top, bottom
const STATIONS = [
  [68, 478, 480], [100, 440, 505], [150, 380, 525], [200, 345, 535], [250, 300, 540], [300, 262, 540], [350, 235, 535],
  [400, 222, 530], [450, 215, 520], [500, 210, 510], [550, 207, 500], [600, 205, 488], [650, 205, 475], [700, 208, 455],
  [750, 220, 435], [800, 235, 415], [850, 252, 395], [900, 268, 380], [950, 280, 372], [1000, 275, 375],
]
// An outline around each fin (x, y), wider than the fin: its own outline comes from the texture's alpha. `fold`: the
// spiny dorsal, folded down along the back at rest (perch.js)
const FINS = {
  spinyDorsal: { fold: true, points: [[318, 'top'], [325, 85], [500, 80], [620, 115], [668, 185], [668, 'top']] },
  softDorsal: { points: [[695, 'top'], [720, 150], [800, 140], [920, 205], [920, 'top']] },
  tail: { points: [[985, 'top'], [985, 225], [1180, 225], [1180, 450], [985, 450], [985, 'bottom']] },
  pelvic: { points: [[425, 'bottom'], [425, 600], [560, 600], [560, 'bottom']] },
  anal: { points: [[765, 'bottom'], [765, 525], [915, 525], [915, 'bottom']] },
}
// The texture's size, and the share of the length it covers above and below the axis
const WIDTH = 512
const HEIGHT = 256
const HALF = 0.28
// Background: near white (alpha from how far from white)
const WHITE = 238

const L = TAIL - SNOUT
const s = (x) => +((x - SNOUT) / L).toFixed(4)
const y = (py) => +((AXIS - py) / L).toFixed(4)
const body = STATIONS.map(([x, t, b]) => ({ s: s(x), top: y(t), bottom: y(b) }))
const edge = (x, side) => {
  const k = Math.max(1, STATIONS.findIndex(([sx]) => sx >= x))
  const [xa, ta, ba] = STATIONS[k - 1]
  const [xb, tb, bb] = STATIONS[Math.min(k, STATIONS.length - 1)]
  const f = xb === xa ? 0 : (x - xa) / (xb - xa)
  return side === 'top' ? ta + (tb - ta) * f : ba + (bb - ba) * f
}
const fins = Object.fromEntries(Object.entries(FINS).map(([name, fin]) => [name, {
  fold: Boolean(fin.fold),
  points: fin.points.map(([x, py]) => [s(x), y(typeof py === 'string' ? edge(x, py) : py)]),
}]))
writeFileSync(args.profile, JSON.stringify({
  source: 'U.S. Fish and Wildlife Service, Sam Stukel (public domain), measured by hand',
  half: HALF,
  body,
  fins,
}, null, 1) + '\n')

// The texture: from the snout to the tail's tip, HALF of the length above and below the axis
const meta = await sharp(args.input).metadata()
const scale = meta.width / MEASURED_WIDTH
const { data, info } = await sharp(args.input).flop().removeAlpha().raw().toBuffer({ resolveWithObject: true })
const W = info.width
const crop = { left: Math.round(SNOUT * scale), top: Math.round((AXIS - HALF * L) * scale), width: Math.round(L * scale), height: Math.round(2 * HALF * L * scale) }
const rgba = Buffer.alloc(crop.width * crop.height * 4)
for (let row = 0; row < crop.height; row++) {
  for (let col = 0; col < crop.width; col++) {
    const yy = crop.top + row
    const o = (row * crop.width + col) * 4
    if (yy < 0 || yy >= info.height) continue
    const k = (yy * W + crop.left + col) * 3
    rgba[o] = data[k]
    rgba[o + 1] = data[k + 1]
    rgba[o + 2] = data[k + 2]
    rgba[o + 3] = Math.max(0, Math.min(255, (255 - Math.min(data[k], data[k + 1], data[k + 2])) * (255 / (255 - WHITE))))
  }
}
await sharp(rgba, { raw: { width: crop.width, height: crop.height, channels: 4 } })
  .resize(WIDTH, HEIGHT, { fit: 'fill' })
  .webp({ quality: 85, alphaQuality: 90 })
  .toFile(args.out)
console.log(`perch: texture ${args.out} (${WIDTH}x${HEIGHT}), shape ${args.profile} (${body.length} stations, ${Object.keys(fins).length} fins)`)
