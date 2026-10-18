# Sert O:\publishing\tiles en local avec CORS, comme le fera R2 (origine différente du site).
# -Lan: écoute sur toutes les interfaces pour tester depuis un téléphone sur le même Wi-Fi.
param(
    [string]$TilesRoot = "O:\publishing\tiles",
    [int]$Port = 8081,
    [switch]$Lan
)
$address = if ($Lan) { "0.0.0.0" } else { "127.0.0.1" }
# -c-1: pas de cache, pour voir immédiatement une nouvelle version
npx --yes http-server@14.1.1 $TilesRoot -p $Port -a $address --cors -c-1
