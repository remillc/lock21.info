// Caps the textures of a tile set's coarser levels (every level but the finest, LOD-0) at a maximum size, in place,
// on a version being made (tile_zone.ps1, before publication: a published version is never rewritten). Obj2Tiles
// halves the zone's photo at each level, so the coarsest tile's texture followed the photo's size, 1,004 to 4,096 px
// from one zone to another (Christian, 2026-10-24: they should be standardized), for a tile only seen from afar while
// the finer ones arrive: 0.4 to 3.6 MB. The KTX2 textures carry their whole chain of mip levels: the largest levels
// are dropped, the others kept as they are (no new encoding: the image is the one the GPU showed from afar anyway).
//
// Usage: node cap_coarse_textures.mjs <version folder> [-m|--max 2048]
//        node cap_coarse_textures.mjs -h | --help
import { readdir, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { Logger, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { read as readKtx, write as writeKtx } from 'ktx-parse'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'

// -h/--help: print the header comment of this file
if (process.argv.slice(2).some((a) => a === '-h' || a === '--help')) {
  const { readFileSync } = await import('node:fs')
  const { fileURLToPath } = await import('node:url')
  const header = readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//'))
  console.log(header.map((l) => l.replace(/^\/\/ ?/, '')).join('\n'))
  process.exit(0)
}

const args = process.argv.slice(2)
const maxIndex = Math.max(args.indexOf('-m'), args.indexOf('--max'))
const max = maxIndex >= 0 ? Number(args[maxIndex + 1]) : 2048
const folder = args.find((a, i) => !a.startsWith('-') && i !== maxIndex + 1)
if (!folder || !(max > 0)) throw new Error('usage: node cap_coarse_textures.mjs <version folder> [-m|--max 2048]')

await MeshoptEncoder.ready
await MeshoptDecoder.ready
const io = new NodeIO()
  .setLogger(new Logger(Logger.Verbosity.WARN))
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder })

async function* files(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* files(path)
    else yield path
  }
}

/**
 * The KTX2 texture without its mip levels larger than `max`, or null when it already fits
 * @param {Uint8Array} bytes
 * @returns {Uint8Array | null}
 */
function capKtx(bytes) {
  const ktx = readKtx(bytes)
  let drop = 0
  // Down to the cap, but never to a size that is not a multiple of 4: such a compressed texture can show black (see
  // README, step 5); it then keeps the last size that is one
  const fits = (n) => (ktx.pixelWidth >> n) % 4 === 0 && (ktx.pixelHeight >> n) % 4 === 0
  while (Math.max(ktx.pixelWidth >> drop, ktx.pixelHeight >> drop) > max && drop < ktx.levels.length - 1 && fits(drop + 1)) drop++
  if (!drop) return null
  ktx.levels.splice(0, drop)
  ktx.levelCount = ktx.levels.length
  ktx.pixelWidth = Math.max(1, ktx.pixelWidth >> drop)
  ktx.pixelHeight = Math.max(1, ktx.pixelHeight >> drop)
  // BasisLZ (ETC1S): one image description per level (each layer and face), the levels' first
  if (ktx.globalData) ktx.globalData.imageDescs.splice(0, drop * Math.max(1, ktx.layerCount) * ktx.faceCount)
  return writeKtx(ktx)
}

let before = 0
let after = 0
let capped = 0
for await (const path of files(folder)) {
  const rel = relative(folder, path)
  if (!rel.endsWith('.glb') || /^LOD-0[\\/]/.test(rel)) continue
  const document = await io.read(path)
  let changed = false
  for (const texture of document.getRoot().listTextures()) {
    if (texture.getMimeType() !== 'image/ktx2') continue
    const image = capKtx(texture.getImage())
    if (!image) continue
    texture.setImage(image)
    changed = true
  }
  if (!changed) continue
  before += (await stat(path)).size
  await io.write(path, document)
  after += (await stat(path)).size
  capped++
}
console.log(`textures plafonnées à ${max} px: ${capped} tuiles, ${(before / 1e6).toFixed(1)} Mo -> ${(after / 1e6).toFixed(1)} Mo`)
