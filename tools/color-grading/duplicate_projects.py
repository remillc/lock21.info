"""Duplicates a zone's Resolve projects before they are graded again (TODO #75, Christian 2026-10-27): each project of
the zone, in each dive's folder (data/<date>), exported to a .drp (its backup, in --backups) and imported again in
the same folder as « <name> - graded », the copy the corrections go into. The originals are not changed; a copy
already there is left alone.

Resolve must be open (External scripting: Local).

Examples:
    python tools/color-grading/duplicate_projects.py -z 3 -n
    python tools/color-grading/duplicate_projects.py -z 3 -d 2024-07-05 2024-07-07 2024-07-12 2024-07-14
"""
import argparse
import datetime
import os

from resolve_api import connect, open_folder

p = argparse.ArgumentParser(prog="duplicate_projects.py", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
p.add_argument("-z", "--zone", required=True, help="zone number: projects whose name contains « zone N »")
p.add_argument("-d", "--dates", nargs="+", help="dive folders under data/ (default: all)")
p.add_argument("-b", "--backups", default=r"O:\_davinci-resolve-library\backups", help="folder for the .drp backups")
p.add_argument("-n", "--dry-run", action="store_true", help="only say what would be done")
a = p.parse_args()

manager = connect().GetProjectManager()
if not a.dry_run:
    os.makedirs(a.backups, exist_ok=True)
open_folder(manager, "data")
dates = a.dates or manager.GetFolderListInCurrentFolder()
today = datetime.date.today().isoformat()
for date in dates:
    if not open_folder(manager, f"data/{date}"):
        print(date, ": no folder")
        continue
    names = manager.GetProjectListInCurrentFolder()
    for name in names:
        words = name.split(" - ")[0].split()
        if words[:2] != ["zone", str(a.zone)] or name.endswith(" - graded"):
            continue
        graded = f"{name} - graded"
        if graded in names:
            print(f"{date}: « {graded} » already there")
            continue
        drp = os.path.join(a.backups, f"{date} {name} ({today}).drp")
        if a.dry_run:
            print(f"{date}: would export « {name} » to {drp}, then import it as « {graded} »")
            continue
        ok = manager.ExportProject(name, drp, False)
        print(f"{date}: « {name} » exported to {drp}: {ok}")
        if ok:
            print(f"{date}: imported as « {graded} »: {manager.ImportProject(drp, graded)}")
manager.GotoRootFolder()
