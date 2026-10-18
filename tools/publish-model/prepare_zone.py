"""Prépare une zone pour le tuilage: export haute résolution -> OBJ simplifié, nettoyé, placé.

Le fichier .blend est la référence: chaque objet de zone porte une propriété personnalisée
`source` (chemin de l'export .glb à publier), sa mise en place (transformation de l'objet)
et ses retouches (modificateurs). Étapes:

  1. importe l'export `source`;
  2. le recale sur le mesh de la zone (register_zone.transform_for, avec cache);
  3. copie et applique les modificateurs de DÉFORMATION de la zone (ex. Lattice), dans l'ordre;
  4. transfère le NETTOYAGE par proximité: retire les sommets à plus de --max-distance du mesh
     de la zone tel qu'affiché dans Blender (tous modificateurs appliqués: booléens, etc.);
  5. décime (collapse) vers --density triangles par m² (ou selon --ratio);
  6. retire les îlots de moins de --min-island sommets;
  7. mesure l'écart entre le maillage décimé et le maillage complet (dans les deux sens);
  8. exporte OBJ (Y vers le haut, convention OBJ) + texture JPEG + rapport JSON.

Lecture seule pour le .blend (jamais sauvegardé).

Usage:
    blender -b <fichier.blend> --factory-startup --python prepare_zone.py -- \
        --zone "zone 12" [--density 3000] --out O:\\temp\\zone-12
"""
import argparse
import json
import os
import sys
import time

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, os.path.dirname(__file__))
from register_zone import transform_for  # noqa: E402

p = argparse.ArgumentParser()
p.add_argument("--zone", required=True)
p.add_argument("--density", type=float, default=3000, help="triangles visés par m² après décimation")
p.add_argument("--ratio", type=float, help="ratio de décimation imposé (remplace --density)")
p.add_argument("--max-distance", type=float, default=0.05, help="mètres")
p.add_argument("--max-residual", type=float, default=0.1, help="résidu médian maximal du recalage, unités de l'export")
p.add_argument("--min-island", type=int, default=100)
p.add_argument("--texture-quality", type=int, default=92)
p.add_argument("--samples", type=int, default=100000)
p.add_argument("--out", required=True)
a = p.parse_args(sys.argv[sys.argv.index("--") + 1:])
os.makedirs(a.out, exist_ok=True)
slug = a.zone.replace(" ", "-")
zone_ob = bpy.data.objects[a.zone]
source = zone_ob.get("source")
assert source and os.path.exists(source), f"propriété 'source' absente ou fichier introuvable sur {a.zone}: {source}"
report = dict(zone=a.zone, source=source, density=a.density, max_distance_m=a.max_distance, steps={})
t0 = time.time()


def step(name, **info):
    info["seconds"] = round(time.time() - t0, 1)
    report["steps"][name] = info
    print(f"[{info['seconds']:7.1f}s] {name}: {info}", flush=True)


def counts(ob):
    return dict(faces=len(ob.data.polygons), vertices=len(ob.data.vertices))


def activate(ob):
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob


def delete_vertices(ob, mask):
    me = ob.data
    me.vertices.foreach_set("select", mask)
    me.edges.foreach_set("select", np.zeros(len(me.edges), bool))
    me.polygons.foreach_set("select", np.zeros(len(me.polygons), bool))
    me.update()
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_mode(type='VERT')
    bpy.ops.mesh.delete(type='VERT')
    bpy.ops.object.mode_set(mode='OBJECT')


def world_vertices(ob):
    co = np.empty(len(ob.data.vertices) * 3)
    ob.data.vertices.foreach_get("co", co)
    return co.reshape(-1, 3)


# 1. import
before = set(bpy.data.objects)
# merge_vertices: glTF duplique les sommets le long des coutures UV; sans fusion, chaque îlot UV devient un
# fragment détaché que l'étape 6 supprime (trous). Les UV sont stockés par coin de face: la fusion ne les abîme pas.
bpy.ops.import_scene.gltf(filepath=source, merge_vertices=True)
imported = [o for o in bpy.data.objects if o not in before and o.type == 'MESH']
assert len(imported) == 1, f"un seul mesh attendu, trouvé {len(imported)}"
hi = imported[0]
activate(hi)
step("import", **counts(hi))

# 2. recalage: coordonnées locales de la zone, puis même place que l'objet de la zone
reg = transform_for(zone_ob, source, log=lambda m: print(m, flush=True))
# Unités de l'export (pieds). Zone 12, même surface: 0,033. Au-delà, l'export n'est pas le même objet que le mesh de la zone.
assert reg["residual"]["median"] <= a.max_residual, (
    f"recalage de {source} sur {a.zone} trop imprécis (résidu médian {reg['residual']['median']:.3f} > {a.max_residual}): "
    "l'export n'est probablement pas la même reconstruction que le mesh de la zone dans le .blend")
hi.data.transform(Matrix(reg["matrix_source_to_blender_local"]) @ hi.matrix_world)
hi.parent = None
hi.matrix_world = zone_ob.matrix_world.copy()
step("register", scale=round(reg["scale"], 4), rotation_deg=round(reg["rotation_deg_from_identity"], 3),
     residual_median=round(reg["residual"]["median"], 4))

# 3. modificateurs de déformation (tout sauf les booléens), copiés dans l'ordre puis appliqués
copied = []
for m in zone_ob.modifiers:
    if m.type == 'BOOLEAN' or not m.show_viewport:
        continue
    n = hi.modifiers.new(m.name, m.type)
    for prop in m.bl_rna.properties:
        if not prop.is_readonly and prop.identifier not in ("name", "type"):
            try:
                setattr(n, prop.identifier, getattr(m, prop.identifier))
            except (AttributeError, TypeError):
                pass
    copied.append(f"{m.type}:{m.name}")
