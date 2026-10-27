// TODO #75: a Metashape mask per frame (Christian, 2026-10-27), each made from its own frame only (not from a template):
// - the measuring rod, found on the frame at a quarter of its size: orange pixels (bright, saturated: b < r / 2), in
//   connected pieces to which a line is fitted (refitted to the pixels near it when the rod touches a blob); kept when
//   the piece is a straight thin bar leaning up to the right (30 to 75°), its upper end in the frame's right half, and
//   either long (60 px or more) with its upper end near the top edge or on the right edge near the top-right corner, or
//   a short end cut by the top edge (the rod mostly out of view). Masked along its line from its lower end out to the
//   frame's edge (its pale tip and the line holding it are not orange), widened by --grow. The rail's rust, rusty
//   pipes, the mussels' glints and the yellow-tinted mud are not taken;
// - open water (« green background »), only with --water: found on a frame 16 times smaller and blurred, smooth over
//   a wide window, green-cyan, in pieces touching the frame's edge and covering more than --water of the frame. Off by
//   default (Christian, 2026-10-27): it also took mussels in shadow, real surfaces; open water covers no surface of
//   the model, so it hardly colours the texture.
// Written to --out (default: the zone's _masks folder, beside the frames folder), named <frame>_guide.png as
// O:\scripts\generateMasks.mjs did (Metashape: Import Masks, From File, {filename}_guide.png; black = left out).
// Prints what was found per frame (every --log frames), a summary and the frames with more than one rod piece (worth a
// look); --sheet: a contact sheet of frames with their masks (the rod's in red, the water's in cyan), for a look;
// --match and --every take a sample of the frames, for tests.
// Usage: node tools/color-grading/make_masks.mjs -d O:/data/2024-07-12/zone-3/frames-lens-corrected-graded-n10
//          [-o O:/data/2024-07-12/zone-3/_masks] [--grow 28] [--water 0.02] [-m <regex>] [-e <n>]
//          [-s O:/temp/masks.jpg] [--sheet-of all|rod|none|several] [--sheet-max 15] [-n]
import { mkdirSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { parseArgs } from 'node:util'
import sharp from 'sharp'

const { values: args } = parseArgs({
  options: {
    dir: { type: 'string', short: 'd' },
    out: { type: 'string', short: 'o' },
    grow: { type: 'string', default: '28' },
    water: { type: 'string' },
    sheet: { type: 'string', short: 's' },
    log: { type: 'string', default: '200' },
    match: { type: 'string', short: 'm' },
    every: { type: 'string', short: 'e', default: '1' },
    'sheet-of': { type: 'string', default: 'all' },
    'sheet-max': { type: 'string', default: '15' },
    'dry-run': { type: 'boolean', short: 'n' },
    help: { type: 'boolean', short: 'h' },
  },
})
if (args.help || !args.dir) {
  console.log('node tools/color-grading/make_masks.mjs -d <frames folder> [-o <masks folder>] [--grow 28] [--water 0.02]\n' +
    '  [-m <regex>] [-e <n>] [-s sheet.jpg] [--sheet-of all|rod|none|several] [--sheet-max 15] [--log 200] [-n]\n' +
    'A Metashape mask per frame (<frame>_guide.png): the measuring rod (and, with --water, the open water) found in the frame itself.\n' +
    '  -d, --dir        the frames (TIFF)\n' +
    '  -o, --out        the masks folder (default: _masks beside the frames folder)\n' +
    '  --grow           the rod widened by this many pixels, at full size (default 28)\n' +
    '  --water          also the open water, in pieces over this share of the frame (off by default)\n' +
    '  -m, --match      only the frames whose name matches this regular expression (for tests)\n' +
    '  -e, --every      only one frame in n (for tests)\n' +
    '  -s, --sheet      a contact sheet (JPEG) of a sample of the frames, their masks in colour\n' +
    '  --sheet-of       the sheet\'s frames: all, rod (the rod found), none (nothing found) or several (more than one rod piece)\n' +
    '  --sheet-max      the sheet\'s number of frames, spread over those kept (default 15)\n' +
    '  --log            a line every n frames (default 200)\n' +
    '  -n, --dry-run    no mask written')
  process.exit(args.help ? 0 : 1)
}
// Found at a quarter of the frames' size (1000 x 750 for 4000 x 3000); --grow given at full size
const SCALE = 4
const dir = args.dir.replace(/[\\/]?$/, '/')
const out = (args.out ?? join(dirname(dir.replace(/\/$/, '')), '_masks')).replace(/[\\/]?$/, '/')
const match = args.match ? new RegExp(args.match) : null
const files = readdirSync(dir).filter((f) => /\.tiff?$/i.test(f) && (!match || match.test(f))).sort()
  .filter((f, k) => k % Number(args.every) === 0)
const full = await sharp(dir + files[0]).metadata()
const W = Math.round(full.width / SCALE)
const H = Math.round(full.height / SCALE)
const ROD_MIN = 60
const WATER = Number(args.water) * W * H

/** A binary image grown by r pixels (square) */
function grow(bin, r) {
  const rows = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) {
    let last = -Infinity
    for (let x = 0; x < W; x++) if (bin[y * W + x]) { rows[y * W + x] = 1; last = x } else if (x - last <= r) rows[y * W + x] = 1
    last = Infinity
    for (let x = W - 1; x >= 0; x--) if (bin[y * W + x]) last = x; else if (last - x <= r) rows[y * W + x] = 1
  }
  const res = new Uint8Array(W * H)
  for (let x = 0; x < W; x++) {
    let last = -Infinity
    for (let y = 0; y < H; y++) if (rows[y * W + x]) { res[y * W + x] = 1; last = y } else if (y - last <= r) res[y * W + x] = 1
    last = Infinity
    for (let y = H - 1; y >= 0; y--) if (rows[y * W + x]) last = y; else if (last - y <= r) res[y * W + x] = 1
  }
  return res
}

