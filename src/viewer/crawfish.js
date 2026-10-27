// A crayfish (« crawfish » empty of the .blend, exported with the mockups: export_mockups.py) that defends itself as
// the diver comes close. The model: « Crayfish » by ucdavisterc (Sketchfab, CC BY 4.0), rigged, packed into
// public/creatures/crayfish.glb (textures 1024 px WebP); its pincers' tips orange, found from the claw bones' weights
// and the fingers' end bones.
//
// Behaviour: it faces a diver closer than REACT m (and turns again, REACTION s after they have moved round it by more
// than REFACE); its threat posture eases in from REACT and is full at THREAT m: front raised, tail held up in an arc
// (the legs stay down), claws raised, spread and open; now and then both arms open out wider together, their pincers
// opening wide too, and come back. And now and then (DANCE_CHANCE) when the diver keeps still in front of it for a
// while (DANCE_STILL s, at random in between), it dances, as Family Guy's dancing lobster (the « Iraq lobster » GIF,
// measured frame by frame: crawfish-dance.json): it stands up on its rear legs, facing the diver, plays the GIF for
// DANCE s, then sits back down into its threat; the diver moving ends it. Left alone, it
// wanders: a few steps now and then to a spot within WANDER m of its place, only where the ground below is the same
// floor (options.ground), legs paddling.
//
// The rig's bones are turned about axes of the crayfish's own frame (forward +z, up +y), converted once into each
// bone's parent space from the rest pose: no need to know how each bone's own axes were set in the rig.
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import DANCE_DATA from './crawfish-dance.json'

const URL = `/viewer/creatures/crayfish.glb`
// Its length from claws to tail fan (m): a large rusty crayfish
const LENGTH = 0.16
const REACT = 1.8
const THREAT = 0.8
const TURN_SPEED = 2.2
// The posture follows the diver's distance as a critically damped spring (rad/s): it eases in and out, no jolt
const POSTURE_SPRING = 4
// It turns to face the diver again once they are more than REFACE (rad, about 20°) off its heading, after REACTION s
const REFACE = 0.35
const REACTION = 2
// The claws' gestures in attack mode, both arms together, on a clock of their own: independent of the crayfish's
// moves (its shuffles and turns; Christian, 2026-10-23). A gesture's length (s, at random in between), its size (open
// out and raise, times the full gesture, at random), and the wait between two (GESTURE_WAIT, s, at random). Its shape
// (more natural): the arms snap out a little past their mark and settle (GESTURE_OUT of it), hold, then ease back;
// the pincers follow a moment later (GESTURE_FOLLOW, s)
const GESTURE = [1.3, 2.2]
const GESTURE_SIZE = [0.5, 1.2]
const GESTURE_WAIT = [1.5, 4]
const GESTURE_OUT = 0.25
const GESTURE_HOLD = 0.5
const GESTURE_FOLLOW = 0.1
// Between gestures the arms drift slowly, together: their raise and spread (rad), each at its own pace (rad/s, at
// random)
const DRIFT = 0.12
const DRIFT_PACE = [0.5, 1.1]
// The dance (Christian, 2026-10-25, after Family Guy's dancing lobster: « standing, exactly as in the GIF; it gets up,
// dances and rests »): once the diver has kept still for DANCE_STILL s (at random in between; moving more than STILL
// m ends it), in the threat posture, for DANCE s (at random). It stands up (STAND rad, about 72°, on its rear legs,
// its lower rear foot on the ground, its tail folded back behind it; STAND_SPRING, 1/s: about a second), then plays the GIF's
// FRAMES at its pace (DANCE_FRAME s each), smoothly from one to the next, looping; then it sits back down
const DANCE_STILL = [8, 12]
// Not every time (Christian, 2026-10-25: « once in 3 or 4 »): one draw for each time the diver stops in front of it,
// once the wait is over; drawn or not, no other dance until the diver moves on
const DANCE_CHANCE = 1 / 3.5
const DANCE = [6, 10]
const STAND = 1.25
const STAND_SPRING = 4
const GROOVE_SPRING = 10
const STILL = 0.02
// The « Iraq lobster » GIF (tenor.com, 46 frames at 10 per second), measured frame by frame (Christian, 2026-10-25:
// « every position frame by frame; every limb »): the joints' keypoints read off a grid on each frame, then the
// crayfish's skeleton fitted to them, seen from the front (tools/creatures/fit_dance.mjs): crawfish-dance.json, one
// row of DANCE_DATA.params per frame. Angles in radians, in the plane facing the diver, each limb's outward turn
// positive: lean (its top toward screen right), twist (turned to show its screen-right side), tail (its swing toward
// screen right), curl (folded further back), then per side (R: the crayfish's right, on screen left; L) the claw's
// arm, elbow, wrist and pincer opening, the rear leg's hip, knee and ankle, the small legs' fan and the antenna
const PARAMS = DANCE_DATA.params
const FRAMES = DANCE_DATA.frames
const STAND_FRAME = DANCE_DATA.stand
const DANCE_FRAME = DANCE_DATA.frameTime
// The small legs (front, mid1, mid2: the rear pair stands): each a little later than the one before (LEG_LAG s,
// a wave down the fan) and spread FAN_SPREAD apart, their joints bending with how fast they swing (LEG_DRAG rad per
// rad/s: limp, not rigid); the tail's joints, each TAIL_LAG s after the one before; the antennae's tips, ANTENNA_LAG s
const SMALL_LEGS = ['front', 'mid1', 'mid2']
const LEG_LAG = 0.04
const FAN_SPREAD = 0.25
const LEG_DRAG = 0.08
const TAIL_LAG = 0.03
const ANTENNA_LAG = 0.08
// The tail's arc in the threat posture: its joints, and the total bend (rad, about 100°)
const TAIL = ['tail_000', 'tail_001', 'tail_002', 'tail_003', 'tail_004', 'tail_005']
const TAIL_ARC = 1.75
// Wandering: how far from its place (m), its walking speed (m/s), the wait between walks (s, at random in between)
const WANDER = 0.6
const WALK_SPEED = 0.05
// (more often: Christian, 2026-10-23; was 4 to 10 s)
const REST = [1.5, 4]
// Each walk's length (m, at random in between: short, Christian 2026-10-23)
const STEP = [0.05, 0.15]
// In attack mode, a shuffle now and then: a few cm (SHUFFLE, m, at most) sideways, forward or back, still facing the
// diver, every SHUFFLE_WAIT s (at random in between)
const SHUFFLE = 0.08
const SHUFFLE_WAIT = [2, 5]
// The claws keep the texture's colours (a blue tint was tried and removed, 2026-10-23); orange at the fingers' tips
// (within TIP m of the fingers' end once scaled), as on Christian's reference photo of a blue land crayfish. Linear
const CLAW_TIP = new THREE.Color(0.85, 0.3, 0.04)
const TIP = 0.012

