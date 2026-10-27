// Visitors' actions in the viewer, for the site's Google Analytics (TODO #88, Christian 2026-10-26): the viewer has no
// analytics of its own; it posts each action to the page's window (lock21:track), whose Analytics.astro sends it,
// unless the visitor refused the measurement (privacy page). Technical facts (errors, load times, the device) stay in
// telemetry.js.
// Also: the time the viewer is seen in each mode, standard or underwater (TODO #88), counted while the page is visible
// and sent as viewer_end (seconds per mode) when it is hidden or the viewer taken down (leaving /modele); a visit hidden
// and seen again sends one viewer_end each time (sum them per session). And the first move of the visit (first_move),
// sent once.
import { life } from './dom.js'


/**
 * One action, by its GA4 event name (docs: the privacy page lists them).
 * @param {string} name
 * @param {Record<string, string | number | boolean>} [params]
 */
export function track(name, params = {}) {
  window.postMessage({ type: 'lock21:track', name, params }, location.origin)
}

// The time seen in each mode: the current mode, since when (0: the page hidden), the seconds counted
const clock = { underwater: false, since: 0, seconds: { standard: 0, underwater: 0 } }

/** The time since `since` added to the current mode */
function count() {
  if (clock.since) clock.seconds[clock.underwater ? 'underwater' : 'standard'] += (performance.now() - clock.since) / 1000
  clock.since = document.visibilityState === 'visible' ? performance.now() : 0
}

/** The seconds counted, sent (viewer_end), and counting again from zero */
export function sendViewerTime() {
  count()
  const standard = Math.round(clock.seconds.standard)
  const underwater = Math.round(clock.seconds.underwater)
  clock.seconds = { standard: 0, underwater: 0 }
  if (standard + underwater >= 1) track('viewer_end', { standard_seconds: standard, underwater_seconds: underwater })
}

/** Starts counting (each mount, main.js): standard mode first; sent when the page is hidden */
export function startViewerClock() {
  clock.underwater = false
  clock.seconds = { standard: 0, underwater: 0 }
  clock.since = document.visibilityState === 'visible' ? performance.now() : 0
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') sendViewerTime()
    else clock.since = performance.now()
  }, { signal: life.signal })
}

/** The viewer's mode, for the time counted in each. @param {boolean} underwater */
export function reportMode(underwater) {
  count()
  clock.underwater = underwater
}

let moved = false
/** The visit's first move (turn, pan, zoom, swim, fly to a point), sent once. @param {string} kind */
export function firstMove(kind) {
  if (moved) return
  moved = true
  track('first_move', { move: kind })
}
