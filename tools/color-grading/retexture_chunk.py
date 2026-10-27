"""Refait la texture d'un chunk Metashape avec les images étalonnées (TODO #75), dans Metashape Pro 1.7.

À lancer dans Metashape, sur le projet ouvert: Tools > Run Script, ce fichier, et ses arguments dans « Arguments ».
Le chunk doit être une copie (Duplicate Chunk) dont le nom contient « graded »: le chunk d'origine n'est jamais touché.

1. Chemins: chaque photo d'un dossier d'origine pointe vers le dossier étalonné, sous le même nom (`-m ancien=nouveau`,
   par défaut les trois dossiers de la zone 3). Tout est vérifié avant: si un fichier manque, rien n'est changé.
2. Texture: refaite sur le modèle actif du chunk, avec ses coordonnées de texture (pas de nouveau dépliage),
   mosaïque, `-s` px. Le projet est enregistré.
3. Export: le modèle texturé en .glb (`-o`).

Usage (Arguments):
    [-c "zone 3 - graded - FINAL"] [-m <ancien dossier>=<nouveau dossier> ...] [-s 16384] [-o <sortie.glb>]
    [--check] (vérifie les chemins seulement) [--no-texture] [--no-export]
"""
import argparse
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
p.add_argument("-s", "--size", type=int, default=16384, help="taille de la texture, px (défaut 16384)")
p.add_argument("-o", "--out", default="O:/modeles/zone-3/zone-3 - graded - mesh 24M faces.glb",
               help="modèle texturé à écrire (.glb)")
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

# 2. Texture, sur les coordonnées existantes
if not a.no_texture:
    log("texture: %d px, mosaïque" % a.size)
    chunk.buildTexture(blending_mode=Metashape.MosaicBlending, texture_size=a.size, fill_holes=True,
                       ghosting_filter=True)
    doc.save()
    log("texture refaite et projet enregistré")

# 3. Export
if not a.no_export:
    if os.path.exists(a.out):
        raise SystemExit("existe déjà, rien n'est écrasé: " + a.out)
    chunk.exportModel(path=a.out, binary=True, texture_format=Metashape.ImageFormatJPEG, save_texture=True,
                      save_uv=True, save_normals=True, save_colors=False, save_cameras=False, save_markers=False)
    log("exporté: " + a.out)
