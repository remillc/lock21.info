"""DaVinci Resolve's scripting API, for the colour grading tools (TODO #75): the connection to the open Resolve
(Studio, Preferences > System > General > External scripting using: Local), and opening a project by its folder."""
import os
import sys

SCRIPTING = r"C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\Developer\Scripting"
os.environ.setdefault("RESOLVE_SCRIPT_API", SCRIPTING)
os.environ.setdefault("RESOLVE_SCRIPT_LIB", r"C:\Program Files\Blackmagic Design\DaVinci Resolve\fusionscript.dll")
sys.path.append(os.path.join(SCRIPTING, "Modules"))

# Resolve's LUT folder for the project's LUTs: a junction to O:\_davinci-resolve-library\luts (README.md), so that
# Resolve finds them (SetLUT takes only LUTs it has listed) while the files live with the Resolve projects on O:
LUT_DIR = r"C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\LUT\lock21"
LUT_STORE = r"O:\_davinci-resolve-library\luts"


def connect():
    """The running Resolve; exits with a message if it can't be reached"""
    import DaVinciResolveScript as dvr  # noqa: E402

    resolve = dvr.scriptapp("Resolve")
    if not resolve:
        sys.exit("Resolve not reachable: is it open, with External scripting set to Local?")
    return resolve


def open_folder(manager, path):
    """Opens a project folder from the root, e.g. "data/2024-07-12"; False if one of them is missing"""
    manager.GotoRootFolder()
    return all(manager.OpenFolder(part) for part in path.split("/") if part)


def load(resolve, folder, name):
    """Loads a project (and returns it) from its folder, e.g. load(resolve, "data/2024-07-12", "zone 3 - graded")"""
    manager = resolve.GetProjectManager()
    if not open_folder(manager, folder):
        sys.exit(f"No project folder {folder}")
    project = manager.LoadProject(name)
    if not project:
        sys.exit(f"No project « {name} » in {folder}")
    return project
