"""Convertit un export .glb en OBJ (+ MTL + texture), sans changer ses coordonnées, pour l'importer dans Metashape.

Les axes sont ramenés à ceux du fichier d'origine (Y vers le haut, comme glTF et OBJ), de sorte que
deux exports du même chunk restent superposés après conversion.

Usage:
    blender -b --factory-startup --python glb_to_obj.py -- <entrée.glb> <sortie.obj>
"""
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cli import parser, script_args  # noqa: E402
p = parser("glb_to_obj.py", __doc__)
p.add_argument("src", help="export .glb")
p.add_argument("dst", help="OBJ à écrire (MTL et texture à côté)")
a = p.parse_args(script_args())
src, dst = a.src, a.dst
os.makedirs(os.path.dirname(dst), exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
for o in bpy.data.objects:
    o.select_set(o in meshes)
bpy.context.view_layer.objects.active = meshes[0]

# Texture à côté de l'OBJ (JPEG, nom du fichier OBJ)
base = os.path.splitext(os.path.basename(dst))[0]
for mat in bpy.data.materials:
    if mat.node_tree:
        for node in mat.node_tree.nodes:
            if node.type == 'TEX_IMAGE' and node.image:
                path = os.path.join(os.path.dirname(dst), f"{base}.jpg")
                node.image.save(filepath=path, quality=95)
                node.image.filepath = path
                node.image.source = 'FILE'

# glTF Y-up -> Blender Z-up à l'import; l'export OBJ en Y-up refait l'inverse: coordonnées d'origine
bpy.ops.wm.obj_export(filepath=dst, export_selected_objects=True, forward_axis='NEGATIVE_Z', up_axis='Y',
                      export_normals=False, export_uv=True, export_materials=True, path_mode='STRIP',
                      export_triangulated_mesh=True)
print("OBJ:", dst, sum(len(o.data.polygons) for o in meshes), "faces", flush=True)
