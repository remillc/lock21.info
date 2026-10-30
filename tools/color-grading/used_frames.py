"""Lists the frames folders used by the published 3D model (TODO #75, the rod's masks): for each published zone, the
Metashape chunk(s) its export was made from, and their frames folders with their photo counts, the folders that no
longer exist flagged. Reads only: O:/publishing/prepared/<zone>/<zone>-prepare.json (key « source », the export
published) and the Metashape projects O:/photogrammetry/zone-N.psx (their zip files, never written).

The chunk of an export: the one whose label is the longest prefix of the export's name (« zone-1 » and « zone 1 »
taken as the same); when several match equally (zone 7), all of them; when none does (zones 11 and 12, whose chunks
were renamed), the chunks that hold a mesh. The relief's detailed exports (zones 1 and 10,
--high) are counted too, from the same project.

Examples:
    python -I tools/color-grading/used_frames.py
    python -I tools/color-grading/used_frames.py -z "zone 12" --json
    python -I tools/color-grading/used_frames.py --exclude zone-3 --exclude 2024-08-18 --json
"""
import argparse
import json
import os
import re
import sys
import xml.etree.ElementTree as ET
import zipfile

# The relief's detailed exports, made from the same project as the source (tools/publish-model/README.md, Relief)
HIGH = {
    "zone 1": r"O:\modeles\zone-1\zone 1 - lens corrected - mesh - 8.6M faces.glb",
    "zone 10": r"O:\modeles\zone-10\zone 10 - lens corrected - mesh - 22.6M faces.glb",
}


def norm(s):
    """A name compared without case, « zone-N » spelled « zone N », spaces collapsed"""
    return re.sub(r"\s+", " ", re.sub(r"zone-(\d)", r"zone \1", s.lower())).strip()


def chunks_of(psx):
    """The chunks of a project: [(id, label, folder of the chunk)]"""
    files = psx[:-4] + ".files"
    with zipfile.ZipFile(os.path.join(files, "project.zip")) as z:
        doc = ET.fromstring(z.read("doc.xml"))
    res = []
    for c in doc.iter("chunk"):
        folder = os.path.join(files, os.path.dirname(c.get("path")))
        with zipfile.ZipFile(os.path.join(files, c.get("path"))) as z:
            label = ET.fromstring(z.read("doc.xml")).get("label", "")
        res.append((c.get("id"), label, folder))
    return res


def folders_of(chunk_folder):
    """The frames folders of a chunk: {folder: photo count}, from each frame's frame.zip (paths relative to it)"""
    with zipfile.ZipFile(os.path.join(chunk_folder, "chunk.zip")) as z:
        doc = ET.fromstring(z.read("doc.xml"))
    counts = {}
    for f in doc.iter("frame"):
        frame_zip = os.path.join(chunk_folder, f.get("path"))
        base = os.path.dirname(frame_zip)
        with zipfile.ZipFile(frame_zip) as z:
            frame = ET.fromstring(z.read("doc.xml"))
        for photo in frame.iter("photo"):
            folder = os.path.normpath(os.path.join(base, os.path.dirname(photo.get("path"))))
            counts[folder] = counts.get(folder, 0) + 1
    return counts


def has_model(chunk_folder):
    """Whether a chunk holds a mesh"""
    with zipfile.ZipFile(os.path.join(chunk_folder, "chunk.zip")) as z:
        return ET.fromstring(z.read("doc.xml")).find(".//models/model") is not None


def matching(chunks, export):
    """The chunks whose label is the longest prefix of the export's name"""
    name = norm(os.path.splitext(os.path.basename(export))[0])
    best = max((len(norm(l)) for _, l, _ in chunks if l and name.startswith(norm(l))), default=0)
    return [c for c in chunks if c[1] and len(norm(c[1])) == best and name.startswith(norm(c[1]))] if best else []


p = argparse.ArgumentParser(prog="used_frames.py", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
p.add_argument("-z", "--zone", action="append", help='only this zone (« zone 12 » or « zone-12 »; repeatable)')
p.add_argument("-x", "--exclude", action="append", default=[], help="leave out the folders whose path contains this (regular expression, / or \\; repeatable)")
p.add_argument("-j", "--json", action="store_true", help="machine output (JSON) instead of text")
p.add_argument("-p", "--prepared", default=r"O:\publishing\prepared", help="the prepared zones (default O:\\publishing\\prepared)")
p.add_argument("--projects", default=r"O:\photogrammetry", help="the Metashape projects (default O:\\photogrammetry)")
a = p.parse_args()

wanted = {norm(z) for z in a.zone} if a.zone else None
excludes = [re.compile(x.replace("\\\\", "/").replace("\\", "/"), re.I) for x in a.exclude]
result = []
for d in sorted(os.listdir(a.prepared), key=lambda s: int(re.sub(r"\D", "", s) or 0)):
    prep = os.path.join(a.prepared, d, d + "-prepare.json")
    if not os.path.isfile(prep):
        continue
    with open(prep, encoding="utf-8") as f:
        info = json.load(f)
    zone = norm(info.get("zone", d))
    if wanted and zone not in wanted:
        continue
    psx = os.path.join(a.projects, zone.replace(" ", "-") + ".psx")
    entry = {"zone": zone, "project": psx, "exports": [], "folders": []}
    if not os.path.isfile(psx):
        entry["error"] = "no project"
        result.append(entry)
        continue
    chunks = chunks_of(psx)
    exports = [info["source"]] + ([HIGH[zone]] if zone in HIGH else [])
    folders = {}
    for export in exports:
        found = matching(chunks, export)
        by = "label"
        if not found:
            found = [c for c in chunks if has_model(c[2])]
            by = "mesh"
        entry["exports"].append({"export": export, "by": by, "chunks": [{"id": i, "label": l} for i, l, _ in found]})
        for _, _, cf in found:
            for folder, n in folders_of(cf).items():
                folders[folder] = max(folders.get(folder, 0), n)
    for folder in sorted(folders):
        if any(x.search(folder.replace("\\", "/")) for x in excludes):
            continue
        entry["folders"].append({"folder": folder, "photos": folders[folder], "exists": os.path.isdir(folder)})
    result.append(entry)

if a.json:
    json.dump(result, sys.stdout, indent=2, ensure_ascii=False)
    print()
else:
    for e in result:
        print(e["zone"], "-", e.get("error", os.path.basename(e["project"])))
        for x in e["exports"]:
            labels = ", ".join(f'« {c["label"]} » ({c["id"]})' for c in x["chunks"]) or "NO CHUNK FOUND"
            print(f'  {os.path.basename(x["export"])}: {labels}{"  (no label matches: the chunks with a mesh)" if x["by"] == "mesh" else ""}')
        for f in e["folders"]:
            print(f'    {f["photos"]:6d}  {f["folder"]}{"" if f["exists"] else "  (MISSING)"}')
