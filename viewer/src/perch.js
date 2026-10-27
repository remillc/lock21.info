// Schools of young yellow perch in the underwater view (TODO #68, Christian, 2026-10-27): small perch that keep to the
// places with plants, each school around its own spot (main.js: the filler of zone 1, the floor of zone 6), close to
// the bottom; they mill slowly together and draw back from the diver, then come back.
//
// No model online fitted (Sketchfab, 2026-10-27: the one light CC BY perch is a round cartoon fish; the others too
// heavy, non-commercial or not perch), so the fish is built here from the species' descriptions (Missouri Department of
// Conservation, Iowa DNR, Connecticut DEEP, Virginia DWR):
// - shape: long, flattened from side to side, deepest at about a third of its length; two separate dorsal fins (spiny,
//   then soft); a forked tail;
// - colours: olive back, golden yellow sides, white belly, 6 to 8 dark bars from the back down the sides, narrowing
//   downward; the young duller than the adults, without the spawning males' orange fins;
// - the young (young of the year: a few cm in spring, about 6 to 10 cm in the autumn) school by 50 to 200, near
//   submerged plants or structures. Here fewer (COUNT per school), for the frame rate.
// All the fish of a school are one instanced mesh (one draw call); their swimming wave is in the vertex shader.
// Behaviour: a flock (separation, alignment, cohesion), held within RANGE m of its spot and close to the bottom
// (Christian, 2026-10-27: they keep to the floor and the structures, never out in open water): each fish between
// FLOOR_GAP and FLOOR_GAP + HEIGHT m above the floor under it (looked for again every FLOOR_EVERY s, a few fish per
// frame); the diver closer than SHY m sends the fish away from them, faster.
import * as THREE from 'three'

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

/** A number at random in [min, max] */
const between = ([min, max]) => min + Math.random() * (max - min)

// The body's depth along its length (share of the length; s from the snout, 0, to the tail fin's end, 1)
function depth(s) {
  if (s < 0.38) return 0.25 * Math.sqrt(Math.sin((Math.PI / 2) * (s / 0.38)))
  if (s < 0.82) return 0.08 + 0.17 * (0.5 + 0.5 * Math.cos((Math.PI * (s - 0.38)) / 0.44))
  return 0.08
}
// The back is more arched than the belly: the body's middle line a little above the axis toward the head
const middle = (s) => 0.015 * Math.sin(Math.PI * Math.min(s / 0.82, 1))

