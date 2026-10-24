"""Inscrit (ou remplace) un tileset dans le manifeste lu par le visualiseur.

Usage:
    python -I update_manifest.py <racine des tuiles> <id> <url relative> [tileset|model]

`tileset`: tuiles 3D (tileset.json); `model`: modèle .glb non tuilé (contexte: fillers, terrain).
`--color R G B`: couleur moyenne de la texture en lumière linéaire (texture_stats.mjs), d'où le visualiseur tire
l'équilibre des couleurs de la zone. Sans --color, la couleur déjà inscrite pour cet id est conservée.
`--light`: l'url est celle du jeu léger de la zone (téléphones et tablettes, tile_zone.ps1 -Light): inscrite comme
`light`, le reste de l'entrée gardé. Une nouvelle version complète (sans --light) retire l'ancien `light`: il
appartenait à la version précédente.
`added`: date de la première mise en ligne de l'id (inscrite à sa première inscription, gardée ensuite); la page
d'accueil en tire la dernière zone ajoutée. Les zones publiées avant 2026-10-22 n'en ont pas: plus anciennes.
"""
import json
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cli import parser, script_args  # noqa: E402
p = parser("update_manifest.py", __doc__)
p.add_argument("root", help="racine des tuiles (contient manifest.json)")
p.add_argument("id", help="identifiant, ex. zone-12 ou context")
p.add_argument("url", help="chemin relatif du tileset.json ou du .glb")
p.add_argument("kind", nargs="?", choices=("tileset", "model"), default="tileset", help="tileset (défaut) ou model")
p.add_argument("-c", "--color", nargs=3, type=float, metavar=("R", "G", "B"),
               help="couleur moyenne linéaire de la texture (texture_stats.mjs)")
p.add_argument("-l", "--light", action="store_true", help="l'url est le jeu léger de la zone (téléphones, tablettes)")
a = p.parse_args(script_args())
root, tileset_id, url, kind = a.root, a.id, a.url, a.kind
key = "models" if kind == "model" else "tilesets"
path = os.path.join(root, "manifest.json")
manifest = json.load(open(path, encoding="utf-8")) if os.path.exists(path) else {"version": 1, "tilesets": []}
old = next((t for t in manifest.get(key, []) if t["id"] == tileset_id), {})
entries = [t for t in manifest.get(key, []) if t["id"] != tileset_id]
now = datetime.now(timezone.utc).isoformat(timespec="seconds")
if a.light:
    if not old:
        sys.exit(f"{tileset_id}: pas dans le manifeste, publier d'abord sa version complète")
    manifest[key] = sorted(entries + [{**old, "light": url}], key=lambda t: t["id"])
    manifest["updated"] = now
    with open(path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"manifeste: {tileset_id} (léger) -> {url}")
    sys.exit(0)
entry = {"id": tileset_id, "url": url, "added": old.get("added") or (now if not old else None)}
if not entry["added"]:
    del entry["added"]
color = a.color or old.get("color")
if color:
    entry["color"] = [round(c, 5) for c in color]
entries.append(entry)
manifest[key] = sorted(entries, key=lambda t: t["id"])
manifest["updated"] = now
with open(path, "w", encoding="utf-8") as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)
print(f"manifeste: {tileset_id} -> {url}")
