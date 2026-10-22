// The two languages of the site: French at the root, English under /en/ (Starlight locales, astro.config.mjs).
// Components that carry their own text (home page, model page, header, footer) pick it with these helpers.

/** @typedef {'fr' | 'en'} Lang */

/**
 * The page's language, from Starlight's route data
 * @param {{ starlightRoute?: { lang?: string } }} locals
 * @returns {Lang}
 */
export function pageLang(locals) {
  return locals.starlightRoute?.lang?.startsWith('en') ? 'en' : 'fr'
}

/**
 * A site path in the page's language: /modele stays /modele in French, becomes /en/modele in English (/ becomes /en)
 * @param {string} path
 * @param {Lang} lang
 * @returns {string}
 */
export function localPath(path, lang) {
  if (lang !== 'en' || !path.startsWith('/') || path === '/en' || path.startsWith('/en/')) return path
  return path === '/' ? '/en' : `/en${path}`
}

/**
 * Numbers and dates in the page's language
 * @param {Lang} lang
 */
export const locale = (lang) => (lang === 'en' ? 'en-CA' : 'fr-CA')
