// « Rendu photo »: a path-traced image of the current view (three-gpu-pathtracer), refined sample after sample while
// the camera stays still: light that bounces between the walls, soft shadows, the sky's light reaching into the
// recesses. Computers only (a button in main.js); the normal display comes back when it is turned off.
//
// The path tracer gets its own scene, built once when the mode starts, from the surfaces on screen at that moment
// (the tiles' level of detail is frozen meanwhile, main.js):
// - the same geometry, as plain float copies (the tiles store positions as 16-bit integers, normalized and
//   interleaved, rescaled by each tile's matrix; the path tracer reads raw floats, which gave garbage triangles and a
//   black image); placed with each mesh's world matrix. Normals: on the zones, each vertex takes the normal of the
//   zone's relief map at its texture coordinates (smooth, and the right way out), and a triangle whose winding
//   disagrees with its vertices' normals is turned over. Averaged normals went dark wherever neighbouring triangles of
//   the photogrammetry mesh face opposite ways, flat normals showed every facet. Elsewhere (the context, Blender-made
//   and consistent), averaged normals;
// - plain physical materials: the path tracer ignores our shader patches (green and cyan removal, zone colour balance,
//   saturation), so each photo texture gets a corrected copy, made on the GPU with the same formulas, at the size of
//   the path tracer's texture array: every texture of the scene sits in one array, at one size, chosen from a memory
//   budget (TEXTURE_BUDGET) between 512 and 2048 px. A tile's texture is an atlas of many small pieces: at 512 px
//   each piece was a smear of a few pixels;
// - the relief maps, converted: ours are in object space, which the path tracer doesn't read; it reads tangent-space
//   maps, turned at each point through the frame of the interpolated vertex normal and tangent. Each mesh is drawn
//   flattened into its texture layout, and each pixel gets the relief normal expressed in that same frame
//   (tangentMaterial): the path tracer turns it back into the relief normal, pixel by pixel, as the normal display.
//   Without it, only the vertices had the relief: faceted, patchy stone;
// - the same sky (environment and background, rotations and strengths) and one sun (the shadow cascades are three
//   lights in the normal display).
// The image goes to the screen through the path tracer's own pass, with the renderer's tone mapping and exposure, as
// the normal display.
import * as THREE from 'three'
import { WebGLPathTracer } from 'three-gpu-pathtracer'
import { ParallelMeshBVHWorker } from 'three-mesh-bvh/worker'
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js'

// GPU memory for the path tracer's texture array (RGBA, 4 bytes a pixel; photo textures and relief maps), and the
// size range of its textures
const TEXTURE_BUDGET = 1024 * 2 ** 20
const TEXTURE_SIZES = [512, 2048]

