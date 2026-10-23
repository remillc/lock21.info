// « Ambiance sous-marine » (TODO #46): the lock as a diver sees it, turned on by the 🤿 button (main.js). Ported from
// the first attempt on the old viewer (branch feature/underwater-look, 2026-10-18), on top of today's lit materials:
//  - light absorbed along the line of sight, per channel (Beer-Lambert: red fades first), toward the water's colour;
//    applied before the tone mapping, so the same with and without the ambient occlusion pass (main.js, patchShader);
//  - the background: the water column around the camera, lighter toward the surface, with the refracted sun; it also
//    lights the scene (its own lighting environment, made by PMREM), instead of the sky;
//  - the sun bent toward the vertical by the surface (Snell), from the « Soleil » setting; caustics (the moving light
//    network of the waves) on surfaces facing it, fading with depth;
//  - the water surface seen from below; suspended particles carried west to east by the current;
//  - a dive light held near the camera, pointing where it looks (« Lampe de plongée » setting): warm white, a 30°
//    beam with soft edges, fading with distance, out of reach beyond about 1.5 times the visibility;
//  - the season (« Saison » setting): the visibility (winter 100 ft, spring 10, summer 20, autumn 30, Christian's
//    observations) and the water's colour (spring's runoff murkier and browner).
// Distances in metres, y up; the lock floor near y = 0.
import * as THREE from 'three'

// The lock floor lies 55 ft below the surface
export const SURFACE_Y = 55 * 0.3048
const WATER_INDEX = 1.333
// River current, west to east: 35 ft/min, measured by drifting in the canal (2024-06-08), in m/s; shown CURRENT_SCALE
// times faster (Christian, 2026-10-23: at the measured speed the drift hardly showed)
const CURRENT_SCALE = 3
const CURRENT = [((35 * 0.3048) / 60) * CURRENT_SCALE, 0, 0]
// Suspended particles: many (Christian, 2026-10-23), in a box following the camera
const PARTICLE_COUNT = 40000
const PARTICLE_BOX = 14
// The scattered light's strength against the lit surfaces (brighter washed every surface to the water's colour)
const WATER_BRIGHTNESS = 0.6
// The dive light: held 30 cm below and 25 cm right of the eye, pointing ahead; candela (about 5 times the sun at the
// floor 2 m away: at 12 the beam vanished in the haze), beam half-angle and soft edge, reach in visibilities
const LAMP_OFFSET = [0.25, -0.3, 0]
const LAMP_INTENSITY = 60
const LAMP_ANGLE = 30
const LAMP_PENUMBRA = 0.6
const LAMP_REACH = 1.5

// Per season: visibility (ft), relative absorption per channel (red, green, blue), the colour of the light the water
// scatters toward the eye (linear), and the water column's colours above and below (linear)
export const SEASONS = [
  { key: 'winter', visibilityFt: 100, absorb: [1.7, 1.0, 1.15], water: [0.05, 0.16, 0.17], surface: [0.35, 0.6, 0.62], deep: [0.01, 0.04, 0.05] },
  { key: 'spring', visibilityFt: 10, absorb: [1.35, 1.0, 1.6], water: [0.12, 0.13, 0.07], surface: [0.42, 0.45, 0.3], deep: [0.03, 0.03, 0.015] },
  { key: 'summer', visibilityFt: 20, absorb: [1.7, 1.0, 1.3], water: [0.07, 0.17, 0.12], surface: [0.4, 0.62, 0.5], deep: [0.015, 0.05, 0.035] },
  { key: 'autumn', visibilityFt: 30, absorb: [1.7, 1.0, 1.25], water: [0.06, 0.16, 0.14], surface: [0.36, 0.58, 0.52], deep: [0.012, 0.045, 0.04] },
]

// Caustic network: thin bright lines where interfering wave fronts focus the sunlight
const CAUSTIC_GLSL = /* glsl */ `
  float uwCaustic(vec2 p, float t) {
    vec2 q = p + 0.45 * vec2(sin(p.y * 1.3 + t * 0.7), cos(p.x * 1.1 - t * 0.6));
    float a = sin(q.x * 2.1 + t) + sin(q.y * 1.7 - t * 0.8) + sin((q.x + q.y) * 1.3 + t * 0.5);
    float b = sin(q.x * 3.3 - t * 1.1) * sin(q.y * 2.9 + t * 0.9);
    return pow(max(0.0, 1.0 - abs(a) * 0.55), 5.0) + 0.35 * pow(max(0.0, 1.0 - abs(b) * 1.4), 4.0);
  }`

