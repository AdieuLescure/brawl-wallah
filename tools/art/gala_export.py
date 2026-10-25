# Arène CÉRÉMONIE : prépare le logo et le sigle des LUCAS D'OR (fournis par Noah) et écrit src/gala_art.js.
# Le logo est gardé tel quel (fond noir d'origine, mêmes proportions) ; le sigle est détouré (le noir devient transparent).
# usage : python3 gala_export.py ../../src/gala_art.js
import base64, io, sys
from PIL import Image
OUT = sys.argv[1]
D = __file__.rsplit('/', 1)[0] + '/gala/'

def b64(im):
    buf = io.BytesIO(); im.save(buf, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()

# logo : recadré au plus près du contenu (marge de fond noir conservée), sans déformation
logo = Image.open(D + 'lucas_logo.jpg').convert('RGB')
lum = logo.convert('L').point(lambda v: 255 if v > 40 else 0)
x0, y0, x1, y1 = lum.getbbox()
m = 18
logo = logo.crop((max(0, x0 - m), max(0, y0 - m), min(logo.width, x1 + m), min(logo.height, y1 + m)))

# sigle : détourage doux (le noir devient transparent, les bords restent lisses)
sig = Image.open(D + 'lucas_sigle.jpg').convert('RGB')
lum = sig.convert('L')
bb = lum.point(lambda v: 255 if v > 40 else 0).getbbox()
sig = sig.crop(bb); lum = lum.crop(bb)
alpha = lum.point(lambda v: max(0, min(255, int((v - 18) * 255 / 70))))
sig = sig.convert('RGBA'); sig.putalpha(alpha)
s = max(sig.size); sq = Image.new('RGBA', (s, s), (0, 0, 0, 0)); sq.paste(sig, ((s - sig.width) // 2, (s - sig.height) // 2)); sig = sq

js = ("// Généré par tools/art/gala_export.py : logo et sigle des LUCAS D'OR (arène CÉRÉMONIE)\n"
      "const GALA_ART = " + repr({'logo': b64(logo), 'sigle': b64(sig)}).replace("'", '"') + ";\n"
      "const GALA_IMG = {};\n"
      "function loadGalaArt() {\n"
      "  return Promise.all(Object.keys(GALA_ART).map((k) => new Promise((ok) => {\n"
      "    const im = new Image();\n"
      "    im.onload = () => { GALA_IMG[k] = im; ok(); };\n"
      "    im.onerror = () => ok();\n"
      "    im.src = GALA_ART[k];\n"
      "  })));\n"
      "}\n")
open(OUT, 'w').write(js)
print('logo', logo.size, 'sigle', sig.size, len(js))
