// Astro integration (astro.config.mjs), last after the build: the list of what the web app keeps for reading offline
// (TODO #118, Christian 2026-11-01: every page of the site, not only those read), written to dist/offline.json and
// read by the service worker (public/sw.js, precache), which downloads what it doesn't have yet:
// - pages: every built page at its address, both languages (not the 404 pages, the offline page, kept from the
//   start, nor the redirects of former addresses);
// - files: the scripts, styles, fonts and icons the pages load (/_astro/, /scripts/, /favicon.svg…), each figure image at one size (the srcset's
//   width nearest PHONE_WIDTH px, what a phone loads for the column; offline, sw.js answers a request for another
//   size of the same image with this one), and the search index (/pagefind/). Not the 3D viewer's own files
//   (dist/viewer/files.json): the model needs the network anyway.
// version: a hash of the list, so that the service worker downloads again only when the site has changed.
// About 7.5 MB on 2026-11-01 (58 pages: 3.8 MB of HTML; 1 MB of scripts, styles and fonts; 1.8 MB of images; 0.9 MB
// of search index).
import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const PHONE_WIDTH = 1080

async function* files(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* files(path)
    else yield path
  }
}

/** @returns {import('astro').AstroIntegration} */
export default function offlineList() {
  return {
    name: 'lock21-offline-list',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const root = fileURLToPath(dir)
        let viewer = []
        try {
          viewer = JSON.parse(await readFile(join(root, 'viewer', 'files.json'), 'utf8'))
        } catch {}
        const skip = new Set(viewer)
        const pages = []
        const kept = new Set()
        const search = []
        for await (const path of files(root)) {
          const rel = relative(root, path).split(sep).join('/')
          if (rel.startsWith('pagefind/')) {
            search.push(`/${rel}`)
            continue
          }
          if (!rel.endsWith('.html') || rel === 'offline.html' || /(^|\/)404\.html$/.test(rel)) continue
          const html = await readFile(path, 'utf8')
          if (/http-equiv="refresh"/.test(html)) continue
          // The page's address: /a-propos, /en/about, and the home pages / and /en/ (src/integrations/home-slash.mjs)
          const address = `/${rel.replace(/index\.html$/, '').replace(/\/$/, '')}`
          pages.push(address === '/en' ? '/en/' : address)
          // The imports of the scripts written in the page
          for (const [, file] of html.matchAll(/(?:from\s*|import\s*\(?\s*)["'](\/_astro\/[^"']+\.js)["']/g)) if (!skip.has(file)) kept.add(file)
          // An image with a srcset: one of its sizes below, not its src (the original's size)
          const others = html.replace(/<img\b[^>]*\bsrcset=[^>]*>/g, '')
          for (const [, file] of others.matchAll(/(?:href|src)="(\/(?!viewer\/)[^"?#]+\.(?:css|js|woff2|svg|png|webp|webmanifest))"/g)) if (!skip.has(file)) kept.add(file)
          for (const [, srcset] of html.matchAll(/srcset="([^"]+)"/g)) {
            const candidates = srcset.split(',').map((c) => c.trim().split(/\s+/)).filter(([url]) => url.startsWith('/_astro/'))
            if (!candidates.length) continue
            const width = (c) => parseInt(c[1]) || 0
            kept.add(candidates.reduce((a, b) => (Math.abs(width(b) - PHONE_WIDTH) < Math.abs(width(a) - PHONE_WIDTH) ? b : a))[0])
          }
        }
        // What those files load in turn: the scripts' imports, the styles' fonts (the Latin ones in WOFF2, as every browser
        // reads it and the site's text is French and English) and images. The 3D viewer's own scripts are never reached (only its
        // page loads them), and what they share with the other scripts is kept (preload-helper)
        for (const file of kept) {
          if (!/\.(?:js|css)$/.test(file)) continue
          const text = await readFile(join(root, file), 'utf8')
          const found = file.endsWith('.css')
            ? [...text.matchAll(/url\(["']?([^"')?#]+)/g)].map((m) => m[1]).filter((url) => /\.(?:svg|png|webp)$|-latin-[^/]*\.woff2$/.test(url))
            : [...text.matchAll(/(?:from\s*|import\s*\(?\s*)["'](\.{0,2}\/[^"']+\.js)["']/g)].map((m) => m[1])
          for (const url of found) {
            const path = new URL(url, `http://site${file}`).pathname
            if (!path.startsWith('/viewer/')) kept.add(path)
          }
        }
        pages.sort()
        const list = [...[...kept].sort(), ...search.sort()]
        const version = createHash('sha256').update(JSON.stringify([pages, list])).digest('hex').slice(0, 12)
        await writeFile(join(root, 'offline.json'), JSON.stringify({ version, pages, files: list }) + '\n')
        logger.info(`offline list: ${pages.length} pages, ${list.length} files (version ${version})`)
      },
    },
  }
}
