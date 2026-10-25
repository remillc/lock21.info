// Turning around the point pressed (Christian, 2026-10-24: the left button's click point is the pivot), in the standard
// view. OrbitControls turns around its own centre (controls.target), so it leaves the left button to this: as the drag
// starts, the model's point under the pointer becomes the pivot, and the camera and the orbit's centre turn together
// around it, so that point stays where it is on the screen and the view keeps its angle (no jump, as moving the centre
// there would make). Over the sky (no point), the orbit's centre is the pivot. A pixel dragged turns by the angle a
// pixel covers (the view's height over its angle: Christian, 2026-10-24, the pointer moved faster than the background),
// so the background moves with the pointer (sideways: the vertical axis is inverted); the same limit looking up (maxPolar), and a short glide after the button is
// released, as OrbitControls' damping. Touch is left to OrbitControls and touch-nav.js.
import * as THREE from 'three'

const UP = new THREE.Vector3(0, 1, 0)
// The glide: the share of its speed kept each 60th of a second, and the speed below which it stops (rad per frame)
const GLIDE = 0.88
const GLIDE_STOP = 1e-4

/**
 * @param {object} options
 * @param {import('three/addons/controls/OrbitControls.js').OrbitControls} options.controls
 * @param {THREE.PerspectiveCamera} options.camera
 * @param {HTMLElement} options.surface - the canvas
 * @param {(x: number, y: number) => THREE.Vector3 | null} options.pick - the model's point under a client position
 * @param {number} options.maxPolar - the most the camera may turn up (rad from straight above its orbit's centre)
 * @param {() => void} options.requestRender
 */
export function createPointerOrbit({ controls, camera, surface, pick, maxPolar, requestRender }) {
  // OrbitControls: no action for the left button; with Ctrl, Shift or Meta, panning, as before: its ROTATE pans with a
  // modifier (and its PAN rotates). Set before its own pointer-down reads it (capture phase)
  controls.mouseButtons.LEFT = null
  surface.addEventListener('pointerdown', (event) => {
    controls.mouseButtons.LEFT = event.ctrlKey || event.shiftKey || event.metaKey ? THREE.MOUSE.ROTATE : null
    // Panning (right button, or left with a modifier) drags the point pressed with the pointer (Christian, 2026-10-25:
    // too slow): OrbitControls moves the plane of its centre with the pointer, often a metre ahead (the start view),
    // so a wall 10 m away crept. Its speed is the depth of the point pressed over the centre's; over the sky, as before
    const panning = event.button === 2 || (event.button === 0 && controls.mouseButtons.LEFT !== null)
    if (event.pointerType !== 'mouse' || !panning) return
    const point = pick(event.clientX, event.clientY)
    const centre = camera.position.distanceTo(controls.target)
    camera.getWorldDirection(offset)
    const depth = point ? point.clone().sub(camera.position).dot(offset) : 0
    controls.panSpeed = depth > 0 && centre > 0 ? THREE.MathUtils.clamp(depth / centre, 0.2, 100) : 1
  }, { capture: true })
  const pivot = new THREE.Vector3()
  const right = new THREE.Vector3()
  const offset = new THREE.Vector3()
  const turn = new THREE.Quaternion()
  let drag = null
  let speed = { yaw: 0, pitch: 0 }

  /** Turns the camera and the orbit's centre around the pivot: yaw around the vertical, pitch around the view's right */
  function rotate(yaw, pitch) {
    turn.setFromAxisAngle(UP, yaw)
    for (const point of [camera.position, controls.target]) point.sub(pivot).applyQuaternion(turn).add(pivot)
    // Up or down only within the limit: the angle of the camera from straight above the orbit's centre
    right.set(1, 0, 0).applyQuaternion(camera.quaternion).applyQuaternion(turn)
    turn.setFromAxisAngle(right, pitch)
    offset.subVectors(camera.position, controls.target).applyQuaternion(turn)
    const polar = offset.angleTo(UP)
    if (polar > 0.01 && polar < maxPolar) {
      for (const point of [camera.position, controls.target]) point.sub(pivot).applyQuaternion(turn).add(pivot)
    }
    camera.lookAt(controls.target)
    requestRender()
  }

  surface.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || !controls.enabled) return
    // Ctrl, Shift or Meta with the left button: OrbitControls pans
    if (event.ctrlKey || event.shiftKey || event.metaKey) return
    pivot.copy(pick(event.clientX, event.clientY) ?? controls.target)
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp }
    speed = { yaw: 0, pitch: 0 }
    surface.setPointerCapture(event.pointerId)
  })
  surface.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return
    if (!controls.enabled) {
      drag = null
      return
    }
    // The angle a pixel covers
    const perPixel = THREE.MathUtils.degToRad(camera.fov) / (surface.clientHeight || 1)
    const yaw = -(event.clientX - drag.x) * perPixel
    // The vertical axis inverted (Christian, 2026-10-25): up and down turn the other way, the background no longer
    // following the pointer up and down
    const pitch = (event.clientY - drag.y) * perPixel
    // Its speed for the glide, per 60th of a second
    const frames = Math.max((event.timeStamp - drag.time) / (1000 / 60), 1)
    speed = { yaw: yaw / frames, pitch: pitch / frames }
    Object.assign(drag, { x: event.clientX, y: event.clientY, time: event.timeStamp })
    rotate(yaw, pitch)
    // The address and the page (main.js) follow the orbit's change events
    controls.dispatchEvent({ type: 'change' })
  })
  const end = (event) => {
    if (!drag || event.pointerId !== drag.id) return
    // Still for a moment before release: no glide
    if (event.timeStamp - drag.time > 80) speed = { yaw: 0, pitch: 0 }
    drag = null
  }
  surface.addEventListener('pointerup', end)
  surface.addEventListener('pointercancel', end)

  return {
    /** Each frame: the glide after a drag; true while it moves the camera */
    update() {
      if (drag || !controls.enabled) return false
      if (Math.abs(speed.yaw) < GLIDE_STOP && Math.abs(speed.pitch) < GLIDE_STOP) return false
      speed = { yaw: speed.yaw * GLIDE, pitch: speed.pitch * GLIDE }
      rotate(speed.yaw, speed.pitch)
      controls.dispatchEvent({ type: 'change' })
      return true
    },
    /** The model's point under a client position (the pick given) */
    pick,
    /** A drag under way */
    get dragging() {
      return Boolean(drag)
    },
  }
}
