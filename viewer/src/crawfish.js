// A crayfish (« crawfish » empty of the .blend, exported with the mockups: export_mockups.py) that defends itself as
// the diver comes close. The model: « Crayfish » by ucdavisterc (Sketchfab, CC BY 4.0), rigged, packed into
// public/creatures/crayfish.glb (textures 1024 px WebP); its pincers' tips orange, found from the claw bones' weights
// and the fingers' end bones.
//
// Behaviour: it faces a diver closer than REACT m (and turns again, REACTION s after they have moved round it by more
// than REFACE); its threat posture eases in from REACT and is full at THREAT m: front raised, tail held up in an arc
// (the legs stay down), claws raised, spread and open; now and then both arms open out wider together, their pincers
// opening wide too, and come back. Left alone, it
// wanders: a few steps now and then to a spot within WANDER m of its place, only where the ground below is the same
// floor (options.ground), legs paddling.
//
// The rig's bones are turned about axes of the crayfish's own frame (forward +z, up +y), converted once into each
// bone's parent space from the rest pose: no need to know how each bone's own axes were set in the rig.
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const URL = `${import.meta.env.BASE_URL}creatures/crayfish.glb`
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
// The claws' gestures in attack mode, each arm on its own (Christian, 2026-10-23: the arms' raise and moves
// independent): a gesture's length (s, at random in between), its size (open out and raise, times the full gesture, at
// random), and the wait between two (GESTURE_WAIT, s, at random). Its shape (more natural): the arm snaps out a little
// past its mark and settles (GESTURE_OUT of it), holds, then eases back; its pincer follows a moment later
// (GESTURE_FOLLOW, s)
const GESTURE = [1.3, 2.2]
const GESTURE_SIZE = [0.5, 1.2]
const GESTURE_WAIT = [1.5, 4]
const GESTURE_OUT = 0.25
const GESTURE_HOLD = 0.5
const GESTURE_FOLLOW = 0.1
// Between gestures each arm drifts slowly on its own: its raise and spread (rad), at its own pace (rad/s, at random)
const DRIFT = 0.12
const DRIFT_PACE = [0.5, 1.1]
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

/**
 * @param {object} options
 * @param {(material: THREE.Material) => THREE.Material} [options.prepare] - the viewer's material set-up (shadows,
 *   underwater)
 * @param {(x: number, y: number, z: number) => ({ y: number, floor: string } | null)} [options.ground] - the floor
 *   below a point: its height and which floor it is (a zone), or null; without it, no wandering
 * @param {() => THREE.Vector3} [options.current] - the river's current (m/s, world): the antennae bend with it
 */
export function createCrawfish({ prepare = (m) => m, ground = null, current = () => DEFAULT_CURRENT } = {}) {
  const root = new THREE.Group()
  root.name = 'crawfish'
  // The model, turned and scaled so that it faces +z, its feet at y = 0
  const body = new THREE.Group()
  root.add(body)
  /** @type {Record<string, { bone: THREE.Bone, rest: THREE.Quaternion, toLocal: THREE.Quaternion }>} */
  const bones = {}
  let ready = false
  let side = 1

  new GLTFLoader().load(URL, (gltf) => {
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
    ready = true
  })

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
  let shuffleWait = SHUFFLE_WAIT[0]
  const between = ([low, high]) => low + Math.random() * (high - low)
  // Each arm's own gesture and drift
  const arms = ['L', 'R'].map((name) => ({
    name,
    t: -1,
    wait: 1 + Math.random() * 3,
    length: between(GESTURE),
    open: 1,
    raise: 1,
    pace: [between(DRIFT_PACE), between(DRIFT_PACE)],
    phase: [Math.random() * 6.3, Math.random() * 6.3],
  }))
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
    /** For tests: its state */
    get debug() {
      return { ready, home: home?.toArray(), floor, walkTo: walkTo?.toArray(), rest, side }
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

      // Each arm's gesture: now and then (GESTURE_WAIT), in attack mode, its own length and size
      for (const arm of arms) {
        if (arm.t >= 0) {
          arm.t += dt
          if (arm.t > arm.length + GESTURE_FOLLOW) {
            arm.t = -1
            arm.wait = between(GESTURE_WAIT)
          }
        } else if (p > 0.6 && (arm.wait -= dt) <= 0) {
          arm.t = 0
          arm.length = between(GESTURE)
          arm.open = between(GESTURE_SIZE)
          arm.raise = between(GESTURE_SIZE)
        }
      }
      // Front raised: the body pitches up (a negative turn about x lifts +z); the legs turn back as much, so they stay
      // down. The tail is held up in an arc of a circle all through the threat posture (Christian, 2026-10-23): the
      // same bend at each of its joints (a positive turn lifts its far end, toward -z), TAIL_ARC in all
      const lift = -0.45 * p
      pose('body', [X, lift])
      const bend = (TAIL_ARC / TAIL.length) * p
      TAIL.forEach((name, i) => pose(name, [X, bend + (i === 0 ? -lift : 0)]))
      stride = walking ? stride + dt * 9 : stride
      legs.forEach((name, i) => pose(name, [X, -lift], [Y, walking ? 0.25 * Math.sin(stride + i * 1.3) : 0]))
      // The antennae bend toward where the current goes (in its own frame, as it turns), more at the tip and the
      // stronger the current; raised a little in the threat posture
      const flow = current()
      const speed = Math.hypot(flow.x, flow.z)
      const strength = Math.min(speed / CURRENT_FULL, 1)
      const local = Math.atan2(flow.x, flow.z) - root.rotation.y
      const toward = THREE.MathUtils.clamp(Math.atan2(Math.sin(local), Math.cos(local)), -1.2, 1.2)
      // A slow, slight sway only: they bend more than they flutter (Christian, 2026-10-23)
      const flutter = (phase) => 0.03 * Math.sin(time * 0.8 + phase)
      for (const [name, phase] of [['L', 0], ['R', 1.7]]) {
        pose(`antenna_${name}_000`, [Y, toward * ANTENNA_BEND[0] * strength + flutter(phase)], [X, -0.25 * p])
        pose(`antenna_${name}_001`, [Y, toward * ANTENNA_BEND[1] * strength + flutter(phase + 0.8)])
      }
      // Claws: raised and spread, open, each arm drifting on its own; in its gesture an arm opens out wider and rises,
      // and its pincer opens wide a moment later (TODO #51)
      for (const arm of arms) {
        const out = arm.name === 'L' ? side : -side
        const e = arm.t >= 0 ? gestureAt(arm.t, arm.length) : 0
        const pincer = arm.t >= 0 ? gestureAt(arm.t - GESTURE_FOLLOW, arm.length) : 0
        const rise = DRIFT * p * Math.sin(time * arm.pace[0] + arm.phase[0])
        const spread = DRIFT * p * Math.sin(time * arm.pace[1] + arm.phase[1])
        const name = arm.name
        pose(`claw_${name}_000`, [X, -0.7 * p - rise - 0.2 * e * arm.raise], [Y, out * (0.45 * p + spread + 0.45 * e * arm.open)])
        pose(`claw_${name}_001`, [Y, out * 0.25 * e * arm.open])
        pose(`claw_${name}_003`, [Y, -out * (0.35 * p + 0.5 * pincer)])
      }
      return true
    },
  }
}
