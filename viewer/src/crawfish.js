// A crayfish (« crawfish » empty of the .blend, exported with the mockups: export_mockups.py) that defends itself as
// the diver comes close. The model: « Crayfish » by ucdavisterc (Sketchfab, CC BY 4.0), rigged, packed into
// public/creatures/crayfish.glb (textures 1024 px WebP); its claws tinted blue (Christian, 2026-10-23), by their bones'
// weights.
//
// Behaviour: it faces a diver closer than REACT m (and turns again, REACTION s after they have moved round it by more
// than REFACE); its threat posture eases in from REACT and is full at THREAT m: front raised (the tail and legs stay
// down), claws raised, spread and open; now and then both arms open out wider together and come back. Left alone, it
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
const POSTURE_SPEED = 3
// It turns to face the diver again once they are more than REFACE (rad, about 20°) off its heading, after REACTION s
const REFACE = 0.35
const REACTION = 2
// The claws' gesture in attack mode (both together): its length (s), and the wait between two (s, at random)
const GESTURE = 1.4
const GESTURE_WAIT = [1.5, 4]
// Wandering: how far from its place (m), its walking speed (m/s), the wait between walks (s, at random in between)
const WANDER = 0.6
const WALK_SPEED = 0.05
// (more often: Christian, 2026-10-23; was 4 to 10 s)
const REST = [1.5, 4]
// In attack mode, a shuffle now and then: a few cm (SHUFFLE, m, at most) sideways, forward or back, still facing the
// diver, every SHUFFLE_WAIT s (at random in between)
const SHUFFLE = 0.08
const SHUFFLE_WAIT = [2, 5]
// The claws' blue (multiplied with the texture's brightness)
const CLAW_BLUE = new THREE.Color(0.35, 0.6, 1.25)

const X = new THREE.Vector3(1, 0, 0)
const Y = new THREE.Vector3(0, 1, 0)

/**
 * @param {object} options
 * @param {(material: THREE.Material) => THREE.Material} [options.prepare] - the viewer's material set-up (shadows,
 *   underwater)
 * @param {(x: number, y: number, z: number) => ({ y: number, floor: string } | null)} [options.ground] - the floor
 *   below a point: its height and which floor it is (a zone), or null; without it, no wandering
 */
export function createCrawfish({ prepare = (m) => m, ground = null } = {}) {
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

  /** The claws' blue: a copy of the material that tints what the claw bones carry */
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
    material.onBeforeCompile = (shader) => {
      shader.uniforms.clawBlue = { value: CLAW_BLUE }
      shader.vertexShader = 'attribute float clawness;\nvarying float vClawness;\n' +
        shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvClawness = clawness;')
      shader.fragmentShader = 'uniform vec3 clawBlue;\nvarying float vClawness;\n' +
        shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
          float clawLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
          diffuseColor.rgb = mix(diffuseColor.rgb, clawLuma * clawBlue, smoothstep(0.3, 0.9, vClawness));`)
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
  let time = 0
  const toCamera = new THREE.Vector3()
  let facing = null
  let noticed = 0
  let home = null
  let floor = null
  let walkTo = null
  let rest = REST[0]
  let stride = 0
  let gesture = -1
  let shuffleTo = null
  let shuffleWait = SHUFFLE_WAIT[0]
  let gestureWait = 1 + Math.random() * 2
  const legs = ['front', 'mid1', 'mid2', 'rear'].flatMap((leg) => [`leg_${leg}_L_000`, `leg_${leg}_R_000`])

  /** A spot to walk to, on the same floor, or null */
  function pickSpot() {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2
      const reach = Math.sqrt(Math.random()) * WANDER
      const x = home.x + Math.cos(angle) * reach
      const z = home.z + Math.sin(angle) * reach
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
      posture += (wanted - posture) * Math.min(1, POSTURE_SPEED * dt)
      const p = posture

      // Front raised: the body pitches up (a negative turn about x lifts +z); the tail and the legs turn back as much,
      // so they stay down
      const lift = -0.45 * p
      pose('body', [X, lift])
      pose('tail_000', [X, -lift])
      stride = walking ? stride + dt * 9 : stride
      legs.forEach((name, i) => pose(name, [X, -lift], [Y, walking ? 0.25 * Math.sin(stride + i * 1.3) : 0]))
      pose('antenna_L_000', [Y, 0.12 * Math.sin(time * 1.3)], [X, -0.25 * p])
      pose('antenna_R_000', [Y, -0.12 * Math.sin(time * 1.3 + 1.7)], [X, -0.25 * p])
      // Claws: raised and spread, open; now and then (GESTURE_WAIT) both arms open out wider together and come back
      let e = 0
      if (p > 0.6) {
        if (gesture >= 0) {
          gesture += dt
          if (gesture > GESTURE) {
            gesture = -1
            gestureWait = GESTURE_WAIT[0] + Math.random() * (GESTURE_WAIT[1] - GESTURE_WAIT[0])
          }
        } else if ((gestureWait -= dt) <= 0) gesture = 0
        if (gesture >= 0) e = Math.sin((Math.PI * gesture) / GESTURE)
      }
      for (const name of ['L', 'R']) {
        const out = name === 'L' ? side : -side
        pose(`claw_${name}_000`, [X, -0.7 * p - 0.15 * e], [Y, out * (0.45 * p + 0.45 * e)])
        pose(`claw_${name}_001`, [Y, out * 0.25 * e])
        pose(`claw_${name}_003`, [Y, -out * (0.45 * p + 0.2 * e)])
      }
      return true
    },
  }
}
