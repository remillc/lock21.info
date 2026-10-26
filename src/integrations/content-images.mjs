// Astro integration (astro.config.mjs): after the build, the notebook's images in the built pages get what the
// browser needs to load them well (Lighthouse, 2026-10-26: the opening photo of « Le rig » was the page's largest
// element and was loaded last):
// - sizes: the content column's width (about 48rem on a wide screen, the screen's width on a phone) instead of Astro's
//   « the image's own width or the whole screen », so the browser picks a smaller file from the srcset;
// - the first image of the content: loaded at once and first (loading="eager", fetchpriority="high"), not lazily.
// The dev server keeps Astro's own attributes.
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SIZES = '(min-width: 50rem) 48rem, 100vw'

async function* pages(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== '_astro' && entry.name !== 'pagefind' && entry.name !== 'viewer') yield* pages(path)
    } else if (entry.name.endsWith('.html')) yield path
  }
}

/** @param {string} html */
function fix(html) {
  const start = html.indexOf('class="sl-markdown-content')
  if (start < 0) return html
  let first = true
  const content = html.slice(start).replace(/<img\b[^>]*\bdata-astro-image="[^"]*"[^>]*>/g, (tag) => {
    let out = tag.replace(/\ssizes="[^"]*"/, ` sizes="${SIZES}"`)
    if (first) {
      out = out.replace(/\sloading="lazy"/, ' loading="eager" fetchpriority="high"')
      first = false
    }
    return out
  })
  return html.slice(0, start) + content
}

/** @returns {import('astro').AstroIntegration} */
export default function contentImages() {
  return {
    name: 'lock21-content-images',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        let changed = 0
        for await (const path of pages(fileURLToPath(dir))) {
          const before = await readFile(path, 'utf8')
          const after = fix(before)
          if (after !== before) {
            await writeFile(path, after)
            changed++
          }
        }
        logger.info(`content images (sizes, the first one loaded first): ${changed} pages`)
      },
    },
  }
}