// The antennae in the current: how far they bend toward its direction (rad, the base and the tip segment) at
// CURRENT_FULL m/s and above
const ANTENNA_BEND = [0.9, 0.7]
const CURRENT_FULL = 0.5
// Without a current given: the river's, west to east (35 ft/min, measured 2024-06-08)
const DEFAULT_CURRENT = new THREE.Vector3((35 * 0.3048) / 60, 0, 0)

/** A gesture's envelope at t s into it, `length` s long (0 to about 1.05 at the overshoot) */
function gestureAt(t, length) {
  const u = t / length
  if (u <= 0 || u >= 1) return 0
  if (u < GESTURE_OUT) {
    // Ease out with a slight overshoot (« back », about 5 %)
    const k = u / GESTURE_OUT - 1
    return 1 + 2.2 * k * k * k + 1.2 * k * k
  }
  if (u < GESTURE_HOLD) return 1
  // Ease in and out back to rest
  const k = (u - GESTURE_HOLD) / (1 - GESTURE_HOLD)
  return 1 - (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2)
}

const X = new THREE.Vector3(1, 0, 0)
const Y = new THREE.Vector3(0, 1, 0)
const Z = new THREE.Vector3(0, 0, 1)

/**
 * @param {object} options
 * @param {(material: THREE.Material) => THREE.Material} [options.prepare] - the viewer's material set-up (shadows,
 *   underwater)
 * @param {(x: number, y: number, z: number) => ({ y: number, floor: string } | null)} [options.ground] - the floor
 *   below a point: its height and which floor it is (a zone), or null; without it, no wandering
 * @param {() => THREE.Vector3} [options.current] - the river's current (m/s, world): the antennae bend with it
 * @param {boolean} [options.alwaysDance] - debug (?dance=1): it dances all through its threat posture
 * @param {Promise<unknown>} [options.when] - its model loads once this settles (the viewer: after the first view, so as
 *   not to share the bandwidth with the coarsest tiles)
 */
