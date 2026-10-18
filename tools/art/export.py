# Assemble les postures dessinées en une planche PNG par perso, et écrit src/pngs.js (images intégrées au jeu)
import base64, io, sys, json, importlib
from PIL import Image
OUT_JS = sys.argv[1]
CHARS = {'toro': ('toro_set', 0), 'deadlulu': ('lulu_set', 0), 'denodoom': ('deno_set', 0), 'adieulescure': ('adieu_set', 0)}  # module, décalage horizontal pour centrer le perso dans la case
data = {}
for cid, (mod, dx) in CHARS.items():
    m = importlib.import_module(mod)
    names = list(m.POSES)
    sheet = Image.new('RGBA', (80 * len(names), 64), (0, 0, 0, 0))
    for i, n in enumerate(names):
        f = m.frame(m.POSES[n])
        bb = f.getbbox()
        assert bb[2] + dx <= 80 and bb[0] + dx >= 0, (n, bb)
        sheet.alpha_composite(f, (i * 80 + dx, 0))
    sheet.save(f'{cid}_sheet.png')
    buf = io.BytesIO(); sheet.save(buf, 'PNG', optimize=True)
    data[cid] = {'w': 80, 'h': 64, 'scale': 1.25, 'names': names, 'src': 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()}
js = ("// Généré par tools/art/export.py : persos dessinés en pixel art (planches PNG intégrées)\n"
      "const PNG_CHARS = " + json.dumps(data) + ";\n"
      "const PNG_IMG = {};\n"
      "function loadPngChars() {\n"
      "  return Promise.all(Object.keys(PNG_CHARS).map((id) => new Promise((ok) => {\n"
      "    const im = new Image();\n"
      "    im.onload = () => { PNG_IMG[id] = im; ok(); };\n"
      "    im.onerror = () => ok();\n"
      "    im.src = PNG_CHARS[id].src;\n"
      "  })));\n"
      "}\n")
open(OUT_JS, 'w').write(js)
print({k: len(v['src']) for k, v in data.items()})
