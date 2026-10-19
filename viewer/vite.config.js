import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  // Published at lock21.info/modele/viewer/ (embedded by the site's /modele/ page): absolute paths, so the page works
  // with or without the trailing slash (relative paths broke: assets resolved against the parent folder). Dev server
  // at the root.
  base: command === 'build' ? '/modele/viewer/' : '/',
  server: { host: true },
}))
