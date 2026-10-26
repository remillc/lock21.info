// Swim mode (the « Ambiance sous-marine », computers): first-person navigation instead of orbiting. The keys move the
// diver where they look (W forward, S back, A and D sideways; the arrows too; Shift faster), dragging turns the head
// (up, down, left, right). Keys by position (event.code): on an AZERTY keyboard they are Z, Q, S, D, and the keycaps
// drawn at the bottom left (main.js) show the keyboard's own letters where the browser can tell
// (navigator.keyboard.getLayoutMap). Outside the water (Christian, 2026-10-24), the same keys only: the orbit keeps the
// mouse, and the keys move the camera and the orbit's centre together (main.js), faster the farther the camera is.
import * as THREE from 'three'

// Swimming speed (m/s), and with Shift; head turn per pixel dragged (radians); the head's pitch limit
const SPEED = 1.2
const FAST = 3
const TURN = 0.004
const PITCH_LIMIT = 1.45

const MOVES = {
  KeyW: [0, 0, -1],
  ArrowUp: [0, 0, -1],
  KeyS: [0, 0, 1],
  ArrowDown: [0, 0, 1],
  KeyA: [-1, 0, 0],
  ArrowLeft: [-1, 0, 0],
  KeyD: [1, 0, 0],
  ArrowRight: [1, 0, 0],
}

/**
 * @param {object} options
 * @param {THREE.PerspectiveCamera} options.camera
 * @param {HTMLElement} options.element - the 3D view (drag to look around)
 * @param {(code: string, down: boolean) => void} [options.onKey] - a movement key pressed or released (the keycaps)
 * @param {(position: THREE.Vector3, step: THREE.Vector3) => void} [options.move] - moves the camera by a step (collisions:
 *   collide.js); by default straight
 * @param {() => number} [options.speed] - a factor on the speed (outside the water: the orbit's distance)
 */
