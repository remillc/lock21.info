// Schools of young yellow perch in the underwater view (TODO #68, Christian, 2026-10-27): small perch that keep to the
// places with plants, each school around its own spot (main.js: the filler of zone 1, the floor of zone 6), close to
// the bottom; they mill slowly together and draw back from the diver, then come back.
//
// No model online fitted (Sketchfab, 2026-10-27: the one light CC BY perch is a round cartoon fish; the others too
// heavy, non-commercial or not perch). The fish is made from a photo (tools/creatures/make_perch.mjs: a yellow perch
// on a white background by the U.S. Fish and Wildlife Service, public domain): its body's outline measured on it, the
// photo laid on the body from the side as its texture, and each fin a flat outline in the middle plane cut by the
// photo's alpha (Christian, 2026-10-27: the drawn fish did not look real). Its spiny dorsal fin lies folded along the
// back at rest and rises when the diver comes close (Christian, 2026-10-27).
// - the young (young of the year: a few cm in spring, about 6 to 10 cm in the autumn) school by 50 to 200, near
//   submerged plants or structures. Here fewer (COUNT per school), for the frame rate.
// All the fish of a school are one instanced mesh (one draw call); their swimming wave is in the vertex shader.
// Behaviour: a flock (separation, alignment, cohesion), held within RANGE m of its spot and close to the bottom
// (Christian, 2026-10-27: they keep to the floor and the structures, never out in open water): each fish between
// FLOOR_GAP and FLOOR_GAP + HEIGHT m above the floor under it (looked for again every FLOOR_EVERY s, a few fish per
// frame); the diver closer than SHY m sends the fish away from them, faster.
import * as THREE from 'three'
import SHAPE from './perch-shape.json'

const TEXTURE = `/viewer/creatures/perch.webp`
// Its width against its depth (a perch is flattened from side to side)
const WIDTH = 0.48
// The spiny dorsal fin: its height folded (share of its height up), how far it lies back; raised as the diver comes
// closer than RAISE times SHY, quickly (RAISE_SPEED, 1/s), and laid down again after a while (Christian, 2026-10-27),
// RAISE_HOLD s (at random, each fish its own), even with the diver still there, slowly (FOLD_SPEED); raised again only
// if the diver comes CLOSER m nearer than when it last rose, or leaves and comes back
const FOLDED = 0.12
const RAISE = 1.5
const RAISE_SPEED = 6
const FOLD_SPEED = 1
const RAISE_HOLD = [3, 8]
const CLOSER = 0.3

// Fish per school (computer, phone), their lengths (m)
const COUNT = [40, 16]
const LENGTH = [0.06, 0.1]
// The school's room: around its spot (m), above the floor there (m)
const RANGE = 1.2
const FLOOR_GAP = 0.08
const HEIGHT = 0.35
const FLOOR_EVERY = 0.3
// Speeds (m/s): milling, cruising at most, fleeing; how fast a fish steers (1/s)
const MILL = 0.04
const CRUISE = 0.18
const FLEE = 0.6
const STEER = 2.5
// Their activity: speeds, wander and steering, half of the first try (Christian, 2026-10-27)
const ACTIVITY = 0.5
// The flock: neighbours within these distances (in body lengths for the separation, m for the others) and weights
const SEPARATE = 2
const ALIGN = 0.35
const COHERE = 0.6
const W_SEPARATE = 1.6
const W_ALIGN = 0.6
const W_COHERE = 0.5
const W_HOME = 1.2
const W_WANDER = 0.3
// The diver: closer than SHY m, the fish swim away (FLEE_WEIGHT; 1 m: Christian, 2026-10-27, was 1.5)
const SHY = 1
const FLEE_WEIGHT = 3
// Not updated beyond this many visibilities from the camera (the water hides it)
const AWAKE = 1.6
// The swimming wave (rad/s of phase per m/s of speed, at rest; the body's sideways sway, in body lengths)
const BEAT_REST = 6
const BEAT_PER_SPEED = 60
const SWAY = 0.06
// Turning as a fish does (Christian, 2026-10-27: their turns were not natural; the bass's way, bass.js): the body
// heads where the fish goes only as fast as it can turn (its turning rate eases toward TURN_GAIN times what is left,
// at most TURN, or FLEE_TURN fleeing, rad/s), and it swims where its body points; it turns about PIVOT of its length
// from the snout, the head leading, the bend running down to the tail over the pulse's time (its length over its
// speed, between PULSE[0] and PULSE[1] s); BEND_MAX rad at most at the tail
const TURN = 2.5
const FLEE_TURN = 7
const TURN_GAIN = 2.5
const TURN_EASE = 3
const PIVOT = 0.3
const PULSE = [0.12, 0.4]
const BEND_MAX = 0.5

