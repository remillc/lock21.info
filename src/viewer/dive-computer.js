// The diver's dive computer, a Shearwater Perdix 3 (TODO #65, Christian, 2026-10-24: realistic data on its screen):
// its screen drawn on a canvas (600 x 450 px, as the real AMOLED one), put on the arm model's « computer-screen »
// (diver-arm.js), in the Perdix's default « Big » layout (shearwater.com product pictures): depth large at the top left
// with the ascent chevrons, NDL with the nitrogen bar at the top right, TIME, T1 (the tank's pressure), and at the
// bottom O2 % with the gas (AIR), MAX depth, the compass. Feet and psi, as the dive log.
// The dive is the visit's: its time since entering the water (it pauses outside), the depth the camera's below the
// surface, the deepest so far, a no-decompression limit on air for that depth less the time spent (DIVE_TABLE, minutes
// by depth in feet: the usual recreational air table), an 80 cubic foot tank (3,000 psi) emptied at SAC cubic feet a
// minute at the surface, more with depth; the heading of the camera. Redrawn once a second.
import * as THREE from 'three'

const SIZE = [600, 450]
const SAC = 0.6
const TANK = { psi: 3000, cubicFeet: 77.4 }
// No-decompression limits on air (min) by depth (ft)
const DIVE_TABLE = [[35, 205], [40, 140], [50, 80], [60, 55], [70, 40], [80, 30], [90, 25], [100, 20], [110, 16], [130, 10]]
// The computer's battery (Christian, 2026-10-24)
const BATTERY = 0.78
const BLUE = '#3ab4f2'
const WHITE = '#ffffff'

/** The no-decompression limit on air at a depth (ft), from DIVE_TABLE, interpolated */
function ndlAt(depth) {
  if (depth <= DIVE_TABLE[0][0]) return DIVE_TABLE[0][1]
  for (let i = 1; i < DIVE_TABLE.length; i++) {
    const [d1, m1] = DIVE_TABLE[i]
    const [d0, m0] = DIVE_TABLE[i - 1]
    if (depth <= d1) return m0 + ((m1 - m0) * (depth - d0)) / (d1 - d0)
  }
  return DIVE_TABLE[DIVE_TABLE.length - 1][1]
}

/**
 * @param {object} options
 * @param {number} options.surfaceY - the water's surface (scene metres)
 */
