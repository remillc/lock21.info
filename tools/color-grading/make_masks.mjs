// TODO #75: a Metashape mask per frame (Christian, 2026-10-27), each made from its own frame only (not from a template):
// - the measuring rod, found on the frame at a quarter of its size. The rod has three segments: orange to red at its
//   upper end (where it is held), then white (light blue to grey under water), then a short orange tip (pinkish in some
//   grades). First its coloured segment: orange to lemon yellow pixels (saturated: b < r / 2, g <= 1.25 r; bright,
//   r > 140, then dimmer, r > 115, when nothing is found), in connected pieces to which a line is fitted (refitted to
//   the pixels near it when the rod touches a blob); kept when the piece is a straight thin bar leaning up to the right
//   (30 to 75°), its upper end right of 60 % of the width, and either long (60 px or more) with its upper end near the
//   top edge or on the right edge near the top-right corner, or long with a bright ridge from its upper end (up to
//   mid-frame) out to the edge (the rod's pale upper part, white to light blue, in the greenish clips of 2024-07-05 and
//   2024-07-07), or a short end cut by the top edge (the rod mostly out of view). When no piece passes (the rod merged
//   with a yellow plank or a tinted wall, or its end far away, dim olive in greenish water), a scan of straight lines
//   from the top or right edge, for a thin bar (rod-coloured or dim olive with both sides not, or a bright ridge) 100 px
//   long or more, or 35 px from the top edge in the rod's colours, continued through its dim lower end. Masked along its
//   line from its lower end out to the frame's edge (the line holding it is not orange). Then past its lower end, along
//   the same axis, its white segment and its tip (extendRod, 2026-10-30): followed pixel by pixel in a band of the rod's
//   width, white or orange samples with sides that are not the same, the axis free to drift a little; it stops at the
//   end of the tip, at the frame's edge or after 6 pixels unlike the rod, and is kept only when it ends at the tip, runs
//   out of the frame or stays orange all along (else it was more likely pale shells along the rod's line). The line
//   scan's rod, when extendRod finds nothing past it and it does not end with the tip, is masked 60 % of its length
//   further (its lower end too faint to see). All widened by --grow. The rail's rust, rusty pipes, the mussels'
//   glints, the yellow-tinted mud and the planks' yellow edges (upright, or not thin) are not taken;
// - open water (« green background »), only with --water: found on a frame 16 times smaller and blurred, smooth over
//   a wide window, green-cyan, in pieces touching the frame's edge and covering more than --water of the frame. Off by
//   default (Christian, 2026-10-27): it also took mussels in shadow, real surfaces; open water covers no surface of
//   the model, so it hardly colours the texture.
// Written to --out (default: the zone's _masks folder, beside the frames folder), named <frame>_guide.png as
// O:\scripts\generateMasks.mjs did (Metashape: Import Masks, From File, {filename}_guide.png; black = left out), as a
// 1-bit PNG (a black and white palette; --bits 8 for 8-bit grey, 8 times larger, the same pixels), through a temporary
// file. --alt: a second frames folder where a frame may be instead (a folder being renamed by another job: each frame
// read from whichever holds it, never written). --resume: the frames whose mask is already 1-bit are skipped.
// Prints what was found per frame (every --log frames), a summary, the frames found by the line scan and those with
// more than one rod piece (worth a look); --sheet: a contact sheet of frames with their masks (the rod's in red, the
// water's in cyan), for a look; --match and --every take a sample of the frames, for tests.
// Usage: node tools/color-grading/make_masks.mjs -d O:/data/2024-07-12/zone-3/frames-lens-corrected-graded-n10
//          [-a <other frames folder>] [-o O:/data/2024-07-12/zone-3/_masks] [-b 1|8] [-r] [--grow 28] [--water 0.02]
//          [-m <regex>] [-e <n>] [-s O:/temp/masks.jpg] [--sheet-of all|rod|none|several|scan|extended] [--sheet-max 15] [-n]
import { closeSync, existsSync, mkdirSync, openSync, readSync, readdirSync, renameSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { parseArgs } from 'node:util'
import sharp from 'sharp'

const { values: args } = parseArgs({
  options: {
    dir: { type: 'string', short: 'd' },
    alt: { type: 'string', short: 'a' },
    out: { type: 'string', short: 'o' },
    bits: { type: 'string', short: 'b', default: '1' },
    resume: { type: 'boolean', short: 'r' },
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
if (args.help || !args.dir || !['1', '8'].includes(args.bits)) {
  console.log('node tools/color-grading/make_masks.mjs -d <frames folder> [-a <other frames folder>] [-o <masks folder>] [-b 1|8] [-r]\n' +
    '  [--grow 28] [--water 0.02] [-m <regex>] [-e <n>] [-s sheet.jpg] [--sheet-of all|rod|none|several|scan|extended]\n' +
    '  [--sheet-max 15] [--log 200] [-n]\n' +
    'A Metashape mask per frame (<frame>_guide.png): the measuring rod (and, with --water, the open water) found in the frame itself.\n' +
    '  -d, --dir        the frames (TIFF)\n' +
    '  -a, --alt        another folder where some frames may be instead (a folder being renamed): read from either\n' +
    '  -o, --out        the masks folder (default: _masks beside the frames folder)\n' +
    '  -b, --bits       1 (default: 1-bit PNG, black and white palette) or 8 (8-bit grey, 8 times larger)\n' +
    '  -r, --resume     skip the frames whose mask is already 1-bit (a run taken up again)\n' +
    '  --grow           the rod widened by this many pixels, at full size (default 28)\n' +
    '  --water          also the open water, in pieces over this share of the frame (off by default)\n' +
    '  -m, --match      only the frames whose name matches this regular expression (for tests)\n' +
    '  -e, --every      only one frame in n (for tests)\n' +
    '  -s, --sheet      a contact sheet (JPEG) of a sample of the frames, their masks in colour\n' +
    '  --sheet-of       the sheet\'s frames: all, rod (the rod found), none (nothing found), several (more than one rod piece),\n' +
    '                   scan (found by the line scan) or extended (its white segment or tip found past its coloured part)\n' +
    '  --sheet-max      the sheet\'s number of frames, spread over those kept (default 15)\n' +
    '  --log            a line every n frames (default 200)\n' +
    '  -n, --dry-run    no mask written')
  process.exit(args.help ? 0 : 1)
}
// Found at a quarter of the frames' size (1000 x 750 for 4000 x 3000); --grow given at full size
const SCALE = 4
const dir = args.dir.replace(/[\\/]?$/, '/')
const alt = args.alt?.replace(/[\\/]?$/, '/')
const out = (args.out ?? join(dirname(dir.replace(/\/$/, '')), '_masks')).replace(/[\\/]?$/, '/')
const match = args.match ? new RegExp(args.match) : null
const list = (d) => (d && existsSync(d) ? readdirSync(d) : [])
const files = [...new Set([...list(dir), ...list(alt)])].filter((f) => /\.tiff?$/i.test(f) && (!match || match.test(f))).sort()
  .filter((f, k) => k % Number(args.every) === 0)
/** A frame's path: in --dir, else in --alt */
const frameOf = (f) => (existsSync(dir + f) || !alt ? dir + f : alt + f)
const full = await sharp(frameOf(files[0])).metadata()
const W = Math.round(full.width / SCALE)
const H = Math.round(full.height / SCALE)
const ROD_MIN = 60
const SCAN_MIN = 100
const SCAN_SHORT = 35
const WATER = Number(args.water) * W * H

/** A mask's bit depth (its PNG header), 0 when there is none */
function bitDepth(path) {
  if (!existsSync(path)) return 0
  const fd = openSync(path, 'r')
  const head = Buffer.alloc(25)
  readSync(fd, head, 0, 25, 0)
  closeSync(fd)
  return head[24]
}

/** A frame read at a quarter of its size, tried again 3 times 5 s apart (a frame moved or rewritten by another job) */
async function readFrame(f) {
  for (let k = 0; ; k++) {
    try {
      return await sharp(frameOf(f)).resize(W, H, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    } catch (e) {
      if (k >= 3) throw e
      await new Promise((r) => setTimeout(r, 5000))
    }
  }
}

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

/** The share of the line from the bar's upper end out to the frame's edge that is a bright ridge (its centre brighter
 *  than both sides, hw + 3 pixels away, by 12 levels or more): the rod's pale upper part, white to light blue, not orange
 *  nor yellow; 0 when the bar's upper end is on the edge */
function ridgeTo(data, bottom, top, hw) {
  const len = Math.hypot(top[0] - bottom[0], top[1] - bottom[1])
  const [ux, uy] = [(top[0] - bottom[0]) / len, (top[1] - bottom[1]) / len]
  const lum = (x, y) => {
    const i = 3 * (Math.min(H - 1, Math.max(0, Math.round(y))) * W + Math.min(W - 1, Math.max(0, Math.round(x))))
    return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
  }
  const side = hw + 3
  let n = 0
  let bright = 0
  for (let t = 2; ; t++) {
    const cx = top[0] + t * ux
    const cy = top[1] + t * uy
    if (cx < 0 || cy < 0 || cx > W - 1 || cy > H - 1) break
    const centre = Math.max(lum(cx, cy), lum(cx - uy, cy + ux), lum(cx + uy, cy - ux))
    const sides = Math.max(lum(cx - side * uy, cy + side * ux), lum(cx + side * uy, cy - side * ux))
    n++
    if (centre > sides + 12) bright++
  }
  return n ? bright / n : 0
}

/** When no piece passes (the rod over a yellow plank merges with it): straight lines from the top edge (x from 60 % of
 *  the width) or the right edge (top 30 %), leaning up to the right 40 to 65°, half-widths 3, 5 and 8; along each, from
 *  the edge, the samples where the rod shows as a bar: rod-coloured or dim olive with both sides not, or a bright ridge
 *  (both sides darker by 15 levels). The longest run from the edge (starting within 6 pixels of it, gaps of 4 at most)
 *  of SCAN_MIN pixels or more with 80 % of bar samples, or of SCAN_SHORT or more from the top edge with 90 % of coloured ones, is the rod, continued through yellowish pixels (its lower end, orange to
 *  olive) and by 60 % of its length at least (that end too faint to see): its ends, or null */
function scanRod(data, colour) {
  const lum = (x, y) => {
    const i = 3 * (Math.min(H - 1, Math.max(0, Math.round(y))) * W + Math.min(W - 1, Math.max(0, Math.round(x))))
    return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
  }
  const yellowish = (x, y) => {
    const i = 3 * (Math.min(H - 1, Math.max(0, Math.round(y))) * W + Math.min(W - 1, Math.max(0, Math.round(x))))
    return data[i] > 110 && (data[i] + data[i + 1]) / 2 - data[i + 2] >= 40
  }
  // (the rod's end far away in greenish water: dim olive)
  const dimYellow = (x, y) => {
    const i = 3 * (Math.min(H - 1, Math.max(0, Math.round(y))) * W + Math.min(W - 1, Math.max(0, Math.round(x))))
    return data[i] > 100 && (data[i] + data[i + 1]) / 2 - data[i + 2] >= 35
  }
  const col = (x, y) => colour[Math.min(H - 1, Math.max(0, Math.round(y))) * W + Math.min(W - 1, Math.max(0, Math.round(x)))]
  const starts = []
  for (let x = Math.round(W * 0.6); x < W; x += 2) starts.push([x, 0])
  for (let y = 2; y < H * 0.3; y += 2) starts.push([W - 1, y])
  let best = null
  for (let lean = 40; lean <= 65; lean += 0.75) {
    // (down and to the left, into the frame)
    const ux = -Math.cos((lean * Math.PI) / 180)
    const uy = Math.sin((lean * Math.PI) / 180)
    for (const hw of [3, 5, 8]) {
      const side = hw + 3
      for (const [x0, y0] of starts) {
        let run = 0
        let bars = 0
        let colourBars = 0
        let gap = 0
        let first = -1
        for (let t = 0; ; t++) {
          const cx = x0 + t * ux
          const cy = y0 + t * uy
          if (cx < 0 || cy > H - 1) break
          const [ax, ay, bx, by] = [cx - side * uy, cy + side * ux, cx + side * uy, cy - side * ux]
          const colourBar = (col(cx, cy) && !col(ax, ay) && !col(bx, by)) || (dimYellow(cx, cy) && !dimYellow(ax, ay) && !dimYellow(bx, by))
          const bar = colourBar || lum(cx, cy) > Math.max(lum(ax, ay), lum(bx, by)) + 15
          if (bar) {
            if (first < 0) { if (t > 6) break; first = t }
            bars++
            if (colourBar) colourBars++
            run = t
            gap = 0
          } else if (first >= 0 && ++gap > 4) break
        }
        const core = run - Math.max(first, 0)
        // (then on through yellowish pixels, within 3 pixels of the line, their sides not yellowish: the rod's lower end,
        // orange to olive, dim; not along a yellow-tinted wall)
        if (first >= 0) for (let t = run + 1, miss = 0; t < run + 80 && miss <= 3; t++) {
          const cx = x0 + t * ux
          const cy = y0 + t * uy
          const on = [-3, 0, 3].some((d) => yellowish(cx - d * uy, cy + d * ux))
          const sides = yellowish(cx - (side + 3) * uy, cy + (side + 3) * ux) || yellowish(cx + (side + 3) * uy, cy - (side + 3) * ux)
          if (on && !sides) { run = t; miss = 0 } else miss++
        }
        // (at least 60 % of the bright part further: the lower end, too faint for a colour test, is masked too)
        // (where it was seen, for extendRod, which may find the rest)
        let seen = run
        while (seen > 0 && (x0 + seen * ux < 0 || y0 + seen * uy > H - 1)) seen--
        run = Math.max(run, Math.round(Math.max(first, 0) + 1.6 * core))
        // (not past the frame's left or bottom edge, where the drawing would start outside it)
        while (run > 0 && (x0 + run * ux < 0 || y0 + run * uy > H - 1)) run--
        const length = run - Math.max(first, 0)
        // (long, or a short end cut by the top edge, in the rod's colours only: bright ridges are common in the mussel
        // beds, yellow shells on the right edge)
        const found = (core >= SCAN_MIN && bars >= 0.8 * (core + 1)) || (y0 === 0 && core >= SCAN_SHORT && colourBars >= 0.9 * (core + 1))
        if (first >= 0 && found && (!best || core > best.core))
          best = { core, length, hw, ends: [[x0 + run * ux, y0 + run * uy], [x0 - 2 * ux, y0 - 2 * uy]], seen: [x0 + seen * ux, y0 + seen * uy] }
      }
    }
  }
  return best
}

/** The rod's lower part, past its lower end: the rod has an orange to red upper segment, then a white one (light blue
 *  to grey under water), then an orange tip (pinkish in some grades); the colour test finds the first only. From the
 *  lower end, away from the upper one, along the rod's axis, one pixel at a time: each sample is white (pale, little
 *  colour, blue not much below red: the yellowish mussels, the sand and the mud are not), orange to red (red above
 *  green and blue) or neither. A band of the rod's half-width across the axis is rod-like when half of its samples are
 *  white or orange (or of 3 samples: its lower part is often thinner), and not both sides (well past the band) of the same kind and brightness (within 15 levels): never
 *  along a white plank or a bed of white shells of the rod's shade. The axis may drift by a pixel per step towards the
 *  band's best fit (the fitted line is a little off over a long way), by 3 pixels plus 15 % of the way at most. Stops
 *  at the frame's edge, after GAP pixels that are not rod-like, or at the end of the tip (orange after white: the rod
 *  ends there). The path up to its last rod-like point, [] when none */
const GAP = 6
function extendRod(data, bottom, top, hw) {
  const len = Math.hypot(bottom[0] - top[0], bottom[1] - top[1])
  const [ux, uy] = [(bottom[0] - top[0]) / len, (bottom[1] - top[1]) / len]
  /** 1 white, 2 orange, 0 neither; and the luminance */
  const kind = (x, y) => {
    if (x < 0 || y < 0 || x > W - 1 || y > H - 1) return [0, 0]
    const i = 3 * (Math.round(y) * W + Math.round(x))
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]]
    const max = Math.max(r, g, b)
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    if (r > 110 && r >= 1.15 * g && r >= 1.15 * b) return [2, lum]
    if (lum > 90 && b >= 0.85 * r && max - Math.min(r, g, b) < 0.5 * max) return [1, lum]
    return [0, lum]
  }
  const half = Math.max(2, Math.round(hw))
  /** the band's share of white or orange samples, its kind (the more common) and their mean luminance */
  const bandOf = (cx, cy, h) => {
    const n = [0, 0, 0]
    const sum = [0, 0, 0]
    for (let d = -h; d <= h; d++) {
      const [k, lum] = kind(cx - d * uy, cy + d * ux)
      n[k]++
      sum[k] += lum
    }
    const k = n[2] > n[1] ? 2 : 1
    return { s: (n[1] + n[2]) / (2 * h + 1), k, lum: sum[k] / Math.max(1, n[k]) }
  }
  // (the rod's lower part is often thinner than its coloured part: a band of 3 samples too, the better taken)
  const band = (cx, cy) => {
    const wide = bandOf(cx, cy, half)
    const thin = bandOf(cx, cy, 1)
    return thin.s > wide.s ? thin : wide
  }
  const side = Math.max(2 * half + 3, 9)
  const path = []
  let last = -1
  let off = 0
  let white = false
  let tip = false
  let orange = 0
  let edge = false
  for (let t = 1; ; t++) {
    const bx = bottom[0] + t * ux
    const by = bottom[1] + t * uy
    if (bx < 0 || by < 0 || bx > W - 1 || by > H - 1) { edge = true; break }
    // (the band's best fit within a pixel of the current axis)
    let best = { s: -1, o: off }
    for (const o of [off, off - 1, off + 1]) {
      if (Math.abs(o) > 3 + 0.15 * t) continue
      const b = band(bx - o * uy, by + o * ux)
      if (b.s > best.s) best = { ...b, o }
    }
    const [cx, cy] = [bx - best.o * uy, by + best.o * ux]
    path.push([cx, cy])
    const same = (x, y) => {
      const [k, lum] = kind(x, y)
      return k === best.k && Math.abs(lum - best.lum) < 15
    }
    const sides = same(cx - side * uy, cy + side * ux) && same(cx + side * uy, cy - side * ux)
    const on = best.s >= 0.5 && !sides
    if (on) {
      off = best.o
      last = path.length - 1
      orange = best.k === 2 ? orange + 1 : 0
      if (best.k === 1) white = true
      // (3 orange samples in a row after white: the tip, not a red mark on the white segment)
      else if (white && orange >= 3) tip = true
    } else if (tip || path.length - 1 - last > GAP) break
  }
  // (kept only when it ends at the tip, runs out of the frame or is orange all along (the rod's colours going on: the
  // whole rod looks orange to amber in the yellowish clips of 2024-06-21): a white run that fades out on the way is more
  // likely a bed of pale shells along the rod's line than the rod)
  return tip || !white || (edge && path.length - 1 - last <= GAP) ? path.slice(0, last + 1) : []
}

/** Whether the rod ends with its orange tip at its lower end: most of the 6 pixels above it orange to red (as extendRod) */
function tipAt(data, bottom, top) {
  const len = Math.hypot(bottom[0] - top[0], bottom[1] - top[1])
  const [ux, uy] = [(top[0] - bottom[0]) / len, (top[1] - bottom[1]) / len]
  let n = 0
  for (let t = 0; t < 6; t++) {
    const x = Math.min(W - 1, Math.max(0, Math.round(bottom[0] + t * ux)))
    const y = Math.min(H - 1, Math.max(0, Math.round(bottom[1] + t * uy)))
    const [r, g, b] = [data[3 * (y * W + x)], data[3 * (y * W + x) + 1], data[3 * (y * W + x) + 2]]
    if (r > 110 && r >= 1.15 * g && r >= 1.15 * b) n++
  }
  return n >= 4
}

/** Discs of radius hw at points */
function paintPoints(bin, points, hw) {
  for (const [cx, cy] of points)
    for (let y = Math.max(0, Math.floor(cy - hw)); y <= Math.min(H - 1, Math.ceil(cy + hw)); y++)
      for (let x = Math.max(0, Math.floor(cx - hw)); x <= Math.min(W - 1, Math.ceil(cx + hw)); x++)
        if ((x - cx) ** 2 + (y - cy) ** 2 <= hw * hw) bin[y * W + x] = 1
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
const counts = { rod: 0, water: 0, none: 0, skipped: 0, failed: 0 }
const several = []
const scanned = []
const extended = []
const sheet = []
for (const [k, f] of files.entries()) {
  const mask = out + f.replace(/\.tiff?$/i, '_guide.png')
  // (--resume: a frame whose mask is already 1-bit was done by this version)
  if (args.resume && !args['dry-run'] && bitDepth(mask) === 1) { counts.skipped++; continue }
  let data
  try {
    ({ data } = await readFrame(f))
  } catch (e) {
    console.log(`${f}: not read (${e.message}), no mask`)
    counts.failed++
    continue
  }
  // (the rod's colours: orange to lemon yellow, saturated: the yellow-tinted mud and concrete of some clips stay above
  // b = r / 2, green-yellow algae above g = 1.25 r; bright (r > 140) first, then dimmer (r > 115: the rod's thin tip far
  // away in some clips), which in other clips joins the rod to the tinted walls. Its pale upper part, white to light blue
  // in some clips, is found as a bright ridge, by ridgeTo)
  const colourOf = (min) => {
    const colour = new Uint8Array(W * H)
    for (let i = 0; i < W * H; i++) {
      const [r, g, b] = [data[3 * i], data[3 * i + 1], data[3 * i + 2]]
      if (r > min && b < 0.5 * r && g <= 1.25 * r) colour[i] = 1
    }
    return colour
  }
  // The rod: straight, thin pieces (a line fitted to each) leaning up to the right (30 to 75° from the horizontal),
  // their upper end right of 60 % of the width; either long (ROD_MIN), their upper end near the top edge (its pale tip
  // and the line holding it are not orange) or the right edge, or long with a bright ridge from their upper end (up to
  // mid-frame) out to the edge, or a short end cut by the top edge (the rod mostly out of view); drawn along their line
  // from their lower end out to the frame's edge
  const rod = new Uint8Array(W * H)
  let rods = 0
  let extension = 0
  const findRods = (colour) => pieces(grow(colour, 1), (p) => {
    if (p.n < 150 || p.n > 40000) return false
    // (the bar must hold at least half of the piece)
    const line = straightLine(p.members)
    const width = line.n / line.length
    if (line.n < 0.5 * p.n || width > 20 || line.spread > 0.5 * width) return false
    const [top, bottom] = line.ends[0][1] <= line.ends[1][1] ? line.ends : [line.ends[1], line.ends[0]]
    const lean = (Math.atan2(bottom[1] - top[1], top[0] - bottom[0]) * 180) / Math.PI
    if (top[0] < W * 0.6 || lean < 30 || lean > 75) return false
    const bar = line.length >= ROD_MIN && line.length >= 6 * width
    const long = bar && (top[1] <= H * 0.15 || (top[0] >= W - 4 && top[1] <= H * 0.3))
    const cut = top[1] <= 2 && line.length >= 18 && line.length >= 1.8 * width
    // (a long rod's pale upper part: its coloured part ends lower, up to mid-frame, below a bright ridge)
    const ridge = bar && !long && top[1] <= H * 0.5 ? ridgeTo(data, bottom, top, Math.max(2, width / 2)) : 0
    if (!long && !cut && ridge < 0.6) return false
    paintRod(rod, bottom, top, Math.max(2, 2 * line.spread))
    // (then on past its lower end, over its white segment and its orange tip)
    const more = extendRod(data, bottom, top, Math.max(2, width / 2))
    paintPoints(rod, more, Math.max(2, 2 * line.spread))
    extension = Math.max(extension, more.length)
    rods++
    return false
  })
  findRods(colourOf(140))
  const dim = rods ? null : colourOf(115)
  if (dim) findRods(dim)
  // (else a line scan, for the rod merged with a yellow plank or a tinted wall)
  const scan = rods ? null : scanRod(data, dim)
  if (scan) {
    // (past the part seen, the rod's white segment and tip when extendRod finds them, else 60 % of its length further)
    // (nor when the part seen ends with the orange tip: the whole rod was seen)
    const more = extendRod(data, scan.seen, scan.ends[1], scan.hw)
    paintRod(rod, more.length || tipAt(data, scan.seen, scan.ends[1]) ? scan.seen : scan.ends[0], scan.ends[1], scan.hw)
    paintPoints(rod, more, scan.hw)
    extension = Math.max(extension, more.length)
    scanned.push(f)
  }
  // Open water: large smooth pieces touching the frame's edge, their holes filled
  const water = args.water ? waterOf(data) : new Uint8Array(W * H)
  const rodPx = rod.reduce((s, v) => s + v, 0)
  const waterPx = water.reduce((s, v) => s + v, 0)
  if (rodPx) counts.rod++
  if (waterPx) counts.water++
  if (!rodPx && !waterPx) counts.none++
  // (one rod per frame: more pieces taken is worth a look)
  if (rods > 1) several.push(f)
  if (extension) extended.push(f)
  const masked = new Uint8Array(W * H)
  const rodGrown = rodPx ? grow(rod, Math.round(Number(args.grow) / SCALE)) : rod
  const waterGrown = waterPx ? grow(water, 2) : water
  for (let i = 0; i < W * H; i++) masked[i] = rodGrown[i] ? 1 : waterGrown[i] ? 2 : 0
  if (!args['dry-run']) {
    const pixels = Buffer.from(masked.map((v) => (v ? 0 : 255)))
    // (1-bit PNG by default, a palette of black and white: 8 times smaller than 8-bit grey, the same pixels; written
    // to a temporary file then renamed, never half-written)
    const img = sharp(pixels, { raw: { width: W, height: H, channels: 1 } }).resize(full.width, full.height, { kernel: 'nearest' }).toColourspace('b-w')
    await (args.bits === '1' ? img.png({ palette: true, colours: 2, dither: 0, compressionLevel: 9, effort: 10 }) : img.png({ compressionLevel: 9 })).toFile(mask + '.tmp')
    renameSync(mask + '.tmp', mask)
  }
  // (every frame of the kind asked, kept small; a sample spread over them goes on the sheet)
  const kinds = ['all', rodPx || waterPx ? 'rod' : 'none', ...(rods > 1 ? ['several'] : []), ...(scan ? ['scan'] : []), ...(extension ? ['extended'] : [])]
  if (args.sheet && kinds.includes(args['sheet-of'])) {
    for (let i = 0; i < W * H; i++) {
      if (masked[i] === 1) data.set([Math.min(255, data[3 * i] * 0.4 + 153), data[3 * i + 1] * 0.4, data[3 * i + 2] * 0.4], 3 * i)
      if (masked[i] === 2) data.set([0, 200, 255], 3 * i)
    }
    sheet.push({ f, tile: await sharp(data, { raw: { width: W, height: H, channels: 3 } }).resize(500).png().toBuffer() })
  }
  if (k % Number(args.log) === 0) console.log(`${k}/${files.length} ${f}: rod ${rodPx} px (extended ${extension}), water ${((100 * waterPx) / (W * H)).toFixed(1)} %`)
}
console.log(`${files.length} frames: the rod found in ${counts.rod}, open water in ${counts.water}, nothing in ${counts.none}${counts.skipped ? `, ${counts.skipped} already done (--resume)` : ''}${counts.failed ? `, ${counts.failed} not read` : ''}; masks${args['dry-run'] ? ' not written (dry run)' : ' in ' + out}`)
if (scanned.length) console.log(`the rod found by the line scan in ${scanned.length} frames: ${scanned.join(' ')}`)
if (extended.length) console.log(`the rod extended past its coloured part in ${extended.length} frames`)
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
