"""Sets a dive's common colour correction on its « - graded » project (TODO #75): per-channel gains in linear light,
written as a 33-point LUT (on the timeline's Rec.709 gamma 2.4 values a gain is a slope, gain^(1/2.4)), set on the
timeline's node graph, after the clips' own grades (the scripting API can't add a node to a clip, but sets a LUT on
the timeline's). Optionally exports one frame as a still, to check it (--still, --frame).

The LUT goes to O:\\_davinci-resolve-library\\luts, through Resolve's LUT folder « lock21 » (a junction to it,
README.md). Only on a project whose name ends with « - graded »: the original projects are never changed.

Resolve must be open (External scripting: Local), on the graded project (or --folder and --project).

Example (dive 21, its median gains at 75 %, clip_gains.mjs):
    python tools/color-grading/timeline_lut.py -f data/2024-07-12 -p "zone 3 - lens corrected - graded" \\
        -g 0.732 0.962 2.195 -n "zone-3 dive-21 2024-07-12 (75 %)" -s O:/temp/still.png --frame GX035501:25
"""
import argparse
import os

from resolve_api import LUT_DIR, connect, load

p = argparse.ArgumentParser(prog="timeline_lut.py", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
p.add_argument("-g", "--gain", nargs=3, type=float, required=True, metavar=("R", "G", "B"), help="gains in linear light")
p.add_argument("-n", "--name", required=True, help="the LUT's name (file name without .cube)")
p.add_argument("-f", "--folder", help="project folder from the root, e.g. data/2024-07-12 (with --project)")
p.add_argument("-p", "--project", help="project name (default: the current project)")
p.add_argument("-s", "--still", help="export one frame as a still to this file (.png, .tif)")
p.add_argument("--frame", default=None, help="the still's frame: CLIP:N, the clip's Nth frame (1-based), e.g. GX035501:25")
a = p.parse_args()

slope = [g ** (1 / 2.4) for g in a.gain]
os.makedirs(LUT_DIR, exist_ok=True)
lut = os.path.join(LUT_DIR, f"{a.name}.cube")
size = 33
with open(lut, "w", encoding="ascii") as f:
    f.write(f'TITLE "lock21 {a.name}"\n')
    f.write(f"# TODO #75: gains (linear) {a.gain}, slopes (gamma 2.4) {[round(s, 4) for s in slope]}\n")
    f.write(f"LUT_3D_SIZE {size}\n")
    for b in range(size):
        for g in range(size):
            for r in range(size):
                f.write(" ".join(f"{min(1.0, c / (size - 1) * s):.6f}" for c, s in zip((r, g, b), slope)) + "\n")
print("LUT:", lut, "slopes", [round(s, 3) for s in slope])

resolve = connect()
project = load(resolve, a.folder, a.project) if a.project else resolve.GetProjectManager().GetCurrentProject()
if not project.GetName().endswith(" - graded"):
    raise SystemExit(f"« {project.GetName()} » is not a graded copy (duplicate_projects.py): nothing changed")
project.RefreshLUTList()
resolve.OpenPage("color")
timeline = project.GetCurrentTimeline() or project.GetTimelineByIndex(1)
graph = timeline.GetNodeGraph()
print("timeline grade:", graph.GetNumNodes(), "node(s)")
print("LUT set on the timeline's node 1:", graph.SetLUT(1, lut), graph.GetLUT(1))
graph.SetNodeLabel(1, a.name[:30])

if a.still:
    clip, _, n = (a.frame or "").partition(":")
    items = timeline.GetItemListInTrack("video", 1)
    item = next((i for i in items if i.GetName().startswith(clip)), items[0]) if clip else items[0]
    frame = item.GetStart() + max(int(n or 1), 1) - 1
    fps = round(float(project.GetSetting("timelineFrameRate")))
    h, m, s, fr = (int(x) for x in timeline.GetStartTimecode().replace(";", ":").split(":"))
    total = ((h * 60 + m) * 60 + s) * fps + fr + frame - timeline.GetStartFrame()
    tc = f"{total // (3600 * fps):02d}:{total // (60 * fps) % 60:02d}:{total // fps % 60:02d}:{total % fps:02d}"
    timeline.SetCurrentTimecode(tc)
    print("still at", tc, f"({item.GetName()}):", project.ExportCurrentFrameAsStill(os.path.abspath(a.still)), a.still)
