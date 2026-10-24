"""Models the diver's hand light for the 3D viewer's underwater view, after a Light & Motion Sola 1200 (Christian's
reference, 2026-10-23): a compact turned head, black anodized, fluted for the grip and rounded at the back (a battery
indicator there), its front recessed behind clear glass: a polished reflector with six flood LEDs and three spot LEDs
in their cups, framed by a knurled blue anodized bezel; a slide switch in its track on top, and a wide rubber hand
strap with a buckle below (the light rides on the back of the hand). Written as a .glb (metres) for the viewer
(tools/diver/dive-light.glb: only an input of make_diver_arm.py, which sets it on the hand; the viewer loads the
arm), and a preview render.

Built in Blender's frame: forward +Y (the front face at y = 0), up +Z; the strap's loop centred at (0, -0.035, -0.062),
the saddle's underside at z = -0.0425 (make_diver_arm.py sets it on the back of the hand and swaps the loop, the buckle
and the keeper for a strap fitted to the hand).

Run in Blender, headless:
    blender -b --factory-startup --python tools/diver/make_dive_light.py -- -o tools/diver/dive-light.glb [-p preview.png]
"""
import argparse
import math
import os
import sys

import bmesh
import bpy

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
p = argparse.ArgumentParser(prog="make_dive_light.py", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
p.add_argument("-o", "--out", required=True, help="the .glb to write")
p.add_argument("-p", "--preview", help="a preview render (.png), optional")
a = p.parse_args(argv)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def material(name, color, roughness=0.5, metallic=0.0, emission=None, strength=0.0, alpha=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1)
        bsdf.inputs["Emission Strength"].default_value = strength
    if alpha < 1:
        bsdf.inputs["Alpha"].default_value = alpha
        if hasattr(m, "surface_render_method"):
            m.surface_render_method = 'BLENDED'
    return m


body_mat = material("light-body", (0.016, 0.016, 0.018), roughness=0.32, metallic=0.75)
groove_mat = material("light-face", (0.005, 0.005, 0.006), roughness=0.6)
blue = material("light-bezel", (0.02, 0.15, 0.7), roughness=0.28, metallic=0.9)
reflector = material("light-reflector", (0.85, 0.86, 0.88), roughness=0.08, metallic=1.0)
led = material("light-led", (1.0, 0.86, 0.45), roughness=0.3, emission=(1.0, 0.95, 0.82), strength=8.0)
glass = material("light-lens", (0.9, 0.95, 1.0), roughness=0.02, alpha=0.12)
switch_mat = material("light-switch", (0.5, 0.51, 0.53), roughness=0.3, metallic=0.85)
rubber = material("light-strap", (0.018, 0.018, 0.019), roughness=0.88)
# The loop round the hand and its keeper: a material of their own, so make_diver_arm.py can swap them for a strap fitted
# to the hand
loop_mat = material("light-strap-loop", (0.018, 0.018, 0.019), roughness=0.88)
clip = material("light-clip", (0.03, 0.03, 0.033), roughness=0.45, metallic=0.3)
buckle_mat = material("light-buckle", (0.6, 0.6, 0.62), roughness=0.25, metallic=1.0)
indicator = material("light-indicator", (0.1, 0.8, 0.3), roughness=0.2, emission=(0.2, 1.0, 0.4), strength=3.0)

parts = []


def add(obj, mat, smooth=True, sharp=40, bevel=0.0):
    """Material, smooth shading with sharp edges past `sharp` degrees, an optional bevel; kept for the join"""
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new("bevel", 'BEVEL')
        mod.width, mod.segments, mod.limit_method = bevel, 3, 'ANGLE'
    if smooth:
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        for f in bm.faces:
            f.smooth = True
        for e in bm.edges:
            if len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(sharp):
                e.smooth = False
        bm.to_mesh(obj.data)
        bm.free()
    parts.append(obj)
    return obj


def lathe(name, profile, segments=128, centre=(0.0, 0.0), radius=None):
    """A solid turned around the Y axis (through `centre`, x and z) from a profile of (r, y) points; `radius(r, y,
    angle)` can reshape it (flutes, knurling)"""
    bm = bmesh.new()
    rings = []
    for i in range(segments):
        angle = 2 * math.pi * i / segments
        ring = []
        for r, y in profile:
            rr = radius(r, y, angle) if radius else r
            ring.append(bm.verts.new((centre[0] + rr * math.cos(angle), y, centre[1] + rr * math.sin(angle))))
        rings.append(ring)
    for i in range(segments):
        a_, b_ = rings[i], rings[(i + 1) % segments]
        for j in range(len(profile) - 1):
            bm.faces.new((a_[j], a_[j + 1], b_[j + 1], b_[j]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(obj)
    return obj


def box(name, size, location):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.data.transform(__import__("mathutils").Matrix.Diagonal((*size, 1)))
    return obj


L = 0.092           # head length, back to front
RB = 0.0285         # body radius
RF = 0.031          # front collar radius
FACE = -0.008       # the reflector's plane, behind the glass

# 1. The head: a rounded back (its quarter ellipse), the fluted body with a grip groove, the wider front collar
profile = [(0.0, -L)]
for k in range(1, 11):
    t = math.radians(9 * k)
    profile.append((RB * math.sin(t), -L + 0.017 * (1 - math.cos(t))))
profile += [(RB, -0.06), (RB, -0.052), (RB - 0.002, -0.0505), (RB - 0.002, -0.0495), (RB, -0.048), (RB, -0.021),
            (RF, -0.017), (RF, -0.004), (0.0245, -0.004), (0.0245, FACE), (0.0, FACE)]


def flutes(r, y, angle):
    # 16 shallow flats along the body, between the back's curve and the collar (not across the groove)
    if -0.07 < y < -0.022 and r >= RB - 1e-4:
        return r * (1 - 0.045 * max(0.0, math.cos(16 * angle)) ** 8)
    return r


add(lathe("head", profile, radius=flutes), body_mat, sharp=35)
# The groove's floor in black (an inset ring over it)
add(lathe("groove", [(RB - 0.0019, -0.0506), (RB - 0.0019, -0.0494)]), groove_mat)

# 2. The front: the knurled blue bezel, the reflector with its LED cups, the glass
def knurl(r, y, angle):
    return r * (1 - 0.02 * (0.5 + 0.5 * math.cos(72 * angle))) if r > 0.031 else r


bezel = [(0.0245, -0.0042), (0.0315, -0.0042), (0.0322, -0.003), (0.0322, 0.0012), (0.031, 0.0024), (0.0262, 0.0024),
         (0.0252, 0.0012), (0.0252, -0.0042)]
add(lathe("bezel", bezel, segments=288, radius=knurl), blue, sharp=30)
add(lathe("reflector", [(0.0, FACE + 0.0002), (0.0245, FACE + 0.0002)]), reflector)
cups = [(0.0165, math.radians(90 + i * 60), 0.0058) for i in range(6)] + \
       [(0.0062, math.radians(-90 + i * 120), 0.0044) for i in range(3)]
for ring, angle, size in cups:
    cx, cz = ring * math.cos(angle), ring * math.sin(angle)
    # A polished cup opening forward (a curved cone), the LED's die at its bottom
    cup = [(0.0014, FACE + 0.0004)] + [(0.0014 + (size - 0.0014) * (k / 6) ** 0.7, FACE + 0.0004 + 0.0055 * (k / 6) ** 1.6)
                                       for k in range(1, 7)]
    add(lathe("cup", cup, segments=32, centre=(cx, cz)), reflector, sharp=60)
    add(box("die", (0.0022, 0.0006, 0.0022), (cx, FACE + 0.0007, cz)), led, smooth=False)
add(lathe("glass", [(0.0, -0.0022), (0.0252, -0.0022), (0.0252, -0.0010), (0.0, -0.0010)], segments=96), glass)

# 3. The slide switch on top, in its track, its slider ridged; the battery indicator at the back
add(box("track", (0.013, 0.034, 0.003), (0, -0.05, RB + 0.0005)), groove_mat, smooth=False, bevel=0.001)
slider = add(box("slider", (0.012, 0.013, 0.0055), (0, -0.058, RB + 0.003)), switch_mat, smooth=False, bevel=0.0012)
for k in (-1, 0, 1):
    add(box("ridge", (0.012, 0.0012, 0.001), (0, -0.058 + k * 0.0035, RB + 0.006)), switch_mat, smooth=False)
bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.0022, location=(0, -L + 0.0004, 0.008))
dot = bpy.context.object
dot.scale = (1, 0.5, 1)
add(dot, indicator)

# 4. The mount under the head, and the wide rubber strap round the hand (palm side below), its buckle on the outside
HAND_W, HAND_T = 0.09, 0.03          # the hand's width and thickness the strap goes round
add(box("mount", (0.026, 0.05, 0.012), (0, -0.035, -RB - 0.005)), clip, smooth=False, bevel=0.003)
add(box("saddle", (0.034, 0.042, 0.004), (0, -0.035, -RB - 0.012)), rubber, smooth=False, bevel=0.0015)
loop_z = -RB - 0.012 - HAND_T / 2 - 0.0055
bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=1, depth=0.04, location=(0, -0.035, loop_z), rotation=(math.pi / 2, 0, 0))
loop = bpy.context.object
loop.scale = (HAND_W / 2 + 0.006, HAND_T / 2 + 0.006, 1)
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
bm = bmesh.new()
bm.from_mesh(loop.data)
bmesh.ops.delete(bm, geom=[f for f in bm.faces if len(f.verts) > 4], context='FACES')          # an open tube
bm.to_mesh(loop.data)
bm.free()
solid = loop.modifiers.new("strap", 'SOLIDIFY')
solid.thickness = 0.0035
add(loop, loop_mat, sharp=80)
add(box("buckle", (0.004, 0.03, 0.016), (HAND_W / 2 + 0.0095, -0.035, loop_z)), buckle_mat, smooth=False, bevel=0.001)
add(box("keeper", (0.005, 0.034, 0.004), (HAND_W / 2 + 0.0095, -0.035, loop_z + 0.004)), loop_mat, smooth=False, bevel=0.001)

# One object, its origin at the front centre of the light
bpy.ops.object.select_all(action='DESELECT')
for o in parts:
    o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.convert(target='MESH')
bpy.ops.object.join()
light = bpy.context.object
light.name = "dive-light"

os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=a.out, export_format='GLB', use_selection=True, export_apply=True)
print(f"[light] {a.out} ({os.path.getsize(a.out) / 1e3:.0f} kB, {len(light.data.polygons):,} faces)", flush=True)

if a.preview:
    world = bpy.data.worlds.new("w")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.8, 0.8, 0.82, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.6
    scene.world = world
    bpy.ops.object.light_add(type='AREA', location=(0.25, 0.3, 0.3))
    key = bpy.context.object
    key.data.energy = 60
    key.data.size = 0.3
    key.rotation_euler = (math.radians(-45), math.radians(35), math.radians(140))
    target = bpy.data.objects.new("target", None)
    target.location = (0, -0.035, -0.015)
    scene.collection.objects.link(target)
    scene.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items.keys() else 'BLENDER_EEVEE'
    scene.render.resolution_x, scene.render.resolution_y = 900, 600
    # Three-quarter view from the front, and the back from above
    for suffix, location in (("", (0.17, 0.2, 0.09)), ("-back", (-0.12, -0.25, 0.14))):
        bpy.ops.object.camera_add(location=location)
        cam = bpy.context.object
        track = cam.constraints.new('TRACK_TO')
        track.target = target
        cam.data.lens = 60
        scene.camera = cam
        scene.render.filepath = a.preview.replace(".png", f"{suffix}.png")
        bpy.ops.render.render(write_still=True)
    print(f"[light] preview {a.preview}", flush=True)
