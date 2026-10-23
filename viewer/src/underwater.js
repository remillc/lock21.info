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
//  - a dive light held at the bottom right of the view, aimed at its middle (« Lampe de plongée » setting): warm white,
//    a hotspot (8°) in a spill 3 times wider and weaker (24°), soft edges, fading with distance, out of reach beyond about 1.5 times the visibility; its beam seen in
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
// River current, west to east: 35 ft/min, measured by drifting in the canal (2024-06-08), in m/s; the particles drift
// SEASONS[].current times faster (Christian, 2026-10-23: the murkier the water, the faster: spring's runoff)
const CURRENT = (35 * 0.3048) / 60
// The particles' drift against that: 15 % slower (Christian, 2026-10-23)
const DRIFT_SHARE = 0.85
// Suspended particles, only where they can be seen: in a box ahead of the camera (it covers the view's cone), as deep
// as the visibility (PARTICLE_REACH m at most, PARTICLE_MIN at least); SEASONS[].density particles per m³ (the
// murkier, dramatically more; doubled 2026-10-23), so the drawn count follows the box (at most PARTICLE_COUNT; MOBILE_SHARE of them on a
// phone). A cube of 14 m around the camera drew mostly particles behind it, out of the view or beyond the visibility
const PARTICLE_COUNT = 120000
const PARTICLE_REACH = 10
const PARTICLE_MIN = 3
const MOBILE_SHARE = 0.4
// The particles' distance field: its cells per side, its size (m, centred near the camera: a little more than the
// particles' box), the distances it holds (m) and the skin a particle is kept out of (m)
export const FIELD_CELLS = 32
export const FIELD_SIZE = 16
export const FIELD_RANGE = 2
const FIELD_PUSH = 0.15
// The scattered light's strength against the lit surfaces (brighter washed every surface to the water's colour)
const WATER_BRIGHTNESS = 0.6
// The surfaces are seen as they are up to this share of the visibility (Christian, 2026-10-23: textures seen up close,
// nothing far away); the usual lighting (sky and sun) stays, the water only hides the distance
const CLEAR_SHARE = 0.15
// The dive light: held at the bottom right of the view (35 cm right of and 30 cm below the eye, until the diver's arm
// gives the drawn light's front and axis, which follow its sway: setLampPose, diver-arm.js), aimed at the point LAMP_AIM ahead in the middle of the view, so its ray crosses the view toward the centre (Christian, 2026-10-23);
// candela (as a three.js spot light: about 6 times the sun at the floor 3 m away; 15 % less on 2026-10-23, was 200),
// beam half-angle, reach in visibilities
const LAMP_OFFSET = [0.35, -0.3, 0]
const LAMP_AIM = 6
const LAMP_INTENSITY = 170
// The share of the daylight's colour shift at depth that is shown (the rest: the eye's adaptation)
const DAYLIGHT_SHIFT = 0.5
// The daylight's strength underwater, against above water: dimmer at depth, so that the dive light dominates in its
// spot and brings the reds back (at full strength the green daylight swamped it)
// 0.35: more absorbed at depth than the first 0.5 (Christian, 2026-10-23; 0.25 was too dark)
const DAYLIGHT_LEVEL = 0.35
// The beam's two parts, as a real dive light: a narrow, strong hotspot (16° across) and a spill around it, 32° across
// in all (was 48°) and 3 times weaker (Christian, 2026-10-23); half-angles, and the spill's strength against the
// hotspot's
const LAMP_HOT_ANGLE = 8
const LAMP_WIDE_ANGLE = 16
const LAMP_SPILL = 1 / 3
// The share of the water's scattering that dims the lamp's beam (forward scattering keeps the rest in it), and the
// saturation of the colours it lights
const LAMP_SCATTER = 0.33
const LAMP_SATURATION = 1.5
const LAMP_REACH = 1.5
// The beam's brightness in the water (in-scattered light, added along the line of sight)
const BEAM_STRENGTH = 0.2125
const BEAM_SAMPLES = 12
// The beam's glow in the water starts this far from the lamp (m): none at the first, full at the second
const BEAM_NEAR = [0.5, 2.5]
// Looking straight up, the visibility's share left (the water toward the light from above hides what stands there)
const UP_HAZE = 0.4

