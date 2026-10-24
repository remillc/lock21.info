// The guided tour (TODO #48, Christian, 2026-10-24): its steps (tour-steps.js) one after the other, each with its card
// (bottom centre: the step's number, title and text, back and next, a close button). A view: the camera flies there,
// then the visitor may look around (the usual navigation). A move: the camera flies to its start, then travels along
// its points at its pace, the navigation off until it arrives.
// The flight between steps: a curve from where the camera is to the step's camera, rising above the site when the way
// is long (over the walls rather than through them) and arriving along the step's own line of sight (from behind
// the camera, as one walks up to a view); the point looked at glides from one to the other. Its length follows the
// distance. Back and next during a flight or a move start from where the camera is.
import * as THREE from 'three'
import { lang, t } from './i18n.js'

// The flight: its length (s) at least, at most, and per metre; above FLY_HIGH m of way, it rises by FLY_RISE of the
// way, at most FLY_RISE_MAX m; it arrives along the step's line of sight over FLY_BACK of the way, at most FLY_BACK_MAX m
// and per radian the line of sight turns (a half turn over 3 s more: Christian, 2026-10-24, from step 4 to 5 it turned
// too fast)
const FLY_TIME = [1.5, 8]
const FLY_PER_METRE = 0.08
const FLY_PER_RADIAN = 1
const FLY_HIGH = 8
const FLY_RISE = 0.25
const FLY_RISE_MAX = 12
const FLY_BACK = 0.3
const FLY_BACK_MAX = 8
// A move: a pause at its start (s) before it sets off (its step's wait otherwise)
const MOVE_PAUSE = 0.5
// A flight through a step's approach points: its length (s) at least, at most, and per metre of its curve; turning
// early, the point looked at reaches the step's within this share of the flight
const APPROACH_TIME = [2, 9]
const APPROACH_PER_METRE = 0.12

const UP = new THREE.Vector3(0, 1, 0)
const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2)
// A move's speed: from rest, up to twice its pace in the middle, to rest (its mean is the pace)
const travelEase = (k) => k - Math.sin(2 * Math.PI * k) / (2 * Math.PI)

/** @param {number[]} cam - x, y, z, then the point looked at */
const camOf = (cam) => ({ position: new THREE.Vector3(cam[0], cam[1], cam[2]), target: new THREE.Vector3(cam[3], cam[4], cam[5]) })

/**
 * @param {object} options
 * @param {import('./tour-steps.js').TourStep[]} options.steps
 * @param {THREE.PerspectiveCamera} options.camera
 * @param {import('three/addons/controls/OrbitControls.js').OrbitControls} options.controls
 * @param {() => void} options.requestRender
 * @param {() => void} [options.onStart] - the tour starts (the standard view, the movement keys hidden)
 * @param {() => void} [options.onEnd] - the tour ends
 * @param {(type: string, data?: object) => void} [options.log] - telemetry
 */
