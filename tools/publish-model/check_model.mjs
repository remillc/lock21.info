// Checks a downloadable model (.glb, tools/google-earth/make_model.py) before it goes online (Christian, 2026-10-25:
// « nobody checks the GLB »): exactly one UV set per primitive (a Boolean once added its cutter's, the first all zero:
// the chart terrain without texture in Google Earth), a texture on every material, readable, used UVs inside the
// image, the triangle count and the size plausible, the copyright and licence in asset. Prints a report; exit code 1
// if anything fails. The picture: tools/google-earth/preview_model.py (Blender).
//
// Usage: node tools/publish-model/check_model.mjs <model.glb> [-t|--triangles <expected>] [-v|--verbose]
//        node tools/publish-model/check_model.mjs -h | --help
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { MeshoptDecoder } from 'meshoptimizer'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const args = process.argv.slice(2)
if (!args.length || args.some((a) => a === '-h' || a === '--help')) {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//'))
    .map((l) => l.replace(/^\/\/ ?/, '')).join('\n'))
  process.exit(0)
}
const at = Math.max(args.indexOf('-t'), args.indexOf('--triangles'))
const expected = at >= 0 ? Number(args[at + 1]) : null
const verbose = args.includes('-v') || args.includes('--verbose')
const file = args.find((a, i) => !a.startsWith('-') && !(at >= 0 && i === at + 1))

await MeshoptDecoder.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder })
const doc = await io.read(file)
const root = doc.getRoot()
const problems = []
const fail = (message) => problems.push(message)

// asset: copyright and licence (glb_metadata.py)
const asset = root.getAsset()
if (!/Christian Rémillard/.test(asset.copyright ?? '')) fail('asset.copyright missing')
if (!asset.extras?.lock21?.license) fail('asset.extras.lock21.license missing')

let triangles = 0
const min = [Infinity, Infinity, Infinity]
const max = [-Infinity, -Infinity, -Infinity]
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const name = mesh.getName() || '(mesh)'
    const uvSets = prim.listSemantics().filter((s) => s.startsWith('TEXCOORD'))
    const index = prim.getIndices()
    const count = index ? index.getCount() / 3 : prim.getAttribute('POSITION').getCount() / 3
    triangles += count
    const pos = prim.getAttribute('POSITION')
    const pmin = pos.getMin([])
    const pmax = pos.getMax([])
    for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], pmin[k]); max[k] = Math.max(max[k], pmax[k]) }
    const material = prim.getMaterial()
    const texture = material?.getBaseColorTexture()
    // A plain colour (the fillers, flat colours in the .blend) needs no texture nor UVs; without a material at all,
    // the object would show white
    if (!texture) {
      if (!material) fail(`${name}: no material`)
      if (verbose) console.log(`  ${name}: ${count.toLocaleString('en')} triangles, plain colour`)
      continue
    }
    if (uvSets.length !== 1) fail(`${name}: ${uvSets.length} UV sets (${uvSets.join(', ') || 'none'}), expected 1`)
    // The UVs used: inside the image (0 to 1, a little margin), and not all the same point (a dead set)
    const uv = prim.getAttribute(uvSets[0] ?? 'TEXCOORD_0')
    if (uv) {
      const lo = uv.getMin([])
      const hi = uv.getMax([])
      if (hi[0] - lo[0] < 1e-4 || hi[1] - lo[1] < 1e-4) fail(`${name}: UVs all at one point (${lo.map((v) => v.toFixed(3))})`)
      if (lo[0] < -0.01 || lo[1] < -0.01 || hi[0] > 1.01 || hi[1] > 1.01) fail(`${name}: UVs outside the image (${lo.map((v) => v.toFixed(2))} .. ${hi.map((v) => v.toFixed(2))})`)
    }
    if (verbose) console.log(`  ${name}: ${count.toLocaleString('en')} triangles, ${uvSets.join(',')}, ${texture.getMimeType()}`)
  }
}
// Every texture readable
for (const texture of root.listTextures()) {
  try {
    const meta = await sharp(Buffer.from(texture.getImage())).metadata()
    if (!meta.width || !meta.height) fail(`texture ${texture.getName() || texture.getURI()}: no size`)
  } catch (error) {
    fail(`texture ${texture.getName() || texture.getURI()}: unreadable (${error.message})`)
  }
}
if (expected && Math.abs(triangles - expected) > expected * 0.15) fail(`${triangles.toLocaleString('en')} triangles, expected about ${expected.toLocaleString('en')}`)
// On the site's scale (the augmented reality model is at 1:100: asset.extras.lock21.scale, glb_metadata.py)
const scale = Number(asset.extras?.lock21?.scale) || 1
const size = max.map((v, k) => (v - min[k]) / scale)
// The site: about 200 m across with the chart terrain, the zones alone about 100 m; up and down tens of metres
if (size[0] > 2000 || size[2] > 2000 || size[1] > 200) fail(`size ${size.map((v) => v.toFixed(0)).join(' x ')} m: too large`)
if (size[0] < 1 || size[2] < 1) fail(`size ${size.map((v) => v.toFixed(1)).join(' x ')} m: too small`)

console.log(`${file}: ${root.listMeshes().length} meshes, ${root.listTextures().length} textures, ${triangles.toLocaleString('en')} triangles, ` +
  `${size.map((v) => v.toFixed(0)).join(' x ')} m (x, y up, z)${scale !== 1 ? ` on the site, at 1:${Math.round(1 / scale)}` : ''}`)
if (problems.length) {
  for (const p of problems) console.log(`  PROBLEM: ${p}`)
  process.exit(1)
}
console.log('  ok')
