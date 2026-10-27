// The crayfish's dance (src/viewer/crawfish.js) fitted to the « Iraq lobster » GIF, frame by frame: the keypoints
// measured on each frame (dance-keypoints.json: head, pelvis, each claw's shoulder, elbow, wrist and tip, each rear
// leg's hip, knee and foot, the tail's end, the antennae's and the small legs' tips; screen pixels, y down) give the
// direction of each segment (the rear legs' thigh and shin: the rig's second and last segments, its first being
// short); the crayfish's skeleton, standing, seen from the front, is turned joint by joint until
// its segments point the same ways (coordinate descent, from the previous frame's answer, a little pull toward it
// and toward the standing pose so that what the frame doesn't show stays put). Writes src/viewer/crawfish-dance.json.
//
// Runs in the viewer's development server (npm run viewer:dev, http://localhost:3100), in headless Chrome: the
// crayfish's own code poses it (its debug hooks danceOverride and danceKeypoints), so the fit and the viewer agree.
//
// Usage: node tools/creatures/fit_dance.mjs [-k|--keypoints dance-keypoints.json] [-o|--out crawfish-dance.json]
//        [-f|--frames 1-46] [-v|--verbose]
//        node tools/creatures/fit_dance.mjs -h | --help
import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
if (args.some((a) => a === '-h' || a === '--help')) {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//'))
    .map((l) => l.replace(/^\/\/ ?/, '')).join('\n'))
  process.exit(0)
}
const option = (short, long, fallback) => {
  const i = args.findIndex((a) => a === short || a === long)
  return i >= 0 ? args[i + 1] : fallback
}
const keypointsPath = option('-k', '--keypoints', join(here, 'dance-keypoints.json'))
const outPath = option('-o', '--out', join(here, '..', '..', 'viewer', 'src', 'crawfish-dance.json'))
const [first, last] = option('-f', '--frames', '1-46').split('-').map(Number)
const verbose = args.includes('-v') || args.includes('--verbose')
const keypoints = JSON.parse(readFileSync(keypointsPath, 'utf8')).filter((k) => k.frame >= first && k.frame <= last)
  .sort((a, b) => a.frame - b.frame)
const data = JSON.parse(readFileSync(outPath, 'utf8'))

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=9377',
  `--user-data-dir=${mkdtempSync(join(tmpdir(), 'cdp-'))}`, '--window-size=800,600', '--enable-unsafe-swiftshader',
  '--use-angle=swiftshader', '--ignore-gpu-blocklist', 'about:blank'], { stdio: 'ignore' })
let info
for (let i = 0; i < 50 && !info; i++) {
  try { info = await (await fetch('http://127.0.0.1:9377/json/list')).json() } catch { await new Promise((r) => setTimeout(r, 200)) }
}
const ws = new WebSocket(info.find((t) => t.type === 'page').webSocketDebuggerUrl)
let id = 0
const pending = new Map()
const send = (method, params = {}) => new Promise((res) => { pending.set(++id, res); ws.send(JSON.stringify({ id, method, params })) })
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) pending.get(m.id)(m.result) }
await new Promise((r) => (ws.onopen = r))
await send('Runtime.enable')
const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000))
const ev = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 600))
  return r.result.value
}

// The viewer, then the crayfish's place: the camera in front of it, close (its threat posture, standing)
await send('Page.navigate', { url: 'http://localhost:3100/modele/viewer' })
for (let i = 0; i < 60 && !(await ev('!!window.l21?.crawfishes?.[0]?.debug?.ready').catch(() => false)); i++) await sleep(1)
const [x, y, z] = await ev('window.l21.crawfishes[0].object.position.toArray()')
await send('Page.navigate', { url: `http://localhost:3100/modele/viewer?cam=${x + 0.5},${y + 0.2},${z},${x},${y + 0.05},${z}` })
for (let i = 0; i < 60 && !(await ev('!!window.l21?.crawfishes?.[0]?.debug?.ready').catch(() => false)); i++) await sleep(1)
await sleep(3)

