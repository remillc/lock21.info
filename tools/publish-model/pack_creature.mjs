// Packs a creature model for the viewer: one .glb, textures 1024 px WebP, unused data removed (its rig kept).
//
// Usage: node tools/publish-model/pack_creature.mjs <in.gltf|glb> <out.glb>
//        node tools/publish-model/pack_creature.mjs -h | --help
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, prune, textureCompress } from '@gltf-transform/functions'
import sharp from 'sharp'

if (process.argv.slice(2).some((a) => a === '-h' || a === '--help')) {
  const { readFileSync } = await import('node:fs')
  const { fileURLToPath } = await import('node:url')
  const header = readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//'))
  console.log(header.map((l) => l.replace(/^\/\/ ?/, '')).join('\n'))
  process.exit(0)
}
const [src, out] = process.argv.slice(2)
if (!src || !out) throw new Error('usage: node pack_creature.mjs <in> <out.glb>')
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const doc = await io.read(src)
await doc.transform(dedup(), prune(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024] }))
await io.write(out, doc)
console.log('written', out)
