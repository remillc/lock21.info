"""Inscrit (ou remplace) un tileset dans le manifeste lu par le visualiseur.

Usage:
    python -I update_manifest.py <racine des tuiles> <id> <url relative> [tileset|model]

`tileset`: tuiles 3D (tileset.json); `model`: modèle .glb non tuilé (contexte: fillers, terrain).
`--color R G B`: couleur moyenne de la texture en lumière linéaire (texture_stats.mjs), d'où le visualiseur tire
l'équilibre des couleurs de la zone. Sans --color, la couleur déjà inscrite pour cet id est conservée.
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
a = p.parse_args(script_args())
root, tileset_id, url, kind = a.root, a.id, a.url, a.kind
key = "models" if kind == "model" else "tilesets"
path = os.path.join(root, "manifest.json")
manifest = json.load(open(path, encoding="utf-8")) if os.path.exists(path) else {"version": 1, "tilesets": []}
old = next((t for t in manifest.get(key, []) if t["id"] == tileset_id), {})
entries = [t for t in manifest.get(key, []) if t["id"] != tileset_id]
entry = {"id": tileset_id, "url": url}
color = a.color or old.get("color")
if color:
    entry["color"] = [round(c, 5) for c in color]
entries.append(entry)
manifest[key] = sorted(entries, key=lambda t: t["id"])
manifest["updated"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
with open(path, "w", encoding="utf-8") as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)
print(f"manifeste: {tileset_id} -> {url}")
