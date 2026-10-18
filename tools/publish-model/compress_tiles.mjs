// Compresses the geometry of every tile (.glb) of a tileset with meshopt (EXT_meshopt_compression), after
// reordering and quantizing it (KHR_mesh_quantization). KTX2 textures are kept as they are.
// The viewer needs the meshopt decoder (GLTFLoader.setMeshoptDecoder).
//
// Usage: node compress_tiles.mjs <tileset folder>
import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { Logger, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { meshopt } from '@gltf-transform/functions'
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer'

const root = process.argv[2]
if (!root) throw new Error('usage: node compress_tiles.mjs <tileset folder>')

await MeshoptEncoder.ready
await MeshoptDecoder.ready
const io = new NodeIO()
  .setLogger(new Logger(Logger.Verbosity.WARN))
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder })

async function* glbFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* glbFiles(path)
    else if (entry.name.endsWith('.glb')) yield path
  }
}

let before = 0
let after = 0
let count = 0
for await (const path of glbFiles(root)) {
  before += (await stat(path)).size
  const document = await io.read(path)
  await document.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }))
  await io.write(path, document)
  after += (await stat(path)).size
  count++
}
console.log(`compression: ${count} tuiles, ${(before / 1e6).toFixed(1)} Mo -> ${(after / 1e6).toFixed(1)} Mo`)
