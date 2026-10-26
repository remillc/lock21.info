import { defineConfig } from 'vite'
import Icons from 'unplugin-icons/vite'
import { paraglideVitePlugin } from '@inlang/paraglide-js'

// Dev and preview servers: the viewer's address is /modele/viewer (no final slash), as on the hosting. Vite only
// serves its index.html at the base (/modele/viewer/): the address is passed on as that, without a redirect. The
// site's dev server forwards /modele/viewer here.
const viewerAddress = {
  name: 'l21-viewer-index',
  configureServer(server) {
    server.middlewares.use(viewerIndex)
  },
  configurePreviewServer(server) {
    server.middlewares.use(viewerIndex)
  },
}
function viewerIndex(req, _res, next) {
  const [path, query] = req.url.split(/\?(.*)/s)
  if (path === '/modele/viewer') req.url = `/modele/viewer/${query ? `?${query}` : ''}`
  next()
}

export default defineConfig({
  // Published at lock21.info/modele/viewer (embedded by the site's /modele page): absolute paths, so the page works
  // with or without the trailing slash (relative paths broke: assets resolved against the parent folder). Same path on
  // the dev server (http://localhost:3100/modele/viewer), so the site's dev server can forward that path to it.
  base: '/modele/viewer/',
  server: { host: true },
  // The stylesheet's native CSS nesting flattened for browsers before 2023 (an old iPad would drop the nested rules)
  build: { cssTarget: ['chrome100', 'safari15', 'firefox100', 'edge100'] },
  // Icons by name (src/icons.js: ~icons/material-symbols/…?raw), compiled into SVG strings, only those imported
  // Texts: Paraglide JS messages (messages/viewer.inlang), compiled into src/paraglide (src/i18n.js). The language is the
  // viewer's own (i18n.js sets it), so only the plain strategies; one module per message, only those used bundled
  plugins: [
    viewerAddress,
    Icons({ compiler: 'raw' }),
    paraglideVitePlugin({
      project: '../messages/viewer.inlang',
      outdir: './src/paraglide',
      strategy: ['globalVariable', 'baseLocale'],
      emitReadme: false,
    }),
  ],
})
