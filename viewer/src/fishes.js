// A few fish here and there in the underwater view (Christian, 2026-10-24), besides the curious bass (bass.js): the
// same smallmouth bass model (public/creatures/bass.glb, lightened to 6,000 triangles by tools/creatures/rig_bass.py),
// loaded once and cloned (geometry and textures shared), each fish going its own way, calm, paying the diver no
// attention but swerving away when they come too close.
// - Placed only where the diver may see it (Christian, 2026-10-24): in the view's cone (VIEW_MARGIN rad wider on each
//   side), nothing between the camera and it, between PLACE_NEAR and PLACE_FAR of the visibility (the water still
//   hides it: it comes out of the haze), at least CLEARANCE m from every surface. Placed again once beyond the
//   visibility (the diver swam on) or out of the view for UNSEEN_FOR s.
// - Near the bottom (Christian, 2026-10-24: fish don't swim in open water, they stay close to the ground): each keeps
//   its own height above the floor below it, within ALTITUDE m, when placed, at its waypoints and as it swims (the
//   floor looked for every LOOK_EVERY s); a spot with no floor within reach is not taken.
// - It swims to waypoints within WANDER m, clear of the walls and with nothing in between, slowly (CRUISE m/s, the
//   season's pace), along its heading (arcs while it turns), slower in a turn; its body waves with its speed and the
//   turn runs down it, as the bass's.
// - Lengths as the smallmouth bass of Ontario's waters (Christian, 2026-10-24: realistic sizes): an adult is 25 to 50 cm
//   long (Ontario, « Smallmouth bass », ontario.ca; the species' record is about 69 cm); drawn on a bell curve around
//   LENGTH_MEAN (LENGTH_SPREAD), kept within LENGTH_RANGE: mostly 30 to 42 cm, now and then a big one.
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'

const URL = `${import.meta.env.BASE_URL}creatures/bass.glb`
const LENGTH_MEAN = 0.36
const LENGTH_SPREAD = 0.06
const LENGTH_RANGE = [0.25, 0.5]
const PLACE_NEAR = 0.6
const PLACE_FAR = 1
// ... and within PLACE_MAX m (near the floor, a spot farther away was nearly always hidden from the camera by a ridge
// of the floor or a wall)
const PLACE_MAX = [8, 15]
const CLEARANCE = 0.15
const ALTITUDE = [0.25, 0.7]
// Its height follows the floor at most this fast (m/s)
const CLIMB = 0.15
const WANDER = 3
const VIEW_MARGIN = 0.25
// Never through the model (Christian, 2026-10-24): every LOOK_EVERY s, the water LOOK_AHEAD m ahead of it; closer than
// AHEAD_CLEAR to a surface, it picks another waypoint and slows down; a step that brings it closer than BODY_CLEAR is
// not taken (it swims in arcs: its straight path to a waypoint was checked, not the arc)
const LOOK_EVERY = 0.2
const LOOK_AHEAD = 0.4
const AHEAD_CLEAR = 0.25
const BODY_CLEAR = 0.15
const UNSEEN_FOR = 10
// Its speed (m/s) and turn (rad/s): a slow cruise, each fish a little different
const CRUISE = [0.1, 0.22]
const TURN = 0.9
const TURN_GAIN = 2
const TURN_EASE = 2.5
// Swerving away from the diver closer than SHY m
const SHY = 1.2
// The swimming wave down the spine (rad, head to tail), as the bass's; the turn's bend, delayed BEND_LAG s per bone
const WAVE = [0.04, 0.1, 0.18, 0.28, 0.44]
const WAVE_LAG = 0.9
const BEAT_REST = 0.3
const BEAT_PER_SPEED = 4
const CURVE = [0, 0.5, 0.64, 0.64, 0.5]
const BEND_LAG = 0.06
const BEND_LIMIT = [0.2, 0.3, 0.4, 0.5, 0.6]
const UP = new THREE.Vector3(0, 1, 0)
const between = ([min, max]) => min + Math.random() * (max - min)
/** A bass's length (m): a bell curve around LENGTH_MEAN, within LENGTH_RANGE */
export function bassLength() {
  // Box-Muller: a normal draw
  const normal = Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random())
  return THREE.MathUtils.clamp(LENGTH_MEAN + LENGTH_SPREAD * normal, LENGTH_RANGE[0], LENGTH_RANGE[1])
}

/**
 * @param {object} options
 * @param {number} options.count - how many (fewer on a phone)
 * @param {(material: THREE.Material) => THREE.Material} [options.prepare] - the viewer's material set-up
 * @param {(point: THREE.Vector3) => number} [options.clearance] - distance from a point to the nearest surface (m)
 * @param {(from: THREE.Vector3, to: THREE.Vector3) => boolean} [options.inSight] - nothing of the model between two points
 * @param {() => number} [options.visibility] - the season's visibility (m)
 * @param {() => number} [options.pace] - the season's pace (1 in summer, slower in cold water)
 * @param {(point: THREE.Vector3) => number | null} [options.floor] - the height of the floor below a point (null: none)
 * @param {Promise<unknown>} [options.when] - the model loads once this settles (after the first view, underwater)
 */
