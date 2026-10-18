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
Niveaux de détail Obj2Tiles (défaut 3).

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
    [int]$Lods = 3,
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

# --preset standard: octree, --local, --zsplit, contenu glb (3D Tiles 1.1).
# --max-texture-size 0: le plafond s'applique à la texture SOURCE avant découpage (le défaut 8192 dégrade une texture de 12k).
# --divisions 0 avec octree: chaque LOD plus fin ajoute un niveau; au-delà de 3 LODs, le nombre de tuiles explose (8^n).
# --no-root-content: la racine dupliquait le niveau le plus grossier (zone 12: 10 Mo de plus à l'ouverture).
& $Obj2Tiles --preset standard --texture-format Ktx2 --unlit --max-texture-size 0 --decimation-mode Standard --no-root-content `
    --lods $Lods --divisions $Divisions `
    (Join-Path $Prepared "$Zone.obj") $out
if ($LASTEXITCODE -ne 0) { throw "Obj2Tiles a échoué ($LASTEXITCODE)" }

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

python -I "$PSScriptRoot\update_manifest.py" $TilesRoot $Zone "$Zone/$Version/tileset.json"
