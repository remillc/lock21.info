// Augmented reality on Android, in Chrome (WebXR), with the viewer's own three.js: one tap on the AR button opens the
// camera at once (Chrome allows an AR session only right after a tap), the AR model downloads meanwhile (progress in
// an overlay), a ring follows the floor or a table (hit test), and a tap on the screen places the lock there (another
// tap moves it). The "×" button or the phone's back button ends it.
// Why not Scene Viewer, as before: on a Pixel 10 Pro (2026-10-22) it closed at once for every model, Google's samples
// included and from any page. Why not Google's <model-viewer>: it downloads the whole model (26 MB) before asking for
// the session, so the tap has expired and a second tap is needed. Scene Viewer stays the fallback where Chrome has no
// WebXR AR (main.js).
// The model is shown unlit (MeshBasicMaterial), as in the viewer: the photogrammetry textures already hold the light.
// Telemetry: 'ar-status' messages (session-started, model-loaded, placed, ended, failed).
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

/** Whether Chrome can open a WebXR AR session here (checked once, before any tap) */
export async function webxrArSupported() {
  try {
    return Boolean(await navigator.xr?.isSessionSupported('immersive-ar'))
  } catch {
    return false
  }
}

/**
 * Starts AR. Must be called straight from the tap's handler: the session is requested before anything else.
 * src: the 1:100 model; scale: its starting enlargement (1 = 1:100 on a table, 100 = real size), changed live by the
 * overlay's slider. onStart / onEnd pause and resume the 3D viewer; onFail(error) runs if the session can't open
 * (Scene Viewer then).
 */
export function startWebXrAr({ src, title, scale = 1, log, onStart, onEnd, onFail }) {
  const overlay = createOverlay(title, scale)
  const sessionRequest = navigator.xr.requestSession('immersive-ar', {
    requiredFeatures: ['hit-test'],
    optionalFeatures: ['dom-overlay', 'local-floor'],
    domOverlay: { root: overlay.root },
  })
  sessionRequest.then(
    (session) => run({ session, overlay, src, scale, log, onStart, onEnd }),
    (error) => {
      overlay.root.remove()
      log('ar-status', { status: 'failed', step: 'session', msg: String(error?.message ?? error).slice(0, 300) })
      onFail(error)
    },
  )
}

// The slider runs from 1:100 to 1:1 on a log scale (value 0..1 -> enlargement 100^value), so that 1:50, 1:10 and 1:2
// are as easy to reach as the ends
const MAX_SCALE = 100
const toScale = (value) => MAX_SCALE ** value
const toValue = (scale) => Math.log(scale) / Math.log(MAX_SCALE)
const ratio = (scale) => `1:${Math.max(1, Math.round(MAX_SCALE / scale))}`

function createOverlay(title, scale) {
  const root = document.createElement('div')
  root.className = 'xr-overlay'
  // .xr-frame holds the controls; it turns a quarter turn with the phone (see trackTurn)
  root.innerHTML = `
    <div class="xr-frame">
      <div class="xr-overlay-head">
        <span class="xr-overlay-title"></span>
        <button type="button" class="xr-overlay-close" aria-label="Quitter la réalité augmentée"><svg aria-hidden="true" width="24" height="24" viewBox="0 -960 960 960" fill="currentColor"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg></button>
      </div>
      <div class="xr-overlay-foot">
        <p class="xr-overlay-status" role="status">Ouverture de la caméra…</p>
        <label class="xr-overlay-scale">
          <span>Taille</span>
          <input type="range" min="0" max="1" step="0.01" aria-label="Taille de l’écluse, de 1:100 (sur une table) à 1:1 (taille réelle)" />
          <output></output>
        </label>
      </div>
    </div>`
  root.dataset.turn = '0'
  root.dataset.layout = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
  root.querySelector('.xr-overlay-title').textContent = title
  const slider = root.querySelector('input')
  const shown = root.querySelector('output')
  slider.value = String(toValue(scale))
  shown.textContent = ratio(scale)
  // Touches on the buttons and the slider don't place the model (no WebXR "select" for them)
  for (const control of root.querySelectorAll('.xr-overlay-head, .xr-overlay-foot')) {
    control.addEventListener('beforexrselect', (event) => event.preventDefault())
  }
  document.body.append(root)
  return { root, status: root.querySelector('.xr-overlay-status'), close: root.querySelector('.xr-overlay-close'), slider, shown }
}

