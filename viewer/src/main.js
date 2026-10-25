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
import { forgetSettings, rememberedKeys, savedSettings, seasonOfDate, settingsSchema } from './config-panel.js'
import './loading.js'
import './tooltip.js'
import { createUnderwater, FIELD_CELLS, FIELD_RANGE, FIELD_SIZE, SURFACE_Y } from './underwater.js'
import { createSwim } from './swim.js'
import { createCollider } from './collide.js'
import { createCrawfish } from './crawfish.js'
import { createBass } from './bass.js'
import { createDiverArm } from './diver-arm.js'
import { createFishes } from './fishes.js'
import { createDiveComputer } from './dive-computer.js'
import { createTouchNav } from './touch-nav.js'
import { errorText, log, session, setEndFacts, startTelemetry } from './telemetry.js'
import { preloadArModel, startWebXrAr, webxrArSupported } from './android-ar.js'
import { N8AOPass } from 'n8ao'
import { homePath, t } from './i18n.js'
import { createTour } from './tour.js'
import { createPointerOrbit } from './pointer-orbit.js'
import { TOUR_STEPS } from './tour-steps.js'

// 3d-tiles-renderer warns, for each tileset, that version 1.1 has limited support: our tiles declare 1.1 (needed for
// their .glb content) and use none of the features it lacks. That one message only is silenced (12 lines a visit)
const consoleWarn = console.warn
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('tiles versions at 1.1 or higher have limited support')) return
  consoleWarn(...args)
}

