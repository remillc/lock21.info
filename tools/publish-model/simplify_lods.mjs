// Simplifies the coarse levels of detail of a tileset produced by Obj2Tiles, which keeps far too many
// triangles there (zone 12: 326 k triangles in the coarsest level, about a third of the full mesh).
//
// - coarsest content level: down to about --coarse-tris triangles for the whole zone
// - next level: down to about --mid-tris triangles, tile borders locked so neighbouring tiles still meet
// - the finest level is left untouched
// Simplification stops early if the error would exceed --*-error (fraction of the tile's extent).
// Each tile's geometricError is raised by the error meshoptimizer actually measured (not the bound):
// an over-estimated error makes the viewer refine too early and load far more than needed.
// Must run before compress_tiles.mjs (positions as plain floats).
//
// Usage: node simplify_lods.mjs <tileset folder> [--coarse-tris 40000] [--mid-tris 150000]
//                                               [--coarse-error 0.02] [--mid-error 0.01]
//        node simplify_lods.mjs -h | --help
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Logger, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { compactPrimitive, weld } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'

// -h/--help: print the header comment of this file
if (process.argv.slice(2).some((a) => a === '-h' || a === '--help')) {
  const { readFileSync } = await import('node:fs')
  const { fileURLToPath } = await import('node:url')
  const header = readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//'))
  console.log(header.map((l) => l.replace(/^\/\/ ?/, '')).join('\n'))
  process.exit(0)
}

const argv = process.argv.slice(2)
const dir = argv[0]
const option = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 ? Number(argv[i + 1]) : fallback
}
const levels = [
  { name: 'coarse', tris: option('coarse-tris', 40000), error: option('coarse-error', 0.02), flags: [] },
  { name: 'mid', tris: option('mid-tris', 150000), error: option('mid-error', 0.01), flags: ['LockBorder'] },
]

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready])
const io = new NodeIO()
  .setLogger(new Logger(Logger.Verbosity.WARN))
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder })

const tilesetPath = join(dir, 'tileset.json')
const tileset = JSON.parse(await readFile(tilesetPath, 'utf8'))

// Nodes with content, grouped by depth; the shallowest group is the coarsest level
const byDepth = new Map()
const walk = (node, depth) => {
  if (node.content?.uri) byDepth.set(depth, [...(byDepth.get(depth) || []), node])
  for (const child of node.children || []) walk(child, depth + 1)
}
walk(tileset.root, 0)
const depths = [...byDepth.keys()].sort((a, b) => a - b)

function triangles(document) {
  let n = 0
  for (const mesh of document.getRoot().listMeshes())
    for (const prim of mesh.listPrimitives()) n += prim.getIndices().getCount() / 3
  return n
}

// Simplifies every primitive of a tile; returns the largest absolute error (in tile units, metres)
function simplifyDocument(document, ratio, relativeError, flags) {
  let worst = 0
  for (const mesh of document.getRoot().listMeshes())
    for (const prim of mesh.listPrimitives()) {
      const positions = new Float32Array(prim.getAttribute('POSITION').getArray())
      const indices = new Uint32Array(prim.getIndices().getArray())
      const target = Math.max(3, Math.floor((indices.length * ratio) / 3) * 3)
      const [result, error] = MeshoptSimplifier.simplify(indices, positions, 3, target, relativeError, flags)
      worst = Math.max(worst, error * MeshoptSimplifier.getScale(positions, 3))
      prim.getIndices().setArray(result)
      compactPrimitive(prim)
    }
  return worst
}

// Only the levels above the finest one are simplified
for (const [i, level] of levels.entries()) {
  const depth = depths[i]
  if (depth === undefined || i >= depths.length - 1) break
  const nodes = byDepth.get(depth)
  const docs = await Promise.all(nodes.map((node) => io.read(join(dir, node.content.uri))))
  for (const doc of docs) await doc.transform(weld())
  const total = docs.reduce((sum, doc) => sum + triangles(doc), 0)
  const ratio = Math.min(1, level.tris / total)
  let after = 0
  let maxError = 0
  for (const [k, node] of nodes.entries()) {
    const error = simplifyDocument(docs[k], ratio, level.error, level.flags)
    after += triangles(docs[k])
    maxError = Math.max(maxError, error)
    node.geometricError = (node.geometricError || 0) + error
    await io.write(join(dir, node.content.uri), docs[k])
  }
  console.log(`simplification ${level.name}: ${nodes.length} tuiles, ${Math.round(total).toLocaleString('fr-CA')} -> ` +
    `${Math.round(after).toLocaleString('fr-CA')} triangles, erreur max ${(maxError * 100).toFixed(1)} cm`)
}

// A parent's error must never be below its children's
const fixErrors = (node) => {
  const childMax = Math.max(0, ...(node.children || []).map(fixErrors))
  node.geometricError = Math.max(node.geometricError || 0, childMax)
  return node.geometricError
}
fixErrors(tileset.root)
tileset.geometricError = Math.max(tileset.geometricError || 0, tileset.root.geometricError)
await writeFile(tilesetPath, JSON.stringify(tileset))
