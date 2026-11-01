// The site's service worker (TODO #81, Christian 2026-10-30: a progressive web app, the network first): registered by
// src/components/Head.astro, in production only. What it does with each request:
// - a page (a navigation, or the client-side router's fetch of a page): the network first, the copy kept on the device
//   updated each time; without network, the kept copy, else the offline page (public/offline.html, which lists the kept
//   pages). On a slow network (no answer in SLOW ms) with a kept copy: the copy, the network's answer still kept for
//   the next time (at the dive site, the signal comes and goes);
// - Astro's built files (/_astro/: scripts, styles, fonts, images, their names hashed from their content, never
//   stale): the kept copy first, else the network;
// - the site's other files (favicon, the image zoom, the search index): the network first, then the kept copy (also
//   on a slow network, after SLOW ms);
// - left to the network, never kept: other sites (Google Analytics, the 3D tiles on tiles.lock21.info: the 3D model is
//   not kept offline), /api/ (the viewer's telemetry), /downloads/ (hundreds of MB), /viewer/ (the 3D viewer's sky,
//   animals and flow), requests other than GET, and ranges.
// Every page kept, not only those read (TODO #118, Christian 2026-11-01): the list written at build
// (src/integrations/offline-list.mjs: dist/offline.json, every page, the files they load, each figure image at one
// size, the search index; about 7.5 MB) is downloaded in the background when a page asks for it (Head.astro, once the
// page has loaded and the browser is idle, never with the data saver on), again only when the list's version changes.
// Offline, a figure image asked at another size than the one kept is answered with the kept one.
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
// The list of what to keep (offline-list.mjs), and the version of it already downloaded (an entry of FILES)
const LIST = '/offline.json'
const LIST_DONE = '/offline-done'
// Downloads at a time while keeping the list
const PRECACHE_JOBS = 4

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

// A page asks for every page to be kept (Head.astro)
self.addEventListener('message', (event) => {
  if (event.data?.type === 'precache') event.waitUntil(precache().catch(() => {}))
})

/** Every page and file of the list kept: when the list's version changed, the pages and the files whose names don't
 *  change with their content fetched again; the /_astro/ files (hashed) only if missing. The version noted once
 *  everything came, so that an interrupted download goes on at the next page */
async function precache() {
  const response = await fetch(LIST, { cache: 'no-cache' })
  if (!response.ok) return
  const list = await response.json()
  const files = await caches.open(FILES)
  const done = await files.match(LIST_DONE)
  if (done && (await done.text()) === list.version) return
  const pages = await caches.open(PAGES)
  const jobs = [
    ...list.pages.map((path) => async () => {
      const page = await fetch(path, { cache: 'no-cache' })
      if (page.ok && !page.redirected && (page.headers.get('Content-Type') ?? '').includes('text/html')) await pages.put(self.location.origin + path, page)
      else throw new Error(path)
    }),
    ...list.files.map((path) => async () => {
      if (path.startsWith('/_astro/') && (await files.match(path))) return
      const file = await fetch(path, { cache: path.startsWith('/_astro/') ? 'default' : 'no-cache' })
      if (file.ok && file.type === 'basic') await files.put(path, file)
      else throw new Error(path)
    }),
  ]
  let failed = 0
  const next = async () => {
    for (let job = jobs.shift(); job; job = jobs.shift()) await job().catch(() => failed++)
  }
  await Promise.all(Array.from({ length: PRECACHE_JOBS }, next))
  if (!failed) await files.put(LIST_DONE, new Response(list.version))
}

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
    event.respondWith(networkFirst(event))
  }
})

/** A page's address: no file extension (the site's pages are /path, the home pages / and /en/) */
function isPagePath(path) {
  return !/\.[a-z0-9_]+$/i.test(path.split('/').pop())
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
  let response
  try {
    response = await fetch(request)
  } catch (error) {
    // Offline: a figure image at another size than the one kept (offline-list.mjs keeps one per image) answered with
    // the kept one. Astro's names: <image>.<hash>_<size hash>.<ext>, the same before the last « _ »
    const other = await otherSize(cache, request.url)
    if (other) return other
    throw error
  }
  if (response.ok && response.type === 'basic') {
    await cache.put(request, response.clone())
    await trim(cache, MAX_FILES)
  }
  return response
}

async function networkFirst(event) {
  const request = event.request
  const cache = await caches.open(FILES)
  // Without the query: the search asks for its index as pagefind-entry.json?ts=…
  const kept = await cache.match(request, { ignoreSearch: true })
  const fromNetwork = (async () => {
    const response = await fetch(request)
    if (response.ok && response.type === 'basic') {
      await cache.put(request, response.clone())
      await trim(cache, MAX_FILES)
    }
    return response
  })()
  event.waitUntil(fromNetwork.catch(() => {}))
  if (!kept) return fromNetwork
  // A kept copy: the network's answer if it comes within SLOW, else the copy (as for the pages)
  try {
    return await Promise.race([fromNetwork, new Promise((resolve) => setTimeout(() => resolve(kept), SLOW))])
  } catch {
    return kept
  }
}

/** A kept copy of the same image at another size, or undefined */
async function otherSize(cache, url) {
  const match = /^(.*\/_astro\/[^/]+)_[^_/]+\.(webp|avif|jpe?g|png)$/i.exec(url)
  if (!match) return undefined
  const [, stem, extension] = match
  const request = (await cache.keys()).find((key) => key.url.startsWith(`${stem}_`) && key.url.endsWith(`.${extension}`))
  return request ? cache.match(request) : undefined
}

/** The oldest entries dropped beyond `max` (the offline page and the list's version always kept) */
async function trim(cache, max) {
  const keys = await cache.keys()
  for (const request of keys.slice(0, Math.max(0, keys.length - max))) {
    if (!request.url.endsWith(OFFLINE) && !request.url.endsWith(LIST_DONE)) await cache.delete(request)
  }
}
