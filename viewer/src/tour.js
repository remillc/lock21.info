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
// A flight's minimum-jerk easing peaks at 1.875 x its mean speed and 5.77 x way / time² in acceleration: its time is
// also long enough for FLY_MAX_SPEED (m/s) and FLY_MAX_ACCEL (m/s²; Christian, 2026-10-24: the long flight to the
// first step sped up at 6 m/s²)
const FLY_TIME = [1.5, 40]
// (6 m/s and 2 m/s²: at 4 and 1, everything was too slow, Christian, 2026-10-24)
const FLY_MAX_SPEED = 6
const FLY_MAX_ACCEL = 2
const FLY_PER_METRE = 0.08
const FLY_PER_RADIAN = 1
const FLY_HIGH = 8
const FLY_RISE = 0.25
const FLY_RISE_MAX = 12
const FLY_BACK = 0.3
const FLY_BACK_MAX = 8
// A move: a pause at its start (s) before it sets off (its step's wait otherwise); back or next during it, it ends its
// way first in HURRY ms (from inside a gate passage, a flight straight to the next step went through the masonry)
const MOVE_PAUSE = 0.5
const HURRY = 800
// A flight through a step's approach points: its length (s) at least, at most, and per metre of its curve; turning
// early, the point looked at reaches the step's within this share of the flight
const APPROACH_TIME = [2, 9]
const APPROACH_PER_METRE = 0.12
// A turn first (a step's turnFirst): the camera sets off after this share of it (Christian, 2026-10-24: at 60 %)
const TURN_OVERLAP = 0.6
// A way with paces (a step's paces or flightPace) is driven as a vehicle would (Christian, 2026-10-24: physically
// sound): from rest to rest, speeding up and slowing down at ACCEL m/s² at most, slowing ahead of a slower stretch so
// as to be at its pace when it starts; planned every PROFILE_STEP m along the way
// (0.8: at 0.4, too slow, Christian, 2026-10-24)
const ACCEL = 0.8
const PROFILE_STEP = 0.05
// A line of sight given as a direction (a step's looks: { dir }) aims this far along it
const LOOK_FAR = 20
// Never a fast turn, and never a sudden start or stop of one (Christian, 2026-10-24: going from a turning speed to
// zero in an instant is not physical). The line of sight follows the one the motion wants as a critically damped
// spring (TURN_SPRING: its stiffness, 1/s²; damped at 2 x its square root: no overshoot), its turning speed at most
// MAX_TURN (rad/s) and its change at most MAX_TURN_ACCEL (rad/s²): the bell-shaped speed of a natural head turn (Flash
// and Hogan's minimum jerk; a game camera's SmoothDamp). A flight that arrives before its turn is done finishes it in
// place
// (0.8 and 1.5: at 0.5 and 1, too slow, Christian, 2026-10-24)
const MAX_TURN = 0.8
const MAX_TURN_ACCEL = 1.5
const TURN_SPRING = 9
// The planned speeds smoothed over this length (m, each side) and passes: the acceleration itself rises and falls
// gradually (an S-curve), no step at a start or a change of pace
const SPEED_SMOOTH = 0.6
const SPEED_PASSES = 2
// The camera's place follows the planned one the same way (Christian, 2026-10-24: natural everywhere), a critically
// damped spring (MOVE_SPRING, 1/s²: about 0.3 s behind): its speed never jumps, even when back or next interrupts a
// motion, a hurried move speeds up, or a flight starts from a camera still moving
const MOVE_SPRING = 36

const UP = new THREE.Vector3(0, 1, 0)
// Minimum jerk (the smoothest start and stop: no jolt in the acceleration, as a natural movement), for the turns and
// the flights without paces
const easeInOut = (k) => k * k * k * (10 - 15 * k + 6 * k * k)
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
 * @param {(index: number) => void} [options.onStep] - a step shown (its index), or -1 when the tour ends
 * @param {(position: THREE.Vector3) => number} [options.headroom] - the free height above a point (m): a flight rises
 *   no higher than it allows (from inside a passage, Next pressed during a move, it rose through the lintel)
 */
