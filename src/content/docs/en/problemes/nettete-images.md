---
title: Image sharpness
---
The first footage shot with the GoPro Hero 6 Black camera shows that images captured while moving are blurry and lack detail.

*(to be completed)*

The dense cloud and mesh generated don't have the precision you'd expect from 400px x 300px images taken at about 60cm, i.e. 0,33 mm2 per pixel. How can I improve that?

The quality of the data collected (pixels) depends on several factors:

1. The camera's characteristics (the _hardware_)
2. The medium
3. The lighting
4. The capture settings

### The camera's characteristics (the _hardware_)

The lens, the image sensor and the encoding format are all characteristics that affect the quality of the pixels collected. It's a huge subject and goes well beyond the scope of this documentation.

#### Settings

The camera was set up to keep post-capture processing to a minimum, the idea being to disable or reduce as much as possible the processing done by the camera's software, so as to get data from the sensor that is as raw as possible.

There is, however, one point

See the [full list of settings used](/en/collecte/materiel-utilise#camera).

### Lighting

*(to be completed)*

### Capture settings

*(to be completed)*

## Solutions to explore

1. Slow down while filming
2. Increase the camera's shutter speed

### Slowing down

Moving more slowly underwater means longer dives, so more of the gas mix used up and getting closer to the no-decompression limit. It also means less area covered and more data collected, which adds up to more dives, longer processing times and more storage space. In short, better to test solution 2 - Increase the shutter speed first!

### Increasing the shutter speed

There are 3 technical ways to increase the shutter speed on a GoPro:

1. Set the sharpness setting to `High`
2. Set the shutter speed manually
3. Raise the camera's minimum ISO sensitivity

The tests below cover these 3 cases.

## The image sharpness setting

What does this setting change?

[show a 2-image slider]

It's software processing, so it affects the quality of the data collected. So the `Low` setting has to be used, the one that turns the processing off.

### Conclusion

-&gt; Set this setting to `Low`

## Varying the shutter speed

What shutter speed does the GoPro Hero 6 Black use? Is it slow? Does the lighting allow a faster speed?

The video files produced by the GoPro don't hold the shutter speed used. To find it out,

### Test

Scan a horizontal strip 100 feet long in 4 passes, varying the shutter speed:

1. Automatic speed
2. 1/120th of a second
3. 1/240th of a second

### Analysis

Extract the same number of frames for each pass and run the following tests in Metashape:

### Conclusions

*(to be completed)*

## Raising the minimum ISO sensitivity

You can't set the camera's sensitivity [(the ISO number](https://www.adobe.com/ca_fr/creativecloud/photography/discover/iso.html) manually in video mode. You can, however, set a range with a minimum and a maximum value. For the camera used, the GoPro Hero6 Black, these are 100 ISO and 6400 ISO respectively.

Since exposure is calculated automatically in the GoPro, you can force it to use a faster shutter speed by raising the minimum sensitivity, i.e. the minimum ISO (the other parameter in the equation, the lens aperture, being fixed).

### Test

The test consisted of filming a section of the wooden floor downstream of the spillways (_sluice gates_) over a distance of 50 feet (15,24 metres) at a constant speed, changing only the minimum ISO from one pass to the next.

A Seacraft Future 1000 scooter was used at speed 1, a speed measured in the videos at 1,2 feet/second (0,37 m/s), to ensure a constant speed. For reference, I often use 50 feet/minute (15,2 m/min), i.e. 0,8 feet/second (0,25 m/s), as my reference finning speed in conditions with no current. The scooter at speed 1, in the test conditions, was therefore moving 1.5 times faster than finning. Note that the speeds on this scooter model are programmable, so they can be changed if need be.
