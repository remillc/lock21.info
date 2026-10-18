"""Empreinte de l'état d'une zone dans le .blend: tout ce qui change le résultat publié.

Couvre: transformation de l'objet, mesh de base, propriété `source` (chemin et date du fichier),
modificateurs visibles (réglages, et pour les objets qu'ils utilisent, comme les volumes de coupe
ou un Lattice: transformation et forme). Deux empreintes égales = même résultat de préparation.
"""
import hashlib
import json
import os

import numpy as np

ROUND = 5  # décimales: ignore le bruit des nombres flottants


def _matrix(m):
    return [round(v, ROUND) for row in m for v in row]


def _mesh_digest(ob):
    if ob.type == 'MESH':
        me = ob.data
        co = np.empty(len(me.vertices) * 3)
        me.vertices.foreach_get("co", co)
        return [len(me.vertices), len(me.polygons), hashlib.sha256(np.round(co, ROUND).tobytes()).hexdigest()[:16]]
    if ob.type == 'LATTICE':
        pts = np.array([p.co_deform for p in ob.data.points]).ravel()
        return [ob.data.points_u, ob.data.points_v, ob.data.points_w,
                hashlib.sha256(np.round(pts, ROUND).tobytes()).hexdigest()[:16]]
    return [ob.type]


def _modifier_state(m):
    state = {"name": m.name, "type": m.type}
    for prop in m.bl_rna.properties:
        if prop.identifier in ("name", "type", "rna_type", "is_override_data", "persistent_uid"):
            continue
        value = getattr(m, prop.identifier, None)
        if hasattr(value, "matrix_world"):  # objet utilisé: volume de coupe, lattice...
            state[prop.identifier] = {"object": value.name, "matrix": _matrix(value.matrix_world),
                                      "shape": _mesh_digest(value)}
        elif isinstance(value, (bool, int, float, str)):
            state[prop.identifier] = round(value, ROUND) if isinstance(value, float) else value
        elif value is not None and hasattr(value, "name"):  # collection, etc.
            state[prop.identifier] = value.name
    return state


def zone_state(ob):
    source = ob.get("source", "")
    state = {
        "zone": ob.name,
        "source": source,
        "source_mtime": os.path.getmtime(source) if source and os.path.exists(source) else None,
        "matrix_world": _matrix(ob.matrix_world),
        "mesh": _mesh_digest(ob),
        "modifiers": [_modifier_state(m) for m in ob.modifiers if m.show_viewport],
    }
    baked = ob.get("baked_texture")
    if baked:
        import bpy
        path = bpy.path.abspath(baked)
        state["baked_texture"] = [baked, os.path.getmtime(path) if os.path.exists(path) else None]
    return state


CONTEXT_ID = "context"


def context_objects():
    """Objets du contexte: noms contenant « filler » et collection `terrain`."""
    import bpy
    terrain = bpy.data.collections.get("terrain")
    objects = {o for o in bpy.data.objects if "filler" in o.name.lower() and o.type == 'MESH'}
    if terrain:
        objects |= {o for o in terrain.all_objects if o.type == 'MESH'}
    return sorted(objects, key=lambda o: o.name)


def context_fingerprint(objects):
    states = [zone_state(o) for o in objects]
    digest = hashlib.sha256(json.dumps(states, sort_keys=True).encode()).hexdigest()
    return {"fingerprint": digest, "state": {"objects": states}}


def fingerprint(ob):
    state = zone_state(ob)
    digest = hashlib.sha256(json.dumps(state, sort_keys=True).encode()).hexdigest()
    return {"fingerprint": digest, "state": state}
