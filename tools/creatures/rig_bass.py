"""Rigs the viewer's smallmouth bass (« Smallmouth bass » by faerbogdan99, Sketchfab, CC BY 4.0) for swimming
(Christian, 2026-10-23: it must be rigged): a spine of SPINE bones from the head to the tail fin along the body's
middle line, each vertex weighted by its place along the body (smoothly shared between its two nearest bones, the head
held stiff); written as a skinned .glb for src/viewer/bass.js, which bends the spine in a travelling wave.

The model, as imported: head toward -Y, tail toward +Y, the body's middle line about BODY_Z high (Blender, metres of the
file). Then pack its textures: node tools/publish-model/pack_creature.mjs <out.glb> public/viewer/creatures/bass.glb

The model is lightened to --faces triangles first (Decimate, collapse: texture coordinates kept; Christian, 2026-10-24:
a few fish here and there, the original's 40,000 triangles were as many as a tile of the lock).

Run in Blender, headless:
    blender -b --factory-startup --python tools/creatures/rig_bass.py -- -i O:/modeles/creatures/bass/scene.gltf -o <out.glb> [-f 6000]
"""
import argparse
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
p = argparse.ArgumentParser(prog="rig_bass.py", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
p.add_argument("-i", "--input", required=True, help="the bass model (.gltf)")
p.add_argument("-o", "--out", required=True, help="the rigged .glb to write")
p.add_argument("-f", "--faces", type=int, default=6000, help="triangles to keep (default 6000; 0: all)")
a = p.parse_args(argv)

# The spine's joints along the body (y, head to tail), at the body's middle height
JOINTS = [-0.95, -0.45, -0.05, 0.3, 0.6, 0.95]
BODY_Z = 0.42
BONES = [f"spine_{i}" for i in range(len(JOINTS) - 1)]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=a.input)
scene = bpy.context.scene
mesh = next(o for o in scene.objects if o.type == 'MESH')
# One object in world space: the import's empties and their turns baked into the mesh
world = mesh.matrix_world.copy()
mesh.parent = None
mesh.data.transform(world)
mesh.matrix_world.identity()
for o in [o for o in scene.objects if o.type == 'EMPTY']:
    bpy.data.objects.remove(o, do_unlink=True)

# Lighter: down to --faces triangles (before the weights, which are given per remaining vertex)
before = sum(len(f.vertices) - 2 for f in mesh.data.polygons)
if a.faces and before > a.faces:
    bpy.context.view_layer.objects.active = mesh
    decimate = mesh.modifiers.new("lighter", 'DECIMATE')
    decimate.decimate_type = 'COLLAPSE'
    decimate.ratio = a.faces / before
    decimate.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=decimate.name)
    print(f"[rig] {before:,} -> {sum(len(f.vertices) - 2 for f in mesh.data.polygons):,} triangles", flush=True)

# The armature: one chain, head first
armature = bpy.data.armatures.new("bass-rig")
rig = bpy.data.objects.new("bass-rig", armature)
scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
parent = None
for name, y0, y1 in zip(BONES, JOINTS[:-1], JOINTS[1:]):
    bone = armature.edit_bones.new(name)
    bone.head = Vector((0, y0, BODY_Z))
    bone.tail = Vector((0, y1, BODY_Z))
    if parent:
        bone.parent = parent
        bone.use_connect = True
    parent = bone
bpy.ops.object.mode_set(mode='OBJECT')

# Weights: by the vertex's place along the body; each bone's share peaks at its middle and fades to its neighbours'
groups = [mesh.vertex_groups.new(name=n) for n in BONES]
middles = [(y0 + y1) / 2 for y0, y1 in zip(JOINTS[:-1], JOINTS[1:])]
for v in mesh.data.vertices:
    y = v.co.y
    if y <= middles[0]:
        groups[0].add([v.index], 1.0, 'REPLACE')
        continue
    if y >= middles[-1]:
        groups[-1].add([v.index], 1.0, 'REPLACE')
        continue
    for k in range(len(middles) - 1):
        if middles[k] <= y <= middles[k + 1]:
            t = (y - middles[k]) / (middles[k + 1] - middles[k])
            t = t * t * (3 - 2 * t)
            groups[k].add([v.index], 1 - t, 'REPLACE')
            groups[k + 1].add([v.index], t, 'REPLACE')
            break
mesh.parent = rig
modifier = mesh.modifiers.new("rig", 'ARMATURE')
modifier.object = rig

for o in scene.objects:
    o.select_set(True)
bpy.ops.export_scene.gltf(filepath=a.out, export_format='GLB', use_selection=True, export_skins=True,
                          export_animations=False)
print(f"[rig] {a.out}: {len(BONES)} bones, {len(mesh.data.vertices):,} vertices", flush=True)
