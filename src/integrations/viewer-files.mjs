// Astro integration (astro.config.mjs): after the build, the 3D viewer's script files listed in viewer/files.json, for
// the warm-up on hover of a /modele link (src/components/ViewerWarmup.astro). The viewer (src/viewer/main.js) is
// loaded by <l21-viewer> on /modele only (a dynamic import, TODO #80): its chunk and the chunks it imports have names
// that change with each build, and appear in no page's HTML. Found here: the chunk whose name starts with « main. »,
// then the files it imports, and theirs. Nothing in development (no file: no warm-up).
// The same scripts are preloaded on the pages that hold the viewer (<l21-viewer>: /modele, /en/model; TODO #96), with
// those the page's own scripts import: <link rel="modulepreload"> in their <head>, so that they load with the page
// instead of one after the other (the viewer element's script, then Vite's preload helper, then main.js).
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** @param {string} dir @returns {AsyncGenerator<string>} */
async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* htmlFiles(path)
    else if (entry.name.endsWith('.html')) yield path
  }
}

/** @returns {import('astro').AstroIntegration} */
export default function viewerFiles() {
  return {
    name: 'lock21-viewer-files',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const root = fileURLToPath(dir)
        const assets = join(root, '_astro')
        const names = await readdir(assets)
        const main = names.find((name) => /^main\.[\w-]+\.js$/.test(name))
        if (!main) {
          logger.warn('viewer files: no main.*.js chunk (the warm-up will fetch nothing)')
          return
        }
        /** A chunk and every file it imports, and theirs, into `files` @param {string} name @param {Set<string>} files */
        const visit = async (name, files) => {
          if (files.has(name)) return
          files.add(name)
          if (!name.endsWith('.js')) return
          const code = await readFile(join(assets, name), 'utf8')
          for (const [, imported] of code.matchAll(/(?:from|import)\s*["']\.\/([\w.-]+\.(?:js|css))["']/g)) await visit(imported, files)
        }
        /** @type {Set<string>} */
        const files = new Set()
        await visit(main, files)
        await mkdir(join(root, 'viewer'), { recursive: true })
        await writeFile(join(root, 'viewer', 'files.json'), JSON.stringify([...files].map((name) => `/_astro/${name}`)) + '\n')
        logger.info(`viewer files: ${files.size} files in viewer/files.json`)

        let pages = 0
        for await (const page of htmlFiles(root)) {
          const html = await readFile(page, 'utf8')
          // (not <l21-viewer-warmup>, in every page's header)
          if (!/<l21-viewer[\s>]/.test(html)) continue
          // The page's own module scripts (already in its HTML) and what they import, then the viewer's files
          const scripts = new Set([...html.matchAll(/<script type="module" src="\/_astro\/([\w.-]+\.js)"/g)].map((match) => match[1]))
          /** @type {Set<string>} */
          const preload = new Set()
          for (const name of scripts) await visit(name, preload)
          for (const name of files) preload.add(name)
          const links = [...preload].filter((name) => name.endsWith('.js') && !scripts.has(name))
          const tags = links.map((name) => `<link rel="modulepreload" href="/_astro/${name}">`).join('')
          await writeFile(page, html.replace('</head>', `${tags}</head>`))
          pages++
          logger.info(`viewer files: ${links.length} scripts preloaded in ${page.slice(root.length)}`)
        }
        if (!pages) logger.warn('viewer files: no page with <l21-viewer> (nothing preloaded)')
      },
    },
  }
}
