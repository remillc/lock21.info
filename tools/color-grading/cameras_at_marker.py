"""Les photos qui voient un point du modèle, et à quelle distance (TODO #75), dans Metashape Pro 1.7.

Pour savoir si une surface a été filmée de près (au rig, à environ 70 cm) ou seulement de loin, à travers l'eau, sans
revoir les vidéos: poser un marqueur sur la surface (clic droit sur le modèle > Add Marker), puis Tools > Run Script,
ce fichier. Pour chaque photo alignée du chunk actif: le marqueur est-il dans l'image, et le modèle ne le cache-t-il
pas (le rayon de la caméra au marqueur touche le modèle à moins de --tolerance du marqueur); sa distance en mètres.
Affiche le nombre de photos par tranche de distance et les plus proches. Ne change rien au projet.

Usage (Arguments):
    [-m <nom du marqueur>] (défaut: le dernier ajouté) [-n 25] (photos listées) [-t 0.05] (m)
"""
import argparse
import sys

import Metashape

p = argparse.ArgumentParser(prog="cameras_at_marker.py", description=__doc__,
                            formatter_class=argparse.RawDescriptionHelpFormatter)
p.add_argument("-m", "--marker", help="nom du marqueur (défaut: le dernier ajouté)")
p.add_argument("-n", "--count", type=int, default=25, help="photos les plus proches à lister (défaut 25)")
p.add_argument("-t", "--tolerance", type=float, default=0.05, help="écart toléré au marqueur, m (défaut 0,05)")


class Stop(Exception):
    """Arrêt avec un message. Pas de SystemExit: dans Metashape, il ferme l'application."""


def log(msg):
    print("[marker] " + msg, flush=True)


def main():
    try:
        a = p.parse_args(sys.argv[1:])
    except SystemExit:
        return
    chunk = Metashape.app.document.chunk
    if not chunk.markers:
        raise Stop("aucun marqueur dans le chunk actif: en poser un sur la surface (clic droit sur le modèle > Add Marker)")
    markers = [m for m in chunk.markers if m.label == a.marker] if a.marker else chunk.markers[-1:]
    if not markers or markers[0].position is None:
        raise Stop("marqueur introuvable ou sans position: " + str(a.marker))
    marker = markers[0]
    scale = chunk.transform.scale or 1.0
    model = chunk.model
    point = marker.position
    seen = []
    for camera in chunk.cameras:
        if camera.transform is None or camera.sensor is None:
            continue
        pixel = camera.project(point)
        if pixel is None or not (0 <= pixel.x < camera.sensor.width and 0 <= pixel.y < camera.sensor.height):
            continue
        # (dans le dos de la caméra: project donne aussi un pixel; la direction de vue le dit)
        if (camera.transform.inv().mulp(point)).z <= 0:
            continue
        if model is not None:
            hit = model.pickPoint(camera.center, point)
            if hit is not None and (hit - point).norm() * scale > a.tolerance:
                continue
        seen.append(((camera.center - point).norm() * scale, camera.label))
    seen.sort()
    log("marqueur %s: vu sans obstacle par %d photos" % (marker.label, len(seen)))
    bounds = [0.5, 1, 1.5, 2, 3, 5, 1e9]
    low = 0
    for high in bounds:
        count = sum(1 for d, _ in seen if low <= d < high)
        log("  %s m: %d" % ("%.1f à %.1f" % (low, high) if high < 1e9 else "plus de %.1f" % low, count))
        low = high
    for d, label in seen[:a.count]:
        log("  %.2f m  %s" % (d, label))


try:
    main()
except Stop as e:
    log("arrêt: %s" % e)
