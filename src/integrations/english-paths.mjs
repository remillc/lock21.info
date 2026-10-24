// Astro integration (astro.config.mjs): the English pages at their English addresses (TODO #63, src/data/englishPaths.js).
// Starlight builds them at /en/<French path>; after the build, each page moves to /en/<English path>, every link to it
// in the built pages and the sitemap is rewritten (sidebar, language menu, canonical and alternate addresses, links in
// the text), the former addresses are redirected (_redirects, read by the hosting: a 301), and the search index is
// rebuilt (Pagefind takes the addresses from the files' places; Starlight indexed them before the move). On the dev
// server the English address serves the page too (its links keep the French path there).
import { mkdir, readdir, readFile, rename, rm, rmdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as pagefind from 'pagefind'
import { englishPaths } from '../data/englishPaths.js'

const moves = Object.entries(englishPaths).filter(([french, english]) => french !== english)
// A link to /en/<French path>: after a quote, an equals sign, a bracket or the site's domain, and followed by the
// address's end (a quote, #, ?, < or a space: /en/modele, not /en/modele-x or /en/modele/viewer)
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const fixes = moves.map(([french, english]) => [
  new RegExp(`(["'=(]|lock21\\.info)/en/${escape(french)}(?=["'#?<\\s)])`, 'g'),
  `$1/en/${english}`,
])

async function* files(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* files(path)
    else if (/\.(html|xml)$/.test(entry.name)) yield path
  }
}

/** Removes a folder and its parents up to `stop` while they are empty */
async function prune(dir, stop) {
  while (dir.length > stop.length && (await readdir(dir)).length === 0) {
    await rmdir(dir)
    dir = dirname(dir)
  }
}

export default function englishPathsIntegration() {
  return {
    name: 'lock21-english-paths',
    hooks: {
      'astro:server:setup': ({ server }) => {
        const toFrench = new Map(moves.map(([french, english]) => [`/en/${english}`, `/en/${french}`]))
        server.middlewares.use((req, _res, next) => {
          const [path, query] = (req.url ?? '').split(/(?=\?)/)
          const french = toFrench.get(path.replace(/\/$/, ''))
          if (french) req.url = french + (query ?? '')
          next()
        })
      },
      'astro:build:done': async ({ dir, logger }) => {
        const root = fileURLToPath(dir)
        // The pages, to their English places
        for (const [french, english] of moves) {
          const from = join(root, 'en', french, 'index.html')
          if (!existsSync(from)) {
            logger.warn(`no page at /en/${french} (src/data/englishPaths.js)`)
            continue
          }
          const to = join(root, 'en', english, 'index.html')
          await mkdir(dirname(to), { recursive: true })
          await rename(from, to)
          await prune(dirname(from), join(root, 'en'))
        }
        // An English page left at its French path: its line is missing from the table
        const english = new Set(Object.values(englishPaths))
        for await (const path of files(join(root, 'en'))) {
          const page = dirname(path).slice(join(root, 'en').length + 1).replaceAll('\\', '/')
          if (path.endsWith('index.html') && page && !english.has(page)) logger.warn(`/en/${page}: no English address (src/data/englishPaths.js)`)
        }
        // The links to them
        let changed = 0
        for await (const path of files(root)) {
          const before = await readFile(path, 'utf8')
          const after = fixes.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), before)
          if (after !== before) {
            await writeFile(path, after)
            changed++
          }
        }
        // The former addresses
        const redirectsPath = join(root, '_redirects')
        const kept = existsSync(redirectsPath) ? await readFile(redirectsPath, 'utf8') : ''
        const lines = moves.map(([french, english]) => `/en/${french} /en/${english} 301`)
        await writeFile(redirectsPath, `${kept}${kept && !kept.endsWith('\n') ? '\n' : ''}${lines.join('\n')}\n`)
        // The search index, again (as Starlight's own step: @astrojs/starlight/dist/integrations/pagefind.js)
        await rm(join(root, 'pagefind'), { recursive: true, force: true })
        try {
          const { index } = await pagefind.createIndex()
          const added = await index.addDirectory({ path: root })
          const written = await index.writeFiles({ outputPath: join(root, 'pagefind') })
          const errors = [...added.errors, ...written.errors]
          if (errors.length) throw new Error(errors.join('; '))
        } finally {
          await pagefind.close()
        }
        logger.info(`English addresses: ${moves.length} pages moved, ${changed} files rewritten, search index rebuilt`)
      },
    },
  }
}
