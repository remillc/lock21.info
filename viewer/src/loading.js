// <l21-loading>: the viewer's loading indicator (native Custom Element, GUIDELINES.md), centred over the model.
// "Chargement" ("Loading") with three dots that appear one after the other, then go and start again; under it, an MD3 linear
// progress indicator (determinate) with the percentage of tiles loaded. The value never goes back (new tiles join the
// queue as the camera settles). When the first view is complete, it leaves with the MD3 exit motion (fade,
// emphasized-accelerate, 200 ms); instantly, and with still dots, when the system asks for reduced motion.
//
// Usage: status.start(), status.progress = 0..1, status.done(), status.showError(message)
import { t } from './i18n.js'

const EXIT = { duration: 200, easing: 'cubic-bezier(0.3, 0, 0.8, 0.15)' } // md.sys.motion: short4, emphasized-accelerate

class Loading extends HTMLElement {
  connectedCallback() {
    this.setAttribute('role', 'status')
    // On a card of its own: readable over the dark background as over the light terrain that loads behind it
    this.innerHTML = `
      <div class="loading-card">
      <div class="loading-label">${t('loading')}<span class="loading-dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span>
        <span class="loading-percent"></span></div>
      <div class="loading-bar" role="progressbar" aria-label="${t('loadingBar')}" aria-valuemin="0" aria-valuemax="100">
        <div class="loading-fill"></div>
      </div>
      </div>`
    this.label = this.querySelector('.loading-label')
    this.percent = this.querySelector('.loading-percent')
    this.bar = this.querySelector('.loading-bar')
    this.fill = this.querySelector('.loading-fill')
    this.start()
  }

  get active() {
    return !this.hidden && !this.classList.contains('error') && !this.leaving
  }

  start() {
    this.getAnimations().forEach((a) => a.cancel())
    this.leaving = false
    this.hidden = false
    this.classList.remove('error')
    this.label.firstChild.textContent = t('loading')
    this.value = 0
    this.render()
  }

  set progress(value) {
    // Never backwards
    const next = Math.min(1, Math.max(this.value, value))
    if (Math.round(next * 100) === Math.round(this.value * 100)) return
    this.value = next
    this.render()
  }

  render() {
    const pct = Math.round(this.value * 100)
    this.percent.textContent = t('percent', { n: pct })
    this.fill.style.transform = `scaleX(${this.value})`
    this.bar.setAttribute('aria-valuenow', String(pct))
  }

  done() {
    if (!this.active) return
    this.progress = 1
    this.leaving = true
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.hidden = true
      return
    }
    this.animate([{ opacity: 1 }, { opacity: 0 }], EXIT).onfinish = () => {
      if (this.leaving) this.hidden = true
    }
  }

  showError(message) {
    this.getAnimations().forEach((a) => a.cancel())
    this.leaving = false
    this.hidden = false
    this.classList.add('error')
    this.label.firstChild.textContent = t('error', { message })
  }
}
customElements.define('l21-loading', Loading)
