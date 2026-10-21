---
title: Texture
sidebar:
  order: 5
---
## Colour calibration

This step evens out the whites and the brightness across the photos.

Menu `Tools` > `Calibrate colors`...

1. Source data: `Model` or `DEM`?
2. Check `Calibrate white balance`

This calibration makes the photos of a chunk consistent with each other, but it keeps the green tint of the water. For the published model, colour correction happens in the viewer: the zones are brought to a common colour, and the dominant green is removed pixel by pixel. The light and dark bands left by the lights can also be toned down by the publishing pipeline (test in progress).

## Texture resolution

### High res

21 025 px2 (145px x 145px) per 1 ft2

### Web publishing

No more need for a low-resolution version: the export's texture is published as is, cut into tiles of at most 4096 px and compressed (KTX2), and the viewer loads only the visible tiles. A single texture page per zone, up to 16 384 px (e.g. redone zone 4: 16 384 px).

## Building the texture

Menu `Workflow` > `Build texture...`

1. Texture type
2.
