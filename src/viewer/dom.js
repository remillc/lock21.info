// The viewer's own part of the page (TODO #80, 2026-10-27): its controls live in the shadow root of <l21-viewer>
// (src/components/model/Viewer.astro), not in the document. The modules find them through `root` (root.querySelector,
// not document.querySelector), go full screen on `host`, and read an event's real target with origin(): a listener on
// the window sees <l21-viewer> as the target of an event from inside it.
// <l21-viewer> calls attach() before it loads main.js, so every module sees the shadow root from its first line.

/** @type {Document | ShadowRoot} */
export let root = document
/** @type {HTMLElement} */
export let host = document.documentElement
/** How the viewer was opened: reset, a new visit to /modele (the settings saved earlier are forgotten, the kept camera
 *  is not used); otherwise a reload of the page */
export const launch = { reset: false }

/**
 * @param {ShadowRoot} shadow
 * @param {HTMLElement} element - its host, <l21-viewer>
 * @param {{ reset: boolean }} options
 */
export function attach(shadow, element, { reset }) {
  root = shadow
  host = element
  launch.reset = reset
}

/** The viewer's lifetime, one per mount (main.js, mountViewer): every listener on the window, the document or the host
 *  takes its signal, and dispose() aborts it, removing them all */
export const life = { signal: /** @type {AbortSignal | undefined} */ (undefined) }

/** The element an event started on, inside the shadow root too
 *  @param {Event} event */
export const origin = (event) => /** @type {EventTarget | null} */ (event.composedPath?.()[0] ?? event.target)
