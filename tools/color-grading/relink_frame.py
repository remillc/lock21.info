"""Écrit les chemins des images étalonnées dans un chunk « graded » d'un projet Metashape, Metashape fermé (TODO #75).

Un chemin changé par script dans Metashape (retexture_chunk.py) sert tant que Metashape reste ouvert, mais n'est pas
enregistré: Metashape n'écrit que ce qu'il sait modifié. Ce script change les chemins dans le fichier du chunk
(`<projet>.files/<chunk>/0/frame.zip`, XML): chaque photo d'un dossier d'origine pointe vers le dossier étalonné,
sous le même nom, avec la taille et la date du nouveau fichier. Avant: le projet doit être fermé (pas de fichier
`lock`), le chunk doit être une copie « graded », chaque nouvelle image doit exister; le fichier d'origine est
gardé à côté (`frame.zip.<date>.bak`). Seul ce chunk est touché.

Usage:
    python -I relink_frame.py <projet.psx> <id du chunk> [-m <ancien dossier>=<nouveau dossier> ...] [-n]
Exemple:
    python -I relink_frame.py O:/photogrammetry/zone-3.psx 14 -n
"""
import argparse
import datetime
import os
import re
import shutil
import sys
import zipfile

ZONE_3 = [
    "O:/data/2024-07-07/zone-3/frames-lens-corrected-n10=O:/data/2024-07-07/zone-3/frames-lens-corrected-graded-n10",
    "O:/data/2024-07-05/zone-3/frames-lens-corrected-nx=O:/data/2024-07-05/zone-3/frames-lens-corrected-graded-nx",
    "O:/data/2024-07-12/zone-3/frames-lens-corrected-n10=O:/data/2024-07-12/zone-3/frames-lens-corrected-graded-n10",
]

p = argparse.ArgumentParser(prog="relink_frame.py", description=__doc__,
                            formatter_class=argparse.RawDescriptionHelpFormatter)
p.add_argument("project", help="projet Metashape (.psx)")
p.add_argument("chunk", help="id du chunk (dossier dans <projet>.files), ex. 14")
p.add_argument("-m", "--map", action="append", help="ancien dossier=nouveau dossier (répétable; défaut: zone 3)")
p.add_argument("-n", "--dry-run", action="store_true", help="compter et vérifier sans rien écrire")
a = p.parse_args()


def norm(path):
    return os.path.normcase(os.path.normpath(path)).replace(chr(92), "/")


files = os.path.splitext(a.project)[0] + ".files"
chunk_dir = os.path.join(files, a.chunk)
frame = os.path.join(chunk_dir, "0", "frame.zip")
if os.path.exists(os.path.join(files, "lock")):
    sys.exit("le projet est ouvert dans Metashape (%s): le fermer d'abord" % os.path.join(files, "lock"))
with zipfile.ZipFile(os.path.join(chunk_dir, "chunk.zip")) as z:
    label = re.search(r'<chunk[^>]*label="([^"]*)"', z.read("doc.xml").decode("utf-8")).group(1)
if "graded" not in label:
    sys.exit("le chunk %s (« %s ») n'est pas une copie « graded »: rien n'est fait" % (a.chunk, label))
print("chunk %s: %s" % (a.chunk, label))

pairs = [(norm(old), new.replace(chr(92), "/").rstrip("/")) for old, new in (m.split("=", 1) for m in (a.map or ZONE_3))]
base = os.path.dirname(frame)
with zipfile.ZipFile(frame) as z:
    xml = z.read("doc.xml").decode("utf-8")
counts = dict(changed=0, done=0, kept=0)
missing = []


def relink(m):
    """Un <photo path="…">…</photo>: le chemin vers le dossier étalonné, la taille et la date du nouveau fichier."""
    block, path = m.group(0), m.group(1)
    folder, name = os.path.split(os.path.normpath(os.path.join(base, path)))
    for old, new in pairs:
        if norm(folder) == norm(new):
            counts["done"] += 1
            return block
        if norm(folder) == old:
            target = new + "/" + name
            if not os.path.isfile(target):
                missing.append(target)
                return block
            counts["changed"] += 1
            rel = os.path.relpath(target, base).replace(chr(92), "/")
            stat = os.stat(target)
            date = datetime.datetime.fromtimestamp(stat.st_mtime).strftime("%Y:%m:%d %H:%M:%S")
            block = block.replace('path="%s"' % path, 'path="%s"' % rel, 1)
            block = re.sub(r'(name="System/FileSize" value=")[^"]*', r"\g<1>%d" % stat.st_size, block)
            return re.sub(r'(name="System/FileModifyDate" value=")[^"]*', r"\g<1>%s" % date, block)
    counts["kept"] += 1
    return block


out = re.sub(r'<photo path="([^"]+)">.*?</photo>', relink, xml, flags=re.S)
print("à changer: %(changed)d, déjà changées: %(done)d, autres dossiers (gardés): %(kept)d" % counts
      + ", fichiers manquants: %d" % len(missing))
for target in missing[:10]:
    print("manquant: " + target)
if missing:
    sys.exit("des images étalonnées manquent: rien n'est écrit")
if a.dry_run or not counts["changed"]:
    sys.exit(0)
backup = frame + "." + datetime.datetime.now().strftime("%Y-%m-%d-%H%M") + ".bak"
shutil.copy2(frame, backup)
tmp = frame + ".tmp"
with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("doc.xml", out.encode("utf-8"))
os.replace(tmp, frame)
print("écrit: %s (sauvegarde: %s)" % (frame, os.path.basename(backup)))
