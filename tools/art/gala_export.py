# Arène CÉRÉMONIE : le logo et le sigle des LUCAS D'OR (fournis par Noah, dans gala/) redessinés en PIXEL ART,
# à la résolution du décor (1 pixel d'art = 2 pixels du jeu), et écrits dans src/gala_art.js.
#  - le sigle : l'image d'origine réduite à la bonne taille puis ramenée à 3 tons d'or (+ le noir de ses creux) ;
#  - les textes : redessinés lettre par lettre (petites capitales étroites pour « CÉRÉMONIE TRÈS OFFICIELLE DES »,
#    capitales à empattements pour « LUCAS D'OR », comme sur le logo), même mise en page que l'original.
# Chaque dessin = liste de lignes de caractères : '.' transparent, k noir, a/b/c or (sombre → clair),
# g/h/i gris (sombre → clair). Les couleurs exactes sont choisies dans gala.js selon l'endroit (éclairage).
# usage : python3 gala_export.py ../../src/gala_art.js [aperçu.png]
import json, math, sys
from PIL import Image
OUT = sys.argv[1]
PREVIEW = sys.argv[2] if len(sys.argv) > 2 else None
D = __file__.rsplit('/', 1)[0] + '/gala/'

# ---------------------------------------------------------------- sigle
SRC = Image.open(D + 'lucas_sigle.jpg').convert('L')
bb = SRC.point(lambda v: 255 if v > 40 else 0).getbbox()
SRC = SRC.crop(bb)


def sigle(n):
    """sigle de n x n pixels"""
    sm = SRC.resize((n * 8, n * 8), Image.LANCZOS)
    rows = []
    r = n / 2
    for y in range(n):
        row = ''
        for x in range(n):
            # moyenne du bloc 8x8 correspondant
            tot = 0
            for yy in range(8):
                for xx in range(8):
                    tot += sm.getpixel((x * 8 + xx, y * 8 + yy))
            v = tot / 64
            d = math.hypot(x + 0.5 - r, y + 0.5 - r)
            if d > r - 0.15:
                ch = '.' if v < 95 else 'a'
            elif v < 80:
                ch = 'k'
            elif v < 125:
                ch = 'a'
            elif v < 165:
                ch = 'b'
            else:
                ch = 'c'
            row += ch
        rows.append(row)
    # éclairage : le haut à gauche de l'anneau plus clair, le bas à droite plus sombre
    out = []
    for y, row in enumerate(rows):
        s = ''
        for x, ch in enumerate(row):
            if ch in 'bc' and x + y < n * 0.55:
                ch = 'c'
            elif ch in 'bc' and x + y > n * 1.45:
                ch = 'a' if ch == 'b' else 'b'
            s += ch
        out.append(s)
    return out


# ---------------------------------------------------------------- petites capitales (5 de haut, accents au-dessus)
SMALL = {
    'C': ['.##', '#..', '#..', '#..', '.##'],
    'E': ['###', '#..', '##.', '#..', '###'],
    'R': ['##.', '#.#', '##.', '#.#', '#.#'],
    'M': ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
    'O': ['.#.', '#.#', '#.#', '#.#', '.#.'],
    'N': ['#..#', '##.#', '#.##', '#..#', '#..#'],
    'I': ['#', '#', '#', '#', '#'],
    'T': ['###', '.#.', '.#.', '.#.', '.#.'],
    'S': ['.##', '#..', '.#.', '..#', '##.'],
    'F': ['###', '#..', '##.', '#..', '#..'],
    'L': ['#..', '#..', '#..', '#..', '###'],
    'D': ['##.', '#.#', '#.#', '#.#', '##.'],
    ' ': ['..', '..', '..', '..', '..'],
}
ACUTE = ['..#', '.#.']
GRAVE = ['#..', '.#.']

