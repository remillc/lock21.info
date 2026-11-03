// Tuile une zone préparée (OBJ + texture de prepare_zone.py) et l'inscrit dans le manifeste: Obj2Tiles (3D Tiles 1.1,
// KTX2), simplification des niveaux grossiers, compression meshopt, correction du tileset.json, copie de l'empreinte,
// mise à jour du manifeste, puis le jeu léger de cette version (téléphones et tablettes).
import { copyFileSync, existsSync, linkSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { capture, cli, fixTileset, newVersion, node, paths, PUBLISH_DIR, readJson, readText, run, updateManifest } from './lib/pipeline.mjs'

const HELP = `Tuile une zone préparée et l'inscrit dans le manifeste.

Usage: node tools/publish-model/tile_zone.mjs -z <zone> -p <dossier> [options]

  -z, --zone <id>         identifiant de la zone, ex. zone-12 (requis)
  -p, --prepared <dir>    dossier de l'OBJ préparé, ex. O:\\publishing\\prepared\\zone-12 (requis)
  -V, --version <nom>     dossier de la nouvelle version (défaut: date et heure, yyyy-MM-dd-HHmm)
  -l, --lods <n>          niveaux de détail Obj2Tiles. Défaut: 4 si le plus grand côté horizontal de la zone dépasse
                          --long-zone mètres (zones longues, ex. 7 et 8: le visiteur n'en regarde qu'une partie de
                          près), 3 sinon
  -L, --long-zone <m>     seuil en mètres pour passer à 4 niveaux (défaut 25)
  -d, --divisions <n>     profondeur de découpage du niveau le plus grossier (défaut 0)
  -u, --normal-uastc      carte de relief (map_Bump) en UASTC plutôt qu'en ETC1S qualité maximale: plus fidèle,
                          6 fois plus lourde
      --light             seulement le jeu léger de la zone: texture réduite de moitié (halve_texture.mjs), sans
                          relief, dans le dossier --version (ex. 2026-10-23-1540-light pour la version active
                          2026-10-23-1540); le manifeste garde l'adresse de la version complète et inscrit celle-ci
                          comme « light ». Pour les versions publiées avant ce jeu
      --no-light          ne pas faire le jeu léger après la version complète (fait par défaut, dans <version>-light)
  -T, --tiles-root <dir>  racine des tuiles (défaut ${paths.tiles})
      --obj2tiles <exe>   exécutable Obj2Tiles (défaut ${paths.obj2tiles})
  -h, --help              afficher cette aide`

const o = cli(HELP, {
  zone: { type: 'string', short: 'z' },
  prepared: { type: 'string', short: 'p' },
  version: { type: 'string', short: 'V' },
  lods: { type: 'string', short: 'l' },
  'long-zone': { type: 'string', short: 'L', default: '25' },
  divisions: { type: 'string', short: 'd', default: '0' },
  'normal-uastc': { type: 'boolean', short: 'u' },
  light: { type: 'boolean' },
  'no-light': { type: 'boolean' },
  'tiles-root': { type: 'string', short: 'T', default: paths.tiles },
  obj2tiles: { type: 'string', default: paths.obj2tiles },
})
if (!o.zone || !o.prepared) {
  console.error(`--zone et --prepared sont requis\n\n${HELP}`)
  process.exit(2)
}
const { zone, prepared } = o
const tilesRoot = o['tiles-root']
const mtl = join(prepared, `${zone}.mtl`)
const mtlLines = readText(mtl).split(/\r?\n/)
const mapOf = (name) => mtlLines.map((l) => l.match(new RegExp(`^${name}\\s+(.+)$`, 'i'))).find(Boolean)?.[1].trim()

// Garde-fou: sans map_Kd dans le MTL, Obj2Tiles produit des tuiles sans texture (blanches)
const photo = mapOf('map_Kd')
if (!photo) throw new Error(`${mtl} ne référence aucune texture (map_Kd)`)

// Niveaux de détail selon la taille de la zone (rapport de prepare_zone.py: boîte englobante en mètres, Z vers le haut).
// Test sur la zone 12 (10 m): un 4e niveau ne gagne que 9 % de téléchargement de près, pour 4 fois plus de requêtes;
// il ne vaut que pour les zones longues.
function chooseLods() {
  if (o.lods && Number(o.lods) > 0) return Number(o.lods)
  const { bbox_min: min, bbox_max: max } = readJson(join(prepared, `${zone}-prepare.json`)).steps.export
  const long = Math.max(max[0] - min[0], max[1] - min[1])
  const lods = long > Number(o['long-zone']) ? 4 : 3
  console.log(`   ${zone}: plus grand côté ${long.toFixed(1)} m -> ${lods} niveaux de détail`)
  return lods
}

// Les étapes d'une version, complète ou légère
function tile(version, light, lods) {
  const out = join(tilesRoot, zone, version)
  if (existsSync(out)) throw new Error(`${out} existe déjà: choisir une autre --version (les versions publiées sont immuables)`)

  // --preset standard: octree, --local, --zsplit, contenu glb (3D Tiles 1.1).
  // --max-texture-size 0: le plafond s'applique à la texture SOURCE avant découpage (le défaut 8192 dégrade une texture de 12k).
  // --divisions 0 avec octree: chaque LOD plus fin ajoute un niveau; au-delà de 3 LODs, le nombre de tuiles explose (8^n).
  // --no-root-content: la racine dupliquait le niveau le plus grossier (zone 12: 10 Mo de plus à l'ouverture).
  const obj2tilesArgs = ['--preset', 'standard', '--texture-format', 'Ktx2', '--unlit', '--max-texture-size', '0',
    '--decimation-mode', 'Standard', '--no-root-content', '--lods', String(lods), '--divisions', o.divisions]

  // Jeu léger: l'OBJ préparé (lien physique), sa texture réduite de moitié, sans relief. Téléphones et tablettes
  // (Christian, 2026-10-24: un vieil iPad et un iPhone 14 attendaient une à deux minutes): leur cadre est bien plus
  // petit qu'un écran d'ordinateur, et les tuiles les plus fines pesaient environ 6,6 Mo, dont 3,3 de relief que le
  // visualiseur n'y affiche pas et 2,9 de photo 4096 px.
  let source = prepared
  if (light) {
    source = `${out}-src`
    mkdirSync(source, { recursive: true })
    linkSync(join(prepared, `${zone}.obj`), join(source, `${zone}.obj`))
    node('halve_texture.mjs', [join(prepared, photo), join(source, photo)])
    writeFileSync(join(source, `${zone}.mtl`), mtlLines.filter((l) => !/^map_Bump/i.test(l)).join('\n'))
  }

  // Carte de relief (map_Bump, bake_relief.py): Obj2Tiles la range mal dans chaque tuile (zones noires) et la
  // compresse comme une photo (ETC1S, sRGB). Elle est donc ignorée ici, puis tuilée à part comme si c'était la photo,
  // en UASTC, et greffée dans les tuiles par merge_normal_maps.mjs (même géométrie: même rangement).
  run(o.obj2tiles, [...obj2tilesArgs, '--ignore-normal-maps', join(source, `${zone}.obj`), out])
  if (light) rmSync(source, { recursive: true, force: true })
  const normalMap = light ? null : mapOf('map_Bump')
  if (normalMap) {
    const normalSrc = `${out}-normal-src`
    const normalOut = `${out}-normal`
    mkdirSync(normalSrc, { recursive: true })
    // Liens physiques: pas de copie de l'OBJ (des centaines de Mo)
    linkSync(join(prepared, `${zone}.obj`), join(normalSrc, `${zone}.obj`))
    linkSync(join(prepared, normalMap), join(normalSrc, normalMap))
    writeFileSync(join(normalSrc, `${zone}.mtl`), [...mtlLines.filter((l) => !/^map_(Kd|Bump)/i.test(l)), `map_Kd ${normalMap}`].join('\n'))
    // ETC1S à qualité maximale (255) par défaut: proche de la taille des photos; --normal-uastc: UASTC, plus fidèle
    // mais 6 fois plus lourd (zone 12: 296 Mo au lieu de 48) et 1 h 20 d'encodage au lieu de 10 min
    const normalFormat = o['normal-uastc'] ? ['--ktx2-uastc', '--ktx2-zstd-level', '18'] : ['--ktx2-quality', '255']
    run(o.obj2tiles, [...obj2tilesArgs, ...normalFormat, join(normalSrc, `${zone}.obj`), normalOut])
    node('merge_normal_maps.mjs', [out, normalOut])
    rmSync(normalSrc, { recursive: true, force: true })
    rmSync(normalOut, { recursive: true, force: true })
  }

  // Simplification des niveaux grossiers (Obj2Tiles y garde beaucoup trop de triangles)
  node('simplify_lods.mjs', [out])
  // Compression meshopt de la géométrie de chaque tuile (glTF-Transform); les textures KTX2 restent telles quelles
  node('compress_tiles.mjs', [out])
  // Textures des niveaux grossiers plafonnées (2048 px, 1024 pour le jeu léger): sinon elles suivaient la taille de la
  // photo de la zone, de 1004 à 4096 px pour la tuile la plus grossière (0,4 à 3,6 Mo)
  node('cap_coarse_textures.mjs', [out, '--max', light ? '1024' : '2048'])
  // Racine vide: erreur géométrique très grande, sinon la zone disparaît vue de loin; champs null retirés
  fixTileset(out)

  const url = `${zone}/${version}/tileset.json`
  if (light) return updateManifest(tilesRoot, zone, url, { light: true })

  // Empreinte de l'état de la zone dans le .blend au moment de la préparation (voir check_changes.py)
  const fingerprint = join(prepared, `${zone}-fingerprint.json`)
  if (existsSync(fingerprint)) copyFileSync(fingerprint, join(out, 'fingerprint.json'))

  // Couleur moyenne de la texture: le visualiseur en tire l'équilibre des couleurs de la zone (teinte verte de l'eau)
  const stats = capture(process.execPath, [join(PUBLISH_DIR, 'texture_stats.mjs'), join(prepared, photo)])
  updateManifest(tilesRoot, zone, url, { color: stats.trim().split(/\s+/).map(Number) })
}

const version = o.version ?? newVersion()
const lods = chooseLods()
tile(version, Boolean(o.light), lods)
// Le jeu léger de cette version (téléphones et tablettes), sauf --no-light
if (!o.light && !o['no-light']) tile(`${version}-light`, true, lods)