/** The connected pieces of a binary image (8-neighbour), with what keep() accepts */
function pieces(bin, keep) {
  const seen = new Uint8Array(W * H)
  const kept = new Uint8Array(W * H)
  const stack = new Int32Array(W * H)
  for (let s = 0; s < W * H; s++) {
    if (!bin[s] || seen[s]) continue
    let n = 0
    let top = 0
    stack[top++] = s
    seen[s] = 1
    const members = []
    let x0 = W, x1 = 0, y0 = H, y1 = 0
    while (top) {
      const i = stack[--top]
      members.push(i)
      n++
      const x = i % W
      const y = (i / W) | 0
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx
        const yy = y + dy
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue
        const j = yy * W + xx
        if (bin[j] && !seen[j]) { seen[j] = 1; stack[top++] = j }
      }
    }
    if (keep({ n, x0, x1, y0, y1, members })) for (const i of members) kept[i] = 1
  }
  return kept
}

/** A straight line fitted to pixels (principal axis): its ends, its length, and its spread across (standard deviation) */
function fitLine(members) {
  let mx = 0, my = 0
  for (const i of members) { mx += i % W; my += (i / W) | 0 }
  mx /= members.length
  my /= members.length
  let sxx = 0, syy = 0, sxy = 0
  for (const i of members) {
    const dx = (i % W) - mx
    const dy = ((i / W) | 0) - my
    sxx += dx * dx; syy += dy * dy; sxy += dx * dy
  }
  const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy)
  const [ux, uy] = [Math.cos(angle), Math.sin(angle)]
  let t0 = Infinity, t1 = -Infinity, across = 0
  for (const i of members) {
    const dx = (i % W) - mx
    const dy = ((i / W) | 0) - my
    const t = dx * ux + dy * uy
    if (t < t0) t0 = t
    if (t > t1) t1 = t
    across += (dy * ux - dx * uy) ** 2
  }
  const spread = Math.sqrt(across / members.length)
  return {
    ends: [[mx + t0 * ux, my + t0 * uy], [mx + t1 * ux, my + t1 * uy]], length: t1 - t0, spread, n: members.length,
    /** the members within 1.8 spreads of the line (all of them for a straight bar: its edges are at 1.73 spreads) */
    near: () => members.filter((i) => Math.abs((((i / W) | 0) - my) * ux - ((i % W) - mx) * uy) <= 1.8 * spread),
  }
}

/** A line fitted to a piece, refitted up to 3 times to the pixels near it when the piece is not a straight bar (the
 *  rod touching a blob); a straight bar of width w (pixels per unit of length) spreads w / 3.5 across its line */
function straightLine(members) {
  let line = fitLine(members)
  for (let k = 0; k < 3 && line.spread > 0.5 * (line.n / line.length); k++) line = fitLine(line.near())
  return line
}

/** The rod painted from its lower end through its upper end out to the frame's edge, half-width hw */
function paintRod(bin, bottom, top, hw) {
  const len = Math.hypot(top[0] - bottom[0], top[1] - bottom[1])
  const [ux, uy] = [(top[0] - bottom[0]) / len, (top[1] - bottom[1]) / len]
  for (let t = 0; ; t += 0.5) {
    const cx = bottom[0] + t * ux
    const cy = bottom[1] + t * uy
    if (cx < -hw || cy < -hw || cx > W + hw || cy > H + hw) break
    for (let y = Math.max(0, Math.floor(cy - hw)); y <= Math.min(H - 1, Math.ceil(cy + hw)); y++)
      for (let x = Math.max(0, Math.floor(cx - hw)); x <= Math.min(W - 1, Math.ceil(cx + hw)); x++)
        if ((x - cx) ** 2 + (y - cy) ** 2 <= hw * hw) bin[y * W + x] = 1
  }
}

