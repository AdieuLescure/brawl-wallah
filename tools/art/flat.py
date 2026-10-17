# Pixel art à aplats : formes posées à la main sur la grille de pixels, ombres en plans (3 tons),
# contour noir autour de chaque partie (les traits internes séparent les parties qui se chevauchent).
import numpy as np
from PIL import Image, ImageDraw

SS = 4
K = (20, 16, 26, 255)


def hexc(h):
    h = h.lstrip('#'); return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)


def mat(*tones):  # du plus sombre au plus clair
    return [hexc(t) for t in tones]


def raster(poly, W, H):
    im = Image.new('L', (W * SS, H * SS), 0)
    if len(poly) >= 3: ImageDraw.Draw(im).polygon([(x * SS, y * SS) for x, y in poly], fill=255)
    a = np.array(im) > 0
    return a.reshape(H, SS, W, SS).mean(axis=(1, 3)) >= 0.5


class Part:
    """mat : liste de tons ; base : indice du ton de fond ; shades : [(polygone, ton)] ; lines : [(polygone, couleur)]"""
    def __init__(self, material, sil, shades=(), base=1, outline=True, inner=None):
        self.mat, self.sil, self.shades, self.base, self.outline, self.inner = material, sil, list(shades), base, outline, inner


def px(*pts):  # raccourci : liste de points
    return list(pts)


def compose(items, W, H):
    img = {}
    for it in items:
        if isinstance(it, dict):  # tampon de détails (sans contour)
            img.update(it); continue
        m = raster(it.sil, W, H)
        col = np.full(m.shape, it.base, np.int16)
        for poly, tone in it.shades:
            s = raster(poly, W, H) & m
            col[s] = tone
        ys, xs = np.nonzero(m)
        cur = {(int(x), int(y)): (it.mat[col[y, x]] if col[y, x] >= 0 else K) for x, y in zip(xs, ys)}
        if it.outline:
            for (x, y) in list(cur):
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    q = (x + dx, y + dy)
                    if q in cur or not (0 <= q[0] < W and 0 <= q[1] < H): continue
                    if it.outline == 'outer' and q in img: continue
                    img[q] = K
        img.update(cur)
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); p = im.load()
    for (x, y), c in img.items():
        if 0 <= x < W and 0 <= y < H: p[x, y] = c
    return im


def stamp(rows, pal, x0, y0):
    m = {}
    for j, r in enumerate(rows):
        for i, ch in enumerate(r):
            if ch in pal: m[(x0 + i, y0 + j)] = pal[ch]
    return m


def sheet(frames, path, sc=8, bg=(150, 150, 156, 255), grid=False):
    W, H = frames[0].size
    out = Image.new('RGBA', (W * sc * len(frames), H * sc), bg)
    for i, f in enumerate(frames):
        out.alpha_composite(f.resize((W * sc, H * sc), Image.NEAREST), (i * W * sc, 0))
    if grid:
        d = ImageDraw.Draw(out)
        for x in range(0, out.width, sc): d.line([(x, 0), (x, out.height)], fill=(0, 0, 0, 25))
        for y in range(0, out.height, sc): d.line([(0, y), (out.width, y)], fill=(0, 0, 0, 25))
    out.save(path)
