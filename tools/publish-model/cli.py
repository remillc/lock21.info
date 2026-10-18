"""Arguments en ligne de commande communs aux scripts de la chaîne (convention: -h/--help, options courte + longue).

Les scripts lancés par Blender reçoivent leurs arguments après `--`:
    blender -b <fichier.blend> --python script.py -- <arguments>
Les scripts Python ordinaires les reçoivent directement.
"""
import argparse
import sys


def script_args():
    """Arguments du script: après `--` s'il est présent (Blender), sinon tous les arguments."""
    return sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]


def parser(prog, doc):
    """ArgumentParser avec -h/--help, la docstring du script comme description, mise en forme conservée."""
    return argparse.ArgumentParser(prog=prog, description=doc, formatter_class=argparse.RawDescriptionHelpFormatter)
