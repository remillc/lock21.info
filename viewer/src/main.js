import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js'
import { CSM } from 'three/examples/jsm/csm/CSM.js'
import { TilesRenderer } from '3d-tiles-renderer'
import { rememberedKeys, savedSettings, settingsSchema } from './config-panel.js'
import './loading.js'
import './tooltip.js'
import { createUnderwater, FIELD_CELLS, FIELD_RANGE, FIELD_SIZE, SURFACE_Y } from './underwater.js'
import { createSwim } from './swim.js'
import { createCollider } from './collide.js'
import { createCrawfish } from './crawfish.js'
import { createDiverArm } from './diver-arm.js'
import { errorText, log, session, setEndFacts, startTelemetry } from './telemetry.js'
import { preloadArModel, startWebXrAr, webxrArSupported } from './android-ar.js'
import { N8AOPass } from 'n8ao'
import { homePath, t } from './i18n.js'

// Every query parameter is read once here, then changed live by the settings panel (config-panel.js): no setting
// reloads the page. `live` holds one handler per parameter. The address keeps only the camera (?cam=, see viewUrl):
// the other parameters still work in a link (tests), and are removed from the address once read.
const params = new URLSearchParams(location.search)
// Settings saved by the browser (config-panel.js) where the link doesn't set them. Only the panel's current settings:
// one saved earlier and since taken out of the panel (the tiles' source, the relief) would apply with no control to
// change it back; those work only in a link (?tiles=, ?relief=, for tests). Nor those not remembered (underwater: a
// value saved before is ignored)
const panelKeys = rememberedKeys(settingsSchema({ mobile: false }))
for (const [key, value] of savedSettings()) if (!params.has(key) && panelKeys.has(key)) params.set(key, value)
const live = {}
// The address keeps only what makes the view shareable (viewUrl): the camera, and underwater with its season and lamp
const SHARED_KEYS = ['cam', 'underwater', 'season', 'lamp']
const shared = new URLSearchParams([...params].filter(([key]) => SHARED_KEYS.includes(key) && (key === 'cam' || params.get('underwater') === '1')))
history.replaceState(null, '', location.pathname + (shared.size ? `?${shared}` : '').replaceAll('%2C', ','))

// Root of the published tiles (manifest.json + tilesets). Override with ?tiles=<url> (e.g. phone tests on the LAN)
const DEFAULT_TILES_URL = import.meta.env.VITE_TILES_URL || 'http://localhost:8081'
let tilesUrl = params.get('tiles') || DEFAULT_TILES_URL

// Embedded in the site's /modele/ page (an iframe): no "back" link, and the camera is reported to the page
const embedded = window.self !== window.top
document.documentElement.classList.toggle('embedded', embedded)

// index.html's texts are in French (its fallback): set in the viewer's language (i18n.js, French or English)
document.title = t('pageTitle')
document.querySelector('meta[name="description"]')?.setAttribute('content', t('pageDescription'))
const homeLink = document.querySelector('.home')
homeLink.textContent = t('home')
homeLink.href = homePath
// Accessible name, and the tooltip's text (tooltip.js: the MD3 tooltip replaces the browser's title tooltip)
for (const [selector, label, tooltip] of [
  ['.settings-button', 'settings', 'settings'],
  ['.ar-button', 'ar', 'ar'],
  ['.underwater-button', 'underwater', 'underwater'],
  ['.fullscreen', 'fullscreen', 'fullscreenTitle'],
]) {
  const element = document.querySelector(selector)
  element.setAttribute('aria-label', t(label))
  element.dataset.tooltip = t(tooltip)
}

// Full screen: works standalone and embedded (the iframe allows it)
const fullscreenButton = document.querySelector('.fullscreen')
if (document.fullscreenEnabled) {
  fullscreenButton.hidden = false
  fullscreenButton.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen()
  })
  document.addEventListener('fullscreenchange', () => {
    fullscreenButton.setAttribute('aria-label', t(document.fullscreenElement ? 'fullscreenExit' : 'fullscreen'))
    fullscreenButton.dataset.tooltip = t(document.fullscreenElement ? 'fullscreenExit' : 'fullscreenTitle')
    fullscreenButton.dataset.full = String(Boolean(document.fullscreenElement))
  })
}

// Augmented reality: the whole lock on a table, at 1:100 (70 cm), from the viewer's button, with the same model
// (tools/google-earth/make_model.py -x 0.01, on R2 under downloads/ar/):
// - iPhone and iPad: AR Quick Look opens a USDZ from a link with rel="ar" (Safari only);
// - Android: a panel with Google's <model-viewer> (android-ar.js, loaded on the tap), whose button starts WebXR in
//   Chrome, Scene Viewer otherwise. A direct Scene Viewer link no longer opened on a Pixel 10 Pro (2026-10-22).
// The button stays hidden elsewhere (computers, other browsers). To check on a real phone: AR can't be tested on a
// computer. The AR files are always the online ones, in development too: Scene Viewer doesn't load a model from the
// local network (tested on a Pixel, 2026-10-21: the phone never asked for the file)
const AR_URL = import.meta.env.VITE_AR_URL || 'https://tiles.lock21.info/downloads/ar'
// Version of the AR files, in their address: the server and the phones keep them an hour, so a rebuild (same names)
// would otherwise show up late. Change it after each upload of rebuilt AR files (docs/augmented-reality.md)
const AR_VERSION = '2026-10-23'
// ?ar=full: the lock at its real size (70 m) instead of on a table (the /modele/ page's "Taille réelle" QR code and link)
const arFull = params.get('ar') === 'full'
const arName = arFull ? 'lock-21-ar-full' : 'lock-21-ar'
const arLink = document.querySelector('.ar-button')
// Run once the 3D view has finished its first load (updateLoading): the AR model's background download waits for it
const afterFirstLoad = []
if (arFull) arLink.dataset.tooltip = t('arFull')
if (arLink.relList?.supports?.('ar')) {
  arLink.href = `${AR_URL}/${arName}.usdz?v=${AR_VERSION}`
  arLink.hidden = false
} else if (/Android/i.test(navigator.userAgent)) {
  // Scene Viewer: the link as Google's <model-viewer> builds it (scene-viewer/1.2, occlusion off, ARCore). The
  // button's link until WebXR is known to work, and the fallback if the WebXR session can't open
  const page = embedded ? window.top : window
  const sceneParams = new URLSearchParams({ mode: 'ar_preferred', disable_occlusion: 'true', title: t('name') })
  if (arFull) sceneParams.set('resizable', 'false')
  const sceneViewer = `intent://arvr.google.com/scene-viewer/1.2?${sceneParams}&file=${encodeURIComponent(`${AR_URL}/${arName}.glb?v=${AR_VERSION}`)}` +
    '#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;' +
    `S.browser_fallback_url=${encodeURIComponent(page.location.href.split('#')[0])};end;`
  arLink.removeAttribute('rel')
  arLink.href = sceneViewer
  arLink.target = '_top'
  arLink.hidden = false
  // WebXR in Chrome (android-ar.js): one tap opens the camera, the 1:100 model loads meanwhile; its size slider goes
  // up to 1:1 (?ar=full starts there)
  let webxr = false
  const arSrc = `${AR_URL}/lock-21-ar.glb?v=${AR_VERSION}`
  // With WebXR, the AR model downloads in the background once the 3D view has finished loading (about 30 MB, kept in
  // memory by android-ar.js): a tap on AR then only waits for its preparation
  let viewLoaded = false
  const preloadWhenReady = () => {
    if (webxr && viewLoaded) preloadArModel(arSrc)
  }
  afterFirstLoad.push(() => {
    viewLoaded = true
    preloadWhenReady()
  })
  webxrArSupported().then((supported) => {
    webxr = supported
    arLink.dataset.mode = supported ? 'webxr' : 'sceneviewer'
    preloadWhenReady()
  })
  arLink.addEventListener('click', (event) => {
    if (!webxr) return
    event.preventDefault()
    startWebXrAr({
      src: arSrc,
      title: t('name'),
      scale: arFull ? 100 : 1,
      log,
      // During AR the 3D view stops and gives back its tiles (up to 450 MB on a phone): with the AR model on top, the
      // graphics memory ran short and the AR image froze at times. They load again, camera kept, when AR ends
      onStart: () => {
        renderer.setAnimationLoop(null)
        unloadModel()
        renderer.renderLists.dispose()
      },
      onEnd: () => {
        loadModel().catch(showError)
        needsRender = true
        renderer.setAnimationLoop(renderLoop)
      },
      onFail: () => {
        page.location.href = sceneViewer
      },
    })
  })
}
// Analytics: the page that embeds the viewer counts the AR launches (src/components/Analytics.astro, after consent)
arLink.addEventListener('click', () => {
  log('ar', { size: arFull ? 'full' : 'table', kind: arLink.relList?.supports?.('ar') ? 'quicklook' : arLink.dataset.mode })
  if (window.self !== window.top) window.parent.postMessage({ type: 'lock21:ar', size: arFull ? 'full' : 'table' }, location.origin)
})

