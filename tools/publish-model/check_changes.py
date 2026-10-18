"""Liste les zones du .blend dont l'état a changé depuis leur dernière publication.

Compare l'empreinte actuelle de chaque zone (blend_state.py) avec celle enregistrée dans la version
active de ses tuiles (O:\\publishing\\tiles\\<zone>\\<version>\\fingerprint.json). Affiche une ligne
`A_PUBLIER: zone 2, zone 10` utilisable par publish_zones.ps1.

Lecture seule: le .blend n'est jamais sauvegardé.

Usage:
    blender -b <fichier.blend> --factory-startup --python check_changes.py -- [<racine des tuiles>]
"""
import json
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(__file__))
from blend_state import fingerprint  # noqa: E402

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
tiles_root = args[0] if args else r"O:\publishing\tiles"
manifest_path = os.path.join(tiles_root, "manifest.json")
manifest = json.load(open(manifest_path, encoding="utf-8")) if os.path.exists(manifest_path) else {"tilesets": []}
active = {t["id"]: t["url"] for t in manifest["tilesets"]}


def diff(old, new):
    keys = [k for k in new if old.get(k) != new.get(k)]
    if "modifiers" in keys and len(old.get("modifiers", [])) == len(new["modifiers"]):
        changed = [n["name"] for o, n in zip(old["modifiers"], new["modifiers"]) if o != n]
        keys[keys.index("modifiers")] = f"modificateurs ({', '.join(changed)})"
    return ", ".join(keys)


to_publish = []
for ob in sorted(bpy.data.collections["zones"].objects, key=lambda o: o.name):
    if ob.type != 'MESH' or "source" not in ob.keys():
        continue
    slug = ob.name.replace(" ", "-")
    current = fingerprint(ob)
    if slug not in active:
        status = "jamais publiée"
    else:
        path = os.path.join(tiles_root, os.path.dirname(active[slug]), "fingerprint.json")
        if not os.path.exists(path):
            status = "publiée sans empreinte"
        else:
            published = json.load(open(path, encoding="utf-8"))
            status = None if published["fingerprint"] == current["fingerprint"] else \
                "modifiée: " + diff(published["state"], current["state"])
    print(f"{ob.name:8} {status or 'à jour'}", flush=True)
    if status:
        to_publish.append(ob.name)

print("A_PUBLIER: " + ", ".join(to_publish), flush=True)
