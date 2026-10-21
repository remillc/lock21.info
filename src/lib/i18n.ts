// The two languages of the site: French at the root, English under /en/ (Starlight locales, astro.config.mjs).
// Components that carry their own text (home page, model page, header, footer) pick it with these helpers.

export type Lang = 'fr' | 'en'

/** The page's language, from Starlight's route data */
export function pageLang(locals: { starlightRoute?: { lang?: string } }): Lang {
  return locals.starlightRoute?.lang?.startsWith('en') ? 'en' : 'fr'
}

/** A site path in the page's language: /modele/ stays /modele/ in French, becomes /en/modele/ in English */
export function localPath(path: string, lang: Lang): string {
  return lang === 'en' && path.startsWith('/') && !path.startsWith('/en/') ? `/en${path}` : path
}

/** Numbers and dates in the page's language */
export const locale = (lang: Lang) => (lang === 'en' ? 'en-CA' : 'fr-CA')
