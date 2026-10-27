"""Refait la texture d'un chunk Metashape avec les images étalonnées (TODO #75), dans Metashape Pro 1.7.

À lancer dans Metashape, sur le projet ouvert: Tools > Run Script, ce fichier, et ses arguments dans « Arguments ».
Le chunk doit être une copie (Duplicate Chunk) dont le nom contient « graded »: le chunk d'origine n'est jamais touché.

1. Chemins: chaque photo d'un dossier d'origine pointe vers le dossier étalonné, sous le même nom (`-m ancien=nouveau`,
   par défaut les trois dossiers de la zone 3). Tout est vérifié avant: si un fichier manque, rien n'est changé.
2. Texture: refaite sur le modèle actif du chunk, avec ses coordonnées de texture (pas de nouveau dépliage),
   mosaïque. Sa taille suit la taille réelle de la structure: la surface du modèle (en m², échelle du chunk) et
   la part de la texture que couvrent ses coordonnées donnent le côté qui fait un texel de la taille cible, celle du
   pixel d'écran à la distance de visionnement de tools/model-analysis/thresholds.json (2 m: 1,73 mm; README de
   tools/publish-model, « Résolution des textures »), arrondi au multiple de 16 px supérieur. `-s` impose un côté.
   Le projet est enregistré.
3. Export: le modèle texturé en .glb (`-o`).

Usage (Arguments):
    [-c "zone 3 - graded"] [-s <px>] [-m <ancien dossier>=<nouveau dossier> ...] [-o <sortie.glb>]
    [--check] (vérifie les chemins seulement) [--no-texture] [--no-export]
"""
import argparse
import json
import math
import os
import sys

import Metashape

ZONE_3 = [
    "O:/data/2024-07-07/zone-3/frames-lens-corrected-n10=O:/data/2024-07-07/zone-3/frames-lens-corrected-graded-n10",
    "O:/data/2024-07-05/zone-3/frames-lens-corrected-nx=O:/data/2024-07-05/zone-3/frames-lens-corrected-graded-nx",
    "O:/data/2024-07-12/zone-3/frames-lens-corrected-n10=O:/data/2024-07-12/zone-3/frames-lens-corrected-graded-n10",
]

p = argparse.ArgumentParser(prog="retexture_chunk.py", description=__doc__,
                            formatter_class=argparse.RawDescriptionHelpFormatter)
p.add_argument("-c", "--chunk", help="nom du chunk (défaut: le chunk actif); doit contenir « graded »")
p.add_argument("-m", "--map", action="append", help="ancien dossier=nouveau dossier (répétable; défaut: zone 3)")
p.add_argument("-s", "--size", type=int, help="côté de la texture, px (défaut: calculé pour le texel cible)")
p.add_argument("-o", "--out", help="modèle texturé à écrire (.glb; défaut: O:/modeles/<zone>/<zone> - graded - <faces>M faces.glb)")
p.add_argument("--check", action="store_true", help="vérifier les chemins sans rien changer")
p.add_argument("--no-texture", action="store_true", help="ne pas refaire la texture")
p.add_argument("--no-export", action="store_true", help="ne pas exporter")
a = p.parse_args(sys.argv[1:])


def norm(path):
    return os.path.normcase(os.path.normpath(path)).replace(chr(92), "/")


def log(msg):
    print("[retexture] " + msg, flush=True)


doc = Metashape.app.document
if a.chunk:
    chunks = [c for c in doc.chunks if c.label == a.chunk]
    if len(chunks) != 1:
        raise SystemExit("chunk introuvable ou ambigu: " + a.chunk)
    chunk = chunks[0]
else:
    chunk = doc.chunk
if "graded" not in chunk.label:
    raise SystemExit("le chunk « %s » n'est pas une copie « graded »: rien n'est fait" % chunk.label)
if chunk.model is None:
    raise SystemExit("le chunk n'a pas de modèle actif")
log("chunk: %s, modèle: %s, %d caméras" % (chunk.label, chunk.model.label, len(chunk.cameras)))