// The fit, in the page
const fitted = await ev(`(${fitInPage.toString()})(${JSON.stringify({ keypoints, params: data.params, stand: data.stand, verbose })})`)
ws.close()
chrome.kill()
for (const line of fitted.log) console.log(line)
// Frames not fitted (outside -f) keep their rows
const frames = data.frames.slice()
for (const { frame, row } of fitted.rows) frames[frame - 1] = row.map((v) => Math.round(v * 1000) / 1000)
writeFileSync(outPath, JSON.stringify({ ...data, frames }, null, 0).replace(/\],\[/g, '],\n['))
console.log(`fit_dance: ${fitted.rows.length} frames -> ${outPath}`)
process.exit(0)

/** Runs in the page: fits each frame's row; returns { rows: [{ frame, row }], log } */
function fitInPage({ keypoints, params, stand, verbose }) {
  const crawfish = window.l21.crawfishes[0]
  const camera = window.l21.camera
  const index = Object.fromEntries(params.map((p, i) => [p, i]))
  const OPEN = { closed: 0.05, half: 0.3, open: 0.6, wide: 0.9 }
  const log = []
  const angle = (a, b) => (a && b ? Math.atan2(b[1] - a[1], b[0] - a[0]) : null)
  const mid = (a, b) => (a && b ? [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] : null)
  // The GIF's points: y up (screen y down), x as on screen
  const up = (p) => (Array.isArray(p) && p.length === 2 && p.every((v) => typeof v === 'number') ? [p[0], -p[1]] : null)
  /** The segments to match: [name, weight, GIF direction, (rig keypoints) => rig direction] */
  function segments(k) {
    const head = up(k.head)
    const pelvis = up(k.pelvis)
    const centre = mid(head, pelvis)
    const out = [['body', 3, angle(pelvis, head), (r) => angle(r.tail_000, mid(r.antenna_L_000, r.antenna_R_000))]]
    // Screen left is the crayfish's right
    for (const [screen, S] of [['SL', 'R'], ['SR', 'L']]) {
      const claw = k[`claw_${screen}`] || {}
      out.push([`${S}.upper`, 1.5, angle(up(claw.shoulder), up(claw.elbow)), (r) => angle(r[`claw_${S}_000`], r[`claw_${S}_001`])])
      out.push([`${S}.fore`, 1.5, angle(up(claw.elbow), up(claw.wrist)), (r) => angle(r[`claw_${S}_001`], r[`claw_${S}_002`])])
      out.push([`${S}.hand`, 1.5, angle(up(claw.wrist), up(claw.tip)), (r) => angle(r[`claw_${S}_002`], r[`claw_${S}_003_end`])])
      const leg = k[`leg_${screen}`] || {}
      // The rig's first leg segment is short (its coxa): the GIF's thigh is its next one, the shin its last
      out.push([`${S}.thigh`, 1.2, angle(up(leg.hip), up(leg.knee)), (r) => angle(r[`leg_rear_${S}_001`], r[`leg_rear_${S}_002`])])
      out.push([`${S}.shin`, 1.2, angle(up(leg.knee), up(leg.foot)), (r) => angle(r[`leg_rear_${S}_002`], r[`leg_rear_${S}_002_end`])])
      const antenna = up(k[`antenna_${screen}`]?.tip ?? k[`antenna_${screen}`])
      out.push([`${S}.antenna`, 0.5, angle(head, antenna), (r) => angle(r[`antenna_${S}_000`], r[`antenna_${S}_001_end`])])
      const small = k[`small_${screen}`] || {}
      const tip = mid(up(small.top), up(small.bottom)) ?? up(small.top) ?? up(small.bottom)
      out.push([`${S}.small`, 0.5, angle(centre, tip), (r) => {
        const ends = ['front', 'mid1', 'mid2'].map((l) => [r[`leg_${l}_${S}_000`], r[`leg_${l}_${S}_end`]])
        const dx = ends.reduce((s, [a, b]) => s + b[0] - a[0], 0)
        const dy = ends.reduce((s, [a, b]) => s + b[1] - a[1], 0)
        return Math.atan2(dy, dx)
      }])
    }
    out.push(['tail', 0.7, angle(pelvis, up(k.tail_end)), (r) => angle(r.tail_000, r.fin_middle_end)])
    return out.filter((s) => s[2] !== null)
  }
  const diff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b))
  /** Coordinate descent from a row: [cost, row] */
  function descend(start, cost) {
    const row = start.slice()
    let best = cost(row)
    for (const step of [0.4, 0.2, 0.1, 0.05, 0.02, 0.01]) {
      for (let pass = 0; pass < 12; pass++) {
        let improved = false
        for (const name of free) {
          const i = index[name]
          for (const dir of [1, -1]) {
            const old = row[i]
            row[i] = old + dir * step
            const e = cost(row)
            if (e < best - 1e-9) { best = e; improved = true; break }
            row[i] = old
          }
        }
        if (!improved) break
      }
    }
    return [best, row]
  }
  const rows = []
  let previous = stand.slice()
  // What the fit turns (the pincers' opening is read, not fitted)
  const free = params.filter((p) => !p.endsWith('.open'))
  for (const k of keypoints) {
    const segs = segments(k)
    const row = previous.slice()
    for (const S of ['R', 'L']) {
      const open = k[`claw_${S === 'R' ? 'SL' : 'SR'}`]?.open
      if (open in OPEN) row[index[`${S}.open`]] = OPEN[open]
    }
    const cost = (r) => {
      crawfish.danceOverride = r
      crawfish.update(camera, 1e-6)
      const rig = crawfish.danceKeypoints
      let e = 0
      for (const [, weight, target, measure] of segs) {
        const a = measure(rig)
        if (a !== null) e += weight * diff(a, target) ** 2
      }
      // Pulls: toward the previous frame (smooth), toward standing (what the frame doesn't show), and twist kept small
      for (let i = 0; i < r.length; i++) e += 0.02 * (r[i] - previous[i]) ** 2 + 0.01 * (r[i] - stand[i]) ** 2
      e += 0.5 * r[index.twist] ** 2
      return e
    }
    // From several starts (the previous frame, the standing pose, each leg mirrored from the other: a joint turned the
    // wrong way round can't come back one small step at a time), the best kept
    const starts = [row.slice(), stand.slice()]
    for (const [from, to] of [['R', 'L'], ['L', 'R']]) {
      const mirrored = row.slice()
      for (const j of ['hip', 'knee', 'ankle']) mirrored[index[`${to}.${j}`]] = row[index[`${from}.${j}`]]
      starts.push(mirrored)
    }
    for (const start of starts) for (const S of ['R', 'L']) start[index[`${S}.open`]] = row[index[`${S}.open`]]
    let best = Infinity
    let bestRow = row
    for (const start of starts) {
      const [e, r] = descend(start, cost)
      if (e < best) { best = e; bestRow = r }
    }
    row.splice(0, row.length, ...bestRow)
    crawfish.danceOverride = row
    crawfish.update(camera, 1e-6)
    const rig = crawfish.danceKeypoints
    const worst = segs.map(([name, , target, measure]) => [name, Math.round((Math.abs(diff(measure(rig), target)) * 180) / Math.PI)])
      .sort((a, b) => b[1] - a[1]).slice(0, 3)
    log.push(`frame ${String(k.frame).padStart(2)}: cost ${best.toFixed(3)}; largest gaps ${worst.map(([n, d]) => `${n} ${d}°`).join(', ')}`)
    rows.push({ frame: k.frame, row: row.slice() })
    previous = row.slice()
  }
  crawfish.danceOverride = null
  return { rows, log: verbose ? log : log.filter((l, i) => i % 5 === 0 || /\b([3-9]\d|1\d\d)°/.test(l)) }
}
