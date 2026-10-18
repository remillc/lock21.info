import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import { TilesRenderer } from '3d-tiles-renderer'

// Root of the published tiles (manifest.json + tilesets). Override with ?tiles=<url> (e.g. phone tests on the LAN)
const params = new URLSearchParams(location.search)
const TILES_URL = params.get('tiles') || import.meta.env.VITE_TILES_URL || 'http://localhost:8081'

const container = document.getElementById('viewer')
const status = document.getElementById('status')

// Phones: coarser detail and a smaller memory budget (Safari iOS reloads the page beyond ~1-1.5 GB)
const mobile = window.matchMedia('(pointer: coarse)').matches
const profile = mobile
  ? { errorTarget: 12, maxBytes: 300e6, pixelRatio: Math.min(window.devicePixelRatio, 1.5) }
  : { errorTarget: 6, maxBytes: 1000e6, pixelRatio: Math.min(window.devicePixelRatio, 2) }

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(profile.pixelRatio)
renderer.setSize(container.clientWidth, container.clientHeight)
container.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0b1c26)
const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.05, 2000)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

const ktx2Loader = new KTX2Loader().setTranscoderPath('./vendor/basis/').detectSupport(renderer)

// 3D Tiles are Z-up, three.js is Y-up
const world = new THREE.Group()
world.rotation.x = -Math.PI / 2
scene.add(world)

async function main() {
  const manifest = await (await fetch(`${TILES_URL}/manifest.json`, { cache: 'no-cache' })).json()
  const tilesets = manifest.tilesets.map((entry) => {
    const tiles = new TilesRenderer(`${TILES_URL}/${entry.url}`)
    const gltfLoader = new GLTFLoader(tiles.manager)
    gltfLoader.setKTX2Loader(ktx2Loader)
    tiles.manager.addHandler(/\.(gltf|glb)$/g, gltfLoader)
    // ?error=<pixels>: override the screen-space error target (testing; large values keep the coarse levels)
    tiles.errorTarget = Number(params.get('error')) || profile.errorTarget
    tiles.lruCache.maxBytesSize = profile.maxBytes / manifest.tilesets.length
    tiles.setCamera(camera)
    tiles.setResolutionFromRenderer(camera, renderer)

    // The photogrammetry texture already contains the lighting: display it unlit.
    // Double-sided: photogrammetry surfaces are open and are seen from both sides.
    tiles.addEventListener('load-model', ({ scene: model }) => {
      model.traverse((child) => {
        if (child.isMesh) {
          const old = child.material
          child.material = new THREE.MeshBasicMaterial({ map: old.map, side: THREE.DoubleSide })
          old.dispose()
        }
      })
    })
    tiles.addEventListener('dispose-model', ({ scene: model }) => {
      model.traverse((child) => child.material?.dispose())
    })
    world.add(tiles.group)
    return tiles
  })

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
      controls.target.copy(all.center)
      camera.position.copy(all.center).add(new THREE.Vector3(1, 0.6, 1).normalize().multiplyScalar(all.radius * 1.8))
      controls.update()
      status.textContent = ''
    })
  })

  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(container.clientWidth, container.clientHeight)
    tilesets.forEach((tiles) => tiles.setResolutionFromRenderer(camera, renderer))
  })

  renderer.setAnimationLoop(() => {
    controls.update()
    camera.updateMatrixWorld()
    tilesets.forEach((tiles) => tiles.update())
    renderer.render(scene, camera)
  })
}

main().catch((error) => {
  status.textContent = `Erreur: ${error.message}`
  console.error(error)
})
