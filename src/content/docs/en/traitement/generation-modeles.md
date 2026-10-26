---
title: Building the models
sidebar:
  order: 4
---
Each zone's models are generated in Agisoft Metashape, then exported for publishing.

## Densities for high resolution

The face size for the high-resolution models was set to 2mm `<sup>`2 `</sup>, that is:`

|        | Faces / sq ft |
| :-----: | :------------: |
| Model |     1 475     |
| Terrain |                |

### Texture resolution

48 400 px2 (220px x 220px) per 1 ft2

## Resolution for web publishing

Publishing on [lock21.info/modele](/en/modele) starts from the most detailed export of each zone. The publishing pipeline (`tools/publish-model/`) simplifies it on its own: I no longer have to export a separate "web" model.

### Faces / area ratio

|        | Faces / m2 | Faces / sq ft |
| :-----: | :-----------: | :------------: |
| Model (most detailed level) |     3 000     |     ≈ 279      |
| Terrain |               |                |

The distant levels are lightened even more: about 40,000 faces per zone for the coarsest and 150,000 for the intermediate one. The fine detail comes mostly from the texture.

### Relief (zebra mussels)

For the relief of the mussels (1 to 3 cm) to stand out in the viewer, you need a fine geometry export, with edges of about 1 cm or less (e.g. zone 12: 13 M faces, about 7 mm). This export doesn't need a texture and must come from the same chunk as the published export. With *depth maps* in `low` quality, the model stays too coarse, even with lots of faces: that's why I'm redoing zone 4 in `medium` quality.
