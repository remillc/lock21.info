import { useEffect, useRef, useState } from 'react'
import BrowserOnly from '@docusaurus/BrowserOnly'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import useBaseUrl from '@docusaurus/useBaseUrl'
import styles from './styles.module.css'

// Phones: coarser detail and a smaller memory budget (Safari iOS reloads the page beyond ~1-1.5 GB)
function deviceProfile() {
  const mobile = window.matchMedia('(pointer: coarse)').matches
  return mobile
    ? { errorTarget: 12, maxBytes: 300e6, pixelRatio: Math.min(window.devicePixelRatio, 1.5) }
    : { errorTarget: 6, maxBytes: 1000e6, pixelRatio: Math.min(window.devicePixelRatio, 2) }
}

async function startViewer(container, { tilesBaseUrl, transcoderPath, onStatus }) {
  const THREE = await import('three')
  const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
  const { KTX2Loader } = await import('three/examples/jsm/loaders/KTX2Loader.js')
  const { TilesRenderer } = await import('3d-tiles-renderer')

  const profile = deviceProfile()
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(profile.pixelRatio)
  renderer.setSize(container.clientWidth, container.clientHeight)
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0b1c26)
  const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.05, 2000)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true

  const ktx2Loader = new KTX2Loader().setTranscoderPath(transcoderPath).detectSupport(renderer)

  // 3D Tiles are Z-up, three.js is Y-up
  const world = new THREE.Group()
  world.rotation.x = -Math.PI / 2
  scene.add(world)

  const manifest = await (await fetch(`${tilesBaseUrl}/manifest.json`, { cache: 'no-cache' })).json()
  const tilesets = manifest.tilesets.map((entry) => {
    const tiles = new TilesRenderer(`${tilesBaseUrl}/${entry.url}`)
    const gltfLoader = new GLTFLoader(tiles.manager)
    gltfLoader.setKTX2Loader(ktx2Loader)
    tiles.manager.addHandler(/\.(gltf|glb)$/g, gltfLoader)
    tiles.errorTarget = profile.errorTarget
    tiles.lruCache.maxBytesSize = profile.maxBytes / manifest.tilesets.length
    tiles.setCamera(camera)
    tiles.setResolutionFromRenderer(camera, renderer)

    // The photogrammetry texture already contains the lighting: display it unlit
    tiles.addEventListener('load-model', ({ scene: model }) => {
      model.traverse((child) => {
        if (child.isMesh) {
          const old = child.material
          // Double-sided: photogrammetry surfaces are open and are seen from both sides
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

  // Frame the camera on the first tileset once its root is loaded
  tilesets[0].addEventListener('load-root-tileset', () => {
    const sphere = new THREE.Sphere()
    tilesets[0].getBoundingSphere(sphere)
    world.updateMatrixWorld(true)
    sphere.applyMatrix4(world.matrixWorld)
    controls.target.copy(sphere.center)
    camera.position.copy(sphere.center).add(new THREE.Vector3(1, 0.6, 1).normalize().multiplyScalar(sphere.radius * 1.8))
    controls.update()
    onStatus(null)
  })

  const resize = () => {
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(container.clientWidth, container.clientHeight)
    tilesets.forEach((tiles) => tiles.setResolutionFromRenderer(camera, renderer))
  }
  window.addEventListener('resize', resize)

  let frame
  const loop = () => {
    frame = requestAnimationFrame(loop)
    controls.update()
    camera.updateMatrixWorld()
    tilesets.forEach((tiles) => tiles.update())
    renderer.render(scene, camera)
  }
  loop()

  return () => {
    cancelAnimationFrame(frame)
    window.removeEventListener('resize', resize)
    tilesets.forEach((tiles) => tiles.dispose())
    ktx2Loader.dispose()
    controls.dispose()
    renderer.dispose()
    renderer.domElement.remove()
  }
}

function Viewer() {
  const { siteConfig } = useDocusaurusContext()
  const transcoderPath = useBaseUrl('/vendor/basis/')
  const container = useRef(null)
  const [status, setStatus] = useState('Chargement…')

  useEffect(() => {
    let dispose
    let cancelled = false
    startViewer(container.current, { tilesBaseUrl: siteConfig.customFields.modelTilesUrl, transcoderPath, onStatus: setStatus })
      .then((d) => (cancelled ? d() : (dispose = d)))
      .catch((error) => setStatus(`Erreur: ${error.message}`))
    return () => {
      cancelled = true
      dispose?.()
    }
  }, [siteConfig, transcoderPath])

  return (
    <div className={styles.viewer} ref={container}>
      {status && <div className={styles.status}>{status}</div>}
    </div>
  )
}

export default function ModelViewer() {
  return <BrowserOnly fallback={<div className={styles.viewer} />}>{() => <Viewer />}</BrowserOnly>
}
