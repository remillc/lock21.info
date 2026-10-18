# Lance l'analyse de résolution des zones en arrière-plan (lecture seule).
# Usage: .\tools\model-analysis\run.ps1 [-Blend <fichier.blend>] [-Blender <blender.exe>]
param(
    [string]$Blend = "$PSScriptRoot\..\..\modeles\lock-21-mockup.blend",
    [string]$Blender = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
)

& $Blender -b (Resolve-Path $Blend) --factory-startup `
    --python "$PSScriptRoot\analyze_zones.py" -- "$PSScriptRoot\thresholds.json" "$PSScriptRoot\reports" 2>$null |
    Select-String "^(analysé|rapport|Error|Traceback)"
