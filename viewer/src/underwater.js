// « Ambiance sous-marine » (TODO #46): the lock as a diver sees it, turned on by the 🤿 button (main.js). Ported from
// the first attempt on the old viewer (branch feature/underwater-look, 2026-10-18), on top of today's lit materials:
//  - applied before the tone mapping, so the same with and without the ambient occlusion pass (main.js, patchShader);
//  - distances are the true distance from the camera to each point (not the depth along its axis): facing a wall, its
//    parts away from the centre are further, and fade first;
//  - the background: the water column around the camera, lighter toward the surface, with the refracted sun; the
//    surfaces fade into its colour: seen as they are up close, gone at the season's visibility (the usual sky and sun
//    lighting stays: the water only hides the distance);
//  - the sun bent toward the vertical by the surface (Snell), from the « Soleil » setting; caustics (the moving light
//    network of the waves) on surfaces facing it, fading with depth;
//  - the water surface seen from below; suspended particles carried west to east by the current;
//  - a dive light held at the bottom right of the view, aimed at its middle (« Lampe de plongée » setting): warm white, a 15°
//    beam with soft edges, fading with distance, out of reach beyond about 1.5 times the visibility; its beam seen in
//    the water (the light the water scatters toward the eye), computed in each pixel's shading (uwBeam): samples along
//    the line of sight, lit where they fall in the lamp's cone. It only adds light (a cone drawn as a mesh veiled the
//    model when seen along its axis);
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
// The surfaces are seen as they are up to this share of the visibility (Christian, 2026-10-23: textures seen up close,
// nothing far away); the usual lighting (sky and sun) stays, the water only hides the distance
const CLEAR_SHARE = 0.15
// The dive light: held at the bottom right of the view (35 cm right of and 30 cm below the eye), aimed at the point
// LAMP_AIM ahead in the middle of the view, so its ray crosses the view toward the centre (Christian, 2026-10-23);
// candela (as a three.js spot light: about 7 times the sun at the floor 3 m away), beam half-angle, reach in
// visibilities
const LAMP_OFFSET = [0.35, -0.3, 0]
const LAMP_AIM = 6
const LAMP_INTENSITY = 200
// The share of the daylight's colour shift at depth that is shown (the rest: the eye's adaptation)
const DAYLIGHT_SHIFT = 0.5
const LAMP_ANGLE = 15
const LAMP_REACH = 1.5
// The beam's brightness in the water (in-scattered light, added along the line of sight)
const BEAM_STRENGTH = 0.25
const BEAM_SAMPLES = 12

// Per season: visibility (ft); the water's own absorption per metre and per channel (red, green, blue: red first; in
// spring's runoff, blue too); the colour of the light the water scatters toward the eye (linear), and the water
// column's colours above and below (linear). The visibility is mostly scattering by particles, which keeps the
// colours (haze toward the water's colour); only the absorption takes them away. Treating all the haze as absorption
// left no colour a metre away, even in the dive light's beam
export const SEASONS = [
  { key: 'winter', visibilityFt: 100, absorb: [0.3, 0.05, 0.06], water: [0.05, 0.16, 0.17], surface: [0.35, 0.6, 0.62], deep: [0.01, 0.04, 0.05] },
  { key: 'spring', visibilityFt: 10, absorb: [0.35, 0.12, 0.3], water: [0.12, 0.13, 0.07], surface: [0.42, 0.45, 0.3], deep: [0.03, 0.03, 0.015] },
  { key: 'summer', visibilityFt: 20, absorb: [0.35, 0.07, 0.15], water: [0.07, 0.17, 0.12], surface: [0.4, 0.62, 0.5], deep: [0.015, 0.05, 0.035] },
  { key: 'autumn', visibilityFt: 30, absorb: [0.33, 0.06, 0.12], water: [0.06, 0.16, 0.14], surface: [0.36, 0.58, 0.52], deep: [0.012, 0.045, 0.04] },
]

// Caustic network: thin bright lines where interfering wave fronts focus the sunlight
const CAUSTIC_GLSL = /* glsl */ `
  float uwCaustic(vec2 p, float t) {
    vec2 q = p + 0.45 * vec2(sin(p.y * 1.3 + t * 0.7), cos(p.x * 1.1 - t * 0.6));
    float a = sin(q.x * 2.1 + t) + sin(q.y * 1.7 - t * 0.8) + sin((q.x + q.y) * 1.3 + t * 0.5);
    float b = sin(q.x * 3.3 - t * 1.1) * sin(q.y * 2.9 + t * 0.9);
    return pow(max(0.0, 1.0 - abs(a) * 0.55), 5.0) + 0.35 * pow(max(0.0, 1.0 - abs(b) * 1.4), 4.0);
  }`

