# Tuile une zone préparée (OBJ + texture de prepare_zone.py) avec Obj2Tiles, puis l'inscrit dans le manifeste.
# Usage: .\tools\publish-model\tile_zone.ps1 -Zone zone-12 -Prepared O:\temp\zone-12\r010 [-Version 2026-10-18] [-Lods 3] [-Divisions 0]
param(
    [Parameter(Mandatory)][string]$Zone,
    [Parameter(Mandatory)][string]$Prepared,
    [string]$Version = (Get-Date -Format "yyyy-MM-dd-HHmm"),
    [int]$Lods = 3,
    [int]$Divisions = 0,
    [string]$TilesRoot = "O:\publishing\tiles",
    [string]$Obj2Tiles = "O:\publishing\bin\obj2tiles-1.8.0\Obj2Tiles.exe"
)
$ErrorActionPreference = "Stop"

$out = Join-Path $TilesRoot "$Zone\$Version"
if (Test-Path $out) { throw "$out existe déjà: choisir une autre -Version (les versions publiées sont immuables)" }

# --preset standard: octree, --local, --zsplit, contenu glb (3D Tiles 1.1).
# --max-texture-size 0: le plafond s'applique à la texture SOURCE avant découpage (le défaut 8192 dégrade une texture de 12k).
# --divisions 0 avec octree: chaque LOD plus fin ajoute un niveau; au-delà de 3 LODs, le nombre de tuiles explose (8^n).
# --no-root-content: la racine dupliquait le niveau le plus grossier (zone 12: 10 Mo de plus à l'ouverture).
& $Obj2Tiles --preset standard --texture-format Ktx2 --unlit --max-texture-size 0 --decimation-mode Standard --no-root-content `
    --lods $Lods --divisions $Divisions `
    (Join-Path $Prepared "$Zone.obj") $out
if ($LASTEXITCODE -ne 0) { throw "Obj2Tiles a échoué ($LASTEXITCODE)" }

# Compression meshopt de la géométrie de chaque tuile (glTF-Transform); les textures KTX2 restent telles quelles
node "$PSScriptRoot\compress_tiles.mjs" $out
if ($LASTEXITCODE -ne 0) { throw "compression échouée ($LASTEXITCODE)" }

# Empreinte de l'état de la zone dans le .blend au moment de la préparation (voir check_changes.py)
$fp = Join-Path $Prepared "$Zone-fingerprint.json"
if (Test-Path $fp) { Copy-Item $fp (Join-Path $out "fingerprint.json") }

python -I "$PSScriptRoot\update_manifest.py" $TilesRoot $Zone "$Zone/$Version/tileset.json"