const container = document.getElementById('viewer')
const status = document.getElementById('status')

// Phones: coarser detail and a smaller memory budget (Safari iOS reloads the page beyond ~1-1.5 GB).
// ?profile=mobile|desktop forces a profile (tests on the PC).
const PROFILES = {
  mobile: { errorTarget: 12, maxBytes: 450e6, pixelRatio: Math.min(window.devicePixelRatio, 1.5) },
  desktop: { errorTarget: 6, maxBytes: 1200e6, pixelRatio: Math.min(window.devicePixelRatio, 2) },
}
const isMobile = (forced) => (forced ? forced === 'mobile' : window.matchMedia('(pointer: coarse)').matches)
let mobile = isMobile(params.get('profile'))
let profile = PROFILES[mobile ? 'mobile' : 'desktop']

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(profile.pixelRatio)
renderer.setSize(container.clientWidth, container.clientHeight)
container.appendChild(renderer.domElement)
// Telemetry for every visit (telemetry.js): device, errors, load time, end of the visit
startTelemetry({ renderer, mobile, embedded })

// The view a visit starts from without ?cam= (same form: x,y,z of the camera, then of the point it looks at; scene
// metres, y up), chosen by Christian on 2026-10-22. To change it, place the camera where wanted and copy the numbers
// from the address bar (?cam=).
const START_VIEW = [-25.07, 2.07, -17.17, -31.54, -0.78, -22.53]
// It was framed on a computer, about START_ASPECT wide for 1 high. A narrower frame (a phone: the /modele page's frame
// is nearly square, the full screen tall) sees less of it across (the field of view is vertical): the camera steps
// back along the same line of sight until it sees as much across, at most START_BACK times as far (farther, walls
// came between). TODO #49
const START_ASPECT = 1.6
const START_BACK = 2.2
/** The start view for a frame `aspect` wide for 1 high */
function startView(aspect) {
  const back = THREE.MathUtils.clamp(START_ASPECT / aspect, 1, START_BACK)
  const [x, y, z, tx, ty, tz] = START_VIEW
  return [tx + (x - tx) * back, ty + (y - ty) * back, tz + (z - tz) * back, tx, ty, tz]
}

const scene = new THREE.Scene()
// Plain background when the sky is off: the site's darkest surface (Moss palette, src/styles/tokens.scss)
const backdrop = new THREE.Color(0x12140e)
scene.background = backdrop
// « Ambiance sous-marine » (underwater.js): its water column, surface and particles, and the absorption every lit
// material carries (litMaterial); off until the 🤿 button or the setting turns it on (setUnderwater)
const underwater = createUnderwater(scene, renderer, { mobile })
const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.05, 2000)
const controls = new OrbitControls(camera, renderer.domElement)
// Development builds only: the viewer's parts for tests in the browser console (window.l21)
if (import.meta.env.DEV) window.l21 = { THREE, renderer, scene, camera, controls, underwater, get tilesets() { return tilesets } }
controls.enableDamping = true
// The camera never goes below the height of the point it turns around: it can't look from under the floor
controls.maxPolarAngle = Math.PI / 2 - 0.02

// Draw only when something changed (camera, tiles, size): a scene redrawn 60 times per second for nothing
// kept the phone's GPU at 100 % and made it very hot.
let needsRender = true
const requestRender = () => { needsRender = true }
controls.addEventListener('change', requestRender)

const ktx2Loader = new KTX2Loader().setTranscoderPath(`${import.meta.env.BASE_URL}vendor/basis/`).detectSupport(renderer)

// Sharper textures on surfaces seen at a grazing angle (floors, walls along the line of sight)
const maxAnisotropy = renderer.capabilities.getMaxAnisotropy()

// Obj2Tiles sets the tiles' textures to NEAREST_MIPMAP_LINEAR (nearest texel within a mipmap level), which
// shimmers when the camera moves: trilinear filtering instead
function smoothFiltering(texture) {
  if (!texture) return
  texture.anisotropy = maxAnisotropy
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
}

// How the surfaces look. Each setting below rebuilds or updates the materials in place.
const look = {
  // Lighting (default; ?hdri=0 = the unlit display used before): the sky (diffuse, ?hdriIntensity=) and the sun
  // (direct, ?sunIntensity=, from ?light=azimuth,elevation), each with its slider. Realistic defaults, as on a clear
  // day (direct sun about 75-85 % of the light, the sky the rest): sun 1 (a surface facing it shows its texture's own
  // brightness), sky 0.35; the sun from the southwest (azimuth 320: 40 degrees west of south), 65 degrees up
  // (Christian's choice, 2026-10-23; the .blend's frame is aligned on north). The sky photo's own sun stays 48 degrees up (HDRI_SUN): only
  // its azimuth follows ours
  sky: params.get('hdri') !== '0',
  skyIntensity: params.has('hdriIntensity') ? Number(params.get('hdriIntensity')) : 0.35,
  sunIntensity: params.has('sunIntensity') ? Number(params.get('sunIntensity')) : 1,
  // The sky as background: on by default (?sky=0: the plain backdrop)
  skyBackground: (params.get('sky') ?? '1') === '1',
  // Colour balance between zones (?neutral=0..1), see colorBalance
  neutral: params.has('neutral') ? Number(params.get('neutral')) : 0.2,
  // Relief from the zones' normal maps (?relief=1 default, 0 = without) or the normal map shown as the colour
  // (?relief=debug); wet look (?wet=0..1). The sun's direction: azimuth (0 = from the south, 90 = from the east),
  // elevation, in degrees
  relief: ['0', 'debug'].includes(params.get('relief')) ? params.get('relief') : '1',
  // Mesh view (?mesh=1, settings « Maillage »): the zones and the context as their triangles
  mesh: params.get('mesh') === '1',
  light: (params.get('light') || '320,65').split(',').map(Number),
  // The sun's shadows (?shadows=0|1; default on computers, off on phones: one more render of the scene per frame)
  shadows: params.has('shadows') ? params.get('shadows') !== '0' : !mobile,
  // Tone mapping of the lit display (?tone=agx|aces|neutral|none) and its exposure (?exposure=). Default AgX at 1.2,
  // Christian's choice (2026-10-23): soft highlights that never clip to flat white. AgX greys the colours, so the
  // saturation below makes up for it (1.5: on zone 3, brightness 0.61 and saturation 0.32, the unlit textures 0.53
  // and 0.31). Khronos neutral was the default for a day (it keeps the hues, but harder highlights). The unlit display
  // (?hdri=0) keeps none: the textures as they are
  tone: ['neutral', 'aces', 'none'].includes(params.get('tone')) ? params.get('tone') : 'agx',
  exposure: params.has('exposure') ? Number(params.get('exposure')) : 1.2,
  wet: wetness(params.has('wet') ? params.get('wet') : 0.15),
  // « Ambiance sous-marine » (?underwater=1) and its season (?season=0..3: winter, spring, summer, autumn; default
  // summer, the diving season), see underwater.js
  underwater: params.get('underwater') === '1',
  season: params.has('season') ? Number(params.get('season')) : 2,
  // The dive light while underwater (?lamp=0 turns it off)
  lamp: params.get('lamp') !== '0',
  // Saturation of the lit surfaces (?saturation=0..2, 1 = the textures' own; default 1.2, Christian's choice: AgX greys the
  // colours, 1.5 matched the unlit textures' saturation on zone 3, see tone)
  saturation: saturationOf(params.has('saturation') ? params.get('saturation') : 1.2),
  // Contrast of the lit surfaces' colours (?contrast=0.5..2, 1 = the textures' own): their brightness stretched around a
  // mid-grey (0.18 in linear light), the hue kept; above 1, darks darker and lights lighter
  contrast: contrastOf(params.has('contrast') ? params.get('contrast') : 1),
}
function contrastOf(v) {
  return Math.min(Math.max(Number(v) || 1, 0.5), 2)
}

