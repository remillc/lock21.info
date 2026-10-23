// A curious smallmouth bass in the underwater view (TODO #56, Christian, 2026-10-23): when the camera has been still for
// IDLE s, it comes slowly from one side of the view, swims about a sixth of the view's width, stops, and turns toward
// the diver, its two big eyes on them; it stays, hovering. When the camera moves again, it turns away and dashes off the
// way it came; or it gets bored after a while (STAY, at random) and swims off calmly. At most once every COOLDOWN s, and
// only where its whole path stays CLEARANCE m from the surfaces.
//
// The model: « Smallmouth bass » by faerbogdan99 (Sketchfab, CC BY 4.0, credited on the /modele page), packed into
// public/creatures/bass.glb (rigged by tools/creatures/rig_bass.py: a spine of five bones, head to tail; textures
// 1024 px WebP; original in O:\modeles\creatures\bass\). It swims by a wave travelling down its spine, wider toward the
// tail.
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const URL = `${import.meta.env.BASE_URL}creatures/bass.glb`
// An adult smallmouth bass (m, nose to tail)
const LENGTH = 0.4
const IDLE = 6
const COOLDOWN = 30
const CLEARANCE = 0.15
// Its distance ahead of the camera (m, at most a share of the visibility), its speeds (m/s), its turn (rad/s)
const DISTANCE = 1
const VISIBILITY_SHARE = 0.5
// Fleeing (Christian, 2026-10-23: it rushes out): a quick turn away and a dash, speeding up over its first second
const SWIM = 0.16
const FLEE = 2.2
const TURN = 1.4
const FLEE_TURN = 7
// How long it watches the diver before it gets bored (s, at random in between: Christian, 2026-10-23), its calm
// departure's speed (m/s), and its gentle hover (m)
const STAY = [8, 20]
const WANDER_OFF = 0.35
const BOB = 0.02
// The swimming wave down the spine: each bone's bend (rad, head to tail), its beats per second and its size, hovering,
// swimming or fleeing, and the lag between bones (rad)
const WAVE = [0.02, 0.05, 0.09, 0.14, 0.22]
// (half the first try's pace: Christian, 2026-10-23, it waved far too fast; then times the season's pace)
const BEAT = { hover: 0.35, swim: 0.9, flee: 2.2 }
const WAVE_SIZE = { hover: 0.25, swim: 1, flee: 1.3 }
const WAVE_LAG = 0.9
// Turning: how fast its turning rate follows (1/s) and how it scales with what is left to turn; the C-curve of its body
// per bone (rad per rad/s of turning, head to tail: the body lags behind the head); its glide while turning (m per rad)
const TURN_EASE = 3
const TURN_GAIN = 2.5
// (twice as supple as the first try: Christian, 2026-10-23)
const CURVE = [0, 0.25, 0.32, 0.32, 0.25]
const GLIDE = 0.05

/**
 * @param {object} options
 * @param {(material: THREE.Material) => THREE.Material} [options.prepare] - the viewer's material set-up (underwater)
 * @param {(point: THREE.Vector3) => number} [options.clearance] - distance to the nearest surface (m, capped)
 * @param {() => number} [options.visibility] - the water's visibility (m)
 * @param {(from: THREE.Vector3, to: THREE.Vector3) => boolean} [options.inSight] - nothing of the model between two
 *   points (its path must be seen from the camera: a spot far from every surface can be inside the masonry)
 * @param {() => number} [options.pace] - its pace in this season's water (1 in summer; in winter's cold water it
 *   saves its energy: slower waves, turns and swimming, a shorter dash)
 * @param {boolean} [options.always] - debug (?bass=1): shown at once and all the time, its place kept in front of the
 *   camera (re-placed when the camera moves), facing the diver; no wait, pause or wall check
 */
