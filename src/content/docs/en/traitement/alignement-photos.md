---
title: Photo alignment
sidebar:
  order: 2
---
The alignment is done in Agisoft Metashape, one project per zone.

Create a new project file for the zone. Name the file after the zone, for example: zone-4.psx.

Add a `chunk`, then rename it `raw sparse cloud`.

This folder will only hold the project's raw data.

## Reference system

1. Select the `chunk` > right-click > `Reference settings`
2. Coordinate System: `Local Coordinates (ft)`

## Add the photos

Add all the photos for the zone.

## Alignment

The photo alignment step is partly defined in a batch workflow file, `1. Align cameras.xml`. It takes care of the following steps:

1. Runs a Python script that rates image quality and disables the images scoring below 0.1
2. Runs the photo alignment task with `Accuracy` set to `Highest`.

### How to

1. Select the chunk(s) to align
2. `Workflow` > `Batch Process...`
3. `Load...`
4. `config/workflows/1. Align cameras.xml`

## Unaligned photos

...

## Additional tasks

Fix the object's orientation on all 3 axes.

Adjust the region's orientation to match the object's. Resize the region so it covers the whole point cloud.

### Aberrations

Go over the model looking for badly aligned parts. These parts can be realigned like this:

1. Select the points of the badly aligned part
2. Right click > `Filter photos by Tie points`
3. Show the cameras (`Show cameras`)
4. Select all the cameras
5. In the _chunk_, find the group(s) of selected images
6. To make sure you catch every image involved, you can select the neighbouring images and see which camera is highlighted in the model
7. Select all the images involved
8. Right-click > `Reset Camera Alignment`
9. Right-click > `Align Selected Cameras`

You can also disable the cameras if realigning doesn't fix the problem.

## Optimization

Make a backup copy of the chunk before the optimization steps:

- First chunk: `[Chunk name] - RAW SPARSE`
- Second chunk: `[Chunk name]`

Tie Points optimisation

After each step, run a data optimization (menu `Tools > Optimize Camera Alignment`), checking the `f`, `k1`, `k2`, `k3`, `cx & cy`, `p1`, `p2` parameters and additional corrections.

`Model` > `Gradual Selection`

1. `Reconstruction Uncertainty`: &lt;= 15 (recommended: 10, max 25% of points removed at a time)
2. `Tools` > `Optimize cameras...`, then `Ok`
3. `Projection Accuracy`: 5 (recommended: 2 or 3, max 50% of points removed at a time)
4. `Reprojection Error`: 0.4 (10% of total points)

`Tie Point Accuracy`: 0.1 (max 1)
