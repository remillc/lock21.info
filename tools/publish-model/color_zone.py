"""A prepared zone with its texture's colours corrected (TODO #5), ready to tile: the settings of color.json.

The zone's prepared folder (OBJ, texture, relief map, MTL and reports) is mirrored into -o: the large files as hard
links, the texture corrected, in two steps: color_correct.py over the whole texture (color.json's default, or the
zone's own options), then color_patch.py for each of the zone's patches (local corrections). A zone set to false is
left as it is (the folder still mirrored). tile_zone.ps1 calls it before Obj2Tiles; the corrected texture is reused
while the source texture and the zone's settings are unchanged (color-from.json).

Usage:
    python tools/publish-model/color_zone.py -z zone-3 -p O:/publishing/prepared/zone-3 -o O:/temp/zone-3/color
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
p = argparse.ArgumentParser(description=__doc__.split("\n\n")[0], formatter_class=argparse.RawDescriptionHelpFormatter)
p.add_argument("-z", "--zone", required=True, help="the zone's id, e.g. zone-3")
p.add_argument("-p", "--prepared", required=True, help="the prepared zone's folder (OBJ, MTL, texture)")
p.add_argument("-o", "--output", required=True, help="the folder of the corrected zone")
p.add_argument("-c", "--config", default=os.path.join(HERE, "color.json"), help="the settings (default color.json)")
p.add_argument("-f", "--force", action="store_true", help="correct again even if nothing changed")
a = p.parse_args()

config = json.load(open(a.config, encoding="utf-8"))
zone = config.get("zones", {}).get(a.zone, {})
settings = None if zone is False else {**config.get("default", {}), **{k: v for k, v in zone.items() if k != "patches"},
                                       "patches": zone.get("patches", [])}

mtl = open(os.path.join(a.prepared, f"{a.zone}.mtl"), encoding="utf-8").read()
texture = re.search(r"^map_Kd\s+(.+)$", mtl, re.M).group(1).strip()
source = os.path.join(a.prepared, texture)
stamp = {"settings": settings, "source": os.path.abspath(source), "size": os.path.getsize(source),
         "mtime": os.path.getmtime(source)}
stamp_path = os.path.join(a.output, "color-from.json")

os.makedirs(a.output, exist_ok=True)
for name in os.listdir(a.prepared):
    src, dst = os.path.join(a.prepared, name), os.path.join(a.output, name)
    if name == texture or not os.path.isfile(src):
        continue
    if name.endswith((".obj", ".png")):  # large: hard links
        if os.path.exists(dst) and not os.path.samefile(src, dst):
            os.remove(dst)
        if not os.path.exists(dst):
            os.link(src, dst)
    else:
        shutil.copy2(src, dst)

out = os.path.join(a.output, texture)
if not a.force and os.path.exists(out) and os.path.exists(stamp_path) and json.load(open(stamp_path)) == stamp:
    print(f"[colour] {a.zone}: unchanged, {out} kept", flush=True)
    sys.exit(0)
if os.path.exists(out):
    os.remove(out)
if settings is None:
    os.link(source, out)
    print(f"[colour] {a.zone}: off in color.json, the texture as it is", flush=True)
else:
    target = ",".join(str(v) for v in settings["target"])
    subprocess.run([sys.executable, os.path.join(HERE, "color_correct.py"), "-i", source, "-o", out, "-t", target,
                    "-s", str(settings["strength"]), "-a", str(settings["alpha"])], check=True)
    obj = os.path.join(a.prepared, f"{a.zone}.obj")
    for patch in settings["patches"]:
        args = [sys.executable, os.path.join(HERE, "color_patch.py"), "-o", obj, "-i", out, "-O", out,
                "-b=" + ",".join(str(v) for v in patch["box"]), "-r", ",".join(str(v) for v in patch["ratios"]),
                "-F", str(patch.get("feather", 0.4))]
        if patch.get("facing"):
            args += ["-f", ",".join(str(v) for v in patch["facing"])]
        print(f"[colour] {a.zone}: patch, {patch.get('what', '')}", flush=True)
        subprocess.run(args, check=True)
json.dump(stamp, open(stamp_path, "w"), indent=2)
print(f"[colour] {a.zone}: -> {out}", flush=True)