/** A number at random in [min, max] */
const between = ([min, max]) => min + Math.random() * (max - min)

/** The body's top and bottom at s (shares of the length, up from the axis), between the measured stations */
function bodyAt(s) {
  const { body } = SHAPE
  const k = Math.max(1, body.findIndex((b) => b.s >= s))
  const a = body[k - 1]
  const b = body[Math.min(k, body.length - 1)]
  const f = b.s === a.s ? 0 : THREE.MathUtils.clamp((s - a.s) / (b.s - a.s), 0, 1)
  return { top: a.top + (b.top - a.top) * f, bottom: a.bottom + (b.bottom - a.bottom) * f }
}

/** The fish's geometry: length 1 along z, the snout at +0.5; uv: u along it, v its height (the photo from the side);
 *  aFold: on the spiny dorsal fin, 1 and the back's height under the point (folded there at rest) */
function fishGeometry() {
  const positions = []
  const uvs = []
  const folds = []
  const indices = []
  const AROUND = 12
  const v = (y) => 0.5 + y / (2 * SHAPE.half)
  // The body: a ring at each measured station
  const { body } = SHAPE
  body.forEach(({ s, top, bottom }) => {
    const depth = Math.max(top - bottom, 0.004)
    const width = WIDTH * depth
    for (let j = 0; j < AROUND; j++) {
      const a = (j / AROUND) * Math.PI * 2
      const y = (top + bottom) / 2 + (depth / 2) * Math.cos(a)
      positions.push((width / 2) * Math.sin(a), y, 0.5 - s)
      uvs.push(s, v(y))
      folds.push(0, 0)
    }
  })
  for (let i = 0; i < body.length - 1; i++) {
    for (let j = 0; j < AROUND; j++) {
      const a = i * AROUND + j
      const b = i * AROUND + ((j + 1) % AROUND)
      indices.push(a, a + AROUND, b, b, a + AROUND, b + AROUND)
    }
  }
  // The fins: flat outlines in the middle plane (double-sided), cut by the texture's alpha
  for (const { points, fold } of Object.values(SHAPE.fins)) {
    const first = positions.length / 3
    for (const [s, y] of points) {
      positions.push(0, y, 0.5 - s)
      uvs.push(s, v(y))
      folds.push(fold ? 1 : 0, bodyAt(s).top)
    }
    const shape = points.map(([s, y]) => new THREE.Vector2(s, y))
    for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(shape, [])) indices.push(first + a, first + b, first + c)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('aFold', new THREE.Float32BufferAttribute(folds, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

/**
 * @param {object} options
 * @param {boolean} [options.mobile] - fewer fish
 * @param {(material: THREE.Material) => THREE.Material} [options.prepare] - the viewer's material set-up (underwater)
 * @param {(point: THREE.Vector3) => number | null} [options.floor] - the floor's height below a point
 * @param {() => number} [options.visibility] - the water's visibility (m)
 * @param {() => number} [options.pace] - its pace in this season's water
 * @param {Promise<unknown>} [options.when] - the schools are built once this settles
 */
export function createPerch({ mobile = false, prepare = (m) => m, floor = () => null, visibility = () => 6, pace = () => 1, when = Promise.resolve() }) {
  const root = new THREE.Group()
  root.name = 'perch'
  root.visible = false
  /** @type {object[]} */
  const schools = []
  const time = { value: 0 }
  /** @type {THREE.BufferGeometry | null} */
  let geometry = null
  /** @type {THREE.Material | null} */
  let material = null

  function build() {
    if (material) return
    geometry = fishGeometry()
    const map = new THREE.TextureLoader().load(TEXTURE)
    map.colorSpace = THREE.SRGBColorSpace
    map.anisotropy = 4
    material = new THREE.MeshStandardMaterial({ map, roughness: 0.5, side: THREE.DoubleSide, alphaTest: 0.5 })
    // The swimming wave: the body sways sideways more toward the tail, the wave running down it (per fish: its phase,
    // its sway)
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = 'attribute vec2 aSwim;\nattribute vec4 aBend;\nattribute vec2 aFold;\n' + shader.vertexShader.replace('#include <begin_vertex>', /* glsl */ `
        #include <begin_vertex>
        float swimS = 0.5 - position.z;
        // The spiny dorsal fin: folded back along the back at rest, raised by aBend.w
        if (aFold.x > 0.5) {
          float up = transformed.y - aFold.y;
          transformed.y = aFold.y + up * mix(${FOLDED.toFixed(2)}, 1.0, aBend.w);
          transformed.z -= up * (1.0 - aBend.w) * 0.6;
        }
        // The turn's bend: each part turned about the pivot by its angle (aBend: at the snout, at 0.6 and at the tail's
        // end; none at the pivot)
        float bendA = swimS < ${PIVOT.toFixed(2)} ? mix(aBend.x, 0.0, swimS / ${PIVOT.toFixed(2)}) : swimS < 0.6 ? mix(0.0, aBend.y, (swimS - ${PIVOT.toFixed(2)}) / ${(0.6 - PIVOT).toFixed(2)}) : mix(aBend.y, aBend.z, (swimS - 0.6) / 0.4);
        float bendZ = transformed.z - ${(0.5 - PIVOT).toFixed(2)};
        transformed.xz = vec2(transformed.x * cos(bendA) + bendZ * sin(bendA), -transformed.x * sin(bendA) + bendZ * cos(bendA) + ${(0.5 - PIVOT).toFixed(2)});
        transformed.x += aSwim.y * (0.15 + swimS * swimS) * sin(aSwim.x - swimS * 5.0);`)
    }
    material.customProgramCacheKey = () => 'perch'
    prepare(material)
  }

  /** A school around a spot (the .blend's « perches » empties: the school's middle) */
  function addSchool(spot) {
    build()
    const count = COUNT[mobile ? 1 : 0]
    // The floor below the spot (its tiles may not be loaded yet: a little below the spot then)
    const ground = floor(spot.clone()) ?? spot.y - FLOOR_GAP - HEIGHT / 2
    const swim = new THREE.InstancedBufferAttribute(new Float32Array(count * 2), 2)
    swim.setUsage(THREE.DynamicDrawUsage)
    const mesh = new THREE.InstancedMesh(geometry.clone(), material, count)
    mesh.geometry.setAttribute('aSwim', swim)
    const bends = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4)
    bends.setUsage(THREE.DynamicDrawUsage)
    mesh.geometry.setAttribute('aBend', bends)
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    mesh.frustumCulled = false
    root.add(mesh)
    const home = spot.clone()
    const fish = []
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const position = home.clone().add(new THREE.Vector3(Math.sin(angle), (Math.random() - 0.5) * 0.3, Math.cos(angle)).multiplyScalar(Math.random() * RANGE * 0.6))
      const heading = Math.random() * Math.PI * 2
      fish.push({
        position,
        velocity: new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading)).multiplyScalar(MILL),
        length: between(LENGTH),
        phase: Math.random() * 10,
        wander: Math.random() * 100,
        floor: null,
        heading,
        turnRate: 0,
        pitch: 0,
        raised: 0,
        raiseUntil: 0,
        raisedAt: Infinity,
      })
    }
    schools.push({ mesh, swim, bends, home, ground, fish, next: 0 })
  }

  const steer = new THREE.Vector3()
  const probe = new THREE.Vector3()
  const placed = new THREE.Vector3()
  const separate = new THREE.Vector3()
  const align = new THREE.Vector3()
  const cohere = new THREE.Vector3()
  const offset = new THREE.Vector3()
  const matrix = new THREE.Matrix4()
  const turn = new THREE.Quaternion()
  const euler = new THREE.Euler(0, 0, 0, 'YXZ')
  const scale = new THREE.Vector3()

  function updateSchool(school, camera, dt, slow) {
    const { fish, home, ground } = school
    // The floor under a few fish (all of them every FLOOR_EVERY s): looked for from just above each
    for (let k = Math.ceil((fish.length * dt) / FLOOR_EVERY); k > 0; k--) {
      const a = fish[school.next]
      school.next = (school.next + 1) % fish.length
      a.floor = floor(probe.copy(a.position).setY(a.position.y + 0.3))
    }
    for (const a of fish) {
      separate.set(0, 0, 0)
      align.set(0, 0, 0)
      cohere.set(0, 0, 0)
      let aligned = 0
      let cohered = 0
      for (const b of fish) {
        if (a === b) continue
        offset.subVectors(a.position, b.position)
        const d = offset.length()
        if (d < SEPARATE * a.length && d > 1e-5) separate.addScaledVector(offset, 1 / (d * d))
        if (d < ALIGN) {
          align.add(b.velocity)
          aligned++
        }
        if (d < COHERE) {
          cohere.add(b.position)
          cohered++
        }
      }
      steer.set(0, 0, 0)
      if (separate.lengthSq()) steer.addScaledVector(separate.normalize(), W_SEPARATE)
      if (aligned) steer.addScaledVector(align.divideScalar(aligned).sub(a.velocity), W_ALIGN / CRUISE)
      if (cohered) steer.addScaledVector(cohere.divideScalar(cohered).sub(a.position), W_COHERE)
      // Its room: back toward the spot beyond RANGE, and between the floor's gap and HEIGHT above it
      offset.subVectors(home, a.position).setY(0)
      const out = offset.length() - RANGE
      if (out > 0) steer.addScaledVector(offset.normalize(), W_HOME * (1 + out))
      const below = a.floor ?? ground
      const low = below + FLOOR_GAP - a.position.y
      const high = a.position.y - (below + FLOOR_GAP + HEIGHT)
      if (low > 0) steer.y += W_HOME * (1 + low * 10)
      if (high > 0) steer.y -= W_HOME * (1 + high * 10)
      // A slow wander of its own, mostly level
      a.wander += dt * 0.5 * slow
      steer.x += W_WANDER * Math.sin(a.wander * 1.3)
      steer.z += W_WANDER * Math.cos(a.wander * 1.1)
      steer.y += W_WANDER * 0.2 * Math.sin(a.wander * 0.7)
      // The diver too close: away from them, faster
      offset.subVectors(a.position, camera.position)
      const near = offset.length()
      a.near = near
      let top = CRUISE
      a.fleeing = near < SHY
      if (near < SHY) {
        steer.addScaledVector(offset.setY(offset.y * 0.3).normalize(), FLEE_WEIGHT * (1 - near / SHY) * 4)
        top = FLEE
      }
      a.velocity.addScaledVector(steer, STEER * dt * CRUISE * slow)
      // Level swimmers: the climb kept small against the speed
      a.velocity.y = THREE.MathUtils.clamp(a.velocity.y, -0.3 * a.velocity.length(), 0.3 * a.velocity.length())
      const speed = a.velocity.length()
      if (speed > top * slow) a.velocity.multiplyScalar((top * slow) / speed)
      else if (speed < MILL * slow) a.velocity.multiplyScalar((MILL * slow) / Math.max(speed, 1e-6))
      // Its body turns toward where it would go, as fast as it can; it swims where its body points
      const flat = Math.hypot(a.velocity.x, a.velocity.z)
      const wanted = Math.atan2(a.velocity.x, a.velocity.z)
      const delta = Math.atan2(Math.sin(wanted - a.heading), Math.cos(wanted - a.heading))
      const most = a.fleeing ? FLEE_TURN : TURN * Math.max(slow / ACTIVITY, 0.4)
      a.turnRate += (THREE.MathUtils.clamp(delta * TURN_GAIN, -most, most) - a.turnRate) * Math.min(1, (a.fleeing ? TURN_EASE * 3 : TURN_EASE) * dt)
      a.heading += a.turnRate * dt
      a.velocity.x = Math.sin(a.heading) * flat
      a.velocity.z = Math.cos(a.heading) * flat
      a.pitch += (Math.asin(THREE.MathUtils.clamp(a.velocity.y / Math.max(a.velocity.length(), 1e-6), -1, 1)) - a.pitch) * Math.min(1, 3 * dt)
      a.position.addScaledVector(a.velocity, dt)
    }
    // Their matrices: the pivot at its place, the body along the pivot's heading (+z the snout); the bend from the
    // turning rate (the head turned ahead of the pivot, the tail behind it); the swimming wave's phase by their speed
    fish.forEach((a, i) => {
      const speed = a.velocity.length()
      const pulse = THREE.MathUtils.clamp(a.length / Math.max(speed, 1e-3), PULSE[0], PULSE[1])
      const bend = (share) => THREE.MathUtils.clamp(-a.turnRate * (share - PIVOT) * pulse, -BEND_MAX, BEND_MAX)
      // The spiny dorsal raised with the diver close, folded again once they are gone
      if (a.near < SHY * RAISE) {
        if (a.near < a.raisedAt - CLOSER) {
          a.raiseUntil = time.value + between(RAISE_HOLD)
          a.raisedAt = a.near
        }
      } else a.raisedAt = Infinity
      const raise = time.value < a.raiseUntil ? 1 : 0
      a.raised += (raise - a.raised) * Math.min(1, (raise ? RAISE_SPEED : FOLD_SPEED) * dt)
      school.bends.setXYZW(i, bend(0), bend(0.6), bend(1), a.raised)
      euler.set(-a.pitch, a.heading, 0)
      turn.setFromEuler(euler)
      // (the mesh's origin is its middle: the pivot is 0.5 - PIVOT of its length ahead of it)
      placed.set(0, 0, -(0.5 - PIVOT) * a.length).applyQuaternion(turn).add(a.position)
      matrix.compose(placed, turn, scale.setScalar(a.length))
      school.mesh.setMatrixAt(i, matrix)
      a.phase += dt * (BEAT_REST + BEAT_PER_SPEED * speed)
      school.swim.setXY(i, a.phase, SWAY * Math.min(1.5, 0.4 + speed / CRUISE))
    })
    school.mesh.instanceMatrix.needsUpdate = true
    school.swim.needsUpdate = true
    school.bends.needsUpdate = true
  }

  return {
    object: root,
    /**
     * A school at this spot, built once `when` settles
     * @param {THREE.Vector3} spot - the school's middle (scene metres)
     */
    add(spot) {
      const at = spot.clone()
      when.then(() => addSchool(at))
    },
    /** All the schools removed (a new model loaded) */
    clear() {
      for (const school of schools) {
        root.remove(school.mesh)
        school.mesh.geometry.dispose()
        school.mesh.dispose()
      }
      schools.length = 0
    },
    /** For tests */
    get debug() {
      return schools.map((s) => ({ home: s.home.toArray().map((x) => +x.toFixed(2)), fish: s.fish.length }))
    },
    /**
     * Each frame
     * @param {THREE.Camera} camera
     * @param {number} dt
     * @param {boolean} on - the underwater view is on
     * @returns {boolean} whether a school moved in sight (a new frame is needed)
     */
    update(camera, dt, on) {
      root.visible = on
      if (!on || !schools.length) return false
      time.value += dt
      const awake = visibility() * AWAKE + RANGE
      const slow = pace() * ACTIVITY
      let moved = false
      for (const school of schools) {
        const far = camera.position.distanceTo(school.home) > awake
        school.mesh.visible = !far
        if (far) continue
        updateSchool(school, camera, Math.min(dt, 0.1), slow)
        moved = true
      }
      return moved
    },
  }
}
