// The viewer's language (French or English) and its texts. French is the source language, as on the site.
// The language: embedded in a page of the site (/modele or /en/modele, same origin), that page's <html lang>; otherwise
// ?lang=fr|en in the address (read before main.js tidies the address); otherwise the browser's language.
//
// Usage: m.reset(), m.error({ message }).

import { m } from './paraglide/messages.js'
import { overwriteGetLocale } from './paraglide/runtime.js'

/** @typedef {'fr' | 'en'} Lang */

/** @param {string | null | undefined} value @returns {Lang | null} */
function known(value) {
  const code = (value ?? '').toLowerCase()
  if (code.startsWith('fr')) return 'fr'
  if (code.startsWith('en')) return 'en'
  return null
}

/** @returns {Lang} */
function detect() {
  if (window.parent !== window) {
    try {
      const fromPage = known(window.parent.document.documentElement.lang)
      if (fromPage) return fromPage
    } catch {
      // Embedded by another origin: its document can't be read
    }
  }
  return known(new URLSearchParams(location.search).get('lang')) ?? (known(navigator.language) === 'fr' ? 'fr' : 'en')
}

/** @type {Lang} */
export const lang = detect()
document.documentElement.lang = lang

// The texts are Paraglide JS messages (messages/viewer/fr.json, en.json; compiled by the Vite plugin into
// src/paraglide/, gitignored): every message in the viewer's language. Import m from here, not from ./paraglide: this
// module then runs first, and the language is set before any message is read.
overwriteGetLocale(() => lang)
export { m }

/** The site's home page in the viewer's language */
export const homePath = lang === 'en' ? '/en/' : '/'
