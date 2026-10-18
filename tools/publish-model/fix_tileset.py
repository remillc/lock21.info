"""Corrige le tileset.json produit par Obj2Tiles.

- Racine sans contenu (--no-root-content): son erreur géométrique est portée à une très grande valeur.
  Sinon, vue de loin, la racine vide semble assez précise, le visualiseur ne descend pas vers le premier
  niveau qui a un contenu, et la zone n'apparaît pas (zone 8, la plus éloignée de la caméra).
- Champs à null (`content`, `transform`), non conformes à 3D Tiles: supprimés.

Usage: python -I fix_tileset.py <dossier du tileset>
"""
import json
import os
import sys

EMPTY_ROOT_ERROR = 1.0e6  # mètres: toujours raffiner une racine vide


def clean(node):
    for key in [k for k, v in node.items() if v is None]:
        del node[key]
    for child in node.get("children", []):
        clean(child)


path = os.path.join(sys.argv[1], "tileset.json")
tileset = json.load(open(path, encoding="utf-8"))
root = tileset["root"]
clean(root)
if "content" not in root:
    root["geometricError"] = EMPTY_ROOT_ERROR
    tileset["geometricError"] = EMPTY_ROOT_ERROR
with open(path, "w", encoding="utf-8") as f:
    json.dump(tileset, f, ensure_ascii=False, separators=(",", ":"))
print(f"tileset corrigé: {path}")
