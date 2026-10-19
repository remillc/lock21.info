<#
.SYNOPSIS
Tuile une zone préparée (OBJ + texture de prepare_zone.py) et l'inscrit dans le manifeste.

.DESCRIPTION
Obj2Tiles (3D Tiles 1.1, KTX2), simplification des niveaux grossiers, compression meshopt, correction du
tileset.json, copie de l'empreinte, mise à jour du manifeste.

.PARAMETER Zone
Identifiant de la zone, ex. zone-12.

.PARAMETER Prepared
Dossier de l'OBJ préparé, ex. O:\temp\zone-12\prox.

.PARAMETER Version
Nom du dossier de la nouvelle version (défaut: date et heure).

.PARAMETER Lods
Niveaux de détail Obj2Tiles. Par défaut: 4 si le plus grand côté horizontal de la zone dépasse -LongZone mètres
(zones longues, ex. 7 et 8: le visiteur n'en regarde qu'une partie de près), 3 sinon.

.PARAMETER LongZone
Seuil en mètres pour passer à 4 niveaux (défaut 25).

.PARAMETER Divisions
Profondeur de découpage du niveau le plus grossier (défaut 0).

.PARAMETER Help
Afficher cette aide (-h, -Help ou --help).

.EXAMPLE
.\tools\publish-model\tile_zone.ps1 -Zone zone-12 -Prepared O:\temp\zone-12\prox

#>
param(
    [string]$Zone,
    [string]$Prepared,
    [string]$Version = (Get-Date -Format "yyyy-MM-dd-HHmm"),
    [int]$Lods = 0,
    [double]$LongZone = 25,
    [int]$Divisions = 0,
    [string]$TilesRoot = "O:\publishing\tiles",
    [string]$Obj2Tiles = "O:\publishing\bin\obj2tiles-1.8.0\Obj2Tiles.exe",
    [Alias('h')][switch]$Help,
    [Parameter(ValueFromRemainingArguments = $true)][string[]]$Rest
)
if ($Help -or ($Rest -contains '--help') -or ($Zone -contains '--help')) { Get-Help $PSCommandPath -Detailed; return }
if (-not $Zone -or -not $Prepared) { throw "-Zone et -Prepared sont requis (voir -h)" }
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$out = Join-Path $TilesRoot "$Zone\$Version"
if (Test-Path $out) { throw "$out existe déjà: choisir une autre -Version (les versions publiées sont immuables)" }

# Garde-fou: sans map_Kd dans le MTL, Obj2Tiles produit des tuiles sans texture (blanches)
$mtl = Join-Path $Prepared "$Zone.mtl"
if (-not (Select-String -Path $mtl -Pattern "^map_Kd" -Quiet)) { throw "$mtl ne référence aucune texture (map_Kd)" }

# Niveaux de détail selon la taille de la zone (rapport de prepare_zone.py: boîte englobante en mètres, Z vers le haut).
# Test sur la zone 12 (10 m): un 4e niveau ne gagne que 9 % de téléchargement de près, pour 4 fois plus de requêtes;
# il ne vaut que pour les zones longues.
if ($Lods -le 0) {
    $report = Get-Content (Join-Path $Prepared "$Zone-prepare.json") -Raw -Encoding UTF8 | ConvertFrom-Json
    $export = $report.steps.export
    $long = [Math]::Max($export.bbox_max[0] - $export.bbox_min[0], $export.bbox_max[1] - $export.bbox_min[1])
    $Lods = if ($long -gt $LongZone) { 4 } else { 3 }
    Write-Host ("   {0}: plus grand côté {1:N1} m -> {2} niveaux de détail" -f $Zone, $long, $Lods)
}

# --preset standard: octree, --local, --zsplit, contenu glb (3D Tiles 1.1).
# --max-texture-size 0: le plafond s'applique à la texture SOURCE avant découpage (le défaut 8192 dégrade une texture de 12k).
# --divisions 0 avec octree: chaque LOD plus fin ajoute un niveau; au-delà de 3 LODs, le nombre de tuiles explose (8^n).
# --no-root-content: la racine dupliquait le niveau le plus grossier (zone 12: 10 Mo de plus à l'ouverture).
$obj2tilesArgs = @('--preset', 'standard', '--texture-format', 'Ktx2', '--unlit', '--max-texture-size', '0',
    '--decimation-mode', 'Standard', '--no-root-content', '--lods', $Lods, '--divisions', $Divisions)