export function createFishes({ count, prepare = (m) => m, clearance = () => Infinity, inSight = () => true, visibility = () => 6, pace = () => 1, floor = () => null, when = Promise.resolve() } = {}) {
  const root = new THREE.Group()
  root.name = 'fishes'
  /** @type {object[]} */
  const fishes = []
  let time = 0

  when.then(() => new GLTFLoader().load(URL, (gltf) => {
    const source = gltf.scene
    source.traverse((object) => {
      if (!object.isMesh) return
      object.frustumCulled = false
      object.material = prepare(object.material.clone())
    })
    const box = new THREE.Box3().setFromObject(source)
    const size = box.getSize(new THREE.Vector3())
    const centre = box.getCenter(new THREE.Vector3())
    source.position.sub(centre)
    for (let i = 0; i < count; i++) {
      const model = SkeletonUtils.clone(source)
      const body = new THREE.Group()
      body.scale.setScalar(bassLength() / size.z)
      body.add(model)
      const group = new THREE.Group()
      group.add(body)
      group.visible = false
      root.add(group)
      group.updateMatrixWorld(true)
      const bodyTurn = body.getWorldQuaternion(new THREE.Quaternion())
      const spine = []
      for (let k = 0; ; k++) {
        const bone = model.getObjectByName(`spine_${k}`)
        if (!bone) break
        const toLocal = bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(bodyTurn)
        spine.push({ bone, rest: bone.quaternion.clone(), axis: new THREE.Vector3(0, 1, 0).applyQuaternion(toLocal).normalize() })
      }
      fishes.push({
        group, spine, placed: false, heading: 0, turnRate: 0, speed: 0, cruise: between(CRUISE), phase: Math.random() * 10,
        target: new THREE.Vector3(), turns: [], wait: Math.random() * 3, altitude: between(ALTITUDE), floorY: null,
      })
    }
  }))

  const point = new THREE.Vector3()
  const toTarget = new THREE.Vector3()
  const forward = new THREE.Vector3()
  const bend = new THREE.Quaternion()

  /** A clear spot around a centre, between two distances, `altitude` m above the floor, within `spread` rad of
   *  `heading` (or null) */
  function clearSpot(centre, near, far, altitude, tries = 8, heading = 0, spread = Math.PI) {
    for (let i = 0; i < tries; i++) {
      const angle = heading + (Math.random() * 2 - 1) * spread
      const distance = near + Math.random() * (far - near)
      point.set(centre.x + Math.sin(angle) * distance, centre.y, centre.z + Math.cos(angle) * distance)
      const ground = floor(point)
      if (ground === null) continue
      point.y = ground + altitude
      if (clearance(point) >= CLEARANCE) return point.clone()
    }
    return null
  }

  /** A spot the diver may see: in the view's cone, in sight, where the water still hides it (or null) */
  function visibleSpot(camera, reach) {
    camera.getWorldDirection(forward)
    const heading = Math.atan2(forward.x, forward.z)
    const half = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect) + VIEW_MARGIN
    const near = Math.min(reach * PLACE_NEAR, PLACE_MAX[0])
    const far = Math.min(reach * PLACE_FAR, PLACE_MAX[1])
    for (let i = 0; i < 6; i++) {
      const spot = clearSpot(camera.position, near, far, between(ALTITUDE), 4, heading, half)
      if (spot && inSight(camera.position, spot)) return spot
    }
    return null
  }

  const frustum = new THREE.Frustum()
  const viewProjection = new THREE.Matrix4()

  /** Its next waypoint: within WANDER m, clear, nothing in between; away from the diver when they are close */
  function nextTarget(fish, camera) {
    const at = fish.group.position
    const away = at.distanceTo(camera.position) < SHY
    for (let i = 0; i < 6; i++) {
      let spot = away
        ? at.clone().add(toTarget.subVectors(at, camera.position).setY(0).normalize().applyAxisAngle(UP, (Math.random() - 0.5) * 1.2).multiplyScalar(WANDER))
        : clearSpot(at, 1, WANDER, fish.altitude, 1)
      if (spot && away) {
        const ground = floor(spot)
        spot = ground === null ? null : spot.setY(ground + fish.altitude)
      }
      if (spot && clearance(spot) >= CLEARANCE && inSight(at, spot)) {
        fish.target.copy(spot)
        return
      }
    }
    // Nowhere to go ahead: back the way it came
    fish.target.copy(at).addScaledVector(forward.set(Math.sin(fish.heading), 0, Math.cos(fish.heading)), -1)
  }

  return {
    object: root,
    /**
     * Each frame
     * @param {THREE.Camera} camera
     * @param {number} dt
     * @param {boolean} on - the underwater view is on
     * @returns {boolean} whether a fish moved (a new frame is needed)
     */
    update(camera, dt, on) {
      root.visible = on
      if (!on || !fishes.length) return false
      time += dt
      const reach = visibility()
      const slow = pace()
      camera.updateMatrixWorld()
      frustum.setFromProjectionMatrix(viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse))
      for (const fish of fishes) {
        const at = fish.group.position
        // Out of the view for a while: counted (only once placed)
        fish.unseen = fish.placed && !frustum.containsPoint(at) ? (fish.unseen ?? 0) + dt : 0
        // Beyond the visibility, long out of the view, or not placed yet: placed again where the diver may see it
        if (!fish.placed || at.distanceTo(camera.position) > reach * 1.15 || fish.unseen > UNSEEN_FOR) {
          fish.group.visible = false
          fish.placed = false
          fish.wait -= dt
          if (fish.wait > 0) continue
          const spot = visibleSpot(camera, reach)
          if (!spot) {
            fish.wait = 1
            continue
          }
          at.copy(spot)
          fish.heading = Math.random() * Math.PI * 2
          fish.turnRate = 0
          fish.speed = 0
          fish.placed = true
          fish.group.visible = true
          nextTarget(fish, camera)
        }
        // Its waypoint reached, or the diver too close: the next one
        toTarget.subVectors(fish.target, at)
        if (toTarget.length() < 0.3 || (at.distanceTo(camera.position) < SHY && fish.target.distanceTo(camera.position) < SHY)) {
          nextTarget(fish, camera)
          toTarget.subVectors(fish.target, at)
        }
        // Turning toward it, eased; swimming where it points, slower in a turn
        const target = Math.atan2(toTarget.x, toTarget.z)
        const delta = Math.atan2(Math.sin(target - fish.heading), Math.cos(target - fish.heading))
        const wanted = THREE.MathUtils.clamp(delta * TURN_GAIN, -TURN * slow, TURN * slow)
        fish.turnRate += (wanted - fish.turnRate) * Math.min(1, TURN_EASE * dt)
        fish.heading += fish.turnRate * dt
        const lined = (1 + Math.cos(delta)) / 2
        fish.speed += (fish.cruise * slow * (0.4 + 0.6 * lined) - fish.speed) * Math.min(1, dt)
        forward.set(Math.sin(fish.heading), 0, Math.cos(fish.heading))
        // The water ahead, now and then: a surface coming, another way, slower
        fish.look = (fish.look ?? 0) - dt
        if (fish.look <= 0) {
          fish.look = LOOK_EVERY
          if (clearance(point.copy(at).addScaledVector(forward, LOOK_AHEAD)) < AHEAD_CLEAR) {
            nextTarget(fish, camera)
            fish.speed *= 0.5
          }
          // The floor below it: its height follows it
          fish.floorY = floor(at) ?? fish.floorY
        }
        point.copy(at).addScaledVector(forward, fish.speed * dt)
        const height = fish.floorY === null ? fish.target.y : fish.floorY + fish.altitude
        point.y += THREE.MathUtils.clamp(height - at.y, -CLIMB * dt, CLIMB * dt)
        if (clearance(point) >= BODY_CLEAR) at.copy(point)
        else fish.speed = 0
        fish.group.rotation.set(0, fish.heading, 0)
        // Its body: the wave with its speed, the turn running down it
        fish.phase += dt * (BEAT_REST + BEAT_PER_SPEED * fish.speed) * Math.PI * 2
        const size = 0.3 + 0.7 * Math.min(1, fish.speed / 0.2)
        fish.turns.unshift([time, fish.turnRate])
        while (fish.turns.length > 2 && fish.turns[fish.turns.length - 2][0] < time - BEND_LAG * fish.spine.length) fish.turns.pop()
        fish.spine.forEach(({ bone, rest, axis }, k) => {
          const turn = (fish.turns.find(([t]) => t <= time - k * BEND_LAG) ?? fish.turns[fish.turns.length - 1])[1]
          const angle = WAVE[k] * size * Math.sin(fish.phase - k * WAVE_LAG) - turn * CURVE[k]
          const limit = BEND_LIMIT[k] ?? BEND_LIMIT[BEND_LIMIT.length - 1]
          bone.quaternion.copy(rest).premultiply(bend.setFromAxisAngle(axis, THREE.MathUtils.clamp(angle, -limit, limit)))
        })
      }
      return true
    },
  }
}