/** Open water on a 16-times smaller frame (W/4 x H/4): smooth over 7 x 7 (luminance spread under 10), dark to mid,
 *  green-cyan; pieces touching the edge and larger than --water, holes filled; back at W x H */
function waterOf(data) {
  const w = W >> 2
  const h = H >> 2
  const small = new Float32Array(w * h * 3)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 4; dx++) {
      const i = ((y * 4 + dy) * W + x * 4 + dx) * 3
      for (let c = 0; c < 3; c++) small[(y * w + x) * 3 + c] += data[i + c] / 16
    }
  }
  // (blurred: the particles in the water would break it up)
  const blurred = new Float32Array(w * h * 3)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) {
    let sum = 0
    let n = 0
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const xx = Math.min(w - 1, Math.max(0, x + dx))
      const yy = Math.min(h - 1, Math.max(0, y + dy))
      sum += small[(yy * w + xx) * 3 + c]
      n++
    }
    blurred[(y * w + x) * 3 + c] = sum / n
  }
  small.set(blurred)
  const lum = (k) => 0.2126 * small[3 * k] + 0.7152 * small[3 * k + 1] + 0.0722 * small[3 * k + 2]
  const cand = new Uint8Array(w * h)
  for (let y = 3; y < h - 3; y++) for (let x = 3; x < w - 3; x++) {
    const k = y * w + x
    const [r, g, b] = [small[3 * k], small[3 * k + 1], small[3 * k + 2]]
    if (lum(k) > 210 || g < 1.1 * r || b < 0.85 * r) continue
    let min = 255
    let max = 0
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const v = lum(k + dy * w + dx)
      if (v < min) min = v
      if (v > max) max = v
    }
    if (max - min < 8) cand[k] = 1
  }
  // (the 3-pixel border, never tested, takes its neighbour's value so that pieces can touch the edge)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const xx = Math.min(Math.max(x, 3), w - 4)
    const yy = Math.min(Math.max(y, 3), h - 4)
    cand[y * w + x] = cand[yy * w + xx]
  }
  // pieces touching the edge, large enough
  const seen = new Uint8Array(w * h)
  const keep = new Uint8Array(w * h)
  for (let s = 0; s < w * h; s++) {
    if (!cand[s] || seen[s]) continue
    const stack = [s]
    seen[s] = 1
    const members = []
    let edge = false
    while (stack.length) {
      const k = stack.pop()
      members.push(k)
      const x = k % w
      const y = (k / w) | 0
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) edge = true
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx
        const yy = y + dy
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue
        const j = yy * w + xx
        if (cand[j] && !seen[j]) { seen[j] = 1; stack.push(j) }
      }
    }
    if (edge && members.length >= Number(args.water) * w * h) for (const k of members) keep[k] = 1
  }
  // holes filled: what the edge can't reach without crossing the water is water too
  const outside = new Uint8Array(w * h)
  const stack = []
  for (let x = 0; x < w; x++) for (const y of [0, h - 1]) if (!keep[y * w + x]) { outside[y * w + x] = 1; stack.push(y * w + x) }
  for (let y = 0; y < h; y++) for (const x of [0, w - 1]) if (!keep[y * w + x] && !outside[y * w + x]) { outside[y * w + x] = 1; stack.push(y * w + x) }
  while (stack.length) {
    const k = stack.pop()
    const x = k % w
    const y = (k / w) | 0
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx
      const yy = y + dy
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue
      const j = yy * w + xx
      if (!keep[j] && !outside[j]) { outside[j] = 1; stack.push(j) }
    }
  }
  const res = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = Math.min(h - 1, y >> 2) * w + Math.min(w - 1, x >> 2)
    if (keep[k] || !outside[k]) res[y * W + x] = 1
  }
  return res
}