export function createSwim({ camera, element, onKey, move: moveBy = (position, step) => position.add(step), speed = () => 1 }) {
  let active = false
  // Dragging turns the head (swimming); without it, the keys only
  let looking = false
  const held = new Set()
  const euler = new THREE.Euler(0, 0, 0, 'YXZ')
  const move = new THREE.Vector3()
  let drag = null
  let last = 0
  let fast = false
  // A point to turn around (setPivot: a double-click, Christian, 2026-10-24): the drag circles the diver around it,
  // looking at it, instead of turning the head; the head first turns to face it (PIVOT_TURN ms). A move by the keys
  // forgets it
  let pivot = null
  let facing = null
  const PIVOT_TURN = 500
  const offset = new THREE.Vector3()
  const toward = new THREE.Vector3()
  const right = new THREE.Vector3()
  const UP = new THREE.Vector3(0, 1, 0)
  // A camera's lookAt turns its -z axis to the point (an Object3D's turns +z)
  const looker = new THREE.PerspectiveCamera()
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Shift') fast = true
  })
  window.addEventListener('keyup', (event) => {
    if (event.key === 'Shift') fast = false
  })

  // Not while typing in the settings (text fields, sliders, selects)
  const typing = (event) => event.target instanceof HTMLElement && event.target.closest('input, select, textarea')
  window.addEventListener('keydown', (event) => {
    if (!active || !(event.code in MOVES) || typing(event) || event.ctrlKey || event.metaKey || event.altKey) return
    event.preventDefault()
    if (!held.has(event.code)) onKey?.(event.code, true)
    held.add(event.code)
  })
  window.addEventListener('keyup', (event) => {
    if (!held.delete(event.code)) return
    onKey?.(event.code, false)
  })
  // Keys released while the window lost the focus: forgotten
  window.addEventListener('blur', () => {
    fast = false
    for (const code of held) onKey?.(code, false)
    held.clear()
  })

  element.addEventListener('pointerdown', (event) => {
    if (!active || !looking || event.button !== 0) return
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY }
    element.setPointerCapture(event.pointerId)
  })
  element.addEventListener('pointermove', (event) => {
    if (!active || !looking || !drag || event.pointerId !== drag.id) return
    if (pivot) {
      // Around the pivot: a pixel turns by the angle a pixel covers (the background moves with the pointer sideways); not over
      // nor under it (PITCH_LIMIT from level); the walls stop the diver (move)
      const perPixel = THREE.MathUtils.degToRad(camera.fov) / (element.clientHeight || 1)
      facing = null
      offset.subVectors(camera.position, pivot)
      offset.applyAxisAngle(UP, -(event.clientX - drag.x) * perPixel)
      right.crossVectors(UP, offset).normalize()
      // The vertical axis as the pointer goes, like the standard view (Christian, 2026-10-26: no longer inverted)
      const tilted = offset.clone().applyAxisAngle(right, -(event.clientY - drag.y) * perPixel)
      if (Math.abs(Math.asin(THREE.MathUtils.clamp(tilted.y / tilted.length(), -1, 1))) < PITCH_LIMIT) offset.copy(tilted)
      moveBy(camera.position, toward.copy(pivot).add(offset).sub(camera.position))
      camera.lookAt(pivot)
      drag.x = event.clientX
      drag.y = event.clientY
      return
    }
    euler.setFromQuaternion(camera.quaternion)
    euler.y -= (event.clientX - drag.x) * TURN
    // The vertical axis as the pointer goes (Christian, 2026-10-26: no longer inverted)
    euler.x = THREE.MathUtils.clamp(euler.x - (event.clientY - drag.y) * TURN, -PITCH_LIMIT, PITCH_LIMIT)
    euler.z = 0
    camera.quaternion.setFromEuler(euler)
    drag.x = event.clientX
    drag.y = event.clientY
  })
  const endDrag = (event) => {
    if (drag && event.pointerId === drag.id) drag = null
  }
  element.addEventListener('pointerup', endDrag)
  element.addEventListener('pointercancel', endDrag)

  return {
    get active() {
      return active
    },
    /**
     * A movement key pressed or released other than on the keyboard: the card's buttons (main.js, TODO #61)
     * @param {string} code - KeyW, KeyA, KeyS or KeyD
     * @param {boolean} down
     */
    press(code, down) {
      if (!(code in MOVES)) return
      if (down && active) {
        if (!held.has(code)) onKey?.(code, true)
        held.add(code)
      } else if (!down && held.delete(code)) onKey?.(code, false)
    },
    /**
     * A point to turn around (a double-click while swimming): the head turns to face it, then the drag circles around
     * it, until a key moves the diver; null forgets it
     * @param {THREE.Vector3 | null} point
     */
    setPivot(point) {
      pivot = point ? point.clone() : null
      if (!pivot) return
      looker.position.copy(camera.position)
      looker.lookAt(pivot)
      facing = { from: camera.quaternion.clone(), to: looker.quaternion.clone(), start: performance.now() }
    },
    /** Swimming: the drag turns the head */
    get looking() {
      return active && looking
    },
    /**
     * @param {boolean} on - the keys move the camera
     * @param {boolean} [look] - and dragging turns the head (swimming)
     */
    setActive(on, look = true) {
      active = on
      looking = look
      drag = null
      for (const code of held) onKey?.(code, false)
      held.clear()
      last = 0
      if (on) {
        // Level the head (no roll), keeping where it looks
        euler.setFromQuaternion(camera.quaternion)
        euler.z = 0
        camera.quaternion.setFromEuler(euler)
      }
    },
    /**
     * Each frame while active: moves the camera by the held keys
     * @returns {boolean} whether the view changed (moved or turned)
     */
    update() {
      const now = performance.now()
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 0
      last = now
      // Turning to face a new pivot
      if (facing) {
        const k = Math.min((now - facing.start) / PIVOT_TURN, 1)
        camera.quaternion.slerpQuaternions(facing.from, facing.to, 1 - (1 - k) ** 3)
        if (k >= 1) facing = null
        if (!held.size) return true
      }
      if (!active || !held.size) return Boolean(drag)
      // Swimming away: the pivot forgotten
      pivot = null
      facing = null
      move.set(0, 0, 0)
      for (const code of held) move.add(new THREE.Vector3(...MOVES[code]))
      if (!move.lengthSq()) return Boolean(drag)
      move.normalize().multiplyScalar((fast ? SPEED * FAST : SPEED) * speed() * dt).applyQuaternion(camera.quaternion)
      moveBy(camera.position, move)
      return true
    },
  }
}
