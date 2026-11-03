// Relief des zones: cuit la carte des normales (bake_relief.py) puis retuile la zone avec (tile_zone.mjs). Rien n'est
// envoyé vers R2 (upload_r2.mjs, à part). Une zone en échec n'arrête pas les suivantes; le code de sortie le dit à la fin.
import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { cli, logLines, newVersion, node, paths, PUBLISH_DIR, readText, removeOldVersions, run, showDuration, showLog, startLog } from './lib/pipeline.mjs'

const HELP = `Relief des zones: cuit la carte des normales puis retuile la zone avec.

Pour chaque zone: cuisson de la carte des normales depuis l'export détaillé sur le mesh préparé (<prepared-root>\\<zone>,
celui des tuiles publiées), dans <temp-root>\\<zone>\\relief; puis tuilage avec la carte greffée (manifeste local mis à
jour) et ménage des anciennes versions de la zone. Une carte déjà cuite (relief\\<zone>-normal.png plus récente que le
mesh préparé, et cuite depuis le même export) est réutilisée, sauf avec --rebake.

Usage: node tools/publish-model/relief_zones.mjs -z "zone 12" -z "zone 1" --high "zone 1=O:\\modeles\\zone-1\\export.glb"

  -z, --zone <nom>          zone à traiter, ex. "zone 12" (à répéter)
  -H, --high "<zone>=<glb>" export détaillé à utiliser à la place de la source de cette zone (à répéter). Même chunk
                            Metashape que la source (même repère); bake_relief.py s'arrête si les deux ne concordent pas
  -r, --rebake              cuire de nouveau même si une carte récente existe
  -B, --blender <exe>       exécutable Blender (défaut ${paths.blender})
  -t, --temp-root <dir>     dossier de travail et des journaux (défaut ${paths.temp})
  -p, --prepared-root <dir> zones préparées (défaut ${paths.prepared})
  -T, --tiles-root <dir>    racine des tuiles (défaut ${paths.tiles})
  -h, --help                afficher cette aide`

const o = cli(HELP, {
  zone: { type: 'string', short: 'z', multiple: true },
  high: { type: 'string', short: 'H', multiple: true, default: [] },
  rebake: { type: 'boolean', short: 'r' },
  blender: { type: 'string', short: 'B', default: paths.blender },
  'temp-root': { type: 'string', short: 't', default: paths.temp },
  'prepared-root': { type: 'string', short: 'p', default: paths.prepared },
  'tiles-root': { type: 'string', short: 'T', default: paths.tiles },
})
if (!o.zone?.length) {
  console.log(HELP)
  process.exit(2)
}
const tilesRoot = resolve(o['tiles-root'])
const high = new Map(o.high.map((h) => {
  const at = h.indexOf('=')
  if (at < 1) throw new Error(`--high "${h}": attendu "<zone>=<glb>"`)
  return [h.slice(0, at), h.slice(at + 1)]
}))
const time = () => new Date().toTimeString().slice(0, 5)

/** The .glb files under a folder, recursively. */
const glbsIn = (dir) => (existsSync(dir) ? readdirSync(dir, { recursive: true }).filter((f) => f.endsWith('.glb')).map((f) => join(dir, f)) : [])

function reliefZone(zone) {
  const slug = zone.replaceAll(' ', '-')
  const prepared = join(o['prepared-root'], slug)
  const relief = join(o['temp-root'], slug, 'relief')
  const log = join(o['temp-root'], `${slug}-relief.log`)
  const started = Date.now()
  const obj = join(prepared, `${slug}.obj`)
  if (!existsSync(obj)) {
    console.log(`   pas de mesh préparé: ${prepared}`)
    return false
  }
  startLog(log)

  // Cuisson, réutilisée si plus récente que le mesh préparé et cuite depuis le même export (noté à côté de la carte)
  const normal = join(relief, `${slug}-normal.png`)
  const from = join(relief, `${slug}-normal-from.txt`)
  const highPath = high.get(zone) ?? 'source'
  const fresh = existsSync(normal) && existsSync(from) && statSync(normal).mtimeMs > statSync(obj).mtimeMs && readText(from).trim() === highPath
  if (fresh && !o.rebake) {
    console.log(`   carte existante réutilisée: ${normal}`)
  } else {
    const bakeArgs = ['-z', zone, '-p', prepared, '-o', relief, ...(high.has(zone) ? ['--high', high.get(zone)] : [])]
    run(o.blender, ['-b', '--factory-startup', '--python', join(PUBLISH_DIR, 'bake_relief.py'), '--', ...bakeArgs], { log, check: false })
    showLog(log, /^\[relief\]|Error|assert|Traceback/i)
    if (!logLines(log, /^\[relief\] done/i).length) {
      console.log(`   ÉCHEC de la cuisson, voir ${log}`)
      return false
    }
    writeFileSync(from, highPath)
  }

  // Tuilage avec la carte, manifeste local
  const version = newVersion()
  const code = node('tile_zone.mjs', ['-z', slug, '-p', relief, '-V', version, '-T', tilesRoot], { log, check: false })
  const tiles = glbsIn(join(tilesRoot, slug, version))
  if (code !== 0 || !tiles.length) {
    console.log(`   ÉCHEC du tuilage, voir ${log}`)
    return false
  }
  showLog(log, /compression:|manifeste/i)
  const bytes = tiles.reduce((sum, f) => sum + statSync(f).size, 0)
  console.log(`   ${tiles.length} tuiles, ${Math.round(bytes / 2 ** 20)} Mo`)

  // Ménage: versions de la zone qui ne sont plus dans le manifeste
  removeOldVersions(tilesRoot, slug)
  showDuration(started)
  return true
}

const failed = []
for (const zone of o.zone) {
  console.log(`=== ${zone} (${time()})`)
  if (!reliefZone(zone)) failed.push(zone)
}
if (failed.length) {
  console.log(`En échec: ${failed.join(', ')}`)
  process.exitCode = 1
}