function saturationOf(v) {
  return Math.min(Math.max(Number(v) || 0, 0), 2)
}

function wetness(v) {
  return Math.min(Math.max(Number(v) || 0, 0), 1)
}

// Every mesh keeps in userData.surface what its material is built from: the original textures (the tiles'
// material is replaced, so they would be lost otherwise), its colour, and its zone (null for the context).
function initSurface(mesh, zoneId) {
  // The mesh view's edges (meshEdges) are added as the tile's meshes are visited: not a surface
  if (mesh.userData.isEdges) return
  const old = mesh.material
  smoothFiltering(old.map)
  if (old.normalMap) {
    smoothFiltering(old.normalMap)
    // Obj2Tiles tags every KTX2 texture sRGB, normal maps included: the GPU would then apply the sRGB curve to
    // the normals and bend them. Data, not colour (set before the first upload, which picks the GPU format).
    old.normalMap.colorSpace = THREE.NoColorSpace
  }
  mesh.userData.surface = { map: old.map, normalMap: old.normalMap, color: old.color.clone(), zoneId }
  // Every surface casts and receives the sun's shadows (when they are on: updateLights)
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.material = surfaceMaterial(mesh)
  meshEdges(mesh)
  old.dispose()
}

function surfaceMaterial(mesh) {
  const surface = mesh.userData.surface
  if (look.mesh) return meshMaterial(surface)
  const normalMap = look.relief !== '0' ? surface.normalMap : null
  if (normalMap && look.relief === 'debug') return new THREE.MeshBasicMaterial({ map: normalMap, side: THREE.DoubleSide })
  if (look.sky) return litMaterial(surface, mesh, normalMap, true)
  return unlitMaterial(surface)
}

// The mesh view: a solid, flat-shaded surface (each triangle a facet, light olive for the zones, grey for the
// context; pushed back a little in depth) with its edges drawn over it (meshEdges)
function meshMaterial(surface) {
  return new THREE.MeshLambertMaterial({
    color: surface.zoneId ? 0xc9d3a8 : 0x9a9e8f,
    flatShading: true,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  })
}
const edgeMaterial = new THREE.MeshBasicMaterial({ color: 0x2b2f24, wireframe: true, transparent: true, opacity: 0.6 })
/** The mesh view's edges: a child sharing the surface's geometry, drawn as lines; removed when the view is off */
function meshEdges(mesh) {
  const edges = mesh.userData.edges
  if (look.mesh && !edges) {
    mesh.userData.edges = new THREE.Mesh(mesh.geometry, edgeMaterial)
    mesh.userData.edges.userData.isEdges = true
    mesh.userData.edges.raycast = () => {}
    mesh.add(mesh.userData.edges)
  } else if (!look.mesh && edges) {
    mesh.remove(edges)
    delete mesh.userData.edges
  }
}

// Rebuilds every material after a change of display mode (sky, relief, wet, mesh)
function rebuildMaterials() {
  scene.traverse((child) => {
    if (!child.isMesh || !child.userData.surface) return
    const old = child.material
    child.material = surfaceMaterial(child)
    old.dispose()
    meshEdges(child)
  })
  requestRender()
}

// The surface's colour: white times the zone's colour balance for a texture, the material's own colour otherwise
function surfaceColor(surface) {
  if (!surface.map) return surface.color.clone()
  return (surface.zoneId && gains.get(surface.zoneId)?.clone()) || new THREE.Color(1, 1, 1)
}

// The photogrammetry texture already contains the lighting: display it unlit.
// Double-sided: photogrammetry surfaces are open and are seen from both sides.
// Zones (not the context) also get the green removal (despill).
function unlitMaterial(surface) {
  const material = new THREE.MeshBasicMaterial({ map: surface.map, color: surfaceColor(surface), side: THREE.DoubleSide })
  if (surface.zoneId) material.onBeforeCompile = addDespill
  return material
}

// Green removal ("spill suppression", as for green screens): each pixel's green is capped at the larger of its
// red and blue. Brown, beige and grey pixels (red >= green) are untouched; only pixels where green dominates
// (algae, the water's cast in patches) turn olive or grey-brown. Underwater, blue is often above red: the capped
// green then equals the blue and the pixel turns cyan (0.30, 0.50, 0.40 -> 0.30, 0.40, 0.40). The cyan left over
// (the part of green AND blue above red) is removed from both, times ?cyan=0..2 (default 1.5): at 1 such a pixel
// turns grey (0.30, 0.30, 0.30), at 1.5 a warm grey (0.30, 0.25, 0.25), at 0 it stays cyan; olive and brown pixels
// (red >= blue) are untouched, a truly blue pixel keeps its blue. A per-zone colour gain cannot do that: it
// shifts the whole zone, and the green patches stay green. ?despill=0..1 sets the strength (default 0.8).
// Always in the zones' shaders (uniforms: 0 changes nothing), so both change live.
const despill = { value: params.has('despill') ? Number(params.get('despill')) : 0.8 }
const cyanCut = { value: params.has('cyan') ? Number(params.get('cyan')) : 1.5 }
live.despill = (v) => { despill.value = Number(v); requestRender() }
live.cyan = (v) => { cyanCut.value = Number(v); requestRender() }
function addDespill(shader) {
  shader.uniforms.despill = despill
  shader.uniforms.cyanCut = cyanCut
  shader.fragmentShader = shader.fragmentShader
    .replace('void main() {', 'uniform float despill;\nuniform float cyanCut;\nvoid main() {')
    .replace(
      '#include <map_fragment>',
      '#include <map_fragment>\n' +
        'float despillG = min(diffuseColor.g, max(diffuseColor.r, diffuseColor.b));\n' +
        'float despillCyan = min(cyanCut * max(min(despillG, diffuseColor.b) - diffuseColor.r, 0.0), min(despillG, diffuseColor.b));\n' +
        'diffuseColor.rgb = mix(diffuseColor.rgb, vec3(diffuseColor.r, despillG - despillCyan, diffuseColor.b - despillCyan), despill);',
    )
}

