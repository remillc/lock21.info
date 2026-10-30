// The site's app icons (TODO #81, the PWA's manifests: public/manifest.webmanifest, public/manifest-en.webmanifest), drawn
// from the favicon (public/favicon.svg, the « 21 en écho » logo on its rounded tile) with sharp:
// - icon-192.png, icon-512.png: the tile as it is (purpose « any »);
// - icon-maskable-512.png: the tile's colour to the edges, the figures scaled to 90 %, their corners within the middle
//   80 % circle that every mask keeps (purpose « maskable »: the phone cuts its own shape, circle or squircle, out of it);
// - apple-touch-icon.png (180 px): iOS rounds the corners itself, so the tile square.
// Run again after the logo changes: node tools/pwa/make_icons.mjs [-o public/icons]
import { readFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

const args = process.argv.slice(2)
if (args.includes('-h') || args.includes('--help')) {
  console.log('node tools/pwa/make_icons.mjs [-o|--out <folder>]\nThe PWA icons from public/favicon.svg (default folder public/icons).')
  process.exit(0)
}
const at = Math.max(args.indexOf('-o'), args.indexOf('--out'))
const out = at >= 0 ? args[at + 1] : 'public/icons'
mkdirSync(out, { recursive: true })

const svg = readFileSync('public/favicon.svg', 'utf8')
const tile = svg.match(/fill="(#[0-9a-f]{6})"/i)[1]
// The figures alone, without the tile, on a square of the tile's colour: scaled into the middle `share` of the icon
const figures = (share) =>
  svg
    .replace(/<rect[^>]*\/>/, `<rect width="64" height="64" fill="${tile}"/>`)
    .replace(/(<path)/, `<g transform="translate(32 32) scale(${share}) translate(-32 -32)">$1`)
    .replace('</svg>', '</g></svg>')

const render = (source, size, name) =>
  sharp(Buffer.from(source), { density: (72 * size) / 64 })
    .resize(size, size)
    .png()
    .toFile(join(out, name))
    .then(() => console.log(join(out, name)))

await render(svg, 192, 'icon-192.png')
await render(svg, 512, 'icon-512.png')
await render(figures(0.9), 512, 'icon-maskable-512.png')
await render(figures(1), 180, 'apple-touch-icon.png')
