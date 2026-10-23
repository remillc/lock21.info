// « Rendu photo »: a path-traced image of the current view (three-gpu-pathtracer), refined sample after sample while
// the camera stays still: light that bounces between the walls, soft shadows, the sky's light reaching into the
// recesses. Computers only (a button in main.js); the normal display comes back when it is turned off.
//
// The path tracer gets its own scene, built once when the mode starts, from the surfaces on screen at that moment
// (the tiles' level of detail is frozen meanwhile, main.js):
// - the same geometry (no copy), placed with each mesh's world matrix;
// - plain physical materials: the path tracer ignores our shader patches (green and cyan removal, zone colour balance,
//   saturation), so each photo texture gets a corrected copy, made on the GPU with the same formulas, at the size of
//   the path tracer's texture array (TEXTURE_SIZE: every texture of the scene sits in one array, at one size);
// - no relief maps: ours are in object space, which the path tracer doesn't read; the geometry's own normals instead;
// - the same sky (environment and background, rotations and strengths) and one sun (the shadow cascades are three
//   lights in the normal display).
// The image goes to the screen through the path tracer's own pass, with the renderer's tone mapping and exposure, as
// the normal display.
import * as THREE from 'three'
import { WebGLPathTracer } from 'three-gpu-pathtracer'
import { ParallelMeshBVHWorker } from 'three-mesh-bvh/worker'
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js'

const TEXTURE_SIZE = 512