// Sky lighting: a partly cloudy sky (HDRI "Kloofendal 48d Partly Cloudy, Pure Sky", Poly Haven, CC0,
// public/hdri/sky.hdr) lights the zones and the context through lit materials: each surface gets the sky's light
// by its orientation (tops brighter than sides). The tiles carry no normals: they are computed on demand
// (double-sided rendering turns them outward even where the photogrammetry winding is inconsistent).
// ?hdriIntensity= sets its strength (default 0.35, the sun bringing the rest: updateLights), ?sky=0 hides it as the
// background.
//
// Relief: zones whose tiles carry a normal map (tools/publish-model/bake_relief.py: object-space normals of the
// high-res export, zebra mussels included) are lit through it instead of their computed normals. Object space: no
// vertex normals or tangents needed. ?relief=0 compares without it. ?relief=debug shows the normal map itself as the
// colour (checks that it lines up with the photo texture). The sun (updateLights) lights them too, through the same
// normals: the relief shows from its direction.
//
// Wet look (?wet=0..1, default 0.15, chosen on zone 12; 0.1 for a day with the neutral tone mapping; 0 turns it off), zones only: glossy surface with a clear-coat
// film (sharp highlights that slide over the relief when the camera moves) reflecting the sky, colours slightly
// darker and more saturated. The photos already hold the lamps' real reflections: keep it subtle.
function litMaterial(surface, mesh, normalMap, sky) {
  const wet = surface.zoneId ? look.wet : 0
  if (!normalMap && !mesh.geometry.attributes.normal) mesh.geometry.computeVertexNormals()
  const options = { map: surface.map, color: surfaceColor(surface), side: THREE.DoubleSide }
  if (normalMap) {
    Object.assign(options, {
      normalMap,
      normalMapType: THREE.ObjectSpaceNormalMap,
      // Face normals from screen derivatives keep the unperturbed normal valid (three.js uses it for specular
      // antialiasing); the object-space normal map replaces it for lighting
      flatShading: true,
    })
  }
  const material = wet > 0
    ? new THREE.MeshPhysicalMaterial({
      ...options,
      metalness: 0,
      roughness: 0.9 - 0.5 * wet,
      clearcoat: wet,
      clearcoatRoughness: 0.08,
      // Under the sky, the environment is the whole lighting; under the sun test, only the reflections
      envMapIntensity: sky ? 1 : 0.6 * wet,
    })
    : sky
      ? new THREE.MeshStandardMaterial({ ...options, roughness: 1, metalness: 0 })
      : new THREE.MeshLambertMaterial(options)
  material.onBeforeCompile = (shader) => {
    if (surface.zoneId) addDespill(shader)
    if (look.saturation !== 1 || look.contrast !== 1) {
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722))), diffuseColor.rgb, ${look.saturation.toFixed(3)});
        float contrastLuma = max(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)), 1e-4);
        diffuseColor.rgb *= 0.18 * pow(contrastLuma / 0.18, ${look.contrast.toFixed(3)}) / contrastLuma; diffuseColor.rgb = min(diffuseColor.rgb, vec3(1.0));`)
    }
    if (wet > 0) {
      shader.fragmentShader = shader.fragmentShader
        // Wet colours: darker and more saturated
        .replace('#include <map_fragment>', `#include <map_fragment>
          float wetLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
          diffuseColor.rgb = mix(vec3(wetLuma), diffuseColor.rgb, ${(1 + 0.35 * wet).toFixed(3)}) * ${(1 - 0.2 * wet).toFixed(3)};`)
        // The clear coat follows the relief (by default it would use the flat face normal: faceted highlights)
        .replace('#include <clearcoat_normal_fragment_begin>', normalMap ? 'vec3 clearcoatNormal = normal;' : '#include <clearcoat_normal_fragment_begin>')
        // Specular antialiasing: seen from afar, one pixel covers many mussels and the sharp highlights sparkle.
        // Where the normal varies a lot from one pixel to the next, the gloss is blurred accordingly.
        .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
          float normalVariation = clamp(length(fwidth(normal)) * 4.0, 0.0, 1.0);
          material.roughness = max(material.roughness, normalVariation);
          material.clearcoatRoughness = max(material.clearcoatRoughness, normalVariation);`)
    }
    // Double-sided: three.js flips the normal of faces seen from behind. The triangle winding of the
    // photogrammetry meshes is not consistent from one texture chart to the next, so whole charts came out
    // inverted (dark patches with sharp edges). An object-space normal is already the true orientation: no flip by
    // winding. But a surface seen from behind (a wall from the other side) must face the viewer, like the computed
    // normals: flipped when it points away from the face actually seen (the flat-shading normal, from screen
    // derivatives, always faces the camera). Otherwise the sky lights it from behind (dark) and the gloss sparkles.
    if (normalMap) {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <normal_fragment_maps>',
        THREE.ShaderChunk.normal_fragment_maps.replace('normal = normal * faceDirection;', '') +
          '\nif (dot(normal, nonPerturbedNormal) < 0.0) normal = -normal;',
      )
    }
    underwater.patchShader(shader)
  }
  // The patches depend on these values (the wetness is written into the shader): one compiled program per
  // combination (three.js would otherwise reuse the first one, its cache key being the function's source)
  material.customProgramCacheKey = () => `lit-${sky}-${Boolean(normalMap)}-${Boolean(surface.zoneId)}-${wet.toFixed(3)}-${look.saturation.toFixed(3)}-${look.contrast.toFixed(3)}`
  return withShadowCascades(material)
}

// The sun: a directional light added to the sky's light (lit materials only). Lambert lighting divides by pi: at
// intensity pi x sunIntensity, a surface facing the sun at sunIntensity 1 shows its texture's own brightness.
// Its shadows: cascaded shadow maps (three.js CSM): three 2048 px maps that follow the camera, the first over the
// nearest metres, the last up to SHADOW_FAR; sharp close up (a few mm per texel at a metre or two) and still over
// the whole site from afar. One shadow map over the whole site gave about 4 cm per texel: blurred, blocky edges up
// close. Soft edges (PCF), wider in texels on the near maps: about the sun's own penumbra (0.5 degree: 1 cm per metre
// between the object and its shadow). Each cascade is a light of its own, used only in its distance range; without
// shadows (phones, ?shadows=0), only the first one stays on, as a plain sun (the others would add their light).
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap
const SHADOW_FAR = 300
const SHADOW_RADII = [3, 2, 1]
const csm = new CSM({
  camera,
  parent: scene,
  cascades: SHADOW_RADII.length,
  maxFar: SHADOW_FAR,
  mode: 'practical',
  shadowMapSize: 2048,
  lightMargin: 100,
  lightIntensity: Math.PI,
  shadowBias: -0.0002,
})
csm.fade = true
csm.lights.forEach((light, i) => {
  light.shadow.normalBias = 0.01
  light.shadow.radius = SHADOW_RADII[i]
})
// Lit materials take the cascades (CSM.setupMaterial) on top of their own shader patches: both hooks run. CSM keeps a
// list of its materials; a disposed one leaves it.
function withShadowCascades(material) {
  const own = material.onBeforeCompile
  csm.setupMaterial(material)
  const cascades = material.onBeforeCompile
  material.onBeforeCompile = (shader, renderer) => {
    cascades(shader, renderer)
    own.call(material, shader, renderer)
  }
  material.addEventListener('dispose', () => csm.shaders.delete(material))
  return material
}
// The sky photo has its own sun (53 % of its light, within 5 degrees of it), at azimuth 55.7 and elevation 48 in its
// unrotated frame (measured on public/hdri/sky.hdr: its brightest pixel, x 609 y 119 of 1024 x 512, through
// three.js's equirectangular mapping). The sky that lights the scene is turned so that its sun stands exactly where
// ours is: one sun, the shadows and the sky's light and glints from the same side. First a turn about the vertical for
// the azimuth, then a tilt about the horizontal axis square to the sun's azimuth for the height, up to SKY_TILT_MAX
// (beyond it, the photo's horizon would light the scene from too high or too low). The sky shown as the background
// only turns about the vertical: a tilted horizon would show.
const HDRI_SUN = { azimuth: 55.7, elevation: 48 }
const SKY_TILT_MAX = 25
const sunDirection = (azimuth, elevation) => {
  const [a, e] = [azimuth, elevation].map(THREE.MathUtils.degToRad)
  return new THREE.Vector3(Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a))
}
function updateLights() {
  const turn = THREE.MathUtils.degToRad(look.light[0] - HDRI_SUN.azimuth)
  scene.backgroundRotation.set(0, turn, 0)
  const skyElevation = THREE.MathUtils.clamp(look.light[1], HDRI_SUN.elevation - SKY_TILT_MAX, HDRI_SUN.elevation + SKY_TILT_MAX)
  const skyTilt = new THREE.Quaternion().setFromUnitVectors(
    sunDirection(look.light[0], HDRI_SUN.elevation), sunDirection(look.light[0], skyElevation))
  const skyTurn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), turn)
  scene.environmentRotation.setFromQuaternion(skyTilt.multiply(skyTurn))
  const direction = sunDirection(...look.light)
  // Underwater the lighting stays as above water (the textures seen as they are up close, underwater.js); the sun's
  // direction is only used for the caustics and its glare in the water
  underwater.setSun(direction)
  // CSM's light direction points from the sun to the scene
  csm.lightDirection.copy(direction).negate()
  const on = look.sky && look.sunIntensity > 0
  csm.lights.forEach((light, i) => {
    light.intensity = Math.PI * look.sunIntensity
    light.visible = on && (look.shadows || i === 0)
    light.castShadow = on && look.shadows
  })
  requestRender()
}
// Tone mapping and exposure (look.tone, look.exposure): only for the lit display; changing the method recompiles the
// materials
const TONES = { agx: THREE.AgXToneMapping, aces: THREE.ACESFilmicToneMapping, neutral: THREE.NeutralToneMapping, none: THREE.NoToneMapping }
function updateTone() {
  const mapping = look.sky ? TONES[look.tone] : THREE.NoToneMapping
  if (renderer.toneMapping !== mapping) {
    renderer.toneMapping = mapping
    scene.traverse((child) => {
      if (child.isMesh) child.material.needsUpdate = true
    })
  }
  renderer.toneMappingExposure = look.exposure
  requestRender()
}
updateTone()
updateLights()

// What the lit materials reflect, and the background: the sky (loaded even when its lighting is off at start; the
// unlit surfaces ignore it)
let skyTexture = null
let skyEnvironment = null
function updateEnvironment() {
  scene.environment = look.sky ? skyEnvironment : null
  scene.environmentIntensity = look.skyIntensity
  // Underwater, the water column (a sphere around the camera) is the background
  scene.background = underwater.on ? null : look.skyBackground && skyTexture ? skyTexture : backdrop
  requestRender()
}
updateEnvironment()

