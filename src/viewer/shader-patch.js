// Shader patches (TODO #26, 2026-10-27): the viewer adds its own code to three.js's shaders in onBeforeCompile, at
// the #include lines of three.js's shader chunks (stable from one version to the next). A plain String.replace does
// nothing when its hook is gone, and the effect then disappears without a word: after a three.js update, a renamed
// chunk. insertAt reports it instead (console and telemetry, once per patch). Before updating three.js: open /modele
// and look for « shader hook missing » (docs/guidelines.md).
import { log } from './telemetry.js'

const reported = new Set()

/**
 * Replaces a hook of a three.js shader (an #include line) with code; repeat the hook in the code to keep it.
 * @param {{ vertexShader: string, fragmentShader: string }} shader - from onBeforeCompile
 * @param {'vertexShader' | 'fragmentShader'} stage
 * @param {string} hook - e.g. '#include <map_fragment>'
 * @param {string} code - what takes its place
 * @param {string} name - the patch, for the report
 * @returns {boolean} whether the hook was found
 */
export function insertAt(shader, stage, hook, code, name) {
  if (!shader[stage].includes(hook)) {
    if (!reported.has(name)) {
      reported.add(name)
      console.error(`[viewer] shader hook missing: ${hook} (${name})`)
      log('shader', { patch: name, hook })
    }
    return false
  }
  // (a function: GLSL never needs String.replace's $ patterns)
  shader[stage] = shader[stage].replace(hook, () => code)
  return true
}
