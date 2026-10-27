// The viewer's language (French or English) and its texts. French is the source language, as on the site.
// The language: the page's (/modele or /en/modele, its <html lang>; the viewer is part of the page since TODO #80).
//
// Usage: m.viewer_reset(), m.viewer_error({ message }).

import { m } from '../paraglide/messages.js'
import { overwriteGetLocale } from '../paraglide/runtime.js'

/** @typedef {'fr' | 'en'} Lang */

/** @type {Lang} */
export const lang = document.documentElement.lang.toLowerCase().startsWith('en') ? 'en' : 'fr'

// The texts are Paraglide JS messages, the site's (messages/site/fr.json, en.json, keys viewer_…; compiled by the
// Vite plugin into src/paraglide/, gitignored): every message in the viewer's language. Import m from here, not from
// ../paraglide: this module then runs first, and the language is set before any message is read.
overwriteGetLocale(() => lang)
export { m }
