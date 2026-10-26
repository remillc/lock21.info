// The lightbox: a click on a figure image of the notebook opens it as large as the screen allows, in a <dialog>, over a
// near-black scrim, with its caption (FIG. NN, as in the page) and a counter; ‹ › (or the arrow keys, or a swipe on a
// touch screen) go to the page's other figures; ✕, Escape or a click beside the image closes it. MD3 icon buttons and
// motion (docs/system-design.md): the image grows from its thumbnail and shrinks back to it, the figures slide along
// a shared axis. The open figure is in the address (#fig-03, the page's FIG. 03): a link with it opens
// the lightbox on that figure. Native Custom Element (see docs/guidelines.md), added once to the page.
const FIGURES = '.sl-markdown-content figure img'

// Material Symbols Rounded (24 dp): close, chevron_left, chevron_right
const ICON = {
  close: 'M12 13.4l-4.9 4.9q-.275.275-.7.275t-.7-.275q-.275-.275-.275-.7t.275-.7l4.9-4.9-4.9-4.9q-.275-.275-.275-.7t.275-.7q.275-.275.7-.275t.7.275l4.9 4.9 4.9-4.9q.275-.275.7-.275t.7.275q.275.275.275.7t-.275.7L13.4 12l4.9 4.9q.275.275.275.7t-.275.7q-.275.275-.7.275t-.7-.275L12 13.4Z',
  prev: 'M10.8 12l3.9 3.9q.275.275.275.7t-.275.7q-.275.275-.7.275t-.7-.275l-4.6-4.6q-.15-.15-.212-.325T8.425 12q0-.2.063-.375T8.7 11.3l4.6-4.6q.275-.275.7-.275t.7.275q.275.275.275.7t-.275.7L10.8 12Z',
  next: 'M12.6 12L8.7 8.1q-.275-.275-.275-.7t.275-.7q.275-.275.7-.275t.7.275l4.6 4.6q.15.15.213.325t.062.375q0 .2-.062.375t-.213.325l-4.6 4.6q-.275.275-.7.275t-.7-.275q-.275-.275-.275-.7t.275-.7l3.9-3.9Z',
}
const svg = (d) => `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="${d}" fill="currentColor"/></svg>`

