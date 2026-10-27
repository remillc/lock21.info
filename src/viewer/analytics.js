// Visitors' actions in the viewer, for the site's Google Analytics (TODO #88, Christian 2026-10-26): the viewer has no
// analytics of its own; embedded in /modele, it passes each action to the page (postMessage, lock21:track), whose
// Analytics.astro sends it, unless the visitor refused the measurement (privacy page). Alone at /modele/viewer, nothing
// is sent. Technical facts (errors, load times, the device) stay in telemetry.js.
// Also: the mode (lock21:mode, standard or underwater), whose visible time the page counts (l21-model-frame,
// viewer_end), and the first move of the visit (first_move), sent once.

const embedded = window.self !== window.top

/**
 * One action, by its GA4 event name (docs: the privacy page lists them).
 * @param {string} name
 * @param {Record<string, string | number | boolean>} [params]
 */
export function track(name, params = {}) {
  if (embedded) window.parent.postMessage({ type: 'lock21:track', name, params }, location.origin)
}

/** The viewer's mode, for the time counted in each. @param {boolean} underwater */
export function reportMode(underwater) {
  if (embedded) window.parent.postMessage({ type: 'lock21:mode', underwater }, location.origin)
}

let moved = false
/** The visit's first move (turn, pan, zoom, swim, fly to a point), sent once. @param {string} kind */
export function firstMove(kind) {
  if (moved) return
  moved = true
  track('first_move', { move: kind })
}