export function createTour({ steps, camera, controls, requestRender, onStart, onEnd, log }) {
  const button = /** @type {HTMLButtonElement} */ (document.querySelector('.tour-button'))
  const card = /** @type {HTMLElement} */ (document.querySelector('.tour-card'))
  const count = card.querySelector('.tour-count')
  const title = card.querySelector('.tour-title')
  const text = card.querySelector('.tour-text')
  const prev = /** @type {HTMLButtonElement} */ (card.querySelector('.tour-prev'))
  const next = /** @type {HTMLButtonElement} */ (card.querySelector('.tour-next'))
  const close = /** @type {HTMLButtonElement} */ (card.querySelector('.tour-close'))
  button.querySelector('.tour-button-label').textContent = t('tourButton')
  card.setAttribute('aria-label', t('tourButton'))
  prev.textContent = t('tourPrev')
  close.setAttribute('aria-label', t('tourClose'))
  close.dataset.tooltip = t('tourClose')

  let index = -1
  /** @type {{ start: number, run: (now: number) => boolean }[]} the motions left, the first running */
  let motions = []
  let hideTimer = 0

  /**
   * A flight from where the camera is to a camera: its own curve, or through the step's approach points
   * @param {{ position: THREE.Vector3, target: THREE.Vector3 }} to
   * @param {import('./tour-steps.js').TourStep} [step]
   */
  function flight(to, step) {
    const from = { position: camera.position.clone(), target: controls.target.clone() }
    // How far the line of sight turns
    const angle = from.target.clone().sub(from.position).angleTo(to.target.clone().sub(to.position))
    let curve
    let duration
    if (step?.approach) {
      curve = new THREE.CatmullRomCurve3([from.position, ...step.approach.map((p) => new THREE.Vector3(...p)), to.position], false, 'centripetal')
      duration = THREE.MathUtils.clamp(APPROACH_TIME[0] + curve.getLength() * APPROACH_PER_METRE + angle * FLY_PER_RADIAN, APPROACH_TIME[0], APPROACH_TIME[1]) * 1000
    } else {
      const way = from.position.distanceTo(to.position)
      duration = THREE.MathUtils.clamp(FLY_TIME[0] + way * FLY_PER_METRE + angle * FLY_PER_RADIAN, FLY_TIME[0], FLY_TIME[1]) * 1000
      const rise = way > FLY_HIGH ? Math.min(way * FLY_RISE, FLY_RISE_MAX) : 0
      const back = Math.min(way * FLY_BACK, FLY_BACK_MAX)
      const look = to.target.clone().sub(to.position).normalize()
      curve = new THREE.CubicBezierCurve3(
        from.position,
        from.position.clone().addScaledVector(UP, rise),
        to.position.clone().addScaledVector(look, -back).addScaledVector(UP, rise * 0.4),
        to.position,
      )
    }
    return {
      start: 0,
      run(now) {
        const k = Math.min((now - this.start) / duration, 1)
        const e = easeInOut(k)
        // Along the curve by its length (an even pace through the approach points)
        curve.getPointAt(e, camera.position)
        // Turning first (the step's turn: within that share of the flight, easing out), or along with the flight
        const turn = step?.turn ? 1 - (1 - Math.min(k / step.turn, 1)) ** 3 : e
        controls.target.lerpVectors(from.target, to.target, turn)
        return k >= 1
      },
    }
  }

  /** A pause where the camera is */
  function pause(seconds) {
    return {
      start: 0,
      run(now) {
        return now - this.start >= seconds * 1000
      },
    }
  }

  /** A move's travel: along its points at its pace, the point looked at gliding from its first camera's to its last's */
  function travel(step) {
    const from = camOf(step.from)
    const to = camOf(step.to)
    // A smooth curve through its points (centripetal: no loops or overshoot between close points)
    const points = [from.position, ...(step.via ?? []).map((p) => new THREE.Vector3(...p)), to.position]
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal')
    const duration = (curve.getLength() / (step.pace ?? 1)) * 1000
    return {
      start: 0,
      run(now) {
        const k = Math.min((now - this.start) / duration, 1)
        const e = travelEase(k)
        curve.getPointAt(e, camera.position)
        controls.target.lerpVectors(from.target, to.target, e)
        return k >= 1
      },
    }
  }

  function show(i) {
    index = i
    const step = steps[i]
    count.textContent = t('tourCount', { n: i + 1, total: steps.length })
    title.textContent = step.title[lang] ?? step.title.fr
    text.textContent = step.text[lang] ?? step.text.fr
    prev.hidden = i === 0
    next.textContent = t(i === steps.length - 1 ? 'tourEnd' : 'tourNext')
    motions = step.kind === 'move' ? [flight(camOf(step.from), step), pause(step.wait ?? MOVE_PAUSE), travel(step)] : [flight(camOf(step.cam), step)]
    motions[0].start = performance.now()
    controls.enabled = false
    requestRender()
  }

  function start() {
    clearTimeout(hideTimer)
    onStart?.()
    button.hidden = true
    card.hidden = false
    // The next frame: from hidden, the transition needs a first style
    requestAnimationFrame(() => card.classList.add('open'))
    log?.('tour', { action: 'start' })
    show(0)
    next.focus({ preventScroll: true })
  }

  function stop() {
    if (index < 0) return
    log?.('tour', { action: 'end', step: index + 1, of: steps.length })
    index = -1
    motions = []
    controls.enabled = true
    card.classList.remove('open')
    hideTimer = setTimeout(() => {
      card.hidden = true
    }, 200)
    button.hidden = false
    onEnd?.()
    requestRender()
  }

  button.addEventListener('click', start)
  close.addEventListener('click', stop)
  prev.addEventListener('click', () => index > 0 && show(index - 1))
  next.addEventListener('click', () => (index < steps.length - 1 ? show(index + 1) : stop()))
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && index >= 0) stop()
  })

  return {
    button,
    start,
    stop,
    /** Whether the tour is on */
    get active() {
      return index >= 0
    },
    /** Each frame: the running motion; true while it moves the camera */
    update() {
      if (!motions.length) return false
      const now = performance.now()
      if (motions[0].run(now)) {
        motions.shift()
        if (motions.length) motions[0].start = now
        else controls.enabled = true
      }
      camera.lookAt(controls.target)
      return true
    },
  }
}
