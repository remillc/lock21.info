// The navigation's help in the viewer's dialog (main.js, openSwimHelp: the first visit, and the « ? » of the keys in
// the standard mode), drawn as the /modele page's « Naviguer » box (ModelPage.astro; Christian, 2026-10-29: the same
// iconography): each gesture with its small mouse, the part used in the signal colour (or the fingers on a touch
// screen), and beside it the keys as key caps; on a touch screen, the AR and help buttons by their icons (the others,
// home, dive and tour, left out: Christian, 2026-10-29). The texts are the page's messages (model_…)
import { m } from './i18n.js'
import { icon } from './icons.js'

// The mouse's part each gesture uses (as ModelPage.astro)
const GESTURES = [
  [() => m.model_gestureTurn(), 'left', () => m.model_gestureTurnMouse(), () => m.model_gestureTurnFingers()],
  [() => m.model_gesturePan(), 'right', () => m.model_gesturePanMouse(), () => m.model_gesturePanFingers()],
  [() => m.model_gestureZoom(), 'wheel', () => m.model_gestureZoomMouse(), () => m.model_gestureZoomFingers()],
  [() => m.model_gestureFly(), 'left', () => m.model_gestureFlyMouse(), () => m.model_gestureFlyFingers()],
]

/** The small mouse (ModelPage.astro's drawing) @param {string} part - left, right or wheel */
function mouse(part) {
  const used = (p) => (part === p ? 'mouse-used' : 'mouse-idle')
  return `<svg class="mouse" aria-hidden="true" width="28" height="40" viewBox="0 0 28 40">
    <path class="mouse-body" d="M2 10 Q2 2 14 2 Q26 2 26 10 L26 28 Q26 38 14 38 Q2 38 2 28 Z" />
    <path class="${used('left')}" d="M2 10 Q2 2 13 2 L13 18 L2 18 Z" />
    <path class="${used('right')}" d="M15 2 Q26 2 26 10 L26 18 L15 18 Z" />
    <rect class="${part === 'wheel' ? 'mouse-used' : 'mouse-body'}" x="11" y="5" width="6" height="10" rx="3" />
  </svg>`
}

/**
 * @param {object} options
 * @param {boolean} options.touch - a touch screen: the fingers, no keys
 * @param {{ w: string, a: string, s: string, d: string }} options.keys - the movement keys' letters (the keyboard's)
 * @param {boolean} options.ar - the augmented reality button shows
 * @returns {string} HTML
 */
export function navHelp({ touch, keys, ar }) {
  const table = (title, rows) =>
    `<section><h3>${title}</h3><table class="nav-gestures"><tbody>${rows.map(([action, how]) => `<tr><th scope="row">${action}</th><td>${how}</td></tr>`).join('')}</tbody></table></section>`
  if (touch) {
    const buttons = [
      ...(ar ? [['view-in-ar-outline-rounded', m.model_buttonAr()]] : []),
      ['help-outline-rounded', m.model_buttonHelp()],
    ]
    return `<div class="nav-groups">${table(m.model_fingers(), GESTURES.map(([action, , , byFingers]) => [action(), byFingers()]))}</div>
      <ul class="nav-buttons">${buttons.map(([name, label]) => `<li><span class="icon">${icon(name)}</span>${label}</li>`).join('')}</ul>`
  }
  const or = ` ${m.model_keysOr()} `
  const moves = [
    [m.model_keyForward(), [keys.w, '↑']],
    [m.model_keyBack(), [keys.s, '↓']],
    [m.model_keyLeft(), [keys.a, '←']],
    [m.model_keyRight(), [keys.d, '→']],
    [m.model_keyFaster(), [m.model_keyShift()]],
  ]
  // The mouse and the keyboard side by side (Christian, 2026-10-29), one under the other in a narrow frame
  return `<div class="nav-groups">${table(m.model_mouse(), GESTURES.map(([action, part, byMouse]) => [action(), `<span class="mouse-how">${mouse(part)}${byMouse()}</span>`]))}${table(m.viewer_keyboard(), moves.map(([action, caps]) => [action, caps.map((k) => `<kbd>${k}</kbd>`).join(or)]))}</div>`
}
