"""Cuit les matériaux procéduraux du contexte (terrain: rampes de couleur, bruit, relief) en textures, DANS Blender.

À exécuter dans le Blender ouvert sur modeles/lock-21-publishing.blend:
  onglet Scripting > Text > Open... > ce fichier > Run Script (▶). Blender reste figé pendant la cuisson
  (environ 2 minutes pour le terrain, sur la carte graphique si elle est choisie dans les préférences Cycles).

Pour chaque objet du contexte (noms contenant « filler », collection `terrain`) dont un matériau est procédural:
  - rendu Cycles de la couleur sous l'éclairage de la scène (direct + indirect: le relief Bump n'est visible
    que sous la lumière), dans une image de TAILLE px; les autres objets sont exclus du rendu pendant la
    cuisson (pas d'ombres portées), puis leur visibilité est rétablie;
  - image enregistrée dans modeles/textures/baked/<objet>.png (fichier externe: le .blend ne grossit pas);
  - chemin noté dans la propriété `baked_texture` de l'objet. export_context.py utilise alors cette image.
Les matériaux de l'objet ne sont pas modifiés. Pour mettre à jour après une retouche de matériau: relancer.
Sauvegarder ensuite le .blend (la propriété `baked_texture` y est stockée).

Usage: dans Blender (Scripting > Run Script); aide: blender -b --python bake_context_in_blender.py -- -h
"""
import os
import sys

import bpy

if "--" in sys.argv and {"-h", "--help"} & set(sys.argv[sys.argv.index("--") + 1:]):
    print(__doc__)
    raise SystemExit(0)

# ---------------------------------------------------------------- PARAMÈTRES
TAILLE = 4096
ECHANTILLONS = 128
# ----------------------------------------------------------------------------

SIMPLE_NODES = {'TEX_IMAGE', 'BSDF_PRINCIPLED', 'OUTPUT_MATERIAL'}


def context_objects():
    terrain = bpy.data.collections.get("terrain")
    objects = {o for o in bpy.data.objects if "filler" in o.name.lower() and o.type == 'MESH'}
    if terrain:
        objects |= {o for o in terrain.all_objects if o.type == 'MESH'}
    # Les objets dessinés d'après les plans (collection « terrain - drawings ») ne sont jamais publiés, même nommés
    # « filler »
    drawings = bpy.data.collections.get("terrain - drawings")
    if drawings:
        objects -= set(drawings.all_objects)
    return sorted(objects, key=lambda o: o.name)


def procedural(material):
    return material and material.node_tree and any(n.type not in SIMPLE_NODES for n in material.node_tree.nodes)


scene = bpy.context.scene
out_dir = bpy.path.abspath("//textures/baked")
os.makedirs(out_dir, exist_ok=True)
saved_engine, saved_samples = scene.render.engine, scene.cycles.samples
saved_selection = [o for o in bpy.context.view_layer.objects if o.select_get()]
saved_hide_render = {o.name: o.hide_render for o in bpy.context.view_layer.objects}
saved_active = bpy.context.view_layer.objects.active
scene.render.engine = 'CYCLES'
scene.cycles.samples = ECHANTILLONS

try:
    for ob in context_objects():
        materials = [s.material for s in ob.material_slots]
        if not any(procedural(m) for m in materials):
            continue
        image = bpy.data.images.new(f"baked-{ob.name}", TAILLE, TAILLE)
        # Nœud image cible ajouté temporairement à chaque matériau de l'objet (actif = cible de la cuisson)
        added = []
        for m in {m for m in materials if m}:
            node = m.node_tree.nodes.new("ShaderNodeTexImage")
            node.image = image
            previous_active = m.node_tree.nodes.active
            m.node_tree.nodes.active = node
            added.append((m, node, previous_active))
        for o in bpy.context.view_layer.objects:
            o.select_set(o is ob)
            # Seuls l'objet et les lumières sont rendus: sinon les autres objets (volumes de coupe, maquettes,
            # zones) projettent leurs ombres dans la texture
            o.hide_render = not (o is ob or o.type == 'LIGHT')
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.bake(type='DIFFUSE', pass_filter={'COLOR', 'DIRECT', 'INDIRECT'}, margin=16)
        for m, node, previous_active in added:
            m.node_tree.nodes.remove(node)
            m.node_tree.nodes.active = previous_active
        path = os.path.join(out_dir, f"{bpy.path.clean_name(ob.name)}.png")
        image.filepath_raw = path
        image.file_format = 'PNG'
        image.save()
        bpy.data.images.remove(image)
        ob["baked_texture"] = bpy.path.relpath(path)
        print(f"[cuisson] {ob.name} -> {ob['baked_texture']}", flush=True)
finally:
    scene.render.engine, scene.cycles.samples = saved_engine, saved_samples
    for o in bpy.context.view_layer.objects:
        if o.name in saved_hide_render:
            o.hide_render = saved_hide_render[o.name]
    for o in bpy.context.view_layer.objects:
        o.select_set(o in saved_selection)
    bpy.context.view_layer.objects.active = saved_active

print("[cuisson] terminé: sauvegarder le .blend", flush=True)
