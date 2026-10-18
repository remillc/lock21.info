// Simplifies the coarse levels of detail of a tileset produced by Obj2Tiles, which keeps far too many
// triangles there (zone 12: 418 k triangles in the coarsest level, about a third of the full mesh).
//
// - coarsest content level: down to about --coarse-tris triangles for the whole zone
// - next level: down to about --mid-tris triangles, tile borders locked so neighbouring tiles still meet
// - the finest level is left untouched
// Simplification stops early if the error would exceed --*-error (fraction of each tile's extent).
// Each simplified tile's geometricError is raised by that error bound, so the viewer refines in time.
//
// Usage: node simplify_lods.mjs <tileset folder> [--coarse-tris 40000] [--mid-tris 150000]
//                                               [--coarse-error 0.02] [--mid-error 0.01]
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Logger, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { simplify, weld } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'

const argv = process.argv.slice(2)
const dir = argv[0]
const option = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 ? Number(argv[i + 1]) : fallback
}
const levels = [
  { name: 'coarse', tris: option('coarse-tris', 40000), error: option('coarse-error', 0.02), lockBorder: false },
  { name: 'mid', tris: option('mid-tris', 150000), error: option('mid-error', 0.01), lockBorder: true },
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
    for (const prim of mesh.listPrimitives()) n += (prim.getIndices()?.getCount() ?? prim.getAttribute('POSITION').getCount()) / 3
  return n
}

// Tile size from its bounding box in tileset.json: reliable even if the geometry is already quantized
function extent(node) {
  const box = node.boundingVolume?.box
  if (!box) return 0
  const axes = [box.slice(3, 6), box.slice(6, 9), box.slice(9, 12)]
  return 2 * Math.max(...axes.map((a) => Math.hypot(...a)))
}

// Only the levels above the finest one are simplified
for (const [i, level] of levels.entries()) {
  const depth = depths[i]
  if (depth === undefined || i >= depths.length - 1) break
  const nodes = byDepth.get(depth)
  const docs = await Promise.all(nodes.map((node) => io.read(join(dir, node.content.uri))))
  const total = docs.reduce((sum, doc) => sum + triangles(doc), 0)
  const ratio = Math.min(1, level.tris / total)
  let after = 0
  for (const [k, node] of nodes.entries()) {
    const doc = docs[k]
    const size = extent(node)
    await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio, error: level.error, lockBorder: level.lockBorder }))
    after += triangles(doc)
    node.geometricError = (node.geometricError || 0) + level.error * size
    await io.write(join(dir, node.content.uri), doc)
  }
  console.log(`simplification ${level.name}: ${nodes.length} tuiles, ${Math.round(total).toLocaleString('fr-CA')} -> ${Math.round(after).toLocaleString('fr-CA')} triangles`)
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
