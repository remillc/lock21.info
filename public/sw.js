// The site's service worker (TODO #81, Christian 2026-10-30: a progressive web app, the network first): registered by
// src/components/Head.astro, in production only. What it does with each request:
// - a page (a navigation, or the client-side router's fetch of a page): the network first, the copy kept on the device
//   updated each time; without network, the kept copy, else the offline page (public/offline.html, which lists the kept
//   pages). On a slow network (no answer in SLOW ms) with a kept copy: the copy, the network's answer still kept for
//   the next time (at the dive site, the signal comes and goes);
// - Astro's built files (/_astro/: scripts, styles, fonts, images, their names hashed from their content, never
//   stale): the kept copy first, else the network;
// - the site's other files (favicon, the image zoom, the search index): the network first, then the kept copy;
// - left to the network, never kept: other sites (Google Analytics, the 3D tiles on tiles.lock21.info: the 3D model is
//   not kept offline), /api/ (the viewer's telemetry), /downloads/ (hundreds of MB), /viewer/ (the 3D viewer's sky,
//   animals and flow), requests other than GET, and ranges.
// A new version of this file replaces the old one at the next visit (skipWaiting, clients.claim): bump VERSION when the
// caches' content must start over.

const VERSION = '1'
const PAGES = `lock21-pages-${VERSION}`
const FILES = `lock21-files-${VERSION}`
const OFFLINE = '/offline.html'
// The most pages and files kept (the oldest dropped first)
const MAX_PAGES = 200
const MAX_FILES = 800
// A page's answer awaited this long before a kept copy is shown instead
const SLOW = 4000
const NETWORK_ONLY = ['/api/', '/downloads/', '/viewer/']

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      // The offline page, kept from the start. Cloudflare serves /offline.html at /offline (a redirect): the answer is
      // copied into a plain response, a redirected one can't answer a navigation
      const response = await fetch(OFFLINE, { cache: 'reload' })
      if (response.ok) {
        const cache = await caches.open(PAGES)
        await cache.put(OFFLINE, new Response(await response.blob(), { headers: response.headers }))
      }
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith('lock21-') && key !== PAGES && key !== FILES) await caches.delete(key)
      }
      // The page's request sent while the service worker starts (a navigation isn't held up by it)
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable()
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin || request.headers.has('Range')) return
  if (NETWORK_ONLY.some((prefix) => url.pathname.startsWith(prefix))) return
  if (request.mode === 'navigate') {
    event.respondWith(page(event, url, true))
  } else if (url.pathname.startsWith('/_astro/')) {
    event.respondWith(keptFirst(request))
  } else if ((request.headers.get('Accept') ?? '').includes('text/html') || isPagePath(url.pathname)) {
    // The client-side router's fetch of a page: without network nor a kept copy, an error, after which the router
    // loads the page in full (a navigation, which then shows the offline page)
    event.respondWith(page(event, url, false))
  } else {
    event.respondWith(networkFirst(request))
  }
})

/** A page's address: no file extension (the site's pages are /path, the home pages / and /en/) */
function isPagePath(path) {
  return !/\.[a-z0-9]+$/i.test(path.split('/').pop())
}

async function page(event, url, navigation) {
  // Kept by its address without the query (/modele?cam=… is /modele)
  const key = url.origin + url.pathname
  const cache = await caches.open(PAGES)
  const kept = await cache.match(key)
  const fromNetwork = (async () => {
    const response = (navigation && (await event.preloadResponse)) || (await fetch(event.request))
    const type = response.headers.get('Content-Type') ?? ''
    if (response.ok && !response.redirected && response.type === 'basic' && type.includes('text/html')) {
      await cache.put(key, response.clone())
      await trim(cache, MAX_PAGES)
    }
    return response
  })()
  event.waitUntil(fromNetwork.catch(() => {}))
  try {
    if (!kept) return await fromNetwork
    // A kept copy: the network's answer if it comes within SLOW, else the copy
    return await Promise.race([fromNetwork, new Promise((resolve) => setTimeout(() => resolve(kept), SLOW))])
  } catch {
    if (kept) return kept
    if (navigation) return (await cache.match(OFFLINE)) ?? Response.error()
    return Response.error()
  }
}

async function keptFirst(request) {
  const cache = await caches.open(FILES)
  const kept = await cache.match(request)
  if (kept) return kept
  const response = await fetch(request)
  if (response.ok && response.type === 'basic') {
    await cache.put(request, response.clone())
    await trim(cache, MAX_FILES)
  }
  return response
}

async function networkFirst(request) {
  const cache = await caches.open(FILES)
  try {
    const response = await fetch(request)
    if (response.ok && response.type === 'basic') {
      await cache.put(request, response.clone())
      await trim(cache, MAX_FILES)
    }
    return response
  } catch (error) {
    const kept = await cache.match(request)
    if (kept) return kept
    throw error
  }
}

/** The oldest entries dropped beyond `max` (the offline page always kept) */
async function trim(cache, max) {
  const keys = await cache.keys()
  for (const request of keys.slice(0, Math.max(0, keys.length - max))) {
    if (!request.url.endsWith(OFFLINE)) await cache.delete(request)
  }
}
