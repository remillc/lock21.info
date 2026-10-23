// A crayfish (« crawfish » empty of the .blend, exported with the mockups: export_mockups.py) that defends itself as
// the diver comes close: it turns toward the camera, raises its front, lifts and spreads its claws and opens them, as
// rusty crayfish do (Faxonius rusticus, common in the St. Lawrence). Built from simple shapes, about 15 cm long,
// facing +z; its threat posture eases in from REACT m and is full at THREAT m, and eases back when the diver leaves.
// Left alone, it wanders: now and then a few steps to a spot within WANDER m of its place, only where the ground
// below is the same floor (options.ground: the zone it stands in, flat), so it never leaves that zone's floor.
import * as THREE from 'three'

const REACT = 1.8
const THREAT = 0.8
// Turning speed toward the diver (rad/s) and how fast the posture follows (1/s)
const TURN_SPEED = 2.2
const POSTURE_SPEED = 3
// It turns to face the diver again once they are more than REFACE (rad, about 20°) off its heading, after REACTION s
const REFACE = 0.35
const REACTION = 2
// Claw gestures in attack mode: their length (s), and the wait between two of a claw's gestures (s, at random)
const GESTURE = 1.4
const GESTURE_WAIT = [1.5, 4]
// Wandering: how far from its place (m), its walking speed (m/s), the wait between walks (s, at random in between)
const WANDER = 0.6
const WALK_SPEED = 0.05
const REST = [4, 10]

/**
 * @param {object} options
 * @param {(material: THREE.Material) => THREE.Material} [options.prepare] - the viewer's material set-up (shadows,
 *   underwater)
 * @param {(x: number, y: number, z: number) => ({ y: number, floor: string } | null)} [options.ground] - the floor
 *   below a point: its height and which floor it is (a zone), or null (none, a wall, too steep); without it, no
 *   wandering
 */
