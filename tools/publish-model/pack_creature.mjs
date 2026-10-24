// Packs a creature model for the viewer: one .glb, textures 1024 px WebP, unused data removed (its rig kept).
// -m/--meshopt: the geometry compressed too (EXT_meshopt_compression, as the tiles: the viewer's loader needs the
// meshopt decoder), about three times smaller (TODO #64, the diver's arm); -s/--simplify <ratio>: and simplified to
// that share of its triangles where the error stays under 0.1 % of its size (meshoptimizer).
//
// Usage: node tools/publish-model/pack_creature.mjs <in.gltf|glb> <out.glb> [-m|--meshopt] [-s|--simplify 0.6]
//        node tools/publish-model/pack_creature.mjs -h | --help
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, meshopt, prune, simplify, textureCompress, weld } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'
import sharp from 'sharp'

if (process.argv.slice(2).some((a) => a === '-h' || a === '--help')) {
  const { readFileSync } = await import('node:fs')
  const { fileURLToPath } = await import('node:url')
  const header = readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//'))
  console.log(header.map((l) => l.replace(/^\/\/ ?/, '')).join('\n'))
  process.exit(0)
}
const args = process.argv.slice(2)
const ratioAt = Math.max(args.indexOf('-s'), args.indexOf('--simplify'))
const ratio = ratioAt >= 0 ? Number(args[ratioAt + 1]) : null
const compress = args.includes('-m') || args.includes('--meshopt')
const [src, out] = args.filter((a, i) => !a.startsWith('-') && !(ratioAt >= 0 && i === ratioAt + 1))
if (!src || !out) throw new Error('usage: node pack_creature.mjs <in> <out.glb>')
await MeshoptEncoder.ready
await MeshoptDecoder.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder })
const doc = await io.read(src)
await doc.transform(dedup(), prune(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024] }))
if (ratio) {
  await MeshoptSimplifier.ready
  await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.001 }))
}
if (compress) await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }))
await io.write(out, doc)
console.log('written', out)
