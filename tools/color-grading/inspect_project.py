"""Reads a Resolve project without changing it (TODO #75): its colour settings, render jobs, timeline clips (source,
retime, lens correction, colour nodes), and, with --luts, each clip's grade exported as a 17-point LUT, the clips
grouped by identical grade, with what each grade does to a mid grey and to the primaries.

Resolve must be open (External scripting: Local). The current project by default, or --folder and --project.
ExportLUT needs the Color page: it is opened (the page shown changes, not the project).

Examples:
    python tools/color-grading/inspect_project.py
    python tools/color-grading/inspect_project.py -f data/2024-07-12 -p "zone 3 - lens corrected" -l O:/temp/luts-0712
"""
import argparse
import hashlib
import json
import os

from resolve_api import connect, load

p = argparse.ArgumentParser(prog="inspect_project.py", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
p.add_argument("-f", "--folder", help="project folder from the root, e.g. data/2024-07-12 (with --project)")
p.add_argument("-p", "--project", help="project name (default: the current project)")
p.add_argument("-l", "--luts", help="folder to export each clip's grade to (.cube) and group the clips by grade")
p.add_argument("-t", "--track", type=int, default=0, help="video track for --luts (default: all)")
a = p.parse_args()

resolve = connect()
project = load(resolve, a.folder, a.project) if a.project else resolve.GetProjectManager().GetCurrentProject()
settings = project.GetSetting() or {}
timeline = project.GetCurrentTimeline() or project.GetTimelineByIndex(1)
out = {
    "project": project.GetName(),
    "colour": {k: settings[k] for k in ("colorScienceMode", "colorSpaceInput", "colorSpaceTimeline", "colorSpaceOutput") if k in settings},
    "timeline": timeline.GetName(),
    "render": project.GetCurrentRenderFormatAndCodec(),
    "render_jobs": [{k: j.get(k) for k in ("TargetDir", "RenderMode", "VideoFormat", "VideoCodec")} for j in project.GetRenderJobList()],
    "clips": [],
}
for track in range(1, timeline.GetTrackCount("video") + 1):
    for item in timeline.GetItemListInTrack("video", track) or []:
        media = item.GetMediaPoolItem()
        graph = item.GetNodeGraph()
        out["clips"].append({
            "track": track,
            "name": item.GetName(),
            "timeline": [item.GetStart(), item.GetEnd()],
            "source": [item.GetSourceStartFrame(), item.GetSourceEndFrame()],
            "file": media.GetClipProperty("File Path") if media else None,
            "lens_correction": item.GetProperty("LensCorrectionEnabled"),
            "nodes": [graph.GetToolsInNode(k) for k in range(1, graph.GetNumNodes() + 1)] if graph else None,
        })
print(json.dumps(out, indent=1, ensure_ascii=False, default=str))


def read_cube(path):
    size, rows = 0, []
    for line in open(path, encoding="utf-8", errors="replace"):
        parts = line.split()
        if not parts or parts[0].startswith("#"):
            continue
        if parts[0] == "LUT_3D_SIZE":
            size = int(parts[1])
        elif len(parts) == 3:
            try:
                rows.append(tuple(float(x) for x in parts))
            except ValueError:
                pass
    return size, rows


def at(size, rows, r, g, b):
    """The LUT's output for an input (red runs fastest in a .cube file)"""
    n = size - 1
    return tuple(round(x, 3) for x in rows[round(r * n) + round(g * n) * size + round(b * n) * size * size])


if a.luts:
    os.makedirs(a.luts, exist_ok=True)
    resolve.OpenPage("color")
    groups = {}
    for track in range(1, timeline.GetTrackCount("video") + 1):
        if a.track and track != a.track:
            continue
        for n, item in enumerate(timeline.GetItemListInTrack("video", track) or [], 1):
            path = os.path.abspath(os.path.join(a.luts, f"t{track}-{n:03d}-{item.GetName()}.cube"))
            if not item.ExportLUT(resolve.EXPORT_LUT_17PTCUBE, path):
                print("export failed:", item.GetName())
                continue
            size, rows = read_cube(path)
            key = hashlib.md5(json.dumps(rows).encode()).hexdigest()[:8]
            group = groups.setdefault(key, {"grey50": at(size, rows, .5, .5, .5), "red": at(size, rows, 1, 0, 0), "green": at(size, rows, 0, 1, 0), "blue": at(size, rows, 0, 0, 1), "clips": []})
            group["clips"].append(f"{track}:{item.GetName()}")
    print(json.dumps(groups, indent=1))
