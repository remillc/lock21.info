"""Inscrit (ou remplace) un tileset dans le manifeste lu par le visualiseur.

Usage:
    python -I update_manifest.py <racine des tuiles> <id> <url relative du tileset.json>
"""
import json
import os
import sys
from datetime import datetime, timezone

root, tileset_id, url = sys.argv[1:4]
path = os.path.join(root, "manifest.json")
manifest = json.load(open(path, encoding="utf-8")) if os.path.exists(path) else {"version": 1, "tilesets": []}
manifest["tilesets"] = [t for t in manifest["tilesets"] if t["id"] != tileset_id]
manifest["tilesets"].append({"id": tileset_id, "url": url})
manifest["tilesets"].sort(key=lambda t: t["id"])
manifest["updated"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
with open(path, "w", encoding="utf-8") as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)
print(f"manifeste: {tileset_id} -> {url}")