export function createCrawfish({ prepare = (m) => m, ground = null } = {}) {
  const shell = prepare(new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: 0.55 }))
  const rust = prepare(new THREE.MeshStandardMaterial({ color: 0x7a3f22, roughness: 0.5 }))
  const dark = prepare(new THREE.MeshStandardMaterial({ color: 0x15100c, roughness: 0.3 }))
  // The claws tinted blue (Christian, 2026-10-23), the tips lighter
  const claw = prepare(new THREE.MeshStandardMaterial({ color: 0x2f4f78, roughness: 0.45 }))
  const clawTip = prepare(new THREE.MeshStandardMaterial({ color: 0x5f8fc4, roughness: 0.4 }))

  const ellipsoid = (rx, ry, rz, material) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), material)
    mesh.scale.set(rx, ry, rz)
    return mesh
  }
  const rod = (radius, length, material, tipRadius = radius) => {
    // Along +z from its origin
    const geometry = new THREE.CylinderGeometry(tipRadius, radius, length, 8).translate(0, length / 2, 0).rotateX(Math.PI / 2)
    return new THREE.Mesh(geometry, material)
  }

  const root = new THREE.Group()
  root.name = 'crawfish'

  // The tail (abdomen) stays on the ground: segments shrinking backward, then the fan
  const tail = new THREE.Group()
  tail.position.set(0, 0.012, -0.005)
  root.add(tail)
  let z = 0
  for (let i = 0; i < 6; i++) {
    const r = 0.017 - i * 0.0018
    const segment = ellipsoid(r * 1.15, r * 0.75, 0.009, i % 2 ? shell : rust)
    z -= 0.011
    segment.position.set(0, -i * 0.0012, z)
    tail.add(segment)
  }
  for (let i = -2; i <= 2; i++) {
    const plate = ellipsoid(0.007, 0.0015, 0.013, shell)
    plate.position.set(i * 0.0075, -0.007, z - 0.014)
    plate.rotation.y = i * 0.25
    tail.add(plate)
  }

  // The walking legs (4 pairs) stay on the ground too
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const leg = new THREE.Group()
      leg.position.set(side * 0.012, 0.012, 0.018 - i * 0.009)
      leg.rotation.y = side * (Math.PI / 2 + 0.3 - i * 0.2)
      const upper = rod(0.0014, 0.022, shell)
      upper.rotation.x = -0.6
      const lower = rod(0.0011, 0.022, shell, 0.0005)
      lower.position.set(0, 0.013, 0.018)
      lower.rotation.x = 0.9
      leg.add(upper, lower)
      root.add(leg)
    }
  }

  // The front (carapace, head, claws) pivots at the tail's joint: it rises in the threat posture
  const front = new THREE.Group()
  front.position.set(0, 0.012, 0)
  root.add(front)
  const carapace = ellipsoid(0.019, 0.016, 0.034, rust)
  carapace.position.set(0, 0.004, 0.028)
  const rostrum = rod(0.005, 0.016, shell, 0.0008)
  rostrum.position.set(0, 0.006, 0.058)
  front.add(carapace, rostrum)
  for (const side of [-1, 1]) {
    const eye = ellipsoid(0.0032, 0.0032, 0.0032, dark)
    eye.position.set(side * 0.006, 0.011, 0.061)
    front.add(eye)
  }

  // Antennae: long, thin, swaying
  const antennae = []
  for (const side of [-1, 1]) {
    const antenna = new THREE.Group()
    antenna.position.set(side * 0.005, 0.006, 0.062)
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(side * 0.02, 0.012, 0.04),
      new THREE.Vector3(side * 0.06, 0.018, 0.075),
      new THREE.Vector3(side * 0.11, 0.01, 0.1),
    ])
    antenna.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.0006, 5), shell))
    front.add(antenna)
    antennae.push({ antenna, side, phase: Math.random() * 6 })
  }

  // Claws: shoulder → arm → wrist → hand, a fixed finger and a moving one
  const claws = []
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group()
    shoulder.position.set(side * 0.014, 0, 0.045)
    const arm = rod(0.0035, 0.028, claw)
    const wrist = new THREE.Group()
    wrist.position.set(0, 0, 0.028)
    const forearm = rod(0.0045, 0.022, claw)
    const hand = new THREE.Group()
    hand.position.set(0, 0, 0.022)
    const palm = ellipsoid(0.0085, 0.0045, 0.016, claw)
    palm.position.set(0, 0, 0.012)
    const fixed = rod(0.004, 0.026, clawTip, 0.0008)
    fixed.position.set(side * 0.003, 0, 0.024)
    const moving = new THREE.Group()
    moving.position.set(-side * 0.003, 0, 0.024)
    moving.add(rod(0.0035, 0.025, clawTip, 0.0008))
    hand.add(palm, fixed, moving)
    wrist.add(forearm, hand)
    shoulder.add(arm, wrist)
    front.add(shoulder)
    claws.push({ side, shoulder, wrist, hand, moving, gesture: -1, wait: 1 + Math.random() * 2 })
  }

  root.traverse((object) => {
    if (object.isMesh) object.castShadow = object.receiveShadow = true
  })

  let posture = 0
  let time = 0
  // The heading it holds toward the diver, and how long the diver has been off it
  let facing = null
  let noticed = 0
  const toCamera = new THREE.Vector3()
  // Wandering: its place and floor (set on the first update), the spot it walks to, the rest before the next walk
  let home = null
  let floor = null
  let walkTo = null
  let rest = REST[0]
  let stride = 0
  const legs = []
  root.traverse((object) => {
    if (object.parent === root && object.isGroup && object !== tail && object !== front) legs.push(object)
  })

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
    /** For tests: its wandering state */
    get debug() {
      return { home: home?.toArray(), floor, walkTo: walkTo?.toArray(), rest }
    },
    /**
     * Each frame: turns toward the camera and takes its posture
     * @param {THREE.Camera} camera
     * @param {number} dt - seconds since the last frame
     * @returns {boolean} whether it moved (a new frame is needed)
     */
    update(camera, dt) {
      toCamera.copy(camera.position).sub(root.position)
      const distance = toCamera.length()
      // Too far to be seen moving: nothing to draw
      if (distance > 12 && posture < 0.001) return false
      time += dt
      // Its place and floor, once the floor below it has loaded (the tiles arrive after it): set on the floor. A zone's
      // floor rather than the terrain under it (hit first while the zone's tiles load), unless none comes in 30 s
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
            let delta = Math.atan2(Math.sin(heading - root.rotation.y), Math.cos(heading - root.rotation.y))
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
      // The legs paddle while walking
      stride = walking ? stride + dt * 9 : stride
      legs.forEach((leg, i) => {
        leg.rotation.x = walking ? 0.25 * Math.sin(stride + i * 1.3) : leg.rotation.x * 0.9
      })
      const wanted = THREE.MathUtils.smoothstep(REACT - distance, 0, REACT - THREAT)
      posture += (wanted - posture) * Math.min(1, POSTURE_SPEED * dt)
      // Faces the diver once it has noticed them, then holds that heading: when the diver has moved round it by more
      // than REFACE, it waits REACTION s, then turns to face them again
      if (distance < REACT + 0.5) {
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
      const p = posture
      front.rotation.x = -0.55 * p
      for (const { antenna, side, phase } of antennae) {
        antenna.rotation.y = side * (0.15 * Math.sin(time * 1.3 + phase) + 0.35 * p)
        antenna.rotation.x = -0.1 * Math.sin(time * 0.9 + phase) - 0.3 * p
      }
      // In attack mode, each claw now and then (every GESTURE_WAIT s, at random) makes a short gesture: the arm opens
      // out wider, its pincer wide open, then comes back to its raised position (Christian, 2026-10-23)
      for (const claw of claws) {
        const { side, shoulder, wrist, hand, moving } = claw
        let e = 0
        if (p > 0.6) {
          if (claw.gesture >= 0) {
            claw.gesture += dt
            if (claw.gesture > GESTURE) {
              claw.gesture = -1
              claw.wait = GESTURE_WAIT[0] + Math.random() * (GESTURE_WAIT[1] - GESTURE_WAIT[0])
            }
          } else if ((claw.wait -= dt) <= 0) claw.gesture = 0
          if (claw.gesture >= 0) {
            e = Math.sin((Math.PI * claw.gesture) / GESTURE)
          }
        }
        shoulder.rotation.y = side * (0.25 + 0.55 * p + 0.5 * e)
        shoulder.rotation.x = 0.15 - 0.9 * p - 0.15 * e
        wrist.rotation.y = -side * (0.6 - 0.2 * p - 0.3 * e)
        wrist.rotation.x = -0.2 * p
        hand.rotation.z = side * 0.3 * p
        moving.rotation.y = -side * (0.05 + 0.55 * p + 0.25 * e)
      }
      return true
    },
  }
}