// The dive light's beam in the water: the light scattered toward the eye along the line of sight from a to b
// (world), sampled BEAM_SAMPLES times within the lamp's reach; lit where a sample falls in the lamp's cone (soft
// edge), dimmed by distance from the lamp and by the water on both legs (lamp to sample, sample to eye)
const BEAM_GLSL = /* glsl */ `
  uniform vec3 uUwLampPos;
  uniform vec3 uUwLampDir;
  uniform float uUwLampCos;
  uniform float uUwLampStrength;
  uniform float uUwLampReach;
  float uwBeam(vec3 a, vec3 b, float absorb) {
    if (uUwLampStrength <= 0.0) return 0.0;
    vec3 ray = b - a;
    float span = min(length(ray), uUwLampReach);
    vec3 dir = normalize(ray);
    float sum = 0.0;
    for (int i = 0; i < ${BEAM_SAMPLES}; i++) {
      float t = (float(i) + 0.5) / ${BEAM_SAMPLES}.0 * span;
      vec3 toSample = a + dir * t - uUwLampPos;
      float d = max(length(toSample), 0.05);
      float cone = smoothstep(uUwLampCos, mix(uUwLampCos, 1.0, 0.4), dot(toSample / d, uUwLampDir));
      // Not closer than 1 m: with the lamp at the eye, the water right in front of it glared over the whole view
      sum += cone * exp(-absorb * (d + t)) / max(d * d, 1.0);
    }
    return sum * span / ${BEAM_SAMPLES}.0 * uUwLampStrength;
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
    uUwClear: { value: 1 },
    uUwSpectral: { value: new THREE.Vector3() },
    uUwLampPower: { value: 0 },
    uUwLampColor: { value: new THREE.Color(0xfff1dd) },
    uUwTop: { value: new THREE.Vector3() },
    uUwDeep: { value: new THREE.Vector3() },
    uUwGone: { value: 6 },
    uUwWater: { value: new THREE.Vector3() },
    uUwTime: { value: 0 },
    uUwSun: { value: new THREE.Vector3(0, 1, 0) },
    uUwSurface: { value: SURFACE_Y },
    uUwLampPos: { value: new THREE.Vector3() },
    uUwLampDir: { value: new THREE.Vector3(0, 0, -1) },
    uUwLampCos: { value: Math.cos(THREE.MathUtils.degToRad(LAMP_ANGLE)) },
    uUwLampStrength: { value: 0 },
    uUwLampReach: { value: 10 },
  }
  let on = false
  let season = SEASONS[2]
  const clock = new THREE.Clock(false)

  // Water column: a sphere around the camera, lighter toward the surface, with the refracted sun
  const columnMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uUwLampPos: uniforms.uUwLampPos,
      uUwLampDir: uniforms.uUwLampDir,
      uUwLampCos: uniforms.uUwLampCos,
      uUwLampStrength: uniforms.uUwLampStrength,
      uUwLampReach: uniforms.uUwLampReach,
      uAbsorb: uniforms.uUwAbsorb,
      uSurface: uniforms.uUwTop,
      uWater: uniforms.uUwWater,
      uDeep: uniforms.uUwDeep,
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
      uniform vec3 uAbsorb;
      varying vec3 vDir;
      ${BEAM_GLSL}
      void main() {
        float y = vDir.y;
        vec3 c = y > 0.0 ? mix(uWater, uSurface, pow(y, 0.8)) : mix(uWater, uDeep, pow(-y, 0.6));
        float s = max(dot(vDir, uSun), 0.0);
        c += vec3(1.0, 0.97, 0.85) * (2.5 * pow(s, 400.0) + 0.45 * pow(s, 12.0)) * uGlare;
        // The beam over open water
        c += vec3(1.0, 0.94, 0.87) * uwBeam(cameraPosition, cameraPosition + vDir * uUwLampReach, uAbsorb.g) * uGlare;
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
          vDistance = length(mv.xyz);
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
        uUwLampPos: uniforms.uUwLampPos,
        uUwLampDir: uniforms.uUwLampDir,
        uUwLampCos: uniforms.uUwLampCos,
        uUwLampStrength: uniforms.uUwLampStrength,
      },
      vertexShader: /* glsl */ `
        attribute vec4 seed;
        uniform vec3 uCamera;
        uniform float uTime;
        uniform float uBox;
        uniform float uPixelRatio;
        uniform vec3 uCurrent;
        uniform vec3 uUwLampPos;
        uniform vec3 uUwLampDir;
        uniform float uUwLampCos;
        uniform float uUwLampStrength;
        varying float vDistance;
        varying float vSeed;
        varying float vLit;
        void main() {
          // Carried by the current (speed varies a little per particle), with a slight turbulent sway
          vec3 sway = vec3(sin(uTime * 0.3 + seed.w * 6.28), sin(uTime * 0.21 + seed.z * 6.28) - 0.03 * uTime, cos(uTime * 0.25 + seed.w * 3.14)) * 0.25;
          vec3 p = seed.xyz * uBox + uCurrent * uTime * (0.8 + 0.4 * seed.w) + sway;
          p = mod(p - uCamera + uBox * 0.5, uBox) - uBox * 0.5 + uCamera;
          vec4 mv = viewMatrix * vec4(p, 1.0);
          vDistance = length(mv.xyz);
          vSeed = seed.w;
          // In the dive light's cone: lit, fading with the distance from the lamp (the beam shows through them)
          vec3 toParticle = p - uUwLampPos;
          float d = max(length(toParticle), 0.3);
          float cone = smoothstep(uUwLampCos, mix(uUwLampCos, 1.0, 0.4), dot(toParticle / d, uUwLampDir));
          vLit = uUwLampStrength > 0.0 ? cone * 2.0 / (d * d) : 0.0;
          // A quarter of the first size (Christian, 2026-10-23: smaller, twice)
          gl_PointSize = (0.003 + 0.005 * seed.w) * 900.0 * uPixelRatio / max(vDistance, 0.1);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uAbsorb;
        uniform float uTime;
        varying float vDistance;
        varying float vSeed;
        varying float vLit;
        void main() {
          float r = length(gl_PointCoord - 0.5);
          if (r > 0.5) discard;
          float sparkle = 0.75 + 0.25 * sin(uTime * 3.0 + vSeed * 40.0);
          float lit = min(vLit, 3.0);
          float alpha = smoothstep(0.5, 0.0, r) * (0.3 + 0.4 * vSeed) * sparkle * exp(-uAbsorb.g * vDistance) * (1.0 + lit);
          gl_FragColor = vec4(mix(vec3(0.85, 0.95, 0.9), vec3(1.0, 0.94, 0.85), min(lit, 1.0)) * (1.0 + 0.5 * lit), min(alpha, 1.0));
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
      '#include <project_vertex>\nvUwWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvUwDepth = length(mvPosition.xyz);',
    )
    shader.fragmentShader =
      'uniform vec3 uUwSpectral;\nuniform float uUwLampPower;\nuniform vec3 uUwLampColor;\nuniform vec3 uUwTop;\nuniform vec3 uUwDeep;\nuniform float uUwOn;\nuniform float uUwClear;\nuniform float uUwGone;\nuniform vec3 uUwAbsorb;\nuniform vec3 uUwWater;\nuniform float uUwTime;\nuniform vec3 uUwSun;\n' +
      'uniform float uUwSurface;\nvarying vec3 vUwWorld;\nvarying float vUwDepth;\n' + CAUSTIC_GLSL + BEAM_GLSL + '\n' +
      shader.fragmentShader.replace('#include <tonemapping_fragment>', /* glsl */ `
        if (uUwOn > 0.5) {
          // Face orientation from screen-space derivatives; double-sided
          vec3 uwNormal = normalize(cross(dFdx(vUwWorld), dFdy(vUwWorld)));
          float uwFacing = abs(dot(uwNormal, uUwSun));
          float uwDepth = max(0.0, uUwSurface - vUwWorld.y);
          // Projected along the sun's ray to the surface: the pattern belongs to the waves above
          vec2 uwCaustUv = (vUwWorld.xz + uwDepth * uUwSun.xz / max(uUwSun.y, 0.2)) * 0.8;
          float uwCaustic = uwCaustic(uwCaustUv, uUwTime * 0.8) * smoothstep(0.2, 0.9, uwFacing) * exp(-0.07 * uwDepth);
          // Daylight (sun and sky) has crossed the water from the surface down to here: red absorbed first. Relative
          // to green (the eye adapts to the overall level), and half the shift (it partly adapts to the colour too:
          // the full shift left the floor neon green)
          vec3 uwDown = exp(-(uUwSpectral - uUwSpectral.g) * uwDepth * ${DAYLIGHT_SHIFT.toFixed(2)});
          vec3 uwColor = gl_FragColor.rgb * uwDown * (1.0 + 1.5 * uwCaustic);
          // The dive light: from the lamp to here only, so close up its red is still there (Lambert, warm white)
          vec3 uwToLamp = uUwLampPos - vUwWorld;
          float uwLampDist = max(length(uwToLamp), 0.05);
          vec3 uwLampDir = normalize((viewMatrix * vec4(uwToLamp, 0.0)).xyz);
          float uwCone = smoothstep(uUwLampCos, mix(uUwLampCos, 1.0, 0.4), dot(-uwToLamp / uwLampDist, uUwLampDir));
          uwColor += diffuseColor.rgb * uUwLampColor * uUwLampPower * uwCone * max(dot(normal, uwLampDir), 0.0)
            / (3.14159 * max(uwLampDist * uwLampDist, 0.2)) * exp(-uUwSpectral * uwLampDist);
          // Back to the eye: the colours absorbed by distance, then the haze (the same for all colours): clear up close,
          // gone at the visibility distance (a smooth step: an exponential dimmed even the nearby surfaces), into the
          // water column's own colour in that direction (as the background; one flat colour left a silhouette)
          uwColor *= exp(-uUwSpectral * vUwDepth);
          float uwTransmit = 1.0 - smoothstep(uUwClear, uUwGone, vUwDepth);
          vec3 uwDir = normalize(vUwWorld - cameraPosition);
          vec3 uwBack = uwDir.y > 0.0 ? mix(uUwWater, uUwTop, pow(uwDir.y, 0.8)) : mix(uUwWater, uUwDeep, pow(-uwDir.y, 0.6));
          gl_FragColor.rgb = uwColor * uwTransmit + uwBack * (1.0 - uwTransmit);
          gl_FragColor.rgb += vec3(1.0, 0.94, 0.87) * uwBeam(cameraPosition, vUwWorld, uUwAbsorb.g);
        }
        #include <tonemapping_fragment>`)
  }

  // The dive light is computed in the surfaces' shader (patchShader), not a three.js light: its light must lose its
  // red with the distance it travels, which a light's single colour can't do. Here only its place and aim
  const lamp = { position: new THREE.Vector3(), target: new THREE.Vector3(), visible: false, distance: 10 }
  let lampWanted = true
  const lampOffset = new THREE.Vector3()
  const lampAhead = new THREE.Vector3()

  function applySeason() {
    // Attenuation along the line of sight, per channel: scattering (the same for all colours) plus absorption.
    // Contrast at the visibility distance about 8 % for green (total 2.5 / V): softer than the textbook 2 % (3.9 / V),
    // which hid what a diver sees clearly a metre away (the eye adapts)
    const total = 2.5 / (season.visibilityFt * 0.3048)
    const scatter = Math.max(total - season.absorb[1], 0)
    uniforms.uUwAbsorb.value.set(...season.absorb.map((a) => scatter + a))
    uniforms.uUwWater.value.set(...season.water.map((c) => c * WATER_BRIGHTNESS))
    columnMaterial.uniforms.uSurface.value.set(...season.surface)
    columnMaterial.uniforms.uDeep.value.set(...season.deep)
    lamp.distance = LAMP_REACH * season.visibilityFt * 0.3048
    uniforms.uUwLampReach.value = lamp.distance
    // The surfaces: clear up to CLEAR_SHARE of the visibility, gone at the visibility; the water's absorption
    uniforms.uUwGone.value = season.visibilityFt * 0.3048
    uniforms.uUwClear.value = CLEAR_SHARE * uniforms.uUwGone.value
    uniforms.uUwSpectral.value.set(...season.absorb)
  }

  return {
    patchShader,
    /** For tests (main.js exposes it in development builds) */
    uniforms,
    get on() {
      return on
    },
    /** @param {boolean} value */
    setOn(value) {
      on = value
      uniforms.uUwOn.value = on ? 1 : 0
      column.visible = surface.visible = particles.visible = on
      lamp.visible = on && lampWanted
      uniforms.uUwLampStrength.value = lamp.visible ? BEAM_STRENGTH : 0
      uniforms.uUwLampPower.value = lamp.visible ? LAMP_INTENSITY : 0
      if (on) clock.start()
      else clock.stop()
    },
    /** @param {boolean} wanted - the dive light (while underwater) */
    setLamp(wanted) {
      lampWanted = wanted
      lamp.visible = on && lampWanted
      uniforms.uUwLampStrength.value = lamp.visible ? BEAM_STRENGTH : 0
      uniforms.uUwLampPower.value = lamp.visible ? LAMP_INTENSITY : 0
    },
    /** @param {number} index - in SEASONS */
    setSeason(index) {
      season = SEASONS[Math.min(Math.max(Math.round(index), 0), SEASONS.length - 1)]
      applySeason()
    },
    /** @param {THREE.Vector3} direction - toward the sun in the air: refracted for the caustics and the glare */
    setSun(direction) {
      uniforms.uUwSun.value.copy(refractedSun(direction))
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
      lamp.target.copy(camera.position).add(lampAhead.set(0, 0, -LAMP_AIM).applyQuaternion(camera.quaternion))
      uniforms.uUwLampPos.value.copy(lamp.position)
      uniforms.uUwLampDir.value.subVectors(lamp.target, lamp.position).normalize()
    },
  }
}