/**
 * The sun's direction once in the water: bent toward the vertical
 * @param {THREE.Vector3} direction - toward the sun, in the air (unit)
 */
export function refractedSun(direction) {
  const horizontal = Math.hypot(direction.x, direction.z)
  const sinZenith = Math.min(horizontal, 1) / WATER_INDEX
  const cosZenith = Math.sqrt(1 - sinZenith * sinZenith)
  const scale = horizontal > 1e-6 ? sinZenith / horizontal : 0
  return new THREE.Vector3(direction.x * scale, cosZenith, direction.z * scale)
}

/**
 * @param {THREE.Scene} scene
 * @param {THREE.WebGLRenderer} renderer
 */
export function createUnderwater(scene, renderer) {
  const uniforms = {
    uUwOn: { value: 0 },
    uUwAbsorb: { value: new THREE.Vector3() },
    uUwWater: { value: new THREE.Vector3() },
    uUwTime: { value: 0 },
    uUwSun: { value: new THREE.Vector3(0, 1, 0) },
    uUwSurface: { value: SURFACE_Y },
  }
  let on = false
  let season = SEASONS[2]
  /** @type {THREE.Texture | null} */
  let environment = null
  const clock = new THREE.Clock(false)

  // Water column: a sphere around the camera, lighter toward the surface, with the refracted sun
  const columnMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uSurface: { value: new THREE.Vector3() },
      uWater: uniforms.uUwWater,
      uDeep: { value: new THREE.Vector3() },
      uSun: uniforms.uUwSun,
      uGlare: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSurface;
      uniform vec3 uWater;
      uniform vec3 uDeep;
      uniform vec3 uSun;
      uniform float uGlare;
      varying vec3 vDir;
      void main() {
        float y = vDir.y;
        vec3 c = y > 0.0 ? mix(uWater, uSurface, pow(y, 0.8)) : mix(uWater, uDeep, pow(-y, 0.6));
        float s = max(dot(vDir, uSun), 0.0);
        c += vec3(1.0, 0.97, 0.85) * (2.5 * pow(s, 400.0) + 0.45 * pow(s, 12.0)) * uGlare;
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  })
  const column = new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 24), columnMaterial)
  column.renderOrder = -1
  column.frustumCulled = false
  column.visible = false
  scene.add(column)

  // The lighting environment: the same column, without the sun's glare (the sun light brings it), through PMREM
  const pmrem = new THREE.PMREMGenerator(renderer)
  function makeEnvironment() {
    environment?.dispose()
    const columnScene = new THREE.Scene()
    const copy = new THREE.Mesh(column.geometry, columnMaterial.clone())
    copy.material.uniforms.uGlare.value = 0
    copy.material.uniforms.uSurface.value.copy(columnMaterial.uniforms.uSurface.value)
    copy.material.uniforms.uDeep.value.copy(columnMaterial.uniforms.uDeep.value)
    copy.material.uniforms.uWater = { value: uniforms.uUwWater.value.clone() }
    copy.material.uniforms.uSun = { value: uniforms.uUwSun.value.clone() }
    copy.material.toneMapped = false
    columnScene.add(copy)
    environment = pmrem.fromScene(columnScene, 0, 0.1, 2000).texture
    copy.material.dispose()
  }

  // Water surface seen from below: bright, shimmering, with the sun's glare, fading with distance
  const surface = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600),
    new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: uniforms.uUwTime, uAbsorb: uniforms.uUwAbsorb, uColor: columnMaterial.uniforms.uSurface, uSun: uniforms.uUwSun },
      vertexShader: /* glsl */ `
        varying vec3 vWorld;
        varying float vDistance;
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.0);
          vWorld = w.xyz;
          vec4 mv = viewMatrix * w;
          vDistance = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uAbsorb;
        uniform vec3 uColor;
        uniform vec3 uSun;
        varying vec3 vWorld;
        varying float vDistance;
        ${CAUSTIC_GLSL}
        void main() {
          vec2 p = vWorld.xz * 0.35;
          float w = sin(p.x * 1.7 + uTime * 0.6) * sin(p.y * 1.3 - uTime * 0.45) + 0.5 * sin((p.x + p.y) * 2.9 + uTime * 0.9);
          vec3 view = normalize(vWorld - cameraPosition);
          float glare = pow(max(dot(view, uSun), 0.0), 30.0);
          vec3 c = uColor * (1.35 + 0.25 * w + 0.6 * uwCaustic(vWorld.xz * 0.8, uTime * 0.8)) + vec3(1.0, 0.97, 0.88) * 2.0 * glare;
          gl_FragColor = vec4(c, exp(-0.6 * uAbsorb.g * vDistance));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }),
  )
  surface.rotation.x = -Math.PI / 2
  surface.position.y = SURFACE_Y
  surface.visible = false
  scene.add(surface)

  // Suspended particles, wrapped in a box that follows the camera; they sparkle a little
  const seeds = new Float32Array(PARTICLE_COUNT * 4)
  for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random()
  const particleGeometry = new THREE.BufferGeometry()
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3))
  particleGeometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 4))
  const particles = new THREE.Points(
    particleGeometry,
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uCamera: { value: new THREE.Vector3() },
        uTime: uniforms.uUwTime,
        uBox: { value: PARTICLE_BOX },
        uPixelRatio: { value: renderer.getPixelRatio() },
        uAbsorb: uniforms.uUwAbsorb,
        uCurrent: { value: new THREE.Vector3(...CURRENT) },
      },
      vertexShader: /* glsl */ `
        attribute vec4 seed;
        uniform vec3 uCamera;
        uniform float uTime;
        uniform float uBox;
        uniform float uPixelRatio;
        uniform vec3 uCurrent;
        varying float vDistance;
        varying float vSeed;
        void main() {
          // Carried by the current (speed varies a little per particle), with a slight turbulent sway
          vec3 sway = vec3(sin(uTime * 0.3 + seed.w * 6.28), sin(uTime * 0.21 + seed.z * 6.28) - 0.03 * uTime, cos(uTime * 0.25 + seed.w * 3.14)) * 0.25;
          vec3 p = seed.xyz * uBox + uCurrent * uTime * (0.8 + 0.4 * seed.w) + sway;
          p = mod(p - uCamera + uBox * 0.5, uBox) - uBox * 0.5 + uCamera;
          vec4 mv = viewMatrix * vec4(p, 1.0);
          vDistance = -mv.z;
          vSeed = seed.w;
          // Half the first size (Christian, 2026-10-23: smaller)
          gl_PointSize = (0.006 + 0.01 * seed.w) * 900.0 * uPixelRatio / max(vDistance, 0.1);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uAbsorb;
        uniform float uTime;
        varying float vDistance;
        varying float vSeed;
        void main() {
          float r = length(gl_PointCoord - 0.5);
          if (r > 0.5) discard;
          float sparkle = 0.75 + 0.25 * sin(uTime * 3.0 + vSeed * 40.0);
          float alpha = smoothstep(0.5, 0.0, r) * (0.3 + 0.4 * vSeed) * sparkle * exp(-uAbsorb.g * vDistance);
          gl_FragColor = vec4(vec3(0.85, 0.95, 0.9), alpha);
        }`,
    }),
  )
  particles.frustumCulled = false
  particles.visible = false
  scene.add(particles)

  /**
   * The absorption on a surface material (main.js, in its onBeforeCompile): along the line of sight, toward the
   * water's colour, with the caustics; before the tone mapping. Always compiled in, uUwOn turns it on
   * @param {{ vertexShader: string, fragmentShader: string, uniforms: object }} shader
   */
  function patchShader(shader) {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = 'varying vec3 vUwWorld;\nvarying float vUwDepth;\n' + shader.vertexShader.replace(
      '#include <project_vertex>',
      '#include <project_vertex>\nvUwWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvUwDepth = -mvPosition.z;',
    )
    shader.fragmentShader =
      'uniform float uUwOn;\nuniform vec3 uUwAbsorb;\nuniform vec3 uUwWater;\nuniform float uUwTime;\nuniform vec3 uUwSun;\n' +
      'uniform float uUwSurface;\nvarying vec3 vUwWorld;\nvarying float vUwDepth;\n' + CAUSTIC_GLSL + '\n' +
      shader.fragmentShader.replace('#include <tonemapping_fragment>', /* glsl */ `
        if (uUwOn > 0.5) {
          // Face orientation from screen-space derivatives; double-sided
          vec3 uwNormal = normalize(cross(dFdx(vUwWorld), dFdy(vUwWorld)));
          float uwFacing = abs(dot(uwNormal, uUwSun));
          float uwDepth = max(0.0, uUwSurface - vUwWorld.y);
          // Projected along the sun's ray to the surface: the pattern belongs to the waves above
          vec2 uwCaustUv = (vUwWorld.xz + uwDepth * uUwSun.xz / max(uUwSun.y, 0.2)) * 0.8;
          float uwCaustic = uwCaustic(uwCaustUv, uUwTime * 0.8) * smoothstep(0.2, 0.9, uwFacing) * exp(-0.07 * uwDepth);
          vec3 uwTransmit = exp(-uUwAbsorb * vUwDepth);
          gl_FragColor.rgb = gl_FragColor.rgb * (1.0 + 1.5 * uwCaustic) * uwTransmit + uUwWater * (1.0 - uwTransmit);
        }
        #include <tonemapping_fragment>`)
  }

  const lamp = new THREE.SpotLight(0xfff1dd, LAMP_INTENSITY, 0, THREE.MathUtils.degToRad(LAMP_ANGLE), LAMP_PENUMBRA, 2)
  lamp.visible = false
  let lampWanted = true
  scene.add(lamp, lamp.target)
  const lampOffset = new THREE.Vector3()
  const lampAhead = new THREE.Vector3()

  function applySeason() {
    // Contrast at the visibility distance about 8 % for the least absorbed channel (k = 2.5 / V): softer than the
    // textbook 2 % (k = 3.9 / V), which hid what a diver sees clearly a metre away (the eye adapts)
    const k = 2.5 / (season.visibilityFt * 0.3048)
    uniforms.uUwAbsorb.value.set(...season.absorb.map((r) => r * k))
    uniforms.uUwWater.value.set(...season.water.map((c) => c * WATER_BRIGHTNESS))
    columnMaterial.uniforms.uSurface.value.set(...season.surface)
    columnMaterial.uniforms.uDeep.value.set(...season.deep)
    lamp.distance = LAMP_REACH * season.visibilityFt * 0.3048
    makeEnvironment()
  }

  return {
    patchShader,
    get on() {
      return on
    },
    /** The lighting environment while on (the water column) */
    get environment() {
      return environment
    },
    /** @param {boolean} value */
    setOn(value) {
      on = value
      uniforms.uUwOn.value = on ? 1 : 0
      column.visible = surface.visible = particles.visible = on
      lamp.visible = on && lampWanted
      if (on && !environment) applySeason()
      if (on) clock.start()
      else clock.stop()
    },
    /** @param {boolean} wanted - the dive light (while underwater) */
    setLamp(wanted) {
      lampWanted = wanted
      lamp.visible = on && lampWanted
    },
    /** @param {number} index - in SEASONS */
    setSeason(index) {
      season = SEASONS[Math.min(Math.max(Math.round(index), 0), SEASONS.length - 1)]
      applySeason()
    },
    /** @param {THREE.Vector3} direction - toward the sun in the air: refracted for the caustics and the glare */
    setSun(direction) {
      uniforms.uUwSun.value.copy(refractedSun(direction))
      if (environment) makeEnvironment()
    },
    /** Each frame while on: the animation, the column and the particles follow the camera */
    update(camera) {
      uniforms.uUwTime.value = clock.getElapsedTime()
      column.position.copy(camera.position)
      surface.position.x = camera.position.x
      surface.position.z = camera.position.z
      particles.material.uniforms.uCamera.value.copy(camera.position)
      // The dive light follows the camera: its offset in the camera's frame, aimed 10 m ahead
      lamp.position.copy(camera.position).add(lampOffset.set(...LAMP_OFFSET).applyQuaternion(camera.quaternion))
      lamp.target.position.copy(camera.position).add(lampAhead.set(0, 0, -10).applyQuaternion(camera.quaternion))
    },
  }
}
