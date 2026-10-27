// Inner padding check (docs/system-design.md, Spacing and interaction: « Content never touches an edge »): every box
// drawn on the page (a visible border, or a background of its own) keeps at least 8 px between its edge (inside the
// border) and its content, text or icon, at the sides, and 4 px above and below; an inline box (a key cap, inline code)
// at least 3 px at the sides. A box with a border on some sides only (a rule line) is judged on those sides; a box
// nested in another is measured on its own, not as the outer one's content.
// Crawls the site from its home pages (same-origin links), in headless Chrome, both themes, desktop and phone widths,
// and prints each box that breaks the rule: page, element, side, gap.
//
// Usage: node tools/design-check/inner-padding.mjs [-b|--base http://localhost:4321] [-p|--pages /,/modele]
//        [-t|--themes dark,light] [-d|--devices desktop,phone] [-m|--max 120] [--chrome <path>]
//   -b, --base     the site to check (default: the dev server, http://localhost:4321)
//   -p, --pages    only these pages (comma-separated paths); default: every page reached from / and /en/
//   -t, --themes   dark, light or both (default both)
//   -d, --devices  desktop (1440 px), phone (390 px) or both (default both)
//   -m, --max      at most this many pages crawled (default 120)
//   --chrome       Chrome's executable (default: the usual Windows path)
//   -h, --help     this help
// Exit code 1 when a box breaks the rule.
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const argv = process.argv.slice(2)
if (argv.includes('-h') || argv.includes('--help')) {
  const text = (await import('node:fs')).readFileSync(new URL(import.meta.url), 'utf8').split('\n')
  console.log(text.slice(0, text.findIndex((l) => l.startsWith('import'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'))
  process.exit(0)
}
const opt = (short, long, def) => {
  const i = argv.findIndex((a) => a === short || a === long)
  return i >= 0 ? argv[i + 1] : def
}
const BASE = opt('-b', '--base', 'http://localhost:4321').replace(/\/$/, '')
const PAGES = opt('-p', '--pages', null)?.split(',')
const THEMES = opt('-t', '--themes', 'dark,light').split(',')
const DEVICES = opt('-d', '--devices', 'desktop,phone').split(',')
const MAX = Number(opt('-m', '--max', 120))
const CHROME = opt('--chrome', '--chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe')
const SIDE_MIN = 8
const END_MIN = 4
const INLINE_MIN = 3

const port = 9300 + Math.floor(Math.random() * 600)
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'l21-padding-'))}`, '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' })
let targets
for (let i = 0; i < 60 && !targets; i++) {
  try {
    targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  } catch {
    await new Promise((r) => setTimeout(r, 250))
  }
}
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl)
let id = 0
const pending = new Map()
/** @param {string} method @param {object} [params] @returns {Promise<any>} */
const send = (method, params = {}) => new Promise((res) => { pending.set(++id, res); ws.send(JSON.stringify({ id, method, params })) })
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) pending.get(m.id)(m.result ?? {})
}
await new Promise((r) => (ws.onopen = r))
await send('Page.enable')
await send('Runtime.enable')
// No measurement sent to the site's analytics, whatever the server (Analytics.astro reads the refusal)
await send('Network.enable')
await send('Network.setBlockedURLs', { urls: ['*googletagmanager.com*', '*google-analytics.com*'] })
const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000))
/** @param {string} expression */
const ev = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.value
/** @param {string} path */
const open = async (path) => {
  await send('Page.navigate', { url: BASE + path })
  await sleep(path.includes('model') ? 6 : 1.5)
}

// The pages: the given ones, or every same-origin page reached from the two home pages
let pages = PAGES
if (!pages) {
  const seen = new Set(['/', '/en'])
  const queue = ['/', '/en']
  while (queue.length && seen.size < MAX) {
    await open(queue.shift())
    const links = await ev(`[...document.querySelectorAll('a[href]')].map((a) => new URL(a.href, location.href)).filter((u) => u.origin === location.origin && !/\\.[a-z0-9]+$/i.test(u.pathname)).map((u) => u.pathname.replace(/\\/$/, '') || '/')`)
    for (const link of links ?? []) {
      if (!seen.has(link)) {
        seen.add(link)
        queue.push(link)
      }
    }
  }
  // The 3D viewer's own page too (its controls; its panels open only on use)
  pages = [...seen].sort()
}

// In the page: every drawn box and the smallest gap between its inner edge and its content, side by side
const MEASURE = `(() => {
  const SIDE = ${SIDE_MIN}, END = ${END_MIN}, INLINE = ${INLINE_MIN}
  const px = (v) => parseFloat(v) || 0
  const visible = (e, s) => s.display !== 'none' && s.visibility !== 'hidden' && parseFloat(s.opacity) > 0 && !e.closest('[hidden], [aria-hidden="true"] *, .sr-only, .sl-sr-only')
  const paint = (s) => { const c = s.backgroundColor; return c && c !== 'transparent' && !/rgba\\(.*,\\s*0\\)$/.test(c) ? c : null }
  const effectiveBg = (e) => { for (let p = e.parentElement; p; p = p.parentElement) { const c = paint(getComputedStyle(p)); if (c) return c } return 'rgb(255, 255, 255)' }
  // The sides a box draws: all four with a background of its own, else those with a visible border
  const drawn = (e, s) => {
    const bg = paint(s)
    if (bg && bg !== effectiveBg(e)) return ['top', 'right', 'bottom', 'left']
    return ['Top', 'Right', 'Bottom', 'Left'].filter((side) => px(s['border' + side + 'Width']) >= 1 && s['border' + side + 'Style'] !== 'none' && !/rgba\\(.*,\\s*0\\)$|transparent/.test(s['border' + side + 'Color'])).map((side) => side.toLowerCase())
  }
  // The dev server's breakpoint label (DevBreakpoints.astro) is never published
  const isBox = (e, s) => drawn(e, s).length > 0 && !e.closest('l21-dev-breakpoints')
  const name = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\\s+/).filter((c) => !c.startsWith('astro-')).slice(0, 2).join('.') : '')
  const path = (e) => { const parts = []; for (let p = e; p && p !== document.body && parts.length < 4; p = p.parentElement) parts.unshift(name(p)); return parts.join(' > ') }
  const boxes = [...document.querySelectorAll('body *')].filter((e) => { const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && visible(e, s) && isBox(e, s) && !['IMG', 'SVG', 'CANVAS', 'VIDEO', 'IFRAME', 'HR', 'INPUT', 'TEXTAREA', 'svg', 'path', 'rect', 'circle'].includes(e.tagName) && !(e instanceof SVGElement) })
  const boxSet = new Set(boxes)
  const out = []
  for (const box of boxes) {
    const s = getComputedStyle(box)
    // A box that scrolls, or holds a picture filling it (figure image, the 3D canvas), is skipped
    if (/auto|scroll/.test(s.overflowX + s.overflowY) && (box.scrollWidth > box.clientWidth + 1 || box.scrollHeight > box.clientHeight + 1)) continue
    const r = box.getBoundingClientRect()
    const inner = { left: r.left + px(s.borderLeftWidth), right: r.right - px(s.borderRightWidth), top: r.top + px(s.borderTopWidth), bottom: r.bottom - px(s.borderBottomWidth) }
    // Its content: the text and the pictures in it; the boxes nested in it are measured on their own (a table's
    // coloured header cells, a button in a card), not as its content
    const rects = []
    const walk = (node) => {
      for (const child of node.childNodes) {
        if (child.nodeType === 3) {
          if (!child.textContent.trim()) continue
          const range = document.createRange(); range.selectNodeContents(child)
          for (const q of range.getClientRects()) if (q.width > 0 && q.height > 0) rects.push(q)
        } else if (child.nodeType === 1) {
          const cs = getComputedStyle(child)
          if (!visible(child, cs)) continue
          if (cs.position === 'absolute' || cs.position === 'fixed') continue
          if (boxSet.has(child)) continue
          if (['IMG', 'CANVAS', 'VIDEO', 'IFRAME', 'INPUT', 'SELECT', 'TEXTAREA'].includes(child.tagName) || child instanceof SVGSVGElement) {
            const q = child.getBoundingClientRect(); if (q.width > 0 && q.height > 0) rects.push(q)
          } else walk(child)
        }
      }
    }
    walk(box)
    if (!rects.length) continue
    // A picture filling the whole box (an image's frame, the 3D canvas) is not content touching an edge
    if (rects.length === 1) {
      const q = rects[0]
      if (Math.abs(q.left - inner.left) < 1 && Math.abs(q.right - inner.right) < 1 && Math.abs(q.top - inner.top) < 1 && Math.abs(q.bottom - inner.bottom) < 1) continue
    }
    const gap = {
      left: Math.min(...rects.map((q) => q.left)) - inner.left,
      right: inner.right - Math.max(...rects.map((q) => q.right)),
      top: Math.min(...rects.map((q) => q.top)) - inner.top,
      bottom: inner.bottom - Math.max(...rects.map((q) => q.bottom)),
    }
    const inline = (/^inline/.test(s.display) && box.tagName !== 'BUTTON' && box.tagName !== 'A') || ['KBD', 'CODE'].includes(box.tagName)
    // An inline box broken over several lines (a long path in inline code): its bounding box spans the lines, its
    // sides are not where its text starts and ends; skipped
    if (inline && box.getClientRects().length > 1) continue
    const sides = drawn(box, s)
    // Inline boxes: their sides only (the glyphs' rectangle already holds the line's leading)
    const min = (side) => (side === 'left' || side === 'right' ? (inline ? INLINE : SIDE) : inline ? -Infinity : END)
    const short = Object.entries(gap).filter(([side, g]) => sides.includes(side) && g < min(side) - 0.5 && g > -50)
    if (short.length) out.push({ el: path(box), text: (box.innerText || box.getAttribute('aria-label') || '').trim().replace(/\\s+/g, ' ').slice(0, 40), min: inline ? INLINE : SIDE + '/' + END, gaps: short.map(([side, g]) => side + ' ' + Math.round(g * 10) / 10) })
  }
  return out
})()`

const found = new Map()
for (const theme of THEMES) {
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `try { localStorage.setItem('starlight-theme', '${theme}'); localStorage.setItem('l21-consent', 'denied') } catch {}` })
  for (const device of DEVICES) {
    if (device === 'phone') await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
    else await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
    for (const page of pages) {
      await open(page)
      for (const v of (await ev(MEASURE)) ?? []) {
        const key = `${v.el} | ${v.gaps.map((g) => g.split(' ')[0]).join(',')}`
        const entry = found.get(key) ?? { ...v, where: new Set() }
        entry.where.add(`${page} (${theme}, ${device})`)
        found.set(key, entry)
      }
    }
  }
}
ws.close()
chrome.kill()

console.log(`Checked ${pages.length} pages × ${THEMES.length} theme(s) × ${DEVICES.length} device(s): ${found.size} box(es) under the minimum`)
for (const v of [...found.values()].sort((a, b) => b.where.size - a.where.size)) {
  const where = [...v.where]
  console.log(`\n${v.el}  «${v.text}»  min ${v.min} px: ${v.gaps.join(', ')}\n  ${where.length} place(s): ${where.slice(0, 4).join('; ')}${where.length > 4 ? '; …' : ''}`)
}
process.exit(found.size ? 1 : 0)
