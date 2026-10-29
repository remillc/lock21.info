// Starlight route middleware (astro.config.mjs, routeMiddleware): what the <head> says to search engines and to the
// sites a link is shared on (SEO audit, docs/audits/seo-2026-10-26.md):
// - og:locale as a region code (fr_CA, en_CA), with the other language as og:locale:alternate;
// - a share image (public/images/og-lock21.jpg, 1200 x 630, cropped from the home page's render of zone 12), replaced
//   after the build by the page's first photo where it has one (src/integrations/share-images.mjs); on /modele, the
//   3D viewer's start view (public/images/og-modele.jpg, tools/share-image/capture_model.mjs);
// - structured data (JSON-LD): the site and its author on the two home pages, the 3D model on the model page;
// - no canonical address nor language versions on the 404 pages (an error page has no address of its own);
// - on the model page, an early start for the 3D viewer (TODO #96): a connection opened to the tiles' server, and the
//   manifest asked for at once, the viewer's code (src/viewer/main.js) taking the answer instead of asking again once
//   loaded, about a second later on a phone. Its scripts are preloaded too, after the build (viewer-files.mjs).
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
    modelImageAlt: 'La vue de départ du modèle 3D de l’écluse 21 : le sas, ses murs de pierre et les trois pertuis des vannes',
    modelDescription: 'L’écluse 21 de Dickinson’s Landing, submergée depuis 1958 dans le Saint-Laurent, relevée zone par zone en photogrammétrie sous-marine.',
  },
  en: {
    imageAlt: 'A render of a zone of Lock 21 underwater: a stone pier and the spillway gates',
    siteName: 'Lock 21',
    otherName: 'Écluse 21',
    model: '3D model of Lock 21',
    modelImageAlt: 'The start view of the 3D model of Lock 21: the chamber, its stone walls and the three sluice openings',
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

  if (path === '/404' || path === '/en/404') {
    for (let i = head.length - 1; i >= 0; i--) {
      const rel = head[i].tag === 'link' ? head[i].attrs?.rel : null
      if (rel === 'canonical' || rel === 'alternate') head.splice(i, 1)
    }
  }

  const locale = find(head, 'property', 'og:locale')
  if (locale) locale.attrs.content = lang === 'en' ? 'en_CA' : 'fr_CA'
  head.push({ tag: 'meta', attrs: { property: 'og:locale:alternate', content: lang === 'en' ? 'fr_CA' : 'en_CA' } })

  // The model page: the 3D viewer's start view (tools/share-image/capture_model.mjs)
  const modelPage = path === '/modele' || path === '/en/modele'
  const image = `${ORIGIN}/images/${modelPage ? 'og-modele.jpg' : 'og-lock21.jpg'}`
  head.push(
    { tag: 'meta', attrs: { property: 'og:image', content: image } },
    { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
    { tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
    { tag: 'meta', attrs: { property: 'og:image:alt', content: modelPage ? t.modelImageAlt : t.imageAlt } },
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
  } else if (modelPage) {
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

  if (modelPage) {
    // The same root as the viewer's (main.js, DEFAULT_TILES_URL); with ?tiles= in the address, the viewer asks itself
    const tiles = import.meta.env.PUBLIC_TILES_URL || 'http://localhost:8081'
    const manifest = JSON.stringify(`${tiles}/manifest.json`).replace(/</g, '\\u003c')
    head.push(
      // (crossorigin: the viewer's requests to the tiles are CORS requests without credentials)
      { tag: 'link', attrs: { rel: 'preconnect', href: new URL(tiles).origin, crossorigin: 'anonymous' } },
      {
        tag: 'script',
        content: `if(!new URLSearchParams(location.search).has('tiles'))window.lock21Manifest={url:${manifest},response:fetch(${manifest},{cache:'no-cache'}).catch(()=>null)}`,
      },
    )
  }
})
