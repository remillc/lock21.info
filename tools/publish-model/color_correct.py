"""Colour balance of a zone's texture (TODO #5): the water's cast taken out of the photos' colours.

The textures keep the colours the camera saw under water: the blue (and the red, deeper) absorbed, the green kept; on
zone 3 a yellow-olive texture (mean R 0.48, G 0.44, B 0.26). The 3D viewer adds the water's colour back under water,
by depth and distance (underwater.js), and the dive light then shows the colours as they are: the texture must carry
them. Two steps, in the usual way for underwater images:

1. the weak channels made up from the green, the best kept (Ancuti et al., « Color balance and fusion for underwater
   image enhancement », 2018): c' = c + alpha (mean(G) - mean(c)) (1 - c) G, most where the channel is weak and the
   green strong (a channel only amplified would bring its noise up);
2. grey world, warmed: each channel scaled so that the texture's mean takes the target colour (-t, earth tones by
   default), at its mean brightness.

-s/--strength blends the result with the original (0 nothing, 1 all). The atlas's black padding stays black. The
texture (often 16k: 262 Mpx) is read once with OpenCV and corrected in bands of rows; the means come from a version
reduced 8 times.

Usage:
    python tools/publish-model/color_correct.py -i O:/temp/zone-3/relief/zone-3.jpg -o O:/temp/color-test/zone-3/zone-3.jpg
"""
import argparse
import os

import cv2
import numpy as np

p = argparse.ArgumentParser(description=__doc__.split("\n\n")[0], formatter_class=argparse.RawDescriptionHelpFormatter,
                            epilog="See the module's docstring for the method.")
p.add_argument("-i", "--input", required=True, help="the zone's texture (JPEG)")
p.add_argument("-o", "--output", required=True, help="the corrected texture (JPEG)")
p.add_argument("-s", "--strength", type=float, default=1.0, help="share of the correction, 0 to 1 (default 1)")
p.add_argument("-a", "--alpha", type=float, default=1.0, help="how much the weak channels take from the green (default 1)")
p.add_argument("-t", "--target", default="1,0.93,0.78",
               help="the texture's mean colour after the correction, as R,G,B ratios (default 1,0.93,0.78: stone, wood and "
                    "sediment are warm; a neutral grey, 1,1,1, left the lock blue-grey)")
p.add_argument("-q", "--quality", type=int, default=95, help="JPEG quality (default 95)")
p.add_argument("-p", "--preview", help="also write a 1024 px preview, before | after, side by side")
a = p.parse_args()

image = cv2.imread(a.input, cv2.IMREAD_COLOR)  # BGR
if image is None:
    raise SystemExit(f"color_correct.py: cannot read {a.input}")
small = cv2.resize(image, (image.shape[1] // 8, image.shape[0] // 8), interpolation=cv2.INTER_AREA)


def to_rgb(bgr):
    return bgr[..., ::-1].astype(np.float32) / 255.0


def valid(rgb):
    return rgb.sum(-1) > 0.12  # the atlas's black padding left out


s_rgb = to_rgb(small)
s_valid = valid(s_rgb)
means = s_rgb[s_valid].mean(0)


def compensate(rgb, means):
    g = rgb[..., 1:2]
    out = rgb.copy()
    for c in (0, 2):
        if means[c] < means[1]:
            out[..., c:c + 1] = rgb[..., c:c + 1] + a.alpha * (means[1] - means[c]) * (1 - rgb[..., c:c + 1]) * g
    return out


# The grey world's gains, measured after the compensation
s_comp = compensate(s_rgb, means)
comp_means = s_comp[s_valid].mean(0)
target = np.array([float(v) for v in a.target.split(",")], np.float32)
target = target / target.mean() * comp_means.mean()
gains = target / comp_means
print(f"[colour] means R G B {means.round(3)}; after the compensation {comp_means.round(3)}; gains {gains.round(3)}; "
      f"strength {a.strength}", flush=True)

out = np.empty_like(image)
band = 1024
for y0 in range(0, image.shape[0], band):
    rgb = to_rgb(image[y0:y0 + band])
    fixed = np.clip(compensate(rgb, means) * gains, 0, 1)
    fixed = rgb + a.strength * (fixed - rgb)
    fixed = np.where(valid(rgb)[..., None], fixed, rgb)
    out[y0:y0 + band] = (fixed[..., ::-1] * 255 + 0.5).astype(np.uint8)
os.makedirs(os.path.dirname(os.path.abspath(a.output)), exist_ok=True)
cv2.imwrite(a.output, out, [cv2.IMWRITE_JPEG_QUALITY, a.quality])
after = to_rgb(cv2.resize(out, small.shape[1::-1], interpolation=cv2.INTER_AREA))
print(f"[colour] -> {a.output}: means R G B {after[valid(after)].mean(0).round(3)}", flush=True)
if a.preview:
    side = 1024
    pair = np.hstack([cv2.resize(image, (side, side), interpolation=cv2.INTER_AREA),
                      cv2.resize(out, (side, side), interpolation=cv2.INTER_AREA)])
    cv2.imwrite(a.preview, pair, [cv2.IMWRITE_JPEG_QUALITY, 90])
