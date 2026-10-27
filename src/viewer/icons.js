// The viewer's icons, by name: Material Symbols Rounded from Iconify's set (@iconify-json/material-symbols, a dev
// dependency: npm update follows Google's drawings), compiled at build by unplugin-icons (vite.config.js) into SVG
// strings; only the icons imported here are bundled. The site uses the same names (astro-icon, astro.config.mjs).
// TODO #74 (2026-10-26): the drawings were pasted inline before, with no link to their library.
//
// In index.html an icon is a placeholder, <svg data-icon="home-outline-rounded" width="24" height="24" …></svg>
// (its class, size and aria-hidden kept), filled by fillIcons() at start; an <img data-icon … data-color="#…"> gets the
// icon as its picture (the AR link: AR Quick Look needs an image as the link's first child). In scripts: icon(name, size).
import arrowBack from '~icons/material-symbols/arrow-back-rounded?raw'
import arrowForward from '~icons/material-symbols/arrow-forward-rounded?raw'
import check from '~icons/material-symbols/check-rounded?raw'
import close from '~icons/material-symbols/close-rounded?raw'
import flashlightOff from '~icons/material-symbols/flashlight-off-outline-rounded?raw'
import flashlightOn from '~icons/material-symbols/flashlight-on-outline-rounded?raw'
import fullscreen from '~icons/material-symbols/fullscreen-rounded?raw'
import fullscreenExit from '~icons/material-symbols/fullscreen-exit-rounded?raw'
import help from '~icons/material-symbols/help-outline-rounded?raw'
import home from '~icons/material-symbols/home-outline-rounded?raw'
import replay from '~icons/material-symbols/replay-rounded?raw'
import scubaDiving from '~icons/material-symbols/scuba-diving-rounded?raw'
import settings from '~icons/material-symbols/settings-outline-rounded?raw'
import tour from '~icons/material-symbols/tour-outline-rounded?raw'
import viewInAr from '~icons/material-symbols/view-in-ar-outline-rounded?raw'

const ICONS = {
  'arrow-back-rounded': arrowBack,
  'arrow-forward-rounded': arrowForward,
  'check-rounded': check,
  'close-rounded': close,
  'flashlight-off-outline-rounded': flashlightOff,
  'flashlight-on-outline-rounded': flashlightOn,
  'fullscreen-rounded': fullscreen,
  'fullscreen-exit-rounded': fullscreenExit,
  'help-outline-rounded': help,
  'home-outline-rounded': home,
  'replay-rounded': replay,
  'scuba-diving-rounded': scubaDiving,
  'settings-outline-rounded': settings,
  'tour-outline-rounded': tour,
  'view-in-ar-outline-rounded': viewInAr,
}

/** The icon's inner drawing and viewBox @param {string} name */
function parts(name) {
  const svg = ICONS[name]
  if (!svg) throw new Error(`icon ${name}: not in src/viewer/icons.js`)
  return {
    viewBox: svg.match(/viewBox="([^"]+)"/)[1],
    body: svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, ''),
  }
}

/**
 * An icon as SVG markup, for innerHTML
 * @param {string} name - its Material Symbols Rounded name, as imported above
 * @param {number} [size] - px (24, MD3's icon size)
 */
export function icon(name, size = 24) {
  const { viewBox, body } = parts(name)
  return `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="${viewBox}" fill="currentColor">${body}</svg>`
}

/** Fills the page's icon placeholders ([data-icon]) @param {ParentNode} [root] */
export function fillIcons(root = document) {
  for (const element of root.querySelectorAll('[data-icon]')) {
    const { viewBox, body } = parts(element.dataset.icon)
    if (element.tagName.toLowerCase() === 'img') {
      const color = element.dataset.color ?? '#000'
      const size = element.getAttribute('width') ?? '24'
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${viewBox}" fill="${color}">${body.replaceAll('currentColor', color)}</svg>`
      element.src = `data:image/svg+xml,${encodeURIComponent(svg)}`
    } else {
      element.setAttribute('viewBox', viewBox)
      element.setAttribute('fill', 'currentColor')
      element.innerHTML = body
    }
  }
}
