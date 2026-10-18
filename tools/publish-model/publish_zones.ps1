# Prépare et tuile une liste de zones depuis le .blend de travail, puis supprime les versions remplacées.
# Usage: .\tools\publish-model\publish_zones.ps1 -Zones "zone 2","zone 3" [-Version 2026-10-18-v1] [-Density 3000]
param(
    [Parameter(Mandatory)][string[]]$Zones,
    [string]$Version = (Get-Date -Format "yyyy-MM-dd"),
    [double]$Density = 3000,
    [string]$Blend = "$PSScriptRoot\..\..\modeles\lock-21-publishing.blend",
    [string]$Blender = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe",
    [string]$TempRoot = "O:\temp",
    [string]$TilesRoot = "O:\publishing\tiles"
)
$ErrorActionPreference = "Stop"
$Blend = (Resolve-Path $Blend).Path

foreach ($zone in $Zones) {
    $slug = $zone -replace " ", "-"
    $prepared = Join-Path $TempRoot "$slug\prox"
    $log = Join-Path $TempRoot "$slug-publish.log"
    $started = Get-Date
    Write-Host "=== $zone"

    # Préparation (remplace l'OBJ préparé précédent)
    if (Test-Path $prepared) { Remove-Item -Recurse -Force $prepared }
    & $Blender -b $Blend --factory-startup --python "$PSScriptRoot\prepare_zone.py" -- `
        --zone $zone --density $Density --out $prepared *> $log
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