// The corrections of main.js's surface materials, applied to a copy of the texture: colour balance (color), green
// and cyan removal (addDespill), saturation
const gradeMaterial = new THREE.ShaderMaterial({
  uniforms: {
    map: { value: null },
    color: { value: new THREE.Color() },
    despill: { value: 0 },
    cyanCut: { value: 0 },
    saturation: { value: 1 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D map;
    uniform vec3 color;
    uniform float despill;
    uniform float cyanCut;
    uniform float saturation;
    varying vec2 vUv;
    void main() {
      vec4 diffuseColor = texture2D(map, vUv);
      diffuseColor.rgb *= color;
      float despillG = min(diffuseColor.g, max(diffuseColor.r, diffuseColor.b));
      float despillCyan = min(cyanCut * max(min(despillG, diffuseColor.b) - diffuseColor.r, 0.0), min(despillG, diffuseColor.b));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(diffuseColor.r, despillG - despillCyan, diffuseColor.b - despillCyan), despill);
      diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722))), diffuseColor.rgb, saturation);
      gl_FragColor = vec4(diffuseColor.rgb, 1.0);
      #include <colorspace_fragment>
    }`,
})
const gradeQuad = new FullScreenQuad(gradeMaterial)

/**
 * @param {THREE.WebGLRenderer} renderer
 * @param {() => void} rasterize - draws the normal display (shown until the first samples come)
 */
export function createPhotoRender(renderer, rasterize) {
  let pathTracer = null
  let photoScene = null
  /** @type {THREE.WebGLRenderTarget[]} */
  let graded = []
  let building = null

  /**
   * A corrected copy of a surface texture (see gradeMaterial)
   * @param {THREE.Texture} map
   * @param {{ color: THREE.Color, despill: number, cyanCut: number, saturation: number }} grade
   */
  function gradedTexture(map, grade) {
    const target = new THREE.WebGLRenderTarget(TEXTURE_SIZE, TEXTURE_SIZE, { colorSpace: THREE.SRGBColorSpace })
    Object.assign(gradeMaterial.uniforms.map, { value: map })
    gradeMaterial.uniforms.color.value.copy(grade.color)
    gradeMaterial.uniforms.despill.value = grade.despill
    gradeMaterial.uniforms.cyanCut.value = grade.cyanCut
    gradeMaterial.uniforms.saturation.value = grade.saturation
    const previous = renderer.getRenderTarget()
    renderer.setRenderTarget(target)
    gradeQuad.render(renderer)
    renderer.setRenderTarget(previous)
    target.texture.flipY = map.flipY
    target.texture.wrapS = map.wrapS
    target.texture.wrapT = map.wrapT
    graded.push(target)
    return target.texture
  }

  /**
   * Builds the path tracer's scene and starts sampling.
   * @param {object} source
   * @param {THREE.Scene} source.scene - the normal scene (sky, rotations, strengths)
   * @param {THREE.Texture} source.environment - the sky as an equirectangular image (the scene's own is prefiltered
   *   for the GPU, which the path tracer can't read)
   * @param {THREE.Object3D[]} source.roots - the tilesets' groups and the context models
   * @param {THREE.Camera} source.camera
   * @param {THREE.Vector3} source.sunDirection - from the scene toward the sun
   * @param {number} source.sunIntensity
   * @param {(mesh: THREE.Mesh) => { color: THREE.Color, despill: number, cyanCut: number, saturation: number, roughness: number }} source.surfaceGrade
   * @param {(fraction: number) => void} [source.onProgress]
   */
  async function start({ scene, environment, roots, camera, sunDirection, sunIntensity, surfaceGrade, onProgress }) {
    stop()
    photoScene = new THREE.Scene()
    for (const key of ['environment', 'environmentIntensity', 'background', 'backgroundIntensity', 'backgroundBlurriness']) {
      photoScene[key] = scene[key]
    }
    photoScene.environment = scene.environment ? environment : null
    photoScene.environmentRotation.copy(scene.environmentRotation)
    photoScene.backgroundRotation.copy(scene.backgroundRotation)
    const sun = new THREE.DirectionalLight(0xffffff, Math.PI * sunIntensity)
    sun.position.copy(sunDirection).multiplyScalar(100)
    photoScene.add(sun, sun.target)

    const materials = new Map()
    for (const root of roots) {
      root.updateMatrixWorld(true)
      root.traverseVisible((object) => {
        if (!object.isMesh || !object.userData.surface) return
        const surface = object.userData.surface
        const grade = surfaceGrade(object)
        const key = `${surface.map?.uuid ?? 'none'}-${grade.color.getHexString()}-${grade.roughness}`
        let material = materials.get(key)
        if (!material) {
          material = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, metalness: 0, roughness: grade.roughness })
          if (surface.map) material.map = gradedTexture(surface.map, grade)
          else material.color.copy(grade.color)
          materials.set(key, material)
        }
        if (!object.geometry.attributes.normal) object.geometry.computeVertexNormals()
        const copy = new THREE.Mesh(object.geometry, material)
        copy.matrixAutoUpdate = false
        copy.matrix.copy(object.matrixWorld)
        photoScene.add(copy)
      })
    }
    photoScene.updateMatrixWorld(true)

    pathTracer = new WebGLPathTracer(renderer)
    pathTracer.setBVHWorker(new ParallelMeshBVHWorker())
    pathTracer.textureSize.set(TEXTURE_SIZE, TEXTURE_SIZE)
    pathTracer.bounces = 5
    pathTracer.filterGlossyFactor = 0.5
    pathTracer.minSamples = 1
    pathTracer.renderDelay = 0
    pathTracer.fadeDuration = 400
    pathTracer.rasterizeSceneCallback = () => rasterize()
    const build = pathTracer.setSceneAsync(photoScene, camera, { onProgress })
    building = build
    await build
    if (building !== build) return false
    building = null
    return true
  }

  function stop() {
    building = null
    pathTracer?.dispose()
    pathTracer = null
    graded.forEach((target) => target.dispose())
    graded = []
    photoScene?.traverse((object) => object.material?.dispose())
    photoScene = null
  }

  return {
    start,
    stop,
    /** True once the scene is built: render() draws a sample */
    get ready() {
      return Boolean(pathTracer && !building)
    },
    get samples() {
      return pathTracer?.samples ?? 0
    },
    /** For tests (main.js exposes it in development builds): the path tracer and its scene */
    get debug() {
      return { pathTracer, photoScene, graded }
    },
    /** The camera moved: start over */
    cameraMoved() {
      pathTracer?.updateCamera()
    },
    render() {
      pathTracer?.renderSample()
    },
  }
}
