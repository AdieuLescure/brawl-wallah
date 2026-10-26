# boule dorée stylée : ballon d'or gravé, collerette à 4 griffes, colonne cannelée, socle noir à liseré d'or
import math, json
from PIL import Image
W, H = 23, 38
g = [['.'] * W for _ in range(H)]
def P(x, y, c):
    if 0 <= x < W and 0 <= y < H: g[y][x] = c
cx, cy, R = 11, 10.5, 9.6
# boule : ombrage (lumière en haut à gauche)
for y in range(H):
    for x in range(W):
        dx, dy = x + 0.5 - cx, y + 0.5 - cy
        d = math.hypot(dx, dy)
        if d <= R:
            l = (-dx * 0.6 - dy * 0.8) / R  # vers la lumière
            if d > R - 1.1: c = 'g' if l < 0.2 else 'Y'
            elif l > 0.55: c = 'y'
            elif l > 0.05: c = 'Y'
            elif l > -0.45: c = 'o'
            else: c = 'g'
            g[y][x] = c
# gravure du ballon : pentagone central + coutures
pent = [(cx + 3.6 * math.cos(math.radians(-90 + 72 * i)), cy + 0.6 + 3.6 * math.sin(math.radians(-90 + 72 * i))) for i in range(5)]
def line(a, b, c):
    n = int(max(abs(b[0] - a[0]), abs(b[1] - a[1])) * 2) + 1
    for t in range(n + 1):
        x = a[0] + (b[0] - a[0]) * t / n; y = a[1] + (b[1] - a[1]) * t / n
        if g[int(y)][int(x)] != '.': P(int(x), int(y), c)
for i in range(5):
    line(pent[i], pent[(i + 1) % 5], 'G')
    a = pent[i]; dirx, diry = a[0] - cx, a[1] - (cy + 0.6); L = math.hypot(dirx, diry)
    line(a, (a[0] + dirx / L * 6, a[1] + diry / L * 6), 'G')
# pentagone central plus sombre
for y in range(H):
    for x in range(W):
        px_, py_ = x + 0.5, y + 0.5
        inside = all(((pent[(i + 1) % 5][0] - pent[i][0]) * (py_ - pent[i][1]) - (pent[(i + 1) % 5][1] - pent[i][1]) * (px_ - pent[i][0])) >= 0 for i in range(5))
        if inside and g[y][x] in 'yYo': g[y][x] = 'o' if g[y][x] != 'y' else 'Y'
# reflet
for (x, y) in [(6, 4), (7, 4), (5, 5), (6, 5), (5, 6)]: P(x, y, 'W')
# collerette à 4 griffes qui tient la boule
for x in range(6, 17): P(x, 20, 'G' if 7 <= x <= 15 else '.')
for x in range(7, 16): P(x, 21, 'o' if x not in (7, 15) else 'g')
for (x, y) in [(5, 18), (6, 19), (17, 18), (16, 19), (8, 19), (14, 19)]: P(x, y, 'Y')
# colonne cannelée avec anneaux
for y in range(22, 30):
    for x in range(9, 14): P(x, y, 'y' if x == 10 else 'Y' if x in (9, 11) else 'o' if x == 12 else 'g')
for x in range(8, 15): P(x, 22, 'G'); P(x, 29, 'G')
for x in range(9, 14): P(x, 25, 'g')
# socle noir à liseré d'or et plaque
for y in range(30, 37):
    w0 = 5 if y < 32 else 4 if y < 34 else 3
    for x in range(w0, W - w0): P(x, y, 'B')
    P(w0, y, 'b')
for x in range(5, W - 5): P(x, 30, 'G')
for x in range(3, W - 3): P(x, 36, 'G')
for x in range(8, 15): P(x, 33, 'Y'); P(x, 34, 'g')
P(11, 33, 'y')
# contour noir
out = [r[:] for r in g]
for y in range(H):
    for x in range(W):
        if g[y][x] == '.':
            if any(0 <= x + dx < W and 0 <= y + dy < H and g[y + dy][x + dx] not in '.k' for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): out[y][x] = 'k'
rows = [''.join(r) for r in out]
COL = {'k': '#140e04', 'Y': '#f0c850', 'y': '#fff0a0', 'o': '#d4a034', 'g': '#9a6a18', 'G': '#7a5010', 'W': '#ffffff', 'B': '#18161e', 'b': '#34303e'}
im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
for y, r in enumerate(rows):
    for x, c in enumerate(r):
        if c != '.': im.putpixel((x, y), tuple(int(COL[c][i:i + 2], 16) for i in (1, 3, 5)) + (255,))
bg = Image.new('RGBA', (W * 12, H * 12), (60, 50, 90, 255)); bg.alpha_composite(im.resize((W * 12, H * 12), Image.NEAREST)); bg.save('cup.png')
json.dump({'rows': rows, 'col': COL}, open('cup.json', 'w'))
print('\n'.join(rows))
