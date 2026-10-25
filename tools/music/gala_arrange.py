# Arrangement « combat à l'ancienne » du MIDI de Noah (ré mineur, Dm C Bb A), écrit dans music_gala.js
# pistes : lead (mélodie, carré), pulse (réponses aiguës + écho), brass (accords « cuivres » façon arcade), arp, bass, drums
import json, sys
OUT = sys.argv[1]
TPB = 128; S = 32; BAR = 16 * S
BPM = 112
NI = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
def mi(n):
    import re
    m = re.match(r'^([A-G][#b]?)(-?\d)$', n); return 12 * (int(m.group(2)) + 1) + NI[m.group(1)]

# accords (notes en octave 3) ; « Gx » = sol avec si bémol et mi, la couleur sombre de l'original
CH = {'Dm': ['D3', 'F3', 'A3'], 'C': ['C3', 'E3', 'G3'], 'Bb': ['Bb2', 'D3', 'F3'], 'Gx': ['G2', 'Bb2', 'E3'], 'A': ['A2', 'C#3', 'E3']}
CH = {k: [mi(n) for n in v] for k, v in CH.items()}
PROG = ['Dm', 'C', 'Bb', 'A', 'Dm', 'C', 'Gx', 'A', 'Dm', 'C', 'Gx', 'A', 'Dm', 'C', 'Gx', 'A']

# la mélodie de l'original (16 mesures, une par accord), nettoyée et calée sur la grille
MEL = [
    'D5 - - - - - - - - - D5 - . . . .',
    '. . . . . . . . D5 E5 D5 - C#5 - D5 -',
    'E5 - - - - - - . E5 - - - Bb4 - - C#5',
    '- - - - - - - - - - - . . . . .',
    'D5 - - - - - - - . . . . . . . .',
    '. . . . . . . . D5 E5 D5 - C#5 - D5 -',
    'E5 - C#5 - - E5 - - Bb4 - - - Bb4 - A4 -',
    'G5 - - - - - . . . . . . . . . .',
    'F5 - - - - - - - . . . . . . . .',
    '. . . . . . . . F5 G5 F5 - E5 - F5 -',
    'G5 - F5 - - G5 - - . . . . . . . E5',
    'A5 - - - - . . . . . . . . . E5 -',
    'F5 - - - - - - . . . . . . . . .',
    '. . . . . . . . F5 G5 F5 - E5 - D5 -',
    '. E5 - - - - - - . . E5 - - - F5 -',
    '. E5 - - . . . . A4 - - - - - C#5 -',
]
# les réponses aiguës de la 2e moitié de l'original (deuxième passage)
RESP = {
    3: 'A5 - - Bb5 - - - - - - A5 - - - - -',
    4: '. . . D6 - - - - D6 - - . . . . .',
    5: '. . . D6 - - - D6 . . . . . . . .',
    6: '. . . . . . G6 - - - - . . . . .',
    7: '. . . . . . E6 - - - - - - - - -',
    10: '. . . . . . . . E6 - - - E6 - - .',
    11: 'E6 - - - . . . . . F6 - - - - - -',
    12: '. . . D6 - - - D6 - - . . . . .',
    13: '. . . D6 - - D6 - . . . . . . . .',
    14: '. . . . . . . G6 - - - - . . . .',
    15: '. . . . . . . A6 - - - - - - - -',
}

T = {k: [] for k in ['lead', 'pulse', 'brass', 'arp', 'bass', 'drums']}
def note(tr, t, d, n, v): T[tr].append((int(t), int(max(8, d)), int(n), int(max(1, min(127, v)))))

def line(tr, t0, s, v=100, tr_oct=0, accent=True):
    tk = s.split()
    for i, x in enumerate(tk):
        if x in '.-': continue
        n = 1
        while i + n < 16 and tk[i + n] == '-': n += 1
        vv = v + (12 if accent and i % 4 == 0 else 0)
        note(tr, t0 + i * S, n * S - 6, mi(x) + 12 * tr_oct, vv)

K, SN, HH, OH, CR, TOM, TOMH = 36, 38, 42, 46, 49, 45, 50
def drums(t0, pat, v=100):
    for inst, s in pat.items():
        for i, c in enumerate(s):
            if c == 'x': note('drums', t0 + i * S, S, inst, v)
            elif c == 'o': note('drums', t0 + i * S, S, inst, v - 40)

def bass8(t0, ch, last=False, v=110):
    r = CH[ch][0] - 12 if CH[ch][0] - 12 >= 31 else CH[ch][0]
    pat = [0, 12, 0, 12, 0, 12, 0, 12]
    if last: pat = [0, 12, 0, 12, 0, 4 if ch != 'A' else 4, 7, 10]
    for i, iv in enumerate(pat): note('bass', t0 + i * 2 * S, 2 * S - 10, r + iv, v)

def arp16(t0, ch, v=70, oct=2, up=True):
    c = CH[ch]
    seq = [c[0], c[1], c[2], c[0] + 12, c[1] + 12, c[2] + 12, c[0] + 12, c[2]]
    if not up: seq = [c[0] + 12, c[2], c[1], c[0], c[1], c[2], c[0] + 12, c[1] + 12]
    for i in range(16): note('arp', t0 + i * S, S - 4, seq[i % 8] + 12 * (oct - 1), v + (10 if i % 4 == 0 else 0))

def stab(t0, ch, steps, v=95, lens=None, oct=1):
    for j, s in enumerate(steps):
        d = (lens[j] if lens else 2) * S - 8
        for n in CH[ch]: note('brass', t0 + s * S, d, n + 12 * oct, v)

