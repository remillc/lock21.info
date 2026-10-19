import { defineConfig } from 'vite'

export default defineConfig({
  // Published at lock21.info/modele/viewer/ (embedded by the site's /modele/ page): absolute paths, so the page works
  // with or without the trailing slash (relative paths broke: assets resolved against the parent folder). Same path on
  // the dev server (http://localhost:3100/modele/viewer/), so the site's dev server can forward that path to it.
  base: '/modele/viewer/',
  server: { host: true },
})