# « 3ème édition » en petites minuscules penchées (4 de haut + ascendantes)
TINY = {
    '3': ['###', '..#', '.##', '..#', '###'],
    'è': ['#..', '...', '.#.', '###', '#..', '.##'],
    'é': ['..#', '...', '.#.', '###', '#..', '.##'],
    'm': ['.....', '.....', '####.', '#.#.#', '#.#.#', '#.#.#'],
    'e': ['...', '...', '.#.', '###', '#..', '.##'],
    'd': ['..#', '..#', '.##', '#.#', '#.#', '.##'],
    'i': ['#', '.', '#', '#', '#', '#'],
    't': ['.#.', '.#.', '###', '.#.', '.#.', '.##'],
    'o': ['...', '...', '.#.', '#.#', '#.#', '.#.'],
    'n': ['...', '...', '##.', '#.#', '#.#', '#.#'],
    ' ': ['..', '..', '..', '..', '..', '..'],
}

# capitales à empattements (8 de haut)
BIG = {
    'L': ['#####....', '.###.....', '.###.....', '.###.....', '.###.....', '.###....#', '.###...##', '#########'],
    'U': ['####..####', '.###...##.', '.###...##.', '.###...##.', '.###...##.', '.###...##.', '..###.##..', '...####...'],
    'C': ['...#####.', '.###...##', '###.....#', '###......', '###......', '###.....#', '.###...##', '...#####.'],
    'A': ['....##....', '...####...', '...#.###..', '..##..###.', '..#...###.', '.########.', '.#.....###', '###...####'],
    'S': ['.######.', '###...##', '####....', '.######.', '....####', '#....###', '##...###', '.######.'],
    'D': ['#######...', '.###..###.', '.###...###', '.###...###', '.###...###', '.###...###', '.###..###.', '#######...'],
    "'": ['##', '##', '.#', '#.', '..', '..', '..', '..'],
    'O': ['..######..', '.###..###.', '###....###', '###....###', '###....###', '###....###', '.###..###.', '..######..'],
    'R': ['#######..', '.###..###', '.###..###', '.######..', '.###.###.', '.###..###', '.###..###', '####...##'],
    ' ': ['...', '...', '...', '...', '...', '...', '...', '...'],
}


def word(font, txt, ch, gap=1):
    h = len(next(iter(font.values())))
    rows = [''] * h
    for i, c in enumerate(txt):
        g = font[c]
        for y in range(h):
            rows[y] += g[y].replace('#', ch)
            if i < len(txt) - 1:
                rows[y] += '.' * gap
    return rows


def small(txt, ch):
    """petites capitales avec accents : 7 lignes (2 d'accent + 5)"""
    rows = [''] * 7
    for i, c in enumerate(txt):
        base = c.replace('É', 'E').replace('È', 'E')
        g = SMALL[base]
        acc = ACUTE if c == 'É' else GRAVE if c == 'È' else ['.' * len(g[0])] * 2
        for y in range(2):
            rows[y] += acc[y].replace('#', ch)
        for y in range(5):
            rows[2 + y] += g[y].replace('#', ch)
        if i < len(txt) - 1:
            for y in range(7):
                rows[y] += '.'
    return rows