const underwaterButton = document.querySelector('.underwater-button')
underwaterButton.hidden = false
underwaterButton.addEventListener('click', () => setUnderwater(!underwater.on))
/** @param {boolean} on */
function setUnderwater(on) {
  look.underwater = on
  underwater.setOn(on)
  underwaterButton.setAttribute('aria-pressed', String(on))
  showSeasonControl(on)
  setSwimming(on && !mobile)
  updateAddress()
  settings.reflect('underwater', on ? '1' : '0')
  updateLights()
  updateEnvironment()
}
live.underwater = (v) => setUnderwater(v === '1')

// Swimming (swim.js): underwater on a computer, first-person navigation replaces the orbit; leaving it, the orbit
// turns around the point SWIM_TARGET ahead of where the diver looks. The movement keys drawn bottom left
const SWIM_TARGET = 4
const swimKeys = document.querySelector('.swim-keys')
swimKeys.setAttribute('aria-label', t('swimKeys'))
swimKeys.querySelector('.swim-hint').textContent = t('swimHint')
// The diver can't go through the model: each move stops short of the surfaces and slides along them (collide.js)
const collider = createCollider(() => [...tilesets.map((tiles) => tiles.group), ...contextModels])
if (import.meta.env.DEV) window.l21.collider = collider
const swim = createSwim({
  camera,
  element: renderer.domElement,
  move: (position, step) => collider.move(position, step),
  onKey: (code, down) => {
    const arrow = { ArrowUp: 'KeyW', ArrowDown: 'KeyS', ArrowLeft: 'KeyA', ArrowRight: 'KeyD' }[code] ?? code
    swimKeys.querySelector(`[data-code="${arrow}"]`)?.toggleAttribute('data-down', down)
  },
})
// The keyboard's own letters for those positions (AZERTY: Z, Q, S, D), where the browser tells them
navigator.keyboard?.getLayoutMap?.().then((layout) => {
  for (const key of swimKeys.querySelectorAll('kbd')) {
    const letter = layout.get(key.dataset.code)
    if (letter) key.textContent = letter.toUpperCase()
  }
}).catch(() => {})
/** @param {boolean} on */
function setSwimming(on) {
  if (on === swim.active) return
  if (on) showSwimHelp()
  controls.enabled = !on
  swim.setActive(on)
  // The keys pad continues the season strip's sweep, leftward (SWEEP_DELAY)
  reveal(swimKeys, on, 'inset(-8px -8px -8px 100%)', on ? SWEEP_DELAY : 0)
  if (!on) {
    controls.target.copy(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(SWIM_TARGET).add(camera.position))
    controls.update()
  }
}
// The particles' distance field (underwater.js): the distance from each of its cells to the nearest surface, built
// around the camera a few milliseconds per frame (FIELD_BUDGET), again once the camera has moved FIELD_MOVE m
const FIELD_BUDGET = 4
const FIELD_MOVE = 2
let fieldCentre = null
let fieldJob = null
function buildParticleField() {
  if (!fieldJob) {
    if (fieldCentre && fieldCentre.distanceTo(camera.position) < FIELD_MOVE) return
    const centre = camera.position.clone()
    fieldJob = {
      centre,
      min: centre.clone().subScalar(FIELD_SIZE / 2),
      surfaces: collider.surfacesNear(centre, FIELD_SIZE * 0.87 + FIELD_RANGE),
      data: new Uint8Array(FIELD_CELLS ** 3),
      index: 0,
    }
  }
  const job = fieldJob
  const cell = FIELD_SIZE / FIELD_CELLS
  const point = new THREE.Vector3()
  const started = performance.now()
  while (job.index < job.data.length && performance.now() - started < FIELD_BUDGET) {
    const i = job.index
    // x fastest, then y, then z (the 3D texture's layout); each value at its cell's centre
    point.set(i % FIELD_CELLS, Math.floor(i / FIELD_CELLS) % FIELD_CELLS, Math.floor(i / FIELD_CELLS ** 2))
    point.addScalar(0.5).multiplyScalar(cell).add(job.min)
    job.data[i] = Math.round((collider.distanceTo(point, job.surfaces, FIELD_RANGE) / FIELD_RANGE) * 255)
    job.index++
  }
  if (job.index < job.data.length) return
  underwater.field.data.set(job.data)
  underwater.field.ready(job.min)
  fieldCentre = job.centre
  fieldJob = null
}
// The swim mode's help: an MD3 basic dialog (native <dialog>), opened by itself the first time the swim mode starts
// (remembered by the browser), then by the « ? » button of the keys, bottom left
const SWIM_HELP_KEY = 'l21-swim-help-seen'
const swimHelp = document.querySelector('.swim-help')
const swimHelpButton = swimKeys.querySelector('.swim-help-button')
swimHelpButton.setAttribute('aria-label', t('swimHelpTitle'))
swimHelpButton.dataset.tooltip = t('swimHelpTitle')
swimHelpButton.addEventListener('click', () => openSwimHelp())
function showSwimHelp() {
  try {
    if (localStorage.getItem(SWIM_HELP_KEY)) return
    localStorage.setItem(SWIM_HELP_KEY, '1')
  } catch {
    // storage unavailable: shown each time
  }
  openSwimHelp()
}
function openSwimHelp() {
  const letter = (code) => swimKeys.querySelector(`[data-code="${code}"]`)?.textContent ?? code.slice(3)
  swimHelp.querySelector('h2').textContent = t('swimHelpTitle')
  swimHelp.querySelector('.swim-help-text').innerHTML = t('swimHelpText', {
    w: letter('KeyW'), a: letter('KeyA'), s: letter('KeyS'), d: letter('KeyD'),
    // The underwater button's own icon, in a small round like the button
    icon: `<span class="swim-help-icon">${underwaterButton.querySelector('svg').outerHTML}</span>`,
  })
  swimHelp.querySelector('.swim-help-ok').textContent = t('swimHelpOk')
  swimHelp.showModal()
}
swimHelp.querySelector('.swim-help-ok').addEventListener('click', () => swimHelp.close())
let swimTimer = 0
function swimMoved() {
  // The address (viewUrl) reads the orbit's target: kept ahead of the diver
  controls.target.copy(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(SWIM_TARGET).add(camera.position))
  needsRender = true
  clearTimeout(swimTimer)
  swimTimer = setTimeout(updateAddress, 300)
}
live.season = (v) => {
  look.season = Number(v)
  underwater.setSeason(look.season)
  showSeason()
  updateLights()
  updateEnvironment()
  if (look.underwater) updateAddress()
}
// The season slider beside the 🤿 button (while underwater), kept in step with the settings' « Saison »
const seasonControl = document.querySelector('.season-control')
// Shown and hidden with the MD3 motion (docs/system-design.md, Motion): it slides out from the button and fades in
// over 400 ms (emphasized decelerate), back over 200 ms (emphasized accelerate); at once on start-up or when the
// system asks for reduced motion
const SEASON_MOTION = {
  enter: { duration: 400, easing: 'cubic-bezier(0.05, 0.7, 0.1, 1)' },
  exit: { duration: 200, easing: 'cubic-bezier(0.3, 0, 0.8, 0.15)' },
}
// The strip with the season slider and the dive light's button: its whole width unrolls out of the 🤿 button
// (revealed from the right) and rolls back into it
const underwaterTools = document.querySelector('.underwater-tools')
/** @param {boolean} on */
function showSeasonControl(on) {
  // Unrolls out of the 🤿 button: revealed from its right edge
  reveal(underwaterTools, on, 'inset(-8px -8px -8px 100%)', on ? 0 : SWEEP_DELAY)
}
// The season strip and the keys pad unroll as one sweep leftward from the 🤿 button: the pad (setSwimming) follows
// the strip on the way in, and goes first on the way back
const SWEEP_DELAY = 180
/**
 * Shows or hides an element with the MD3 motion (SEASON_MOTION): revealed from one edge (away: its clip-path when
 * hidden), back the same way; at once when the system asks for reduced motion
 * @param {HTMLElement} element
 * @param {boolean} on
 * @param {string} hidden - clip-path while hidden, e.g. inset(-8px -8px -8px 100%) for unrolling from the right
 * @param {number} [delay] - ms before it starts (hidden meanwhile on the way in)
 */
