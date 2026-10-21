# Press Start 2P avec de vraies majuscules accentuées (l'accent AU-DESSUS de la lettre entière)
# usage : python3 patch_font.py  (lit ps2p.ttf = Press Start 2P de Google Fonts, écrit brawlpixel.woff2 + .b64 à coller dans src/head.html)
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools import subset
import base64, sys
U = 125
f = TTFont('ps2p.ttf')
cm = f.getBestCmap(); gs = f.getGlyphSet(); glyf = f['glyf']
ACC = {  # (rang du haut, rang du bas) : colonnes allumées
    'acute': ([4], [3]), 'grave': ([2], [3]), 'circ': ([2, 3, 4], [1, 2, 4, 5]), 'circI': ([3, 4], [2, 3, 4, 5]),
    'diaer': ([1, 2, 4, 5], []), 'diaerI': ([1, 2, 5, 6], []),
}
T = {}
for base, chars in {'A': 'ÀÁÂÄ', 'E': 'ÈÉÊË', 'O': 'ÒÓÔÖ', 'U': 'ÙÚÛÜ', 'I': 'ÌÍÎÏ', 'Y': '..Ÿ'}.items():
    for k, ch in zip(['grave', 'acute', 'circ', 'diaer'], chars):
        if ch == '.': continue
        if ch == 'Ÿ': k = 'diaer'
        if base in 'IY' and k in ('circ', 'diaer'): k += 'I'
        T[ch] = (base, k)
for ch, (base, k) in T.items():
    pen = TTGlyphPen(gs)
    gs[cm[ord(base)]].draw(pen)
    up, lo = ACC[k]
    for row, cols in ((1, up), (0, lo)):
        y0 = 1000 + row * U
        for c in cols:
            x0 = c * U
            pen.moveTo((x0, y0)); pen.lineTo((x0, y0 + U)); pen.lineTo((x0 + U, y0 + U)); pen.lineTo((x0 + U, y0)); pen.closePath()
    g = pen.glyph(); g.recalcBounds(glyf)
    name = cm[ord(ch)]
    glyf[name] = g
    adv, _ = f['hmtx'][name]
    f['hmtx'][name] = (adv, g.xMin)
f['head'].yMax = max(f['head'].yMax, 1250)
f['hhea'].ascent = 1250
f['OS/2'].sTypoAscender = 1250
f['OS/2'].usWinAscent = 1250
f['name'].setName('BrawlPixel', 1, 3, 1, 0x409)
opts = subset.Options(); opts.layout_features = []; opts.name_IDs = ['*']; opts.notdef_outline = True
sub = subset.Subsetter(opts)
sub.populate(unicodes=list(range(0x20, 0x7F)) + list(range(0xA0, 0x180)) + list(range(0x2010, 0x2027)) + [0x20AC, 0x2248, 0x25BC, 0x2190, 0x2191, 0x2192, 0x2193])
sub.subset(f)
f.flavor = 'woff2'
f.save('brawlpixel.woff2')
b = open('brawlpixel.woff2', 'rb').read()
print(len(b))
open('brawlpixel.b64', 'w').write(base64.b64encode(b).decode())
