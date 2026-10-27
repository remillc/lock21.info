// <l21-tooltip>: native Custom Element (docs/guidelines.md), the MD3 plain tooltip of the viewer's buttons
// (docs/system-design.md). One element for the page; any element with data-tooltip gets it: shown after a short hover
// delay (HOVER_DELAY), at once on keyboard focus; hidden when the pointer leaves, on blur, on a click and on Escape.
// The text is read at that moment (data-tooltip), so it follows the language and the button's state (full screen).
// Placed above the button, or below when there is no room, kept inside the window. Touch screens (no hover pointer):
// no tooltip at all, not even on focus (Christian, 2026-10-26: none on a phone; the tour's buttons, focused as they
// change, showed one); the buttons keep their aria-label.
// MD3: inverse surface container, body-small text (12/16), 24 dp high, 8 dp padding, 4 dp corners (extra-small),
// 4 dp from the button; fades in over 150 ms (decelerate) and out over 75 ms (accelerate), MD3's tooltip durations.
import { root } from './dom.js'

const HOVER_DELAY = 500
const GAP = 4

class Tooltip extends HTMLElement {
  connectedCallback() {
    this.id = 'l21-tooltip'
    this.anchor = null
    this.timer = 0
    const hoverable = window.matchMedia('(hover: hover)')
    this.getRootNode().addEventListener('pointerover', (e) => {
      if (!hoverable.matches || e.pointerType === 'touch') return
      const target = e.target.closest?.('[data-tooltip]')
      if (!target || target === this.anchor) return
      clearTimeout(this.timer)
      this.timer = setTimeout(() => this.show(target), HOVER_DELAY)
    })
    this.getRootNode().addEventListener('pointerout', (e) => {
      const target = e.target.closest?.('[data-tooltip]')
      if (target && !target.contains(e.relatedTarget)) this.hide()
    })
    this.getRootNode().addEventListener('focusin', (e) => {
      if (!hoverable.matches) return
      const target = e.target.closest?.('[data-tooltip]')
      if (target?.matches(':focus-visible')) this.show(target)
    })
    this.getRootNode().addEventListener('focusout', () => this.hide())
    this.getRootNode().addEventListener('pointerdown', () => this.hide(), true)
    this.getRootNode().addEventListener('keydown', (e) => {
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
    // The tooltip role only while shown: empty, it would have no name (accessibility audit, 2026-10-26)
    this.setAttribute('role', 'tooltip')
    anchor.setAttribute('aria-describedby', this.id)
    this.dataset.shown = 'true'
    const box = anchor.getBoundingClientRect()
    const frame = this.parentElement.getBoundingClientRect()
    const own = this.getBoundingClientRect()
    const above = box.top - GAP - own.height
    const top = above >= frame.top + GAP ? above : box.bottom + GAP
    const left = Math.min(Math.max(frame.left + GAP, box.left + box.width / 2 - own.width / 2), frame.right - own.width - GAP)
    // (placed in the viewer's frame, its containing block: the window's coordinates less the frame's corner)
    this.style.transform = `translate(${Math.round(left - frame.left)}px, ${Math.round(top - frame.top)}px)`
  }

  hide() {
    clearTimeout(this.timer)
    this.anchor?.removeAttribute('aria-describedby')
    this.anchor = null
    this.removeAttribute('role')
    delete this.dataset.shown
  }
}

customElements.define('l21-tooltip', Tooltip)
root.querySelector('.viewer-frame').append(document.createElement('l21-tooltip'))
