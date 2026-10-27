// Astro integration (astro.config.mjs): after the build, each page its own share image (TODO #98, Christian 2026-10-27):
// the first photo of its content (an optimized image, not a drawing: SVG left out), its widest size cropped to
// 1200 x 630 (the share cards' size; the crop keeps the image's most detailed part, sharp's « attention ») into
// og/<image>.jpg, and the page's og:image, twitter:image and og:image:alt pointed at it. A page without a photo keeps
// the site's image (routeData.js: public/images/og-lock21.jpg), and so do the two home pages (that image is their
// render, cropped by hand). The French and English pages of a photo share its file.
// The dev server keeps the site's image.
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const WIDTH = 1200
const HEIGHT = 630
const ORIGIN = 'https://lock21.info'

async function* pages(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!['_astro', 'pagefind', 'viewer', 'og'].includes(entry.name)) yield* pages(path)
    } else if (entry.name.endsWith('.html')) yield path
  }
}

/** The first photo of the page's content: its widest file (src or srcset) and its alt text, or null */
function firstPhoto(html) {
  const start = html.indexOf('class="sl-markdown-content')
  if (start < 0) return null
  for (const [tag] of html.slice(start).matchAll(/<img\b[^>]*>/g)) {
    const src = tag.match(/\ssrc="([^"]+)"/)?.[1]
    if (!src || !src.startsWith('/_astro/') || /\.svg(\?|$)/i.test(src)) continue
    let best = { url: src, width: 0 }
    for (const part of tag.match(/\ssrcset="([^"]+)"/)?.[1]?.split(',') ?? []) {
      const [url, size] = part.trim().split(/\s+/)
      const width = parseInt(size, 10) || 0
      if (url && width > best.width) best = { url, width }
    }
    const alt = (tag.match(/\salt="([^"]*)"/)?.[1] ?? '').trim()
    return { url: best.url.split('?')[0], alt }
  }
  return null
}

/** @returns {import('astro').AstroIntegration} */
export default function shareImages() {
  return {
    name: 'lock21-share-images',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const root = fileURLToPath(dir)
        await mkdir(join(root, 'og'), { recursive: true })
        let changed = 0
        const made = new Set()
        for await (const path of pages(root)) {
          // (the two home pages keep the site's image: it is the home page's render, cropped by hand)
          if (/^(en[\\/])?index\.html$/.test(relative(root, path))) continue
          const html = await readFile(path, 'utf8')
          const photo = firstPhoto(html)
          if (!photo) continue
          const file = join(root, photo.url)
          if (!existsSync(file)) continue
          const name = `${photo.url.split('/').pop().replace(/\.[a-z0-9]+$/i, '')}.jpg`
          if (!made.has(name)) {
            await sharp(file).resize(WIDTH, HEIGHT, { fit: 'cover', position: sharp.strategy.attention }).jpeg({ quality: 82, mozjpeg: true }).toFile(join(root, 'og', name))
            made.add(name)
          }
          const url = `${ORIGIN}/og/${name}`
          let out = html
            .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${url}$2`)
            .replace(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${url}$2`)
          if (photo.alt) out = out.replace(/(<meta property="og:image:alt" content=")[^"]*(")/, `$1${photo.alt}$2`)
          if (out !== html) {
            await writeFile(path, out)
            changed++
          }
        }
        logger.info(`share images: ${made.size} images, ${changed} pages`)
      },
    },
  }
}
