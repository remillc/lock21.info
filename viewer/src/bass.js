// A curious smallmouth bass in the underwater view (TODO #56, Christian, 2026-10-23): when the camera has been still for
// a while (IDLE, at random), it comes slowly from one side of the view, swims about a sixth of the view's width, stops,
// and turns toward the diver, its two big eyes on them; it stays, hovering, following the diver as they move gently. A
// sudden move (STARTLE), or now and then a gentle one (SKITTISH), sends it off in a dash; it gets bored after a while
// (STAY, at random), or loses sight of the diver (LOST), and swims off calmly. Once in a while
// only (COOLDOWN, at random, after each visit), and only where its whole path stays CLEARANCE m from the surfaces.
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
// Once in a while only (Christian, 2026-10-24): the camera still for IDLE s (drawn again at each move), then COOLDOWN s
// (at random) before the next visit, FIRST s at the earliest after the viewer opens
const IDLE = [10, 30]
const COOLDOWN = [30, 120]
const FIRST = 45
const CLEARANCE = 0.15
// Its distance ahead of the camera (m, at most a share of the visibility), its speeds (m/s), its turn (rad/s)
const DISTANCE = 1
const VISIBILITY_SHARE = 0.5
// Fleeing (Christian, 2026-10-23: it rushes out): a quick turn away and a dash, speeding up over its first second
const SWIM = 0.16
// Arriving (TODO #60, Christian, 2026-10-24: the turn toward the diver should follow the swim in, not start after a
// stop): over its last SLOW_DOWN m it slows to SLOWEST of its speed, and over its last TURN_BEFORE m its aim shifts
// from its path to the diver, so it is already turning when it arrives
const SLOW_DOWN = 0.3
const SLOWEST = 0.15
const TURN_BEFORE = 0.35
const FLEE = 2.2
const TURN = 1.4
const FLEE_TURN = 7
// Leaving as a fish does (Christian, 2026-10-24: its turn away didn't look natural; it pivoted on the spot, then slid
// to its way out): it swims where its body points, so it follows an arc while it turns, at LEAVE_SLOWEST of its speed
// facing away and full speed once lined up, reaching it with LEAVE_ACCEL (calm) or FLEE_ACCEL (per second). Fleeing,
// a C-start: its turn snaps in (FLEE_EASE instead of TURN_EASE) and its body bends into a C, then the tail kick
// carries it off. Gone once LEAVE_NEAR m from its way out, or after LEAVE_MAX s
const LEAVE_SLOWEST = 0.3
const LEAVE_ACCEL = 1.2
const FLEE_ACCEL = 4
const FLEE_EASE = 14
const LEAVE_NEAR = 0.3
const LEAVE_MAX = 10
// The most a spine bone bends in a turn (rad): a fast turn (the flight) folded the body
const MAX_BEND = 0.45
// How long it watches the diver before it gets bored (s, at random in between: Christian, 2026-10-23), its calm
// departure's speed (m/s), and its gentle hover (m)
const STAY = [8, 15]
const WANDER_OFF = 0.35
const BOB = 0.02
// Movement tolerated most of the time (Christian, 2026-10-24): it flees from a sudden move only, the camera faster than
// STARTLE (m/s, swimming with Shift; rad/s, a quick turn) or nearer than TOO_CLOSE (m); a gentle move scares it only at
// random, SKITTISH each time the camera sets off. Out of view for LOST s, or farther than LOST_DISTANCE times its
// distance, it loses interest and swims off calmly
const STARTLE = { speed: 2.5, turn: 3 }
const TOO_CLOSE = 0.4
const UP = new THREE.Vector3(0, 1, 0)
const SKITTISH = 0.15
const LOST = 2
const LOST_DISTANCE = 3
// The swimming wave down the spine: each bone's bend (rad, head to tail) and the lag between bones (rad). Its pace and
// size follow how fast it actually goes (Christian, 2026-10-23), turning included: beats per second at rest plus per
// m/s (at most BEAT_MAX), size at rest up to 1 at SIZE_SPEED m/s and WAVE_MAX at full dash
// (twice the first try's: Christian, 2026-10-23)
const WAVE = [0.04, 0.1, 0.18, 0.28, 0.44]
const WAVE_LAG = 0.9
const BEAT_REST = 0.3
const BEAT_PER_SPEED = 4
const BEAT_MAX = 4
const SIZE_REST = 0.25
const SIZE_SPEED = 0.2
const WAVE_MAX = 1.3
// How a turn counts as speed for the tail (m/s per rad/s): the tail beats as it turns
const TURN_AS_SPEED = 0.12
// Turning: how fast its turning rate follows (1/s) and how it scales with what is left to turn; the C-curve of its body
// per bone (rad per rad/s of turning, head to tail: the body lags behind the head); its glide while turning (m per rad)
const TURN_EASE = 3
const TURN_GAIN = 2.5
// (four times as supple as the first try: Christian, 2026-10-23; eight was too much)
const CURVE = [0, 0.5, 0.64, 0.64, 0.5]
const GLIDE = 0.05

