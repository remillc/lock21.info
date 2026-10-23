// Collisions for the swim mode (swim.js): the diver is a sphere of RADIUS that can't enter the model. A move is cast
// as a ray along its direction against the surfaces near the diver (the tiles and the context); a surface closer than
// the body stops it short, and the rest of the move slides along that surface (up to SLIDES times: into a corner).
// The rays use a bounding volume hierarchy (three-mesh-bvh), built for each mesh the first time the diver comes near
// it (a 30,000-triangle tile: a few milliseconds).
import * as THREE from 'three'
import { acceleratedRaycast, computeBoundsTree } from 'three-mesh-bvh'

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree
THREE.Mesh.prototype.raycast = acceleratedRaycast

// The diver's body (m: 1 m from any surface, the floor included; Christian, 2026-10-23, was 40 cm), and how many times
// a move slides on (along a wall, then into a corner)
const RADIUS = 1
const SLIDES = 3

/**
 * @param {() => THREE.Object3D[]} roots - the tilesets' groups and the context models, at the time of the move
 */
export function createCollider(roots) {
  const raycaster = new THREE.Raycaster()
  raycaster.firstHitOnly = true
  const sphere = new THREE.Sphere()
  const direction = new THREE.Vector3()
  const normal = new THREE.Vector3()
  const rest = new THREE.Vector3()

  /** The surfaces whose bounds come within reach of a point */
  function near(point, reach) {
    const meshes = []
    for (const root of roots()) {
      root.traverseVisible((object) => {
        if (!object.isMesh || !object.userData.surface) return
        const geometry = object.geometry
        if (!geometry.boundingSphere) geometry.computeBoundingSphere()
        sphere.copy(geometry.boundingSphere).applyMatrix4(object.matrixWorld)
        if (sphere.distanceToPoint(point) > reach) return
        if (!geometry.boundsTree) geometry.computeBoundsTree()
        meshes.push(object)
      })
    }
    return meshes
  }

  const local = new THREE.Vector3()
  const inverse = new THREE.Matrix4()
  const closest = { point: new THREE.Vector3(), distance: 0 }

  return {
    /**
     * The surfaces within reach of a point (their bounding volume hierarchies built), for distanceTo
     * @param {THREE.Vector3} point
     * @param {number} reach
     */
    surfacesNear: near,
    /**
     * Distance from a point to the nearest of the given surfaces, up to a limit (the limit when none is closer)
     * @param {THREE.Vector3} point
     * @param {THREE.Mesh[]} meshes - from surfacesNear
     * @param {number} limit
     */
    distanceTo(point, meshes, limit) {
      let best = limit
      for (const mesh of meshes) {
        // In the mesh's own frame (the tiles are scaled: uniformly)
        const scale = mesh.matrixWorld.getMaxScaleOnAxis()
        local.copy(point).applyMatrix4(inverse.copy(mesh.matrixWorld).invert())
        const found = mesh.geometry.boundsTree.closestPointToPoint(local, closest, 0, best / scale)
        if (found) best = Math.min(best, found.distance * scale)
      }
      return best
    },
    /**
     * The floor below a point: its height, and which surface it is (its zone or « context »), or null when there is
     * none within reach or it is too steep to stand on
     * @param {number} x
     * @param {number} y - from just above this height
     * @param {number} z
     */
    groundAt(x, y, z) {
      const from = new THREE.Vector3(x, y + 0.3, z)
      raycaster.set(from, new THREE.Vector3(0, -1, 0))
      raycaster.far = 1
      const meshes = near(from, 1.2)
      const hit = meshes.length ? raycaster.intersectObjects(meshes, false)[0] : null
      if (!hit) return null
      normal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld)
      if (Math.abs(normal.y) < 0.75) return null
      return { y: hit.point.y, floor: hit.object.userData.surface.zoneId ?? 'context' }
    },
    /**
     * Moves a position by a step, stopping short of the surfaces and sliding along them
     * @param {THREE.Vector3} position - changed in place
     * @param {THREE.Vector3} step
     */
    move(position, step) {
      rest.copy(step)
      for (let i = 0; i < SLIDES; i++) {
        const length = rest.length()
        if (length < 1e-5) return
        direction.copy(rest).divideScalar(length)
        const meshes = near(position, length + RADIUS)
        raycaster.set(position, direction)
        raycaster.far = length + RADIUS
        const hit = meshes.length ? raycaster.intersectObjects(meshes, false)[0] : null
        if (!hit) {
          position.add(rest)
          return
        }
        const allowed = Math.max(0, hit.distance - RADIUS)
        position.addScaledVector(direction, allowed)
        // The rest of the move, without its part into the surface (its normal, facing the diver)
        normal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld)
        if (normal.dot(direction) > 0) normal.negate()
        rest.copy(direction).multiplyScalar(length - allowed)
        rest.addScaledVector(normal, -rest.dot(normal))
      }
    },
  }
}