for n in list(hi.modifiers):
    bpy.ops.object.modifier_apply(modifier=n.name)
hi.data.transform(hi.matrix_world)
hi.matrix_world = Matrix.Identity(4)
step("deform", modifiers=copied)

# 4. nettoyage par proximité avec le mesh final de la zone (tel qu'affiché, en coordonnées monde)
dg = bpy.context.evaluated_depsgraph_get()
ev = zone_ob.evaluated_get(dg)
fm = ev.to_mesh()
fm.calc_loop_triangles()
M = np.array(zone_ob.matrix_world)
fco = np.empty(len(fm.vertices) * 3); fm.vertices.foreach_get("co", fco); fco = fco.reshape(-1, 3) @ M[:3, :3].T + M[:3, 3]
ftri = np.empty(len(fm.loop_triangles) * 3, np.int64); fm.loop_triangles.foreach_get("vertices", ftri)
final_faces = len(fm.polygons)
final_tree = BVHTree.FromPolygons(fco.tolist(), ftri.reshape(-1, 3).tolist())
ev.to_mesh_clear()
step("final_mesh", faces=final_faces)

hv = world_vertices(hi)
d = np.array([final_tree.find_nearest(Vector(v))[3] for v in hv], dtype=float)
far = d > a.max_distance
delete_vertices(hi, far)
step("proximity", vertices_removed=int(far.sum()), removed_pct=round(float(far.mean()) * 100, 2), **counts(hi))
del final_tree, hv, d

# copie complète pour la mesure d'écart
full_bm = bmesh.new(); full_bm.from_mesh(hi.data)
full_tree = BVHTree.FromBMesh(full_bm)
full_co = world_vertices(hi)
full_bm.free()

# 5. décimation, vers la densité visée (triangles par m² de surface)
area = np.empty(len(hi.data.polygons)); hi.data.polygons.foreach_get("area", area)
area_m2 = float(area.sum())
ratio = a.ratio if a.ratio else min(1.0, a.density * area_m2 / len(hi.data.polygons))
if ratio < 1.0:
    mod = hi.modifiers.new("decimate", 'DECIMATE')
    mod.decimate_type = 'COLLAPSE'
    mod.ratio = ratio
    bpy.ops.object.modifier_apply(modifier=mod.name)
step("decimate", area_m2=round(area_m2, 1), ratio=round(ratio, 4), **counts(hi))

# 6. îlots
bm = bmesh.new(); bm.from_mesh(hi.data)
bm.verts.ensure_lookup_table()
seen = np.zeros(len(bm.verts), bool)
small = []
for v0 in bm.verts:
    if seen[v0.index]:
        continue
    comp, stack = [], [v0]
    seen[v0.index] = True
    while stack:
        v = stack.pop()
        comp.append(v)
        for e in v.link_edges:
            o = e.other_vert(v)
            if not seen[o.index]:
                seen[o.index] = True
                stack.append(o)
    if len(comp) < a.min_island:
        small.extend(comp)
n_small = len(small)
bmesh.ops.delete(bm, geom=small, context='VERTS')
bm.to_mesh(hi.data)
hi.data.update()
step("islands", vertices_removed=n_small, **counts(hi))

# 7. écart (mètres): décimé -> complet et complet -> décimé
rng = np.random.default_rng(0)
dec_tree = BVHTree.FromBMesh(bm)
dec_co = world_vertices(hi)
bm.free()


def deviation(points, tree):
    s = points[rng.choice(len(points), min(a.samples, len(points)), replace=False)]
    dd = np.array([tree.find_nearest(Vector(q))[3] for q in s], dtype=float)
    return {k: round(float(v) * 1000, 2) for k, v in
            dict(median_mm=np.median(dd), p95_mm=np.quantile(dd, 0.95), p99_mm=np.quantile(dd, 0.99), max_mm=dd.max()).items()}


step("deviation", decimated_to_full=deviation(dec_co, full_tree), full_to_decimated=deviation(full_co, dec_tree))
del full_tree, dec_tree

# 8. export
img = next(n.image for n in hi.data.materials[0].node_tree.nodes if n.type == 'TEX_IMAGE' and n.image)
tex_name = f"{slug}.jpg"
# Obj2Tiles halves the texture at each level of detail; GPU-compressed textures (KTX2 -> BC/ETC) need sizes in
# multiples of 4, otherwise the browser draws the tile black (zone 10: 6600 -> 3300 -> 1650). A multiple of 16
# keeps every level of a 3-level pyramid usable.
w, h = img.size
w16, h16 = w // 16 * 16, h // 16 * 16
if (w16, h16) != (w, h):
    img.scale(w16, h16)
img.save(filepath=os.path.join(a.out, tex_name), quality=a.texture_quality)
img.filepath = os.path.join(a.out, tex_name)
img.source = 'FILE'
obj_path = os.path.join(a.out, f"{slug}.obj")
activate(hi)
# Obj2Tiles lit l'OBJ comme Y vers le haut (convention OBJ/glTF) et le convertit lui-même en Z vers le haut
bpy.ops.wm.obj_export(filepath=obj_path, export_selected_objects=True, forward_axis='NEGATIVE_Z', up_axis='Y',
                      export_normals=False, export_uv=True, export_materials=True, path_mode='STRIP',
                      apply_modifiers=False, export_triangulated_mesh=True)
lo, hi_ = np.min(dec_co, 0), np.max(dec_co, 0)
step("export", obj=obj_path, texture=tex_name, texture_px=list(img.size),
     bbox_min=lo.round(3).tolist(), bbox_max=hi_.round(3).tolist(), **counts(hi))

json.dump(report, open(os.path.join(a.out, f"{slug}-prepare.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
