"""Refait la texture d'un chunk Metashape avec les images étalonnées (TODO #75), dans Metashape Pro 1.7 ou 2.x.

À lancer dans Metashape, sur le projet ouvert: Tools > Run Script, ce fichier, et ses arguments dans « Arguments ».
Le chunk doit être une copie (Duplicate Chunk) dont le nom contient « graded »: le chunk d'origine n'est jamais touché.

1. Chemins: chaque photo d'un dossier d'origine pointe vers le dossier étalonné, sous le même nom (`-m ancien=nouveau`,
   par défaut les trois dossiers de la zone 3). Tout est vérifié avant: si un fichier manque, rien n'est changé.
   Avec `-k`, les masques de chaque plongée (`<plongée>/<zone>/_masks/<image>_guide.png`, à côté du dossier
   étalonné; make_masks.mjs) importés sur ses seules photos, en remplacement; une photo sans masque garde le sien.
2. Texture: refaite sur le modèle actif du chunk, avec ses coordonnées de texture (pas de nouveau dépliage),
   mosaïque. Sa taille suit la taille réelle de la structure: la surface du modèle (en m², échelle du chunk) et
   la part de la texture que couvrent ses coordonnées donnent le côté qui fait un texel de la taille cible, celle du
   pixel d'écran à la distance de visionnement de tools/model-analysis/thresholds.json (2 m: 1,73 mm; README de
   tools/publish-model, « Résolution des textures »), arrondi au multiple de 16 px supérieur. `-s` impose un côté.
   Avec `-d`, seules les photos prises assez près servent à la texture: pour chaque photo, la distance médiane aux
   points de liaison de l'alignement qu'elle voit; une photo plus loin que `-d` m, ou qui ne voit pas le modèle,
   est laissée de côté (zone 3, 2026-10-27: le plancher de bois verdi par des vues lointaines à travers l'eau, alors
   que des vues au rig, à 70 cm, le couvrent). `--check` montre la répartition des distances, sans rien changer.
   Le projet est enregistré.
3. Export: le modèle texturé en .glb (`-o`), mis en pieds comme tous les modèles du projet (glb_to_feet.py; `--metres` le
   laisse en mètres, l'unité de l'échelle du chunk).

Usage (Arguments):
    [-c "zone 3 - graded"] [-s <px>] [-m <ancien dossier>=<nouveau dossier> ...] [-o <sortie.glb>]
    [-k] (importe les masques) [-d <m>] (distance maximale des photos de la texture) [--check] (vérifie les chemins seulement) [--no-texture] [--no-export]
"""
import argparse
import json
import math
import os
import sys

import Metashape

ZONE_3 = [
    "O:/data/2024-07-07/zone-3/frames-lens-corrected-n10=O:/data/2024-07-07/zone-3/frames-lens-corrected-graded-n10",
    "O:/data/2024-07-05/zone-3/frames-lens-corrected-nx=O:/data/2024-07-05/zone-3/frames-lens-corrected-graded-nx",
    "O:/data/2024-07-12/zone-3/frames-lens-corrected-n10=O:/data/2024-07-12/zone-3/frames-lens-corrected-graded-n10",
]

p = argparse.ArgumentParser(prog="retexture_chunk.py", description=__doc__,
                            formatter_class=argparse.RawDescriptionHelpFormatter)
p.add_argument("-c", "--chunk", help="nom du chunk (défaut: le chunk actif); doit contenir « graded »")
p.add_argument("-m", "--map", action="append", help="ancien dossier=nouveau dossier (répétable; défaut: zone 3)")
p.add_argument("-s", "--size", type=int, help="côté de la texture, px (défaut: calculé pour le texel cible)")
p.add_argument("-o", "--out", help="modèle texturé à écrire (.glb; défaut: O:/modeles/<zone>/<nom du chunk> (<faces>M faces).glb)")
p.add_argument("--check", action="store_true", help="vérifier les chemins sans rien changer")
p.add_argument("--no-texture", action="store_true", help="ne pas refaire la texture")
p.add_argument("-k", "--masks", action="store_true", help="importer les masques _masks de chaque plongée")
p.add_argument("-d", "--max-distance", type=float, help="photos de la texture: à au plus tant de m du modèle (médiane)")
p.add_argument("--no-export", action="store_true", help="ne pas exporter")
p.add_argument("--metres", action="store_true", help="garder l'export en mètres (défaut: mis en pieds, comme les modèles)")


class Stop(Exception):
    """Arrêt du script avec un message. Pas de SystemExit: dans Metashape, il ferme l'application."""


def const(group, name):
    """Une constante de l'API: Metashape.<name> en 1.7, Metashape.<group>.<name> en 2.x (rangées par groupe)."""
    value = getattr(Metashape, name, None)
    return value if value is not None else getattr(getattr(Metashape, group), name)


