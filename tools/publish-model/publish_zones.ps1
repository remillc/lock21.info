<#
.SYNOPSIS
Prépare et tuile des zones depuis le .blend de travail, puis supprime les versions de tuiles remplacées.

.DESCRIPTION
Pour chaque zone: prepare_zone.py (Blender), puis tile_zone.ps1 (Obj2Tiles, simplification, compression, manifeste).
Le contexte (fillers + terrain) se publie avec la zone spéciale « context ». -Changed publie seulement ce qui a
changé dans le .blend depuis la dernière publication (empreintes, check_changes.py).

.PARAMETER Zones
Zones à publier, ex. "zone 2","zone 3" ou context.

.PARAMETER Changed
Publier seulement les zones modifiées dans le .blend (npm run model:post-modified).

.PARAMETER DryRun
Avec -Changed: lister les zones modifiées sans publier (npm run model:check).

.PARAMETER Version
Nom du dossier de la nouvelle version (défaut: date et heure, yyyy-MM-dd-HHmm).

.PARAMETER Density
Triangles visés par m² après décimation (défaut 3000).

.PARAMETER Blend
Fichier .blend de travail (défaut modeles\lock-21-publishing.blend).

.PARAMETER Help
Afficher cette aide (-h, -Help ou --help).

.EXAMPLE
.\tools\publish-model\publish_zones.ps1 -Changed

.EXAMPLE
.\tools\publish-model\publish_zones.ps1 -Zones "zone 2",context

#>
param(
    [string[]]$Zones,
    [switch]$Changed,
    [switch]$DryRun,
    [string]$Version = (Get-Date -Format "yyyy-MM-dd-HHmm"),
    [double]$Density = 3000,
    [string]$Blend = "$PSScriptRoot\..\..\modeles\lock-21-publishing.blend",
    [string]$Blender = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe",
    [string]$TempRoot = "O:\temp",
    [string]$TilesRoot = "O:\publishing\tiles",
    [Alias('h')][switch]$Help,
    [Parameter(ValueFromRemainingArguments = $true)][string[]]$Rest
)
if ($Help -or ($Rest -contains '--help') -or ($Zones -contains '--help')) { Get-Help $PSCommandPath -Detailed; return }
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Blend = (Resolve-Path $Blend).Path

if ($Changed) {
    $lines = & $Blender -b $Blend --factory-startup --python "$PSScriptRoot\check_changes.py" -- $TilesRoot 2>$null |
        Select-String "^(zone |A_PUBLIER)" | ForEach-Object { $_.Line }
    $lines | Where-Object { $_ -like "zone *" } | ForEach-Object { Write-Host $_ }
    $Zones = (($lines | Select-Object -Last 1) -replace "^A_PUBLIER:\s*", "").Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ }
    if (-not $Zones) { Write-Host "Rien à publier."; return }
    if ($DryRun) { Write-Host "À publier: $($Zones -join ', ')"; return }
}
if (-not $Zones) { throw "Indiquer -Zones ou -Changed" }

foreach ($zone in $Zones) {
    if ($zone -eq "context") {
        # Contexte (fillers + terrain): un .glb non tuilé
        Write-Host "=== context"
        $out = Join-Path $TilesRoot "context\$Version"
        $log = Join-Path $TempRoot "context-publish.log"
        $ErrorActionPreference = "Continue"
        & $Blender -b $Blend --factory-startup --python "$PSScriptRoot\export_context.py" -- $out *> $log
        node "$PSScriptRoot\compress_tiles.mjs" $out *>> $log
        $ErrorActionPreference = "Stop"
        if (-not (Test-Path (Join-Path $out "context.glb"))) { Write-Host "   ÉCHEC, voir $log"; continue }
        python -I "$PSScriptRoot\update_manifest.py" $TilesRoot context "context/$Version/context.glb" model *>> $log
        Get-Content $log | Select-String "^\[context\]|compression:|manifeste" | ForEach-Object { Write-Host "   $($_.Line)" }
        Get-ChildItem (Join-Path $TilesRoot "context") -Directory | Where-Object { $_.Name -ne $Version } | ForEach-Object {
            Remove-Item -Recurse -Force $_.FullName; Write-Host "   supprimé: $($_.Name)" }
        continue
    }
    $slug = $zone -replace " ", "-"
    $prepared = Join-Path $TempRoot "$slug\prox"
    $log = Join-Path $TempRoot "$slug-publish.log"
    $started = Get-Date
    Write-Host "=== $zone"

    # Préparation (remplace l'OBJ préparé précédent)
    if (Test-Path $prepared) { Remove-Item -Recurse -Force $prepared }
    # Windows PowerShell 5.1 traite la sortie d'erreur d'un programme comme fatale sous "Stop":
    # un échec de Blender sur une zone ne doit pas interrompre les suivantes
    $ErrorActionPreference = "Continue"
    & $Blender -b $Blend --factory-startup --python "$PSScriptRoot\prepare_zone.py" -- `
        --zone $zone --density $Density --out $prepared *> $log
    $ErrorActionPreference = "Stop"
    if (-not (Test-Path (Join-Path $prepared "$slug.obj"))) {
        Get-Content $log | Select-String "Error|assert|Traceback|line \d+" | ForEach-Object { Write-Host "   $($_.Line)" }
        Write-Host "   ÉCHEC de la préparation, voir $log"
        continue
    }
    Get-Content $log | Select-String "^\[.*(register|deform|proximity|decimate|deviation)" | ForEach-Object { Write-Host "   $($_.Line)" }

    # Tuilage, compression, manifeste
    & "$PSScriptRoot\tile_zone.ps1" -Zone $slug -Prepared $prepared -Version $Version *>> $log
    Get-Content $log | Select-String "compression:|manifeste" | ForEach-Object { Write-Host "   $($_.Line)" }

    # Ménage: versions de la zone qui ne sont plus dans le manifeste
    $manifest = Get-Content (Join-Path $TilesRoot "manifest.json") -Raw | ConvertFrom-Json
    $active = ($manifest.tilesets | Where-Object { $_.id -eq $slug }).url.Split("/")[1]
    Get-ChildItem (Join-Path $TilesRoot $slug) -Directory | Where-Object { $_.Name -ne $active } | ForEach-Object {
        Remove-Item -Recurse -Force $_.FullName
        Write-Host "   supprimé: $($_.Name)"
    }
    Write-Host ("   durée: {0:N0} s" -f ((Get-Date) - $started).TotalSeconds)
}
