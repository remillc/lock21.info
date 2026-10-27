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
import { bassColour, bassLength } from './fishes.js'

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
// (0.75: it stops about 3 ft from the diver, on a 16:9 view, Christian, 2026-10-27; was 1, about 4 ft)
const DISTANCE = 0.75
const VISIBILITY_SHARE = 0.5
// Fleeing (Christian, 2026-10-23: it rushes out): a quick turn away and a dash, speeding up over its first second
const SWIM = 0.16
// Arriving (TODO #60, Christian, 2026-10-24: the turn toward the diver should follow the swim in, not start after a
// stop): over its last SLOW_DOWN m it slows to SLOWEST of its speed, and over its last TURN_BEFORE m its aim shifts
// from its path to the diver, so it is already turning when it arrives
const SLOW_DOWN = 0.3
const SLOWEST = 0.15
const TURN_BEFORE = 0.35
const FLEE = 3.3
const TURN = 1.4
const FLEE_TURN = 7
// Leaving as a fish does (Christian, 2026-10-24: its turn away didn't look natural; it pivoted on the spot, then slid
// to its way out): it swims where its body points, so it follows an arc while it turns, at LEAVE_SLOWEST of its speed
// facing away and full speed once lined up, reaching it with LEAVE_ACCEL (calm) or FLEE_ACCEL (per second). Fleeing,
// a C-start: its turn snaps in (FLEE_EASE instead of TURN_EASE) and its body bends into a C, then the tail kick
// carries it off. Gone once LEAVE_NEAR m from its way out, or after LEAVE_MAX s. Fleeing (Christian, 2026-10-25: faster,
// and faster still while it turns), FLEE m/s once lined up and FLEE_SLOWEST of it facing away
const LEAVE_SLOWEST = 0.3
const FLEE_SLOWEST = 0.6
const LEAVE_ACCEL = 1.2
const FLEE_ACCEL = 4
const FLEE_EASE = 14
const LEAVE_NEAR = 0.3
const LEAVE_MAX = 10
// ... and if it is still in sight then, it swims on until it is not, LEAVE_GIVE_UP s at most
const LEAVE_GIVE_UP = 40
// Turning as a fish does (Christian, 2026-10-27: it pivoted on its centre and its body bent wrongly; studies of routine
// turns: the front of the body bends first, the head turning while the tail hardly does, then the bend travels down to
// the tail; the body rotates about a point near its centre of mass, about a third of its length from the snout):
// - it turns about PIVOT of its length from the snout: that point follows its path, the head swings into the turn and
//   the tail out of it;
// - the head points where it goes now; each part of the body points where the head pointed a moment earlier (its place
//   along the body, SEGMENTS, times the pulse's time down the whole body: the body's length over its speed, between
//   PULSE[0] and PULSE[1] s), so the bend starts at the head and runs down to the tail
const PIVOT = 0.3
// The spine bones' middles along the body (share of its length from the snout: tools/creatures/rig_bass.py, JOINTS)
const SEGMENTS = [0.13, 0.37, 0.57, 0.74, 0.91]
const PULSE = [0.12, 0.4]
// Each spine bone's whole bend (the swimming wave and the turn together, rad), head to tail: added up, they folded the
// tail to 1.25 rad leaving (Christian, 2026-10-24: not natural)
const BEND_LIMIT = [0.2, 0.3, 0.4, 0.5, 0.6]
// Facing the diver (Christian, 2026-10-24: each visit a slightly different angle): it faces them at an angle drawn at
// random for each visit, up to GAZE rad to one side or the other, held for the whole visit
const GAZE = 0.3
// How long it watches the diver before it gets bored (s, at random in between: Christian, 2026-10-23), its calm
// departure's speed (m/s), and its gentle hover (m)
const STAY = [8, 15]
const WANDER_OFF = 0.35
const BOB = 0.02
// Movement tolerated most of the time (Christian, 2026-10-24): it flees from a sudden move only, the camera faster than
// STARTLE (m/s, swimming with Shift) or nearer than TOO_CLOSE (m); a gentle swim scares it only at random, SKITTISH each
// time the camera sets off. Turning the head never scares it (Christian, 2026-10-24: turning the light toward it sent it
// off): only the camera's place counts. Out of view for LOST s, or farther than LOST_DISTANCE times its distance, it
// loses interest and swims off calmly
const STARTLE = 2.5
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
// The body's and tail's wave 20 % slower than those beats (Christian, 2026-10-25), the swimming speed unchanged
const BEAT_PACE = 0.8
const BEAT_MAX = 4
const SIZE_REST = 0.25
const SIZE_SPEED = 0.2
const WAVE_MAX = 1.3
// Swimming away (calm or fleeing), the wave this much smaller (Christian, 2026-10-27: too wide), reached in about a
// third of a second
const LEAVE_WAVE = 0.6
// How a turn counts as speed for the tail (m/s per rad/s): the tail beats as it turns
const TURN_AS_SPEED = 0.12
// Turning: how fast its turning rate follows (1/s) and how it scales with what is left to turn; its glide while turning
// (m per rad: a turn about 0.12 of its length across, smallmouth bass turn within 0.2)
const TURN_EASE = 3
const TURN_GAIN = 2.5
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
      object.material = prepare(object.material.clone(), { tint: true })
      materials.push(object.material)
    })
    // Centred, scaled to LENGTH, its head toward +z (as the model is)
    const box = new THREE.Box3().setFromObject(model)
    const size = box.getSize(new THREE.Vector3())
    const centre = box.getCenter(new THREE.Vector3())
    model.position.sub(centre)
    unitScale = 1 / size.z
    body.scale.setScalar(LENGTH * unitScale)
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
    // The pivot (PIVOT of the length from the snout, the head toward +z), held by the last bone that starts ahead of it:
    // its place in that bone's frame, to follow it as the body bends
    const pivot = new THREE.Vector3(0, 0, (size.z / 2 - PIVOT * size.z))
    const relative = (bone) => body.matrixWorld.clone().invert().multiply(bone.matrixWorld)
    anchor = spine.filter(({ bone }) => new THREE.Vector3().setFromMatrixPosition(relative(bone)).z >= pivot.z).pop()?.bone ?? spine[0].bone
    anchorPoint.copy(pivot).applyMatrix4(relative(anchor).invert())
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
  let gaze = 0
  let unitScale = 1
  /** @type {THREE.Material[]} */
  const materials = []
  /** @type {[number, number][]} time and heading, newest first (the body following its head) */
  const headings = []
  /** @type {THREE.Bone | null} the bone that holds the pivot, and the pivot in its frame */
  let anchor = null
  const anchorPoint = new THREE.Vector3()
  const pivotNow = new THREE.Matrix4()
  const bodyInverse = new THREE.Matrix4()
  const held = new THREE.Vector3()
  const ahead = new THREE.Vector3()
  const toCamera = new THREE.Vector3()
  const aim = new THREE.Vector3()
  let heading = 0
  let lastPlan = null
  let leftAt = 0
  let calm = false
  let stayFor = STAY[1]
  let phase = 0
  let waveScale = 1
  let camSpeed = 0
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

  /** Whether the camera's move sends it off now: 'flee', 'calm' (lost interest) or false (tolerated); `moved`: the
   *  camera changed place (a turn of the head alone never counts) */
  function reaction(camera, moved, setOff) {
    const gap = camera.position.distanceTo(root.position)
    if (camSpeed > STARTLE || gap < TOO_CLOSE) return 'flee'
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
      // The camera still: idle grows; any move resets it, a turn included. Its speed (smoothed over about a fifth of a
      // second)
      const swam = lastPosition.distanceToSquared(camera.position) > 1e-8
      const moved = swam || lastQuaternion.angleTo(camera.quaternion) > 1e-4
      const smooth = Math.min(1, 5 * dt)
      camSpeed += ((dt > 0 ? lastPosition.distanceTo(camera.position) / dt : 0) - camSpeed) * smooth
      // Setting off: swimming after a quarter second in place (a still frame in the middle of a swim is not a new start)
      stillFor = swam ? 0 : stillFor + dt
      const setOff = swam && !moving
      moving = swam || stillFor < 0.25
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
      // Debug: whenever the camera changes place, it flees (then comes back, at once); a turn of the head does not count
      // (Christian, 2026-10-25: turning to light it made it vanish at once; « it must flee, not vanish »)
      if (always && swam && (state === 'arriving' || state === 'turning' || state === 'staying')) leave(false, camera)
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
        headings.length = 0
        waveScale = 1
        turnRate = 0
        lastRoot.copy(from)
        speedNow = 0
        root.visible = true
        near = camera.position.distanceTo(to)
        cameraAtArrival.copy(camera.position)
        // This visit's angle to the diver, and its length (a different bass each time: 25 to 50 cm, fishes.js)
        gaze = (Math.random() * 2 - 1) * GAZE
        body.scale.setScalar(bassLength() * unitScale)
        // ... and its colour (fishes.js: the real colours, by the water's clarity)
        const colour = bassColour(visibility())
        for (const material of materials) material.color.copy(colour)
        unseen = 0
        seen = false
      }
      since += dt
      // Out of view: counted once it has come into it (it arrives from just outside)
      if (inView(camera)) seen = true
      unseen = !seen || inView(camera) ? 0 : unseen + dt
      // (its place only: turning the head toward it, to light it, sent it off when it was out of view: Christian,
      // 2026-10-25)
      const react = state === 'leaving' ? false : reaction(camera, swam, setOff)
      const slow = pace()
      if (state === 'arriving') {
        const step = to.clone().sub(root.position)
        const left = step.length()
        if (react) leave(react === 'calm', camera)
        else if (left < 0.02) state = 'turning'
        else {
          step.normalize()
          // Its aim: the path, then more and more the diver
          toCamera.copy(camera.position).sub(root.position).setY(0).normalize().applyAxisAngle(UP, gaze)
          const toward = THREE.MathUtils.smoothstep(1 - left / TURN_BEFORE, 0, 1)
          face(aim.copy(step).lerp(toCamera, toward), dt)
          const speed = SWIM * slow * Math.max(SLOWEST, Math.min(1, left / SLOW_DOWN))
          root.position.addScaledVector(step, Math.min(left, speed * dt))
        }
      } else if (state === 'turning' || state === 'staying') {
        // Facing the diver, its eyes on them, following them as they move; a sudden move sends it away, and it gets bored
        // after a while
        toCamera.copy(camera.position).sub(root.position).setY(0)
        const faced = face(toCamera.applyAxisAngle(UP, gaze), dt, TURN * slow)
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
        // Gone only out of the diver's sight: out of the view or beyond the visibility (Christian, 2026-10-25: it vanished
        // in plain sight at its way out); still seen there, it swims on the way it goes
        const outOfSight = !inView(camera) || camera.position.distanceTo(root.position) > visibility()
        if (left < LEAVE_NEAR || since - leftAt > LEAVE_MAX) {
          if (outOfSight || since - leftAt > LEAVE_GIVE_UP) {
            state = 'away'
            root.visible = false
            cooldown = between(COOLDOWN)
            return true
          }
          exit.copy(root.position).addScaledVector(forward.set(Math.sin(heading), 0, Math.cos(heading)), 3)
        }
        // Turning toward its way out while swimming where it points (an arc); faster as it lines up. In cold water,
        // everything slower (pace)
        face(step, dt, calm ? TURN * slow : FLEE_TURN, calm ? TURN_EASE : FLEE_EASE)
        const delta = Math.atan2(Math.sin(Math.atan2(step.x, step.z) - heading), Math.cos(Math.atan2(step.x, step.z) - heading))
        const lined = (1 + Math.cos(delta)) / 2
        const top = calm ? WANDER_OFF * slow : FLEE * Math.sqrt(slow)
        const slowest = calm ? LEAVE_SLOWEST : FLEE_SLOWEST
        const wanted = top * (slowest + (1 - slowest) * lined * lined)
        leaveSpeed += (wanted - leaveSpeed) * Math.min(1, (calm ? LEAVE_ACCEL : FLEE_ACCEL) * dt)
        root.position.addScaledVector(forward.set(Math.sin(heading), 0, Math.cos(heading)), leaveSpeed * dt)
      }
      // Its speed this frame (smoothed), its turn counted in: the wave's pace and size follow it (in cold water it goes
      // slower, so it waves slower too)
      const travelled = dt > 0 ? root.position.distanceTo(lastRoot) / dt : 0
      lastRoot.copy(root.position)
      speedNow += (travelled + Math.abs(turnRate) * TURN_AS_SPEED - speedNow) * Math.min(1, 4 * dt)
      phase += dt * Math.min(BEAT_MAX, BEAT_REST + BEAT_PER_SPEED * speedNow) * BEAT_PACE * Math.PI * 2
      waveScale += ((state === 'leaving' ? LEAVE_WAVE : 1) - waveScale) * Math.min(1, 3 * dt)
      const size = waveScale * (speedNow < SIZE_SPEED ? SIZE_REST + (1 - SIZE_REST) * (speedNow / SIZE_SPEED) : Math.min(WAVE_MAX, 1 + (speedNow - SIZE_SPEED) * 0.2))
      // The recent headings, newest first; each part of the body points where the head pointed `ago` s earlier
      headings.unshift([time, heading])
      while (headings.length > 2 && headings[headings.length - 2][0] < time - PULSE[1]) headings.pop()
      const headingAt = (ago) => {
        const when = time - ago
        const k = headings.findIndex(([t]) => t <= when)
        if (k < 0) return headings[headings.length - 1][1]
        if (k === 0) return headings[0][1]
        const [t0, h0] = headings[k]
        const [t1, h1] = headings[k - 1]
        return h0 + ((h1 - h0) * (when - t0)) / Math.max(t1 - t0, 1e-6)
      }
      // The bend's time down the whole body: its length over its speed (the body follows the head's path), a short
      // pulse when it dashes, a slower one when it turns in place
      const length = body.scale.z / unitScale
      const pulse = THREE.MathUtils.clamp(length / Math.max(speedNow, 1e-3), PULSE[0], PULSE[1])
      // The body's frame: where the pivot's part points; each bone turns by its part's heading less the one before it
      const frame = headingAt(PIVOT * pulse)
      let before = frame
      spine.forEach(({ bone, rest, axis }, k) => {
        const wave = WAVE[k] * size * Math.sin(phase - k * WAVE_LAG)
        const part = headingAt(SEGMENTS[k] * pulse)
        const limit = BEND_LIMIT[k] ?? BEND_LIMIT[BEND_LIMIT.length - 1]
        bone.quaternion.copy(rest).premultiply(bend.setFromAxisAngle(axis, THREE.MathUtils.clamp(wave + part - before, -limit, limit)))
        before = part
      })
      root.rotation.set(0, frame, 0)
      // The pivot kept on its path: the body moved so that the pivot, wherever the bend took it, is at the root
      body.position.set(0, 0, 0)
      body.updateMatrixWorld(true)
      bodyInverse.copy(body.matrixWorld).invert()
      held.copy(anchorPoint).applyMatrix4(pivotNow.multiplyMatrices(bodyInverse, anchor.matrixWorld)).multiply(body.scale)
      body.position.set(-held.x, BOB * Math.sin(time * 1.3), -held.z)
      return true
    },
  }
}