function reveal(element, on, hidden, delay = 0) {
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const away = { clipPath: hidden, opacity: 0.4 }
  const here = { clipPath: 'inset(-8px -8px -8px -8px)', opacity: 1 }
  if (on === !element.hidden && !element.dataset.leaving) return
  element.getAnimations().forEach((a) => a.cancel())
  delete element.dataset.leaving
  if (on) {
    element.hidden = false
    if (!still) element.animate([away, here], { ...SEASON_MOTION.enter, delay, fill: 'backwards' })
  } else if (still) {
    element.hidden = true
  } else {
    element.dataset.leaving = 'true'
    element.animate([here, away], { ...SEASON_MOTION.exit, delay, fill: 'forwards' }).finished.then(() => {
      if (!element.dataset.leaving) return
      delete element.dataset.leaving
      element.hidden = true
      element.getAnimations().forEach((a) => a.cancel())
    }, () => {})
  }
}
const seasonRange = seasonControl.querySelector('.season-range')
const seasonValue = seasonControl.querySelector('.season-value')
seasonRange.setAttribute('aria-label', t('season'))
// All four seasons' values in the same place, only the current one shown: the strip keeps the size of the longest
// while the slider moves (Christian, 2026-10-23)
const seasonLabels = [0, 1, 2, 3].map((index) => {
  const label = document.createElement('span')
  label.textContent = t('seasonValue', { index })
  return label
})
seasonValue.replaceChildren(...seasonLabels)
function showSeason() {
  seasonRange.value = String(look.season)
  seasonLabels.forEach((label, index) => label.classList.toggle('current', index === Number(look.season)))
}
seasonRange.addEventListener('input', () => {
  live.season(seasonRange.value)
  settings.reflect('season', seasonRange.value)
})
showSeason()
live.lamp = (v) => {
  look.lamp = v === '1'
  underwater.setLamp(look.lamp)
  showLamp()
  requestRender()
  if (look.underwater) updateAddress()
}
// The dive light's button, between the season slider and the 🤿 button, kept in step with the settings' « Lampe de plongée »
const lampButton = document.querySelector('.lamp-button')
function showLamp() {
  lampButton.setAttribute('aria-pressed', String(look.lamp))
  lampButton.setAttribute('aria-label', t('lamp'))
  lampButton.dataset.tooltip = t(look.lamp ? 'lampOff' : 'lampOn')
}
lampButton.addEventListener('click', () => {
  live.lamp(look.lamp ? '0' : '1')
  settings.reflect('lamp', look.lamp ? '1' : '0')
})
showLamp()
underwater.setSeason(look.season)
underwater.setLamp(look.lamp)
new HDRLoader().load(`${import.meta.env.BASE_URL}hdri/sky.hdr`, (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping
  const pmrem = new THREE.PMREMGenerator(renderer)
  skyEnvironment = pmrem.fromEquirectangular(texture).texture
  pmrem.dispose()
  skyTexture = texture
  updateEnvironment()
})

live.hdri = (v) => {
  look.sky = v === '1'
  rebuildMaterials(); updateLights(); updateTone(); updateEnvironment()
}
live.hdriIntensity = (v) => { look.skyIntensity = Number(v); updateEnvironment() }
live.sky = (v) => { look.skyBackground = v === '1'; updateEnvironment() }
live.relief = (v) => { look.relief = v; rebuildMaterials() }
live.sunIntensity = (v) => { look.sunIntensity = Number(v); updateLights() }
live.shadows = (v) => { look.shadows = v === '1'; updateLights() }
live.tone = (v) => { look.tone = TONES[v] !== undefined ? v : 'agx'; updateTone() }
live.exposure = (v) => { look.exposure = Number(v); updateTone() }
live.saturation = (v) => { look.saturation = saturationOf(v); rebuildMaterials() }
live.contrast = (v) => { look.contrast = contrastOf(v); rebuildMaterials() }
live.wet = (v) => { look.wet = wetness(v); rebuildMaterials(); updateEnvironment() }
live.light = (v) => { look.light = v.split(',').map(Number); updateLights() }

// Colour balance between zones. The water tints each zone differently (yellow-green, more or less dark,
// depending on the dive). manifest.json gives each zone's average texture colour in linear light
// (tools/publish-model/texture_stats.mjs); every zone is brought to the same target colour: the average of the
// zones, from which ?neutral= (0 to 1, default 0.2) of the common tint is removed. Fully neutral looks grey or
// pink: the mussels and the sediment really are brown-green.
let zoneEntries = []
let gains = new Map()
function colorBalance() {
  gains = new Map()
  const measured = zoneEntries.filter((e) => e.color)
  if (!measured.length) return
  const average = [0, 1, 2].map((c) => measured.reduce((sum, e) => sum + e.color[c], 0) / measured.length)
  const luminance = 0.2126 * average[0] + 0.7152 * average[1] + 0.0722 * average[2]
  const target = average.map((c) => c + (luminance - c) * look.neutral)
  // Clamped: a very dark or very tinted texture would otherwise get extreme gains (noise, compression blocks)
  const gain = (t, m) => Math.min(Math.max(t / m, 0.4), 3)
  for (const e of measured) gains.set(e.id, new THREE.Color(...target.map((t, c) => gain(t, e.color[c]))))
}
// New gains: only the zones' material colours change
function updateZoneColors() {
  colorBalance()
  scene.traverse((child) => {
    const surface = child.isMesh && child.userData.surface
    if (surface?.zoneId && child.material.map === surface.map) child.material.color.copy(surfaceColor(surface))
  })
  requestRender()
}
live.neutral = (v) => { look.neutral = Number(v); updateZoneColors() }

// Ambient occlusion (N8AO): darkens recesses and joints, giving depth to unlit surfaces. N8AO rebuilds the
// normals from the depth buffer (the tiles carry none). Hardware antialiasing does not survive the
// post-processing, hence SMAA. ?ao=0 disables it, ?aoRadius= / ?aoIntensity= tune it (metres / strength),
// ?aoDebug=1 shows the occlusion alone. Off by default on phones (heat, battery): ?ao=1 forces it.
// The passes are created the first time it is on.
const ao = {
  on: params.has('ao') ? params.get('ao') !== '0' : !mobile,
  radius: Number(params.get('aoRadius')) || 1.0,
  intensity: Number(params.get('aoIntensity')) || 3.0,
  debug: params.get('aoDebug') === '1',
}
let composer = null
let aoPass = null
function updateAO() {
  if (ao.on && !composer) {
    composer = new EffectComposer(renderer)
    aoPass = new N8AOPass(scene, camera, container.clientWidth, container.clientHeight)
    aoPass.configuration.distanceFalloff = 1.0
    aoPass.configuration.gammaCorrection = false // OutputPass converts to sRGB at the end
    aoQuality()
    composer.addPass(aoPass)
    composer.addPass(new SMAAPass())
    composer.addPass(new OutputPass())
  }
  if (aoPass) {
    aoPass.configuration.aoRadius = ao.radius
    aoPass.configuration.intensity = ao.intensity
    aoPass.setDisplayMode(ao.debug ? 'AO' : 'Combined')
  }
  requestRender()
}
function aoQuality() {
  aoPass.configuration.halfRes = mobile
  aoPass.setQualityMode(mobile ? 'Low' : 'Medium')
}
updateAO()
live.ao = (v) => { ao.on = v === '1'; updateAO() }
live.aoRadius = (v) => { ao.radius = Number(v); updateAO() }
live.aoIntensity = (v) => { ao.intensity = Number(v); updateAO() }
live.aoDebug = (v) => { ao.debug = v === '1'; updateAO() }

// 3D Tiles are Z-up, three.js is Y-up
const world = new THREE.Group()
world.rotation.x = -Math.PI / 2
scene.add(world)

