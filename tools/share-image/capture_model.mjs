// The /modele page's share image (TODO #98, Christian 2026-10-27): the 3D viewer's start view, 1200 x 630, without
// its buttons, captured in headless Chrome from a built site (npm run build, then npm run preview: the online tiles),
// written to public/images/og-modele.jpg (src/routeData.js uses it for /modele and /en/modele).
// Also the home page's image: -W 2400 -H 800 -o src/assets/home/lock-21.webp, with its view in the address (?cam=, Home.astro).
// Usage: node tools/share-image/capture_model.mjs [-u http://localhost:4321/modele] [-o public/images/og-modele.jpg]
//          [-w 30] (seconds to let the tiles load) [-W 1200] [-H 630] (the image's size, px; .webp or .jpg by its name)
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import sharp from 'sharp'

const { values: args } = parseArgs({
  options: {
    url: { type: 'string', short: 'u', default: 'http://localhost:4321/modele' },
    out: { type: 'string', short: 'o', default: 'public/images/og-modele.jpg' },
    wait: { type: 'string', short: 'w', default: '30' },
    width: { type: 'string', short: 'W', default: '1200' },
    height: { type: 'string', short: 'H', default: '630' },
    chrome: { type: 'string', default: 'C:/Program Files/Google/Chrome/Application/chrome.exe' },
    help: { type: 'boolean', short: 'h' },
  },
})
if (args.help) {
  console.log('node tools/share-image/capture_model.mjs [-u <model page>] [-o <out.jpg>] [-w 30] [-W 1200] [-H 630]\n' +
    "The 3D viewer's start view, 1200 x 630 without its buttons, as the /modele page's share image.")
  process.exit(0)
}
const W = Number(args.width)
const H = Number(args.height)
const port = 9300 + Math.floor(Math.random() * 600)
const chrome = spawn(args.chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'l21-og-'))}`, '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' })
let targets
for (let i = 0; i < 60 && !targets; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json() } catch { await new Promise((r) => setTimeout(r, 250)) }
}
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl)
let id = 0
const pending = new Map()
const send = (method, params = {}) => new Promise((res) => { pending.set(++id, res); ws.send(JSON.stringify({ id, method, params })) })
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) pending.get(m.id)(m.result ?? m.error ?? {}) }
await new Promise((r) => (ws.onopen = r))
const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000))
await send('Page.enable')
await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
// (the analytics off for this visit: Analytics.astro's refusal, kept in localStorage)
await send('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.setItem('l21-consent', 'denied') } catch {}" })
await send('Page.navigate', { url: args.url })
await sleep(4)
// The viewer fills the window (as its full screen on a phone), its buttons and cards hidden: the 3D view only
await send('Runtime.evaluate', {
  expression: `(() => {
    const v = document.querySelector('l21-viewer')
    // (its frame on the page, .frame, holds it: the frame fills the window, without its border, corners or entrance)
    v.closest('.frame').style.cssText = 'position: fixed; inset: 0; z-index: 10000; width: 100vw; height: 100vh; max-height: none; margin: 0; border: 0; border-radius: 0; animation: none; transform: none'
    const style = document.createElement('style')
    style.textContent = '.viewer-frame > :not(#viewer), .viewer-frame::before { display: none !important }'
    v.shadowRoot.append(style)
    // (the page around it hidden: no header bar, menu button, scroll bar or dev toolbar; above, the help dialog's scrim too)
    const page = document.createElement('style')
    page.textContent = 'html { overflow: hidden !important } body { visibility: hidden } .frame, .frame * { visibility: visible } astro-dev-toolbar { display: none !important }'
    document.head.append(page)
    return true
  })()`,
})
await sleep(Number(args.wait))
const shot = await send('Page.captureScreenshot', { format: 'png' })
const image = sharp(Buffer.from(shot.data, 'base64')).resize(W, H)
await (args.out.endsWith('.webp') ? image.webp({ quality: 82 }) : image.jpeg({ quality: 85, mozjpeg: true })).toFile(args.out)
console.log(`${args.out}: ${W} x ${H}, from ${args.url}`)
ws.close()
chrome.kill()
process.exit(0)