def italic(rows):
    """penche un texte (1 pixel de décalage toutes les 3 lignes)"""
    h = len(rows)
    out = []
    for y, r in enumerate(rows):
        k = (h - 1 - y) // 3
        out.append('.' * k + r + '.' * ((h - 1) // 3 - k))
    return out


def stack(blocks, align='c', bg='.'):
    """empile des dessins (listes de lignes) centrés ; un entier = lignes vides"""
    W = max(len(b[0]) for b in blocks if not isinstance(b, int))
    out = []
    for b in blocks:
        if isinstance(b, int):
            out += [bg * W] * b
            continue
        w = len(b[0])
        l = (W - w) // 2
        for r in b:
            out.append(bg * l + r.replace('.', bg) + bg * (W - w - l))
    return out


def recolor_big(rows, light, mid, dark):
    """capitales : haut des lettres plus clair, bas plus sombre (relief, comme le gris dégradé du logo)"""
    h = len(rows)
    out = []
    for y, r in enumerate(rows):
        c = light if y < 2 else dark if y >= h - 2 else mid
        out.append(r.replace('#', c))
    return out


def logo(sig_n, edition, gap=2):
    """le logo complet, dans la mise en page de l'original"""
    lucas = recolor_big(word(BIG, 'LUCAS', '#'), 'i', 'h', 'g')
    d_ = recolor_big(word(BIG, "D'", '#'), 'i', 'h', 'g')
    or_ = recolor_big(word(BIG, 'OR', '#'), 'c', 'b', 'a')
    dor = [a + '.' + b for a, b in zip(d_, or_)]
    parts = [sigle(sig_n), 1, small('CÉRÉMONIE', 'i'), small('TRÈS OFFICIELLE DES', 'i'), gap, lucas, gap, dor]
    if edition:
        ed = word(TINY, '3ème édition', '#')
        ed = [r.replace('#', 'h') for r in ed]
        line = ['.' * 4 + 'g' * (len(ed[0]) - 8) + '.' * 4]
        parts += [2, ed, 1, line]
    return stack(parts)


def banner_logo(sig_n):
    """version en hauteur pour les bannières étroites : le sous-titre passe sur 3 lignes"""
    lucas = recolor_big(word(BIG, 'LUCAS', '#'), 'i', 'h', 'g')
    d_ = recolor_big(word(BIG, "D'", '#'), 'i', 'h', 'g')
    or_ = recolor_big(word(BIG, 'OR', '#'), 'c', 'b', 'a')
    dor = [a + '.' + b for a, b in zip(d_, or_)]
    return stack([sigle(sig_n), 2, small('CÉRÉMONIE', 'i'), small('TRÈS OFFICIELLE', 'i'), small('DES', 'i'), 2, lucas, 2, dor])


PIX = {
    'sig9': sigle(9), 'sig11': sigle(11), 'sig13': sigle(13), 'sig17': sigle(17), 'sig23': sigle(23),
    'logo': logo(11, False, 1),    # plaque du parvis (44 lignes)
    'logoEd': logo(13, True),      # écran géant, affiche
    'banner': banner_logo(13),     # bannières de la façade
    'title': stack([recolor_big(word(BIG, 'LUCAS', '#'), 'i', 'h', 'g'), 2,
                    [a + '.' + b for a, b in zip(recolor_big(word(BIG, "D'", '#'), 'i', 'h', 'g'), recolor_big(word(BIG, 'OR', '#'), 'c', 'b', 'a'))]]),
}
for k, v in PIX.items():
    assert all(len(r) == len(v[0]) for r in v), k

open(OUT, 'w').write(
    "// Généré par tools/art/gala_export.py : logo et sigle des LUCAS D'OR redessinés en pixel art (arène CÉRÉMONIE).\n"
    "// '.' transparent, k noir, a/b/c or (sombre → clair), g/h/i gris (sombre → clair).\n"
    "const GALA_PIX = " + json.dumps(PIX, separators=(',', ':')) + ";\n")

if PREVIEW:
    COL = {'.': (40, 20, 40), 'k': (8, 6, 14), 'a': (150, 108, 44), 'b': (214, 168, 84), 'c': (250, 222, 150),
           'g': (110, 110, 120), 'h': (160, 160, 170), 'i': (215, 215, 222)}
    items = list(PIX.items())
    W = sum(len(v[0]) for _, v in items) + 4 * len(items) + 4
    H = max(len(v) for _, v in items) + 8
    im = Image.new('RGB', (W, H), (20, 12, 28))
    x = 4
    for _, v in items:
        for y, r in enumerate(v):
            for i, c in enumerate(r):
                im.putpixel((x + i, 4 + y), COL[c])
        x += len(v[0]) + 4
    im.resize((W * 6, H * 6), Image.NEAREST).save(PREVIEW)
for k, v in PIX.items():
    print(k, len(v[0]), 'x', len(v))
