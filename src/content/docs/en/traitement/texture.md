---
title: Texture
sidebar:
  order: 5
---
The texture is computed in Agisoft Metashape, on each zone's model.

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

## The rod's masks

The orange and white measuring rod I hold in front of the camera shows in many frames. Without a mask, Metashape would paint it onto the texture, like an orange scratch across the mussels. For each frame, a black-and-white mask tells it what to leave out: the rod in black, the rest in white. Metashape then takes nothing from the rod when it builds the texture.

The masks are made by a script written with the help of the AI tool Claude, in October 2026. In each frame, it looks for the rod's orange segment, a thin straight bar coming in from the top of the frame, then follows the same line down, over the white segment and to the orange tip. I made them only for the dives used by the zones online, over 130,000 frames.

## Building the texture

Menu `Workflow` > `Build texture...`

1. Texture type

*(to be completed)*
