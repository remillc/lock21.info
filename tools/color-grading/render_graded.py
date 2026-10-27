"""Renders a « - graded » project's frames (TODO #75) as its original was rendered: one TIFF RGB 8-bit sequence per
clip (individual clips, frames numbered from 1), the timeline's whole length, 4000 x 3000, no audio; into a new folder
(--target), so that the frames rendered before stay. The job is added to the project's render queue and started;
--wait follows it until it ends (else Resolve renders on, and its Deliver page shows the progress).

Only on a project whose name ends with « - graded ». Resolve must be open (External scripting: Local).

Example:
    python tools/color-grading/render_graded.py -t O:/data/2024-07-12/zone-3/frames-lens-corrected-graded-n10 --wait
"""
import argparse
import os
import time

from resolve_api import connect, load

p = argparse.ArgumentParser(prog="render_graded.py", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
p.add_argument("-t", "--target", required=True, help="the folder for the frames (created; must be empty)")
p.add_argument("-f", "--folder", help="project folder from the root, e.g. data/2024-07-12 (with --project)")
p.add_argument("-p", "--project", help="project name (default: the current project)")
p.add_argument("-w", "--wait", action="store_true", help="follow the render until it ends")
a = p.parse_args()

resolve = connect()
project = load(resolve, a.folder, a.project) if a.project else resolve.GetProjectManager().GetCurrentProject()
if not project.GetName().endswith(" - graded"):
    raise SystemExit(f"« {project.GetName()} » is not a graded copy (duplicate_projects.py): nothing rendered")
target = os.path.abspath(a.target)
if os.path.isdir(target) and os.listdir(target):
    raise SystemExit(f"{target} is not empty: nothing rendered (the frames there would be replaced)")
os.makedirs(target, exist_ok=True)

resolve.OpenPage("deliver")
print("format:", project.SetCurrentRenderFormatAndCodec("tif", "RGB8"), project.GetCurrentRenderFormatAndCodec())
print("individual clips:", project.SetCurrentRenderMode(0), project.GetCurrentRenderMode())
print("settings:", project.SetRenderSettings({
    "SelectAllFrames": True,
    "TargetDir": target,
    "ExportVideo": True,
    "ExportAudio": False,
    "FormatWidth": 4000,
    "FormatHeight": 3000,
    "ClipStartFrame": 1,
    "UseUniqueFilenames": False,
}))
job = project.AddRenderJob()
print("job:", job, [j for j in project.GetRenderJobList() if j["JobId"] == job])
print("started:", project.StartRendering([job]))
while a.wait and project.IsRenderingInProgress():
    status = project.GetRenderJobStatus(job)
    print(time.strftime("%H:%M:%S"), status, flush=True)
    time.sleep(60)
print("status:", project.GetRenderJobStatus(job))
