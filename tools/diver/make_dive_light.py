"""Models the diver's hand light for the 3D viewer's underwater view, after a Light & Motion Sola 1200 (Christian's
reference, 2026-10-23): a compact black cylindrical head, rounded at the back, its front a black face with a ring of six
flood LEDs and three spot LEDs at the centre behind a blue anodized bezel, a slide switch on top, and a wide hand strap
below (it rides on the back of the hand). Written as a .glb (metres, glTF Y up, facing +Z) for the viewer
(viewer/public/diver/dive-light.glb), and a preview render.

Run in Blender, headless:
    blender -b --factory-startup --python tools/diver/make_dive_light.py -- -o viewer/public/diver/dive-light.glb [-p preview.png]
"""
import argparse
import math
import os
import sys

import bpy

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
p = argparse.ArgumentParser(prog="make_dive_light.py", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
p.add_argument("-o", "--out", required=True, help="the .glb to write")
p.add_argument("-p", "--preview", help="a preview render (.png), optional")
a = p.parse_args(argv)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def material(name, color, roughness=0.5, metallic=0.0, emission=None, strength=0.0, alpha=1.0, transmission=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1)
        bsdf.inputs["Emission Strength"].default_value = strength
    if transmission:
        bsdf.inputs["Transmission Weight"].default_value = transmission
    if alpha < 1:
        bsdf.inputs["Alpha"].default_value = alpha
        m.blend_method = 'BLEND' if hasattr(m, "blend_method") else None
    return m


black = material("light-body", (0.012, 0.012, 0.013), roughness=0.38)
face = material("light-face", (0.006, 0.006, 0.007), roughness=0.55)
blue = material("light-bezel", (0.02, 0.16, 0.75), roughness=0.3, metallic=0.85)
led = material("light-led", (1, 1, 1), roughness=0.1, emission=(1.0, 0.97, 0.9), strength=6.0)
lens = material("light-lens", (0.85, 0.88, 0.9), roughness=0.05, metallic=0.2)
strap = material("light-strap", (0.02, 0.02, 0.02), roughness=0.85)
clip = material("light-clip", (0.03, 0.03, 0.035), roughness=0.5)
switch = material("light-switch", (0.55, 0.56, 0.57), roughness=0.35, metallic=0.6)


def finish(obj, mat, bevel=0.0, subdivide=0, smooth=True):
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new("bevel", 'BEVEL')
        mod.width = bevel
        mod.segments = 3
        mod.limit_method = 'ANGLE'
    if subdivide:
        mod = obj.modifiers.new("subsurf", 'SUBSURF')
        mod.levels = mod.render_levels = subdivide
    if smooth:
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.shade_smooth()
    return obj


parts = []
# The light points along +Y in Blender (forward), Z up; exported with Y up, it faces +Z in three.js... see the export
R = 0.031          # head radius
L = 0.085          # head length (front face at y = 0)

# Head: a cylinder from y = -L to 0, its back rounded by a sphere
bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=R, depth=L - R * 0.5, location=(0, -(L - R * 0.5) / 2, 0), rotation=(math.pi / 2, 0, 0))
parts.append(finish(bpy.context.object, black, bevel=0.002))
bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, radius=R, location=(0, -(L - R * 0.5), 0))
back = bpy.context.object
back.scale = (1, 0.75, 1)
parts.append(finish(back, black))
# A slight waist (grip groove) near the back
bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=0.0018, location=(0, -0.05, 0), rotation=(math.pi / 2, 0, 0), major_segments=64, minor_segments=12)
parts.append(finish(bpy.context.object, face))

# Front: the blue bezel (a ring), the black face, the LEDs
bpy.ops.mesh.primitive_torus_add(major_radius=R - 0.0025, minor_radius=0.0032, location=(0, 0.001, 0), rotation=(math.pi / 2, 0, 0), major_segments=64, minor_segments=16)
parts.append(finish(bpy.context.object, blue))
bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=R - 0.004, depth=0.002, location=(0, 0.0005, 0), rotation=(math.pi / 2, 0, 0))
parts.append(finish(bpy.context.object, face))
for i in range(6):
    angle = math.radians(90 + i * 60)
    x, z = math.cos(angle) * 0.017, math.sin(angle) * 0.017
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.0042, location=(x, 0.0015, z))
    dome = bpy.context.object
    dome.scale = (1, 0.45, 1)
    parts.append(finish(dome, led))
for i in range(3):
    angle = math.radians(-90 + i * 120)
    x, z = math.cos(angle) * 0.0055, math.sin(angle) * 0.0055
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.0042, depth=0.003, location=(x, 0.002, z), rotation=(math.pi / 2, 0, 0))
    parts.append(finish(bpy.context.object, lens, bevel=0.0008))
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=0.0018, location=(x, 0.003, z))
    parts.append(finish(bpy.context.object, led))

# The slide switch on top, near the back
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -0.055, R + 0.004))
sw = bpy.context.object
sw.scale = (0.016, 0.02, 0.007)
parts.append(finish(sw, switch, bevel=0.002, smooth=False))
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -0.055, R + 0.0005))
base = bpy.context.object
base.scale = (0.02, 0.028, 0.004)
parts.append(finish(base, black, bevel=0.0015, smooth=False))

# The mount under the head, and the wide hand strap: a loop around the back of the hand (its palm side below)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -0.035, -R - 0.004))
mount = bpy.context.object
mount.scale = (0.03, 0.05, 0.012)
parts.append(finish(mount, clip, bevel=0.003, smooth=False))
HAND_W, HAND_T = 0.09, 0.03          # the hand's width and thickness the strap goes round
bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=1, depth=0.045, location=(0, -0.035, -R - 0.012 - HAND_T / 2 - 0.004), rotation=(math.pi / 2, 0, 0))
loop = bpy.context.object
loop.scale = (HAND_W / 2 + 0.006, HAND_T / 2 + 0.006, 1)
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
solid = loop.modifiers.new("strap", 'SOLIDIFY')
solid.thickness = 0.004
# An open tube: no caps
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='DESELECT')
bpy.ops.object.mode_set(mode='OBJECT')
for poly in loop.data.polygons:
    poly.select = len(poly.vertices) > 4
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.delete(type='FACE')
bpy.ops.object.mode_set(mode='OBJECT')
parts.append(finish(loop, strap))

# One object, its origin at the front centre of the light
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
    bpy.ops.object.camera_add(location=(0.17, 0.2, 0.09))
    cam = bpy.context.object
    target = bpy.data.objects.new("target", None)
    target.location = (0, -0.03, -0.01)
    scene.collection.objects.link(target)
    track = cam.constraints.new('TRACK_TO')
    track.target = target
    cam.data.lens = 60
    scene.camera = cam
    scene.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items.keys() else 'BLENDER_EEVEE'
    scene.render.resolution_x, scene.render.resolution_y = 900, 600
    scene.render.filepath = a.preview
    bpy.ops.render.render(write_still=True)
    print(f"[light] preview {a.preview}", flush=True)