// Per season: visibility (ft); the water's own absorption per metre and per channel (red, green, blue: red first; in
// spring's runoff, blue too); the colour of the light the water scatters toward the eye (linear), and the water
// column's colours above and below (linear). The visibility is mostly scattering by particles, which keeps the
// colours (haze toward the water's colour); only the absorption takes them away. Treating all the haze as absorption
// left no colour a metre away, even in the dive light's beam
export const SEASONS = [
  { key: 'winter', density: 6, current: 2, visibilityFt: 100, absorb: [0.3, 0.05, 0.06], water: [0.05, 0.16, 0.17], surface: [0.35, 0.6, 0.62], deep: [0.01, 0.04, 0.05] },
  { key: 'spring', density: 300, current: 8, visibilityFt: 14, absorb: [0.35, 0.12, 0.3], water: [0.12, 0.13, 0.07], surface: [0.42, 0.45, 0.3], deep: [0.03, 0.03, 0.015] },
  { key: 'summer', density: 60, current: 6, visibilityFt: 20, absorb: [0.35, 0.07, 0.15], water: [0.07, 0.17, 0.12], surface: [0.4, 0.62, 0.5], deep: [0.015, 0.05, 0.035] },
  { key: 'autumn', density: 30, current: 4, visibilityFt: 30, absorb: [0.33, 0.06, 0.12], water: [0.06, 0.16, 0.14], surface: [0.36, 0.58, 0.52], deep: [0.012, 0.045, 0.04] },
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
  uniform float uUwLampHot;
  uniform float uUwLampWide;
  uniform float uUwLampStrength;
  // The lamp's light in a direction (c: cosine from its axis): the hotspot, plus the spill
  float uwLampCone(float c) {
    return smoothstep(uUwLampHot, mix(uUwLampHot, 1.0, 0.5), c) + ${LAMP_SPILL.toFixed(2)} * smoothstep(uUwLampWide, mix(uUwLampWide, 1.0, 0.3), c);
  }
  uniform float uUwLampReach;
  // absorb: the water's attenuation per metre and per colour (scattering and absorption): the light dims and loses its
  // red from the lamp to each point of the beam, then from there to the eye
  vec3 uwBeam(vec3 a, vec3 b, vec3 absorb) {
    if (uUwLampStrength <= 0.0) return vec3(0.0);
    vec3 ray = b - a;
    float span = min(length(ray), uUwLampReach);
    vec3 dir = normalize(ray);
    vec3 sum = vec3(0.0);
    for (int i = 0; i < ${BEAM_SAMPLES}; i++) {
      float t = (float(i) + 0.5) / ${BEAM_SAMPLES}.0 * span;
      vec3 toSample = a + dir * t - uUwLampPos;
      float d = max(length(toSample), 0.05);
      float cone = uwLampCone(dot(toSample / d, uUwLampDir));
      // Not closer than 1 m: with the lamp at the eye, the water right in front of it glared over the whole view; and
      // faded in over the first metres from the lamp (BEAM_NEAR): seen almost along the beam, that water drew a bright
      // disc around the lamp's head (Christian, 2026-10-23)
      sum += cone * exp(-absorb * (d + t)) / max(d * d, 1.0) * smoothstep(${BEAM_NEAR[0].toFixed(2)}, ${BEAM_NEAR[1].toFixed(2)}, d);
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
 * @param {{ mobile?: boolean }} [options] - phones: fewer particles
 */
export function createUnderwater(scene, renderer, { mobile = false } = {}) {
  const uniforms = {
    uUwOn: { value: 0 },
    uUwAbsorb: { value: new THREE.Vector3() },
    uUwClear: { value: 1 },
    uUwSpectral: { value: new THREE.Vector3() },
    uUwLampPower: { value: 0 },
    // Warm, like a halogen dive light: more red to bring back (Christian, 2026-10-23)
    uUwLampColor: { value: new THREE.Color(0xffcc9c) },
    uUwTop: { value: new THREE.Vector3() },
    uUwDeep: { value: new THREE.Vector3() },
    uUwGone: { value: 6 },
    uUwWater: { value: new THREE.Vector3() },
    uUwTime: { value: 0 },
    uUwSun: { value: new THREE.Vector3(0, 1, 0) },
    uUwSurface: { value: SURFACE_Y },
    uUwLampPos: { value: new THREE.Vector3() },
    uUwLampDir: { value: new THREE.Vector3(0, 0, -1) },
    uUwLampHot: { value: Math.cos(THREE.MathUtils.degToRad(LAMP_HOT_ANGLE)) },
    uUwLampWide: { value: Math.cos(THREE.MathUtils.degToRad(LAMP_WIDE_ANGLE)) },
    uUwLampStrength: { value: 0 },
    uUwLampReach: { value: 10 },
  }
  let on = false
  let season = SEASONS[2]
  // The animation's time, running only while underwater (THREE.Clock is deprecated)
  const timer = new THREE.Timer()

  // Water column: a sphere around the camera, lighter toward the surface, with the refracted sun
  const columnMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uUwLampPos: uniforms.uUwLampPos,
      uUwLampDir: uniforms.uUwLampDir,
      uUwLampHot: uniforms.uUwLampHot,
      uUwLampWide: uniforms.uUwLampWide,
      uUwLampStrength: uniforms.uUwLampStrength,
      uUwLampReach: uniforms.uUwLampReach,
      uAbsorb: uniforms.uUwAbsorb,
      uSurface: uniforms.uUwTop,
      uWater: uniforms.uUwWater,
      uDeep: uniforms.uUwDeep,
      uSun: uniforms.uUwSun,
      uGlare: { value: 1 },
      // The direct sunlight left after the water above the camera (1 clear to 0 murky): the sun's disc; what the water
      // scattered comes as a broad glow from above instead
      uSunThrough: { value: 1 },
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
      uniform float uSunThrough;
      uniform vec3 uAbsorb;
      varying vec3 vDir;
      ${BEAM_GLSL}
      void main() {
        float y = vDir.y;
        // One even water colour around the horizon; lighter only when looking well up (more than about 20°), darker
        // well down: a gradient right from the horizon made a light band over everything above eye level
        vec3 c = y > 0.0 ? mix(uWater, uSurface, smoothstep(0.35, 1.0, y)) : mix(uWater, uDeep, smoothstep(0.35, 1.0, -y));
        float s = max(dot(vDir, uSun), 0.0);
        // The sun: its disc and glare as far as its light comes through the water above (in murky water, a few
        // visibilities down, none: Christian, 2026-10-23, « c'est la pénombre »); the rest as a broad, dim glow
        c += vec3(1.0, 0.97, 0.85) * ((2.5 * pow(s, 400.0) + 0.45 * pow(s, 12.0)) * uSunThrough + 0.12 * pow(s, 3.0) * (1.0 - uSunThrough)) * uGlare;
        // The beam over open water
        c += vec3(1.0, 0.94, 0.87) * uwBeam(cameraPosition, cameraPosition + vDir * uUwLampReach, uAbsorb) * uGlare;
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        // Dithered by a fraction of a colour step: the smooth gradients showed bands (8 bits a channel)
        gl_FragColor.rgb += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
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
      uniforms: { uTime: uniforms.uUwTime, uAbsorb: uniforms.uUwAbsorb, uColor: columnMaterial.uniforms.uSurface, uSun: uniforms.uUwSun, uClear: uniforms.uUwClear, uGone: uniforms.uUwGone },
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
        uniform float uClear;
        uniform float uGone;
        varying vec3 vWorld;
        varying float vDistance;
        ${CAUSTIC_GLSL}
        void main() {
          vec2 p = vWorld.xz * 0.35;
          float w = sin(p.x * 1.7 + uTime * 0.6) * sin(p.y * 1.3 - uTime * 0.45) + 0.5 * sin((p.x + p.y) * 2.9 + uTime * 0.9);
          vec3 view = normalize(vWorld - cameraPosition);
          float glare = pow(max(dot(view, uSun), 0.0), 30.0);
          // The ripples and caustics fade out where they get finer than a pixel (far away, at a grazing angle): there
          // they only made noise. The caustic at 0.25 is its average brightness
          float detail = 1.0 - smoothstep(0.15, 0.6, length(fwidth(vWorld.xz * 0.8)));
          float ripple = mix(0.0, 0.25 * w, detail);
          float caustic = mix(0.25, uwCaustic(vWorld.xz * 0.8, uTime * 0.8), detail);
          vec3 c = uColor * (1.35 + ripple + 0.6 * caustic) + vec3(1.0, 0.97, 0.88) * 2.0 * glare;
          // Gone beyond the visibility, like the surfaces (from the floor in murky water, its ripples showed as bands)
          gl_FragColor = vec4(c, 1.0 - smoothstep(uClear, uGone, vDistance));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          // Dithered by a fraction of a colour step: the smooth gradients showed bands (8 bits a channel)
          gl_FragColor.rgb += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
        }`,
    }),
  )
  surface.rotation.x = -Math.PI / 2
  surface.position.y = SURFACE_Y
  surface.visible = false
  scene.add(surface)

  // The particles' distance field (filled by main.js, a little each frame): FIELD_CELLS³ cells over FIELD_SIZE m
  const field = {
    data: new Uint8Array(FIELD_CELLS ** 3).fill(255),
    min: new THREE.Vector3(),
    texture: null,
  }
  field.texture = new THREE.Data3DTexture(field.data, FIELD_CELLS, FIELD_CELLS, FIELD_CELLS)
  field.texture.format = THREE.RedFormat
  field.texture.minFilter = field.texture.magFilter = THREE.LinearFilter
  field.texture.unpackAlignment = 1

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
        uCentre: { value: new THREE.Vector3() },
        uTime: uniforms.uUwTime,
        uBox: { value: 10 },
        uPixelRatio: { value: renderer.getPixelRatio() },
        uAbsorb: uniforms.uUwAbsorb,
        uCurrent: { value: new THREE.Vector3(CURRENT, 0, 0) },
        uField: { value: field.texture },
        uFieldMin: { value: field.min },
        uFieldSize: { value: FIELD_SIZE },
        uFieldOn: { value: 0 },
        uUwLampPos: uniforms.uUwLampPos,
        uUwLampDir: uniforms.uUwLampDir,
        uUwLampHot: uniforms.uUwLampHot,
        uUwLampWide: uniforms.uUwLampWide,
        uUwLampStrength: uniforms.uUwLampStrength,
      },
      vertexShader: /* glsl */ `
        attribute vec4 seed;
        uniform vec3 uCentre;
        uniform float uTime;
        uniform float uBox;
        uniform float uPixelRatio;
        uniform vec3 uCurrent;
        uniform vec3 uAbsorb;
        // The distance field around the camera (main.js, buildParticleField): distance to the nearest surface, 0 to
        // FIELD_RANGE m in 0..1; a particle closer than FIELD_PUSH is pushed out along its gradient
        uniform highp sampler3D uField;
        uniform vec3 uFieldMin;
        uniform float uFieldSize;
        uniform float uFieldOn;
        uniform vec3 uUwLampPos;
        uniform vec3 uUwLampDir;
        uniform float uUwLampHot;
        uniform float uUwLampWide;
        uniform float uUwLampStrength;
        float uwLampCone(float c) {
          return smoothstep(uUwLampHot, mix(uUwLampHot, 1.0, 0.5), c) + ${LAMP_SPILL.toFixed(2)} * smoothstep(uUwLampWide, mix(uUwLampWide, 1.0, 0.3), c);
        }
        varying float vDistance;
        varying float vSeed;
        varying float vLit;
        void main() {
          // Carried by the current (speed varies a little per particle), with a slight turbulent sway
          vec3 sway = vec3(sin(uTime * 0.3 + seed.w * 6.28), sin(uTime * 0.21 + seed.z * 6.28) - 0.03 * uTime, cos(uTime * 0.25 + seed.w * 3.14)) * 0.25;
          vec3 p = seed.xyz * uBox + uCurrent * uTime * (0.8 + 0.4 * seed.w) + sway;
          p = mod(p - uCentre + uBox * 0.5, uBox) - uBox * 0.5 + uCentre;
          // Around the surfaces, not through them: pushed out of the distance field's skin, along its gradient (they
          // flow around the walls and over the floor)
          vec3 uvw = (p - uFieldMin) / uFieldSize;
          if (uFieldOn > 0.5 && all(greaterThan(uvw, vec3(0.0))) && all(lessThan(uvw, vec3(1.0)))) {
            float d = texture(uField, uvw).r * ${FIELD_RANGE.toFixed(2)};
            if (d < ${FIELD_PUSH.toFixed(2)}) {
              float e = 1.0 / ${FIELD_CELLS}.0;
              vec3 grad = vec3(
                texture(uField, uvw + vec3(e, 0.0, 0.0)).r - texture(uField, uvw - vec3(e, 0.0, 0.0)).r,
                texture(uField, uvw + vec3(0.0, e, 0.0)).r - texture(uField, uvw - vec3(0.0, e, 0.0)).r,
                texture(uField, uvw + vec3(0.0, 0.0, e)).r - texture(uField, uvw - vec3(0.0, 0.0, e)).r);
              if (dot(grad, grad) > 1e-8) p += normalize(grad) * (${FIELD_PUSH.toFixed(2)} - d);
            }
          }
          vec4 mv = viewMatrix * vec4(p, 1.0);
          vDistance = length(mv.xyz);
          vSeed = seed.w;
          // In the dive light's cone: lit, fading with the distance from the lamp (the beam shows through them)
          vec3 toParticle = p - uUwLampPos;
          float d = max(length(toParticle), 0.3);
          float cone = uwLampCone(dot(toParticle / d, uUwLampDir));
          vLit = uUwLampStrength > 0.0 ? cone * 2.0 / (d * d) * exp(-uAbsorb.g * d) : 0.0;
          // A quarter of the first size (Christian, 2026-10-23: smaller, twice)
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
          // As much as the direct sunlight reaches this depth (2.5 per visibility along the sun's slanted path): none a few
          // visibilities down in murky water, no sun patterns there (Christian, 2026-10-23)
          float uwSunHere = exp(-2.5 * uwDepth / uUwGone / max(uUwSun.y, 0.2));
          float uwCaustic = uwCaustic(uwCaustUv, uUwTime * 0.8) * smoothstep(0.2, 0.9, uwFacing) * uwSunHere;
          // Daylight (sun and sky) has crossed the water from the surface down to here: red absorbed first. Relative
          // to green (the eye adapts to the overall level), and half the shift (it partly adapts to the colour too:
          // the full shift left the floor neon green)
          vec3 uwDown = exp(-(uUwSpectral - uUwSpectral.g) * uwDepth * ${DAYLIGHT_SHIFT.toFixed(2)});
          // Back to the eye, the daylight's colours absorbed by distance
          vec3 uwColor = gl_FragColor.rgb * uwDown * ${DAYLIGHT_LEVEL.toFixed(2)} * (1.0 + 1.5 * uwCaustic) * exp(-uUwSpectral * vUwDepth);
          // The dive light: dimmed and its red absorbed from the lamp to here by the whole water attenuation (the lamp
          // is at the eye: the way back is about the same, counted once), so its reds come back up close and it fades
          // with distance (Lambert, warm white)
          vec3 uwToLamp = uUwLampPos - vUwWorld;
          float uwLampDist = max(length(uwToLamp), 0.05);
          vec3 uwLampDir = normalize((viewMatrix * vec4(uwToLamp, 0.0)).xyz);
          float uwCone = uwLampCone(dot(-uwToLamp / uwLampDist, uUwLampDir));
          // Water scatters mostly forward: along a beam most of the scattered light stays in it, so only a third of the
          // scattering counts on the lamp's path (all of the absorption, red first). Its colours a little more
          // saturated: under white light the eye reads colour better than under the green daylight
          vec3 uwLampAtten = uUwSpectral + ${LAMP_SCATTER.toFixed(2)} * (uUwAbsorb - uUwSpectral);
          vec3 uwLit = diffuseColor.rgb;
          uwLit = max(mix(vec3(dot(uwLit, vec3(0.2126, 0.7152, 0.0722))), uwLit, ${LAMP_SATURATION.toFixed(2)}), 0.0);
          uwColor += uwLit * uUwLampColor * uUwLampPower * uwCone * max(dot(normal, uwLampDir), 0.0)
            / (3.14159 * max(uwLampDist * uwLampDist, 0.2)) * exp(-uwLampAtten * uwLampDist);
          // Then the haze (the same for all colours): clear up close, gone at the visibility distance (a smooth step: an
          // exponential dimmed even the nearby surfaces), into the water column's own colour in that direction (as the
          // background; one flat colour left a silhouette)
          // Looking up, through the water toward the light from above, it closes in sooner: down to UP_HAZE of the
          // visibility straight up, so what stands above (the banks' walls) fades into the glow rather than showing as
          // a silhouette (Christian, 2026-10-23)
          vec3 uwDir = normalize(vUwWorld - cameraPosition);
          float uwUp = mix(1.0, ${UP_HAZE.toFixed(2)}, smoothstep(0.0, 0.8, uwDir.y));
          float uwTransmit = 1.0 - smoothstep(uUwClear * uwUp, uUwGone * uwUp, vUwDepth);
          vec3 uwBack = uwDir.y > 0.0 ? mix(uUwWater, uUwTop, smoothstep(0.35, 1.0, uwDir.y)) : mix(uUwWater, uUwDeep, smoothstep(0.35, 1.0, -uwDir.y));
          gl_FragColor.rgb = uwColor * uwTransmit + uwBack * (1.0 - uwTransmit);
          gl_FragColor.rgb += vec3(1.0, 0.94, 0.87) * uwBeam(cameraPosition, vUwWorld, uUwAbsorb);
        }
        #include <tonemapping_fragment>`)
  }

  // The dive light is computed in the surfaces' shader (patchShader), not a three.js light: its light must lose its
  // red with the distance it travels, which a light's single colour can't do. Here only its place and aim
  const lamp = { position: new THREE.Vector3(), target: new THREE.Vector3(), visible: false, distance: 10 }
  let lampWanted = true
  const lampAt = new THREE.Vector3(...LAMP_OFFSET)
  // Where it points in the camera's frame, once the diver's arm holds it (else at the point LAMP_AIM ahead)
  let lampAxis = null
  const lampOffset = new THREE.Vector3()
  const ahead = new THREE.Vector3()
  let particleReach = PARTICLE_MIN
  let sunThrough = 1
  const lampAhead = new THREE.Vector3()

  function applySeason() {
    // Attenuation along the line of sight, per channel: scattering (the same for all colours) plus absorption.
    // Contrast at the visibility distance about 8 % for green (total 2.5 / V): softer than the textbook 2 % (3.9 / V),
    // which hid what a diver sees clearly a metre away (the eye adapts)
    const total = 2.5 / (season.visibilityFt * 0.3048)
    const scatter = Math.max(total - season.absorb[1], 0)
    uniforms.uUwAbsorb.value.set(...season.absorb.map((a) => scatter + a))
    // The water's own light is daylight scattered toward the eye: dimmed like the daylight at depth
    uniforms.uUwWater.value.set(...season.water.map((c) => c * WATER_BRIGHTNESS * DAYLIGHT_LEVEL))
    columnMaterial.uniforms.uSurface.value.set(...season.surface.map((c) => c * DAYLIGHT_LEVEL))
    columnMaterial.uniforms.uDeep.value.set(...season.deep.map((c) => c * DAYLIGHT_LEVEL))
    lamp.distance = LAMP_REACH * season.visibilityFt * 0.3048
    uniforms.uUwLampReach.value = lamp.distance
    // The box: 1.6 times the reach wide, centred 0.6 reach ahead (from just behind the camera to 1.4 reach ahead)
    particleReach = THREE.MathUtils.clamp(season.visibilityFt * 0.3048, PARTICLE_MIN, PARTICLE_REACH)
    const box = 1.6 * particleReach
    particles.material.uniforms.uBox.value = box
    const count = Math.min(PARTICLE_COUNT, season.density * box ** 3) * (mobile ? MOBILE_SHARE : 1)
    particleGeometry.setDrawRange(0, Math.round(count))
    particles.material.uniforms.uCurrent.value.set(CURRENT * season.current * DRIFT_SHARE, 0, 0)
    // The surfaces: clear up to CLEAR_SHARE of the visibility, gone at the visibility; the water's absorption
    uniforms.uUwGone.value = season.visibilityFt * 0.3048
    uniforms.uUwClear.value = CLEAR_SHARE * uniforms.uUwGone.value
    uniforms.uUwSpectral.value.set(...season.absorb)
  }

  return {
    patchShader,
    /**
     * The particles' distance field: main.js fills its cells (distance / FIELD_RANGE, 0..255), then calls ready() with
     * the field's corner; the particles use it from then on
     */
    field: {
      data: field.data,
      /** @param {THREE.Vector3} min */
      ready(min) {
        field.min.copy(min)
        field.texture.needsUpdate = true
        particles.material.uniforms.uFieldOn.value = 1
      },
    },
    /** For tests (main.js exposes it in development builds) */
    uniforms,
    /** The river's current as the particles drift in it (m/s, world): faster in murky seasons */
    /** The direct sunlight left at the camera's depth (1 to 0): main.js lights the surfaces with it */
    get sunThrough() {
      return sunThrough
    },
    get current() {
      return particles.material.uniforms.uCurrent.value
    },
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
      if (on) timer.reset()
    },
    /** @param {boolean} wanted - the dive light (while underwater) */
    setLamp(wanted) {
      lampWanted = wanted
      lamp.visible = on && lampWanted
      uniforms.uUwLampStrength.value = lamp.visible ? BEAM_STRENGTH : 0
      uniforms.uUwLampPower.value = lamp.visible ? LAMP_INTENSITY : 0
    },
    /**
     * Where the light is and where it points, in the camera's frame: as the diver's arm holds it (diver-arm.js)
     * @param {THREE.Vector3} offset - m
     * @param {THREE.Vector3} axis - a unit vector
     */
    setLampPose(offset, axis) {
      lampAt.copy(offset)
      lampAxis = (lampAxis ?? new THREE.Vector3()).copy(axis)
    },
    get lampVisible() {
      return lamp.visible
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
      // The direct sunlight through the water above: its path from the surface down to the camera (slanted as the
      // refracted sun), dimmed as the line of sight is (2.5 per visibility, applySeason)
      const depth = Math.max(SURFACE_Y - camera.position.y, 0)
      const slant = Math.max(uniforms.uUwSun.value.y, 0.2)
      columnMaterial.uniforms.uSunThrough.value = Math.exp((-2.5 * depth) / (season.visibilityFt * 0.3048) / slant)
      sunThrough = columnMaterial.uniforms.uSunThrough.value
      timer.update()
      uniforms.uUwTime.value = timer.getElapsed()
      column.position.copy(camera.position)
      surface.position.x = camera.position.x
      surface.position.z = camera.position.z
      particles.material.uniforms.uCentre.value.copy(camera.getWorldDirection(ahead)).multiplyScalar(0.6 * particleReach).add(camera.position)
      // The dive light follows the camera: its offset in the camera's frame, aimed 10 m ahead
      lamp.position.copy(camera.position).add(lampOffset.copy(lampAt).applyQuaternion(camera.quaternion))
      lamp.target.copy(camera.position).add(lampAhead.set(0, 0, -LAMP_AIM).applyQuaternion(camera.quaternion))
      uniforms.uUwLampPos.value.copy(lamp.position)
      if (lampAxis) {
        uniforms.uUwLampDir.value.copy(lampAxis).applyQuaternion(camera.quaternion)
        lamp.target.copy(lamp.position).addScaledVector(uniforms.uUwLampDir.value, LAMP_AIM)
      } else uniforms.uUwLampDir.value.subVectors(lamp.target, lamp.position).normalize()
    },
  }
}
