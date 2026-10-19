import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { TilesRenderer } from '3d-tiles-renderer'
import { N8AOPass } from 'n8ao'

// Root of the published tiles (manifest.json + tilesets). Override with ?tiles=<url> (e.g. phone tests on the LAN)
const params = new URLSearchParams(location.search)
const TILES_URL = params.get('tiles') || import.meta.env.VITE_TILES_URL || 'http://localhost:8081'

// Embedded in the site's /modele/ page (an iframe): no "back" link, and the camera is reported to the page
const embedded = window.self !== window.top
document.documentElement.classList.toggle('embedded', embedded)

// Full screen: works standalone and embedded (the iframe allows it)
const fullscreenButton = document.querySelector('.fullscreen')
if (document.fullscreenEnabled) {
  fullscreenButton.hidden = false
  fullscreenButton.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen()
  })
  document.addEventListener('fullscreenchange', () => {
    fullscreenButton.setAttribute('aria-label', document.fullscreenElement ? 'Quitter le plein écran' : 'Plein écran')
  })
}

const container = document.getElementById('viewer')
const status = document.getElementById('status')

// Phones: coarser detail and a smaller memory budget (Safari iOS reloads the page beyond ~1-1.5 GB).
// ?profile=mobile|desktop forces a profile (tests on the PC).
const mobile = params.get('profile') ? params.get('profile') === 'mobile' : window.matchMedia('(pointer: coarse)').matches
const profile = mobile
  ? { errorTarget: 12, maxBytes: 450e6, pixelRatio: Math.min(window.devicePixelRatio, 1.5) }
  : { errorTarget: 6, maxBytes: 1200e6, pixelRatio: Math.min(window.devicePixelRatio, 2) }

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(profile.pixelRatio)
renderer.setSize(container.clientWidth, container.clientHeight)
container.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0b1c26)
const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.05, 2000)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// Draw only when something changed (camera, tiles, size): a scene redrawn 60 times per second for nothing
// kept the phone's GPU at 100 % and made it very hot.
let needsRender = true
const requestRender = () => { needsRender = true }
controls.addEventListener('change', requestRender)

const ktx2Loader = new KTX2Loader().setTranscoderPath(`${import.meta.env.BASE_URL}vendor/basis/`).detectSupport(renderer)

// Sharper textures on surfaces seen at a grazing angle (floors, walls along the line of sight)
const maxAnisotropy = renderer.capabilities.getMaxAnisotropy()

// The photogrammetry texture already contains the lighting: display it unlit.
// Double-sided: photogrammetry surfaces are open and are seen from both sides.
// gain: the zone's colour balance (see colorBalance), multiplied with the texture. Zones (not the context)
// also get the green removal (despill).
// Obj2Tiles sets the tiles' textures to NEAREST_MIPMAP_LINEAR (nearest texel within a mipmap level), which
// shimmers when the camera moves: trilinear filtering instead
function smoothFiltering(texture) {
  if (!texture) return
  texture.anisotropy = maxAnisotropy
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
}

function unlitMaterial(old, gain, zone = false) {
  smoothFiltering(old.map)
  const color = old.map ? gain || new THREE.Color(1, 1, 1) : old.color
  const material = new THREE.MeshBasicMaterial({ map: old.map, color, side: THREE.DoubleSide })
  if (zone && despill.value > 0) material.onBeforeCompile = addDespill
  return material
}

// Green removal ("spill suppression", as for green screens): each pixel's green is capped at the larger of its
// red and blue. Brown, beige and grey pixels (red >= green) are untouched; only pixels where green dominates
// (algae, the water's cast in patches) turn olive or grey-brown. A per-zone colour gain cannot do that: it
// shifts the whole zone, and the green patches stay green. ?despill=0..1 sets the strength (default 1).
const despill = { value: params.has('despill') ? Number(params.get('despill')) : 1 }
function addDespill(shader) {
  shader.uniforms.despill = despill
  shader.fragmentShader = shader.fragmentShader
    .replace('void main() {', 'uniform float despill;\nvoid main() {')
    .replace(
      '#include <map_fragment>',
      '#include <map_fragment>\n' +
        'diffuseColor.g = mix(diffuseColor.g, min(diffuseColor.g, max(diffuseColor.r, diffuseColor.b)), despill);',
    )
}