export function createCrawfish({ prepare = (m) => m, ground = null, current = () => DEFAULT_CURRENT, alwaysDance = false, when = Promise.resolve() } = {}) {
  const root = new THREE.Group()
  root.name = 'crawfish'
  // The model, turned and scaled so that it faces +z, its feet at y = 0
  const body = new THREE.Group()
  root.add(body)
  /** @type {Record<string, { bone: THREE.Bone, rest: THREE.Quaternion, toLocal: THREE.Quaternion }>} */
  const bones = {}
  let ready = false
  let side = 1

  when.then(() => new GLTFLoader().load(URL, (gltf) => {
    const model = gltf.scene
    model.updateMatrixWorld(true)
    let skinned = null
    model.traverse((object) => {
      if (object.isBone) object.name = object.name.replace(/_\d+$/, '')
      if (!object.isMesh) return
      object.castShadow = object.receiveShadow = true
      object.frustumCulled = false
      if (object.isSkinnedMesh && !skinned) skinned = object
      object.material = prepare(tintClaws(object))
    })
    // Its frame: forward from the tail to the claws, scaled to LENGTH, feet on the ground
    const at = (name) => model.getObjectByName(name)?.getWorldPosition(new THREE.Vector3())
    const forward = at('claw_L_003_end').add(at('claw_R_003_end')).multiplyScalar(0.5).sub(at('fin_middle_end')).setY(0)
    model.rotation.y = -Math.atan2(forward.x, forward.z)
    model.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(skinned ?? model)
    const size = box.getSize(new THREE.Vector3())
    body.scale.setScalar(LENGTH / Math.max(size.x, size.z))
    body.add(model)
    body.updateMatrixWorld(true)
    const settled = new THREE.Box3().setFromObject(skinned ?? model)
    model.position.y -= body.worldToLocal(new THREE.Vector3(0, settled.min.y, 0)).y
    body.updateMatrixWorld(true)
    // Left is +x or -x in its frame: from the left claw's place
    const inBody = (name) => body.worldToLocal(model.getObjectByName(name).getWorldPosition(new THREE.Vector3()))
    side = Math.sign(inBody('claw_L_000').x) || 1
    // Each bone: its rest rotation, and the turn from the crayfish's frame to its parent's space
    const bodyWorld = body.getWorldQuaternion(new THREE.Quaternion())
    model.traverse((object) => {
      if (!object.isBone) return
      const toLocal = object.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(bodyWorld)
      bones[object.name] = { bone: object, rest: object.quaternion.clone(), toLocal }
    })
    feet = ['L', 'R'].map((name) => model.getObjectByName(`leg_rear_${name}_002_end`)).filter(Boolean)
    ready = true
  }))

  /** The pincers' orange tips: a copy of the material that tints them (the claw bones' weights, near the fingers' end) */
  function tintClaws(mesh) {
    const material = mesh.material.clone()
    if (!mesh.isSkinnedMesh) return material
    const skinIndex = mesh.geometry.attributes.skinIndex
    const skinWeight = mesh.geometry.attributes.skinWeight
    const clawJoints = new Set(mesh.skeleton.bones.map((b, i) => (/^claw_/.test(b.name) ? i : -1)).filter((i) => i >= 0))
    const clawness = new Float32Array(skinIndex.count)
    for (let i = 0; i < skinIndex.count; i++) {
      for (let k = 0; k < 4; k++) if (clawJoints.has(skinIndex.getComponent(i, k))) clawness[i] += skinWeight.getComponent(i, k)
    }
    mesh.geometry.setAttribute('clawness', new THREE.BufferAttribute(clawness, 1))
    // The fingers' tips: near the end of each claw's last bone (its moving finger; the fixed one closes against it),
    // in the mesh's bind space (from the bones' inverse bind matrices)
    const position = mesh.geometry.attributes.position
    const ends = mesh.skeleton.bones
      .map((bone, i) => (/^claw_[LR]_003$/.test(bone.name) ? i : -1))
      .filter((i) => i >= 0)
      .map((i) => {
        const bind = mesh.skeleton.boneInverses[i].clone().invert()
        const child = mesh.skeleton.bones[i].children.find((c) => c.isBone)
        return child ? child.position.clone().applyMatrix4(bind) : new THREE.Vector3().setFromMatrixPosition(bind)
      })
    const size = new THREE.Box3().setFromBufferAttribute(position).getSize(new THREE.Vector3())
    const radius = (TIP / LENGTH) * Math.max(size.x, size.y, size.z)
    const tipness = new Float32Array(position.count)
    const point = new THREE.Vector3()
    for (let i = 0; i < position.count; i++) {
      point.fromBufferAttribute(position, i)
      const nearest = Math.min(...ends.map((end) => end.distanceTo(point)))
      tipness[i] = 1 - THREE.MathUtils.smoothstep(nearest, radius * 0.4, radius)
    }
    mesh.geometry.setAttribute('tipness', new THREE.BufferAttribute(tipness, 1))
    material.onBeforeCompile = (shader) => {
      shader.uniforms.clawTip = { value: CLAW_TIP }
      shader.vertexShader = 'attribute float clawness;\nattribute float tipness;\nvarying float vClawness;\nvarying float vTipness;\n' +
        shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvClawness = clawness;\nvTipness = tipness;')
      shader.fragmentShader = 'uniform vec3 clawTip;\nvarying float vClawness;\nvarying float vTipness;\n' +
        shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
          // The tips' orange, with the texture's light and shade (the claws otherwise keep the texture's colours)
          float clawShade = 0.45 + 1.6 * dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
          float onClaw = smoothstep(0.3, 0.9, vClawness);
          diffuseColor.rgb = mix(diffuseColor.rgb, clawTip * clawShade, vTipness * onClaw);`)
    }
    material.customProgramCacheKey = () => 'crayfish-claws'
    return material
  }

  const turn = new THREE.Quaternion()
  const axis = new THREE.Vector3()
  /** Sets a bone to its rest rotation turned by these (axis in the crayfish's frame, angle) pairs */
  function pose(name, ...turns) {
    const entry = bones[name]
    if (!entry) return
    entry.bone.quaternion.copy(entry.rest)
    for (const [frameAxis, angle] of turns) {
      if (!angle) continue
      axis.copy(frameAxis).applyQuaternion(entry.toLocal)
      entry.bone.quaternion.premultiply(turn.setFromAxisAngle(axis, angle))
    }
  }
  const liveToLocal = new THREE.Quaternion()
  const frameNow = new THREE.Quaternion()
  /** As pose, about the crayfish's frame as its parent bone is posed now (not at rest): for the joints down a chain
   *  (knee, ankle, elbow, wrist, the tail's and antennae's later joints), whose parents have already turned (standing,
   *  the hips turned 72°: about the rest axes, a knee swept a cone and couldn't reach the plane facing the diver, and
   *  the tail came forward). Its parent must be posed first */
  function poseLive(name, ...turns) {
    const entry = bones[name]
    if (!entry) return
    entry.bone.parent.updateWorldMatrix(true, false)
    liveToLocal.copy(entry.bone.parent.getWorldQuaternion(liveToLocal)).invert().multiply(body.getWorldQuaternion(frameNow))
    entry.bone.quaternion.copy(entry.rest)
    for (const [frameAxis, angle] of turns) {
      if (!angle) continue
      axis.copy(frameAxis).applyQuaternion(liveToLocal)
      entry.bone.quaternion.premultiply(turn.setFromAxisAngle(axis, angle))
    }
  }

  let posture = 0
  let postureSpeed = 0
  let time = 0
  const toCamera = new THREE.Vector3()
  let facing = null
  let noticed = 0
  let home = null
  let floor = null
  let walkTo = null
  let rest = REST[0]
  let stride = 0
  let shuffleTo = null
  let shuffleWait = SHUFFLE_WAIT[0] + Math.random() * (SHUFFLE_WAIT[1] - SHUFFLE_WAIT[0])
  const between = ([low, high]) => low + Math.random() * (high - low)
  // The arms' gesture and drift (both arms), their timing apart from the shuffles' (random from the start)
  const arms = {
    t: -1,
    wait: between(GESTURE_WAIT),
    length: between(GESTURE),
    open: 1,
    raise: 1,
    pace: [between(DRIFT_PACE), between(DRIFT_PACE)],
    phase: [Math.random() * 6.3, Math.random() * 6.3],
  }
  // The dance: how long the diver has kept still, the wait drawn for this time, the dance's clock (-1: not dancing)
  // and its weight (eased in and out)
  const dance = {
    still: 0, after: between(DANCE_STILL), drawn: false, t: -1, length: 0, endedAt: 0, grooveFrom: -1,
    stand: 0, standSpeed: 0, groove: 0, grooveSpeed: 0, at: new THREE.Vector3(),
  }
  let frozenFrame = -1
  // The rear feet (the legs' end bones), found once loaded: standing, the body rests on the lower one
  let feet = []
  const footAt = new THREE.Vector3()
  /** The dance's pose t s into the groove: the frames, smoothly through them (Catmull-Rom), looping; the first frame
   *  eased in from the standing pose. Its values by name (lean, R.arm…) */
  function dancePose(t) {
    if (override) return named(override)
    const f = t / DANCE_FRAME
    const k = Math.floor(f)
    const u = f - k
    const at = (i) => (i < 0 ? STAND_FRAME : FRAMES[i % FRAMES.length])
    const [a, b, c, d] = [at(k - 1), at(k), at(k + 1), at(k + 2)]
    return named(b.map((_, n) => {
      const p0 = a[n], p1 = b[n], p2 = c[n], p3 = d[n]
      return 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u)
    }))
  }
  function named(values) {
    return Object.fromEntries(PARAMS.map((name, i) => [name, values[i]]))
  }
  // For tests (the fit): a pose given as a row, held standing
  let override = null

  const legs = ['front', 'mid1', 'mid2', 'rear'].flatMap((leg) => [`leg_${leg}_L_000`, `leg_${leg}_R_000`])

  /** A spot to walk to, on the same floor, or null */
  function pickSpot() {
    for (let i = 0; i < 8; i++) {
      // A short walk from where it stands (STEP), still within WANDER of its place
      const angle = Math.random() * Math.PI * 2
      const reach = STEP[0] + Math.random() * (STEP[1] - STEP[0])
      const x = root.position.x + Math.cos(angle) * reach
      const z = root.position.z + Math.sin(angle) * reach
      if (Math.hypot(x - home.x, z - home.z) > WANDER) continue
      const below = ground(x, root.position.y, z)
      if (below && below.floor === floor && Math.abs(below.y - home.y) < 0.12) return new THREE.Vector3(x, below.y, z)
    }
    return null
  }

  return {
    object: root,
    /** Debug (?dance=1, the settings): it dances all through its threat posture; off, its dance ends as usual */
    set alwaysDance(on) {
      alwaysDance = on
      if (!on) {
        dance.still = 0
        if (dance.t >= 0) dance.length = dance.t + between(DANCE) / 2
      }
    },
    /** For tests: the dance held on one of the GIF's frames (counted from 0; -1: playing) */
    set danceFrame(n) {
      frozenFrame = n
    },
    /** For tests (the fit): a pose held, standing (a row of DANCE_DATA.params), or null */
    set danceOverride(row) {
      override = row
    },
    /** For tests (the fit): its joints seen from the front, in its own frame (x to screen right as the diver sees it,
     *  y up, m) */
    get danceKeypoints() {
      root.updateMatrixWorld(true)
      const at = (name) => {
        const bone = body.getObjectByName(name)
        if (!bone) return null
        const v = root.worldToLocal(bone.getWorldPosition(new THREE.Vector3()))
        return [v.x * side, v.y]
      }
      const out = {}
      for (const name of ['tail_000', 'tail_002', 'tail_005', 'fin_middle_end', 'antenna_L_000', 'antenna_R_000',
        'antenna_L_001_end', 'antenna_R_001_end']) out[name] = at(name)
      for (const S of ['L', 'R']) {
        for (const j of ['000', '001', '002', '003', '003_end']) out[`claw_${S}_${j}`] = at(`claw_${S}_${j}`)
        for (const j of ['000', '001', '002', '002_end']) out[`leg_rear_${S}_${j}`] = at(`leg_rear_${S}_${j}`)
        for (const leg of SMALL_LEGS) {
          out[`leg_${leg}_${S}_000`] = at(`leg_${leg}_${S}_000`)
          const end = body.getObjectByName(`leg_${leg}_${S}_002_end`) ? `leg_${leg}_${S}_002_end` : `leg_${leg}_${S}_003_end`
          out[`leg_${leg}_${S}_end`] = at(end)
        }
      }
      return out
    },
    /** For tests: its state */
    get debug() {
      return { ready, home: home?.toArray(), floor, walkTo: walkTo?.toArray(), rest, side, dance: { ...dance, at: undefined } }
    },
    /**
     * Each frame: wanders, faces the diver, takes its posture
     * @param {THREE.Camera} camera
     * @param {number} dt - seconds since the last frame
     * @returns {boolean} whether it moved (a new frame is needed)
     */
    update(camera, dt) {
      if (!ready) return false
      toCamera.copy(camera.position).sub(root.position)
      const distance = toCamera.length()
      // Too far to be seen moving: nothing to draw
      if (distance > 12 && posture < 0.001) return false
      time += dt
      // Its place and floor, once its zone's floor below it has loaded (the terrain under it is hit first while the
      // zone's tiles load; accepted only if no zone floor comes in 30 s): set on the floor
      if (!home && ground && distance < 12) {
        const below = ground(root.position.x, root.position.y, root.position.z)
        if (below && (below.floor !== 'context' || time > 30)) {
          root.position.y = below.y
          home = root.position.clone()
          floor = below.floor
        }
      }
      // Wandering, while left alone: a walk now and then; a diver close by stops it
      let walking = false
      if (floor && distance > REACT) {
        if (walkTo) {
          const step = walkTo.clone().sub(root.position).setY(0)
          const left = step.length()
          if (left < 0.01) {
            walkTo = null
            rest = REST[0] + Math.random() * (REST[1] - REST[0])
          } else {
            // Faces where it goes, then walks; follows the floor's height
            const heading = Math.atan2(step.x, step.z)
            const delta = Math.atan2(Math.sin(heading - root.rotation.y), Math.cos(heading - root.rotation.y))
            root.rotation.y += Math.sign(delta) * Math.min(Math.abs(delta), TURN_SPEED * dt)
            if (Math.abs(delta) < 0.4) {
              root.position.addScaledVector(step.divideScalar(left), Math.min(left, WALK_SPEED * dt))
              const below = ground(root.position.x, root.position.y, root.position.z)
              if (below) root.position.y += (below.y - root.position.y) * Math.min(1, 8 * dt)
            }
            walking = true
          }
        } else if ((rest -= dt) <= 0) {
          walkTo = pickSpot()
          rest = REST[0]
        }
      } else if (walkTo && distance <= REACT) {
        walkTo = null
      }
      // In attack mode, a few centimetres now and then, without turning: it keeps facing the diver
      if (floor && posture > 0.6) {
        if (shuffleTo) {
          const step = shuffleTo.clone().sub(root.position).setY(0)
          const left = step.length()
          if (left < 0.005) shuffleTo = null
          else {
            root.position.addScaledVector(step.divideScalar(left), Math.min(left, WALK_SPEED * dt))
            walking = true
          }
        } else if ((shuffleWait -= dt) <= 0) {
          shuffleWait = SHUFFLE_WAIT[0] + Math.random() * (SHUFFLE_WAIT[1] - SHUFFLE_WAIT[0])
          const angle = Math.random() * Math.PI * 2
          const reach = SHUFFLE * (0.4 + 0.6 * Math.random())
          const x = root.position.x + Math.cos(angle) * reach
          const z = root.position.z + Math.sin(angle) * reach
          const below = ground(x, root.position.y, z)
          const near = Math.hypot(x - home.x, z - home.z) < WANDER
          if (below && below.floor === floor && Math.abs(below.y - home.y) < 0.12 && near) shuffleTo = new THREE.Vector3(x, below.y, z)
        }
      } else shuffleTo = null
      // At rest (the diver farther than REACT) it doesn't bother with them. Closer, it faces them, then holds that
      // heading: when the diver has moved round it by more than REFACE, it waits REACTION s, then turns again
      if (distance < REACT) {
        const bearing = Math.atan2(toCamera.x, toCamera.z)
        const off = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b))
        if (facing === null) facing = bearing
        else if (Math.abs(off(bearing, facing)) > REFACE) {
          noticed += dt
          if (noticed > REACTION) {
            facing = bearing
            noticed = 0
          }
        } else noticed = 0
        const delta = off(facing, root.rotation.y)
        root.rotation.y += Math.sign(delta) * Math.min(Math.abs(delta), TURN_SPEED * dt)
      } else {
        facing = null
        noticed = 0
      }
      const wanted = THREE.MathUtils.smoothstep(REACT - distance, 0, REACT - THREAT)
      postureSpeed += (POSTURE_SPRING ** 2 * (wanted - posture) - 2 * POSTURE_SPRING * postureSpeed) * dt
      posture = THREE.MathUtils.clamp(posture + postureSpeed * dt, 0, 1)
      const p = posture

      // The dance: the diver keeping still (their place; turning the head doesn't count) in front of it, in the threat
      // posture; moving stops it
      if (alwaysDance) {
        dance.still = Infinity
        dance.length = Infinity
      } else if (camera.position.distanceTo(dance.at) > STILL) {
        dance.at.copy(camera.position)
        dance.still = 0
        dance.drawn = false
        if (dance.t >= 0) {
          dance.endedAt = dance.t
          dance.t = -1
          dance.after = between(DANCE_STILL)
        }
      } else dance.still += dt
      if (dance.t >= 0) {
        dance.t += dt
        if (dance.t > dance.length || p < 0.6) {
          dance.endedAt = dance.t
          dance.t = -1
          dance.still = 0
          dance.after = between(DANCE_STILL)
        }
      } else if (p > 0.8 && dance.still > dance.after && (alwaysDance || !dance.drawn)) {
        dance.drawn = true
        if (alwaysDance || Math.random() < DANCE_CHANCE) {
          dance.t = 0
          dance.length = between(DANCE)
        }
      }
      // It stands up, then grooves once up; at the end it stops grooving, then sits back down (two springs)
      const dancing = dance.t >= 0
      // Critically damped, in steps of at most 1/120 s (a slow frame made them overshoot and flicker)
      const spring = (value, speed, target, k) => {
        const n = Math.ceil(dt * 120)
        for (let i = 0; i < n; i++) {
          speed += (k * k * (target - value) - 2 * k * speed) * (dt / n)
          value = THREE.MathUtils.clamp(value + speed * (dt / n), 0, 1)
        }
        return [value, speed]
      }
      ;[dance.stand, dance.standSpeed] = spring(dance.stand, dance.standSpeed, dancing || dance.groove > 0.05 ? 1 : 0, STAND_SPRING)
      ;[dance.groove, dance.grooveSpeed] = spring(dance.groove, dance.grooveSpeed, dancing && dance.stand > 0.9 ? 1 : 0, GROOVE_SPRING)
      if (dancing && dance.stand > 0.9 && dance.grooveFrom < 0) dance.grooveFrom = dance.t
      if (!dancing && dance.groove < 0.01) dance.grooveFrom = -1
      const w = override ? 1 : dance.stand
      const g = override ? 1 : dance.groove
      // The pose, held where the dance ended while it eases out
      const grooveTime = frozenFrame >= 0 ? frozenFrame * DANCE_FRAME
        : dance.grooveFrom < 0 ? 0 : Math.max(0, (dancing ? dance.t : dance.endedAt) - dance.grooveFrom)
      const move = dancePose(grooveTime)
      if (w > 0.001) shuffleTo = null

      // The arms' gesture: now and then (GESTURE_WAIT), in attack mode, its own length and size
      if (arms.t >= 0) {
        arms.t += dt
        if (arms.t > arms.length + GESTURE_FOLLOW) {
          arms.t = -1
          arms.wait = between(GESTURE_WAIT)
        }
      } else if (p > 0.6 && w < 0.01 && (arms.wait -= dt) <= 0) {
        arms.t = 0
        arms.length = between(GESTURE)
        arms.open = between(GESTURE_SIZE)
        arms.raise = between(GESTURE_SIZE)
      }
      // Front raised: the body pitches up (a negative turn about x lifts +z); the legs turn back as much, so they stay
      // down. The tail is held up in an arc of a circle all through the threat posture (Christian, 2026-10-23): the
      // same bend at each of its joints (a positive turn lifts its far end, toward -z), TAIL_ARC in all
      // Standing (the dance): the whole crayfish pitched up STAND about its feet (the body's origin), lifted so that its
      // rear legs, turned down, reach the ground; its front lift and the threat's tail arc give way to it
      const lift = -0.45 * p * (1 - w)
      body.rotation.x = -STAND * w
      body.position.x = 0
      // In the dance (standing, belly to the diver, its frame's y now pointing back, z up): the body leans to its side
      // (about y) and turns (about z). Screen right, seen by the diver, is its left (side: its left's sign along x)
      pose('body', [X, lift], [Y, g * move.lean * side], [Z, g * move.twist * side])
      // The tail: the threat's arc, or standing, folded back behind it (Christian, 2026-10-25: always behind it, never
      // folded forward; from back to further back with the move). Its swing turns its first joint (about the body's
      // own axis: on the later joints, already bent, that axis leans and the turn brought the tail forward), the next
      // two following a little, each TAIL_LAG s later
      const bend = (TAIL_ARC / TAIL.length) * p * (1 - w) + 0.3 * w
      TAIL.forEach((name, i) => {
        const m = i ? dancePose(Math.max(0, grooveTime - i * TAIL_LAG)) : move
        const back = g * (0.08 + 0.15 * Math.abs(m.tail) + 0.12 * m.curl)
        ;(i ? poseLive : pose)(name, [X, bend + (i === 0 ? -lift : 0) + back], [Y, i < 3 ? -g * side * m.tail * [1, 0.35, 0.25][i] : 0])
      })
      stride = walking ? stride + dt * 9 : stride
      // Standing: the rear legs turned down as its legs (hip, knee, ankle in the plane facing the diver: Christian, « the
      // rear legs have a knee, 2 or 3 segments »); the others fanned out to the sides (about its frame's z, then up or
      // down about y), each a little after the one before, their joints bending with their swing (limp)
      const blend = (name) => STAND_FRAME[PARAMS.indexOf(name)] + (move[name] - STAND_FRAME[PARAMS.indexOf(name)]) * g
      legs.forEach((name, i) => {
        const left = name.includes('_L_')
        const S = left ? 'L' : 'R'
        const out = left ? side : -side
        const step = walking ? 0.25 * Math.sin(stride + i * 1.3) : 0
        if (/rear/.test(name)) {
          pose(name, [X, -lift + w * 1.25], [Y, step - out * w * blend(`${S}.hip`)])
          poseLive(name.replace('_000', '_001'), [Y, -out * w * blend(`${S}.knee`)])
          poseLive(name.replace('_000', '_002'), [Y, -out * w * blend(`${S}.ankle`)])
          return
        }
        const k = SMALL_LEGS.findIndex((leg) => name.includes(`_${leg}_`))
        const fanAt = (time) => dancePose(Math.max(0, time))[`${S}.fan`]
        const later = grooveTime - k * LEG_LAG
        const fan = STAND_FRAME[PARAMS.indexOf(`${S}.fan`)] + (fanAt(later) - STAND_FRAME[PARAMS.indexOf(`${S}.fan`)]) * g
        const swing = (fanAt(later) - fanAt(later - 0.05)) / 0.05
        pose(name, [X, -lift], [Z, out * w * 1.5], [Y, step - out * w * (fan - (k - 1) * FAN_SPREAD)])
        const drag = THREE.MathUtils.clamp(-swing * LEG_DRAG, -0.6, 0.6) * g
        poseLive(name.replace('_000', '_001'), [Y, out * drag])
        poseLive(name.replace('_000', '_002'), [Y, out * drag * 1.5])
      })
      // The antennae bend toward where the current goes (in its own frame, as it turns), more at the tip and the
      // stronger the current; raised a little in the threat posture
      const flow = current()
      const speed = Math.hypot(flow.x, flow.z)
      const strength = Math.min(speed / CURRENT_FULL, 1)
      const local = Math.atan2(flow.x, flow.z) - root.rotation.y
      const toward = THREE.MathUtils.clamp(Math.atan2(Math.sin(local), Math.cos(local)), -1.2, 1.2)
      // A slow, slight sway only: they bend more than they flutter (Christian, 2026-10-23)
      const flutter = (phase) => 0.03 * Math.sin(time * 0.8 + phase)
      // Dancing: the measured angle, the tip following later (a whip)
      const tipLater = dancePose(Math.max(0, grooveTime - ANTENNA_LAG))
      for (const [name, phase] of [['L', 0], ['R', 1.7]]) {
        const out = name === 'L' ? side : -side
        const base = blend(`${name}.antenna`)
        pose(`antenna_${name}_000`, [Y, (toward * ANTENNA_BEND[0] * strength + flutter(phase)) * (1 - w) + out * w * base],
          [X, -0.25 * p * (1 - w)])
        poseLive(`antenna_${name}_001`, [Y, (toward * ANTENNA_BEND[1] * strength + flutter(phase + 0.8)) * (1 - w) +
          out * g * 1.5 * (tipLater[`${name}.antenna`] - move[`${name}.antenna`])])
      }
      // Claws: raised and spread, open, drifting together; in a gesture both arms open out wider and rise, and their
      // pincers open wide a moment later (TODO #51). Standing, each claw is an arm in the plane facing the diver (about
      // its frame's y): arm, elbow, wrist and pincer as measured
      const e = arms.t >= 0 ? gestureAt(arms.t, arms.length) : 0
      const pincer = arms.t >= 0 ? gestureAt(arms.t - GESTURE_FOLLOW, arms.length) : 0
      const rise = DRIFT * p * Math.sin(time * arms.pace[0] + arms.phase[0])
      const spread = DRIFT * p * Math.sin(time * arms.pace[1] + arms.phase[1])
      for (const name of ['L', 'R']) {
        const out = name === 'L' ? side : -side
        const threat = 1 - w
        pose(`claw_${name}_000`, [X, (-0.7 * p - rise - 0.2 * e * arms.raise) * threat],
          [Y, out * ((0.45 * p + spread + 0.45 * e * arms.open) * threat + blend(`${name}.arm`) * w)])
        poseLive(`claw_${name}_001`, [Y, out * (0.25 * e * arms.open * threat + blend(`${name}.elbow`) * w)])
        poseLive(`claw_${name}_002`, [Y, out * blend(`${name}.wrist`) * w])
        poseLive(`claw_${name}_003`, [Y, -out * ((0.35 * p + 0.5 * pincer) * threat + blend(`${name}.open`) * w)])
      }
      // Standing, on its feet: the body set so that the lower rear foot is on the ground (Christian, 2026-10-25: one
      // leg at least on the ground at all times; the raised one higher). Measured after the pose, in its own frame
      body.position.y = 0
      if (w > 0.001 && feet.length) {
        root.updateMatrixWorld(true)
        const lowest = Math.min(...feet.map((foot) => root.worldToLocal(foot.getWorldPosition(footAt)).y))
        body.position.y = -lowest * w
      }
      return true
    },
  }
}
