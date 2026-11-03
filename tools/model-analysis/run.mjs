// Analyse la résolution des maillages de zones (Blender en arrière-plan, lecture seule): densité de triangles, taille
// des texels, texels par triangle, fragments; compare aux seuils de thresholds.json et écrit un rapport daté dans reports/.
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { capture, cli, paths } from '../publish-model/lib/pipeline.mjs'

const o = cli(`Analyse la résolution des maillages de zones (Blender en arrière-plan, lecture seule).

Usage: node tools/model-analysis/run.mjs [options]

  -b, --blend <fichier>  .blend à analyser (défaut ${paths.blend})
  -B, --blender <exe>    exécutable Blender (défaut ${paths.blender})
  -h, --help             afficher cette aide`, {
  blend: { type: 'string', short: 'b', default: paths.blend },
  blender: { type: 'string', short: 'B', default: paths.blender },
})
const blend = resolve(o.blend)
if (!existsSync(blend)) throw new Error(`${blend} introuvable`)
const here = dirname(fileURLToPath(import.meta.url))
const output = capture(o.blender, ['-b', blend, '--factory-startup', '--python', join(here, 'analyze_zones.py'), '--', join(here, 'thresholds.json'), join(here, 'reports')])
output.split(/\r?\n/).filter((l) => /^(analysé|rapport|Error|Traceback)/i.test(l)).forEach((l) => console.log(l))
