// Cloudflare Worker in front of the static site (wrangler.jsonc), run only for /en, /en/, /api/*, /downloads/* and the
// addresses that end with a slash (run_worker_first); every other address is a static file.
// - <path>/: a permanent redirect (301) to <path>, the page's address (the static assets' own redirect, html_handling:
//   drop-trailing-slash, is a 307, which search engines take as temporary: SEO audit S12, docs/audits/seo-2026-10-26.md).
//   The two home pages keep their slash: / and /en/.
// - /en/: the English home page is a collection, at /en/ like the French one at /. Every other page has no final slash,
//   which the static assets enforce (html_handling: drop-trailing-slash) and would apply to /en/ too.
// - /api/log: the 3D viewer's telemetry (src/viewer/telemetry.js), written to Workers Logs (observability in
//   wrangler.jsonc). Read live with `npx wrangler tail lock21-info`, or in the dashboard (Workers, lock21-info, Logs).
// - /downloads/*: the downloads (whole-model GLB, the Google Earth list and parts, the AR models; TODO #103), read from
//   the R2 bucket's downloads/ (binding DOWNLOADS), where tools/publish-model/upload_downloads.mjs puts them with their
//   type and cache. Too large for the static assets (25 MiB at most a file; the GLB is 130 MB). A file that isn't in R2
//   is the site's own (public/downloads/lock-21.kmz), or the 404 page. Ranges (a resumed download) and ETags kept.

// Largest message accepted (the viewer cuts its own at about 3.9 KB)
const MAX_LOG_BYTES = 4096

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/api/log') return log(request, url)
    if (url.pathname.startsWith('/downloads/')) return download(request, env, url)
    if (url.pathname.startsWith('/api/')) return new Response('Not found', { status: 404 })
    if (url.pathname.endsWith('/') && url.pathname !== '/' && url.pathname !== '/en/') {
      url.pathname = url.pathname.replace(/\/+$/, '') || '/'
      return Response.redirect(url.href, 301)
    }
    if (url.pathname === '/en') {
      url.pathname = '/en/'
      return Response.redirect(url.href, 301)
    }
    // /en/: en/index.html, which the static assets serve at /en
    url.pathname = '/en'
    return env.ASSETS.fetch(new Request(url, request))
  },
}

async function download(request, env, url) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } })
  }
  let object
  try {
    object = await env.DOWNLOADS.get(decodeURIComponent(url.pathname.slice(1)), {
      onlyIf: request.headers,
      range: request.headers,
    })
  } catch {
    // A range the file can't satisfy
    return new Response(null, { status: 416 })
  }
  if (object === null) return env.ASSETS.fetch(request)
  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('ETag', object.httpEtag)
  headers.set('Accept-Ranges', 'bytes')
  // A precondition that held the body back: unchanged (If-None-Match, If-Modified-Since) or changed (If-Match)
  if (!('body' in object)) {
    const unchanged = request.headers.has('If-None-Match') || request.headers.has('If-Modified-Since')
    return new Response(null, { status: unchanged ? 304 : 412, headers })
  }
  let status = 200
  let length = object.size
  const range = request.headers.has('Range') ? object.range : undefined
  // A range that starts past the end (R2 may hand back the whole file instead of refusing it)
  const start = /^bytes=(\d+)-/.exec(request.headers.get('Range') ?? '')
  if (start && Number(start[1]) >= object.size) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${object.size}` } })
  }
  if (range) {
    // (R2Range: { offset, length }, either may be missing, or { suffix }; the object may define the others as undefined)
    const offset = range.suffix !== undefined ? object.size - range.suffix : (range.offset ?? 0)
    length = range.suffix !== undefined ? range.suffix : (range.length ?? object.size - offset)
    headers.set('Content-Range', `bytes ${offset}-${offset + length - 1}/${object.size}`)
    status = 206
  }
  headers.set('Content-Length', String(length))
  return new Response(request.method === 'HEAD' ? null : object.body, { status, headers })
}

async function log(request, url) {
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } })
  // Only the site's own pages (the browser sends Origin with a POST); other senders are refused
  const origin = request.headers.get('Origin')
  if (origin && origin !== url.origin) return new Response(null, { status: 403 })
  const text = await request.text()
  if (text.length > MAX_LOG_BYTES) return new Response(null, { status: 413 })
  let message
  try {
    message = JSON.parse(text)
  } catch {
    return new Response(null, { status: 400 })
  }
  if (typeof message !== 'object' || message === null || Array.isArray(message)) return new Response(null, { status: 400 })
  // One structured line per message (Workers Logs indexes its fields); the country comes from Cloudflare, no IP is kept
  console.log({ source: 'viewer', country: request.cf?.country ?? null, ...message })
  return new Response(null, { status: 204 })
}