// The model: one tileset per zone plus the non-tiled context. Loaded again (camera kept) when the tiles' source
// changes; a load started later wins over one still running.
let tilesets = []
// The relief's normal maps only on the finest level (TODO #55): they weigh as much as the colour maps, and from the
// distance a coarser level is seen at, their relief hardly shows. Dropped as a coarser tile is parsed, before the
// tiles' cache counts its memory (3d-tiles-renderer's processTileModel): at the start view the coarser levels held
// about 550 MB of normal maps, enough to fill the budget (PROFILES) and keep the finest level from loading
// One plugin per tileset (a plugin can be registered to one tileset only)
const coarseWithoutRelief = () => ({
  name: 'CoarseWithoutRelief',
  processTileModel(scene, tile) {
    if (!tile.children?.length) return
    scene.traverse((object) => {
      if (!object.isMesh || !object.material.normalMap) return
      object.material.normalMap.dispose()
      object.material.normalMap = null
    })
  },
})
let contextModels = []
let framed = false
let loadCount = 0
// Every zone's root tileset is in: from then on, the loading indicator ends as soon as no tile is pending
let rootsLoaded = false
async function loadModel() {
  const load = ++loadCount
  status.start()
  rootsLoaded = false
  const manifest = await (await fetch(`${tilesUrl}/manifest.json`, { cache: 'no-cache' })).json()
  if (load !== loadCount) return
  unloadModel()
  zoneEntries = manifest.tilesets
  colorBalance()
  // One memory budget shared by all zones: a per-zone share (budget / zone count) filled up after 2 or 3
  // large textures and stopped loading, leaving zones missing on phones.
  let sharedCache = null
  tilesets = manifest.tilesets.map((entry) => {
    const tiles = new TilesRenderer(`${tilesUrl}/${entry.url}`)
    tiles.zoneId = entry.id
    tiles.registerPlugin(coarseWithoutRelief())
    if (sharedCache) {
      tiles.lruCache = sharedCache
    } else {
      sharedCache = tiles.lruCache
      sharedCache.maxBytesSize = profile.maxBytes
      sharedCache.minBytesSize = profile.maxBytes * 0.6
    }
    const gltfLoader = new GLTFLoader(tiles.manager)
    gltfLoader.setKTX2Loader(ktx2Loader)
    gltfLoader.setMeshoptDecoder(MeshoptDecoder) // geometry compressed by tools/publish-model/compress_tiles.mjs
    tiles.manager.addHandler(/\.(gltf|glb)$/g, gltfLoader)
    tiles.errorTarget = profile.errorTarget
    tiles.setCamera(camera)
    tiles.setResolutionFromRenderer(camera, renderer)

    tiles.addEventListener('load-error', ({ error, url }) => log('tile-error', { zone: entry.id, url: String(url ?? '').slice(-200), ...errorText(error) }))
    tiles.addEventListener('load-model', ({ scene: model }) => {
      model.traverse((child) => {
        if (child.isMesh) initSurface(child, entry.id)
      })
    })
    tiles.addEventListener('dispose-model', ({ scene: model }) => {
      model.traverse((child) => child.material?.dispose())
      requestRender()
    })
    tiles.addEventListener('load-model', requestRender)
    tiles.addEventListener('tile-visibility-change', requestRender)
    tiles.addEventListener('load-tile-set', requestRender)
    world.add(tiles.group)
    return tiles
  })

  // Non-tiled models (context: fillers, terrain), glTF is already Y-up
  const contextLoader = new GLTFLoader()
  contextLoader.setKTX2Loader(ktx2Loader)
  contextLoader.setMeshoptDecoder(MeshoptDecoder)
  for (const entry of manifest.models || []) {
    contextLoader.load(`${tilesUrl}/${entry.url}`, ({ scene: model }) => {
      if (load !== loadCount) return
      if (entry.id === 'mockups') {
        showMockups(model, manifest)
        return
      }
      model.traverse((child) => {
        if (child.isMesh) initSurface(child, null)
      })
      scene.add(model)
      contextModels.push(model)
      requestRender()
    })
  }

  // Place the camera once every root is loaded (first load only: a new source keeps the view)
  let pending = tilesets.length
  tilesets.forEach((tiles) => {
    tiles.addEventListener('load-root-tileset', () => {
      if (--pending > 0) return
      rootsLoaded = true
      if (framed) return
      framed = true
      // ?cam=x,y,z,tx,ty,tz: camera position and target (scene metres, y up), for identical or shared views; without
      // it, the chosen start view (START_VIEW), stepped back on a narrow frame
      let cam = (params.get('cam') || '').split(',').map(Number)
      if (!(cam.length === 6 && cam.every(Number.isFinite))) cam = startView(container.clientWidth / container.clientHeight)
      camera.position.set(cam[0], cam[1], cam[2])
      controls.target.set(cam[3], cam[4], cam[5])
      controls.update()
    })
  })
}

function unloadModel() {
  for (const tiles of tilesets) {
    world.remove(tiles.group)
    tiles.dispose()
  }
  for (const model of contextModels) {
    scene.remove(model)
    model.traverse((child) => {
      if (!child.isMesh) return
      child.geometry.dispose()
      child.material.dispose()
      child.userData.surface?.map?.dispose()
    })
  }
  for (const model of mockupModels) {
    scene.remove(model)
    model.traverse((child) => child.geometry?.dispose())
  }
  for (const crawfish of crawfishes) scene.remove(crawfish.object)
  crawfishes = []
  tilesets = []
  contextModels = []
  mockupModels = []
  requestRender()
}

// The mockups of the zones not yet digitised (TODO #6; tools/publish-model/export_mockups.py: « mockup zone N »
// objects of the .blend): translucent ghosts that complete the lock's shape; a zone's mockup is hidden as soon as the
// zone is online (in the manifest). No shadows, not solid for the swimmer
let mockupModels = []
// The crayfish (crawfish.js): lit like the surfaces, with the sun's shadows and the underwater look
let crawfishes = []
// The diver's arm and its light, while underwater with the light on: the beam starts at the drawn light
const diverArm = createDiverArm({ onLampPose: (front, axis) => underwater.setLampPose(front, axis) })
if (import.meta.env.DEV) window.l21.diverArm = diverArm
// The river's current (m/s, world): west to east, 35 ft/min (measured 2024-06-08)
const RIVER_CURRENT = new THREE.Vector3((35 * 0.3048) / 60, 0, 0)
/** @param {THREE.Material} material */
function prepareCreatureMaterial(material) {
  // After its own patches (the crayfish's blue claws)
  const own = material.onBeforeCompile
  const key = material.customProgramCacheKey?.() ?? ''
  material.onBeforeCompile = (shader, renderer) => {
    own?.call(material, shader, renderer)
    underwater.patchShader(shader)
  }
  material.customProgramCacheKey = () => `creature-${key}-${material.color.getHexString()}`
  return withShadowCascades(material)
}
const MOCKUP_OPACITY = 0.22
const mockupMaterial = new THREE.MeshStandardMaterial({
  color: 0xd2dccb,
  roughness: 1,
  transparent: true,
  opacity: MOCKUP_OPACITY,
  depthWrite: false,
  side: THREE.DoubleSide,
})
mockupMaterial.onBeforeCompile = (shader) => underwater.patchShader(shader)
mockupMaterial.customProgramCacheKey = () => 'mockup'
withShadowCascades(mockupMaterial)
/**
 * @param {THREE.Object3D} model - the mockups' GLB
 * @param {{ tilesets: { id: string }[] }} manifest
 */
function showMockups(model, manifest) {
  const online = new Set(manifest.tilesets.map((t) => t.id))
  model.updateMatrixWorld(true)
  // Crayfish at the « crawfish » empties (crawfish.js)
  model.traverse((child) => {
    if (!/^crawfish/i.test(child.name) || child.isMesh) return
    const crawfish = createCrawfish({
      prepare: prepareCreatureMaterial,
      ground: (x, y, z) => collider.groundAt(x, y, z),
      // The river's current as the particles drift in it (underwater.js), or as measured outside the underwater view
      current: () => (underwater.on ? underwater.current : RIVER_CURRENT),
    })
    child.getWorldPosition(crawfish.object.position)
    scene.add(crawfish.object)
    crawfishes.push(crawfish)
    if (import.meta.env.DEV) window.l21.crawfishes = crawfishes
  })
  model.traverse((child) => {
    if (!child.isMesh) return
    // Node names from Blender, spaces turned to underscores by the loader: mockup_zone_9
    const zone = child.name.match(/(\d+)$/)?.[1]
    child.visible = Boolean(zone) && !online.has(`zone-${zone}`)
    child.material = mockupMaterial
    child.renderOrder = 1
  })
  scene.add(model)
  mockupModels.push(model)
  requestRender()
}

function showError(error) {
  log('load-failed', errorText(error))
  status.showError(error.message)
  console.error(error)
}

live.tiles = (v) => { tilesUrl = v || DEFAULT_TILES_URL; loadModel().catch(showError) }
live.profile = (v) => {
  mobile = isMobile(v)
  profile = PROFILES[mobile ? 'mobile' : 'desktop']
  renderer.setPixelRatio(profile.pixelRatio)
  composer?.setPixelRatio(profile.pixelRatio)
  const cache = tilesets[0]?.lruCache
  if (cache) {
    cache.maxBytesSize = profile.maxBytes
    cache.minBytesSize = profile.maxBytes * 0.6
  }
  tilesets.forEach((t) => { t.errorTarget = profile.errorTarget })
  if (aoPass) aoQuality()
  resize()
}

