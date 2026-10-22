#!/usr/bin/env python3
"""Assemble le jeu et le serveur.

  python3 tools/build.py            -> index.html (jeu en ligne) + relay.js (serveur Cloudflare)
  python3 tools/build.py --offline  -> dist/offline.html (jeu sans mode en ligne, pour l'aperçu)
"""
import os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = ['sprites48.js', 'chars48.js', 'pngs.js', 'game.js', 'stages.js', 'adieu.js', 'bigzinzin.js', 'ln4.js', 'natanax.js', 'kits.js', 'anim.js', 'art.js', 'campaign.js', 'netcode.js', 'online.js', 'bots.js', 'extras.js', 'music_dune.js', 'audio.js']


def read(p):
    with open(os.path.join(ROOT, p), encoding='utf-8') as f:
        return f.read()


def check(path):
    r = subprocess.run(['node', '--check', path], capture_output=True, text=True)
    if r.returncode:
        sys.exit(r.stderr)


for f in SRC:
    check(os.path.join(ROOT, 'src', f))
head = read('src/head.html')
js = ''.join(read('src/' + f) + '\n' for f in SRC)

if '--offline' in sys.argv:
    head = re.sub(r'<!--ONLINE-->.*?<!--/ONLINE-->\n?', '', head, flags=re.S)
    os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
    out = os.path.join(ROOT, 'dist', 'offline.html')
else:
    out = os.path.join(ROOT, 'index.html')
with open(out, 'w', encoding='utf-8') as f:
    f.write(head + js + '</script>')
print('jeu  :', out, os.path.getsize(out), 'octets')

if '--offline' not in sys.argv:
    core = read('server/core.js')
    worker = re.sub(r"^import .*\n", '', read('server/worker.js'), flags=re.M)
    relay = "// FICHIER GÉNÉRÉ par tools/build.py depuis server/core.js + server/worker.js : ne pas modifier à la main\nimport { DurableObject } from 'cloudflare:workers';\n" + core + '\n' + worker
    rp = os.path.join(ROOT, 'relay.js')
    with open(rp, 'w', encoding='utf-8') as f:
        f.write(relay)
    check(rp)
    print('serveur :', rp, os.path.getsize(rp), 'octets')