if (!args['dry-run']) mkdirSync(out, { recursive: true })
const counts = { rod: 0, water: 0, none: 0 }
const several = []
const sheet = []
for (const [k, f] of files.entries()) {
  const { data } = await sharp(dir + f).resize(W, H, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  // (orange: saturated, bright; the yellow-tinted mud and concrete of some clips stay under b < r / 2)
  const orange = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      const [r, g, b] = [data[3 * i], data[3 * i + 1], data[3 * i + 2]]
      if (r > 140 && b < 0.5 * r && r >= g - 10) orange[i] = 1
    }
  }
  // The rod: straight, thin pieces (a line fitted to each) leaning up to the right (30 to 75° from the horizontal),
  // their upper end in the frame's right half; either long (ROD_MIN), their upper end near the top edge (its pale tip
  // and the line holding it are not orange) or the right edge, or a short end cut by the top edge (the rod mostly out of
  // view); drawn along their line from their lower end out to the frame's edge
  const rod = new Uint8Array(W * H)
  let rods = 0
  pieces(grow(orange, 1), (p) => {
    if (p.n < 150 || p.n > 40000) return false
    // (the bar must hold at least half of the piece)
    const line = straightLine(p.members)
    const width = line.n / line.length
    if (line.n < 0.5 * p.n || width > 20 || line.spread > 0.5 * width) return false
    const [top, bottom] = line.ends[0][1] <= line.ends[1][1] ? line.ends : [line.ends[1], line.ends[0]]
    const lean = (Math.atan2(bottom[1] - top[1], top[0] - bottom[0]) * 180) / Math.PI
    if (top[0] < W * 0.5 || lean < 30 || lean > 75) return false
    const long = line.length >= ROD_MIN && line.length >= 6 * width && (top[1] <= H * 0.15 || (top[0] >= W - 4 && top[1] <= H * 0.3))
    const cut = top[1] <= 2 && line.length >= 18 && line.length >= 1.8 * width
    if (!long && !cut) return false
    paintRod(rod, bottom, top, Math.max(2, 2 * line.spread))
    rods++
    return false
  })
  // Open water: large smooth pieces touching the frame's edge, their holes filled
  const water = args.water ? waterOf(data) : new Uint8Array(W * H)
  const rodPx = rod.reduce((s, v) => s + v, 0)
  const waterPx = water.reduce((s, v) => s + v, 0)
  if (rodPx) counts.rod++
  if (waterPx) counts.water++
  if (!rodPx && !waterPx) counts.none++
  // (one rod per frame: more pieces taken is worth a look)
  if (rods > 1) several.push(f)
  const masked = new Uint8Array(W * H)
  const rodGrown = rodPx ? grow(rod, Math.round(Number(args.grow) / SCALE)) : rod
  const waterGrown = waterPx ? grow(water, 2) : water
  for (let i = 0; i < W * H; i++) masked[i] = rodGrown[i] ? 1 : waterGrown[i] ? 2 : 0
  if (!args['dry-run']) {
    const pixels = Buffer.from(masked.map((v) => (v ? 0 : 255)))
    await sharp(pixels, { raw: { width: W, height: H, channels: 1 } }).resize(full.width, full.height, { kernel: 'nearest' }).toColourspace('b-w').png({ compressionLevel: 9 }).toFile(out + f.replace(/\.tiff?$/i, '_guide.png'))
  }
  // (every frame of the kind asked, kept small; a sample spread over them goes on the sheet)
  const kinds = ['all', rodPx || waterPx ? 'rod' : 'none', ...(rods > 1 ? ['several'] : [])]
  if (args.sheet && kinds.includes(args['sheet-of'])) {
    for (let i = 0; i < W * H; i++) {
      if (masked[i] === 1) data.set([Math.min(255, data[3 * i] * 0.4 + 153), data[3 * i + 1] * 0.4, data[3 * i + 2] * 0.4], 3 * i)
      if (masked[i] === 2) data.set([0, 200, 255], 3 * i)
    }
    sheet.push({ f, tile: await sharp(data, { raw: { width: W, height: H, channels: 3 } }).resize(500).png().toBuffer() })
  }
  if (k % Number(args.log) === 0) console.log(`${k}/${files.length} ${f}: rod ${rodPx} px, water ${((100 * waterPx) / (W * H)).toFixed(1)} %`)
}
console.log(`${files.length} frames: the rod found in ${counts.rod}, open water in ${counts.water}, nothing in ${counts.none}; masks${args['dry-run'] ? ' not written (dry run)' : ' in ' + out}`)
if (several.length) console.log(`more than one rod piece in ${several.length} frames: ${several.join(' ')}`)

if (args.sheet && sheet.length) {
  const max = Number(args['sheet-max'])
  const chosen = sheet.length <= max ? sheet : Array.from({ length: max }, (_, k) => sheet[Math.floor(((k + 0.5) * sheet.length) / max)])
  const tiles = []
  const cols = Math.min(3, chosen.length)
  for (const [k, s] of chosen.entries()) {
    const left = (k % cols) * 506
    const top = Math.floor(k / cols) * 381
    tiles.push({ input: s.tile, left, top })
    tiles.push({ input: Buffer.from(`<svg width="200" height="24"><rect width="200" height="24" fill="#000" opacity="0.6"/><text x="6" y="17" font-family="sans-serif" font-size="15" fill="#fff">${s.f.replace(/\.tiff?$/i, '')}</text></svg>`), left, top })
  }
  await sharp({ create: { width: cols * 506, height: Math.ceil(chosen.length / cols) * 381, channels: 3, background: '#000' } }).composite(tiles).jpeg({ quality: 85 }).toFile(args.sheet)
  console.log('sheet:', args.sheet, chosen.map((s) => s.f).join(' '))
}