export function createBass({ prepare = (m) => m, clearance = () => Infinity, visibility = () => 6, inSight = () => true, pace = () => 1, always = false } = {}) {
  const root = new THREE.Group()
  root.name = 'bass'
  root.visible = false
  const body = new THREE.Group()
  root.add(body)
  let ready = false
  /** @type {{ bone: THREE.Bone, rest: THREE.Quaternion, axis: THREE.Vector3 }[]} */
  const spine = []
  const bend = new THREE.Quaternion()

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
    body.updateMatrixWorld(true)
    // The spine, head first: each bone bends about the body's up axis, expressed in its parent's frame
    const bodyTurn = body.getWorldQuaternion(new THREE.Quaternion())
    for (let i = 0; ; i++) {
      const bone = model.getObjectByName(`spine_${i}`)
      if (!bone) break
      const toLocal = bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(bodyTurn)
      spine.push({ bone, rest: bone.quaternion.clone(), axis: new THREE.Vector3(0, 1, 0).applyQuaternion(toLocal).normalize() })
    }
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
  const forward = new THREE.Vector3()
  let turnRate = 0
  const ahead = new THREE.Vector3()
  const toCamera = new THREE.Vector3()
  let heading = 0
  let lastPlan = null
  let leftAt = 0
  let calm = false
  let stayFor = STAY[1]
  let phase = 0

  /** Its path for this view: from just outside one side to a sixth of the view's width inside, or null */
  /** Its path for this view: from just outside one side to a sixth of the view's width inside, at the first height,
   *  distance (DISTANCE, then closer) and side that work; false when none does */
  function plan(camera) {
    const first = Math.random() < 0.5 ? -1 : 1
    // Heights: a little below the eye, at it, then above (the camera close to the floor: Christian, 2026-10-23)
    for (const rise of [-0.15, 0, 0.2, 0.45]) {
      for (const share of [1, 0.7, 0.5]) {
        for (const side of [first, -first]) if (tryPath(camera, Math.min(DISTANCE, visibility() * VISIBILITY_SHARE) * share, side, rise)) return true
      }
    }
    return false
  }

  function tryPath(camera, distance, side, rise) {
    camera.getWorldDirection(ahead).setY(0).normalize()
    right.set(-ahead.z, 0, ahead.x)
    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance * camera.aspect
    const centre = camera.position.clone().addScaledVector(ahead, distance)
    centre.y += rise
    from.copy(centre).addScaledVector(right, side * (half + LENGTH))
    to.copy(centre).addScaledVector(right, side * (half - (2 * half) / 6))
    exit.copy(from).addScaledVector(right, side * 3)
    const mid = from.clone().lerp(to, 0.5)
    lastPlan = [from, mid, to, exit].map((p) => Math.round(clearance(p) * 100) / 100)
    // Clear of the walls, and seen from the camera (a spot far from every surface can be inside the masonry)
    return always || (lastPlan.every((c) => c >= CLEARANCE) && [from, mid, to].every((p) => inSight(camera.position, p)))
  }

  /** @param {boolean} [bored] - a calm departure (bored), not a flight */
  function leave(bored = false) {
    state = 'leaving'
    calm = bored
    leftAt = since
  }

  /** Turns toward a direction as a fish does (Christian, 2026-10-23: the even pivot was not natural): its turning rate
   *  eases in and out (toward TURN_GAIN times what is left, at most `turn`), and while it turns its body curves into a C
   *  (the spine below) and it glides forward a little; true once it faces that way and has stopped turning */
  function face(direction, dt, turn = TURN) {
    const target = Math.atan2(direction.x, direction.z)
    const delta = Math.atan2(Math.sin(target - heading), Math.cos(target - heading))
    const wanted = THREE.MathUtils.clamp(delta * TURN_GAIN, -turn, turn)
    turnRate += (wanted - turnRate) * Math.min(1, TURN_EASE * dt)
    heading += turnRate * dt
    root.position.addScaledVector(forward.set(Math.sin(heading), 0, Math.cos(heading)), Math.abs(turnRate) * GLIDE * dt)
    return Math.abs(delta) < 0.05 && Math.abs(turnRate) < 0.1
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
      // Debug: whenever the camera moves, it starts over from its new place (no flight)
      if (always && moved && state !== 'away') state = 'away'
      if (state === 'away') {
        if (!always && (idle < IDLE || cooldown > 0)) return false
        if (!plan(camera)) {
          cooldown = 5
          return false
        }
        state = 'arriving'
        since = 0
        root.position.copy(from)
        heading = Math.atan2(to.x - from.x, to.z - from.z)
        turnRate = 0
        root.visible = true
      }
      since += dt
      const slow = pace()
      if (state === 'arriving') {
        const step = to.clone().sub(root.position)
        const left = step.length()
        if (moved) leave()
        else if (left < 0.02) state = 'turning'
        else {
          face(step, dt)
          root.position.addScaledVector(step.normalize(), Math.min(left, SWIM * slow * dt))
        }
      } else if (state === 'turning' || state === 'staying') {
        // Facing the diver, its eyes on them; a move of the camera sends it away, and it gets bored after a while
        toCamera.copy(camera.position).sub(root.position).setY(0)
        const faced = face(toCamera, dt, TURN * slow)
        if (state === 'turning' && faced) {
          state = 'staying'
          since = 0
          stayFor = STAY[0] + Math.random() * (STAY[1] - STAY[0])
        }
        if (moved) leave()
        else if (state === 'staying' && since > stayFor) leave(true)
      } else if (state === 'leaving') {
        const step = exit.clone().sub(root.position)
        const left = step.length()
        if (left < 0.05) {
          state = 'away'
          root.visible = false
          cooldown = COOLDOWN
          return true
        }
        // Turned away first, then the dash, speeding up (an easing on its first second); bored, a slow turn and an easy
        // swim. In cold water, everything slower (pace)
        const turned = face(step, dt, calm ? TURN * slow : FLEE_TURN)
        const speed = calm ? WANDER_OFF * slow : FLEE * Math.sqrt(slow) * Math.min(1, (since - leftAt) / 1) ** 2
        if (turned || since - leftAt > (calm ? 1.5 : 0.3)) root.position.addScaledVector(step.normalize(), Math.min(left, Math.max(speed, 0.3) * dt))
      }
      const fleeing = state === 'leaving' && !calm
      const swimming = state === 'arriving' || state === 'leaving'
      // The wave down the spine: its pace and size by what it does, slower in cold water
      const mode = fleeing ? 'flee' : swimming ? 'swim' : 'hover'
      phase += dt * BEAT[mode] * slow * Math.PI * 2
      spine.forEach(({ bone, rest, axis }, k) => {
        const wave = WAVE[k] * WAVE_SIZE[mode] * Math.sin(phase - k * WAVE_LAG)
        bone.quaternion.copy(rest).premultiply(bend.setFromAxisAngle(axis, wave - turnRate * CURVE[k]))
      })
      root.rotation.set(0, heading, 0)
      body.position.y = BOB * Math.sin(time * 1.3)
      return true
    },
  }
}