// Relief (test, ?relief=1): tiles that carry a normal map (tools/publish-model/bake_relief.py: object-space
// normals of the high-res export, zebra mussels included) are lit instead of shown unlit. Object space: no
// vertex normals or tangents needed, the tiles have none. Lambert lighting divides by pi, hence the factor.
// Ambient + one directional light; ?light=azimuth,elevation (degrees, default 135,45) orients it,
// ?shade=0..1 (default 0.6) is the directional share: 0 is flat, 1 is hard shadows-like contrast.
// ?relief=debug shows the normal map itself as the colour (checks that it lines up with the photo texture)
const relief = params.get('relief') === '1' || params.get('relief') === 'debug'
const [lightAzimuth, lightElevation] = (params.get('light') || '135,45').split(',').map(Number)
const shade = params.has('shade') ? Number(params.get('shade')) : 0.6
// Wet look (test, ?wet=0..1, needs ?relief=1): glossy surface with a clear-coat film (sharp highlights that slide
// over the relief when the camera moves), reflections of a neutral environment, colours slightly darker and more
// saturated. The photos already hold the lamps' real reflections: keep it subtle.
// Default 0.15 (chosen on zone 12); ?wet=0 turns it off
const wet = Math.min(Math.max(params.has('wet') ? Number(params.get('wet')) || 0 : 0.15, 0), 1)
function reliefMaterial(old, gain) {
  smoothFiltering(old.map)
  smoothFiltering(old.normalMap)
  // Obj2Tiles tags every KTX2 texture sRGB, normal maps included: the GPU would then apply the sRGB curve to
  // the normals and bend them. Data, not colour (set before the first upload, which picks the GPU format).
  old.normalMap.colorSpace = THREE.NoColorSpace
  if (params.get('relief') === 'debug') return new THREE.MeshBasicMaterial({ map: old.normalMap, side: THREE.DoubleSide })
  const options = {
    map: old.map,
    normalMap: old.normalMap,
    normalMapType: THREE.ObjectSpaceNormalMap,
    color: gain || new THREE.Color(1, 1, 1),
    side: THREE.DoubleSide,
    // The tiles have no vertex normals: face normals from screen derivatives keep the unperturbed normal valid
    // (three.js uses it for specular antialiasing); the object-space normal map replaces it for lighting
    flatShading: true,
  }
  const material = wet > 0
    ? new THREE.MeshPhysicalMaterial({
      ...options,
      metalness: 0,
      roughness: 0.9 - 0.5 * wet,
      clearcoat: wet,
      clearcoatRoughness: 0.08,
      envMapIntensity: 0.6 * wet,
    })
    : new THREE.MeshLambertMaterial(options)
  material.onBeforeCompile = (shader) => {
    if (despill.value > 0) addDespill(shader)
    if (wet > 0) {
      shader.fragmentShader = shader.fragmentShader
        // Wet colours: darker and more saturated
        .replace('#include <map_fragment>', `#include <map_fragment>
          float wetLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
          diffuseColor.rgb = mix(vec3(wetLuma), diffuseColor.rgb, ${(1 + 0.35 * wet).toFixed(3)}) * ${(1 - 0.2 * wet).toFixed(3)};`)
        // The clear coat follows the relief (by default it would use the flat face normal: faceted highlights)
        .replace('#include <clearcoat_normal_fragment_begin>', 'vec3 clearcoatNormal = normal;')
        // Specular antialiasing: seen from afar, one pixel covers many mussels and the sharp highlights sparkle.
        // Where the normal varies a lot from one pixel to the next, the gloss is blurred accordingly.
        .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
          float normalVariation = clamp(length(fwidth(normal)) * 4.0, 0.0, 1.0);
          material.roughness = max(material.roughness, normalVariation);
          material.clearcoatRoughness = max(material.clearcoatRoughness, normalVariation);`)
    }
    // Double-sided: three.js flips the normal of faces seen from behind. The triangle winding of the
    // photogrammetry meshes is not consistent from one texture chart to the next, so whole charts came out
    // inverted (dark patches with sharp edges). An object-space normal is already the true orientation: no flip.
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      THREE.ShaderChunk.normal_fragment_maps.replace('normal = normal * faceDirection;', ''),
    )
  }
  return material
}
if (relief) {
  // On average a lit surface faces the light at ~45 degrees: the directional part is scaled so that the overall
  // brightness stays close to the unlit display
  scene.add(new THREE.AmbientLight(0xffffff, Math.PI * (1 - shade)))
  const sun = new THREE.DirectionalLight(0xffffff, Math.PI * shade * 1.4)
  const az = THREE.MathUtils.degToRad(lightAzimuth)
  const el = THREE.MathUtils.degToRad(lightElevation)
  sun.position.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az))
  scene.add(sun)
  // Something to reflect: a neutral studio-like environment (lit and standard materials only; the unlit
  // zones and the context ignore it)
  if (wet > 0) {
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    pmrem.dispose()
  }
}

// Colour balance between zones. The water tints each zone differently (yellow-green, more or less dark,
// depending on the dive). manifest.json gives each zone's average texture colour in linear light
// (tools/publish-model/texture_stats.mjs); every zone is brought to the same target colour: the average of the
// zones, from which ?neutral= (0 to 1, default 0.3) of the common tint is removed. Fully neutral looks grey or
// pink: the mussels and the sediment really are brown-green. ?balance=0 shows the textures as they are.
function colorBalance(entries) {
  const gains = new Map()
  const measured = entries.filter((e) => e.color)
  if (params.get('balance') === '0' || !measured.length) return gains
  const neutral = params.has('neutral') ? Number(params.get('neutral')) : 0.3
  const average = [0, 1, 2].map((c) => measured.reduce((sum, e) => sum + e.color[c], 0) / measured.length)
  const luminance = 0.2126 * average[0] + 0.7152 * average[1] + 0.0722 * average[2]
  const target = average.map((c) => c + (luminance - c) * neutral)
  // Clamped: a very dark or very tinted texture would otherwise get extreme gains (noise, compression blocks)
  const gain = (t, m) => Math.min(Math.max(t / m, 0.4), 3)
  for (const e of measured) gains.set(e.id, new THREE.Color(...target.map((t, c) => gain(t, e.color[c]))))
  return gains
}

// Ambient occlusion (N8AO): darkens recesses and joints, giving depth to unlit surfaces. N8AO rebuilds the
// normals from the depth buffer (the tiles carry none). Hardware antialiasing does not survive the
// post-processing, hence SMAA. ?ao=0 disables it, ?aoRadius= / ?aoIntensity= tune it (metres / strength),
// ?aoDebug=1 shows the occlusion alone. Off by default on phones (heat, battery): ?ao=1 forces it.
const aoEnabled = params.has('ao') ? params.get('ao') !== '0' : !mobile
let composer = null
let aoPass = null
if (aoEnabled) {
  composer = new EffectComposer(renderer)
  aoPass = new N8AOPass(scene, camera, container.clientWidth, container.clientHeight)
  aoPass.configuration.aoRadius = Number(params.get('aoRadius')) || 1.0
  aoPass.configuration.distanceFalloff = 1.0
  aoPass.configuration.intensity = Number(params.get('aoIntensity')) || 3.0
  aoPass.configuration.halfRes = mobile
  aoPass.configuration.gammaCorrection = false // OutputPass converts to sRGB at the end
  aoPass.setQualityMode(mobile ? 'Low' : 'Medium')
  if (params.get('aoDebug') === '1') aoPass.setDisplayMode('AO')
  composer.addPass(aoPass)
  composer.addPass(new SMAAPass())
  composer.addPass(new OutputPass())
}

// 3D Tiles are Z-up, three.js is Y-up
const world = new THREE.Group()
world.rotation.x = -Math.PI / 2
scene.add(world)

async function main() {
  const manifest = await (await fetch(`${TILES_URL}/manifest.json`, { cache: 'no-cache' })).json()
  // One memory budget shared by all zones: a per-zone share (budget / zone count) filled up after 2 or 3
  // large textures and stopped loading, leaving zones missing on phones.
  let sharedCache = null
  const gains = colorBalance(manifest.tilesets)
  const tilesets = manifest.tilesets.map((entry) => {
    const tiles = new TilesRenderer(`${TILES_URL}/${entry.url}`)
    tiles.zoneId = entry.id
    if (sharedCache) {
      tiles.lruCache = sharedCache
    } else {
      sharedCache = tiles.lruCache
      sharedCache.maxBytesSize = profile.maxBytes
      sharedCache.minBytesSize = profile.maxBytes * 0.6
    }
    const gltfLoader = new GLTFLoader(tiles.manager)
    gltfLoader.setKTX2Loader(ktx2Loader)
    gltfLoader.setMeshoptDecoder(MeshoptDecoder) // geometry compressed by tools/publish-model/compress_tiles.mjs
    tiles.manager.addHandler(/\.(gltf|glb)$/g, gltfLoader)
    // ?error=<pixels>: override the screen-space error target (testing; large values keep the coarse levels)
    tiles.errorTarget = Number(params.get('error')) || profile.errorTarget
    tiles.setCamera(camera)
    tiles.setResolutionFromRenderer(camera, renderer)

    tiles.addEventListener('load-model', ({ scene: model }) => {
      model.traverse((child) => {
        if (child.isMesh) {
          const old = child.material
          child.material = relief && old.normalMap
            ? reliefMaterial(old, gains.get(entry.id))
            : unlitMaterial(old, gains.get(entry.id), true)
          old.dispose()
        }
      })
    })
    tiles.addEventListener('dispose-model', ({ scene: model }) => {
      model.traverse((child) => child.material?.dispose())
      requestRender()
    })
    tiles.addEventListener('load-model', requestRender)
    tiles.addEventListener('tile-visibility-change', requestRender)
    tiles.addEventListener('load-tile-set', requestRender)
    world.add(tiles.group)
    return tiles
  })

  // Non-tiled models (context: fillers, terrain), glTF is already Y-up
  const contextLoader = new GLTFLoader()
  contextLoader.setKTX2Loader(ktx2Loader)
  contextLoader.setMeshoptDecoder(MeshoptDecoder)
  for (const entry of manifest.models || []) {
    contextLoader.load(`${TILES_URL}/${entry.url}`, ({ scene: model }) => {
      model.traverse((child) => {
        if (child.isMesh) {
          const old = child.material
          child.material = unlitMaterial(old)
          old.dispose()
        }
      })
      scene.add(model)
      requestRender()
    })
  }

  // Frame the camera on all tilesets once every root is loaded
  const bounds = new THREE.Box3()
  let pending = tilesets.length
  tilesets.forEach((tiles) => {
    tiles.addEventListener('load-root-tileset', () => {
      const sphere = new THREE.Sphere()
      tiles.getBoundingSphere(sphere)
      world.updateMatrixWorld(true)
      sphere.applyMatrix4(world.matrixWorld)
      bounds.union(sphere.getBoundingBox(new THREE.Box3()))
      if (--pending > 0) return
      const all = bounds.getBoundingSphere(new THREE.Sphere())
      // ?cam=x,y,z,tx,ty,tz: camera position and target (scene metres, y up), for identical or shared views
      const cam = (params.get('cam') || '').split(',').map(Number)
      if (cam.length === 6 && cam.every(Number.isFinite)) {
        camera.position.set(cam[0], cam[1], cam[2])
        controls.target.set(cam[3], cam[4], cam[5])
      } else {
        controls.target.copy(all.center)
        camera.position.copy(all.center).add(new THREE.Vector3(1, 0.6, 1).normalize().multiplyScalar(all.radius * 1.8))
      }
      controls.update()
      status.textContent = ''
    })
  })

  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(container.clientWidth, container.clientHeight)
    composer?.setSize(container.clientWidth, container.clientHeight)
    requestRender()
    tilesets.forEach((tiles) => tiles.setResolutionFromRenderer(camera, renderer))
  })

  // The address bar follows the camera: ?cam=x,y,z,tx,ty,tz is updated (other parameters kept) when a gesture
  // ends, so the URL can be copied at any time to share or reproduce the view. replaceState: no history entry
  // per move. Key C copies that URL.
  const viewUrl = () => {
    const v = [...camera.position.toArray(), ...controls.target.toArray()].map((n) => n.toFixed(2)).join(',')
    const query = new URLSearchParams(location.search)
    query.set('cam', v)
    // Commas kept readable instead of %2C
    return `${location.origin}${location.pathname}?${query.toString().replace(/%2C/g, ',')}`
  }
  let urlTimer = 0
  controls.addEventListener('change', () => {
    clearTimeout(urlTimer)
    urlTimer = setTimeout(() => {
      history.replaceState(null, '', viewUrl())
      // The /modele/ page shows the same ?cam= in its own address, so that copying it shares this view
      if (embedded) window.parent.postMessage({ type: 'lock21:cam', search: location.search }, location.origin)
    }, 300)
  })
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'c' && e.key !== 'C') return
    console.log(viewUrl())
    navigator.clipboard?.writeText(viewUrl()).catch(() => {})
  })

  // ?stats=1: memory used and tiles loaded per zone, on screen (readable on a phone)
  const statsBox = params.get('stats') === '1' ? document.body.appendChild(document.createElement('pre')) : null
  if (statsBox) statsBox.className = 'stats'
  let lastStats = 0
  // Refreshed even when nothing is redrawn (render on demand), otherwise the overlay shows stale numbers
  function updateStats() {
    if (!statsBox || performance.now() - lastStats < 500) return
    lastStats = performance.now()
    const cache = tilesets[0]?.lruCache
    const lines = [
      `${mobile ? 'téléphone' : 'ordinateur'} · mémoire ${((cache?.cachedBytes || 0) / 1e6).toFixed(0)} / ${(profile.maxBytes / 1e6).toFixed(0)} Mo${cache?.isFull() ? ' (PLEINE)' : ''}`,
      ...tilesets.map((t) => `${t.zoneId.padEnd(8)} visibles ${String(t.visibleTiles.size).padStart(3)} · en cours ${t.stats.downloading + t.stats.parsing}`),
    ]
    statsBox.textContent = lines.join('\n')
  }

  renderer.setAnimationLoop(() => {
    updateStats()
    // update() returns true while the camera moves (including the damping glide after a gesture)
    if (controls.update()) needsRender = true
    const loading = tilesets.some((t) => t.stats.queued + t.stats.downloading + t.stats.parsing > 0)
    if (!needsRender && !loading) return
    needsRender = false
    camera.updateMatrixWorld()
    tilesets.forEach((tiles) => tiles.update())
    if (composer) composer.render()
    else renderer.render(scene, camera)
  })
}

main().catch((error) => {
  status.textContent = `Erreur: ${error.message}`
  console.error(error)
})
