// Cloudflare Worker in front of the static site (wrangler.jsonc), run only for /en, /en/ and /api/* (run_worker_first);
// every other address is a static file.
// - /en/: the English home page is a collection, at /en/ like the French one at /. Every other page has no final slash,
//   which the static assets enforce (html_handling: drop-trailing-slash) and would apply to /en/ too.
// - /api/log: the 3D viewer's telemetry (viewer/src/telemetry.js), written to Workers Logs (observability in
//   wrangler.jsonc). Read live with `npx wrangler tail lock21-info`, or in the dashboard (Workers, lock21-info, Logs).

// Largest message accepted (the viewer cuts its own at about 3.9 KB)
const MAX_LOG_BYTES = 4096

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/api/log') return log(request, url)
    if (url.pathname.startsWith('/api/')) return new Response('Not found', { status: 404 })
    if (url.pathname === '/en') {
      url.pathname = '/en/'
      return Response.redirect(url.href, 301)
    }
    // /en/: en/index.html, which the static assets serve at /en
    url.pathname = '/en'
    return env.ASSETS.fetch(new Request(url, request))
  },
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
