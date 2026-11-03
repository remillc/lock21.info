// What the publishing scripts share: where things are, running a program with a log, the manifest and the tileset's
// fixes. No dependency: the scripts that only orchestrate run without tools/publish-model/node_modules.
//
// Paths: LOCK21_DATA (the data root, default O:\ on Windows, ~/lock21-data elsewhere), LOCK21_BLENDER, LOCK21_OBJ2TILES,
// from the environment or from .env.local. Only these keys are read from .env.local: the credentials it also holds must
// not reach Blender or Obj2Tiles through the environment.
import { spawnSync } from 'node:child_process'
import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseEnv, parseArgs } from 'node:util'

export const PUBLISH_DIR = dirname(dirname(fileURLToPath(import.meta.url)))
const REPO = dirname(dirname(PUBLISH_DIR))

const envFile = join(REPO, '.env.local')
const local = existsSync(envFile) ? parseEnv(readFileSync(envFile, 'utf8')) : {}
const setting = (key) => process.env[key] || local[key]

const windows = process.platform === 'win32'
const data = setting('LOCK21_DATA') || (windows ? 'O:\\' : join(homedir(), 'lock21-data'))
const DEFAULT_BLENDER = {
  win32: 'C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe',
  darwin: '/Applications/Blender.app/Contents/MacOS/Blender',
}

/** The default paths; each script's options override them. */
export const paths = {
  blend: join(data, 'modeles', 'lock-21', 'lock-21-publishing.blend'),
  blender: setting('LOCK21_BLENDER') || DEFAULT_BLENDER[process.platform] || 'blender',
  obj2tiles: setting('LOCK21_OBJ2TILES') || join(data, 'publishing', 'bin', 'obj2tiles-1.8.0', windows ? 'Obj2Tiles.exe' : 'Obj2Tiles'),
  temp: join(data, 'temp'),
  prepared: join(data, 'publishing', 'prepared'),
  tiles: join(data, 'publishing', 'tiles'),
}

/**
 * The command line: -h/--help prints `help` and leaves; a wrong option prints the error and leaves with code 2.
 * @param {string} help
 * @param {import('node:util').ParseArgsConfig['options']} options
 * @param {boolean} [allowPositionals] the arguments without an option are then in `positionals`
 * @returns {Record<string, any>}
 */
export function cli(help, options, allowPositionals = false) {
  try {
    const { values, positionals } = parseArgs({ allowPositionals, options: { ...options, help: { type: 'boolean', short: 'h' } } })
    if (values.help) {
      console.log(help)
      process.exit(0)
    }
    return { ...values, positionals }
  } catch (e) {
    console.error(`${e.message}\n\n${help}`)
    process.exit(2)
  }
}

/**
 * Runs a program and waits for it. Its output goes to `log` (appended) or, without one, to this script's.
 * @param {string} command
 * @param {string[]} args
 * @param {{ log?: string, check?: boolean }} [options] `check: false`: a failure is left to the caller (Blender often
 *   exits with 0 on a Python error anyway: what it wrote tells).
 * @returns {number} the exit code
 */
export function run(command, args, { log, check = true } = {}) {
  const fd = log ? openSync(log, 'a') : null
  try {
    const { status, error } = spawnSync(command, args, { stdio: fd === null ? 'inherit' : ['ignore', fd, fd] })
    if (error) throw new Error(`${command}: ${error.message}`)
    if (check && status !== 0) throw new Error(`${command} ${args[0] ?? ''}: code de sortie ${status}`)
    return status
  } finally {
    if (fd !== null) closeSync(fd)
  }
}

/**
 * Runs a program and returns what it printed on its standard output; its errors are shown only if it fails.
 * @param {string} command
 * @param {string[]} args
 * @returns {string}
 */
export function capture(command, args) {
  const { status, stdout, stderr, error } = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 2 ** 30 })
  if (error) throw new Error(`${command}: ${error.message}`)
  if (status !== 0) throw new Error(`${command} ${args[0] ?? ''}: code de sortie ${status}\n${stderr}`)
  return stdout
}

/** A script of this folder, run with this Node. */
export const node = (script, args, options) => run(process.execPath, [join(PUBLISH_DIR, script), ...args], options)

/** An empty log, its folder made if needed. */
export function startLog(log) {
  mkdirSync(dirname(log), { recursive: true })
  writeFileSync(log, '')
}

/** The log's lines that match. */
export const logLines = (log, pattern) => readFileSync(log, 'utf8').split(/\r?\n/).filter((l) => pattern.test(l))

/** Prints the log's lines that match, indented under their zone. */
export const showLog = (log, pattern) => logLines(log, pattern).forEach((l) => console.log(`   ${l}`))

/**
 * The zones' detailed exports (zone-high.json), full paths by zone name, for the zones whose source is a low-resolution one.
 * @returns {Map<string, string>}
 */
export function highExports() {
  const entries = Object.entries(readJson(join(PUBLISH_DIR, 'zone-high.json'))).filter(([zone]) => !zone.startsWith('_'))
  return new Map(entries.map(([zone, path]) => [zone, join(data, path)]))
}

/**
 * Bakes a zone's normal map (bake_relief.py) from its detailed export onto its prepared mesh, into `relief`, with a copy
 * of the prepared zone that references the map, ready for tile_zone.mjs. A map already baked (newer than the prepared
 * mesh, from the same export, noted beside it) is used again, unless `rebake`.
 * @param {{ zone: string, prepared: string, relief: string, high?: string, blend?: string, blender: string, log: string, rebake?: boolean }} o
 * @returns {boolean} the map is there
 */