class ImageZoom extends HTMLElement {
  connectedCallback() {
    // Moved into the new <body> after a client-side navigation: already set up
    if (this.dialog) return
    const en = document.documentElement.lang === 'en'
    const label = en
      ? { close: 'Close', prev: 'Previous image', next: 'Next image', view: 'Enlarged image' }
      : { close: 'Fermer', prev: 'Image précédente', next: 'Image suivante', view: 'Image agrandie' }
    this.innerHTML = `<dialog class="lightbox" aria-label="${label.view}">
  <figure class="lightbox-figure"><img alt="" /><figcaption></figcaption></figure>
  <p class="lightbox-count" aria-live="polite"></p>
  <button type="button" class="lightbox-button lightbox-close" aria-label="${label.close}">${svg(ICON.close)}</button>
  <button type="button" class="lightbox-button lightbox-prev" aria-label="${label.prev}">${svg(ICON.prev)}</button>
  <button type="button" class="lightbox-button lightbox-next" aria-label="${label.next}">${svg(ICON.next)}</button>
</dialog>`
    const dialog = (this.dialog = this.querySelector('dialog'))
    const big = dialog.querySelector('img')
    const caption = dialog.querySelector('figcaption')
    const count = dialog.querySelector('.lightbox-count')
    /** @type {HTMLImageElement[]} */
    let images = []
    let index = 0

    const figure = dialog.querySelector('.lightbox-figure')
    const chrome = () => dialog.querySelectorAll('.lightbox-button, .lightbox-count')
    // MD3 motion (docs/system-design.md): enter 400 ms emphasized decelerate, exit 200 ms emphasized accelerate; the
    // change of figure as a shared axis X (out 90 ms, in 210 ms); nothing moves when the system asks for less motion
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const DECELERATE = 'cubic-bezier(0.05, 0.7, 0.1, 1)'
    const ACCELERATE = 'cubic-bezier(0.3, 0, 0.8, 0.15)'
    let busy = false

    /** The figure's content, at once */
    const fill = (i) => {
      index = (i + images.length) % images.length
      const img = images[index]
      big.src = img.currentSrc || img.src
      big.alt = img.alt
      // The page's caption, after its figure number (the same FIG. NN as the CSS counter: figures in document order)
      const own = img.closest('figure')?.querySelector('figcaption')
      caption.innerHTML = `<span class="lightbox-fig">FIG. ${String(index + 1).padStart(2, '0')}</span>${own ? own.innerHTML : ''}`
      count.textContent = images.length > 1 ? `${index + 1} / ${images.length}` : ''
      dialog.classList.toggle('single', images.length < 2)
      // The figure in the address, replacing the last one (no new history entry); the router's state kept
      history.replaceState(history.state, '', `${location.pathname}${location.search}#fig-${String(index + 1).padStart(2, '0')}`)
    }
    const ready = () => big.decode().catch(() => {})
    /** The transform that puts the large image over its thumbnail in the page (MD3 container transform) */
    const overThumbnail = () => {
      const a = images[index]?.getBoundingClientRect()
      const b = big.getBoundingClientRect()
      if (!a || !a.width || !b.width) return 'scale(0.92)'
      const dx = a.left + a.width / 2 - (b.left + b.width / 2)
      const dy = a.top + a.height / 2 - (b.top + b.height / 2)
      return `translate(${dx}px, ${dy}px) scale(${a.width / b.width})`
    }

    const open = async (i) => {
      images = [...document.querySelectorAll(FIGURES)]
      if (!images.length || dialog.open) return
      fill(i)
      busy = true
      big.style.visibility = 'hidden'
      const timing = { duration: 400, easing: DECELERATE }
      dialog.showModal()
      // The scrim fades in from the first frame (started before the image is decoded: otherwise a frame of full black,
      // a flash), the caption and the buttons a little after
      if (!reduce.matches) {
        // A steady fade for the scrim (MD3's decelerate curve rises too fast at first: 40 % black in one frame)
        dialog.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'linear', pseudoElement: '::backdrop' })
        for (const el of [caption, ...chrome()]) el.animate([{ opacity: 0 }, { opacity: 1 }], { ...timing, delay: 100, fill: 'backwards' })
      }
      dialog.querySelector('.lightbox-close').focus({ preventScroll: true })
      await ready()
      big.style.visibility = ''
      if (!reduce.matches) big.animate([{ transform: overThumbnail(), opacity: 0.6 }, { transform: 'none', opacity: 1 }], timing)
      busy = false
    }
    const close = async () => {
      if (!dialog.open || busy) return
      if (!reduce.matches) {
        busy = true
        const timing = { duration: 200, easing: ACCELERATE, fill: 'forwards' }
        const motions = [
          big.animate([{ transform: 'none' }, { transform: overThumbnail() }], timing),
          dialog.animate([{ opacity: 1 }, { opacity: 0 }], { ...timing, pseudoElement: '::backdrop' }),
          ...[caption, ...chrome()].map((el) => el.animate([{ opacity: 1 }, { opacity: 0 }], { ...timing, duration: 100 })),
        ]
        await Promise.all(motions.map((motion) => motion.finished.catch(() => {})))
        dialog.close()
        motions.forEach((motion) => motion.cancel())
        busy = false
      } else dialog.close()
    }
    /** The next (+1) or previous (-1) figure: out to one side, in from the other */
    const go = async (step) => {
      if (busy || images.length < 2) return
      if (reduce.matches) return fill(index + step)
      busy = true
      const shift = 30 * step
      const out = figure.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-shift}px)` }],
        { duration: 90, easing: ACCELERATE, fill: 'forwards' })
      await out.finished.catch(() => {})
      fill(index + step)
      await ready()
      figure.animate([{ opacity: 0, transform: `translateX(${shift}px)` }, { opacity: 1, transform: 'none' }], { duration: 210, easing: DECELERATE })
      out.cancel()
      busy = false
    }
    // Closed: the figure's hash leaves the address
    dialog.addEventListener('close', () => {
      if (/^#fig-\d+$/.test(location.hash)) history.replaceState(history.state, '', location.pathname + location.search)
    })
    // A page opened with #fig-03 (a bookmark, a shared link): the lightbox on that figure
    const fromHash = () => {
      const match = /^#fig-(\d+)$/.exec(location.hash)
      if (match && !dialog.open) open(Number(match[1]) - 1)
    }
    if (document.readyState === 'complete') fromHash()
    else window.addEventListener('load', fromHash, { once: true })
    document.addEventListener('astro:page-load', fromHash)
    window.addEventListener('hashchange', fromHash)

    document.addEventListener('click', (event) => {
      const img = event.target.closest?.(FIGURES)
      if (!img) return
      open([...document.querySelectorAll(FIGURES)].indexOf(img))
    })
    dialog.querySelector('.lightbox-close').addEventListener('click', close)
    dialog.querySelector('.lightbox-prev').addEventListener('click', () => go(-1))
    dialog.querySelector('.lightbox-next').addEventListener('click', () => go(1))
    // Escape: the same closing motion as ✕
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault()
      close()
    })
    // A click beside the image (on the scrim) closes it
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) close()
    })
    dialog.addEventListener('keydown', (event) => {
      if (images.length < 2) return
      if (event.key === 'ArrowLeft') go(-1)
      else if (event.key === 'ArrowRight') go(1)
      else return
      event.preventDefault()
    })
    // A horizontal swipe on a touch screen: the next or previous figure
    let startX = null
    dialog.addEventListener('pointerdown', (event) => {
      startX = event.pointerType === 'touch' ? event.clientX : null
    })
    dialog.addEventListener('pointerup', (event) => {
      if (startX === null || images.length < 2) return
      const dx = event.clientX - startX
      startX = null
      if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
    })
  }
}
customElements.define('l21-image-zoom', ImageZoom)
const zoom = document.body.appendChild(document.createElement('l21-image-zoom'))
// Client-side navigation (ClientRouter, src/components/Head.astro) replaces <body>: the same element goes into the new one
document.addEventListener('astro:after-swap', () => document.body.append(zoom))
