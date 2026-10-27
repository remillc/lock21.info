// <l21-loading>: the viewer's loading indicator (native Custom Element, docs/guidelines.md), in two phases
// (Christian, 2026-10-23: a percentage that reached 100 % long after the model could be seen was misleading):
// - until the first view is drawn: "Chargement" ("Loading") with three dots that appear one after the other, on a card
//   centred over the model, with an MD3 linear progress indicator, indeterminate (the number of tiles to load keeps
//   changing as the camera settles: a percentage only went back and forth);
// - then, while the finer detail keeps arriving: the card leaves with the MD3 exit motion (fade, emphasized-accelerate,
//   200 ms), and a thin indeterminate bar runs along the viewer's top edge with a small "Affinage des détails"
//   ("Refining the details") label, until nothing is left to load.
// Instantly, and with still dots and bars, when the system asks for reduced motion.
// When the first view is slow, stalled or failing (Christian, 2026-10-24: an iPad Air never got past « Chargement »),
// the card says so in a line under the bar (note), and can offer « Réessayer » (MD3 text button); errors too.
//
// Usage: status.start(), status.refine(), status.done(), status.showError(message, retry), status.note(text, retry)
import { m } from './i18n.js'

const EXIT = { duration: 200, easing: 'cubic-bezier(0.3, 0, 0.8, 0.15)' } // md.sys.motion: short4, emphasized-accelerate
const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

class Loading extends HTMLElement {
  connectedCallback() {
    this.setAttribute('role', 'status')
    // On a card of its own: readable over the dark background as over the light terrain that loads behind it
    this.innerHTML = `
      <div class="loading-card">
        <div class="loading-label">${m.viewer_loading()}<span class="loading-dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></div>
        <div class="loading-bar" role="progressbar" aria-label="${m.viewer_loadingBar()}"><div class="loading-fill"></div></div>
        <p class="loading-note" hidden></p>
        <button class="loading-retry" type="button" hidden>${m.viewer_retry()}</button>
      </div>
      <div class="refining">
        <div class="refining-bar" role="progressbar" aria-label="${m.viewer_refining()}"><div class="loading-fill"></div></div>
        <div class="refining-label">${m.viewer_refining()}</div>
      </div>`
    this.card = this.querySelector('.loading-card')
    this.label = this.querySelector('.loading-label')
    this.refining = this.querySelector('.refining')
    this.noteLine = this.querySelector('.loading-note')
    this.retryButton = this.querySelector('.loading-retry')
    this.retryButton.addEventListener('click', () => this.retry?.())
    this.start()
  }

  /** Still in the first phase (the card): what main.js waits on to call refine() */
  get active() {
    return !this.hidden && !this.classList.contains('error') && !this.classList.contains('refine') && !this.leaving
  }

  /** In either phase, not finished */
  get busy() {
    return !this.hidden && !this.classList.contains('error') && !this.leaving
  }

  start() {
    this.getAnimations({ subtree: true }).forEach((a) => a.cancel())
    this.leaving = false
    this.hidden = false
    this.classList.remove('error', 'refine')
    this.label.firstChild.textContent = m.viewer_loading()
    this.note(null)
  }

  /**
   * A line under the bar while the first view loads (null: none), with « Réessayer » when `retry` is given
   * @param {string | null} text
   * @param {() => void} [retry]
   */
  note(text, retry) {
    if (this.noteLine.textContent !== (text ?? '')) this.noteLine.textContent = text ?? ''
    this.noteLine.hidden = !text
    this.retry = retry
    this.retryButton.hidden = !retry
  }

  /** The first view is drawn: the card goes, the thin bar along the top edge stays until done() */
  refine() {
    if (!this.active) return
    this.classList.add('refine')
    if (still()) return
    this.card.animate([{ opacity: 1 }, { opacity: 0 }], EXIT)
    this.refining.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, easing: 'cubic-bezier(0.05, 0.7, 0.1, 1)' })
  }

  done() {
    if (!this.busy) return
    this.leaving = true
    if (still()) {
      this.hidden = true
      return
    }
    this.animate([{ opacity: 1 }, { opacity: 0 }], EXIT).onfinish = () => {
      if (this.leaving) this.hidden = true
    }
  }

  /**
   * @param {string} message
   * @param {() => void} [retry] - offers « Réessayer »
   */
  showError(message, retry) {
    this.getAnimations({ subtree: true }).forEach((a) => a.cancel())
    this.leaving = false
    this.hidden = false
    this.classList.remove('refine')
    this.classList.add('error')
    this.label.firstChild.textContent = m.viewer_error({ message })
    this.note(null, retry)
  }
}
customElements.define('l21-loading', Loading)
