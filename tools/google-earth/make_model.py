"""Builds the whole model of the lock for downloads and Google Earth (TODO #13): every published zone plus the
context (terrain, walls, fillers), decimated to a triangle budget, textures resized, placed on the site anchor.

Zones: their prepared meshes (prepare_zone.py: <temp>/<slug>/prox/<slug>.obj + .jpg, Blender frame in metres, Z up),
the ones in the local manifest (the same as the published tiles). Context: an uncompressed context.glb written by
tools/publish-model/export_context.py (the published one has KTX2 textures, which Blender can't read).
Budget: -c/--context-share of the triangles for the context (at most its own count), the rest spread over the zones by
surface area (prepare_zone.py's area_m2), so every zone gets the same density.

-x/--scale: a scale model (0.01 = 1:100, the 70 m lock becomes 70 cm), e.g. for augmented reality on a table.
--usdz: also writes <name>.usdz, for iPhone and iPad (AR Quick Look).

Writes, in -o/--out:
  <name>.glb    for Google Earth on the web (import), Blender, Sketchfab...: textures embedded, no compression
  <name>.obj    + .mtl + one .jpg per material, read by make_kmz.py to build the KMZ for Google Earth Pro
  <name>.json   triangles per part, sizes, offset

Usage:
    blender -b --factory-startup --python make_model.py -- -o O:\\publishing\\downloads\\google-earth\\t400k -t 400000 -s 2048 --context O:\\temp\\google-earth\\context\\context.glb
"""
import json
import os
import sys

import bpy

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "publish-model"))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cli import parser, script_args  # noqa: E402
from glb_metadata import copyright_line, tag  # noqa: E402

p = parser("make_model.py", __doc__)
p.add_argument("-o", "--out", required=True, help="output folder")
p.add_argument("-n", "--name", default="lock-21", help="base name of the files (default lock-21)")
p.add_argument("-t", "--triangles", type=int, default=400_000, help="total triangle budget (default 400000)")
p.add_argument("-s", "--size", type=int, default=2048, help="largest texture size, px (default 2048)")
p.add_argument("--zone-size", nargs="*", default=[], metavar="ZONE=PX",
               help="texture size for some zones, e.g. zone-3=4096 zone-7=4096 (zones whose atlas is cut into many small charts)")
p.add_argument("-c", "--context-share", type=float, default=0.1, help="share of the budget for the context (default 0.1)")
p.add_argument("--context", help="uncompressed context.glb (export_context.py); without it, the zones only")
p.add_argument("--zones", nargs="*", help='zones, e.g. "zone 12" (default: those of the local manifest)')
p.add_argument("--context-only", action="store_true", help="the context without any zone (tests)")
p.add_argument("--tiles-root", default=r"O:\publishing\tiles", help="local tiles, for the list of zones")
p.add_argument("--temp-root", default=r"O:\temp", help="prepared zones: <temp>/<slug>/prox/")
p.add_argument("-q", "--quality", type=int, default=88, help="JPEG quality (default 88)")
p.add_argument("-x", "--scale", type=float, default=1.0, help="model scale (default 1; 0.01 = 1:100, for augmented reality on a table)")
p.add_argument("--usdz", action="store_true", help="also write <name>.usdz (AR Quick Look on iPhone and iPad)")
# Site anchor: the point of the Blender frame pinned to the lock's coordinates in Google Earth. It is the horizontal
# centre of all the zones as of 2026-10-19 (zones 1, 2, 3, 4, 7, 8, 10, 11, 12, 13: x -64.34..6.24, y 2.68..40.72),
# frozen so that zones added later keep their place instead of shifting the whole lock. z unchanged (z = 0 is the
# lock's reference level).
SITE_ANCHOR = (-29.05, 21.70)
a = p.parse_args(script_args())
os.makedirs(a.out, exist_ok=True)


def log(msg):
    print(f"[earth] {msg}", flush=True)


zone_sizes = {k: int(v) for k, v in (item.split("=") for item in a.zone_size)}


