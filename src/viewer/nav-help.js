// The navigation's help in the viewer's dialog (main.js, openSwimHelp: the first visit, and the « ? » of the keys in
// the standard mode), drawn as the /modele page's « Naviguer » box (ModelPage.astro; Christian, 2026-10-29: the same
// iconography): each gesture with its small mouse, the part used in the signal colour (or the fingers on a touch
// screen), and beside it the keys as key caps; on a touch screen, the AR and help buttons by their icons (the others,
// home, dive and tour, left out: Christian, 2026-10-29). The texts are the page's messages (model_…)
import { m } from './i18n.js'
import { icon } from './icons.js'

// The mouse's part each gesture uses (as ModelPage.astro), and its fingers' sketch on a touch screen
const GESTURES = [
  [() => m.model_gestureTurn(), 'left', () => m.model_gestureTurnMouse(), () => m.model_gestureTurnFingers(), 'one'],
  [() => m.model_gesturePan(), 'right', () => m.model_gesturePanMouse(), () => m.model_gesturePanFingers(), 'two'],
  [() => m.model_gestureZoom(), 'wheel', () => m.model_gestureZoomMouse(), () => m.model_gestureZoomFingers(), 'pinch'],
  [() => m.model_gestureFly(), 'left', () => m.model_gestureFlyMouse(), () => m.model_gestureFlyFingers(), 'double'],
]

/**
 * The fingers' sketch of a gesture (Christian, 2026-10-30), as the small mouse on a computer: the fingertips in the
 * signal colour (mouse-used), the movement as arrows (mouse-arrow)
 * @param {string} kind - one (one finger drags), two (two fingers drag), pinch (two fingers apart), double (double tap)
 */
function fingers(kind) {
  const tip = (x, y) => `<circle class="mouse-used" cx="${x}" cy="${y}" r="4" />`
  /** An arrow from (x1, y1) to (x2, y2), its head at the end */
  const arrow = (x1, y1, x2, y2) => {
    const a = Math.atan2(y2 - y1, x2 - x1)
    const head = (d) => `${(x2 - 5 * Math.cos(a + d)).toFixed(1)} ${(y2 - 5 * Math.sin(a + d)).toFixed(1)}`
    return `<path class="mouse-arrow" d="M${x1} ${y1} L${x2} ${y2} M${head(0.5)} L${x2} ${y2} L${head(-0.5)}" />`
  }
  const parts = {
    one: tip(10, 18) + arrow(17, 18, 28, 18),
    two: tip(8, 13) + tip(8, 23) + arrow(15, 18, 28, 18),
    pinch: tip(13, 19) + tip(19, 13) + arrow(10, 22, 4, 28) + arrow(22, 10, 28, 4),
    double: tip(16, 16) + '<circle class="mouse-arrow" cx="16" cy="16" r="8" /><circle class="mouse-arrow" cx="16" cy="16" r="12" />',
  }
  return `<svg class="mouse" aria-hidden="true" width="32" height="32" viewBox="0 0 32 32">${parts[kind]}</svg>`
}

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
    return `<div class="nav-groups">${table(m.model_fingers(), GESTURES.map(([action, , , byFingers, kind]) => [action(), `<span class="mouse-how">${fingers(kind)}${byFingers()}</span>`]))}</div>
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
