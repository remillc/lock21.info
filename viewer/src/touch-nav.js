// Navigation by touch (TODO #54, Christian's choices, 2026-10-23), and a few helpers that serve the mouse too.
//
// - In the /modele page's frame on a touch screen (not full screen), one finger scrolls the page, as on a map embedded
//   in a page: the model takes two fingers (turn, and pinch to zoom). A one-finger drag shows a short hint saying so.
//   In full screen and in the viewer's own page, the usual gestures: one finger turns, two fingers pan and zoom.
// - Pinching zooms toward the fingers (OrbitControls' zoomToCursor, its centre moving along); once the camera is within
//   NEAR m of the orbit's centre, the centre moves ahead with it, so zooming in never stalls (the wheel too).
// - A double-tap (a double-click with a mouse) on the model flies there: the orbit's centre glides to that point and
//   the camera comes FLY_DISTANCE m from it (nearer only if it already was), in FLY_TIME ms.
// - The first touch shows a card with the gestures (remembered: HINT_KEY); the « ? » button shows it again.
import * as THREE from 'three'
import { TOUCH } from 'three'

const NEAR = 1
const FLY_DISTANCE = 2.5
const FLY_TIME = 700
// Two taps within DOUBLE_TAP ms and TAP_SLOP px make a double-tap
const DOUBLE_TAP = 300
const TAP_SLOP = 24
const HINT_KEY = 'l21-touch-help-seen'
const HINT_TIME = 7000
const TOAST_TIME = 1800

/**
 * @param {object} options
 * @param {import('three/examples/jsm/controls/OrbitControls.js').OrbitControls} options.controls
 * @param {THREE.PerspectiveCamera} options.camera
 * @param {HTMLElement} options.surface - the canvas
 * @param {boolean} options.embedded - in the /modele page's frame
 * @param {(x: number, y: number) => THREE.Vector3 | null} options.pick - the model's point under these client
 *   coordinates
 * @param {(key: string) => string} options.t - the interface's texts (i18n.js)
 * @param {() => void} options.requestRender
 */
export function createTouchNav({ controls, camera, surface, embedded, pick, t, requestRender }) {
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const hint = document.querySelector('.touch-hint')
  const helpButton = document.querySelector('.touch-help-button')

  // The frame's mode: one finger scrolls the page, two fingers move the model (the canvas and its container: the
  // container's touch-action: none in style.css would win otherwise)
  const framed = () => embedded && coarse && !document.fullscreenElement
  function applyMode() {
    if (framed()) {
      controls.touches.ONE = null
      controls.touches.TWO = TOUCH.DOLLY_ROTATE
      surface.style.touchAction = surface.parentElement.style.touchAction = 'pan-y'
    } else {
      controls.touches.ONE = TOUCH.ROTATE
      controls.touches.TWO = TOUCH.DOLLY_PAN
      surface.style.touchAction = surface.parentElement.style.touchAction = 'none'
    }
  }
  applyMode()
  document.addEventListener('fullscreenchange', applyMode)
  if (coarse) controls.zoomToCursor = true

  // The hint: the gestures' card (first touch, the « ? » button), or one line (a one-finger drag in the frame)
  let hintTimer = 0
  function showHint(html, time) {
    hint.innerHTML = html
    hint.hidden = false
    clearTimeout(hintTimer)
    hintTimer = setTimeout(() => (hint.hidden = true), time)
  }
  const showCard = () => showHint(`<strong>${t('touchHelpTitle')}</strong>${t(framed() ? 'touchHelpFramed' : 'touchHelpFull')}`, HINT_TIME)
  let seen = false
  try {
    seen = localStorage.getItem(HINT_KEY) === '1'
  } catch {}
  if (coarse) {
    helpButton.hidden = false
    helpButton.setAttribute('aria-label', t('touchHelpTitle'))
    helpButton.dataset.tooltip = t('touchHelpTitle')
    helpButton.addEventListener('click', showCard)
  }

  // Taps and drags (touch), for the double-tap, the first touch's card and the frame's one-finger hint
  const touches = new Map()
  let lastTap = null
  let toastShown = 0
  surface.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'touch') return
    touches.set(event.pointerId, { x: event.clientX, y: event.clientY, moved: false })
    flight = null
    if (!seen) {
      seen = true
      try {
        localStorage.setItem(HINT_KEY, '1')
      } catch {}
      showCard()
    }
  })
  surface.addEventListener('pointermove', (event) => {
    const touch = touches.get(event.pointerId)
    if (!touch || touch.moved) return
    if (Math.hypot(event.clientX - touch.x, event.clientY - touch.y) > TAP_SLOP) {
      touch.moved = true
      oneFingerDrag()
    }
  })
  // The browser takes a one-finger drag for the page's scrolling (pointercancel): the frame's hint too
  surface.addEventListener('pointercancel', (event) => {
    if (touches.has(event.pointerId) && touches.size === 1) oneFingerDrag()
    touches.delete(event.pointerId)
  })
  function oneFingerDrag() {
    if (!framed() || touches.size !== 1 || !hint.hidden) return
    const now = performance.now()
    if (now - toastShown < 4000) return
    toastShown = now
    showHint(t('touchTwoFingers'), TOAST_TIME)
  }
  surface.addEventListener('pointerup', (event) => {
    const touch = touches.get(event.pointerId)
    touches.delete(event.pointerId)
    if (!touch || touch.moved || touches.size) return
    const now = performance.now()
    if (lastTap && now - lastTap.time < DOUBLE_TAP && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < TAP_SLOP) {
      lastTap = null
      flyTo(event.clientX, event.clientY)
    } else lastTap = { time: now, x: event.clientX, y: event.clientY }
  })
  surface.addEventListener('dblclick', (event) => flyTo(event.clientX, event.clientY))

  // The flight to a double-tapped point
  let flight = null
  const direction = new THREE.Vector3()
  function flyTo(x, y) {
    if (!controls.enabled) return
    const point = pick(x, y)
    if (!point) return
    const distance = Math.min(camera.position.distanceTo(point), FLY_DISTANCE)
    direction.copy(camera.position).sub(point).normalize()
    flight = {
      start: performance.now(),
      fromTarget: controls.target.clone(),
      fromCamera: camera.position.clone(),
      toTarget: point.clone(),
      toCamera: point.clone().addScaledVector(direction, distance),
    }
    requestRender()
  }
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2)

  return {
    /** Each frame, before the controls' update; true while it moves the camera */
    update() {
      if (flight) {
        const k = Math.min((performance.now() - flight.start) / FLY_TIME, 1)
        const e = ease(k)
        controls.target.lerpVectors(flight.fromTarget, flight.toTarget, e)
        camera.position.lerpVectors(flight.fromCamera, flight.toCamera, e)
        if (k >= 1) flight = null
        return true
      }
      // Zooming in never stalls: within NEAR of the orbit's centre, the centre moves ahead
      const distance = camera.position.distanceTo(controls.target)
      if (controls.enabled && distance < NEAR) {
        direction.copy(controls.target).sub(camera.position).normalize()
        controls.target.addScaledVector(direction, NEAR - distance)
      }
      return false
    },
  }
}
