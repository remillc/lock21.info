---
title: Building the dense point cloud
sidebar:
  order: 3
---
1. Select the chunk to process
2. Menu `Workflow` > `Batch Process...`
3. Load...
4. `workflow` folder > `2. Dense cloud.xml`

## Filtering the dense point cloud

### Filter by confidence

1. `Tools > Dense cloud > Filter by Confidence...`
2. Min: 0, `Max: 2`
3. `Select all points`
4. Delete
5. `Tools > Dense cloud > Reset Filter`

### Additional filtering

Remove the excess green colours with the menu `Tools` > `Dense Cloud` > `Select Points by Color`, with a tolerance of 20.

## Export raw dense cloud

## Filter Dense Cloud

1. Tools > Dense Cloud > Filter Dense Cloud...
2. Point spacing (m): .004 (4mm)
