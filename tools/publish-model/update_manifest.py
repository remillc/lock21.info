"""Inscrit (ou remplace) un tileset dans le manifeste lu par le visualiseur.

Usage:
    python -I update_manifest.py <racine des tuiles> <id> <url relative> [tileset|model]

`tileset`: tuiles 3D (tileset.json); `model`: modèle .glb non tuilé (contexte: fillers, terrain).
"""
import json
import os
import sys
from datetime import datetime, timezone

root, tileset_id, url = sys.argv[1:4]
kind = sys.argv[4] if len(sys.argv) > 4 else "tileset"
key = "models" if kind == "model" else "tilesets"
path = os.path.join(root, "manifest.json")
manifest = json.load(open(path, encoding="utf-8")) if os.path.exists(path) else {"version": 1, "tilesets": []}
entries = [t for t in manifest.get(key, []) if t["id"] != tileset_id]
entries.append({"id": tileset_id, "url": url})
manifest[key] = sorted(entries, key=lambda t: t["id"])
manifest["updated"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
with open(path, "w", encoding="utf-8") as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)
print(f"manifeste: {tileset_id} -> {url}")