export function createTour({ steps, camera, controls, requestRender, onStart, onEnd, log, headroom, onStep }) {
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
  // The line of sight the camera actually has, its turning velocity (rad/s, as an axis times a speed), and when it was
  // last turned
  const sight = new THREE.Vector3()
  const wanted = new THREE.Vector3()
  const spin = new THREE.Vector3()
  const pull = new THREE.Vector3()
  const twist = new THREE.Quaternion()
  let sightTime = 0
  // The camera's place and velocity (m/s) as the spring moves it; the planned place
  const place = new THREE.Vector3()
  const velocity = new THREE.Vector3()
  const planned = new THREE.Vector3()
  const force = new THREE.Vector3()
  /** @type {{ begin: (now: number) => void, run: (now: number) => boolean, hurry?: (now: number) => void }[]} the motions
   *  left, the first running */
  let motions = []
  let hideTimer = 0

  /**
   * A flight from where the camera is to a camera: its own curve, or through the step's approach points
   * @param {{ position: THREE.Vector3, target: THREE.Vector3 }} to
   * @param {import('./tour-steps.js').TourStep} [step]
   */
  function flight(to, step) {
    let from
    let curve
    let duration
    let start = 0
    // The points looked at along an approach: where the camera was looking, the step's, then the step's own point
    let looks = null
    // With paces: the time (ms from the start) at each PROFILE_STEP along the way
    let profile = null
    // A line of sight's point: itself, or LOOK_FAR m along its direction from the camera
    const lookA = new THREE.Vector3()
    const lookB = new THREE.Vector3()
    const lookAt = (look, out) => (look.isVector3 ? out.copy(look) : out.copy(camera.position).addScaledVector(look.dir, LOOK_FAR))
    // From where the camera is when it begins (after a hurried move: its end)
    const begin = (now) => {
      start = now
      from = { position: camera.position.clone(), target: controls.target.clone() }
      // How far the line of sight turns
      const angle = from.target.clone().sub(from.position).angleTo(to.target.clone().sub(to.position))
      if (step?.approach) {
        if (step.looks) {
          // A point, or a direction from the camera ({ dir }: resolved as it moves)
          const points = step.looks.map((p) => (Array.isArray(p) ? new THREE.Vector3(...p) : { dir: new THREE.Vector3(...p.dir).normalize() }))
          // Turning first: the line of sight starts from the first point looked at (the turn brings it there)
          looks = [step.turnFirst ? points[0] : from.target, ...points, to.target]
        }
        curve = new THREE.CatmullRomCurve3([from.position, ...step.approach.map((p) => new THREE.Vector3(...p)), to.position], false, 'centripetal')
        if (step.paces || step.flightPace) {
          // The speed at each point of the way: its stretch's pace (the curve's parameter is i / n at the i-th point),
          // at rest at both ends, then no faster than ACCEL allows from the speed before (forward) and toward the speed
          // after (backward); the time to each point from the mean speeds
          const length = curve.getLength()
          const n = Math.max(2, Math.ceil(length / PROFILE_STEP))
          const ds = length / n
          const stretches = curve.points.length - 1
          const speed = new Float64Array(n + 1)
          for (let i = 0; i <= n; i++) {
            const stretch = Math.min(Math.floor(curve.getUtoTmapping(i / n) * stretches), stretches - 1)
            speed[i] = step.paces ? step.paces[stretch] ?? 1 : step.flightPace
          }
          speed[0] = 0
          speed[n] = 0
          const accel = step.accel ?? ACCEL
          for (let i = 1; i <= n; i++) speed[i] = Math.min(speed[i], Math.sqrt(speed[i - 1] ** 2 + 2 * accel * ds))
          for (let i = n - 1; i >= 0; i--) speed[i] = Math.min(speed[i], Math.sqrt(speed[i + 1] ** 2 + 2 * accel * ds))
          // An S-curve: the speeds averaged over SPEED_SMOOTH m each side, a few passes (never above the planned speed, at
          // rest at both ends)
          const half = Math.max(1, Math.round(SPEED_SMOOTH / ds))
          for (let pass = 0; pass < SPEED_PASSES; pass++) {
            const sums = new Float64Array(n + 2)
            for (let i = 0; i <= n; i++) sums[i + 1] = sums[i] + speed[i]
            const smooth = new Float64Array(n + 1)
            for (let i = 0; i <= n; i++) {
              const a = Math.max(0, i - half)
              const b = Math.min(n, i + half)
              smooth[i] = Math.min(speed[i] + 1e-9, (sums[b + 1] - sums[a]) / (b - a + 1))
            }
            speed.set(smooth)
            speed[0] = 0
            speed[n] = 0
          }
          profile = new Float64Array(n + 1)
          for (let i = 1; i <= n; i++) profile[i] = profile[i - 1] + (ds / Math.max((speed[i - 1] + speed[i]) / 2, 0.02)) * 1000
          duration = profile[n]
        } else {
          duration = THREE.MathUtils.clamp(APPROACH_TIME[0] + curve.getLength() * APPROACH_PER_METRE + angle * FLY_PER_RADIAN, APPROACH_TIME[0], APPROACH_TIME[1]) * 1000
        }
      } else {
        const way = from.position.distanceTo(to.position)
        const physical = Math.max((1.875 * way) / FLY_MAX_SPEED, Math.sqrt((5.77 * way) / FLY_MAX_ACCEL))
        duration = THREE.MathUtils.clamp(Math.max(FLY_TIME[0] + way * FLY_PER_METRE + angle * FLY_PER_RADIAN, physical), FLY_TIME[0], FLY_TIME[1]) * 1000
        const room = headroom ? Math.max(0, headroom(from.position) - 0.5) : Infinity
        const rise = way > FLY_HIGH ? Math.min(way * FLY_RISE, FLY_RISE_MAX, room) : 0
        const back = Math.min(way * FLY_BACK, FLY_BACK_MAX)
        const look = to.target.clone().sub(to.position).normalize()
        curve = new THREE.CubicBezierCurve3(
          from.position,
          from.position.clone().addScaledVector(UP, rise),
          to.position.clone().addScaledVector(look, -back).addScaledVector(UP, rise * 0.4),
          to.position,
        )
      }
    }
    return {
      begin,
      run(now) {
        // A turn in place first (the step's turnFirst), the move setting off before it ends
        const turnTime = step?.turnFirst && looks ? step.turnFirst * 1000 : 0
        const elapsed = now - start
        const k = THREE.MathUtils.clamp((elapsed - turnTime * TURN_OVERLAP) / duration, 0, 1)
        const e = easeInOut(k)
        let t
        if (profile) {
          // Where the planned speeds bring the camera at this time (a binary search in the profile's times)
          const time = k * duration
          let lo = 0
          let hi = profile.length - 1
          while (hi - lo > 1) {
            const mid = (lo + hi) >> 1
            if (profile[mid] <= time) lo = mid
            else hi = mid
          }
          const u = (lo + (time - profile[lo]) / Math.max(profile[hi] - profile[lo], 1e-6)) / (profile.length - 1)
          curve.getPointAt(Math.min(u, 1), camera.position)
          t = curve.getUtoTmapping(Math.min(u, 1))
        } else {
          // Along the curve by its length (an even pace through the approach points)
          curve.getPointAt(e, camera.position)
          t = curve.getUtoTmapping ? curve.getUtoTmapping(e) : e
        }
        if (looks) {
          // The step's points looked at, one per approach point: where the camera is along its points, the line of sight
          // between theirs (smoothly)
          const at = t * (looks.length - 1)
          const i = Math.min(Math.floor(at), looks.length - 2)
          const f = THREE.MathUtils.smoothstep(at - i, 0, 1)
          // Between the two lines of sight, not between their points (at different distances, the points' glide made the
          // view rise past its goal and come back: Christian, 2026-10-24, mechanical)
          lookAt(looks[i], lookA).sub(camera.position)
          lookAt(looks[i + 1], lookB).sub(camera.position)
          const reach = THREE.MathUtils.lerp(lookA.length(), lookB.length(), f)
          lookA.normalize().lerp(lookB.normalize(), f).normalize()
          controls.target.copy(camera.position).addScaledVector(lookA, reach)
          // Still turning: from where it looked, toward that line of sight
          if (elapsed < turnTime) {
            // Between the lines of sight (not their points)
            lookA.subVectors(from.target, camera.position)
            lookB.subVectors(controls.target, camera.position)
            const g = easeInOut(elapsed / turnTime)
            const reach = THREE.MathUtils.lerp(lookA.length(), lookB.length(), g)
            lookA.normalize().lerp(lookB.normalize(), g).normalize()
            controls.target.copy(camera.position).addScaledVector(lookA, reach)
          }
        } else {
          // Turning first (the step's turn: within that share of the flight, easing out), or along with the flight
          const turn = step?.turn ? 1 - (1 - Math.min(k / step.turn, 1)) ** 3 : e
          controls.target.lerpVectors(from.target, to.target, turn)
        }
        return k >= 1
      },
    }
  }

  /** A pause where the camera is */
  function pause(seconds) {
    let start = 0
    return {
      begin(now) {
        start = now
      },
      run(now) {
        return now - start >= seconds * 1000
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
    let duration = (curve.getLength() / (step.pace ?? 1)) * 1000
    let start = 0
    return {
      begin(now) {
        start = now
      },
      // Its way ended in HURRY ms from where it is
      hurry(now) {
        const k = Math.min((now - start) / duration, 1)
        if (k >= 1) return
        duration = HURRY / (1 - k)
        start = now - k * duration
      },
      run(now) {
        const k = Math.min((now - start) / duration, 1)
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
    onStep?.(i)
    count.textContent = t('tourCount', { n: i + 1, total: steps.length })
    title.textContent = step.title[lang] ?? step.title.fr
    text.textContent = step.text[lang] ?? step.text.fr
    prev.hidden = i === 0
    next.textContent = t(i === steps.length - 1 ? 'tourEnd' : 'tourNext')
    const now = performance.now()
    const queued = step.kind === 'move' ? [flight(camOf(step.from), step), pause(step.wait ?? MOVE_PAUSE), travel(step)] : [flight(camOf(step.cam), step)]
    // A move under way ends its way first (hurried); otherwise the new step's motions start at once
    const running = motions[0]
    if (running?.hurry) {
      running.hurry(now)
      motions = [running, ...queued]
    } else {
      motions = queued
      motions[0].begin(now)
    }
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
    onStep?.(-1)
    motions = []
    sightTime = 0
    spin.set(0, 0, 0)
    velocity.set(0, 0, 0)
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
      if (!motions.length && !sightTime) return false
      const now = performance.now()
      // The line of sight and the place before the motion moves the camera and its point
      if (!sightTime) {
        sight.subVectors(controls.target, camera.position).normalize()
        place.copy(camera.position)
        velocity.set(0, 0, 0)
      }
      const dt = sightTime ? Math.min((now - sightTime) / 1000, 0.1) : 0
      sightTime = now
      // The motions plan from the camera's actual place (a flight begins where the camera is)
      camera.position.copy(place)
      if (motions.length && motions[0].run(now)) {
        motions.shift()
        if (motions.length) motions[0].begin(now)
      }
      // The place: toward the planned one by the spring
      planned.copy(camera.position)
      if (dt > 0) {
        force.subVectors(planned, place).multiplyScalar(MOVE_SPRING).addScaledVector(velocity, -2 * Math.sqrt(MOVE_SPRING))
        velocity.addScaledVector(force, dt)
        place.addScaledVector(velocity, dt)
      }
      camera.position.copy(place)
      // The point looked at, as the motion wants it, seen from where the camera actually is
      // The line of sight wanted, followed by the damped spring; the point looked at kept at its distance
      const distance = Math.max(controls.target.distanceTo(camera.position), 0.1)
      wanted.subVectors(controls.target, camera.position).normalize()
      const angle = sight.angleTo(wanted)
      if (dt > 0) {
        // The spring's pull toward the wanted line (its axis times the angle), less the damping of the turning velocity;
        // its change and the velocity capped
        pull.crossVectors(sight, wanted)
        if (pull.lengthSq() > 1e-12) pull.normalize().multiplyScalar(angle * TURN_SPRING)
        else pull.set(0, 0, 0)
        pull.addScaledVector(spin, -2 * Math.sqrt(TURN_SPRING))
        if (pull.length() > MAX_TURN_ACCEL) pull.setLength(MAX_TURN_ACCEL)
        spin.addScaledVector(pull, dt)
        if (spin.length() > MAX_TURN) spin.setLength(MAX_TURN)
        const turn = spin.length() * dt
        if (turn > 0) sight.applyQuaternion(twist.setFromAxisAngle(pull.copy(spin).normalize(), turn)).normalize()
      }
      controls.target.copy(camera.position).addScaledVector(sight, distance)
      camera.lookAt(controls.target)
      // Done when the motions are, the place and the line of sight have caught up and stopped
      if (!motions.length && angle < 0.002 && spin.length() < 0.01 && place.distanceTo(planned) < 0.003 && velocity.length() < 0.01) {
        camera.position.copy(planned)
        sightTime = 0
        spin.set(0, 0, 0)
        velocity.set(0, 0, 0)
        controls.enabled = true
      }
      return true
    },
  }
}