function resize() {
  camera.aspect = container.clientWidth / container.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(container.clientWidth, container.clientHeight)
  composer?.setSize(container.clientWidth, container.clientHeight)
  tilesets.forEach((tiles) => tiles.setResolutionFromRenderer(camera, renderer))
  requestRender()
}
window.addEventListener('resize', resize)

// The address bar follows the view: ?cam=x,y,z,tx,ty,tz, updated when a gesture ends, and while underwater
// &underwater=1&season=0..3 (&lamp=0 with the dive light off), updated when they change: the URL can be copied at any
// time to share or reproduce the view. replaceState: no history entry per move. Key C copies that URL.
const viewUrl = () => {
  const v = [...camera.position.toArray(), ...controls.target.toArray()].map((n) => n.toFixed(2)).join(',')
  const water = look.underwater ? `&underwater=1&season=${look.season}${look.lamp ? '' : '&lamp=0'}` : ''
  return `${location.origin}${location.pathname}?cam=${v}${water}`
}
function updateAddress() {
  history.replaceState(null, '', viewUrl())
  // The /modele page shows the same query string in its own address, so that copying it shares this view
  if (embedded) window.parent.postMessage({ type: 'lock21:cam', search: location.search }, location.origin)
}
let urlTimer = 0
controls.addEventListener('change', () => {
  clearTimeout(urlTimer)
  urlTimer = setTimeout(updateAddress, 300)
})
window.addEventListener('keydown', (e) => {
  if (e.key !== 'c' && e.key !== 'C') return
  console.log(viewUrl())
  navigator.clipboard?.writeText(viewUrl()).catch(() => {})
})

// ?compare=<tiles url>: a test tool (TODO #24, de-lighting) to compare two versions of the tiles from the same view.
// An MD3 segmented button « Avant | Après » at the top (key B flips): « Avant » is the usual tiles (or ?tiles=),
// « Après » the ?compare= root; the tiles reload in place, the camera doesn't move. Link only, never shown otherwise.
const compareUrl = params.get('compare')
if (compareUrl) {
  const sources = [[t('before'), tilesUrl], [t('after'), compareUrl]]
  const group = document.body.appendChild(document.createElement('div'))
  group.className = 'compare'
  group.setAttribute('role', 'group')
  group.setAttribute('aria-label', t('compare'))
  const check = '<svg aria-hidden="true" width="18" height="18" viewBox="0 -960 960 960" fill="currentColor"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>'
  const buttons = sources.map(([label, url]) => {
    const button = group.appendChild(document.createElement('button'))
    button.type = 'button'
    button.innerHTML = `${check}<span>${label}</span>`
    button.addEventListener('click', () => select(url))
    return button
  })
  const select = (url) => {
    if (url !== tilesUrl) live.tiles(url)
    buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(sources[i][1] === url)))
  }
  select(tilesUrl)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'b' || e.key === 'B') select(tilesUrl === compareUrl ? sources[0][1] : compareUrl)
  })
}

// ?stats=1: memory used and tiles loaded per zone, on screen (readable on a phone)
let statsBox = null
let lastStats = 0
live.stats = (v) => {
  if (v === '1' && !statsBox) {
    statsBox = document.body.appendChild(document.createElement('pre'))
    statsBox.className = 'stats'
    lastStats = 0
  } else if (v !== '1' && statsBox) {
    statsBox.remove()
    statsBox = null
  }
}
live.stats(params.get('stats') ?? '0')
live.mesh = (v) => {
  look.mesh = v === '1'
  rebuildMaterials()
}
// Refreshed even when nothing is redrawn (render on demand), otherwise the overlay shows stale numbers
function updateStats() {
  if (!statsBox || performance.now() - lastStats < 500) return
  lastStats = performance.now()
  const cache = tilesets[0]?.lruCache
  const lines = [
    t('statsMemory', { phone: mobile, used: ((cache?.cachedBytes || 0) / 1e6).toFixed(0), max: (profile.maxBytes / 1e6).toFixed(0), full: cache?.isFull() }),
    ...tilesets.map((tiles) => t('statsZone', { zone: tiles.zoneId.padEnd(8), visible: String(tiles.visibleTiles.size).padStart(3), loading: tiles.stats.downloading + tiles.stats.parsing })),
  ]
  statsBox.textContent = lines.join('\n')
}

// Settings panel (⚙, <l21-settings-panel>): one control per query parameter, starting from the values read above.
const settings = document.createElement('l21-settings-panel')
settings.configure({
  schema: settingsSchema({ mobile }),
  values: params,
  live,
  button: document.querySelector('.settings-button'),
  session,
})
document.body.append(settings)
if (look.underwater) setUnderwater(true)

// Loading indicator: share of the tiles loaded among those the first view asks for, all zones together; done once every
// root is in and nothing has been pending for a moment
function updateLoading() {
  if (!status.active) return
  let loaded = 0
  let pending = 0
  for (const t of tilesets) {
    loaded += t.stats.loaded
    pending += t.stats.queued + t.stats.downloading + t.stats.parsing
  }
  if (loaded + pending > 0) status.progress = loaded / (loaded + pending)
  // Right after the roots, nothing is queued for a moment (the next tiles are only asked on the next update): done
  // once nothing has been pending for 800 ms in a row
  if (!rootsLoaded || pending > 0) idleSince = 0
  else if (!idleSince) idleSince = performance.now()
  else if (performance.now() - idleSince > 800) {
    status.done()
    // Telemetry: the first full load of the visit (time since the page started, tiles, memory)
    if (!loadLogged) {
      loadLogged = true
      log('loaded', tileFacts())
      for (const run of afterFirstLoad.splice(0)) run()
    }
  }
  const cache = tilesets[0]?.lruCache
  if (!cacheFullLogged && cache?.isFull()) {
    cacheFullLogged = true
    log('cache-full', tileFacts())
  }
}
let idleSince = 0
let loadLogged = false
let cacheFullLogged = false
// Tiles loaded and memory used, all zones together (telemetry)
function tileFacts() {
  const cache = tilesets[0]?.lruCache
  return {
    tiles: tilesets.reduce((n, t) => n + t.stats.loaded, 0),
    cacheMB: Math.round((cache?.cachedBytes || 0) / 1e6),
    maxMB: Math.round(profile.maxBytes / 1e6),
    zones: tilesets.length,
  }
}
setEndFacts(tileFacts)

// Paused while AR runs (android-ar.js has its own renderer)
let lastFrame = performance.now()
function renderLoop() {
  updateStats()
  // update() returns true while the camera moves (including the damping glide after a gesture); swimming: the keys
  // and the drag move the camera (swim.js), the address follows
  if (swim.active) {
    if (swim.update()) swimMoved()
  } else if (controls.update()) needsRender = true
  // Underwater: the camera stays below the surface, and the caustics and particles move (a frame every time)
  if (underwater.on) {
    if (camera.position.y > SURFACE_Y - 0.5) camera.position.y = SURFACE_Y - 0.5
    // The diver's arm first: the beam follows the light it holds
    diverArm.setVisible(underwater.lampVisible)
    diverArm.update(camera)
    underwater.update(camera)
    buildParticleField()
    needsRender = true
  }
  // The crayfish move while the camera is near them
  const now = performance.now()
  const dt = Math.min((now - lastFrame) / 1000, 0.1)
  lastFrame = now
  for (const crawfish of crawfishes) if (crawfish.update(camera, dt)) needsRender = true
  const loading = tilesets.some((t) => t.stats.queued + t.stats.downloading + t.stats.parsing > 0)
  updateLoading()
  if (!needsRender && !loading) return
  needsRender = false
  camera.updateMatrixWorld()
  tilesets.forEach((tiles) => tiles.update())
  drawScene()
}
function drawScene() {
  // The shadow cascades follow the camera
  csm.update()
  // No ambient occlusion underwater: it darkened the creases of surfaces the water had erased, which redrew the lock
  // far beyond the visibility
  if (ao.on && composer && !underwater.on) composer.render()
  else renderer.render(scene, camera)
  // The diver's arm holding the light, over the view (diver-arm.js)
  if (underwater.on) diverArm.render(renderer, camera)
  else diverArm.setVisible(false)
}
renderer.setAnimationLoop(renderLoop)

loadModel().catch(showError)