export function bakeRelief({ zone, prepared, relief, high, blend, blender, log, rebake = false }) {
  const slug = zone.replaceAll(' ', '-')
  const normal = join(relief, `${slug}-normal.png`)
  const from = join(relief, `${slug}-normal-from.txt`)
  const highPath = high ?? 'source'
  const obj = join(prepared, `${slug}.obj`)
  const fresh = existsSync(normal) && existsSync(from) && statSync(normal).mtimeMs > statSync(obj).mtimeMs && readText(from).trim() === highPath
  if (fresh && !rebake) {
    console.log(`   carte existante réutilisée: ${normal}`)
    return true
  }
  // What an earlier bake left must not pass for this one's
  const before = logLines(log, /^\[relief\] done/i).length
  const args = ['-z', zone, '-p', prepared, '-o', relief, ...(high ? ['--high', high] : []), ...(blend ? ['-b', blend] : [])]
  run(blender, ['-b', '--factory-startup', '--python', join(PUBLISH_DIR, 'bake_relief.py'), '--', ...args], { log, check: false })
  showLog(log, /^\[relief\]|^Traceback|^\w*Error|assert/i)
  if (logLines(log, /^\[relief\] done/i).length <= before) {
    console.log(`   ÉCHEC de la cuisson, voir ${log}`)
    return false
  }
  writeFileSync(from, highPath)
  return true
}

/** The name of a new version: the local date and time, yyyy-MM-dd-HHmm. */
export function newVersion() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}

/** A JSON file, as UTF-8 with or without the BOM Windows PowerShell wrote. */
export const readJson = (path) => JSON.parse(readText(path))

/** A text file without the BOM Windows PowerShell wrote. */
export const readText = (path) => readFileSync(path, 'utf8').replace(/^\uFEFF/, '')

/**
 * Enters (or replaces) a tileset or a model in the manifest the viewer reads.
 *
 * `added` is the id's first publication (written then, kept after): the home page takes the last zone added from it;
 * zones published before 2026-10-22 have none. Without `color` the colour already written stays: the viewer takes the
 * zone's balance from this mean of the texture, in linear light. `light`: `url` is the zone's light set (phones and
 * tablets), the rest of the entry kept; a new full version (without `light`) drops the former light set, which
 * belonged to the previous version.
 * @param {string} root the tiles' root (holds manifest.json)
 * @param {string} id e.g. zone-12 or context
 * @param {string} url relative path of the tileset.json or the .glb
 * @param {{ kind?: 'tileset' | 'model', color?: number[], light?: boolean }} [options]
 */
export function updateManifest(root, id, url, { kind = 'tileset', color, light = false } = {}) {
  const key = kind === 'model' ? 'models' : 'tilesets'
  const path = join(root, 'manifest.json')
  const manifest = existsSync(path) ? readJson(path) : { version: 1, tilesets: [] }
  const list = manifest[key] ?? []
  const old = list.find((t) => t.id === id)
  const others = list.filter((t) => t.id !== id)
  const now = new Date().toISOString().slice(0, 19) + '+00:00'
  let entry
  if (light) {
    if (!old) throw new Error(`${id}: pas dans le manifeste, publier d'abord sa version complète`)
    entry = { ...old, light: url }
  } else {
    entry = { id, url }
    const added = old ? old.added : now
    if (added) entry.added = added
    const rgb = color ?? old?.color
    if (rgb) entry.color = rgb.map((c) => Number(c.toFixed(5)))
  }
  manifest[key] = [...others, entry].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  manifest.updated = now
  writeFileSync(path, JSON.stringify(manifest, null, 2))
  console.log(`manifeste: ${id}${light ? ' (léger)' : ''} -> ${url}`)
}

// Metres: an empty root is always refined
const EMPTY_ROOT_ERROR = 1e6

/**
 * Fixes the tileset.json Obj2Tiles writes. A root without content (--no-root-content) gets a very large geometric
 * error: otherwise, from afar, the empty root looks precise enough, the viewer doesn't go down to the first level with
 * content, and the zone doesn't show (zone 8, the farthest from the camera). Fields set to null (`content`,
 * `transform`), not valid 3D Tiles, are removed.
 * @param {string} dir the tileset's folder
 */
export function fixTileset(dir) {
  const path = join(dir, 'tileset.json')
  const tileset = readJson(path)
  const clean = (tile) => {
    for (const key of Object.keys(tile)) if (tile[key] === null) delete tile[key]
    tile.children?.forEach(clean)
  }
  clean(tileset.root)
  if (!('content' in tileset.root)) {
    tileset.root.geometricError = EMPTY_ROOT_ERROR
    tileset.geometricError = EMPTY_ROOT_ERROR
  }
  writeFileSync(path, JSON.stringify(tileset))
  console.log(`tileset corrigé: ${path}`)
}

/**
 * Removes a zone's versions that are no longer in the manifest (the active version stays, and its light set).
 * @param {string} root the tiles' root
 * @param {string} slug e.g. zone-12
 */
export function removeOldVersions(root, slug) {
  const entry = readJson(join(root, 'manifest.json')).tilesets.find((t) => t.id === slug)
  // Nothing active for this zone: nothing here can be told from what should stay
  if (!entry) return
  const active = [entry.url, entry.light].filter(Boolean).map((u) => u.split('/')[1])
  removeFoldersExcept(join(root, slug), active)
}

/** Removes the folders of `dir` not named in `keep`, and says so. */
export function removeFoldersExcept(dir, keep) {
  for (const name of readdirSync(dir)) {
    if (keep.includes(name) || !statSync(join(dir, name)).isDirectory()) continue
    rmSync(join(dir, name), { recursive: true, force: true })
    console.log(`   supprimé: ${name}`)
  }
}

/** Elapsed seconds, for the zone's last line. */
export const showDuration = (started) => console.log(`   durée: ${Math.round((Date.now() - started) / 1000)} s`)
