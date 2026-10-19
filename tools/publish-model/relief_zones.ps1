<#
.SYNOPSIS
Relief des zones: cuit la carte des normales (bake_relief.py) puis retuile la zone avec (tile_zone.ps1).

.DESCRIPTION
Pour chaque zone: cuisson de la carte des normales depuis l'export détaillé sur le mesh préparé
(<TempRoot>\<zone>\prox, celui des tuiles publiées), dans <TempRoot>\<zone>\relief; puis tuilage avec la carte
greffée (manifeste local mis à jour) et ménage des anciennes versions de la zone, comme publish_zones.ps1.
Rien n'est envoyé vers R2 (upload_r2.mjs, à part). Une zone en échec n'arrête pas les suivantes.

Une carte déjà cuite (relief\<zone>-normal.png plus récente que le mesh préparé) est réutilisée, sauf avec -Rebake.

.PARAMETER Zones
Zones à traiter, ex. "zone 12","zone 2".

.PARAMETER High
Exports détaillés à utiliser à la place de la source, par zone: @{"zone 1" = "O:\modeles\zone-1\....glb"}.
Même chunk Metashape que la source (même repère); bake_relief.py s'arrête si les deux ne concordent pas.

.PARAMETER Rebake
Cuire de nouveau même si une carte récente existe.

.PARAMETER Help
Affiche cette aide (aussi -h, --help).

.EXAMPLE
.\relief_zones.ps1 -Zones "zone 12","zone 1" -High @{"zone 1" = "O:\modeles\zone-1\zone 1 - lens corrected - mesh - 8.6M faces.glb"}
#>
param(
    [string[]]$Zones,
    [hashtable]$High = @{},
    [switch]$Rebake,
    [string]$Blender = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe",
    [string]$TempRoot = "O:\temp",
    [string]$TilesRoot = "O:\publishing\tiles",
    [Alias('h')][switch]$Help,
    [Parameter(ValueFromRemainingArguments = $true)]$Rest
)
if ($Help -or $Rest -contains '--help' -or -not $Zones) { Get-Help $MyInvocation.MyCommand.Path -Detailed; return }
$ErrorActionPreference = "Stop"

foreach ($zone in $Zones) {
    $slug = $zone -replace " ", "-"
    $prepared = Join-Path $TempRoot "$slug\prox"
    $relief = Join-Path $TempRoot "$slug\relief"
    $log = Join-Path $TempRoot "$slug-relief.log"
    $started = Get-Date
    Write-Host "=== $zone ($(Get-Date -Format HH:mm))"
    if (-not (Test-Path (Join-Path $prepared "$slug.obj"))) { Write-Host "   pas de mesh préparé: $prepared"; continue }

    # Cuisson, réutilisée si plus récente que le mesh préparé et cuite depuis le même export (noté à côté de la carte)
    $normal = Join-Path $relief "$slug-normal.png"
    $from = Join-Path $relief "$slug-normal-from.txt"
    $highPath = if ($High.ContainsKey($zone)) { $High[$zone] } else { "source" }
    $fresh = (Test-Path $normal) -and (Test-Path $from) -and
        ((Get-Item $normal).LastWriteTime -gt (Get-Item (Join-Path $prepared "$slug.obj")).LastWriteTime) -and
        ((Get-Content $from -Raw -Encoding UTF8).Trim() -eq $highPath)
    if ($fresh -and -not $Rebake) {
        Write-Host "   carte existante réutilisée: $normal"
        "carte existante réutilisée" | Set-Content $log
    } else {
        $bakeArgs = @('-z', $zone, '-p', $prepared, '-o', $relief)
        if ($High.ContainsKey($zone)) { $bakeArgs += @('--high', $High[$zone]) }
        $ErrorActionPreference = "Continue"
        & $Blender -b --factory-startup --python "$PSScriptRoot\bake_relief.py" -- @bakeArgs *> $log
        $ErrorActionPreference = "Stop"
        Get-Content $log | Select-String "^\[relief\]|Error|assert|Traceback" | ForEach-Object { Write-Host "   $($_.Line)" }
        if (-not (Select-String -Path $log -Pattern "^\[relief\] done" -Quiet)) { Write-Host "   ÉCHEC de la cuisson, voir $log"; continue }
        Set-Content $from $highPath -Encoding UTF8
    }

    # Tuilage avec la carte, manifeste local
    $version = Get-Date -Format "yyyy-MM-dd-HHmm"
    $ErrorActionPreference = "Continue"
    & "$PSScriptRoot\tile_zone.ps1" -Zone $slug -Prepared $relief -Version $version *>> $log
    $ErrorActionPreference = "Stop"
    $out = Join-Path $TilesRoot "$slug\$version"
    $tiles = Get-ChildItem $out -Recurse -Filter *.glb -ErrorAction SilentlyContinue
    if (-not $tiles) { Write-Host "   ÉCHEC du tuilage, voir $log"; continue }
    Get-Content $log | Select-String "compression:|manifeste" | ForEach-Object { Write-Host "   $($_.Line)" }
    Write-Host ("   {0} tuiles, {1:N0} Mo" -f $tiles.Count, (($tiles | Measure-Object Length -Sum).Sum / 1MB))

    # Ménage: versions de la zone qui ne sont plus dans le manifeste
    $manifest = Get-Content (Join-Path $TilesRoot "manifest.json") -Raw | ConvertFrom-Json
    $active = ($manifest.tilesets | Where-Object { $_.id -eq $slug }).url.Split("/")[1]
    Get-ChildItem (Join-Path $TilesRoot $slug) -Directory | Where-Object { $_.Name -ne $active } | ForEach-Object {
        Remove-Item -Recurse -Force $_.FullName
        Write-Host "   supprimé: $($_.Name)"
    }
    Write-Host ("   durée: {0:N0} s" -f ((Get-Date) - $started).TotalSeconds)
}
