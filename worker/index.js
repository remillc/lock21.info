// Cloudflare Worker in front of the static site (wrangler.jsonc), run only for /en and /en/ (run_worker_first): the
// English home page is a collection, at /en/ like the French one at /. Every other page has no final slash, which the
// static assets enforce (html_handling: drop-trailing-slash) and would apply to /en/ too.
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/en') {
      url.pathname = '/en/'
      return Response.redirect(url.href, 301)
    }
    // /en/: en/index.html, which the static assets serve at /en
    url.pathname = '/en'
    return env.ASSETS.fetch(new Request(url, request))
  },
}
