# Assemble les postures dessinées en une planche PNG par perso, et écrit src/pngs.js (images intégrées au jeu)
import base64, io, sys, json, importlib
from PIL import Image
OUT_JS = sys.argv[1]
CHARS = {'toro': ('toro_set', 0), 'deadlulu': ('lulu_set', 0), 'denodoom': ('deno_set', 0), 'adieulescure': ('adieu_set', 0), 'bigzinzin': ('bz_set', 0), 'grom': ('menes_set', 0)}  # module, décalage horizontal pour centrer le perso dans la case
data = {}
for cid, (mod, dx) in CHARS.items():
    m = importlib.import_module(mod)
    from extra_poses import extra_for
    for k, v in extra_for(cid).items():
        m.POSES.setdefault(k, v)  # postures en plus (course en 4 temps, réception, chute, préparations)
    if getattr(m, 'GOLD_SKIN', False):  # version dorée de chaque posture (BIGZINZIN en JACKPOT)
        for n in list(m.POSES): m.POSES[n + '_g'] = dict(m.POSES[n], gold=True)
    names = list(m.POSES)
    CW, CH = getattr(m, 'W', 80), getattr(m, 'H', 64)
    sheet = Image.new('RGBA', (CW * len(names), CH), (0, 0, 0, 0))
    for i, n in enumerate(names):
        f = m.frame(m.POSES[n])
        bb = f.getbbox()
        assert bb[2] + dx <= CW and bb[0] + dx >= 0, (n, bb)
        sheet.alpha_composite(f, (i * CW + dx, 0))
    sheet.save(f'{cid}_sheet.png')
    buf = io.BytesIO(); sheet.save(buf, 'PNG', optimize=True)
    data[cid] = {'w': CW, 'h': CH, 'scale': 1.25, 'names': names, 'src': 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()}
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
