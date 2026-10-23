// A curious smallmouth bass in the underwater view (TODO #56, Christian, 2026-10-23): when the camera has been still for
// IDLE s, it comes slowly from one side of the view, swims about a sixth of the view's width, stops, and turns toward
// the diver, its two big eyes on them; it stays, hovering. When the camera moves again, it turns away and swims off
// the way it came. At most once every COOLDOWN s, and only where its whole path stays CLEARANCE m from the surfaces.
//
// The model: « Smallmouth bass » by faerbogdan99 (Sketchfab, CC BY 4.0, credited on the /modele page), packed into
// public/creatures/bass.glb (textures 1024 px WebP; original in O:\modeles\creatures\bass\). Not rigged: it swims by
// swaying its whole body.
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const URL = `${import.meta.env.BASE_URL}creatures/bass.glb`
// An adult smallmouth bass (m, nose to tail)
const LENGTH = 0.4
const IDLE = 6
const COOLDOWN = 30
const CLEARANCE = 0.15
// Its distance ahead of the camera (m, at most a share of the visibility), its speeds (m/s), its turn (rad/s)
const DISTANCE = 1.4
const VISIBILITY_SHARE = 0.5
// Fleeing (Christian, 2026-10-23: it rushes out): a quick turn away and a dash, speeding up over its first second
const SWIM = 0.16
const FLEE = 2.2
const TURN = 1.4
const FLEE_TURN = 7
// How long it stays facing the diver at most (s), and its gentle hover (m, rad)
const STAY = 40
const BOB = 0.02

/**
 * @param {object} options
 * @param {(material: THREE.Material) => THREE.Material} [options.prepare] - the viewer's material set-up (underwater)
 * @param {(point: THREE.Vector3) => number} [options.clearance] - distance to the nearest surface (m, capped)
 * @param {() => number} [options.visibility] - the water's visibility (m)
 */
export function createBass({ prepare = (m) => m, clearance = () => Infinity, visibility = () => 6 } = {}) {
  const root = new THREE.Group()
  root.name = 'bass'
  root.visible = false
  const body = new THREE.Group()
  root.add(body)
  let ready = false

  new GLTFLoader().load(URL, (gltf) => {
    const model = gltf.scene
    model.traverse((object) => {
      if (!object.isMesh) return
      object.frustumCulled = false
      object.material = prepare(object.material.clone())
    })
    // Centred, scaled to LENGTH, its head toward +z (as the model is)
    const box = new THREE.Box3().setFromObject(model)
    const size = box.getSize(new THREE.Vector3())
    const centre = box.getCenter(new THREE.Vector3())
    model.position.sub(centre)
    body.scale.setScalar(LENGTH / size.z)
    body.add(model)
    ready = true
  })

  // States: away (none), arriving, turning (to the diver), staying, leaving
  let state = 'away'
  let idle = 0
  let cooldown = 8
  let time = 0
  let since = 0
  const from = new THREE.Vector3()
  const to = new THREE.Vector3()
  const exit = new THREE.Vector3()
  const lastPosition = new THREE.Vector3()
  const lastQuaternion = new THREE.Quaternion()
  const right = new THREE.Vector3()
  const ahead = new THREE.Vector3()
  const toCamera = new THREE.Vector3()
  let heading = 0
  let lastPlan = null
  let leftAt = 0

  /** Its path for this view: from just outside one side to a sixth of the view's width inside, or null */
  function plan(camera) {
    const distance = Math.min(DISTANCE, visibility() * VISIBILITY_SHARE)
    camera.getWorldDirection(ahead).setY(0).normalize()
    right.set(-ahead.z, 0, ahead.x)
    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance * camera.aspect
    const side = Math.random() < 0.5 ? -1 : 1
    const centre = camera.position.clone().addScaledVector(ahead, distance)
    centre.y -= 0.15
    from.copy(centre).addScaledVector(right, side * (half + LENGTH))
    to.copy(centre).addScaledVector(right, side * (half - (2 * half) / 6))
    exit.copy(from).addScaledVector(right, side * 3)
    const mid = from.clone().lerp(to, 0.5)
    lastPlan = [from, mid, to, exit].map((p) => Math.round(clearance(p) * 100) / 100)
    return lastPlan.every((c) => c >= CLEARANCE)
  }

  function leave() {
    state = 'leaving'
    leftAt = since
  }

  function face(direction, dt, turn = TURN) {
    const target = Math.atan2(direction.x, direction.z)
    const delta = Math.atan2(Math.sin(target - heading), Math.cos(target - heading))
    heading += Math.sign(delta) * Math.min(Math.abs(delta), turn * dt)
    return Math.abs(delta) < 0.05
  }

  return {
    object: root,
    /** For tests */
    get debug() {
      return { state, idle, cooldown, lastPlan }
    },
    /**
     * Each frame while underwater
     * @param {THREE.PerspectiveCamera} camera
     * @param {number} dt
     * @param {boolean} on - the underwater view is on
     * @returns {boolean} whether it moved (a new frame is needed)
     */
    update(camera, dt, on) {
      if (!ready) return false
      time += dt
      // The camera still: idle grows; any move resets it
      const moved = lastPosition.distanceToSquared(camera.position) > 1e-8 || lastQuaternion.angleTo(camera.quaternion) > 1e-4
      lastPosition.copy(camera.position)
      lastQuaternion.copy(camera.quaternion)
      idle = moved ? 0 : idle + dt
      cooldown = Math.max(0, cooldown - dt)
      if (!on) {
        state = 'away'
        root.visible = false
        return false
      }
      if (state === 'away') {
        if (idle < IDLE || cooldown > 0) return false
        if (!plan(camera)) {
          cooldown = 5
          return false
        }
        state = 'arriving'
        since = 0
        root.position.copy(from)
        heading = Math.atan2(to.x - from.x, to.z - from.z)
        root.visible = true
      }
      since += dt
      const swimming = state === 'arriving' || state === 'leaving'
      const fleeing = state === 'leaving'
      if (state === 'arriving') {
        const step = to.clone().sub(root.position)
        const left = step.length()
        if (moved) leave()
        else if (left < 0.02) state = 'turning'
        else {
          face(step, dt)
          root.position.addScaledVector(step.normalize(), Math.min(left, SWIM * dt))
        }
      } else if (state === 'turning' || state === 'staying') {
        // Facing the diver, its eyes on them; a move of the camera sends it away
        toCamera.copy(camera.position).sub(root.position).setY(0)
        const faced = face(toCamera, dt)
        if (state === 'turning' && faced) {
          state = 'staying'
          since = 0
        }
        if (moved || (state === 'staying' && since > STAY)) leave()
      } else if (state === 'leaving') {
        const step = exit.clone().sub(root.position)
        const left = step.length()
        if (left < 0.05) {
          state = 'away'
          root.visible = false
          cooldown = COOLDOWN
          return true
        }
        // Turned away first, then the dash, speeding up (an easing on its first second)
        const turned = face(step, dt, FLEE_TURN)
        const speed = FLEE * Math.min(1, (since - leftAt) / 1) ** 2
        if (turned || since - leftAt > 0.3) root.position.addScaledVector(step.normalize(), Math.min(left, Math.max(speed, 0.3) * dt))
      }
      // The body sways as it swims (faster and wider while swimming), and hovers up and down
      const sway = fleeing ? 0.22 * Math.sin(time * 22) : swimming ? 0.14 * Math.sin(time * 9) : 0.03 * Math.sin(time * 2.2)
      root.rotation.set(0, heading + sway, 0)
      body.position.y = BOB * Math.sin(time * 1.3)
      return true
    },
  }
}
