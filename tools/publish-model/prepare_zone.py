"""Prépare une zone pour le tuilage: export haute résolution -> OBJ simplifié, rogné, placé.

Étapes:
  1. importe l'export .glb haute résolution;
  2. applique la transformation de recalage (transforms/<zone>.json) -> coordonnées monde (mètres);
  3. rogne les faces situées dans les volumes de coupe des modificateurs booléens (DIFFERENCE) de la zone;
  4. décime (collapse) selon --ratio;
  5. retire les îlots de moins de --min-island sommets;
  6. mesure l'écart entre le maillage décimé et le maillage complet (dans les deux sens);
  7. exporte OBJ (Y vers le haut, convention OBJ) + texture JPEG + rapport JSON.

Lecture seule pour le .blend (jamais sauvegardé).

Usage:
    blender -b <fichier.blend> --factory-startup --python prepare_zone.py -- \
        --zone "zone 12" --source <export.glb> --transform transforms/zone-12.json \
        --ratio 0.1 --out O:\\temp\\zone-12
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

p = argparse.ArgumentParser()
p.add_argument("--zone", required=True)
p.add_argument("--source", required=True)
p.add_argument("--transform", required=True)
p.add_argument("--ratio", type=float, required=True)
p.add_argument("--min-island", type=int, default=100)
p.add_argument("--texture-quality", type=int, default=92)
p.add_argument("--samples", type=int, default=100000)
p.add_argument("--out", required=True)
a = p.parse_args(sys.argv[sys.argv.index("--") + 1:])
os.makedirs(a.out, exist_ok=True)
slug = a.zone.replace(" ", "-")
report = dict(zone=a.zone, source=a.source, ratio=a.ratio, steps={})
t0 = time.time()


def step(name, **info):
    info["seconds"] = round(time.time() - t0, 1)
    report["steps"][name] = info
    print(f"[{info['seconds']:7.1f}s] {name}: {info}", flush=True)


def counts(ob):
    return dict(faces=len(ob.data.polygons), vertices=len(ob.data.vertices))


def edit_delete_selected_faces(ob, mask):
    me = ob.data
    me.polygons.foreach_set("select", mask)
    me.vertices.foreach_set("select", np.zeros(len(me.vertices), bool))
    me.edges.foreach_set("select", np.zeros(len(me.edges), bool))
    me.update()
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_mode(type='FACE')
    bpy.ops.mesh.delete(type='FACE')
    bpy.ops.object.mode_set(mode='OBJECT')


# 1. import
zone_ob = bpy.data.objects[a.zone]
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=a.source)
imported = [o for o in bpy.data.objects if o not in before and o.type == 'MESH']
assert len(imported) == 1, f"un seul mesh attendu, trouvé {len(imported)}"
ob = imported[0]
for o in bpy.context.view_layer.objects:
    o.select_set(False)
ob.select_set(True)
bpy.context.view_layer.objects.active = ob
step("import", **counts(ob))

# 2. transformation vers le monde
T = Matrix(json.load(open(a.transform, encoding="utf-8"))["matrix_source_to_world"])
ob.data.transform(T @ ob.matrix_world)
ob.parent = None
ob.matrix_world = Matrix.Identity(4)
ob.data.update()
step("transform")

# 3. rognage par les volumes de coupe (convexes) des booléens DIFFERENCE
me = ob.data
centers = np.empty(len(me.polygons) * 3); me.polygons.foreach_get("center", centers); centers = centers.reshape(-1, 3)
cut = np.zeros(len(centers), bool)
cutters = []
for m in zone_ob.modifiers:
    if m.type != 'BOOLEAN' or not m.show_render:
        continue
    if m.operation != 'DIFFERENCE' or m.operand_type != 'OBJECT':
        print(f"AVERTISSEMENT: modificateur {m.name} ({m.operation}/{m.operand_type}) ignoré", flush=True)
        continue
    c = m.object
    mw = c.matrix_world
    nm = mw.to_3x3().inverted().transposed()
    inside = np.ones(len(centers), bool)
    for poly in c.data.polygons:
        n = np.array((nm @ poly.normal).normalized())
        p0 = np.array(mw @ c.data.vertices[poly.vertices[0]].co)
        inside &= (centers - p0) @ n < 0
    cut |= inside
    cutters.append(dict(name=c.name, faces_removed=int(inside.sum())))
del centers
edit_delete_selected_faces(ob, cut)
step("trim", cutters=cutters, **counts(ob))

# copie complète pour la mesure d'écart
full_bm = bmesh.new(); full_bm.from_mesh(ob.data)
full_tree = BVHTree.FromBMesh(full_bm)
full_co = np.empty(len(ob.data.vertices) * 3); ob.data.vertices.foreach_get("co", full_co); full_co = full_co.reshape(-1, 3)
full_bm.free()
step("bvh_full")

# 4. décimation
mod = ob.modifiers.new("decimate", 'DECIMATE')
mod.decimate_type = 'COLLAPSE'
mod.ratio = a.ratio
bpy.ops.object.modifier_apply(modifier=mod.name)
step("decimate", **counts(ob))

# 5. îlots
bm = bmesh.new(); bm.from_mesh(ob.data)
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
n_small_verts = len(small)
bmesh.ops.delete(bm, geom=small, context='VERTS')
bm.to_mesh(ob.data)
ob.data.update()
step("islands", vertices_removed=n_small_verts, **counts(ob))

# 6. écart (mètres): décimé -> complet et complet -> décimé
rng = np.random.default_rng(0)
dec_tree = BVHTree.FromBMesh(bm)
dec_co = np.empty(len(ob.data.vertices) * 3); ob.data.vertices.foreach_get("co", dec_co); dec_co = dec_co.reshape(-1, 3)
bm.free()


def deviation(points, tree):
    s = points[rng.choice(len(points), min(a.samples, len(points)), replace=False)]
    d = np.array([tree.find_nearest(Vector(q))[3] for q in s], dtype=float)
    return {k: round(float(v) * 1000, 2) for k, v in
            dict(median_mm=np.median(d), p95_mm=np.quantile(d, 0.95), p99_mm=np.quantile(d, 0.99), max_mm=d.max()).items()}


step("deviation", decimated_to_full=deviation(dec_co, full_tree), full_to_decimated=deviation(full_co, dec_tree))
del full_tree, dec_tree

# 7. export
img = next(n.image for n in ob.data.materials[0].node_tree.nodes if n.type == 'TEX_IMAGE' and n.image)
tex_name = f"{slug}.jpg"
img.save(filepath=os.path.join(a.out, tex_name), quality=a.texture_quality)
img.filepath = os.path.join(a.out, tex_name)
img.source = 'FILE'
obj_path = os.path.join(a.out, f"{slug}.obj")
# Obj2Tiles lit l'OBJ comme Y vers le haut (convention OBJ/glTF) et le convertit lui-même en Z vers le haut
bpy.ops.wm.obj_export(filepath=obj_path, export_selected_objects=True, forward_axis='NEGATIVE_Z', up_axis='Y',
                      export_normals=False, export_uv=True, export_materials=True, path_mode='STRIP',
                      apply_modifiers=False, export_triangulated_mesh=True)
lo, hi = np.min(dec_co, 0), np.max(dec_co, 0)
step("export", obj=obj_path, texture=tex_name, texture_px=list(img.size),
     bbox_min=lo.round(3).tolist(), bbox_max=hi.round(3).tolist(), **counts(ob))

json.dump(report, open(os.path.join(a.out, f"{slug}-prepare.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