/** A number at random in [min, max] */
const between = ([min, max]) => min + Math.random() * (max - min)

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
 * @param {Promise<unknown>} [options.when] - its model loads once this settles (the viewer: after the first view, so as
 *   not to share the bandwidth with the coarsest tiles)
 */
export function createBass({ prepare = (m) => m, clearance = () => Infinity, visibility = () => 6, inSight = () => true, pace = () => 1, always = false, when = Promise.resolve() } = {}) {
  const root = new THREE.Group()
  root.name = 'bass'
  root.visible = false
  const body = new THREE.Group()
  root.add(body)
  let ready = false
  /** @type {{ bone: THREE.Bone, rest: THREE.Quaternion, axis: THREE.Vector3 }[]} */
  const spine = []
  const bend = new THREE.Quaternion()

  when.then(() => new GLTFLoader().load(URL, (gltf) => {
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
  }))

  // States: away (none), arriving, turning (to the diver), staying, leaving
  let state = 'away'
  let idle = 0
  let cooldown = FIRST
  let idleFor = between(IDLE)
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
  const lastRoot = new THREE.Vector3()
  let speedNow = 0
  let leaveSpeed = 0
  const ahead = new THREE.Vector3()
  const toCamera = new THREE.Vector3()
  const aim = new THREE.Vector3()
  let heading = 0
  let lastPlan = null
  let leftAt = 0
  let calm = false
  let stayFor = STAY[1]
  let phase = 0
  let camSpeed = 0
  let camTurn = 0
  let moving = false
  let stillFor = 0
  const cameraAtArrival = new THREE.Vector3()
  let unseen = 0
  let seen = false
  let near = DISTANCE

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

  /** Whether the camera's move sends it off now: 'flee', 'calm' (lost interest) or false (tolerated) */
  function reaction(camera, moved, setOff) {
    const gap = camera.position.distanceTo(root.position)
    if (camSpeed > STARTLE.speed || camTurn > STARTLE.turn || gap < TOO_CLOSE) return 'flee'
    if (setOff && Math.random() < SKITTISH) return 'flee'
    if (!moved) return false
    if (gap > LOST_DISTANCE * near) return 'calm'
    return unseen > LOST ? 'calm' : false
  }

  /** In the view's frame (with a margin) */
  function inView(camera) {
    const p = root.position.clone().project(camera)
    return p.z < 1 && Math.abs(p.x) < 1.1 && Math.abs(p.y) < 1.1
  }

  /** @param {boolean} [bored] - a calm departure (bored), not a flight */
  function leave(bored = false, camera = null) {
    state = 'leaving'
    calm = bored
    leftAt = since
    leaveSpeed = 0
    // The diver moved since it came: its way out, away from them (straight, or up to 60° to a side), where it is clear
    if (!camera || camera.position.distanceTo(cameraAtArrival) < 0.3) return
    const away = root.position.clone().sub(camera.position).setY(0).normalize()
    for (const angle of [0, 0.5, -0.5, 1, -1]) {
      const way = away.clone().applyAxisAngle(UP, angle)
      const end = root.position.clone().addScaledVector(way, 3)
      if (clearance(end) >= CLEARANCE && clearance(root.position.clone().addScaledVector(way, 1.5)) >= CLEARANCE) {
        exit.copy(end)
        return
      }
    }
  }

  /** Turns toward a direction as a fish does (Christian, 2026-10-23: the even pivot was not natural): its turning rate
   *  eases in and out (toward TURN_GAIN times what is left, at most `turn`), and while it turns its body curves into a C
   *  (the spine below) and it glides forward a little; true once it faces that way and has stopped turning */
  function face(direction, dt, turn = TURN, ease = TURN_EASE) {
    const target = Math.atan2(direction.x, direction.z)
    const delta = Math.atan2(Math.sin(target - heading), Math.cos(target - heading))
    const wanted = THREE.MathUtils.clamp(delta * TURN_GAIN, -turn, turn)
    turnRate += (wanted - turnRate) * Math.min(1, ease * dt)
    heading += turnRate * dt
    root.position.addScaledVector(forward.set(Math.sin(heading), 0, Math.cos(heading)), Math.abs(turnRate) * GLIDE * dt)
    return Math.abs(delta) < 0.05 && Math.abs(turnRate) < 0.1
  }

  return {
    object: root,
    /** For tests */
    get debug() {
      return { state, idle, cooldown, lastPlan, leaveSpeed, toExit: exit.distanceTo(root.position) }
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
      // The camera still: idle grows; any move resets it. Its speed and turn (smoothed over about a fifth of a second)
      const moved = lastPosition.distanceToSquared(camera.position) > 1e-8 || lastQuaternion.angleTo(camera.quaternion) > 1e-4
      const smooth = Math.min(1, 5 * dt)
      camSpeed += ((dt > 0 ? lastPosition.distanceTo(camera.position) / dt : 0) - camSpeed) * smooth
      camTurn += ((dt > 0 ? lastQuaternion.angleTo(camera.quaternion) / dt : 0) - camTurn) * smooth
      // Setting off: moving after a quarter second still (a still frame in the middle of a drag is not a new start)
      stillFor = moved ? 0 : stillFor + dt
      const setOff = moved && !moving
      moving = moved || stillFor < 0.25
      lastPosition.copy(camera.position)
      lastQuaternion.copy(camera.quaternion)
      idle = moved ? 0 : idle + dt
      if (moved) idleFor = between(IDLE)
      cooldown = Math.max(0, cooldown - dt)
      if (!on) {
        state = 'away'
        root.visible = false
        return false
      }
      // Debug: whenever the camera moves, it starts over from its new place (no flight)
      if (always && moved && state !== 'away') state = 'away'
      if (state === 'away') {
        if (!always && (idle < idleFor || cooldown > 0)) return false
        if (!plan(camera)) {
          cooldown = 5
          return false
        }
        state = 'arriving'
        since = 0
        root.position.copy(from)
        heading = Math.atan2(to.x - from.x, to.z - from.z)
        turnRate = 0
        lastRoot.copy(from)
        speedNow = 0
        root.visible = true
        near = camera.position.distanceTo(to)
        cameraAtArrival.copy(camera.position)
        unseen = 0
        seen = false
      }
      since += dt
      // Out of view: counted once it has come into it (it arrives from just outside)
      if (inView(camera)) seen = true
      unseen = !seen || inView(camera) ? 0 : unseen + dt
      const react = state === 'leaving' ? false : reaction(camera, moved, setOff)
      const slow = pace()
      if (state === 'arriving') {
        const step = to.clone().sub(root.position)
        const left = step.length()
        if (react) leave(react === 'calm', camera)
        else if (left < 0.02) state = 'turning'
        else {
          step.normalize()
          // Its aim: the path, then more and more the diver
          toCamera.copy(camera.position).sub(root.position).setY(0).normalize()
          const toward = THREE.MathUtils.smoothstep(1 - left / TURN_BEFORE, 0, 1)
          face(aim.copy(step).lerp(toCamera, toward), dt)
          const speed = SWIM * slow * Math.max(SLOWEST, Math.min(1, left / SLOW_DOWN))
          root.position.addScaledVector(step, Math.min(left, speed * dt))
        }
      } else if (state === 'turning' || state === 'staying') {
        // Facing the diver, its eyes on them, following them as they move; a sudden move sends it away, and it gets bored
        // after a while
        toCamera.copy(camera.position).sub(root.position).setY(0)
        const faced = face(toCamera, dt, TURN * slow)
        if (state === 'turning' && faced) {
          state = 'staying'
          since = 0
          stayFor = between(STAY)
        }
        if (react) leave(react === 'calm', camera)
        else if (state === 'staying' && since > stayFor) leave(true, camera)
      } else if (state === 'leaving') {
        const step = exit.clone().sub(root.position)
        const left = step.length()
        if (left < LEAVE_NEAR || since - leftAt > LEAVE_MAX) {
          state = 'away'
          root.visible = false
          cooldown = between(COOLDOWN)
          return true
        }
        // Turning toward its way out while swimming where it points (an arc); faster as it lines up. In cold water,
        // everything slower (pace)
        face(step, dt, calm ? TURN * slow : FLEE_TURN, calm ? TURN_EASE : FLEE_EASE)
        const delta = Math.atan2(Math.sin(Math.atan2(step.x, step.z) - heading), Math.cos(Math.atan2(step.x, step.z) - heading))
        const lined = (1 + Math.cos(delta)) / 2
        const top = calm ? WANDER_OFF * slow : FLEE * Math.sqrt(slow)
        const wanted = top * (LEAVE_SLOWEST + (1 - LEAVE_SLOWEST) * lined * lined)
        leaveSpeed += (wanted - leaveSpeed) * Math.min(1, (calm ? LEAVE_ACCEL : FLEE_ACCEL) * dt)
        root.position.addScaledVector(forward.set(Math.sin(heading), 0, Math.cos(heading)), leaveSpeed * dt)
      }
      // Its speed this frame (smoothed), its turn counted in: the wave's pace and size follow it (in cold water it goes
      // slower, so it waves slower too)
      const travelled = dt > 0 ? root.position.distanceTo(lastRoot) / dt : 0
      lastRoot.copy(root.position)
      speedNow += (travelled + Math.abs(turnRate) * TURN_AS_SPEED - speedNow) * Math.min(1, 4 * dt)
      phase += dt * Math.min(BEAT_MAX, BEAT_REST + BEAT_PER_SPEED * speedNow) * Math.PI * 2
      const size = speedNow < SIZE_SPEED ? SIZE_REST + (1 - SIZE_REST) * (speedNow / SIZE_SPEED) : Math.min(WAVE_MAX, 1 + (speedNow - SIZE_SPEED) * 0.2)
      spine.forEach(({ bone, rest, axis }, k) => {
        const wave = WAVE[k] * size * Math.sin(phase - k * WAVE_LAG)
        bone.quaternion.copy(rest).premultiply(bend.setFromAxisAngle(axis, wave - THREE.MathUtils.clamp(turnRate * CURVE[k], -MAX_BEND, MAX_BEND)))
      })
      root.rotation.set(0, heading, 0)
      body.position.y = BOB * Math.sin(time * 1.3)
      return true
    },
  }
}
