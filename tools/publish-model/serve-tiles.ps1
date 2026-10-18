<#
.SYNOPSIS
Sert O:\publishing\tiles en local avec CORS, comme le fera R2 (origine différente du site).

.DESCRIPTION
http-server sans cache, sur le port 8081. -Lan écoute sur toutes les interfaces (test depuis un téléphone en Wi-Fi).

.PARAMETER TilesRoot
Dossier servi (défaut O:\publishing\tiles).

.PARAMETER Port
Port (défaut 8081).

.PARAMETER Lan
Écouter sur toutes les interfaces réseau.

.PARAMETER Help
Afficher cette aide (-h, -Help ou --help).

.EXAMPLE
.\tools\publish-model\serve-tiles.ps1 -Lan

#>
param(
    [string]$TilesRoot = "O:\publishing\tiles",
    [int]$Port = 8081,
    [switch]$Lan,
    [Alias('h')][switch]$Help,
    [Parameter(ValueFromRemainingArguments = $true)][string[]]$Rest
)
if ($Help -or ($Rest -contains '--help') -or ($TilesRoot -contains '--help')) { Get-Help $PSCommandPath -Detailed; return }
$address = if ($Lan) { "0.0.0.0" } else { "127.0.0.1" }
# -c-1: pas de cache, pour voir immédiatement une nouvelle version
npx --yes http-server@14.1.1 $TilesRoot -p $Port -a $address --cors -c-1
