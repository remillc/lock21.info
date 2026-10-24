// The diver's arm in the underwater view while the dive light is on (Christian, 2026-10-23): the right forearm in a
// black neoprene wetsuit, a dive computer on the wrist, the light (after a Light & Motion Sola 1200) strapped on the
// back of the hand, at the bottom right of the view. public/diver/diver-arm.glb, built by tools/diver/make_diver_arm.py
// (the arm's shape: « First Person hands rigged », Sketchfab, CC BY 4.0) in the camera's frame.
//
// Drawn after the scene, over it, in a scene of its own with the depth cleared: it never goes into a wall when the diver
// swims close to one. Its own lights: the dim green daylight of the water from above. It lags a little behind the
// camera's turns and sways gently, as an arm held out in the water; the light's beam moves with it (onLampPose).
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

const URL = `${import.meta.env.BASE_URL}diver/diver-arm.glb`
// How fast the arm catches up with the camera's turns (1/s), and how far it may lag (rad)
const FOLLOW = 9
const MAX_LAG = 0.12
// The sway (Christian, 2026-10-23: the beam follows the arm): the arm turns a little about the shoulder (camera's
// frame, m), up and down, side to side and about itself (rad), each at its own period (s): the light's aim wanders
// with it, so does the beam (a spot 6 m away wanders about 8 cm each way; halved, Christian 2026-10-23)
const SHOULDER = new THREE.Vector3(0.2, -0.3, 0.1)
const SWAY = { pitch: 0.011, yaw: 0.014, roll: 0.008, periods: [4.3, 6.1, 5.2] }

/**
 * @param {object} options
 * @param {(front: THREE.Vector3, axis: THREE.Vector3) => void} [options.onLampPose] - each frame while shown: where the
 *   drawn light's front is and where it points, in the camera's frame (m, unit vector), for the beam to follow it
 * @param {THREE.Material} [options.screen] - the dive computer's screen (dive-computer.js), put on « computer-screen »
 * @param {Promise<unknown>} [options.when] - its model loads once this settles (the viewer: after the first view, so as
 *   not to share the bandwidth with the coarsest tiles)
 */
export function createDiverArm({ onLampPose = () => {}, screen = null, when = Promise.resolve() } = {}) {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera()
  const arm = new THREE.Group()
  scene.add(arm)
  // The water's light: from above, green, dim; a little from below off the floor
  scene.add(new THREE.HemisphereLight(0x8cc4b4, 0x2a3a34, 4))
  const sun = new THREE.DirectionalLight(0xcfeee2, 3)
  sun.position.set(0.3, 1, 0.2)
  scene.add(sun)

  let visible = false
  let ready = false
  const timer = new THREE.Timer()
  // Just shown: the arm starts where the camera looks, no lag carried over
  let fresh = true
  const held = new THREE.Quaternion()
  const lag = new THREE.Quaternion()
  const sway = new THREE.Euler()
  const swayTurn = new THREE.Quaternion()
  const pose = new THREE.Matrix4()
  const turn = new THREE.Matrix4()
  const toShoulder = new THREE.Matrix4().makeTranslation(SHOULDER.x, SHOULDER.y, SHOULDER.z)
  const fromShoulder = new THREE.Matrix4().makeTranslation(-SHOULDER.x, -SHOULDER.y, -SHOULDER.z)
  // The light's front and axis in the model, and as the arm holds them now
  const frontLocal = new THREE.Vector3()
  const axisLocal = new THREE.Vector3(0, 0, -1)
  const front = new THREE.Vector3()
  const axis = new THREE.Vector3()

  // Its geometry is meshopt-compressed (tools/publish-model/pack_creature.mjs -m, TODO #64)
  when.then(() => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(URL, (gltf) => {
    const model = gltf.scene
    model.traverse((object) => {
      if (object.isMesh) object.frustumCulled = false
      // The dive computer's screen: its picture drawn by the viewer (dive-computer.js)
      if (object.isMesh && screen && /^computer-screen/.test(object.name)) object.material = screen
    })
    model.updateMatrixWorld(true)
    model.getObjectByName('lamp-front')?.getWorldPosition(frontLocal)
    // The light points along its node's -Z (Blender's +Y forward, as built)
    const light = model.getObjectByName('dive-light')
    if (light) axisLocal.applyQuaternion(light.getWorldQuaternion(new THREE.Quaternion()))
    arm.add(model)
    ready = true
  }))

  return {
    /** @param {boolean} value - underwater with the light on */
    setVisible(value) {
      if (value && !visible) {
        timer.reset()
        fresh = true
      }
      visible = value
    },
    /**
     * Each frame, before the water's update: the arm follows `view` (the scene's camera), the beam follows the arm
     * @param {THREE.PerspectiveCamera} view
     */
    update(view) {
      if (!visible || !ready) return
      timer.update()
      const dt = Math.min(timer.getDelta(), 0.1)
      const time = timer.getElapsed()
      // Lag: the arm's held orientation follows the camera's, a step behind; drawn as the difference
      if (fresh) {
        held.copy(view.quaternion)
        fresh = false
      }
      held.slerp(view.quaternion, 1 - Math.exp(-FOLLOW * dt))
      if (held.angleTo(view.quaternion) > MAX_LAG) held.rotateTowards(view.quaternion, held.angleTo(view.quaternion) - MAX_LAG)
      lag.copy(view.quaternion).invert().multiply(held)
      const [a, b, c] = SWAY.periods.map((period) => Math.sin((2 * Math.PI * time) / period))
      // The lag about the eye, the sway about the shoulder
      sway.set(SWAY.pitch * a, SWAY.yaw * b, SWAY.roll * c)
      turn.makeRotationFromQuaternion(swayTurn.setFromEuler(sway))
      pose.makeRotationFromQuaternion(lag).multiply(toShoulder).multiply(turn).multiply(fromShoulder)
      pose.decompose(arm.position, arm.quaternion, arm.scale)
      arm.updateMatrix()
      onLampPose(front.copy(frontLocal).applyMatrix4(arm.matrix), axis.copy(axisLocal).applyQuaternion(arm.quaternion))
    },
    /**
     * Drawn over what the renderer has just drawn, from `view` (the scene's camera)
     * @param {THREE.WebGLRenderer} renderer
     * @param {THREE.PerspectiveCamera} view
     */
    render(renderer, view) {
      if (!visible || !ready) return
      camera.fov = view.fov
      camera.aspect = view.aspect
      camera.near = 0.02
      camera.far = 5
      camera.updateProjectionMatrix()
      const autoClear = renderer.autoClear
      renderer.autoClear = false
      renderer.clearDepth()
      renderer.render(scene, camera)
      renderer.autoClear = autoClear
    },
  }
}
