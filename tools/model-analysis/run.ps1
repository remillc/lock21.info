<#
.SYNOPSIS
Analyse la résolution des maillages de zones (Blender en arrière-plan, lecture seule).

.DESCRIPTION
Mesure densité de triangles, taille des texels, texels par triangle, fragments; compare aux seuils de
thresholds.json et écrit un rapport daté dans reports\.

.PARAMETER Blend
Fichier .blend à analyser (défaut O:\modeles\lock-21\lock-21-publishing.blend).

.PARAMETER Blender
Exécutable Blender.

.PARAMETER Help
Afficher cette aide (-h, -Help ou --help).

.EXAMPLE
.\tools\model-analysis\run.ps1

#>
param(
    [string]$Blend,
    [string]$Blender = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe",
    [Alias('h')][switch]$Help,
    [Parameter(ValueFromRemainingArguments = $true)][string[]]$Rest
)
if ($Help -or ($Rest -contains '--help') -or ($Blend -contains '--help')) { Get-Help $PSCommandPath -Detailed; return }
# Défaut calculé ici: dans un script « avancé » (attribut [Parameter]), Windows PowerShell 5.1 laisse
# $PSScriptRoot vide dans les valeurs par défaut des paramètres
if (-not $Blend) { $Blend = "O:\modeles\lock-21\lock-21-publishing.blend" }

& $Blender -b (Resolve-Path $Blend) --factory-startup `
    --python "$PSScriptRoot\analyze_zones.py" -- "$PSScriptRoot\thresholds.json" "$PSScriptRoot\reports" 2>$null |
    Select-String "^(analysé|rapport|Error|Traceback)"
