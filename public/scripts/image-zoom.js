// The lightbox: a click on a figure image of the notebook opens it as large as the screen allows, in a <dialog>, over a
// near-black scrim, with its caption (FIG. NN, as in the page) and a counter; ‹ › (or the arrow keys, or a swipe on a
// touch screen) go to the page's other figures; ✕, Escape or a click beside the image closes it. MD3 icon buttons and
// motion (docs/system-design.md): the image grows from its thumbnail and shrinks back to it, the figures slide along
// a shared axis. The widest of the image's sizes is shown, and a click zooms to its own pixels when it has more than
// the screen shows. The open figure is in the address (#fig-03, the page's FIG. 03): a link with it opens
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
      unzoom()
      big.src = widest(img)
      big.alt = img.alt
      // The page's caption, after its figure number (the same FIG. NN as the CSS counter: figures in document order)
      const own = img.closest('figure')?.querySelector('figcaption')
      caption.innerHTML = `<span class="lightbox-fig">FIG. ${String(index + 1).padStart(2, '0')}</span>${own ? own.innerHTML : ''}`
      count.textContent = images.length > 1 ? `${index + 1} / ${images.length}` : ''
      dialog.classList.toggle('single', images.length < 2)
      // The figure in the address: its id if it has one (<figure id="lampes">), else #fig-03; replacing the last one
      // (no new history entry), the router's state kept
      const id = img.closest('figure')?.id || `fig-${String(index + 1).padStart(2, '0')}`
      history.replaceState(history.state, '', `${location.pathname}${location.search}#${id}`)
    }
    // The next and previous figures, widest size, loaded and decoded ahead (the page's images are lazy): changing
    // figure then waits for no download (Christian, 2026-10-26)
    const preloaded = new Map()
    const preloadAround = () => {
      if (images.length < 2) return
      for (const step of [1, -1]) {
        const url = widest(images[(index + step + images.length) % images.length])
        if (preloaded.has(url)) continue
        const ahead = new Image()
        ahead.decoding = 'async'
        ahead.src = url
        ahead.decode().catch(() => {})
        preloaded.set(url, ahead)
      }
    }
    const ready = () => big.decode().catch(() => {}).then(() => dialog.classList.toggle('zoomable', zoomable()))
    /** The widest of the image's sizes (srcset, Astro's responsive images): the lightbox shows as many pixels as it has */
    const widest = (img) => {
      let best = img.currentSrc || img.src
      let bestWidth = 0
      for (const candidate of (img.getAttribute('srcset') ?? '').split(',')) {
        const [url, size] = candidate.trim().split(/\s+/)
        const width = Number.parseInt(size ?? '', 10)
        if (url && width > bestWidth) [best, bestWidth] = [url, width]
      }
      return best
    }

    // Zoom: when the image has more pixels than the screen shows, a click shows it at its own size (1:1) around the
    // point clicked, the figure scrolls (a drag with the mouse, a finger on a touch screen), a click without dragging
    // shows it whole again. Never larger than its own pixels
    const zoomable = () => big.naturalWidth > big.clientWidth * 1.15 || big.naturalHeight > big.clientHeight * 1.15
    // The change of size animated on the spot (MD3: an element that stays on screen and changes size, the emphasized
    // curve, 400 ms): the image starts from where and how big it was, and grows or shrinks to its new place
    const EMPHASIZED = 'cubic-bezier(0.2, 0, 0, 1)'
    const resize = (before) => {
      if (reduce.matches) return
      const after = big.getBoundingClientRect()
      if (!after.width) return
      const from = `translate(${before.left - after.left}px, ${before.top - after.top}px) scale(${before.width / after.width})`
      big.animate([{ transform: from, transformOrigin: '0 0' }, { transform: 'none', transformOrigin: '0 0' }], { duration: 400, easing: EMPHASIZED })
    }
    /** The whole image again; animate: true when the visitor asks for it (a click), at once otherwise */
    const unzoom = (animate = false) => {
      if (!dialog.classList.contains('zoomed')) return
      const before = big.getBoundingClientRect()
      dialog.classList.remove('zoomed')
      if (animate) resize(before)
    }
    const zoomAt = (event) => {
      const before = big.getBoundingClientRect()
      const fx = (event.clientX - before.left) / before.width
      const fy = (event.clientY - before.top) / before.height
      dialog.classList.add('zoomed')
      figure.scrollLeft = fx * big.naturalWidth - figure.clientWidth / 2
      figure.scrollTop = fy * big.naturalHeight - figure.clientHeight / 2
      resize(before)
    }
    let drag = null
    big.addEventListener('pointerdown', (event) => {
      drag = { x: event.clientX, y: event.clientY, left: figure.scrollLeft, top: figure.scrollTop, moved: false, mouse: event.pointerType === 'mouse' }
    })
    big.addEventListener('pointermove', (event) => {
      if (!drag || !dialog.classList.contains('zoomed')) return
      const dx = event.clientX - drag.x
      const dy = event.clientY - drag.y
      if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true
      if (drag.mouse) {
        figure.scrollLeft = drag.left - dx
        figure.scrollTop = drag.top - dy
      }
    })
    big.addEventListener('click', (event) => {
      const moved = drag?.moved
      drag = null
      if (moved) return
      if (dialog.classList.contains('zoomed')) unzoom(true)
      else if (dialog.classList.contains('zoomable')) zoomAt(event)
    })
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
      preloadAround()
      busy = true
      big.style.visibility = 'hidden'
      // The scrim from 0 to 300 ms, the image, its caption and buttons from 100 to 400 ms (Christian, 2026-10-26)
      const timing = { duration: 300, easing: DECELERATE }
      const opened = performance.now()
      dialog.showModal()
      // The scrim fades in from the first frame (started before the image is decoded: otherwise a frame of full black,
      // a flash)
      if (!reduce.matches) {
        // A steady fade for the scrim (MD3's decelerate curve rises too fast at first: 40 % black in one frame)
        dialog.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'linear', pseudoElement: '::backdrop' })
        for (const el of [caption, ...chrome()]) el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 100, easing: 'linear', fill: 'backwards' })
      }
      dialog.querySelector('.lightbox-close').focus({ preventScroll: true })
      await ready()
      big.style.visibility = ''
      // (its start counted from the opening: the decoding may already have taken part of the 100 ms)
      if (!reduce.matches) {
        const delay = Math.max(0, 100 - (performance.now() - opened))
        big.animate([{ transform: overThumbnail(), opacity: 0.6 }, { transform: 'none', opacity: 1 }], { ...timing, delay, fill: 'backwards' })
      }
      busy = false
    }
    const close = async () => {
      if (!dialog.open || busy) return
      unzoom()
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
        unzoom()
        motions.forEach((motion) => motion.cancel())
        busy = false
      } else dialog.close()
    }
    /** The next (+1) or previous (-1) figure: out to one side, in from the other */
    const go = async (step) => {
      if (busy || images.length < 2) return
      if (reduce.matches) {
        fill(index + step)
        return preloadAround()
      }
      busy = true
      const shift = 30 * step
      const out = figure.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-shift}px)` }],
        { duration: 90, easing: ACCELERATE, fill: 'forwards' })
      await out.finished.catch(() => {})
      fill(index + step)
      preloadAround()
      await ready()
      figure.animate([{ opacity: 0, transform: `translateX(${shift}px)` }, { opacity: 1, transform: 'none' }], { duration: 210, easing: DECELERATE })
      out.cancel()
      busy = false
    }
    // Closed: the figure's hash leaves the address
    dialog.addEventListener('close', () => {
      if (figureAt(location.hash) >= 0) history.replaceState(history.state, '', location.pathname + location.search)
    })
    /** The figure a hash names, as an index among the page's figure images (-1: none): #fig-03, or a figure's id */
    const figureAt = (hash) => {
      const all = [...document.querySelectorAll(FIGURES)]
      const number = /^#fig-(\d+)$/.exec(hash)
      if (number) return Number(number[1]) <= all.length ? Number(number[1]) - 1 : -1
      if (!/^#[\w-]+$/.test(hash)) return -1
      return all.findIndex((img) => img.closest('figure')?.id === hash.slice(1))
    }
    // A page opened with #fig-03 or a figure's id (a bookmark, a shared link): the lightbox on that figure
    const fromHash = () => {
      const i = figureAt(location.hash)
      if (i >= 0 && !dialog.open) open(i)
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
      if (startX === null || images.length < 2 || dialog.classList.contains('zoomed')) return
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
