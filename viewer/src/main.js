import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { TilesRenderer } from '3d-tiles-renderer'
import { N8AOPass } from 'n8ao'

// Root of the published tiles (manifest.json + tilesets). Override with ?tiles=<url> (e.g. phone tests on the LAN)
const params = new URLSearchParams(location.search)
const TILES_URL = params.get('tiles') || import.meta.env.VITE_TILES_URL || 'http://localhost:8081'

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
function unlitMaterial(old) {
  if (old.map) old.map.anisotropy = maxAnisotropy
  return new THREE.MeshBasicMaterial({ map: old.map, color: old.map ? 0xffffff : old.color, side: THREE.DoubleSide })
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
          child.material = unlitMaterial(old)
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

  // Key C: copy the current view as ?cam=... (to share a view or reproduce it)
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'c' && e.key !== 'C') return
    const v = [...camera.position.toArray(), ...controls.target.toArray()].map((n) => n.toFixed(2)).join(',')
    console.log(`?cam=${v}`)
    navigator.clipboard?.writeText(`${location.origin}${location.pathname}?cam=${v}`).catch(() => {})
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
