import { defineConfig } from 'vite'

// Dev and preview servers: /modele/viewer (no trailing slash) redirects to /modele/viewer/, as the hosting does in
// production. Vite answers 404 there otherwise, also through the site's dev server, which forwards that path here.
const trailingSlash = {
  name: 'l21-trailing-slash',
  configureServer(server) {
    server.middlewares.use(redirect)
  },
  configurePreviewServer(server) {
    server.middlewares.use(redirect)
  },
}
function redirect(req, res, next) {
  const [path, query] = req.url.split(/\?(.*)/s)
  if (path !== '/modele/viewer') return next()
  res.writeHead(301, { Location: `/modele/viewer/${query ? `?${query}` : ''}` }).end()
}

export default defineConfig({
  // Published at lock21.info/modele/viewer/ (embedded by the site's /modele/ page): absolute paths, so the page works
  // with or without the trailing slash (relative paths broke: assets resolved against the parent folder). Same path on
  // the dev server (http://localhost:3100/modele/viewer/), so the site's dev server can forward that path to it.
  base: '/modele/viewer/',
  server: { host: true },
  plugins: [trailingSlash],
})