async function run({ session, overlay, src, scale, log, onStart, onEnd }) {
  log('ar-status', { status: 'session-started', overlay: Boolean(session.domOverlayState), scale })
  onStart()
  const say = (text) => {
    overlay.status.textContent = text
  }

  // A renderer of its own, on a transparent canvas: the camera image shows behind
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.xr.enabled = true
  renderer.domElement.className = 'xr-canvas'
  document.body.append(renderer.domElement)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera()

  // The ring that follows the surfaces found by the hit test
  const reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.06, 0.08, 40).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xf28c28 }),
  )
  reticle.matrixAutoUpdate = false
  reticle.visible = false
  scene.add(reticle)

  let ended = false
  const end = () => {
    if (ended) return
    ended = true
    renderer.setAnimationLoop(null)
    renderer.dispose()
    renderer.domElement.remove()
    overlay.root.remove()
    onEnd()
  }
  session.addEventListener('end', () => {
    log('ar-status', { status: 'ended' })
    end()
  })
  overlay.close.addEventListener('click', () => session.end())

  try {
    renderer.xr.setReferenceSpaceType(session.enabledFeatures?.includes('local-floor') ? 'local-floor' : 'local')
    await renderer.xr.setSession(session)
  } catch (error) {
    log('ar-status', { status: 'failed', step: 'renderer', msg: String(error?.message ?? error).slice(0, 300) })
    session.end()
    return
  }
  const viewerSpace = await session.requestReferenceSpace('viewer')
  const hitSource = await session.requestHitTestSource({ space: viewerSpace })

  // The model, downloaded while the camera is already on
  let model = null
  say('Chargement du modèle…')
  new GLTFLoader().load(
    src,
    (gltf) => {
      model = gltf.scene
      model.traverse((child) => {
        if (!child.isMesh) return
        const old = child.material
        child.material = new THREE.MeshBasicMaterial({ map: old.map ?? null, color: old.map ? 0xffffff : old.color, side: THREE.DoubleSide })
        old.dispose()
      })
      // Placed and scaled from its own origin: the site's reference point (make_model.py's site anchor, in the lock)
      // on the canal floor (z 0, 60 ft deep). The canal floor stays on the real surface at every size, and the lock
      // grows from that point without moving; at 1:1 the walls rise about 35 ft, the pits go about 5 ft below the
      // surface. (Its bounding box, used before, put the deepest pit on the surface and lifted the floor with the size.)
      const holder = new THREE.Group()
      holder.add(model)
      holder.visible = false
      holder.scale.setScalar(scale)
      scene.add(holder)
      model = holder
      say('Pointez le téléphone vers le sol ou une table, puis touchez l’écran pour placer l’écluse.')
      log('ar-status', { status: 'model-loaded' })
    },
    (event) => {
      if (event.total) say(`Chargement du modèle… ${Math.round((event.loaded / event.total) * 100)} %`)
    },
    (error) => {
      say('Le modèle n’a pas pu être chargé.')
      log('ar-status', { status: 'failed', step: 'model', msg: String(error?.message ?? error).slice(0, 300) })
    },
  )

  // The size slider: 1:100 (on a table) to 1:1 (real size), applied live; the last size is logged when AR ends
  overlay.slider.addEventListener('input', () => {
    scale = toScale(Number(overlay.slider.value))
    overlay.shown.textContent = ratio(scale)
    model?.scale.setScalar(scale)
  })
  session.addEventListener('end', () => log('ar-status', { status: 'last-size', ratio: ratio(scale) }))

  // A tap on the screen places the model on the ring, turned to face the phone
  let placed = false
  session.addEventListener('select', () => {
    if (!model || !reticle.visible) return
    const position = new THREE.Vector3().setFromMatrixPosition(reticle.matrix)
    model.position.copy(position)
    const eye = new THREE.Vector3().setFromMatrixPosition(renderer.xr.getCamera().matrixWorld)
    model.rotation.y = Math.atan2(eye.x - position.x, eye.z - position.z)
    model.visible = true
    if (!placed) {
      placed = true
      say('Touchez l’écran pour déplacer l’écluse.')
      log('ar-status', { status: 'placed' })
    }
  })

  renderer.setAnimationLoop((_time, frame) => {
    if (!frame) return
    const space = renderer.xr.getReferenceSpace()
    const pose = frame.getHitTestResults(hitSource)[0]?.getPose(space)
    reticle.visible = Boolean(pose)
    if (pose) reticle.matrix.fromArray(pose.transform.matrix)
    trackTurn(overlay.root, frame.getViewerPose(space))
    renderer.render(scene, camera)
  })
}

// Chrome keeps the screen in its starting orientation during an AR session: turning the phone doesn't rotate the
// page. As camera apps do, the controls turn themselves: the world's up direction, seen from the phone (its viewer
// pose), gives how the phone is held; held sideways (more than 60 degrees from the current position, so that it
// doesn't flicker), the controls frame turns a quarter turn the other way and takes the landscape layout. Ignored while
// the phone points almost straight down or up (the roll is then meaningless). Where the screen does rotate, the pose
// follows the screen, and the controls stay as they are.
const worldUp = new THREE.Vector3()
const viewerTurn = new THREE.Quaternion()
function trackTurn(root, viewerPose) {
  if (!viewerPose) return
  const o = viewerPose.transform.orientation
  viewerTurn.set(o.x, o.y, o.z, o.w).invert()
  worldUp.set(0, 1, 0).applyQuaternion(viewerTurn)
  if (Math.hypot(worldUp.x, worldUp.y) < 0.5) return
  const roll = THREE.MathUtils.radToDeg(Math.atan2(worldUp.x, worldUp.y))
  const turn = Number(root.dataset.turn)
  if (Math.abs(roll - turn) < 60) return
  const next = Math.abs(roll) < 45 ? 0 : roll <= -45 && roll > -135 ? -90 : roll >= 45 && roll < 135 ? 90 : turn
  if (next === turn) return
  root.dataset.turn = String(next)
  root.dataset.layout = next !== 0 || window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
}
