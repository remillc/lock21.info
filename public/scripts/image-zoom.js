// Image zoom: a click on a figure image of the notebook opens it full size in a <dialog>; a click or Escape
// closes it. Native Custom Element (see GUIDELINES.md), added once to the page.
class ImageZoom extends HTMLElement {
  connectedCallback() {
    this.innerHTML = '<dialog class="image-zoom"><img alt="" /></dialog>'
    const dialog = this.querySelector('dialog')
    const big = dialog.querySelector('img')
    dialog.addEventListener('click', () => dialog.close())
    document.addEventListener('click', (event) => {
      const img = event.target.closest('.sl-markdown-content figure img')
      if (!img) return
      big.src = img.currentSrc || img.src
      big.alt = img.alt
      dialog.showModal()
    })
  }
}
customElements.define('l21-image-zoom', ImageZoom)
document.body.append(document.createElement('l21-image-zoom'))