def norm(path):
    return os.path.normcase(os.path.normpath(path)).replace(chr(92), "/")


def log(msg):
    print("[retexture] " + msg, flush=True)


def target_texel_m():
    """Le pixel d'écran à la distance de visionnement la plus proche (thresholds.json), en m."""
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "model-analysis", "thresholds.json")
    with open(path, encoding="utf-8") as f:
        v = json.load(f)["viewing"]
    return 2 * v["min_view_distance_m"] * math.tan(math.radians(v["vertical_fov_deg"] / 2)) / v["screen_height_px"]


def texture_side(model, scale, texel, sample=50):
    """Le côté de texture qui donne `texel` m par texel: la surface réelle et la surface des coordonnées de texture,
    mesurées sur une face sur `sample`."""
    verts, tex = model.vertices, model.tex_vertices
    area3, area_uv, faces = 0.0, 0.0, model.faces
    for i in range(0, len(faces), sample):
        face = faces[i]
        a, b, c = (verts[k].coord for k in face.vertices)
        area3 += Metashape.Vector.cross(b - a, c - a).norm() / 2
        u, v, w = (tex[k].coord for k in face.tex_vertices)
        area_uv += abs((v.x - u.x) * (w.y - u.y) - (w.x - u.x) * (v.y - u.y)) / 2
    if area_uv <= 0:
        raise Stop("le modèle n'a pas de coordonnées de texture")
    area_m2 = area3 * scale * scale
    side = math.sqrt(area_m2 / area_uv) / texel
    # (une face sur `sample`: les deux sommes sont à multiplier par `sample`, leur rapport reste le même)
    log("surface %.0f m², coordonnées de texture sur %.0f %% de la texture" % (area_m2 * sample, 100 * area_uv * sample))
    return int(math.ceil(side / 16) * 16)