// Every query parameter is read once here, then changed live by the settings panel (config-panel.js): no setting
// reloads the page. `live` holds one handler per parameter. The address keeps only the camera (?cam=, see viewUrl):
// the other parameters still work in a link (tests), and are removed from the address once read.
const params = new URLSearchParams(location.search)
// Settings saved by the browser (config-panel.js) where the link doesn't set them. Only the panel's current settings:
// one saved earlier and since taken out of the panel (the tiles' source, the relief) would apply with no control to
// change it back; those work only in a link (?tiles=, ?relief=, for tests). Nor those not remembered (underwater: a
// value saved before is ignored)
const panelKeys = rememberedKeys(settingsSchema({ mobile: false }))
// Arriving on the /modele page from another page (?reset=1, ModelPage.astro): the saved settings are forgotten, the
// viewer starts from its defaults; a reload of the page keeps them
// A reload keeps the view the camera was at (Christian, 2026-10-23): the address follows the camera only 300 ms after
// a move, so a reload right after one brought back an older view. The camera is kept in the tab's session storage at
// every move (CAM_KEY) and taken back on a reload: of the /modele page (no ?reset=1, ModelPage.astro) or of the viewer
const CAM_KEY = 'l21-viewer-cam'
const navigation = /** @type {PerformanceNavigationTiming | undefined} */ (performance.getEntriesByType('navigation')[0])
const reloading = params.get('reset') !== '1' && (window.self !== window.top || navigation?.type === 'reload')
if (reloading) {
  try {
    const kept = sessionStorage.getItem(CAM_KEY)
    if (kept) params.set('cam', kept)
  } catch {}
}
if (params.get('reset') === '1') {
  forgetSettings()
  params.delete('reset')
}
for (const [key, value] of savedSettings()) if (!params.has(key) && panelKeys.has(key)) params.set(key, value)
const live = {}
// The address keeps only what makes the view shareable (viewUrl): the camera, and underwater with its season and lamp
const SHARED_KEYS = ['cam', 'underwater', 'season', 'lamp']
const shared = new URLSearchParams([...params].filter(([key]) => SHARED_KEYS.includes(key) && (key === 'cam' || params.get('underwater') === '1')))
// (the tour's step, #tour-3, kept: a reload keeps it, Christian, 2026-10-24)
const startHash = /^#tour-\d+$/.test(location.hash) ? location.hash : ''
history.replaceState(null, '', location.pathname + (shared.size ? `?${shared}` : '').replaceAll('%2C', ',') + startHash)

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
  ['.compass', 'compass', 'compass'],
  ['.home-button', 'homeView', 'homeView'],
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
} else if (embedded && window.matchMedia('(pointer: coarse)').matches) {
  // No full screen for a frame (iPhone): the button opens the viewer on its own page, at the same view, the whole
  // screen for the model
  fullscreenButton.hidden = false
  fullscreenButton.addEventListener('click', () => {
    window.top.location.href = viewUrl()
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
// The first view drawn, and the underwater view opened once (Christian, 2026-10-24: on a slow connection, the crayfish,
// the bass, the diver's arm and the texture decoder all came with the coarsest tiles, and nothing showed for 20 s):
// the creatures and the arm load after the first view; the bass and the arm only once underwater (?bass=1: at once)
let firstViewReached
const firstView = new Promise((resolve) => { firstViewReached = resolve })
let underwaterReached
const underwaterOnce = new Promise((resolve) => { underwaterReached = resolve })
const afterFirstViewUnderwater = Promise.all([firstView, underwaterOnce])
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
  // Phones (Christian, 2026-10-23: old iPhones struggled): 300 MB (was 450: old iPhones ran out of memory before the
  // model was complete) and less fine detail (errorTarget 16, was 12)
  mobile: { errorTarget: 16, maxBytes: 300e6, pixelRatio: Math.min(window.devicePixelRatio, 1.5) },
  // Computers (Christian, 2026-10-24): 1 GB (was 1.2: most visitors' graphics cards have far less memory than a
  // high-end one), lean loading (setDetail)
  desktop: { errorTarget: 6, maxBytes: 1000e6, pixelRatio: Math.min(window.devicePixelRatio, 2), lean: true },
}
const isMobile = (forced) => (forced ? forced === 'mobile' : window.matchMedia('(pointer: coarse)').matches)
let mobile = isMobile(params.get('profile'))
let profile = PROFILES[mobile ? 'mobile' : 'desktop']

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(profile.pixelRatio)
renderer.setSize(container.clientWidth, container.clientHeight)
container.appendChild(renderer.domElement)
// Telemetry for every visit (telemetry.js): device, errors, load time, end of the visit
const { previousUnclosed } = startTelemetry({ renderer, mobile, embedded })
// The page reloaded after running out of memory (Safari on an iPhone or iPad): a lighter model this time, and the
// loading card says why (LIGHT)
const LIGHT = { errorTarget: 24, maxBytes: 150e6, pixelRatio: 1 }
const light = mobile && previousUnclosed
if (light) {
  Object.assign(PROFILES.mobile, LIGHT)
  renderer.setPixelRatio(profile.pixelRatio)
  log('light-profile', LIGHT)
}
// The tiles' textures (tile_zone.ps1 -Light; « Textures » setting, ?textures=light|full; Christian, 2026-10-24: his
// Pixel 10 Pro handled the full set well): the full set on a computer, and on a phone or tablet that reports at least
// STRONG_MEMORY GB and STRONG_CORES cores on a fast connection (Chrome's class « 4g », Wi-Fi included, no data saver:
// its speed estimate, downlink, started at 1.6 Mbit/s on a fast line); the light one otherwise. Only
// Chrome reports memory and connection: every iPhone and iPad takes the light set, unless chosen otherwise. After a
// reload for lack of memory, always the light one
const STRONG_MEMORY = 8
const STRONG_CORES = 8
let texturesChoice = params.get('textures') || ''
function lightTextures() {
  if (light || texturesChoice === 'light') return true
  if (texturesChoice === 'full' || !mobile) return false
  const net = navigator.connection
  const strong = navigator.deviceMemory >= STRONG_MEMORY && navigator.hardwareConcurrency >= STRONG_CORES
  const fast = !net || (!net.saveData && (!net.effectiveType || net.effectiveType === '4g'))
  return !(strong && fast)
}
let lightSet = lightTextures()
log('tile-set', {
  set: lightSet ? 'light' : 'full', choice: texturesChoice || 'auto', memory: navigator.deviceMemory ?? null,
  cores: navigator.hardwareConcurrency ?? null, downlink: navigator.connection?.downlink ?? null,
  net: navigator.connection?.effectiveType ?? null, saveData: navigator.connection?.saveData ?? null,
})

// The view a visit starts from without ?cam= (same form: x,y,z of the camera, then of the point it looks at; scene
// metres, y up), chosen by Christian on 2026-10-25 (was 2026-10-23's). To change it, place the camera where wanted and
// copy the numbers from the address bar (?cam=).
const START_VIEW = [-15.2, 2.04, -18.24, -19.2, 2.02, -18.26]
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
// The tiles' own camera (Christian, 2026-10-24: does loading take the visibility into account?): the view's, but
// underwater its far limit stops at TILES_VISIBILITY times the season's visibility. Beyond, the surfaces have the
// water's colour: their tiles are neither loaded nor drawn (spring, 14 ft: about 5 m instead of the whole site).
// The view itself stops there too (the context and the mockups as well, and the water column fits inside: an empty
// area showed where tiles were missing in front of the context: Christian, 2026-10-24); FAR in the air
const TILES_VISIBILITY = 1.2
const FAR = 2000
const tilesCamera = new THREE.PerspectiveCamera()
function syncTilesCamera() {
  const far = underwater.on ? Math.max(1, underwater.visibility * TILES_VISIBILITY) : FAR
  if (camera.far !== far) {
    camera.far = far
    camera.updateProjectionMatrix()
    // The shadow cascades are cut from the camera's frustum
    csm.updateFrustums()
  }
  tilesCamera.copy(camera)
  tilesCamera.updateProjectionMatrix()
  tilesCamera.updateMatrixWorld()
}
const controls = new OrbitControls(camera, renderer.domElement)
// Development builds only: the viewer's parts for tests in the browser console (window.l21)
if (import.meta.env.DEV) window.l21 = { THREE, renderer, scene, camera, controls, underwater, get tilesets() { return tilesets } }
controls.enableDamping = true
// Turning with the left button (Christian, 2026-10-24: too fast): half OrbitControls' speed, half a turn for a drag
// across the view's height
controls.rotateSpeed = 0.5
// Looking up (Christian, 2026-10-24: the standard view couldn't): the camera may go below the point it turns around,
// up to ORBIT_UP from straight above it; it then stays in front of the surfaces between them (keepInFront). It used
// to stay above that point's height, so as never to look from under the floor
const ORBIT_UP = Math.PI * 0.95
controls.maxPolarAngle = ORBIT_UP
// Touch navigation, the double-tap's flight (touch-nav.js): the model's point under the finger (the zones' tiles and
// the context)
const pickRay = new THREE.Raycaster()
pickRay.firstHitOnly = true
const pickPointer = new THREE.Vector2()
const touchNav = createTouchNav({
  controls,
  camera,
  surface: renderer.domElement,
  t,
  requestRender: () => requestRender(),
  pick: (x, y) => {
    const box = renderer.domElement.getBoundingClientRect()
    pickPointer.set(((x - box.left) / box.width) * 2 - 1, -((y - box.top) / box.height) * 2 + 1)
    pickRay.setFromCamera(pickPointer, camera)
    const hit = pickRay.intersectObjects([...tilesets.map((tiles) => tiles.group), ...contextModels], true)[0]
    return hit ? hit.point.clone() : null
  },
})

// The left button turns around the point pressed (pointer-orbit.js, Christian, 2026-10-24), in the standard view
const pointerOrbit = createPointerOrbit({
  controls,
  camera,
  surface: renderer.domElement,
  maxPolar: ORBIT_UP,
  requestRender: () => requestRender(),
  pick: (x, y) => {
    const box = renderer.domElement.getBoundingClientRect()
    pickPointer.set(((x - box.left) / box.width) * 2 - 1, -((y - box.top) / box.height) * 2 + 1)
    pickRay.setFromCamera(pickPointer, camera)
    // As far as the model goes (another use of this ray may have left it short); the first surface shown (the raycaster
    // does not skip hidden objects: the mockups of the zones online are there, hidden)
    pickRay.far = Infinity
    const shown = (object) => {
      for (let o = object; o; o = o.parent) if (!o.visible) return false
      return true
    }
    const hit = pickRay.intersectObjects([...tilesets.map((tiles) => tiles.group), ...contextModels, ...mockupModels], true).find((h) => shown(h.object))
    return hit ? hit.point.clone() : null
  },
})

// Diving (swimming), a double-click makes the point under the pointer the one the drag turns around (swim.js setPivot;
// Christian, 2026-10-24)
renderer.domElement.addEventListener('dblclick', (event) => {
  if (!swim.looking || tour.active) return
  const point = pointerOrbit.pick(event.clientX, event.clientY)
  if (point) swim.setPivot(point)
})

// Draw only when something changed (camera, tiles, size): a scene redrawn 60 times per second for nothing
// kept the phone's GPU at 100 % and made it very hot.
let needsRender = true
const requestRender = () => { needsRender = true }
controls.addEventListener('change', requestRender)

/**
 * Lets a tile's compressed textures (KTX2) drop their data once on the GPU: three.js keeps it for nothing else than a
 * new upload (a lost WebGL context: the model is then loaded again, see webglcontextrestored). About a third of the
 * tiles' memory on a phone
 * @param {{ map?: THREE.Texture, normalMap?: THREE.Texture }} surface - mesh.userData.surface (initSurface)
 */
function releaseAfterUpload(surface) {
  for (const key of ['map', 'normalMap']) {
    const texture = surface?.[key]
    if (!texture?.isCompressedTexture || texture.userData.releases) continue
    texture.userData.releases = true
    texture.onUpdate = () => {
      texture.mipmaps = []
      texture.onUpdate = null
    }
  }
}
// Less detail far away (Christian, 2026-10-24: a far zone should use less): each tile's error is multiplied by
// 1 - DETAIL_FALLOFF x (1 - e^-(d x DETAIL_DENSITY)²) with its distance d (a sixth of the loss at 6 m, half at 12 m,
// nearly all from 30 m: there a tile needs three times the error to refine; at 0.1, zone 18 stayed coarse 13 m away).
// A factor, not the library's errorFalloff, which subtracts:
// zone 18's first tile, 118 m away, got an error of 0, and its root (refine ADD: a child is skipped when the parent
// meets the error target there) then drew nothing (Christian, 2026-10-24: zone 18 not showing from afar). The finest level was asked for up to about 25 m, where its 1.6 mm texels
// are a tenth of a pixel; at one view zone 8's 49 finest tiles, 19 m away and behind a wall, held 94 MB of the budget
// while nearby tiles were refused (108 refused, 44 with it).
// Lean loading on a computer (the profile's lean; Christian, 2026-10-24: a smaller budget, most visitors' graphics cards
// have far less memory): only the tiles in view are loaded, not their siblings nor their coarser ancestors as a
// fallback. At one view, of 1.33 GB, 0.3 GB went to finest siblings not shown and 0.15 GB to ancestors not shown: 0.88
// GB with it, the same detail in sight. A part of the view newly turned to stays empty a moment (under 2 s on a fast
// connection) instead of coarse: phones, slower, keep the fallback
const DETAIL_FALLOFF = 2 / 3
const DETAIL_DENSITY = 0.05
/** The profile's detail on a tile set: its error target, the falloff with distance, lean loading */
function setDetail(tiles) {
  tiles.errorTarget = profile.errorTarget
  if (!tiles.userData?.falloff) {
    const viewError = tiles.calculateTileViewError.bind(tiles)
    tiles.calculateTileViewError = (tile, target) => {
      viewError(tile, target)
      const d = target.distanceFromCamera
      if (Number.isFinite(d)) target.error *= 1 - DETAIL_FALLOFF * (1 - Math.exp(-((d * DETAIL_DENSITY) ** 2)))
    }
    tiles.userData = { ...tiles.userData, falloff: true }
  }
  tiles.loadAncestors = tiles.loadSiblings = !profile.lean
}
// The tiles' texture sizes on the GPU (TODO #69, 2026-10-24: up close, the walls stayed at a coarse level). The
// library shows a tile's finer children only once all of them are loaded; since the relief (2026-10-19) each finest
// tile also carried a 4096 px normal map, 22 of its 34 MB, and the 1.2 GB budget ran out before every child of a near
// wall came in (zone 3: 6 of 7 loaded, 204 MB in memory, the wall still coarse). As each tile arrives: its normal map
// at most NORMAL_MAX px (1 byte a pixel on the GPU, the photo half a byte: at 2048 it outweighed the tile's photo; the
// relief at 1024 shows the joints and mussels still), and on the coarser levels the photo at most COARSE_MAX px
// (cap_coarse_textures.mjs does it for the tile sets published since 2026-10-24; zone 3's coarse level still had an
// 8192 px one, 45 MB). The finest photos keep their 4096 px (at 2048, a wall a metre away turned blocky). The larger
// mipmap levels dropped, nothing encoded again (sizes stay multiples of 4); the tile's memory counted again
const NORMAL_MAX = 1024
const COARSE_MAX = 2048
/**
 * @param {THREE.Object3D} model - a tile's scene
 * @param {boolean} finest - a tile without children
 * @returns {boolean} whether a texture got smaller
 */
function capTileTextures(model, finest) {
  let capped = false
  const cap = (texture, max) => {
    if (!texture?.isCompressedTexture || !texture.mipmaps?.length) return
    let drop = 0
    while (drop < texture.mipmaps.length - 1 && Math.max(texture.mipmaps[drop].width, texture.mipmaps[drop].height) > max && texture.mipmaps[drop + 1].width % 4 === 0 && texture.mipmaps[drop + 1].height % 4 === 0) drop++
    if (!drop) return
    texture.mipmaps = texture.mipmaps.slice(drop)
    texture.image = { width: texture.mipmaps[0].width, height: texture.mipmaps[0].height }
    texture.needsUpdate = true
    capped = true
  }
  model.traverse((child) => {
    if (!child.isMesh) return
    cap(child.material?.normalMap, NORMAL_MAX)
    if (!finest) cap(child.material?.map, COARSE_MAX)
  })
  return capped
}
const ktx2Loader = new KTX2Loader().setTranscoderPath(`${import.meta.env.BASE_URL}vendor/basis/`).detectSupport(renderer)
// The tiles' textures are ETC1S (Obj2Tiles): on a computer the loader would transcode them to BC7 (1 byte per pixel),
// which holds no more than ETC1S does; BC1 (DXT1, half a byte per pixel) shows the same and halves the textures'
// memory (TODO #55). Phones transcode ETC1S to ETC1/ETC2 already
if (ktx2Loader.workerConfig.dxtSupported) ktx2Loader.workerConfig.bptcSupported = false
// Its decoder (0.5 MB of WebAssembly) fetched at once: otherwise only with the first texture, among the tiles
ktx2Loader.init()
watchTextures(ktx2Loader)

// Telemetry on texture decoding (2026-10-24: an iPad Air's tiles came without their textures, about 3 MB each instead
// of 12, and its first view never came): the formats the GPU takes, the first texture's decoding time, and a report
// when one takes over TEXTURE_SLOW s (once) or fails (at most TEXTURE_ERRORS times)
const TEXTURE_SLOW = 10
const TEXTURE_ERRORS = 3
function watchTextures(loader) {
  const c = loader.workerConfig
  log('textures', { astc: c.astcSupported, etc1: c.etc1Supported, etc2: c.etc2Supported, dxt: c.dxtSupported, bptc: c.bptcSupported, pvrtc: c.pvrtcSupported })
  const create = loader._createTexture.bind(loader)
  let first = true
  let slowLogged = false
  let errors = 0
  let pending = 0
  loader._createTexture = (buffer, config) => {
    const started = performance.now()
    pending++
    const slow = setTimeout(() => {
      if (slowLogged) return
      slowLogged = true
      log('texture-slow', { after: TEXTURE_SLOW, pending, bytes: buffer.byteLength })
    }, TEXTURE_SLOW * 1000)
    const done = () => {
      clearTimeout(slow)
      pending--
    }
    return create(buffer, config).then((texture) => {
      done()
      if (first) {
        first = false
        log('texture-first', { ms: Math.round(performance.now() - started), format: texture.format, size: `${texture.image?.width}x${texture.image?.height}` })
      }
      return texture
    }, (error) => {
      done()
      if (++errors <= TEXTURE_ERRORS) log('texture-error', errorText(error))
      throw error
    })
  }
}

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
  // Until a season is chosen (the slider, a link, kept settings): today's (seasonOfDate)
  season: params.has('season') ? Number(params.get('season')) : seasonOfDate(),
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

// Rebuilds every material after a change of display mode (sky, relief, wet, mesh): the scene's, and the loaded tiles
// not shown now, which the library keeps out of the scene (Christian, 2026-10-24: in the mesh view, moving back showed
// tiles with their texture)
function rebuildMaterials() {
  const roots = [scene]
  for (const tiles of tilesets) tiles.forEachLoadedModel((model) => { if (!model.parent) roots.push(model) })
  for (const root of roots) root.traverse((child) => {
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
  // Underwater the sun's direction also sets the caustics and its glare in the water; its strength on the surfaces
  // follows the water above (renderLoop, underwater.sunThrough)
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
  if (on) underwaterReached()
  look.underwater = on
  underwater.setOn(on)
  underwaterButton.setAttribute('aria-pressed', String(on))
  // The tour's button (tour.js), in both views (Christian, 2026-10-24: in dive mode too), hidden while it plays
  document.querySelector('.tour-button').hidden = !document.querySelector('.tour-card').hidden
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
// On a computer, outside the water too (Christian, 2026-10-24), its line and help saying what the keys do there
const swimKeys = document.querySelector('.swim-keys')
function labelKeys(swimming) {
  swimKeys.setAttribute('aria-label', t(swimming ? 'swimKeys' : 'keysLabel'))
  swimKeys.querySelector('.swim-hint').textContent = t(swimming ? 'swimHint' : 'keysHint')
  swimHelpButton.setAttribute('aria-label', t(swimming ? 'swimHelpTitle' : 'keysHelpTitle'))
  swimHelpButton.dataset.tooltip = t(swimming ? 'swimHelpTitle' : 'keysHelpTitle')
}
// The diver can't go through the model: each move stops short of the surfaces and slides along them (collide.js)
const collider = createCollider(() => [...tilesets.map((tiles) => tiles.group), ...contextModels])
if (import.meta.env.DEV) window.l21.collider = collider
// Outside the water, the same keys move the camera and the orbit's centre together (the orbit kept as it was), at
// the swimming speed times the orbit's distance over SWIM_TARGET (at least once)
const walked = new THREE.Vector3()
const swim = createSwim({
  camera,
  element: renderer.domElement,
  move: (position, step) => {
    walked.copy(position)
    collider.move(position, step)
    if (!swim.looking) controls.target.add(walked.subVectors(position, walked))
  },
  speed: () => (swim.looking ? 1 : Math.max(1, camera.position.distanceTo(controls.target) / SWIM_TARGET)),
  onKey: (code, down) => {
    const arrow = { ArrowUp: 'KeyW', ArrowDown: 'KeyS', ArrowLeft: 'KeyA', ArrowRight: 'KeyD' }[code] ?? code
    swimKeys.querySelector(`[data-code="${arrow}"]`)?.toggleAttribute('data-down', down)
  },
})
// The card's keys are buttons too (TODO #61): held with the mouse or a finger, a key moves as on the keyboard (its own
// pointer: several can be held at once, and one released outside its button still stops)
for (const key of swimKeys.querySelectorAll('.swim-key')) {
  const code = key.dataset.code
  key.setAttribute('aria-label', t({ KeyW: 'keyForward', KeyS: 'keyBack', KeyA: 'keyLeft', KeyD: 'keyRight' }[code]))
  key.addEventListener('pointerdown', (event) => {
    key.setPointerCapture(event.pointerId)
    swim.press(code, true)
  })
  const release = () => swim.press(code, false)
  key.addEventListener('pointerup', release)
  key.addEventListener('pointercancel', release)
  key.addEventListener('lostpointercapture', release)
  // Keyboard on the button itself (Space, Enter): one press, as a short tap
  key.addEventListener('click', (event) => {
    if (event.detail !== 0) return
    swim.press(code, true)
    setTimeout(() => swim.press(code, false), 250)
  })
}
// The keys from the start, outside the water
swim.setActive(true, false)
// The keyboard's own letters for those positions (AZERTY: Z, Q, S, D), where the browser tells them
navigator.keyboard?.getLayoutMap?.().then((layout) => {
  for (const key of swimKeys.querySelectorAll('.swim-key')) {
    const letter = layout.get(key.dataset.code)
    if (letter) key.querySelector('kbd').textContent = letter.toUpperCase()
  }
}).catch(() => {})
/** @param {boolean} on */
function setSwimming(on) {
  if (on === swim.looking) return
  controls.enabled = !on
  swim.setActive(true, on)
  labelKeys(on)
  // After the switch: the help picks its text from it (swimming, not the keys outside the water)
  if (on) showSwimHelp()
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
labelKeys(false)
// Shown from the start on a computer (not on a phone: no keys)
const showKeys = () => {
  swimKeys.hidden = mobile
}
showKeys()
swimHelpButton.addEventListener('click', () => openSwimHelp())

// The guided tour (tour.js, tour-steps.js; TODO #48): in both views (Christian, 2026-10-24: in dive mode too). Diving,
// the swim is suspended while it plays (the tour drives the camera as the orbit does) and taken up again from where it
// ends; the movement keys hidden meanwhile (its card takes the bottom of the view). ?tour=1 starts it after the first
// view
const tour = createTour({
  steps: TOUR_STEPS,
  camera,
  controls,
  requestRender: () => requestRender(),
  log,
  // The step in the address (#tour-3, for debugging: Christian, 2026-10-24), each replacing the last (no new history
  // entry), gone when the tour ends
  onStep: (i) => {
    tourHash = i >= 0 ? `#tour-${i + 1}` : ''
    updateAddress()
  },
  // The free height above a point: a ray up to the model's surfaces (tiles, context)
  headroom: (position) => {
    pickRay.set(position, UP)
    pickRay.far = 30
    const hit = pickRay.intersectObjects([...tilesets.map((tiles) => tiles.group), ...contextModels, ...mockupModels], true)[0]
    pickRay.far = Infinity
    return hit ? hit.distance : Infinity
  },
  onStart: () => {
    setSwimming(false)
    swimKeys.hidden = true
  },
  onEnd: () => {
    setSwimming(underwater.on && !mobile)
    showKeys()
  },
})
tour.button.hidden = false
// Home: straight back to the start view (START_VIEW, as at the start: stepped back on a narrow frame), at once
// (Christian, 2026-10-25), the tour stopped if it was on. Diving, the swim starts again from there
const homeButton = document.querySelector('.home-button')
homeButton.hidden = false
homeButton.addEventListener('click', () => {
  tour.stop()
  setSwimming(false)
  const cam = startView(container.clientWidth / container.clientHeight)
  camera.position.set(cam[0], cam[1], cam[2])
  controls.target.set(cam[3], cam[4], cam[5])
  controls.update()
  setSwimming(underwater.on && !mobile)
  updateAddress()
  requestRender()
  log('home', {})
})
if (params.get('tour') === '1') firstView.then(() => tour.start())
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
  const swimming = swim.looking
  swimHelp.querySelector('h2').textContent = t(swimming ? 'swimHelpTitle' : 'keysHelpTitle')
  swimHelp.querySelector('.swim-help-text').innerHTML = t(swimming ? 'swimHelpText' : 'keysHelpText', {
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
  keepCamera()
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
// The season strip unrolls leftward from the 🤿 button
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
    // Phones: no relief at all (TODO #22): at the finest level the normal maps weigh as much as the photo
    if (!mobile && !tile.children?.length) return
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
  loadWatch = { started: performance.now(), arrived: 0, seen: 0, progressAt: performance.now(), errors: 0, reports: 0, said: null }
  const manifest = await (await fetch(`${tilesUrl}/manifest.json`, { cache: 'no-cache' })).json()
  if (load !== loadCount) return
  unloadModel()
  zoneEntries = manifest.tilesets
  colorBalance()
  // One memory budget shared by all zones: a per-zone share (budget / zone count) filled up after 2 or 3
  // large textures and stopped loading, leaving zones missing on phones.
  let sharedCache = null
  tilesets = manifest.tilesets.map((entry) => {
    // Phones and tablets: the zone's light set where it has one (tile_zone.ps1 -Light: textures halved, no relief;
    // the finest tiles about five times lighter), the same tiling
    const tiles = new TilesRenderer(`${tilesUrl}/${lightSet && entry.light ? entry.light : entry.url}`)
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
    setDetail(tiles)
    coarseFirst(tiles)
    tiles.setCamera(tilesCamera)
    tiles.setResolutionFromRenderer(tilesCamera, renderer)

    // Counted (the loading card, LOAD_ERRORS); only the first TILE_ERRORS_LOGGED of a visit are sent
    tiles.addEventListener('load-error', ({ error, url }) => {
      loadWatch.errors++
      if (++tileErrors <= TILE_ERRORS_LOGGED) log('tile-error', { zone: entry.id, url: String(url ?? '').slice(-200), ...errorText(error) })
    })
    tiles.addEventListener('load-model', ({ scene: model, tile }) => {
      // Memory (the iPad Air, 2026-10-24: Safari closed the page): the library keeps each tile's whole glTF result,
      // its parser holding the downloaded file (a second copy of the tile); nothing reads it once the tile is in
      tile.engineData.metadata = null
      loadWatch.arrived++
      // Smaller textures (capTileTextures), before the surfaces are set up; its memory counted again
      // (the library keeps its first count of each tile: forgotten first)
      if (capTileTextures(model, !tile.children?.length)) {
        tiles._bytesUsed?.delete(tile)
        tiles.recalculateBytesUsed(tile)
      }
      model.traverse((child) => {
        if (child.isMesh) initSurface(child, entry.id)
        if (child.isMesh) releaseAfterUpload(child.userData.surface)
      })
    })
    tiles.addEventListener('dispose-model', ({ scene: model }) => {
      model.traverse((child) => child.material?.dispose())
      requestRender()
    })
    tiles.addEventListener('load-model', requestRender)
    // Another pass wanted: a tile's children prepared a few at a time (maxTilesProcessed), then the traversal goes on.
    // Unheard, it stopped until the camera moved: far zones stayed missing at a still view (Christian, 2026-10-24)
    tiles.addEventListener('needs-update', requestRender)
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
// The curious bass underwater (bass.js, TODO #56): when the camera stays still, it comes to look at the diver; its path
// clear of the surfaces (collide.js)
const bass = createBass({
  when: params.get('bass') === '1' ? firstView : afterFirstViewUnderwater,
  prepare: prepareCreatureMaterial,
  clearance: (point) => collider.distanceTo(point, collider.surfacesNear(point, 0.6), 0.6),
  visibility: () => underwater.visibility,
  // Seen from the camera: nothing of the model in between (pickRay, touch navigation's raycaster)
  inSight: (from, to) => {
    const direction = to.clone().sub(from)
    const distance = direction.length()
    pickRay.set(from, direction.normalize())
    pickRay.far = distance
    const hit = pickRay.intersectObjects([...tilesets.map((tiles) => tiles.group), ...contextModels], true)[0]
    pickRay.far = Infinity
    return !hit
  },
  // Its pace by the season's water temperature: winter, spring, summer, autumn (SEASONS' order)
  pace: () => [0.4, 0.7, 1, 0.8][Math.round(look.season)] ?? 1,
  // Debug: ?bass=1 shows it at once and all the time
  always: params.get('bass') === '1',
})
scene.add(bass.object)
if (import.meta.env.DEV) window.l21.bass = bass
// A few fish here and there underwater (fishes.js, Christian, 2026-10-24): the bass's model shared, FISHES on a
// computer, FISHES_PHONE on a phone; after the first view, once underwater
const FISHES = 4
const FLOOR_REACH = 10
const DOWN = new THREE.Vector3(0, -1, 0)
const floorFrom = new THREE.Vector3()
const FISHES_PHONE = 2
const fishes = createFishes({
  count: mobile ? FISHES_PHONE : FISHES,
  when: afterFirstViewUnderwater,
  prepare: prepareCreatureMaterial,
  clearance: (point) => collider.distanceTo(point, collider.surfacesNear(point, 0.6), 0.6),
  inSight: (from, to) => {
    const direction = to.clone().sub(from)
    const distance = direction.length()
    pickRay.set(from, direction.normalize())
    pickRay.far = distance
    const hit = pickRay.intersectObjects([...tilesets.map((tiles) => tiles.group), ...contextModels], true)[0]
    pickRay.far = Infinity
    return !hit
  },
  visibility: () => underwater.visibility,
  pace: () => [0.4, 0.7, 1, 0.8][Math.round(look.season)] ?? 1,
  // The floor below a point: a ray down from just above it, FLOOR_REACH m at most
  floor: (point) => {
    pickRay.set(floorFrom.copy(point).setY(point.y + 0.5), DOWN)
    pickRay.far = FLOOR_REACH
    const hit = pickRay.intersectObjects([...tilesets.map((tiles) => tiles.group), ...contextModels], true)[0]
    pickRay.far = Infinity
    return hit ? hit.point.y : null
  },
})
scene.add(fishes.object)
if (import.meta.env.DEV) window.l21.fishes = fishes
// The diver's arm and its light, while underwater with the light on: the beam starts at the drawn light
// The dive computer on its wrist, a Perdix 3, its screen live (dive-computer.js, TODO #65)
const diveComputer = createDiveComputer({ surfaceY: SURFACE_Y })
const diverArm = createDiverArm({ onLampPose: (front, axis) => underwater.setLampPose(front, axis), screen: diveComputer.material, when: afterFirstViewUnderwater })
if (import.meta.env.DEV) window.l21.diverArm = diverArm
// The river's current (m/s, world): west to east, 35 ft/min (measured 2024-06-08)
const RIVER_CURRENT = new THREE.Vector3((35 * 0.3048) / 60, 0, 0)
/** @param {THREE.Material} material */
function prepareCreatureMaterial(material, { tint = false } = {}) {
  // After its own patches (the crayfish's blue claws)
  const own = material.onBeforeCompile
  const key = material.customProgramCacheKey?.() ?? ''
  material.onBeforeCompile = (shader, renderer) => {
    own?.call(material, shader, renderer)
    underwater.patchShader(shader)
  }
  // tint: its colour changes (each bass its own: fishes.js), the same program for all (the colour is a uniform)
  material.customProgramCacheKey = () => (tint ? `creature-${key}-tinted` : `creature-${key}-${material.color.getHexString()}`)
  // Not metal: the bass's glTF gives no metallic factor (1 by default), so it took no diffuse light from the
  // environment, dark outside the dive light's beam (Christian, 2026-10-24: lit by the environment, as the surfaces)
  if ('metalness' in material) material.metalness = 0
  return withShadowCascades(material)
}
// The mockups of the zones not yet online: their own textures from the .blend (Christian, 2026-10-24: the 1988 drawing
// through each mockup's colour ramp, computed by export_mockups.py), lit as the context (sky, sun, shadows, water);
// they were the south wall's texture tinted purple
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
      when: firstView,
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
    initSurface(child, null)
  })
  scene.add(model)
  mockupModels.push(model)
  requestRender()
}

function showError(error) {
  log('load-failed', errorText(error))
  status.showError(error.message, retryLoad)
  console.error(error)
}

live.tiles = (v) => { tilesUrl = v || DEFAULT_TILES_URL; loadModel().catch(showError) }
/** The other set of tiles when the choice or the profile changes it (the camera kept) */
function switchTileSet() {
  const now = lightTextures()
  if (now === lightSet) return
  lightSet = now
  log('tile-set', { set: lightSet ? 'light' : 'full', choice: texturesChoice || 'auto' })
  if (zoneEntries.some((entry) => entry.light)) loadModel().catch(showError)
}
live.textures = (v) => {
  texturesChoice = v
  switchTileSet()
}
live.profile = (v) => {
  mobile = isMobile(v)
  showKeys()
  profile = PROFILES[mobile ? 'mobile' : 'desktop']
  renderer.setPixelRatio(profile.pixelRatio)
  composer?.setPixelRatio(profile.pixelRatio)
  const cache = tilesets[0]?.lruCache
  if (cache) {
    cache.maxBytesSize = profile.maxBytes
    cache.minBytesSize = profile.maxBytes * 0.6
  }
  tilesets.forEach(setDetail)
  if (aoPass) aoQuality()
  resize()
  // The other set of tiles (light on phones)
  switchTileSet()
}

function resize() {
  camera.aspect = container.clientWidth / container.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(container.clientWidth, container.clientHeight)
  composer?.setSize(container.clientWidth, container.clientHeight)
  syncTilesCamera()
  tilesets.forEach((tiles) => tiles.setResolutionFromRenderer(tilesCamera, renderer))
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
/** The camera, kept for a reload (CAM_KEY) */
function keepCamera() {
  try {
    sessionStorage.setItem(CAM_KEY, [...camera.position.toArray(), ...controls.target.toArray()].map((n) => n.toFixed(2)).join(','))
  } catch {}
}
// The tour's step in the address (#tour-3, for debugging; Christian, 2026-10-24: always, no setting): gone as soon as
// the visitor moves freely (the mouse or a finger on the model, the wheel, the movement keys); the next step puts it back
let tourHash = startHash
const freeMove = () => {
  if (!tourHash) return
  tourHash = ''
  updateAddress()
}
renderer.domElement.addEventListener('pointerdown', freeMove)
renderer.domElement.addEventListener('wheel', freeMove, { passive: true })
window.addEventListener('keydown', (event) => {
  if (/^(Key[WASD]|Arrow(Up|Down|Left|Right))$/.test(event.code)) freeMove()
})
// Nothing the viewer is given may scroll the page around it (TODO #70): the viewer's page itself never scrolls, so the
// browser handed on to the /modele page what it didn't use: the wheel while the orbit is off (the tour, swimming,
// a flight), the middle button's autoscroll (Windows: moving the mouse then scrolled the page), and the scrolling
// keys. Only the settings panel and the dialogs scroll, inside themselves
const scrollsInside = (target) => target instanceof Element && target.closest('l21-settings-panel, dialog')
window.addEventListener('wheel', (event) => {
  if (!scrollsInside(event.target)) event.preventDefault()
}, { passive: false })
window.addEventListener('mousedown', (event) => {
  if (event.button === 1) event.preventDefault()
})
window.addEventListener('keydown', (event) => {
  if (!/^(Space|PageUp|PageDown|Home|End|Arrow(Up|Down|Left|Right))$/.test(event.code)) return
  if (scrollsInside(event.target) || (event.target instanceof Element && event.target.closest('input, select, textarea, button'))) return
  event.preventDefault()
})
function updateAddress() {
  keepCamera()
  const hash = tourHash
  history.replaceState(null, '', viewUrl() + hash)
  // The /modele page shows the same query string in its own address, so that copying it shares this view
  if (embedded) window.parent.postMessage({ type: 'lock21:cam', search: location.search, hash }, location.origin)
}
let urlTimer = 0
controls.addEventListener('change', () => {
  keepCamera()
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
/** The first view drawn: something is shown, and no tile of the first level with content (the coarsest, drawn first)
 *  is still loading in any zone; the finer levels then refine it */
function firstViewDrawn() {
  let visible = 0
  for (const tiles of tilesets) {
    visible += tiles.visibleTiles.size
    // Only tiles in the view: a zone behind the camera or off to the side does not hold the card (2026-10-24: zone 18,
    // out of view, came last on a slow connection and kept « Chargement » up)
    for (const tile of tiles.loadingTiles) if (tile.internal.depthFromRenderedParent <= 1 && tile.traversal.inFrustum) return false
  }
  return visible > 0
}
// The first view watched (Christian, 2026-10-24: an iPad Air stayed on « Chargement » with no word why): after
// LOAD_SLOW s the card says it is longer than usual; no tile in for LOAD_STALLED s while some are pending, or
// LOAD_ERRORS tiles failed: it says so and offers « Réessayer ». While loading, a progress report every REPORT_EVERY s
// (at most REPORTS) to the telemetry
const LOAD_SLOW = 20
const LOAD_STALLED = 20
const LOAD_ERRORS = 5
const REPORT_EVERY = 10
const REPORTS = 9
const TILE_ERRORS_LOGGED = 5
let tileErrors = 0
// arrived: tiles in since the load started (seen: as of the last look), progressAt: when the last came in
let loadWatch = { started: 0, arrived: 0, seen: 0, progressAt: 0, errors: 0, reports: 0, said: null }
// Download and decode the coarsest level first, every zone's (Christian, 2026-10-24: an old iPad, a phone): the
// library puts first the tile with the largest error on screen, so a fine tile close to the camera came before
// another zone's coarse one, and the 25 downloads at a time shared the bandwidth: at 5 Mbit/s, nothing was drawn for
// 22 s. Among the tiles of the same level, the library's own order. Phones: DOWNLOADS_PHONE at a time. The queues are
// shared by every zone: set once.
const DOWNLOADS_PHONE = 6
function coarseFirst(tiles) {
  for (const queue of [tiles.downloadQueue, tiles.parseQueue]) {
    if (queue.coarseFirst) continue
    queue.coarseFirst = true
    const own = queue.priorityCallback
    queue.priorityCallback = (a, b) => {
      const da = a.internal?.depthFromRenderedParent
      const db = b.internal?.depthFromRenderedParent
      if (da !== undefined && db !== undefined && da !== db && a.traversal?.used && b.traversal?.used) return da < db ? 1 : -1
      return own(a, b)
    }
  }
  if (mobile) tiles.downloadQueue.maxJobsPerOrigin = DOWNLOADS_PHONE
}
function retryLoad() {
  log('retry', tileFacts())
  loadModel().catch(showError)
}
function watchLoading(pending) {
  const now = performance.now()
  const w = loadWatch
  if (w.arrived !== w.seen) {
    w.seen = w.arrived
    w.progressAt = now
  }
  if (now - w.started > (w.reports + 1) * REPORT_EVERY * 1000 && w.reports < REPORTS) {
    w.reports++
    let visible = 0
    let shallow = 0
    for (const t of tilesets) {
      visible += t.visibleTiles.size
      for (const tile of t.loadingTiles) if (tile.internal.depthFromRenderedParent <= 1) shallow++
    }
    const stats = (key) => tilesets.reduce((n, t) => n + t.stats[key], 0)
    log('progress', {
      ...tileFacts(), first: status.active, roots: rootsLoaded, queued: stats('queued'), downloading: stats('downloading'),
      parsing: stats('parsing'), failed: stats('failed'), visible, shallow, errors: w.errors,
      stillFor: Math.round((now - w.progressAt) / 1000), canvas: `${renderer.domElement.width}x${renderer.domElement.height}`,
    })
  }
  if (!status.active) return
  let said = light ? 'light' : null
  if (w.errors >= LOAD_ERRORS) said = 'errors'
  else if (pending > 0 && now - w.progressAt > LOAD_STALLED * 1000) said = 'stalled'
  else if (now - w.started > LOAD_SLOW * 1000) said = 'slow'
  if (said === 'slow') status.note(t('loadSlow', { n: w.arrived }))
  else if (said !== w.said) {
    if (said === 'errors') status.note(t('loadErrors', { n: w.errors }), retryLoad)
    else if (said === 'stalled') status.note(t('loadStalled'), retryLoad)
    else if (said === 'light') status.note(t('loadLight'))
    else status.note(null)
  }
  if (said !== w.said && said && said !== 'light') log('loading-note', { note: said, ...tileFacts(), errors: w.errors })
  w.said = said
}
function updateLoading() {
  if (!status.busy) return
  let loaded = 0
  let pending = 0
  for (const t of tilesets) {
    loaded += t.stats.loaded
    pending += t.stats.queued + t.stats.downloading + t.stats.parsing
  }
  watchLoading(pending)
  // The first view drawn (firstViewDrawn): the card gives way to the thin « Affinage des
  // détails » bar (loading.js), which stays while the finer detail keeps arriving
  if (status.active && rootsLoaded && firstViewDrawn()) {
    status.refine()
    firstViewReached()
    log('first-view', tileFacts())
  }
  // Right after the roots, nothing is queued for a moment (the next tiles are only asked on the next update): done
  // once nothing has been pending for 800 ms in a row
  if (!rootsLoaded || pending > 0) idleSince = 0
  else if (!idleSince) idleSince = performance.now()
  else if (performance.now() - idleSince > 800) {
    // Nothing left to load, but the first view never came (its tiles failed): the error, with « Réessayer »
    if (status.active && loadWatch.errors) {
      firstViewReached()
      log('load-failed', { msg: 'tiles failed', ...tileFacts() })
      status.showError(t('loadErrors', { n: loadWatch.errors }), retryLoad)
      return
    }
    status.done()
    firstViewReached()
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
    tileErrors,
    cacheMB: Math.round((cache?.cachedBytes || 0) / 1e6),
    maxMB: Math.round(profile.maxBytes / 1e6),
    zones: tilesets.length,
  }
}
setEndFacts(tileFacts)

// The orbiting camera lower than its point (looking up): a surface between them (the floor, a wall) brings it in
// front of that surface, IN_FRONT m short, so it never looks from under the floor or inside a wall
const IN_FRONT = 0.2
const frontRay = new THREE.Raycaster()
frontRay.firstHitOnly = true
const toCamera = new THREE.Vector3()
function keepInFront() {
  if (camera.position.y >= controls.target.y) return
  toCamera.subVectors(camera.position, controls.target)
  const distance = toCamera.length()
  if (distance < 1e-3) return
  toCamera.divideScalar(distance)
  frontRay.set(controls.target, toCamera)
  frontRay.far = distance
  const hit = frontRay.intersectObjects([...tilesets.map((tiles) => tiles.group), ...contextModels], true)[0]
  if (hit) camera.position.copy(controls.target).addScaledVector(toCamera, Math.max(0.05, hit.distance - IN_FRONT))
}

// Underwater, the diver never under the floor (Christian, 2026-10-24): orbiting or panning (no collisions there), a gap
// between tiles, or finer tiles not loaded yet could take the camera below it. A ray up from the camera that meets a
// surface facing up (a floor seen from below; a ceiling faces down) within FLOOR_CHECK m brings it back FLOOR_CLEAR m
// above that floor (the swimmer's distance from the surfaces), the orbit's point with it
const FLOOR_CHECK = 4
const FLOOR_CLEAR = 0.6
const UP = new THREE.Vector3(0, 1, 0)
const floorRay = new THREE.Raycaster()
floorRay.firstHitOnly = true
const floorNormal = new THREE.Vector3()
function keepAboveFloor() {
  floorRay.set(camera.position, UP)
  floorRay.far = FLOOR_CHECK
  const hit = floorRay.intersectObjects(collider.surfacesNear(camera.position, FLOOR_CHECK), false)[0]
  if (!hit?.face) return false
  floorNormal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld)
  if (floorNormal.y < 0.5) return false
  const rise = hit.point.y + FLOOR_CLEAR - camera.position.y
  camera.position.y += rise
  if (!swim.looking) controls.target.y += rise
  return true
}

// Within the model's area (TODO #66, Christian, 2026-10-24), in both views and whatever the navigation: the whole
// terrain (the context: Christian, 2026-10-24, it was the zones' bounds only, and zone 18 stopped the camera going
// west), and the zones' bounds SITE_MARGIN m wider on every side to step back and see the whole lock; a camera
// that leaves them horizontally is brought back to their edge, the orbit's point moved with it (the view keeps its
// angle). Underwater it also stays below the surface (the render loop)
const SITE_MARGIN = 10
const site = new THREE.Box3()
const zoneBox = new THREE.Box3()
const terrainBox = new THREE.Box3()
let siteFor = null
function siteBounds() {
  // Computed again when the tile sets or the context models change (the context arrives after the zones)
  const key = `${tilesets.length}:${contextModels.length}`
  if (siteFor === key && !site.isEmpty()) return site
  site.makeEmpty()
  for (const tiles of tilesets) {
    if (!tiles.getBoundingBox(zoneBox)) continue
    tiles.group.updateMatrixWorld()
    site.union(zoneBox.applyMatrix4(tiles.group.matrixWorld))
  }
  if (site.isEmpty()) return null
  site.expandByScalar(SITE_MARGIN)
  for (const model of contextModels) site.union(terrainBox.setFromObject(model))
  siteFor = key
  return site
}
function keepInSite() {
  const bounds = siteBounds()
  if (!bounds) return false
  const x = THREE.MathUtils.clamp(camera.position.x, bounds.min.x, bounds.max.x) - camera.position.x
  const z = THREE.MathUtils.clamp(camera.position.z, bounds.min.z, bounds.max.z) - camera.position.z
  if (!x && !z) return false
  camera.position.x += x
  camera.position.z += z
  if (!swim.looking) {
    controls.target.x += x
    controls.target.z += z
  }
  return true
}

// Paused while AR runs (android-ar.js has its own renderer)
let lastFrame = performance.now()
// Underwater, the share of the sun's lost direct light given back as the sky's diffuse light
const SUN_TO_SKY = 0.5
function renderLoop() {
  updateStats()
  // update() returns true while the camera moves (including the damping glide after a gesture); swimming: the keys
  // and the drag move the camera (swim.js), the address follows
  if (swim.looking) {
    if (swim.update()) swimMoved()
  } else if (tour.update()) {
    // The tour moves the camera (a flight between its steps, or a move): no other navigation meanwhile
    needsRender = true
  } else {
    // The movement keys (swim.js) move the camera and the orbit's centre; the orbit follows (its change event)
    if (swim.update()) needsRender = true
    // Touch and double-tap navigation (touch-nav.js): a flight to a point, the orbit's centre kept ahead
    if (touchNav.update()) needsRender = true
    // The left button's turn around the point pressed: its glide after release
    if (pointerOrbit.update()) needsRender = true
    if (controls.update()) {
      keepInFront()
      needsRender = true
    }
  }
  // Within the site, in both views (keepInSite)
  if (keepInSite()) needsRender = true
  // Underwater: the camera stays below the surface, and the caustics and particles move (a frame every time)
  if (underwater.on) {
    if (camera.position.y > SURFACE_Y - 0.5) camera.position.y = SURFACE_Y - 0.5
    if (keepAboveFloor()) needsRender = true
    // The diver's arm first: the beam follows the light it holds
    diverArm.setVisible(underwater.lampVisible)
    diverArm.update(camera)
    underwater.update(camera)
    // The sun on the surfaces: only as much as gets through the water above; what it lost comes as diffuse light
    // from the sky above (no sun patches in murky water: Christian, 2026-10-23). Back to updateLights in the air
    const through = underwater.sunThrough
    csm.lights.forEach((light) => { light.intensity = Math.PI * look.sunIntensity * through })
    scene.environmentIntensity = look.skyIntensity + SUN_TO_SKY * look.sunIntensity * (1 - through)
    buildParticleField()
    needsRender = true
  }
  // The crayfish move while the camera is near them
  const now = performance.now()
  const dt = Math.min((now - lastFrame) / 1000, 0.1)
  lastFrame = now
  for (const crawfish of crawfishes) if (crawfish.update(camera, dt)) needsRender = true
  if (bass.update(camera, dt, underwater.on)) needsRender = true
  if (fishes.update(camera, dt, underwater.on)) needsRender = true
  // The dive goes on while underwater (its time, depth, gas), the computer's screen redrawn once a second
  if (underwater.on) diveComputer.update(camera, dt)
  const loading = tilesets.some((t) => t.stats.queued + t.stats.downloading + t.stats.parsing > 0)
  updateLoading()
  if (!needsRender && !loading) return
  needsRender = false
  camera.updateMatrixWorld()
  syncTilesCamera()
  tilesets.forEach((tiles) => tiles.update())
  drawScene()
}
// The compass (below the settings): its red tip toward magnetic north, as a diver's compass (Christian, 2026-10-25),
// as the view turns. TRUE_HEADING: the true bearing of the scene's -z axis (the .blend's +Y), degrees clockwise from
// north, the same as make_kmz.py -H: Nick Baets' north arrow on the zone map is 30.0° clockwise from it, taken as true
// north (Christian, 2026-10-25). The magnetic declination there on the day of the visit (Christian, 2026-10-25: the
// actual magnetic north): NOAA's IGRF 2025 at the lock, -12.87° on 2026-09-21, changing by +0.0804° a year (valid
// until the model's next edition, 2030)
const TRUE_HEADING = -30
const DECLINATION_2026 = -12.87
const DECLINATION_RATE = 0.0804
const DECLINATION_EPOCH = Date.UTC(2026, 8, 21)
const declination = DECLINATION_2026 + (DECLINATION_RATE * (Date.now() - DECLINATION_EPOCH)) / (365.25 * 86400e3)
const NORTH_HEADING = TRUE_HEADING - declination
const compassRose = document.querySelector('.compass-rose')
compassRose.querySelector('.compass-w').textContent = t('compassWest')
const compassAxis = new THREE.Vector3()
let compassBearing = NaN
function updateCompass() {
  // The bearing of the view: where the camera looks, or, looking straight down, the screen's top
  camera.getWorldDirection(compassAxis)
  if (Math.hypot(compassAxis.x, compassAxis.z) < 0.01) compassAxis.set(0, 1, 0).applyQuaternion(camera.quaternion)
  const bearing = THREE.MathUtils.radToDeg(Math.atan2(compassAxis.x, -compassAxis.z)) + NORTH_HEADING
  if (Math.abs(bearing - compassBearing) < 0.2) return
  compassBearing = bearing
  compassRose.setAttribute('transform', `rotate(${(-bearing).toFixed(1)})`)
}
function drawScene() {
  updateCompass()
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

// A lost WebGL context (graphics memory short, the page in the background) comes back empty: the tiles' textures have
// dropped their data (releaseAfterUpload), so the model loads again
renderer.domElement.addEventListener('webglcontextrestored', () => loadModel().catch(showError))
loadModel().catch(showError)
