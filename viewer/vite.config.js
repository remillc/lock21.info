import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  // Published at lock21.info/modele/: absolute paths, so the page works with or without the trailing slash
  // (relative paths broke at /modele: assets resolved against the site root). Dev server at the root.
  base: command === 'build' ? '/modele/' : '/',
  server: { host: true },
}))
