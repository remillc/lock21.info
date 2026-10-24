"""Taille des texels des zones préparées (ce qui est publié), lecture seule.

L'analyse de run.ps1 mesure les maillages du .blend, dont certaines zones n'ont qu'une texture 4k d'aperçu; les zones
publiées viennent des exports haute résolution (prepare_zone.py), avec leurs propres UV et une texture de 8k à 16k px.
Ce script lit les OBJ de O:\\publishing\\prepared\\<zone>\\ et donne, pondérés par la surface, la médiane et les
percentiles 10 et 90 de la taille d'un texel en mm, et la distance à laquelle un texel couvre un pixel d'écran
(conditions de visionnement de thresholds.json).

Exemple: python measure_prepared.py -z 12 -z 3
"""
import argparse
import json
import math
import pathlib

import numpy as np

HERE = pathlib.Path(__file__).parent


def read_obj(path):
    v, vt, fv, ft = [], [], [], []
    with open(path) as f:
        for line in f:
            if line.startswith('v '):
                v.append(line.split()[1:4])
            elif line.startswith('vt '):
                vt.append(line.split()[1:3])
            elif line.startswith('f '):
                corners = [c.split('/') for c in line.split()[1:4]]
                fv.append([int(c[0]) - 1 for c in corners])
                ft.append([int(c[1]) - 1 for c in corners])
    return np.array(v, float), np.array(vt, float), np.array(fv), np.array(ft)


def measure(folder):
    report = json.loads((folder / f'{folder.name}-prepare.json').read_text())
    px = report['steps']['export']['texture_px'][0]
    v, vt, fv, ft = read_obj(folder / f'{folder.name}.obj')
    p, t = v[fv], vt[ft]
    area3 = 0.5 * np.linalg.norm(np.cross(p[:, 1] - p[:, 0], p[:, 2] - p[:, 0]), axis=1)
    e1, e2 = t[:, 1] - t[:, 0], t[:, 2] - t[:, 0]
    area2 = 0.5 * np.abs(e1[:, 0] * e2[:, 1] - e1[:, 1] * e2[:, 0])
    ok = area2 > 0
    # OBJ en mètres (prepare_zone.py)
    texel = np.sqrt(area3[ok] / area2[ok]) / px * 1000
    order = np.argsort(texel)
    weight = np.cumsum(area3[ok][order])
    weight /= weight[-1]
    at = lambda q: float(texel[order][np.searchsorted(weight, q)])
    return {'texture_px': px, 'median_mm': at(0.5), 'p10_mm': at(0.1), 'p90_mm': at(0.9)}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('-p', '--prepared', default=r'O:\publishing\prepared', help='dossier des zones préparées')
    parser.add_argument('-z', '--zone', action='append', help='numéro de zone (plusieurs permis; toutes par défaut)')
    args = parser.parse_args()
    viewing = json.loads((HERE / 'thresholds.json').read_text())['viewing']
    # Taille d'un pixel d'écran par mètre de distance
    pixel_per_m = 2 * math.tan(math.radians(viewing['vertical_fov_deg']) / 2) / viewing['screen_height_px']
    target = pixel_per_m * viewing['min_view_distance_m'] * 1000
    folders = sorted(pathlib.Path(args.prepared).glob('zone-*'), key=lambda f: int(f.name.split('-')[1]))
    if args.zone:
        folders = [f for f in folders if f.name.split('-')[1] in args.zone]
    print(f'Texel cible: {target:.2f} mm (pixel écran à {viewing["min_view_distance_m"]} m)\n')
    print('| Zone | Texture | Texel médian (mm) | p10 | p90 | Rapport à la cible | Texel = pixel à (m) |')
    print('| ---: | ---: | ---: | ---: | ---: | ---: | ---: |')
    for folder in folders:
        m = measure(folder)
        print(f'| {folder.name.split("-")[1]} | {m["texture_px"]} | {m["median_mm"]:.2f} | {m["p10_mm"]:.2f} '
              f'| {m["p90_mm"]:.2f} | {m["median_mm"] / target:.2f} | {m["median_mm"] / 1000 / pixel_per_m:.1f} |')


if __name__ == '__main__':
    main()