export function createDiveComputer({ surfaceY }) {
  const canvas = document.createElement('canvas')
  ;[canvas.width, canvas.height] = SIZE
  const ctx = canvas.getContext('2d')
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  // As the model's texture coordinates (glTF: from the top)
  texture.flipY = false
  // The computer lies across the forearm, its picture's top toward the elbow as modelled: turned half round, upright
  // from the diver's eye
  texture.center.set(0.5, 0.5)
  texture.rotation = Math.PI
  texture.anisotropy = 4
  // Self-lit (AMOLED): not shaded by the scene's lights
  const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false })

  let seconds = 0
  let used = 0
  let maxDepth = 0
  let lastDraw = -1
  let lastDepth = 0
  let ascent = 0
  const forward = new THREE.Vector3()

  function text(value, x, y, size, color, align = 'left', weight = 500) {
    ctx.font = `${weight} ${size}px "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
    ctx.fillStyle = color
    ctx.textAlign = align
    ctx.fillText(value, x, y)
  }

  function draw(depth, heading) {
    const [w, h] = SIZE
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, w, h)
    // The frame lines (blue): the screen cut in four, then a bottom band
    ctx.strokeStyle = BLUE
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(275, 10)
    ctx.lineTo(275, 300)
    ctx.moveTo(10, 300)
    ctx.lineTo(560, 300)
    ctx.stroke()
    // Depth, large, with its decimal; the ascent chevrons (one per 10 ft a minute)
    const whole = Math.floor(depth)
    text(String(whole), 30, 120, 118, WHITE, 'left', 500)
    const wide = ctx.measureText(String(whole)).width
    text(`.${Math.floor((depth - whole) * 10)}`, 30 + wide, 72, 46, WHITE)
    text('ft', 30 + wide + 4, 120, 40, BLUE)
    for (let i = 0; i < Math.min(5, Math.round(ascent / 10)); i++) {
      ctx.fillStyle = i < 3 ? WHITE : '#888'
      ctx.beginPath()
      const y = 112 - i * 18
      ctx.moveTo(220, y)
      ctx.lineTo(240, y - 10)
      ctx.lineTo(260, y)
      ctx.lineTo(260, y - 6)
      ctx.lineTo(240, y - 16)
      ctx.lineTo(220, y - 6)
      ctx.fill()
    }
    // NDL and the nitrogen bar
    const ndl = Math.max(0, Math.round(ndlAt(depth) - seconds / 60))
    text('NDL', 390, 55, 40, BLUE, 'center')
    text(ndl > 99 ? '99+' : String(ndl), 380, 130, 76, WHITE, 'right')
    text('min', 385, 130, 40, BLUE)
    const load = Math.min(1, seconds / 60 / Math.max(1, ndlAt(maxDepth)))
    ctx.strokeStyle = '#ccc'
    ctx.lineWidth = 2
    ctx.strokeRect(500, 25, 34, 110)
    const bar = ctx.createLinearGradient(0, 135, 0, 25)
    bar.addColorStop(0, '#2bd14f')
    bar.addColorStop(0.6, '#e5e53a')
    bar.addColorStop(1, '#f04d2b')
    ctx.fillStyle = bar
    ctx.fillRect(502, 133 - 106 * Math.max(0.08, load), 30, 106 * Math.max(0.08, load))
    text('N₂', 517, 90, 18, '#123', 'center', 700)
    // The battery, under the bar: its level and percentage
    ctx.strokeStyle = '#ccc'
    ctx.lineWidth = 2
    ctx.strokeRect(496, 152, 38, 18)
    ctx.fillStyle = '#ccc'
    ctx.fillRect(534, 157, 4, 8)
    ctx.fillStyle = '#2bd14f'
    ctx.fillRect(499, 155, 32 * BATTERY, 12)
    text(`${Math.round(BATTERY * 100)}%`, 517, 196, 22, WHITE, 'center')
    // TIME, minutes:seconds
    text('TIME', 130, 190, 40, BLUE, 'center')
    text(String(Math.floor(seconds / 60)), 130, 270, 76, WHITE, 'right')
    text(`:${String(Math.floor(seconds % 60)).padStart(2, '0')}`, 130, 270, 44, WHITE)
    // T1: the tank's pressure (psi)
    const psi = Math.max(0, Math.round(((TANK.psi - (used / TANK.cubicFeet) * TANK.psi)) / 10) * 10)
    text('T1', 410, 190, 40, BLUE, 'center')
    text(String(psi), 470, 270, 76, WHITE, 'right')
    text('PSI', 478, 248, 22, BLUE)
    // The bottom band: O2 and the gas, MAX, the compass
    text('21%', 30, 365, 40, WHITE)
    ctx.fillStyle = '#8c6cc8'
    ctx.beginPath()
    ctx.roundRect(28, 385, 92, 44, 10)
    ctx.fill()
    text('AIR', 74, 418, 32, WHITE, 'center', 600)
    text('MAX', 265, 345, 38, BLUE, 'center')
    text(`${maxDepth.toFixed(1)}`, 280, 420, 66, WHITE, 'right')
    text('ft', 285, 420, 36, BLUE)
    text(`${Math.round(heading)}°`, 480, 345, 34, WHITE, 'center')
    // The compass: a ring, its needle to the north
    ctx.save()
    ctx.translate(480, 395)
    ctx.strokeStyle = '#999'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(0, 0, 38, 0, Math.PI * 2)
    ctx.stroke()
    ctx.rotate(THREE.MathUtils.degToRad(-heading))
    ctx.fillStyle = '#e8352e'
    ctx.beginPath()
    ctx.moveTo(0, -32)
    ctx.lineTo(7, 0)
    ctx.lineTo(-7, 0)
    ctx.fill()
    ctx.fillStyle = '#bbb'
    ctx.beginPath()
    ctx.moveTo(0, 32)
    ctx.lineTo(7, 0)
    ctx.lineTo(-7, 0)
    ctx.fill()
    ctx.restore()
    // The maker's name, along the right edge of the glass
    ctx.save()
    ctx.translate(585, 30)
    ctx.rotate(Math.PI / 2)
    text('SHEARWATER', 0, 0, 20, '#777', 'left', 700)
    ctx.restore()
    texture.needsUpdate = true
  }

  return {
    material,
    /**
     * Each frame while underwater
     * @param {THREE.Camera} camera
     * @param {number} dt
     */
    update(camera, dt) {
      seconds += dt
      const depth = Math.max(0, (surfaceY - camera.position.y) / 0.3048)
      maxDepth = Math.max(maxDepth, depth)
      // Gas used at that depth (its pressure in atmospheres times the surface rate)
      used += (SAC * (1 + depth / 33) * dt) / 60
      if (Math.floor(seconds) === lastDraw) return
      // Once a second: the ascent rate (ft/min), the heading, and the picture
      ascent = Math.max(0, ((lastDepth - depth) * 60) / Math.max(1, seconds - lastDraw))
      lastDepth = depth
      lastDraw = Math.floor(seconds)
      camera.getWorldDirection(forward)
      const heading = (THREE.MathUtils.radToDeg(Math.atan2(forward.x, -forward.z)) + 360) % 360
      draw(depth, heading)
    },
  }
}
