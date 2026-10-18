"""Inventaire en lecture seule des projets Metashape (.psx).

Lit directement les fichiers XML internes des projets (project.zip, chunk.zip,
frame.zip, model.zip) sans ouvrir Metashape: aucun verrou, aucune écriture
dans les projets.

Usage:
    python -I scan_projects.py <dossier des .psx> <fichier de sortie .json>
"""
import json
import os
import re
import sys
import zipfile

src, out = sys.argv[1], sys.argv[2]


def doc(path, member="doc.xml"):
    with zipfile.ZipFile(path) as z:
        return z.read(member).decode("utf-8")


def props(xml):
    return dict(re.findall(r'<property name="([^"]+)" value="([^"]*)"', xml))


def ply_counts(model_zip):
    with zipfile.ZipFile(model_zip) as z:
        ply = next((n for n in z.namelist() if n.endswith(".ply")), None)
        if not ply:
            return None, None
        with z.open(ply) as f:
            head = f.read(1024).split(b"end_header")[0].decode("latin1")
        textures = [n for n in z.namelist() if n.lower().endswith((".tif", ".tiff", ".jpg", ".png", ".exr"))]
    counts = dict(re.findall(r"element (\w+) (\d+)", head))
    return int(counts.get("face", 0)), textures


projects = []
for name in sorted(os.listdir(src)):
    if not name.lower().endswith(".psx"):
        continue
    files = os.path.join(src, name[:-4] + ".files")
    pxml = doc(os.path.join(files, "project.zip"))
    pp = props(pxml)
    active = re.search(r'active_id="(\d+)"', pxml)
    project = dict(file=os.path.join(src, name), last_saved=pp.get("Info/LastSavedDateTime"),
                   version=pp.get("Info/LastSavedSoftwareVersion"),
                   active_chunk=int(active.group(1)) if active else None, chunks=[])
    for cid, cpath in re.findall(r'<chunk id="(\d+)" path="([^"]+)"', pxml):
        cdir = os.path.join(files, os.path.dirname(cpath))
        try:
            cxml = doc(os.path.join(files, cpath))
        except (OSError, KeyError, zipfile.BadZipFile) as e:
            project["chunks"].append(dict(id=int(cid), error=str(e)))
            continue
        label = re.search(r'<chunk[^>]*label="([^"]*)"', cxml)
        chunk = dict(id=int(cid), label=label.group(1) if label else None,
                     cameras=len(re.findall(r"<camera id=", cxml)), models=[])
        frame_zip = os.path.join(cdir, "0", "frame.zip")
        if os.path.exists(frame_zip):
            fxml = doc(frame_zip)
            chunk["has_depth_maps"] = "<depth_maps" in fxml
            chunk["has_dense_cloud"] = "<dense_cloud" in fxml
            chunk["has_tiled_model"] = "<tiled_model" in fxml
            for mid, mpath in re.findall(r'<model id="(\d+)" path="([^"]+)"', fxml):
                mzip = os.path.join(cdir, "0", mpath)
                mp = props(doc(mzip))
                faces, textures = ply_counts(mzip)
                chunk["models"].append(dict(
                    id=int(mid), path=os.path.relpath(mzip, src), faces=faces, textures=textures,
                    texture_size=int(mp["BuildTexture/texture_size"]) if "BuildTexture/texture_size" in mp else None,
                    pages=int(mp["BuildUV/page_count"]) if "BuildUV/page_count" in mp else None,
                    built=mp.get("Info/OriginalDateTime"), saved=mp.get("Info/LastSavedDateTime")))
        project["chunks"].append(chunk)
    projects.append(project)
    print("lu:", name, flush=True)

os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
with open(out, "w", encoding="utf-8") as f:
    json.dump(projects, f, ensure_ascii=False, indent=2)
