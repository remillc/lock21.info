"""Halves a Radiance HDR (RGBE) equirectangular sky, averaging 2 x 2 pixels in linear light, as many times as asked.

The averages keep the light's energy, the sun's included, so the 3D viewer's lighting from the sky (three.js PMREM) is
the same; only the detail of the sky's background goes. Written run-length encoded, like the source (TODO #96: the
sky was 1024 x 512, 1.4 MB, loaded with the first tiles).

    python tools/sky/downscale_hdr.py <in.hdr> <out.hdr> [-n/--halvings 1]
"""
import argparse
import math

p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
p.add_argument("source", help="Radiance .hdr (RGBE, -Y H +X W)")
p.add_argument("out", help=".hdr to write")
p.add_argument("-n", "--halvings", type=int, default=1, help="how many times to halve the size (default 1)")
a = p.parse_args()


def read(path):
    data = open(path, "rb").read()
    pos = data.index(b"\n\n") + 2
    end = data.index(b"\n", pos)
    _, h, _, w = data[pos:end].decode().split()
    w, h = int(w), int(h)
    pos = end + 1
    pixels = []
    for _ in range(h):
        if data[pos] != 2 or data[pos + 1] != 2:
            raise SystemExit("only run-length encoded scanlines are read")
        pos += 4
        channels = [bytearray() for _ in range(4)]
        for c in channels:
            while len(c) < w:
                n = data[pos]
                pos += 1
                if n > 128:
                    c += bytes([data[pos]]) * (n - 128)
                    pos += 1
                else:
                    c += data[pos:pos + n]
                    pos += n
        row = []
        for x in range(w):
            e = channels[3][x]
            f = math.ldexp(1.0, e - 136) if e else 0.0
            row.append((channels[0][x] * f, channels[1][x] * f, channels[2][x] * f))
        pixels.append(row)
    return w, h, pixels


def halve(w, h, pixels):
    out = []
    for y in range(0, h, 2):
        row = []
        for x in range(0, w, 2):
            quad = (pixels[y][x], pixels[y][x + 1], pixels[y + 1][x], pixels[y + 1][x + 1])
            row.append(tuple(sum(q[c] for q in quad) / 4 for c in range(3)))
        out.append(row)
    return w // 2, h // 2, out


def rgbe(r, g, b):
    v = max(r, g, b)
    if v < 1e-32:
        return (0, 0, 0, 0)
    m, e = math.frexp(v)
    s = m * 256.0 / v
    return (int(r * s), int(g * s), int(b * s), e + 128)


def runs(values):
    """Radiance's run-length encoding of one channel of one scanline."""
    out = bytearray()
    i, n = 0, len(values)
    while i < n:
        j = i
        while j < n and j - i < 127 and values[j] == values[i]:
            j += 1
        if j - i >= 4:
            out += bytes([128 + j - i, values[i]])
            i = j
            continue
        j = i
        while j < n and j - i < 128 and not (j + 3 < n and values[j] == values[j + 1] == values[j + 2] == values[j + 3]):
            j += 1
        out += bytes([j - i]) + bytes(values[i:j])
        i = j
    return out


def write(path, w, h, pixels):
    with open(path, "wb") as f:
        f.write(b"#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n" + ("-Y %d +X %d\n" % (h, w)).encode())
        for row in pixels:
            encoded = [rgbe(*px) for px in row]
            f.write(bytes([2, 2, w >> 8, w & 255]))
            for c in range(4):
                f.write(runs([px[c] for px in encoded]))


w, h, px = read(a.source)
for _ in range(a.halvings):
    w, h, px = halve(w, h, px)
write(a.out, w, h, px)
print("%s: %d x %d" % (a.out, w, h))
