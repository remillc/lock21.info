// Prépare et tuile des zones depuis le .blend de travail, puis supprime les versions de tuiles remplacées. Pour chaque
// zone: prepare_zone.py (Blender), puis tile_zone.mjs (Obj2Tiles, simplification, compression, manifeste). Une zone en
// échec n'arrête pas les suivantes; le code de sortie le dit à la fin.
import { existsSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { capture, cli, logLines, newVersion, node, paths, PUBLISH_DIR, readJson, removeFoldersExcept, removeOldVersions, run, showDuration, showLog, startLog, updateManifest } from './lib/pipeline.mjs'

const HELP = `Prépare et tuile des zones depuis le .blend de travail, puis supprime les versions remplacées.

Le contexte (fillers + terrain) se publie avec la zone spéciale « context ».

Usage: node tools/publish-model/publish_zones.mjs -z "zone 2" -z context
       npm run model:check | model:post-modified

  -z, --zone <nom>          zone à publier, ex. "zone 2" ou context (à répéter)
  -c, --changed             publier seulement ce qui a changé dans le .blend depuis la dernière publication
                            (empreintes, check_changes.py; npm run model:post-modified)
  -n, --dry-run             avec --changed: lister les zones modifiées sans publier (npm run model:check)
  -V, --version <nom>       dossier de la nouvelle version (défaut: date et heure, yyyy-MM-dd-HHmm)
  -d, --density <n>         triangles visés par m² après décimation, pour toutes les zones de l'appel. Sans elle: la
                            densité de la zone dans zone-density.json, sinon 3000
  -b, --blend <fichier>     .blend de travail (défaut ${paths.blend})
  -B, --blender <exe>       exécutable Blender (défaut ${paths.blender})
  -t, --temp-root <dir>     dossier des journaux (défaut ${paths.temp})
  -p, --prepared-root <dir> zones préparées (défaut ${paths.prepared})
  -T, --tiles-root <dir>    racine des tuiles (défaut ${paths.tiles})
  -h, --help                afficher cette aide`

const o = cli(HELP, {
  zone: { type: 'string', short: 'z', multiple: true },
  changed: { type: 'boolean', short: 'c' },
  'dry-run': { type: 'boolean', short: 'n' },
  version: { type: 'string', short: 'V' },
  density: { type: 'string', short: 'd' },
  blend: { type: 'string', short: 'b', default: paths.blend },
  blender: { type: 'string', short: 'B', default: paths.blender },
  'temp-root': { type: 'string', short: 't', default: paths.temp },
  'prepared-root': { type: 'string', short: 'p', default: paths.prepared },
  'tiles-root': { type: 'string', short: 'T', default: paths.tiles },
})
const tilesRoot = resolve(o['tiles-root'])
const version = o.version ?? newVersion()
const blend = resolve(o.blend)
if (!existsSync(blend)) throw new Error(`${blend} introuvable`)
const blenderOn = (script, args) => ['-b', blend, '--factory-startup', '--python', join(PUBLISH_DIR, script), '--', ...args]

let zones = o.zone ?? []
if (o.changed) {
  const lines = capture(o.blender, blenderOn('check_changes.py', [tilesRoot])).split(/\r?\n/)
  lines.filter((l) => l.startsWith('zone ')).forEach((l) => console.log(l))
  const answer = lines.find((l) => l.startsWith('A_PUBLIER'))
  if (answer === undefined) throw new Error('check_changes.py n\'a pas répondu: le .blend est-il lisible?')
  zones = answer.replace(/^A_PUBLIER:\s*/, '').split(',').map((z) => z.trim()).filter(Boolean)
  if (!zones.length) {
    console.log('Rien à publier.')
    process.exit(0)
  }
  if (o['dry-run']) {
    console.log(`À publier: ${zones.join(', ')}`)
    process.exit(0)
  }
}
if (!zones.length) {
  console.error(`Indiquer --zone ou --changed\n\n${HELP}`)
  process.exit(2)
}

// Les densités propres à certaines zones (zone-density.json: "zone 16": 15000)
const densities = readJson(join(PUBLISH_DIR, 'zone-density.json'))
const failed = []

function publishContext() {
  // Contexte (fillers + terrain): un .glb non tuilé
  const out = join(tilesRoot, 'context', version)
  const log = join(o['temp-root'], 'context-publish.log')
  startLog(log)
  run(o.blender, blenderOn('export_context.py', [out]), { log, check: false })
  node('compress_tiles.mjs', [out], { log, check: false })
  if (!existsSync(join(out, 'context.glb'))) {
    console.log(`   ÉCHEC, voir ${log}`)
    return false
  }
  updateManifest(tilesRoot, 'context', `context/${version}/context.glb`, { kind: 'model' })
  showLog(log, /^\[context\]|compression:/i)
  removeFoldersExcept(join(tilesRoot, 'context'), [version])
  return true
}

function publishZone(zone) {
  const slug = zone.replaceAll(' ', '-')
  const prepared = join(o['prepared-root'], slug)
  const log = join(o['temp-root'], `${slug}-publish.log`)
  const started = Date.now()

  // La densité de la zone: --density, sinon zone-density.json, sinon 3000
  const density = Number(o.density ?? densities[zone] ?? 3000)
  if (density !== 3000) console.log(`   densité: ${density} triangles par m²`)

  // Préparation (remplace l'OBJ préparé précédent)
  rmSync(prepared, { recursive: true, force: true })
  startLog(log)
  run(o.blender, blenderOn('prepare_zone.py', ['--zone', zone, '--density', String(density), '--out', prepared]), { log, check: false })
  if (!existsSync(join(prepared, `${slug}.obj`))) {
    showLog(log, /Error|assert|Traceback|line \d+/i)
    console.log(`   ÉCHEC de la préparation, voir ${log}`)
    return false
  }
  showLog(log, /^\[.*(register|deform|proximity|decimate|deviation)/i)

  // Tuilage, compression, manifeste
  const code = node('tile_zone.mjs', ['-z', slug, '-p', prepared, '-V', version, '-T', tilesRoot], { log, check: false })
  showLog(log, /compression:|manifeste/i)
  if (code !== 0) {
    logLines(log, /Error|Traceback/i).slice(-5).forEach((l) => console.log(`   ${l}`))
    console.log(`   ÉCHEC du tuilage, voir ${log}`)
    return false
  }

  // Ménage: versions de la zone qui ne sont plus dans le manifeste
  removeOldVersions(tilesRoot, slug)
  showDuration(started)
  return true
}

for (const zone of zones) {
  console.log(`=== ${zone}`)
  if (!(zone === 'context' ? publishContext() : publishZone(zone))) failed.push(zone)
}
if (failed.length) {
  console.log(`En échec: ${failed.join(', ')}`)
  process.exitCode = 1
}
