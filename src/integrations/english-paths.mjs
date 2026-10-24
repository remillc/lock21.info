// Astro integration (astro.config.mjs): the English pages at their English addresses (TODO #63, src/data/englishPaths.js).
// Starlight builds them at /en/<French path>; after the build, each page moves to /en/<English path>, every link to it
// in the built pages and the sitemap is rewritten (sidebar, language menu, canonical and alternate addresses, links in
// the text), the former addresses are redirected (_redirects, read by the hosting: a 301), and the search index is
// rebuilt (Pagefind takes the addresses from the files' places; Starlight indexed them before the move). The dev
// server does the same as it serves (Christian, 2026-10-24: the real addresses in dev too): the English address serves
// the page, the pages' links are rewritten, the former address is redirected (a 302: not kept by the browser).
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
/** @param {string} text */
const rewrite = (text) => fixes.reduce((result, [pattern, replacement]) => result.replace(pattern, replacement), text)

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
        const toEnglish = new Map(moves.map(([french, english]) => [`/en/${french}`, `/en/${english}`]))
        server.middlewares.use((req, res, next) => {
          const url = req.url ?? ''
          const cut = url.search(/[?#]/)
          const path = (cut < 0 ? url : url.slice(0, cut)).replace(/(.)\/$/, '$1')
          const rest = cut < 0 ? '' : url.slice(cut)
          // The former address: to the English one
          const english = toEnglish.get(path)
          if (english) {
            res.writeHead(302, { Location: english + rest })
            res.end()
            return
          }
          // The English address: Starlight's page at the French path
          const french = toFrench.get(path)
          if (french) req.url = french + rest
          // A page (no file extension, not Vite's own nor the viewer): its links rewritten, as in the build
          if (req.method !== 'GET' || /\.[a-z0-9]+$/i.test(path) || path.startsWith('/@') || path.startsWith('/modele/viewer')) return next()
          const chunks = []
          const write = res.write.bind(res)
          const end = res.end.bind(res)
          const writeHead = res.writeHead.bind(res)
          const isHtml = () => /text\/html/.test(String(res.getHeader('content-type') ?? ''))
          // Its length changes: sent without one
          res.writeHead = (status, ...args) => {
            for (const headers of args) {
              if (!headers || typeof headers !== 'object' || Array.isArray(headers)) continue
              for (const key of Object.keys(headers)) if (key.toLowerCase() === 'content-length') delete headers[key]
            }
            res.removeHeader('content-length')
            return writeHead(status, ...args)
          }
          res.write = (chunk, ...args) => {
            if (chunk == null || typeof chunk === 'function') return write(chunk, ...args)
            chunks.push(Buffer.from(chunk))
            return true
          }
          res.end = (chunk, ...args) => {
            if (chunk != null && typeof chunk !== 'function') chunks.push(Buffer.from(chunk))
            const body = Buffer.concat(chunks)
            const out = isHtml() ? Buffer.from(rewrite(body.toString('utf8'))) : body
            if (!res.headersSent) res.removeHeader('content-length')
            if (out.length) write(out)
            return end(...[chunk, ...args].filter((a) => typeof a === 'function'))
          }
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
          const after = rewrite(before)
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
