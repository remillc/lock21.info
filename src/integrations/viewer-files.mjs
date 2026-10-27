// Astro integration (astro.config.mjs): after the build, the 3D viewer's script files listed in viewer/files.json, for
// the warm-up on hover of a /modele link (src/components/ViewerWarmup.astro). The viewer (src/viewer/main.js) is
// loaded by <l21-viewer> on /modele only (a dynamic import, TODO #80): its chunk and the chunks it imports have names
// that change with each build, and appear in no page's HTML. Found here: the chunk whose name starts with « main. »,
// then the files it imports, and theirs. Nothing in development (no file: no warm-up).
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

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
        const files = new Set()
        const visit = async (name) => {
          if (files.has(name)) return
          files.add(name)
          if (!name.endsWith('.js')) return
          const code = await readFile(join(assets, name), 'utf8')
          for (const [, imported] of code.matchAll(/(?:from|import)\s*["']\.\/([\w.-]+\.(?:js|css))["']/g)) await visit(imported)
        }
        await visit(main)
        await mkdir(join(root, 'viewer'), { recursive: true })
        await writeFile(join(root, 'viewer', 'files.json'), JSON.stringify([...files].map((name) => `/_astro/${name}`)) + '\n')
        logger.info(`viewer files: ${files.size} files in viewer/files.json`)
      },
    },
  }
}
