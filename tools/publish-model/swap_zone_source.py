"""Remplace le mesh d'une zone dans le .blend par un nouvel export Metashape (zone refaite).

À exécuter DANS Blender, sur modeles/lock-21-publishing.blend:
  onglet Scripting > Text > Open... > ce fichier, modifier les PARAMÈTRES ci-dessous, puis Run Script (▶).
Blender reste figé pendant le recalage (environ 1 à 2 minutes).

Le script:
  1. importe le nouvel export (EDIT_MESH);
  2. le recale automatiquement sur le mesh actuel de la zone (même méthode que la chaîne de publication),
     pour qu'il arrive exactement là où la zone était placée;
  3. lui copie les modificateurs de la zone (booléens, lattice...), ses propriétés personnalisées,
     et lui rattache les enfants de la zone (étiquette, volumes de coupe) sans les déplacer;
  4. met à jour la propriété `source` (export à publier);
  5. garde l'ancien mesh, caché, dans la collection "zones - archive".

Il ne sauvegarde PAS le fichier: vérifier visuellement les volumes de coupe, ajuster, puis sauvegarder.

En arrière-plan (test, sans sauvegarde):
    blender -b <fichier.blend> --factory-startup --python swap_zone_source.py -- "<zone>" "<edit_mesh.glb>" ["<source.glb>"]
"""
import os
import sys
from datetime import date

import bpy

# ---------------------------------------------------------------- PARAMÈTRES
ZONE = "zone 10"
# Export importé dans Blender pour l'édition (un mesh léger rend les booléens plus rapides dans la vue)
EDIT_MESH = r"O:\modeles\zone-10\zone 10 - lens corrected - mesh - 652k faces.glb"
# Export à publier (propriété `source`); None = le même que EDIT_MESH. Doit venir du même chunk Metashape.
SOURCE = r"O:\modeles\zone-10\zone 10 - lens corrected - mesh - 3M faces.glb"
# Résidu médian du recalage (unités de l'export, pieds) au-delà duquel le script s'arrête
MAX_RESIDUAL = 0.5
# ----------------------------------------------------------------------------

if "--" in sys.argv:  # appel en ligne de commande
    import argparse

    p = argparse.ArgumentParser(prog="swap_zone_source.py", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("zone", help='objet de zone, ex. "zone 10"')
    p.add_argument("edit_mesh", help="export importé pour l'édition")
    p.add_argument("source", nargs="?", help="export à publier (défaut: edit_mesh)")
    a = p.parse_args(sys.argv[sys.argv.index("--") + 1:])
    ZONE, EDIT_MESH, SOURCE = a.zone, a.edit_mesh, a.source
SOURCE = SOURCE or EDIT_MESH

tools_dir = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() and os.path.exists(__file__) \
    else bpy.path.abspath("//../tools/publish-model")
sys.path.insert(0, tools_dir)
from register_zone import register  # noqa: E402


def log(msg):
    print(f"[swap] {msg}", flush=True)


old = bpy.data.objects[ZONE]
assert old.type == 'MESH', f"{ZONE} n'est pas un mesh"
for path in (EDIT_MESH, SOURCE):
    assert os.path.exists(path), f"fichier introuvable: {path}"

# 1. import
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=EDIT_MESH)
new_objects = [o for o in bpy.data.objects if o not in before]
meshes = [o for o in new_objects if o.type == 'MESH']
assert len(meshes) == 1, f"un seul mesh attendu dans {EDIT_MESH}, trouvé {len(meshes)}"
new = meshes[0]
log(f"importé: {len(new.data.polygons):,} faces")

# 2. recalage sur le mesh actuel (coordonnées locales, avant modificateurs)
rep = register(old, EDIT_MESH, log=log)
log(f"recalage: échelle {rep['scale']:.4f}, rotation {rep['rotation_deg_from_identity']:.2f}°, "
    f"résidu médian {rep['residual']['median']:.4f} (p95 {rep['residual']['p95']:.4f})")
if rep["residual"]["median"] > MAX_RESIDUAL:
    for o in new_objects:
        bpy.data.objects.remove(o, do_unlink=True)
    raise RuntimeError(f"résidu {rep['residual']['median']:.3f} > {MAX_RESIDUAL}: le nouvel export ne recouvre pas "
                       f"assez l'ancien mesh de {ZONE}. Rien n'a été modifié.")

from mathutils import Matrix  # noqa: E402

new.data.transform(Matrix(rep["matrix_source_to_blender_local"]) @ new.matrix_world)
new.parent = old.parent
new.matrix_parent_inverse = old.matrix_parent_inverse.copy()
new.matrix_basis = old.matrix_basis.copy()
for o in new_objects:  # objets vides éventuellement créés par l'import glTF
    if o is not new:
        bpy.data.objects.remove(o, do_unlink=True)

# collections: celles de l'ancien objet
for c in list(new.users_collection):
    c.objects.unlink(new)
for c in old.users_collection:
    c.objects.link(new)

# 3. modificateurs, propriétés, enfants
for m in old.modifiers:
    n = new.modifiers.new(m.name, m.type)
    for prop in m.bl_rna.properties:
        if not prop.is_readonly and prop.identifier not in ("name", "type"):
            try:
                setattr(n, prop.identifier, getattr(m, prop.identifier))
            except (AttributeError, TypeError):
                pass
for key in old.keys():
    new[key] = old[key]
for child in list(old.children):
    mw = child.matrix_world.copy()
    child.parent = new
    child.matrix_world = mw

# 4. source
new["source"] = SOURCE
new["source_previous"] = old.get("source", "")
new["swapped_on"] = date.today().isoformat()

# 5. archive de l'ancien mesh
archive = bpy.data.collections.get("zones - archive")
if archive is None:
    archive = bpy.data.collections.new("zones - archive")
    bpy.context.scene.collection.children.link(archive)
for c in list(old.users_collection):
    c.objects.unlink(old)
archive.objects.link(old)
old.name = f"{ZONE} (archive {date.today().isoformat()})"
old.hide_set(True) if old.name in bpy.context.view_layer.objects else None
old.hide_render = True
new.name = ZONE
new.data.name = ZONE

for o in bpy.context.view_layer.objects:
    o.select_set(False)
new.select_set(True)
bpy.context.view_layer.objects.active = new
log(f"terminé: {ZONE} remplacé ({len(new.data.polygons):,} faces), source = {SOURCE}. "
    f"Ancien mesh: '{old.name}' dans 'zones - archive'. Vérifier les volumes de coupe, puis sauvegarder.")
