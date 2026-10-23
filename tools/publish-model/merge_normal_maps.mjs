// Adds the normal maps (relief, bake_relief.py) to a zone's tiles, from a second Obj2Tiles run.
//
// Obj2Tiles mishandles normal maps: it repacks them per tile in a layout that doesn't match the texture
// coordinates (black areas and streaks, about a quarter of zone 12), and encodes them in ETC1S tagged sRGB
// like a photo (blocks, bent normals). tile_zone.ps1 therefore tiles the zone twice: once with the photo
// (normal map ignored), once with the normal map given as the photo (map_Kd), in UASTC. The packing only depends
// on the geometry and texture coordinates, so both runs give the same tiles with the same layout; this script
// checks that, then puts the second run's texture into each tile of the first as its normalTexture, tagged
// linear (data, not colour). Only in the finest level's tiles (LOD-0): from the distance a coarser level is seen at,
// the relief hardly shows, and its normal maps weighed more than its photo (TODO #55, 2026-10-23): downloaded for
// nothing, the viewer dropping them (main.js, coarseWithoutRelief).
//
// Usage: node merge_normal_maps.mjs <tileset folder> <tileset folder of the normal-map run>
//        node merge_normal_maps.mjs -h | --help
import { readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'

// -h/--help: print the header comment of this file
if (process.argv.slice(2).some((a) => a === '-h' || a === '--help')) {
  const { readFileSync } = await import('node:fs')
  const { fileURLToPath } = await import('node:url')
  const header = readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//'))
  console.log(header.map((l) => l.replace(/^\/\/ ?/, '')).join('\n'))
  process.exit(0)
}

const [root, normalRoot] = process.argv.slice(2)
if (!root || !normalRoot) throw new Error('usage: node merge_normal_maps.mjs <tileset folder> <normal-map run folder>')

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)

async function* glbFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* glbFiles(path)
    else if (entry.name.endsWith('.glb')) yield path
  }
}

// KTX2 Data Format Descriptor: transfer function byte of the basic block (1 linear, 2 sRGB)
function tagLinear(ktx2) {
  const out = new Uint8Array(ktx2)
  const view = new DataView(out.buffer, out.byteOffset, out.byteLength)
  const dfd = view.getUint32(48, true)
  out[dfd + 4 + 8 + 2] = 1
  return out
}

const uvs = (document) =>
  document.getRoot().listMeshes().flatMap((m) => m.listPrimitives().map((p) => p.getAttribute('TEXCOORD_0').getArray()))

let count = 0
let skipped = 0
for await (const path of glbFiles(root)) {
  const rel = relative(root, path)
  // The finest level only (see the header)
  if (!/^LOD-0[\\/]/.test(rel)) {
    skipped++
    continue
  }
  const document = await io.read(path)
  const normalDocument = await io.read(join(normalRoot, rel))
  // Same tile, same layout: identical texture coordinates
  const [a, b] = [uvs(document), uvs(normalDocument)]
  if (a.length !== b.length || a.some((arr, i) => arr.length !== b[i].length || arr.some((v, j) => v !== b[i][j]))) {
    throw new Error(`${rel}: the two Obj2Tiles runs differ (texture coordinates); cannot merge`)
  }
  // Matched by name: the runs can list an unused "default" material at different positions
  const normalMaterials = new Map(normalDocument.getRoot().listMaterials().map((m) => [m.getName(), m]))
  document.getRoot().listMaterials().forEach((material) => {
    if (!material.getBaseColorTexture()) return
    const source = normalMaterials.get(material.getName())?.getBaseColorTexture()
    if (!source) throw new Error(`${rel}: no texture in the normal-map run for material ${material.getName()}`)
    const texture = document.createTexture(`${material.getName()}-normal`)
      .setImage(tagLinear(source.getImage()))
      .setMimeType(source.getMimeType())
    material.setNormalTexture(texture)
  })
  await io.write(path, document)
  count++
}
console.log(`normal maps: ${count} tiles of the finest level (${skipped} coarser tiles left without)`)
