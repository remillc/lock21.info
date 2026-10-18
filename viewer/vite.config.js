import { defineConfig } from 'vite'

export default defineConfig({
  // Relative paths: the build can be published under any path (e.g. lock21.info/modele/)
  base: './',
  server: { host: true },
})