t = 0
# ---------------------------------------------------------------- INTRO (4 mesures, jouée une fois)
for i, ch in enumerate(['Dm', 'C', 'Bb', 'A']):
    b = t + i * BAR
    stab(b, ch, [0, 3, 6], 105, [3, 3, 6])
    r = CH[ch][0] - 12
    for s, l in [(0, 3), (3, 3), (6, 6)]: note('bass', b + s * S, l * S - 8, r, 118)
    drums(b, {K: 'x..x..x.........', CR: 'x...............' if i % 2 == 0 else '................', SN: '...x..x.........'})
    if i < 3:
        drums(b, {HH: '........x.x.x.x.'}, 70)
        pass
    else:
        drums(b, {SN: '........xxxxxxxx', TOM: '........x...x...'}, 85)
        for k in range(8): note('arp', b + (8 + k) * S, S - 4, CH['A'][k % 3] + 24 + (12 if k >= 4 else 0), 60 + k * 6)
t += 4 * BAR
loopStart = t

def section_A(t, second):
    for bi, ch in enumerate(PROG):
        b = t + bi * BAR
        ph_end = bi % 4 == 3
        # mélodie (le 2e passage : doublée à l'octave grave par les cuivres)
        line('lead', b, MEL[bi], 100 if second else 96)
        if second: line('brass', b, MEL[bi], 62, -1, False)
        if second and bi in RESP:
            line('pulse', b, RESP[bi], 80, 0, False)
            line('pulse', b + 3 * S, RESP[bi], 38, 0, False)  # écho
        # accords cuivres : le rythme poussé « 3-3-2 »
        if not second:
            stab(b, ch, [0, 3, 6, 10, 12] if not ph_end else [0, 3, 6], 70, [3, 3, 2, 2, 2] if not ph_end else [3, 3, 8], oct=1)
        else:
            stab(b, ch, [0, 3, 6, 10, 12] if not ph_end else [0, 3, 6, 10, 12, 14], 58, [3, 3, 2, 2, 2, 2], oct=0)
        arp16(b, ch, 46 if not second else 54, 2, up=bi % 2 == 0)
        bass8(b, ch, ph_end)
        # batterie : grosse caisse / caisse claire d'arcade
        hats = 'x.x.x.x.x.x.x.x.' if not second else 'xxxxxxxxxxxxxxxx'
        pat = {K: 'x.....x.x.x.....', SN: '....x.......x...', HH: hats}
        if bi % 4 == 0: pat[CR] = 'x...............'
        if bi % 8 == 7:
            pat[SN] = '....x.......xxxx'; pat[TOM] = '........x.x.....'; pat[TOMH] = '.........x.x....'
        elif bi == 15:
            pass
        drums(b, pat, 100)
    return t + 16 * BAR

def section_B(t):
    # pont : le groove grave du milieu du morceau (basse « 808 », accords sur les temps), la mélodie revient à la fin
    for bi, ch in enumerate(['Dm', 'C', 'Bb', 'A'] * 2):
        b = t + bi * BAR
        r = CH[ch][0] - 12
        if r < 31: r += 12
        for s, l, iv in [(0, 3, 0), (3, 3, 0), (6, 2, 12), (10, 2, 0), (12, 4, 12)]: note('bass', b + s * S, l * S - 8, r + iv, 115)
        stab(b, ch, [4, 8, 12] if bi < 4 else [0, 4, 8, 12], 60, [2, 2, 2, 2])
        for i in range(8): note('arp', b + i * 2 * S, S, CH[ch][i % 3] + 24, 40 + (bi * 5))
        pat = {K: 'x..x..x...x.....', SN: '........x.......', HH: 'x.x.x.x.x.x.x.x.'}
        if bi >= 4: pat = {K: 'x..x..x...x.....', SN: '....x.......x...', HH: 'xxxxxxxxxxxxxxxx'}
        if bi == 0 or bi == 4: pat[CR] = 'x...............'
        if bi == 7: pat = {K: 'x.....x.........', SN: 'x...x...xxxxxxxx', TOM: '........x.x.x.x.', CR: '................'}
        drums(b, pat, 95)
        if bi >= 4: line('pulse', b, MEL[bi - 4], 74, -1, True)
    return t + 8 * BAR

t = section_A(t, False)
t = section_A(t, True)
t = section_B(t)
loopEnd = t
names = ['lead', 'pulse', 'brass', 'arp', 'bass', 'drums']
tracks = []
for nmz in names:
    ev = sorted(T[nmz])
    flat = []
    for e in ev: flat += list(e)
    tracks.append(flat)
M = {'tpb': TPB, 'bpm': BPM, 'loop': loopEnd, 'loopStart': loopStart, 'loopEnd': loopEnd, 'names': names, 'tracks': tracks}
open(OUT, 'w').write(
    "// Musique de la CÉRÉMONIE : le MIDI fourni par Noah (ré mineur, Dm C Bb A), réarrangé en musique de combat d'arcade\n"
    "// (mélodie gardée telle quelle, cuivres en accords, arpèges, basse en octaves, batterie). Généré par tools/music/gala_arrange.py\n"
    "// pistes : [début, durée, note, force] en ticks (128 par temps) ; intro une fois, puis boucle A, A' (réponses aiguës), pont\n"
    "const GALA_MIDI = " + json.dumps(M, separators=(',', ':')) + ";\n")
print('durée boucle', (loopEnd - loopStart) / TPB * 60 / BPM, 's ; intro', loopStart / TPB * 60 / BPM, 's', {k: len(v) for k, v in T.items()})
