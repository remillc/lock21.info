"""Analyse de résolution des modèles photogrammétriques (collection "zones").

Mesure, pour chaque zone: densité de triangles, longueur des arêtes, taille des
texels, remplissage UV, ratio texels/triangle et santé du maillage (îlots,
arêtes non manifold). Compare ensuite aux seuils de thresholds.json et produit
une recommandation par zone.

Lecture seule: le fichier .blend n'est jamais sauvegardé.

Usage (voir run.ps1):
    blender -b <fichier.blend> --factory-startup --python analyze_zones.py -- <thresholds.json> <dossier de sortie>
"""
import bpy
import bmesh
import json
import math
import os
import sys
from datetime import date

import numpy as np

import argparse  # noqa: E402

p = argparse.ArgumentParser(prog="analyze_zones.py", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
p.add_argument("thresholds", help="thresholds.json")
p.add_argument("out_dir", help="dossier des rapports")
a = p.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
cfg = json.load(open(a.thresholds, encoding="utf-8"))
out_dir = a.out_dir

view = cfg["viewing"]
# Taille d'un pixel écran projeté sur la surface à la distance minimale de visionnement
target_texel_mm = 1000 * 2 * view["min_view_distance_m"] * math.tan(math.radians(view["vertical_fov_deg"] / 2)) / view["screen_height_px"]


def islands(bm):
    bm.verts.ensure_lookup_table()
    seen = np.zeros(len(bm.verts), bool)
    sizes = []
    for v0 in bm.verts:
        if seen[v0.index]:
            continue
        stack, n = [v0], 0
        seen[v0.index] = True
        while stack:
            v = stack.pop()
            n += 1
            for e in v.link_edges:
                o = e.other_vert(v)
                if not seen[o.index]:
                    seen[o.index] = True
                    stack.append(o)
        sizes.append(n)
    return sizes


def first_image(me):
    mat = me.materials[0] if me.materials else None
    if mat and mat.node_tree:
        for n in mat.node_tree.nodes:
            if n.type == 'TEX_IMAGE' and n.image:
                return n.image
    return None


def analyze(ob):
    me = ob.data
    me.calc_loop_triangles()
    nv, nt, nl = len(me.vertices), len(me.loop_triangles), len(me.loops)

    co = np.empty(nv * 3); me.vertices.foreach_get("co", co); co = co.reshape(-1, 3)
    M = np.array(ob.matrix_world)
    co = co @ M[:3, :3].T + M[:3, 3]  # mètres, espace monde

    tv = np.empty(nt * 3, np.int64); me.loop_triangles.foreach_get("vertices", tv); tv = tv.reshape(-1, 3)
    tl = np.empty(nt * 3, np.int64); me.loop_triangles.foreach_get("loops", tl); tl = tl.reshape(-1, 3)

    a, b, c = co[tv[:, 0]], co[tv[:, 1]], co[tv[:, 2]]
    area3d = 0.5 * np.linalg.norm(np.cross(b - a, c - a), axis=1)
    edges = np.concatenate([np.linalg.norm(b - a, axis=1), np.linalg.norm(c - b, axis=1), np.linalg.norm(a - c, axis=1)])

    uv = np.empty(nl * 2); me.uv_layers.active.data.foreach_get("uv", uv); uv = uv.reshape(-1, 2)
    ua, ub, uc = uv[tl[:, 0]], uv[tl[:, 1]], uv[tl[:, 2]]
    areauv = 0.5 * np.abs((ub[:, 0] - ua[:, 0]) * (uc[:, 1] - ua[:, 1]) - (uc[:, 0] - ua[:, 0]) * (ub[:, 1] - ua[:, 1]))

    img = first_image(me)
    tex = img.size[0] if img else 0
    A = area3d.sum()

    # Texels par mètre (linéaire) de chaque triangle, percentiles pondérés par la surface 3D
    valid = area3d > 1e-12
    tpm = tex * np.sqrt(areauv[valid] / area3d[valid])
    order = np.argsort(tpm)
    cw = np.cumsum(area3d[valid][order]) / A
    texel_mm = lambda p: 1000 / float(tpm[order][min(np.searchsorted(cw, p), len(order) - 1)])

    bm = bmesh.new(); bm.from_mesh(me)
    nonmanifold = sum(1 for e in bm.edges if not e.is_manifold)
    isl = islands(bm)
    bm.free()

    return dict(
        zone=ob.name,
        modifiers=[m.type for m in ob.modifiers],
        scale=round(ob.scale[0], 4),
        triangles=nt,
        area_m2=round(A, 1),
        triangles_per_m2=round(nt / A),
        triangles_per_ft2=round(nt / A * 0.09290304),
        edge_mm=dict(p10=round(float(np.percentile(edges, 10)) * 1000, 1),
                     median=round(float(np.median(edges)) * 1000, 1),
                     p90=round(float(np.percentile(edges, 90)) * 1000, 1)),
        texture_px=tex,
        uv_fill_pct=round(float(areauv.sum()) * 100, 1),
        texel_mm=dict(p10=round(texel_mm(0.9), 2), median=round(texel_mm(0.5), 2), p90=round(texel_mm(0.1), 2)),
        texels_per_triangle=round(tex * tex * float(areauv.sum()) / nt, 1),
        nonmanifold_edges=nonmanifold,
        islands=len(isl),
        small_islands=sum(1 for i in isl if i < cfg["cleanup"]["small_island_vertices"]),
    )


def recommend(z):
    t, g, cl = cfg["texture"], cfg["geometry"], cfg["cleanup"]
    rec = []
    ratio = z["texel_mm"]["median"] / target_texel_mm
    if ratio > t["tolerance"]:
        side = z["texture_px"] * ratio
        rec.append(f"retexturer: texels {ratio:.1f}x trop gros, viser ~{side / 1024:.0f}k px de côté (ex. {math.ceil((side / 4096) ** 2)} pages 4k)")
    elif ratio < 1 / t["tolerance"]:
        rec.append(f"réduire la texture: texels {1 / ratio:.1f}x plus fins que nécessaire")
    if z["texel_mm"]["p90"] / z["texel_mm"]["p10"] > t["max_nonuniformity_p90_p10"]:
        rec.append("densité de texels non uniforme: refaire le dépliage UV")
    if z["texels_per_triangle"] < g["min_texels_per_triangle"]:
        rec.append(f"décimer: {z['texels_per_triangle']} texels/triangle (< {g['min_texels_per_triangle']}), valider par mesure d'écart")
    if z["small_islands"] > cl["max_small_islands"]:
        rec.append(f"nettoyer: {z['small_islands']} îlots de moins de {cl['small_island_vertices']} sommets")
    return rec or ["aucune action"]


zones = [ob for ob in bpy.data.collections[cfg["collection"]].objects
         if ob.type == 'MESH' and ob.name.startswith("zone ") and len(ob.data.polygons) > 10000]
results = []
for ob in sorted(zones, key=lambda o: int(o.name.split()[1])):
    z = analyze(ob)
    z["recommendations"] = recommend(z)
    results.append(z)
    print("analysé:", ob.name, flush=True)

today = date.today().isoformat()
report = dict(date=today, blend=bpy.data.filepath, blender=bpy.app.version_string,
              thresholds=cfg, target_texel_mm=round(target_texel_mm, 2), zones=results)
os.makedirs(out_dir, exist_ok=True)
with open(os.path.join(out_dir, f"{today}.json"), "w", encoding="utf-8") as f:
    json.dump(report, f, ensure_ascii=False, indent=2)

lines = [
    f"# Analyse de résolution: {today}",
    "",
    f"Fichier: `{os.path.basename(bpy.data.filepath)}`, Blender {bpy.app.version_string}.",
    f"Texel cible: **{target_texel_mm:.2f} mm** (pixel écran à {view['min_view_distance_m']} m, FOV {view['vertical_fov_deg']}°, {view['screen_height_px']} px).",
    "",
    "| Zone | Triangles | Surface (m²) | Tri/pi² | Arête médiane (mm) | Texture | Remplissage UV | Texel médian (mm) | Texels/tri | Îlots < seuil | Échelle |",
    "| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
]
for z in results:
    lines.append(f"| {z['zone'].split()[1]} | {z['triangles']:,} | {z['area_m2']} | {z['triangles_per_ft2']} | {z['edge_mm']['median']} | "
                 f"{z['texture_px']} | {z['uv_fill_pct']}% | {z['texel_mm']['median']} | {z['texels_per_triangle']} | {z['small_islands']} | {z['scale']} |")
lines += ["", "## Recommandations", ""]
for z in results:
    lines.append(f"- **{z['zone']}**: " + "; ".join(z["recommendations"]))
lines += ["", "Surfaces mesurées avant l'application des modificateurs booléens: elles incluent les parties qui seront rognées."]
with open(os.path.join(out_dir, f"{today}.md"), "w", encoding="utf-8") as f:
    f.write("\n".join(lines) + "\n")
print("rapport:", os.path.join(out_dir, today), flush=True)