// The corrections of main.js's surface materials, applied to a copy of the texture: colour balance (color), green
// and cyan removal (addDespill), saturation, contrast
const gradeMaterial = new THREE.ShaderMaterial({
  uniforms: {
    map: { value: null },
    color: { value: new THREE.Color() },
    despill: { value: 0 },
    cyanCut: { value: 0 },
    saturation: { value: 1 },
    contrast: { value: 1 },
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
    uniform float contrast;
    varying vec2 vUv;
    void main() {
      vec4 diffuseColor = texture2D(map, vUv);
      diffuseColor.rgb *= color;
      float despillG = min(diffuseColor.g, max(diffuseColor.r, diffuseColor.b));
      float despillCyan = min(cyanCut * max(min(despillG, diffuseColor.b) - diffuseColor.r, 0.0), min(despillG, diffuseColor.b));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(diffuseColor.r, despillG - despillCyan, diffuseColor.b - despillCyan), despill);
      diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722))), diffuseColor.rgb, saturation);
      float contrastLuma = max(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)), 1e-4);
      diffuseColor.rgb *= 0.18 * pow(contrastLuma / 0.18, contrast) / contrastLuma; diffuseColor.rgb = min(diffuseColor.rgb, vec3(1.0));
      gl_FragColor = vec4(diffuseColor.rgb, 1.0);
      #include <colorspace_fragment>
    }`,
})
const gradeQuad = new FullScreenQuad(gradeMaterial)

// A raw copy of a texture (the relief maps: data, no colour conversion), to read it back on the CPU
const copyMaterial = new THREE.ShaderMaterial({
  uniforms: { map: { value: null } },
  vertexShader: gradeMaterial.vertexShader,
  fragmentShader: /* glsl */ `
    uniform sampler2D map;
    varying vec2 vUv;
    void main() {
      gl_FragColor = texture2D(map, vUv);
    }`,
})
const copyQuad = new FullScreenQuad(copyMaterial)

// A relief map in the path tracer's form: the mesh drawn in its texture layout (uv as the position); each pixel gets
// the relief normal (object space, through the map's texture transform) in the frame the path tracer builds there:
// interpolated normal N, tangent T, bitangent normalize(cross(N, T) * w), as in its get_surface_record_function
const tangentMaterial = new THREE.ShaderMaterial({
  uniforms: { reliefMap: { value: null }, reliefTransform: { value: new THREE.Matrix3() } },
  vertexShader: /* glsl */ `
    attribute vec4 tangent;
    varying vec3 vNormal;
    varying vec4 vTangent;
    varying vec2 vUv;
    void main() {
      vNormal = normal;
      vTangent = tangent;
      vUv = uv;
      gl_Position = vec4(uv * 2.0 - 1.0, 0.0, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D reliefMap;
    uniform mat3 reliefTransform;
    varying vec3 vNormal;
    varying vec4 vTangent;
    varying vec2 vUv;
    void main() {
      vec3 relief = normalize(texture2D(reliefMap, (reliefTransform * vec3(vUv, 1.0)).xy).xyz * 2.0 - 1.0);
      vec3 n = normalize(vNormal);
      vec3 t = normalize(vTangent.xyz);
      vec3 b = normalize(cross(n, t) * vTangent.w);
      vec3 local = clamp(inverse(mat3(t, b, n)) * relief, -1.0, 1.0);
      gl_FragColor = vec4(local * 0.5 + 0.5, 1.0);
    }`,
  side: THREE.DoubleSide,
  depthTest: false,
  depthWrite: false,
})
const flatCamera = new THREE.Camera()
const RELIEF_READ_SIZE = 1024

/**
 * A copy of the geometry the path tracer can read: plain floats (position, uv, normal), same triangles
 * @param {THREE.BufferGeometry} geometry
 * @param {((u: number, v: number, out: THREE.Vector3) => void) | null} reliefNormal - the relief map's normal at a
 *   texture coordinate (object space); null: averaged normals
 */
function floatGeometry(geometry, reliefNormal) {
  const copy = new THREE.BufferGeometry()
  for (const name of ['position', 'uv']) {
    const attribute = geometry.attributes[name]
    if (!attribute) continue
    const size = attribute.itemSize
    const values = new Float32Array(attribute.count * size)
    for (let i = 0; i < attribute.count; i++) {
      for (let k = 0; k < size; k++) values[i * size + k] = attribute.getComponent(i, k)
    }
    copy.setAttribute(name, new THREE.BufferAttribute(values, size))
  }
  const count = geometry.attributes.position.count
  const index = geometry.index ? Uint32Array.from(geometry.index.array) : Uint32Array.from({ length: count }, (_, i) => i)
  const uv = copy.attributes.uv
  if (!reliefNormal || !uv) {
    copy.setIndex(new THREE.BufferAttribute(index, 1))
    copy.computeVertexNormals()
    return copy
  }
  const normals = new Float32Array(count * 3)
  const n = new THREE.Vector3()
  for (let i = 0; i < count; i++) {
    reliefNormal(uv.getX(i), uv.getY(i), n)
    normals.set([n.x, n.y, n.z], i * 3)
  }
  copy.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  // Triangles turned over where their winding disagrees with their vertices' normals
  const position = copy.attributes.position
  const [a, b, c, ab, ac, face, sum] = Array.from({ length: 7 }, () => new THREE.Vector3())
  for (let t = 0; t < index.length; t += 3) {
    a.fromBufferAttribute(position, index[t])
    b.fromBufferAttribute(position, index[t + 1])
    c.fromBufferAttribute(position, index[t + 2])
    face.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a))
    sum.set(0, 0, 0)
    for (let k = 0; k < 3; k++) sum.x += normals[index[t + k] * 3], sum.y += normals[index[t + k] * 3 + 1], sum.z += normals[index[t + k] * 3 + 2]
    if (face.dot(sum) < 0) [index[t + 1], index[t + 2]] = [index[t + 2], index[t + 1]]
  }
  copy.setIndex(new THREE.BufferAttribute(index, 1))
  return copy
}

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
  let textureSize = 0
  /** @type {Map<THREE.Texture, (u: number, v: number, out: THREE.Vector3) => void>} */
  let reliefReaders = new Map()

  /**
   * Reads a relief map (object-space normals) back from the GPU: a function giving its normal at a texture
   * coordinate, through the map's texture transform
   * @param {THREE.Texture} normalMap
   */
  function reliefReader(normalMap) {
    if (reliefReaders.has(normalMap)) return reliefReaders.get(normalMap)
    const size = RELIEF_READ_SIZE
    const target = new THREE.WebGLRenderTarget(size, size)
    copyMaterial.uniforms.map.value = normalMap
    const previous = renderer.getRenderTarget()
    renderer.setRenderTarget(target)
    copyQuad.render(renderer)
    renderer.setRenderTarget(previous)
    const pixels = new Uint8Array(size * size * 4)
    renderer.readRenderTargetPixels(target, 0, 0, size, size, pixels)
    target.dispose()
    normalMap.updateMatrix()
    const matrix = normalMap.matrix.clone()
    const p = new THREE.Vector3()
    const read = (u, v, out) => {
      p.set(u, v, 1).applyMatrix3(matrix)
      const x = Math.min(size - 1, Math.max(0, Math.floor((p.x - Math.floor(p.x)) * size)))
      const y = Math.min(size - 1, Math.max(0, Math.floor((p.y - Math.floor(p.y)) * size)))
      const o = (y * size + x) * 4
      out.set(pixels[o] / 127.5 - 1, pixels[o + 1] / 127.5 - 1, pixels[o + 2] / 127.5 - 1)
      if (out.lengthSq() < 1e-6) out.set(0, 0, 1)
      out.normalize()
    }
    reliefReaders.set(normalMap, read)
    return read
  }

  /**
   * A corrected copy of a surface texture (see gradeMaterial)
   * @param {THREE.Texture} map
   * @param {{ color: THREE.Color, despill: number, cyanCut: number, saturation: number, contrast: number }} grade
   * @param {number} size - px
   */
  function gradedTexture(map, grade, size) {
    const target = new THREE.WebGLRenderTarget(size, size, { colorSpace: THREE.SRGBColorSpace })
    Object.assign(gradeMaterial.uniforms.map, { value: map })
    gradeMaterial.uniforms.color.value.copy(grade.color)
    gradeMaterial.uniforms.despill.value = grade.despill
    gradeMaterial.uniforms.cyanCut.value = grade.cyanCut
    gradeMaterial.uniforms.saturation.value = grade.saturation
    gradeMaterial.uniforms.contrast.value = grade.contrast
    const previous = renderer.getRenderTarget()
    renderer.setRenderTarget(target)
    gradeQuad.render(renderer)
    renderer.setRenderTarget(previous)
    // Same placement as the original: flip, wrap, and its texture transform (the tiles' texture coordinates are
    // 16-bit integers; the scale and offset that turn them back into the texture's range are on the texture)
    const texture = target.texture
    texture.flipY = map.flipY
    texture.wrapS = map.wrapS
    texture.wrapT = map.wrapT
    texture.offset.copy(map.offset)
    texture.repeat.copy(map.repeat)
    texture.center.copy(map.center)
    texture.rotation = map.rotation
    texture.updateMatrix()
    graded.push(target)
    return target.texture
  }

  /**
   * The relief map of a mesh in the path tracer's form (see tangentMaterial), at the texture array's size
   * @param {THREE.BufferGeometry} geometry - the float copy, with its normals and tangents
   * @param {THREE.Texture} reliefMap - object space
   * @param {number} size - px
   */
  function tangentReliefMap(geometry, reliefMap, size) {
    const target = new THREE.WebGLRenderTarget(size, size)
    reliefMap.updateMatrix()
    tangentMaterial.uniforms.reliefMap.value = reliefMap
    tangentMaterial.uniforms.reliefTransform.value.copy(reliefMap.matrix)
    const flat = new THREE.Mesh(geometry, tangentMaterial)
    flat.frustumCulled = false
    const previous = renderer.getRenderTarget()
    const clear = [renderer.getClearColor(new THREE.Color()), renderer.getClearAlpha()]
    renderer.setRenderTarget(target)
    // Between the atlas pieces: a flat relief (straight along the normal)
    renderer.setClearColor(new THREE.Color(0.5, 0.5, 1), 1)
    renderer.clear()
    renderer.render(flat, flatCamera)
    renderer.setRenderTarget(previous)
    renderer.setClearColor(...clear)
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
   * @param {(mesh: THREE.Mesh) => { color: THREE.Color, despill: number, cyanCut: number, saturation: number, contrast: number, roughness: number }} source.surfaceGrade
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

    // The surfaces on screen, then one material per texture and correction
    const surfaces = []
    for (const root of roots) {
      root.updateMatrixWorld(true)
      root.traverseVisible((object) => {
        if (!object.isMesh || !object.userData.surface) return
        const grade = surfaceGrade(object)
        const surface = object.userData.surface
        const relief = Boolean(surface.zoneId && surface.normalMap && surface.map)
        // A mesh with relief has its own material (its relief map is drawn from its own geometry)
        const key = `${surface.map?.uuid ?? 'none'}-${grade.color.getHexString()}-${grade.roughness}${relief ? `-${object.uuid}` : ''}`
        surfaces.push({ object, grade, key, relief })
      })
    }
    const textures = new Set(surfaces.filter((s) => s.object.userData.surface.map).map((s) => s.key)).size +
      surfaces.filter((s) => s.relief).length
    const largest = Math.sqrt(TEXTURE_BUDGET / 4 / Math.max(textures, 1))
    const size = THREE.MathUtils.clamp(2 ** Math.floor(Math.log2(largest)), TEXTURE_SIZES[0], Math.min(TEXTURE_SIZES[1], renderer.capabilities.maxTextureSize))
    const materials = new Map()
    for (const { object, grade, key, relief } of surfaces) {
      const surface = object.userData.surface
      const geometry = floatGeometry(object.geometry, relief ? reliefReader(surface.normalMap) : null)
      let material = materials.get(key)
      if (!material) {
        material = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, metalness: 0, roughness: grade.roughness })
        if (surface.map) material.map = gradedTexture(surface.map, grade, size)
        else material.color.copy(grade.color)
        if (relief) {
          geometry.computeTangents()
          material.normalMap = tangentReliefMap(geometry, surface.normalMap, size)
        }
        materials.set(key, material)
      }
      const copy = new THREE.Mesh(geometry, material)
      copy.matrixAutoUpdate = false
      copy.matrix.copy(object.matrixWorld)
      photoScene.add(copy)
    }
    textureSize = size
    reliefReaders = new Map()
    photoScene.updateMatrixWorld(true)

    pathTracer = new WebGLPathTracer(renderer)
    pathTracer.setBVHWorker(new ParallelMeshBVHWorker())
    pathTracer.textureSize.set(size, size)
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
    // The path tracer has its own copies of the textures (its texture array): ours can go
    graded.forEach((target) => target.dispose())
    graded = []
    return true
  }

  function stop() {
    building = null
    pathTracer?.dispose()
    pathTracer = null
    graded.forEach((target) => target.dispose())
    graded = []
    photoScene?.traverse((object) => {
      object.geometry?.dispose()
      object.material?.dispose()
    })
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
      return { pathTracer, photoScene, graded, textureSize }
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
