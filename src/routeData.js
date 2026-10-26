// Starlight route middleware (astro.config.mjs, routeMiddleware): what the <head> says to search engines and to the
// sites a link is shared on (SEO audit, docs/audits/seo-2026-10-26.md):
// - og:locale as a region code (fr_CA, en_CA), with the other language as og:locale:alternate;
// - a share image (public/images/og-lock21.jpg, 1200 x 630, cropped from the home page's render of zone 12);
// - structured data (JSON-LD): the site and its author on the two home pages, the 3D model on the model page.
import { defineRouteMiddleware } from '@astrojs/starlight/route-data'
import { site } from './data/site.js'

const ORIGIN = 'https://lock21.info'
const AUTHOR = {
  '@type': 'Person',
  name: 'Christian Rémillard',
  sameAs: ['https://github.com/remillc', 'https://sketchfab.com/christian.remillard'],
}
const text = {
  fr: {
    imageAlt: "Le rendu d'une zone de l'écluse 21 sous l'eau : un pilier de pierre et les vannes du déversoir",
    siteName: 'Écluse 21',
    otherName: 'Lock 21',
    model: 'Modèle 3D de l’écluse 21',
    modelDescription: 'L’écluse 21 de Dickinson’s Landing, submergée depuis 1958 dans le Saint-Laurent, relevée zone par zone en photogrammétrie sous-marine.',
  },
  en: {
    imageAlt: 'A render of a zone of Lock 21 underwater: a stone pier and the spillway gates',
    siteName: 'Lock 21',
    otherName: 'Écluse 21',
    model: '3D model of Lock 21',
    modelDescription: 'Lock 21 at Dickinson’s Landing, under the St. Lawrence since 1958, surveyed zone by zone with underwater photogrammetry.',
  },
}

/** @param {any[]} head @param {string} key @param {string} value */
const find = (head, key, value) => head.find((entry) => entry.tag === 'meta' && entry.attrs?.[key] === value)

export const onRequest = defineRouteMiddleware((context) => {
  const route = context.locals.starlightRoute
  const lang = route.lang === 'en' ? 'en' : 'fr'
  const t = text[lang]
  const head = route.head
  const path = context.url.pathname.replace(/\/$/, '') || '/'

  const locale = find(head, 'property', 'og:locale')
  if (locale) locale.attrs.content = lang === 'en' ? 'en_CA' : 'fr_CA'
  head.push({ tag: 'meta', attrs: { property: 'og:locale:alternate', content: lang === 'en' ? 'fr_CA' : 'en_CA' } })

  const image = `${ORIGIN}/images/og-lock21.jpg`
  head.push(
    { tag: 'meta', attrs: { property: 'og:image', content: image } },
    { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
    { tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
    { tag: 'meta', attrs: { property: 'og:image:alt', content: t.imageAlt } },
    { tag: 'meta', attrs: { name: 'twitter:image', content: image } },
  )

  /** @type {Record<string, any> | null} */
  let data = null
  if (path === '/' || path === '/en') {
    data = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: t.siteName,
      alternateName: t.otherName,
      url: lang === 'en' ? `${ORIGIN}/en/` : `${ORIGIN}/`,
      inLanguage: lang,
      description: route.entry.data.description,
      author: AUTHOR,
    }
  } else if (path === '/modele' || path === '/en/modele') {
    data = {
      '@context': 'https://schema.org',
      '@type': '3DModel',
      name: t.model,
      description: t.modelDescription,
      url: `${ORIGIN}${path}`,
      inLanguage: lang,
      image,
      creator: AUTHOR,
      license: 'https://creativecommons.org/licenses/by/4.0/',
      encoding: [{ '@type': 'MediaObject', contentUrl: site.downloads.glb, encodingFormat: 'model/gltf-binary' }],
      contentLocation: {
        '@type': 'Place',
        name: lang === 'en' ? "Lock 21, Dickinson's Landing, Ontario" : "Écluse 21, Dickinson's Landing, Ontario",
        geo: { '@type': 'GeoCoordinates', latitude: site.coordinates.lat, longitude: site.coordinates.lon },
      },
    }
  }
  // Every < escaped, so that no text can close the script element
  if (data) head.push({ tag: 'script', attrs: { type: 'application/ld+json' }, content: JSON.stringify(data).replace(/</g, '\\u003c') })
})
