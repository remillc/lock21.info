// <l21-tooltip>: native Custom Element (docs/guidelines.md), the MD3 plain tooltip of the viewer's buttons
// (docs/system-design.md). One element for the page; any element with data-tooltip gets it: shown after a short hover
// delay (HOVER_DELAY), at once on keyboard focus; hidden when the pointer leaves, on blur, on a click and on Escape.
// The text is read at that moment (data-tooltip), so it follows the language and the button's state (full screen).
// Placed above the button, or below when there is no room, kept inside the window. Touch screens (no hover pointer):
// no tooltip at all, not even on focus (Christian, 2026-10-26: none on a phone; the tour's buttons, focused as they
// change, showed one); the buttons keep their aria-label.
// MD3: inverse surface container, body-small text (12/16), 24 dp high, 8 dp padding, 4 dp corners (extra-small),
// 4 dp from the button; fades in over 150 ms (decelerate) and out over 75 ms (accelerate), MD3's tooltip durations.
const HOVER_DELAY = 500
const GAP = 4

class Tooltip extends HTMLElement {
  connectedCallback() {
    this.setAttribute('role', 'tooltip')
    this.id = 'l21-tooltip'
    this.anchor = null
    this.timer = 0
    const hoverable = window.matchMedia('(hover: hover)')
    document.addEventListener('pointerover', (e) => {
      if (!hoverable.matches || e.pointerType === 'touch') return
      const target = e.target.closest?.('[data-tooltip]')
      if (!target || target === this.anchor) return
      clearTimeout(this.timer)
      this.timer = setTimeout(() => this.show(target), HOVER_DELAY)
    })
    document.addEventListener('pointerout', (e) => {
      const target = e.target.closest?.('[data-tooltip]')
      if (target && !target.contains(e.relatedTarget)) this.hide()
    })
    document.addEventListener('focusin', (e) => {
      if (!hoverable.matches) return
      const target = e.target.closest?.('[data-tooltip]')
      if (target?.matches(':focus-visible')) this.show(target)
    })
    document.addEventListener('focusout', () => this.hide())
    document.addEventListener('pointerdown', () => this.hide(), true)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hide()
    })
  }

  /** @param {HTMLElement} anchor */
  show(anchor) {
    clearTimeout(this.timer)
    if (!window.matchMedia('(hover: hover)').matches) return
    const text = anchor.dataset.tooltip
    if (!text || anchor.hidden) return
    this.anchor = anchor
    this.textContent = text
    anchor.setAttribute('aria-describedby', this.id)
    this.dataset.shown = 'true'
    const box = anchor.getBoundingClientRect()
    const own = this.getBoundingClientRect()
    const above = box.top - GAP - own.height
    const top = above >= GAP ? above : box.bottom + GAP
    const left = Math.min(Math.max(GAP, box.left + box.width / 2 - own.width / 2), window.innerWidth - own.width - GAP)
    this.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`
  }

  hide() {
    clearTimeout(this.timer)
    this.anchor?.removeAttribute('aria-describedby')
    this.anchor = null
    delete this.dataset.shown
  }
}

customElements.define('l21-tooltip', Tooltip)
document.body.append(document.createElement('l21-tooltip'))
