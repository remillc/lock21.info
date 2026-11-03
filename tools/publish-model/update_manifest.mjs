// Inscrit (ou remplace) à la main un tileset ou un modèle dans le manifeste lu par le visualiseur: les maquettes, ou une
// copie de version (strip_coarse_normals.mjs). tile_zone.mjs et publish_zones.mjs le font eux-mêmes.
import { cli, updateManifest } from './lib/pipeline.mjs'

const HELP = `Inscrit (ou remplace) un tileset ou un modèle dans le manifeste lu par le visualiseur.

Usage: node tools/publish-model/update_manifest.mjs <racine des tuiles> <id> <url relative> [tileset|model] [options]

  tileset (défaut): tuiles 3D (tileset.json); model: modèle .glb non tuilé (contexte, maquettes)
  -c, --color "R G B"  couleur moyenne linéaire de la texture (texture_stats.mjs). Sans elle, la couleur déjà inscrite
                       pour cet id est conservée
  -l, --light          l'url est le jeu léger de la zone (téléphones, tablettes)
  -h, --help           afficher cette aide`

const o = cli(HELP, {
  color: { type: 'string', short: 'c' },
  light: { type: 'boolean', short: 'l' },
}, true)
const [root, id, url, kind = 'tileset'] = o.positionals
if (!url || !['tileset', 'model'].includes(kind)) {
  console.error(HELP)
  process.exit(2)
}
updateManifest(root, id, url, { kind, light: o.light, color: o.color?.trim().split(/\s+/).map(Number) })