pairs = [(norm(old), new.replace(chr(92), "/").rstrip("/")) for old, new in (m.split("=", 1) for m in (a.map or ZONE_3))]

# 1. Chemins: tout vérifier, puis tout changer
changes, missing, kept, done = [], [], 0, 0
for camera in chunk.cameras:
    if camera.photo is None:
        continue
    folder, name = os.path.split(camera.photo.path)
    folder = norm(folder)
    for old, new in pairs:
        if folder == norm(new):
            done += 1
            break
        if folder == old:
            target = new + "/" + name
            (changes if os.path.isfile(target) else missing).append((camera, target))
            break
    else:
        kept += 1
log("à changer: %d, déjà changées: %d, autres dossiers (gardés): %d, fichiers manquants: %d"
    % (len(changes), done, kept, len(missing)))
for camera, target in missing[:10]:
    log("manquant: " + target)
if missing:
    raise SystemExit("des images étalonnées manquent: rien n'est changé")
if a.check:
    raise SystemExit(0)
for camera, target in changes:
    camera.photo.path = target
if changes:
    doc.save()
    log("chemins changés et projet enregistré")



def target_texel_m():
    """Le pixel d'écran à la distance de visionnement la plus proche (thresholds.json), en m."""
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "model-analysis", "thresholds.json")
    with open(path, encoding="utf-8") as f:
        v = json.load(f)["viewing"]
    return 2 * v["min_view_distance_m"] * math.tan(math.radians(v["vertical_fov_deg"] / 2)) / v["screen_height_px"]


def texture_side(model, scale, texel, sample=50):
    """Le côté de texture qui donne `texel` m par texel: la surface réelle et la surface des coordonnées de texture,
    mesurées sur une face sur `sample`."""
    verts, tex = model.vertices, model.tex_vertices
    area3, area_uv, faces = 0.0, 0.0, model.faces
    for i in range(0, len(faces), sample):
        face = faces[i]
        a, b, c = (verts[k].coord for k in face.vertices)
        area3 += (b - a).cross(c - a).norm() / 2
        u, v, w = (tex[k].coord for k in face.tex_vertices)
        area_uv += abs((v.x - u.x) * (w.y - u.y) - (w.x - u.x) * (v.y - u.y)) / 2
    if area_uv <= 0:
        raise SystemExit("le modèle n'a pas de coordonnées de texture")
    area_m2 = area3 * scale * scale
    side = math.sqrt(area_m2 / area_uv) / texel
    # (une face sur `sample`: les deux sommes sont à multiplier par `sample`, leur rapport reste le même)
    log("surface %.0f m², coordonnées de texture sur %.0f %% de la texture" % (area_m2 * sample, 100 * area_uv * sample))
    return int(math.ceil(side / 16) * 16)


# 2. Texture, sur les coordonnées existantes
if not a.no_texture:
    if not a.size:
        scale = chunk.transform.scale
        if not scale:
            raise SystemExit("le chunk n'a pas d'échelle: donner -s")
        texel = target_texel_m()
        a.size = texture_side(chunk.model, scale, texel)
        log("texel cible %.2f mm: %d px de côté" % (texel * 1000, a.size))
    log("texture: %d px, mosaïque" % a.size)
    chunk.buildTexture(blending_mode=Metashape.MosaicBlending, texture_size=a.size, fill_holes=True,
                       ghosting_filter=True)
    doc.save()
    log("texture refaite et projet enregistré")

# 3. Export
if not a.no_export:
    if not a.out:
        zone = "zone-" + chunk.label.split()[1]
        a.out = "O:/modeles/%s/%s - graded - %.1fM faces.glb" % (zone, zone, len(chunk.model.faces) / 1e6)
    if os.path.exists(a.out):
        raise SystemExit("existe déjà, rien n'est écrasé: " + a.out)
    chunk.exportModel(path=a.out, binary=True, texture_format=Metashape.ImageFormatJPEG, save_texture=True,
                      save_uv=True, save_normals=True, save_colors=False, save_cameras=False, save_markers=False)
    log("exporté: " + a.out)