def camera_distances(chunk, scale, sample=60):
    """Pour chaque photo alignée: la médiane des distances aux points de liaison qu'elle voit (m), sur au plus
    `sample` d'entre eux, ou None si elle n'en voit aucun. Les points de liaison de l'alignement (tie points) donnent
    la distance au sujet sans lancer de rayon sur le modèle (pickPoint: des heures pour 30 000 photos)."""
    # (le nuage épars: chunk.point_cloud en 1.7, chunk.tie_points en 2.x)
    cloud = getattr(chunk, "tie_points", None) or chunk.point_cloud
    where = {point.track_id: point.coord for point in cloud.points if point.valid}
    out = {}
    cameras = [c for c in chunk.cameras if c.transform is not None and c.sensor is not None]
    for camera in cameras:
        projections = cloud.projections[camera] or []
        step = max(1, len(projections) // sample)
        center = camera.center
        dists = []
        for k in range(0, len(projections), step):
            coord = where.get(projections[k].track_id)
            if coord is not None:
                c3 = Metashape.Vector([coord.x, coord.y, coord.z])
                dists.append((c3 - center).norm() * scale)
        dists.sort()
        out[camera] = dists[len(dists) // 2] if dists else None
    return out


def report_distances(distances):
    values = [d for d in distances.values() if d is not None]
    log("distance au modèle: %d photos, %d qui ne le voient pas" % (len(distances), len(distances) - len(values)))
    low = 0
    for high in (0.5, 1, 1.5, 2, 3, 5, 1e9):
        count = sum(1 for d in values if low <= d < high)
        log("  %s m: %d" % ("%.1f à %.1f" % (low, high) if high < 1e9 else "plus de %.1f" % low, count))
        low = high


def main():
    try:
        a = p.parse_args(sys.argv[1:])
    except SystemExit:
        # (-h ou une erreur d'argument: argparse a écrit son message; ne pas fermer Metashape)
        return
    doc = Metashape.app.document
    if a.chunk:
        chunks = [c for c in doc.chunks if c.label == a.chunk]
        if len(chunks) != 1:
            raise Stop("chunk introuvable ou ambigu: " + a.chunk)
        chunk = chunks[0]
    else:
        chunk = doc.chunk
    if "graded" not in chunk.label:
        raise Stop("le chunk « %s » n'est pas une copie « graded »: rien n'est fait" % chunk.label)
    if chunk.model is None:
        raise Stop("le chunk n'a pas de modèle actif")
    log("chunk: %s, modèle: %s, %d caméras" % (chunk.label, chunk.model.label, len(chunk.cameras)))

    pairs = [(norm(old), new.replace(chr(92), "/").rstrip("/")) for old, new in (m.split("=", 1) for m in (a.map or ZONE_3))]

    # 1. Chemins: tout vérifier, puis tout changer
    changes, missing, kept, done = [], [], 0, 0
    for camera in chunk.cameras:
        if camera.photo is None:
            continue
        folder, name = os.path.split(camera.photo.path)
        folder = norm(folder)
        for old, new in pairs:
            if folder == norm(new):
                done += 1
                break
            if folder == old:
                target = new + "/" + name
                (changes if os.path.isfile(target) else missing).append((camera, target))
                break
        else:
            kept += 1
    log("à changer: %d, déjà changées: %d, autres dossiers (gardés): %d, fichiers manquants: %d"
        % (len(changes), done, kept, len(missing)))
    for camera, target in missing[:10]:
        log("manquant: " + target)
    if missing:
        raise Stop("des images étalonnées manquent: rien n'est changé")
    if a.check:
        # (la taille que prendrait la texture, sans rien changer)
        if chunk.transform.scale:
            texel = target_texel_m()
            log("texel cible %.2f mm: %d px de côté"
                % (texel * 1000, texture_side(chunk.model, chunk.transform.scale, texel)))
            report_distances(camera_distances(chunk, chunk.transform.scale))
        return
    for camera, target in changes:
        # (camera.photo est une copie: changer son chemin puis la remettre sur la caméra)
        photo = camera.photo.copy()
        photo.path = target
        camera.photo = photo
    changed = sum(1 for camera, target in changes if norm(camera.photo.path) == norm(target))
    if changed != len(changes):
        raise Stop("%d chemins sur %d seulement ont changé" % (changed, len(changes)))
    if changes:
        doc.save()
        log("chemins changés et projet enregistré")

    # 1b. Masques: ceux de chaque plongée, sur ses seules photos
    if a.masks:
        for old, new in pairs:
            masks = os.path.dirname(new) + "/_masks"
            cameras = [c for c in chunk.cameras if c.photo and norm(os.path.dirname(c.photo.path)) == norm(new)
                       and os.path.isfile(masks + "/" + os.path.splitext(os.path.basename(c.photo.path))[0] + "_guide.png")]
            log("masques: %d photos de %s" % (len(cameras), masks))
            if cameras:
                # (generateMasks en 1.7, importMasks depuis 1.8)
                load = getattr(chunk, "importMasks", None) or chunk.generateMasks
                load(path=masks + "/{filename}_guide.png", masking_mode=const("MaskingMode", "MaskingModeFile"),
                     mask_operation=const("MaskOperation", "MaskOperationReplacement"), cameras=cameras)
        doc.save()
        log("masques importés et projet enregistré")

    # 2. Texture, sur les coordonnées existantes
    if not a.no_texture:
        if not a.size:
            scale = chunk.transform.scale
            if not scale:
                raise Stop("le chunk n'a pas d'échelle: donner -s")
            texel = target_texel_m()
            a.size = texture_side(chunk.model, scale, texel)
            log("texel cible %.2f mm: %d px de côté" % (texel * 1000, a.size))
        cameras = None
        if a.max_distance:
            distances = camera_distances(chunk, chunk.transform.scale or 1.0)
            report_distances(distances)
            cameras = [c for c, d in distances.items() if d is not None and d <= a.max_distance]
            log("photos de la texture: %d à au plus %.1f m (sur %d)" % (len(cameras), a.max_distance, len(distances)))
        log("texture: %d px, mosaïque" % a.size)
        # (the settings of O:\config\workflows\4. Texture.xml: no hole filling; cameras only when chosen,
        # without it every aligned photo)
        extra = {"cameras": cameras} if cameras is not None else {}
        chunk.buildTexture(blending_mode=const("BlendingMode", "MosaicBlending"), texture_size=a.size, fill_holes=False,
                           ghosting_filter=True, **extra)
        doc.save()
        log("texture refaite et projet enregistré")

    # 3. Export
    if not a.no_export:
        if not a.out:
            zone = "zone-" + chunk.label.split()[1]
            # (le nom du chunk, puis le nombre de faces: on sait de quel chunk vient le modèle; Christian, 2026-10-28)
            name = "".join("-" if ch in '<>:"/|?*' else ch for ch in chunk.label)
            a.out = "O:/modeles/%s/%s (%.1fM faces).glb" % (zone, name, len(chunk.model.faces) / 1e6)
        if os.path.exists(a.out):
            raise Stop("existe déjà, rien n'est écrasé: " + a.out)
        chunk.exportModel(path=a.out, binary=True, texture_format=const("ImageFormat", "ImageFormatJPEG"), save_texture=True,
                          save_uv=True, save_normals=True, save_colors=False, save_cameras=False, save_markers=False)
        log("exporté: " + a.out)
        # Les modèles du projet sont en pieds (Christian, 2026-10-27), le chunk à l'échelle en mètres
        if not a.metres:
            sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
            from glb_to_feet import to_feet
            to_feet(a.out)
            log("mis en pieds (glb_to_feet.py)")


try:
    main()
except Stop as e:
    log("arrêt: %s" % e)
