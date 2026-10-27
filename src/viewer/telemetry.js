// Telemetry: what happens in visitors' browsers, for every visit (no switch): the device, the load time, errors (script,
// WebGL context lost, tiles that fail), the AR button, and a visit that ended without closing (Safari on iPhone reloads
// a page that runs out of memory: the next load of the viewer in that tab reports it). Each message is a small JSON
// sent to the site's Worker (/api/log, worker/index.js), which writes it to Cloudflare's Workers Logs; nothing else
// keeps it. No cookie, no identifier but a random session code, shown in the settings panel (⚙) so that a tester can
// read it out and the logs be filtered on it (npx wrangler tail lock21-info --search <code>).
// Development: printed in the console, not sent (the dev servers have no /api/log).
import { life } from './dom.js'

const ENDPOINT = '/api/log'
// A session sends at most this many messages (a loop of errors must not flood the logs); the visit's end always goes
// (2026-10-24: 39 tile errors used them up, and the end of that iPad visit never came)
const MAX_MESSAGES = 40
const ALIVE_KEY = 'l21-viewer-alive'

// Four characters without look-alikes (0/O, 1/I/L), easy to read out over the phone
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
export const session = Array.from(crypto.getRandomValues(new Uint8Array(4)), (n) => ALPHABET[n % ALPHABET.length]).join('')

let sent = 0
export function log(type, data = {}) {
  if (sent >= MAX_MESSAGES && type !== 'end') return
  sent++
  const message = { s: session, t: type, ms: Math.round(performance.now()), ...data }
  if (import.meta.env.DEV) {
    console.debug('[telemetry]', message)
    return
  }
  let body = JSON.stringify(message)
  // The Worker refuses more than 4 KB: long stacks are cut
  if (body.length > 3900) body = JSON.stringify({ ...message, stack: String(message.stack ?? '').slice(0, 1500), msg: String(message.msg ?? '').slice(0, 500) })
  try {
    // sendBeacon still delivers while the page closes; text/plain avoids a CORS preflight
    if (!navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'text/plain' }))) {
      fetch(ENDPOINT, { method: 'POST', body, keepalive: true }).catch(() => {})
    }
  } catch {
    // Never let telemetry break the viewer
  }
}

/** WebAssembly (the texture and geometry decoders run on it): 'ok', 'missing' (Lockdown Mode, some browsers) or 'fails' */
function wasmState() {
  if (typeof WebAssembly !== 'object') return 'missing'
  try {
    // The smallest valid module: its header
    new WebAssembly.Module(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]))
    return 'ok'
  } catch {
    return 'fails'
  }
}

const errorText = (error) => ({ msg: String(error?.message ?? error).slice(0, 500), stack: String(error?.stack ?? '').slice(0, 2000) })

/**
 * Starts the session: device facts, the previous visit's end, and the global error handlers
 * @returns {{ previousUnclosed: boolean, end: () => void }} whether the previous visit in this tab never closed
 *   (Safari's reload when memory runs out); end(): the visit's end, when the page closes or the viewer is taken down
 *   (TODO #80: leaving /modele by the site's navigation)
 */
export function startTelemetry({ renderer, mobile, embedded }) {
  const gl = renderer.getContext()
  const debug = gl.getExtension('WEBGL_debug_renderer_info')
  log('start', {
    ua: navigator.userAgent,
    lang: navigator.language,
    screen: `${screen.width}x${screen.height}@${window.devicePixelRatio}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    memory: navigator.deviceMemory ?? null,
    cores: navigator.hardwareConcurrency ?? null,
    gpu: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    maxTexture: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    wasm: wasmState(),
    profile: mobile ? 'mobile' : 'desktop',
    embedded,
    page: location.pathname + location.search,
  })

  // A visit whose page never closed normally (crash, or Safari's reload when memory runs out) left its mark behind
  let previousUnclosed = false
  try {
    const previous = sessionStorage.getItem(ALIVE_KEY)
    previousUnclosed = Boolean(previous)
    if (previous) log('previous-unclosed', { previous })
    sessionStorage.setItem(ALIVE_KEY, session)
  } catch {
    // Storage blocked: no crash detection
  }

  window.addEventListener('error', (event) => {
    log('error', { ...errorText(event.error ?? event.message), src: event.filename, line: event.lineno, col: event.colno })
  }, { signal: life.signal })
  window.addEventListener('unhandledrejection', (event) => log('rejection', errorText(event.reason)), { signal: life.signal })
  renderer.domElement.addEventListener('webglcontextlost', () => log('webgl-lost'))
  renderer.domElement.addEventListener('webglcontextrestored', () => log('webgl-restored'))

  const started = performance.now()
  let ended = false
  const end = () => {
    try {
      sessionStorage.removeItem(ALIVE_KEY)
    } catch {
      // Storage blocked
    }
    if (ended) return
    ended = true
    log('end', { duration: Math.round((performance.now() - started) / 1000), ...endFacts?.() })
  }
  window.addEventListener('pagehide', end, { signal: life.signal })
  return { previousUnclosed, end }
}

// Facts added to the 'end' message (tiles loaded, memory used), supplied by the viewer
let endFacts = null
export function setEndFacts(fn) {
  endFacts = fn
}

export { errorText }
