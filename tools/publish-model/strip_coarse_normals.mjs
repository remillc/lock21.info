// Copies a published tileset version into a new version without the normal maps (relief) of its coarser levels:
// only the finest level's tiles (LOD-0) keep them, as merge_normal_maps.mjs now grafts them (TODO #55,
// 2026-10-23). For the versions published before that change, without baking the relief again. A version is
// never modified once written: the copy is a new dated folder; the manifest is then pointed at it
// (update_manifest.py, done by the caller).
//
// Usage: node strip_coarse_normals.mjs <version folder> <new version folder>
//        node strip_coarse_normals.mjs -h | --help
import { copyFile, mkdir, readdir, stat } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { Logger, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { prune } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'

// -h/--help: print the header comment of this file
if (process.argv.slice(2).some((a) => a === '-h' || a === '--help')) {
  const { readFileSync } = await import('node:fs')
  const { fileURLToPath } = await import('node:url')
  const header = readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//'))
  console.log(header.map((l) => l.replace(/^\/\/ ?/, '')).join('\n'))
  process.exit(0)
}

const [source, target] = process.argv.slice(2)
if (!source || !target) throw new Error('usage: node strip_coarse_normals.mjs <version folder> <new version folder>')

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

let before = 0
let after = 0
let stripped = 0
for await (const path of files(source)) {
  const rel = relative(source, path)
  const out = join(target, rel)
  await mkdir(dirname(out), { recursive: true })
  // The finest level, the tileset and anything else: copied as they are
  if (!rel.endsWith('.glb') || /^LOD-0[\\/]/.test(rel)) {
    await copyFile(path, out)
    continue
  }
  before += (await stat(path)).size
  const document = await io.read(path)
  for (const material of document.getRoot().listMaterials()) material.setNormalTexture(null)
  await document.transform(prune({ propertyTypes: ['Texture'] }))
  await io.write(out, document)
  after += (await stat(out)).size
  stripped++
}
console.log(`coarser tiles: ${stripped}, ${(before / 1e6).toFixed(1)} MB -> ${(after / 1e6).toFixed(1)} MB`)