def save_texture(image, name):
    """Resized to at most --size px (or --zone-size for this name; proportional, sides multiple of 4), saved as JPEG"""
    w, h = image.size
    scale = min(1.0, zone_sizes.get(name, a.size) / max(w, h))
    if scale < 1:
        image.scale(max(4, round(w * scale / 4) * 4), max(4, round(h * scale / 4) * 4))
    image.filepath_raw = os.path.join(a.out, f"{name}.jpg")
    image.file_format = 'JPEG'
    image.save(quality=a.quality)
    return image


def plain_material(name, image=None, color=None):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = 1.0
    if image:
        node = mat.node_tree.nodes.new("ShaderNodeTexImage")
        node.image = image
        mat.node_tree.links.new(node.outputs["Color"], bsdf.inputs["Base Color"])
    elif color:
        bsdf.inputs["Base Color"].default_value = color
    return mat


def decimate(ob, target):
    """Collapse decimation to `target` triangles. On meshes with many UV seams one pass stops well above the ratio
    (zone 3: 78,000 for 34,000 asked): passes repeat, each on what is left, until within 5 % of the target."""
    before = len(ob.data.polygons)
    bpy.context.view_layer.objects.active = ob
    for _ in range(6):
        count = len(ob.data.polygons)
        if count <= max(target, 4) * 1.05:
            break
        mod = ob.modifiers.new("decimate", 'DECIMATE')
        mod.ratio = max(target, 4) / count
        bpy.ops.object.modifier_apply(modifier=mod.name)
        if len(ob.data.polygons) >= count:
            break
    return before, len(ob.data.polygons)


bpy.ops.wm.read_factory_settings(use_empty=True)

# Zones of the local manifest, with their surface area
if a.context_only:
    slugs = []
elif a.zones:
    slugs = [z.replace(" ", "-") for z in a.zones]
else:
    manifest = json.load(open(os.path.join(a.tiles_root, "manifest.json"), encoding="utf-8"))
    slugs = [t["id"] for t in manifest["tilesets"]]
zones = []
for slug in slugs:
    prox = os.path.join(a.temp_root, slug, "prox")
    report = json.load(open(os.path.join(prox, f"{slug}-prepare.json"), encoding="utf-8"))
    zones.append(dict(slug=slug, prox=prox, area=report["steps"]["decimate"]["area_m2"]))

# Context: imported first, to know its own triangle count
context_obs = []
if a.context:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=a.context)
    context_obs = [o for o in bpy.data.objects if o not in before and o.type == 'MESH']
    for ob in context_obs:
        ob.data.transform(ob.matrix_world)
        ob.parent = None
        ob.matrix_world.identity()
context_faces = sum(len(o.data.polygons) for o in context_obs)
context_budget = min(context_faces, int(a.triangles * (1 if a.context_only else a.context_share))) if context_obs else 0
zone_budget = a.triangles - context_budget
total_area = sum(z["area"] for z in zones) or 1
parts = []

for z in zones:
    slug = z["slug"]
    bpy.ops.wm.obj_import(filepath=os.path.join(z["prox"], f"{slug}.obj"), forward_axis='NEGATIVE_Z', up_axis='Y')
    ob = z["ob"] = bpy.context.selected_objects[0]
    ob.name = slug
    ob.data.transform(ob.matrix_world)
    ob.matrix_world.identity()
    z["target"] = int(zone_budget * z["area"] / total_area)
    z["before"], z["after"] = decimate(ob, z["target"])
    texture = z["texture"] = save_texture(bpy.data.images.load(os.path.join(z["prox"], f"{slug}.jpg")), slug)
    ob.data.materials.clear()
    ob.data.materials.append(plain_material(slug, image=texture))

