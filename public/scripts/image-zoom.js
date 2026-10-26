// The lightbox: a click on a figure image of the notebook opens it as large as the screen allows, in a <dialog>, over a
// near-black scrim, with its caption (FIG. NN, as in the page) and a counter; ‹ › (or the arrow keys, or a swipe on a
// touch screen) go to the page's other figures; ✕, Escape or a click beside the image closes it. MD3 icon buttons and
// motion (docs/system-design.md). The open figure is in the address (#fig-03, the page's FIG. 03): a link with it opens
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

    const show = (i) => {
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
    const open = (i) => {
      images = [...document.querySelectorAll(FIGURES)]
      if (!images.length) return
      show(i)
      if (!dialog.open) dialog.showModal()
      dialog.querySelector('.lightbox-close').focus({ preventScroll: true })
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
    dialog.querySelector('.lightbox-close').addEventListener('click', () => dialog.close())
    dialog.querySelector('.lightbox-prev').addEventListener('click', () => show(index - 1))
    dialog.querySelector('.lightbox-next').addEventListener('click', () => show(index + 1))
    // A click beside the image (on the scrim) closes it
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close()
    })
    dialog.addEventListener('keydown', (event) => {
      if (images.length < 2) return
      if (event.key === 'ArrowLeft') show(index - 1)
      else if (event.key === 'ArrowRight') show(index + 1)
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
      if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1))
    })
  }
}
customElements.define('l21-image-zoom', ImageZoom)
const zoom = document.body.appendChild(document.createElement('l21-image-zoom'))
// Client-side navigation (ClientRouter, src/components/Head.astro) replaces <body>: the same element goes into the new one
document.addEventListener('astro:after-swap', () => document.body.append(zoom))
