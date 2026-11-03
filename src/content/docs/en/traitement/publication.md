---
title: Publishing the model
description: "How each zone goes from Metashape to the site's 3D viewer: assembly in Blender, simplification, relief, tiles and going online."
sidebar:
  order: 6
---
## The problem

A Metashape export is far too heavy for a browser. Zone 12, for example, has more than 12 million faces. To get around this, publishing turns it into tiles, and the [viewer](/en/modele) only loads the ones being looked at. Tiles close to the camera load with a lot of detail, those further away with less. The browser saves its memory and its computing, and navigation stays smooth.

## The Blender file

All the zones are assembled in a single Blender file, with the terrain and the mockups of the zones not surveyed yet. That is where each zone is placed and its cuts are drawn. In this file, a zone can stay in low resolution: it only keeps the path to its high-resolution export, and that export is what gets published. Both must come from the same Metashape model, otherwise they don't overlap.

At each publication, a fingerprint of the zone is saved with its tiles: its position, its mesh, its cuts and the high-resolution export used. At the next publication, this fingerprint is compared with the state of the Blender file. For example, if only a cut of zone 12 was touched up, only zone 12 goes through the steps below again, and the other zones keep the tiles already online.

## A zone's steps

1. The high-resolution export is registered automatically onto the zone in the Blender file.
2. The file's cuts are applied and whatever sticks out of the zone is removed.
3. The mesh goes down to 3,000 triangles per square metre, with some exceptions. Zone 12 goes from 12.5 million to under a million faces, within a median 0.7 mm of the full mesh.
4. The mussels, joints and rough spots lost in the simplification are baked into a normal map, from the full export. They don't change the shape, only the way light catches the surface.
5. The zone is cut into tiles at several levels of detail, with Obj2Tiles, then the geometry and textures are compressed. Zone 12 gives 68 tiles totalling 81 MB.

Each zone also has a light set for phones and tablets, with a texture reduced by half and no relief. The zones stay independent: redoing one doesn't touch the others.

## Going online

After a validation step in the viewer locally, the tiles are uploaded to the server, and visitors see the new version within a minute, without the site itself being republished.

The downloadable files on the [model page](/en/modele) and the augmented reality models are redone separately, because they hold the whole model, with each zone simplified further.