/** The fish's geometry: length 1 along z, the snout at +0.5; uv: u along the body, v the height (side projection) */
function fishGeometry() {
  const positions = []
  const uvs = []
  const indices = []
  const RINGS = 18
  const AROUND = 10
  const height = (y) => 0.5 + y / 0.34
  // The body: rings from the snout to the tail's base (s 0.82)
  for (let i = 0; i <= RINGS; i++) {
    const s = (i / RINGS) * 0.82
    const d = Math.max(depth(s), 0.004)
    const w = 0.42 * d
    for (let j = 0; j < AROUND; j++) {
      const a = (j / AROUND) * Math.PI * 2
      const y = middle(s) + (d / 2) * Math.cos(a)
      positions.push((w / 2) * Math.sin(a), y, 0.5 - s)
      uvs.push(s, height(y))
    }
  }
  for (let i = 0; i < RINGS; i++) {
    for (let j = 0; j < AROUND; j++) {
      const a = i * AROUND + j
      const b = i * AROUND + ((j + 1) % AROUND)
      const c = a + AROUND
      const e = b + AROUND
      indices.push(a, c, b, b, c, e)
    }
  }
  // The fins: flat, in the middle plane (double-sided material); their colour from the texture's top row (dusky) or
  // bottom row (yellowish)
  const fin = (points, row) => {
    const first = positions.length / 3
    for (const [s, y] of points) {
      positions.push(0, y, 0.5 - s)
      uvs.push(s, row)
    }
    for (let k = 1; k < points.length - 1; k++) indices.push(first, first + k, first + k + 1)
  }
  const top = (s) => middle(s) + depth(s) / 2
  const bottom = (s) => middle(s) - depth(s) / 2
  // Spiny dorsal (its spines' tips), soft dorsal, tail (forked), anal, pelvic
  fin([[0.28, top(0.28)], [0.31, top(0.31) + 0.1], [0.38, top(0.38) + 0.09], [0.46, top(0.46) + 0.06], [0.53, top(0.53)]], 0.99)
  fin([[0.56, top(0.56)], [0.6, top(0.6) + 0.07], [0.7, top(0.7) + 0.05], [0.75, top(0.75)]], 0.99)
  fin([[0.8, middle(0.8)], [0.8, top(0.8)], [1, 0.15], [0.92, middle(0.8)], [1, -0.13], [0.8, bottom(0.8)]], 0.99)
  fin([[0.6, bottom(0.6)], [0.63, bottom(0.63) - 0.06], [0.72, bottom(0.72) - 0.04], [0.74, bottom(0.74)]], 0.01)
  fin([[0.3, bottom(0.3)], [0.36, bottom(0.36) - 0.07], [0.4, bottom(0.4)]], 0.01)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

/** Its colours, painted on a small canvas (side projection: u along the body, v the height) */
function fishTexture() {
  const W = 256
  const H = 128
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const context = canvas.getContext('2d')
  const image = context.createImageData(W, H)
  const back = [62, 72, 30]
  const side = [150, 128, 46]
  const belly = [190, 184, 150]
  const bar = [34, 40, 18]
  // The young are duller (Connecticut DEEP): the sides less yellow
  const dull = 0.8
  const grey = (c) => (c[0] + c[1] + c[2]) / 3
  const mute = (c) => c.map((x) => grey(c) + (x - grey(c)) * dull)
  const bars = [0.27, 0.35, 0.43, 0.51, 0.59, 0.67, 0.75]
  const mix = (a, b, t) => a.map((x, k) => x + (b[k] - x) * t)
  for (let py = 0; py < H; py++) {
    const v = 1 - py / (H - 1)
    for (let px = 0; px < W; px++) {
      const u = px / (W - 1)
      let colour
      if (v > 0.975) colour = [70, 74, 44]
      else if (v < 0.025) colour = [150, 124, 60]
      else {
        const s = Math.min(u, 0.82)
        const y = (v - 0.5) * 0.34
        const rel = THREE.MathUtils.clamp((y - middle(s)) / Math.max(depth(s) / 2, 0.01), -1, 1)
        colour = rel > 0.35 ? mix(side, back, THREE.MathUtils.smoothstep(rel, 0.35, 0.75)) : mix(belly, side, THREE.MathUtils.smoothstep(rel, -0.7, -0.1))
        // The bars: widest on the back, narrowing down to about the lower third of the side
        for (const at of bars) {
          const reach = THREE.MathUtils.smoothstep(rel, -0.45, 0.6)
          const width = 0.04 * reach
          if (Math.abs(u - at) < width) colour = mix(colour, bar, 0.9 * reach)
        }
        // The eye, and the gill cover's edge
        if (Math.hypot(u - 0.08, (rel - 0.25) * 0.06) < 0.022) colour = Math.hypot(u - 0.08, (rel - 0.25) * 0.06) < 0.012 ? [10, 10, 8] : [170, 150, 70]
        else if (Math.abs(u - 0.2 + 0.02 * rel) < 0.006 && rel > -0.5) colour = mix(colour, bar, 0.5)
      }
      colour = mute(colour)
      const k = (py * W + px) * 4
      image.data[k] = colour[0]
      image.data[k + 1] = colour[1]
      image.data[k + 2] = colour[2]
      image.data[k + 3] = 255
    }
  }
  context.putImageData(image, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
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
    material = new THREE.MeshStandardMaterial({ map: fishTexture(), roughness: 0.55, side: THREE.DoubleSide })
    // The swimming wave: the body sways sideways more toward the tail, the wave running down it (per fish: its phase,
    // its sway)
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = 'attribute vec2 aSwim;\n' + shader.vertexShader.replace('#include <begin_vertex>', /* glsl */ `
        #include <begin_vertex>
        float swimS = 0.5 - position.z;
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
      })
    }
    schools.push({ mesh, swim, home, ground, fish, next: 0 })
  }

  const steer = new THREE.Vector3()
  const probe = new THREE.Vector3()
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
      let top = CRUISE
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
      a.position.addScaledVector(a.velocity, dt)
    }
    // Their matrices: along their velocity (+z the snout), level-ish; the swimming wave's phase by their speed
    fish.forEach((a, i) => {
      const speed = a.velocity.length()
      euler.set(-Math.asin(THREE.MathUtils.clamp(a.velocity.y / Math.max(speed, 1e-6), -1, 1)), Math.atan2(a.velocity.x, a.velocity.z), 0)
      turn.setFromEuler(euler)
      matrix.compose(a.position, turn, scale.setScalar(a.length))
      school.mesh.setMatrixAt(i, matrix)
      a.phase += dt * (BEAT_REST + BEAT_PER_SPEED * speed)
      school.swim.setXY(i, a.phase, SWAY * Math.min(1.5, 0.4 + speed / CRUISE))
    })
    school.mesh.instanceMatrix.needsUpdate = true
    school.swim.needsUpdate = true
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