# Carte de relief (map_Bump, bake_relief.py): Obj2Tiles la range mal dans chaque tuile (zones noires) et la
# compresse comme une photo (ETC1S, sRGB). Elle est donc ignorée ici, puis tuilée à part comme si c'était la photo,
# en UASTC, et greffée dans les tuiles par merge_normal_maps.mjs (même géométrie: même rangement).
$normalLine = Select-String -Path $mtl -Pattern "^map_Bump\s+(.+)$"
& $Obj2Tiles @obj2tilesArgs --ignore-normal-maps (Join-Path $Prepared "$Zone.obj") $out
if ($LASTEXITCODE -ne 0) { throw "Obj2Tiles a échoué ($LASTEXITCODE)" }
if ($normalLine) {
    $normalMap = $normalLine.Matches[0].Groups[1].Value.Trim()
    $normalSrc = "$out-normal-src"
    $normalOut = "$out-normal"
    New-Item -ItemType Directory -Force $normalSrc | Out-Null
    # Liens physiques: pas de copie de l'OBJ (des centaines de Mo)
    New-Item -ItemType HardLink -Path (Join-Path $normalSrc "$Zone.obj") -Target (Join-Path $Prepared "$Zone.obj") | Out-Null
    New-Item -ItemType HardLink -Path (Join-Path $normalSrc $normalMap) -Target (Join-Path $Prepared $normalMap) | Out-Null
    (Get-Content $mtl -Encoding UTF8 | Where-Object { $_ -notmatch "^map_(Kd|Bump)" }) + "map_Kd $normalMap" |
        Set-Content (Join-Path $normalSrc "$Zone.mtl") -Encoding UTF8
    & $Obj2Tiles @obj2tilesArgs --ktx2-uastc --ktx2-zstd-level 18 (Join-Path $normalSrc "$Zone.obj") $normalOut
    if ($LASTEXITCODE -ne 0) { throw "Obj2Tiles (carte de relief) a échoué ($LASTEXITCODE)" }
    node "$PSScriptRoot\merge_normal_maps.mjs" $out $normalOut
    if ($LASTEXITCODE -ne 0) { throw "merge_normal_maps.mjs a échoué" }
    Remove-Item -Recurse -Force $normalSrc, $normalOut
}

# Simplification des niveaux grossiers (Obj2Tiles y garde beaucoup trop de triangles)
node "$PSScriptRoot\simplify_lods.mjs" $out
if ($LASTEXITCODE -ne 0) { throw "simplification échouée ($LASTEXITCODE)" }

# Compression meshopt de la géométrie de chaque tuile (glTF-Transform); les textures KTX2 restent telles quelles
node "$PSScriptRoot\compress_tiles.mjs" $out
if ($LASTEXITCODE -ne 0) { throw "compression échouée ($LASTEXITCODE)" }

# Racine vide: erreur géométrique très grande, sinon la zone disparaît vue de loin; champs null retirés
python -I "$PSScriptRoot\fix_tileset.py" $out

# Empreinte de l'état de la zone dans le .blend au moment de la préparation (voir check_changes.py)
$fp = Join-Path $Prepared "$Zone-fingerprint.json"
if (Test-Path $fp) { Copy-Item $fp (Join-Path $out "fingerprint.json") }

# Couleur moyenne de la texture: le visualiseur en tire l'équilibre des couleurs de la zone (teinte verte de l'eau)
$texture = Join-Path $Prepared ((Select-String -Path $mtl -Pattern "^map_Kd\s+(.+)$").Matches[0].Groups[1].Value.Trim())
$color = (node "$PSScriptRoot\texture_stats.mjs" $texture) -split " "
if ($LASTEXITCODE -ne 0) { throw "texture_stats.mjs a échoué sur $texture" }

python -I "$PSScriptRoot\update_manifest.py" $TilesRoot $Zone "$Zone/$Version/tileset.json" --color @color