# Zones whose texture is cut into many small charts (zones 3 and 7) stop well above their share: collapse decimation
# doesn't merge across UV seams. The excess is taken from the other zones, so the total stays on budget.
stuck = [z for z in zones if z["after"] > z["target"] * 1.05]
free = [z for z in zones if z not in stuck]
excess = sum(z["after"] - z["target"] for z in stuck)
free_total = sum(z["after"] for z in free)
if stuck and free_total:
    log(f"above their share (UV seams): {', '.join(z['slug'] for z in stuck)}, {excess:,} triangles taken from the others")
    for z in free:
        z["after"] = decimate(z["ob"], int(z["after"] * max(0.05, 1 - excess / free_total)))[1]
for z in zones:
    parts.append(dict(part=z["slug"], area_m2=z["area"], triangles_before=z["before"], triangles=z["after"],
                      texture_px=z["texture"].size[0]))
    log(f"{z['slug']}: {z['before']:,} -> {z['after']:,} triangles, texture {z['texture'].size[0]} px")

# Context: budget spread by triangle count; each material's image (or colour) on a plain material
for ob in context_obs:
    before, after = decimate(ob, int(context_budget * len(ob.data.polygons) / max(context_faces, 1)))
    for i, slot in enumerate(ob.material_slots):
        old = slot.material
        image = color = None
        if old and old.use_nodes:
            image = next((n.image for n in old.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image), None)
            bsdf = next((n for n in old.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            color = tuple(bsdf.inputs["Base Color"].default_value) if bsdf else None
        name = f"context-{ob.name}-{i}".replace(" ", "-").replace(".", "-")
        if image:
            image = save_texture(image, name)
        slot.material = plain_material(name, image=image, color=color)
    parts.append(dict(part=f"context: {ob.name}", triangles_before=before, triangles=after))
    log(f"context {ob.name}: {before:,} -> {after:,} triangles")

# Site anchor at the origin, then the scale (--scale)
for ob in bpy.data.objects:
    if ob.type == 'MESH':
        for v in ob.data.vertices:
            v.co.x = (v.co.x - SITE_ANCHOR[0]) * a.scale
            v.co.y = (v.co.y - SITE_ANCHOR[1]) * a.scale
            v.co.z *= a.scale
        # Copyright on every object: exported as USD properties (userProperties:lock21:...) in the USDZ
        ob["lock21:copyright"] = copyright_line()
        ob["lock21:source"] = "https://lock21.info/modele/"

bpy.ops.object.select_all(action='DESELECT')
for ob in bpy.data.objects:
    ob.select_set(ob.type == 'MESH')
glb = os.path.join(a.out, f"{a.name}.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=True, export_image_format='JPEG',
                          export_jpeg_quality=a.quality, export_normals=True, export_draco_mesh_compression_enable=False,
                          export_copyright=copyright_line())
# Copyright, licence, origin coordinates and orientation in the file (glb_metadata.py): every public file carries them
tag(glb, scale=a.scale)
if a.usdz:
    # AR Quick Look (iPhone, iPad): USDZ, Y up, metres, textures packed in the file; the copyright travels as USD
    # properties of each object (custom properties), Quick Look shows the file name as title
    bpy.ops.wm.usd_export(filepath=os.path.join(a.out, f"{a.name}.usdz"), selected_objects_only=True, export_materials=True,
                          convert_orientation=True, export_global_up_selection='Y', export_global_forward_selection='NEGATIVE_Z',
                          export_custom_properties=True, custom_properties_namespace="userProperties",
                          convert_scene_units='METERS')
obj = os.path.join(a.out, f"{a.name}.obj")
bpy.ops.wm.obj_export(filepath=obj, export_selected_objects=True, forward_axis='Y', up_axis='Z', export_normals=False,
                      export_uv=True, export_materials=True, path_mode='STRIP', export_triangulated_mesh=True)

info = dict(triangles=sum(p["triangles"] for p in parts), budget=a.triangles, texture_px=a.size,
            site_anchor=SITE_ANCHOR, glb_mb=round(os.path.getsize(glb) / 1e6, 1), parts=parts)
json.dump(info, open(os.path.join(a.out, f"{a.name}.json"), "w", encoding="utf-8"), indent=2)
log(f"{info['triangles']:,} triangles, GLB {info['glb_mb']} MB -> {a.out}")
