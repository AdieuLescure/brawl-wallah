# NATANAX : tenue d'éclaireur (cape verte, veste beige courte, chemise bleu clair et foulard blanc, sangles de cuir,
# pantalon blanc, hautes bottes bordeaux). Cheveux bruns bouclés en bataille, barbe courte, oreilles bien visibles.
# Pas d'écusson sur la cape. Dans la main : une casquette plate « à la Peaky Blinders », lames de rasoir dans la visière.
# Version SANS CASQUETTE (quand il l'a lancée) : export.py fabrique les postures « _n » (frame(p) avec nocap=True).
# Autres accessoires selon la posture : ballon de basket (bb), craie (chalk), atome (atom), lunettes noires (expr='goggles').
import math
from flat import *
from toro_set import slab, fold, sub, add, mul, rot, FIST, P0, N0

W, H = 80, 64
OX = 11
NOCAP_SKIN = True  # export.py : ajoute la version sans casquette de chaque posture
SKIN = mat('#a8684e', '#dc9e80', '#f2c2a4', '#fde0c8')
HAIR = mat('#100a06', '#26180e', '#432a1a', '#634026')
CAPE = mat('#0f3a1e', '#1f6a36', '#349052', '#5cb874')
CAPE_FAR = mat('#0a2a14', '#165226', '#24703c')
JACK = mat('#6e4418', '#ae7634', '#d29e54', '#ecc486')
JACK_FAR = mat('#523210', '#8a5a26', '#ae8044')
SHIRT = mat('#6e86a0', '#a6c0d8', '#d4e6f6')
WHITE = mat('#9aa0b0', '#d6dae4', '#f6f8fc')
WHITE_FAR = mat('#7a8090', '#acb2c0', '#ccd0dc')
LEATHER = mat('#240c0a', '#4e1c16', '#723024', '#94463a')
BOOT = mat('#260a0a', '#5a1c18', '#843226', '#ac4836')
BOOT_FAR = mat('#1c0808', '#46160f', '#66281e')
METAL = mat('#5a5e68', '#a4a8b4', '#e6e8f0')
TWEED = mat('#2e2620', '#5e5040', '#887460', '#b09c80')
BLADE = mat('#7a808c', '#d0d6e0', '#ffffff')
BALL = mat('#7a2c08', '#d2621c', '#f08a3c', '#ffb878')
FACE = {'w': (255, 255, 255, 255), 'k': K, 'b': (40, 24, 14, 255), 'B': (70, 40, 22, 255), 'm': (150, 76, 60, 255), 'r': (205, 92, 80, 255),
        'e': (190, 120, 96, 255), 'E': (150, 86, 66, 255)}
HAND = {'k': K, 'W': hexc('#f2c2a4'), 'w': hexc('#dc9e80'), 'g': hexc('#a8684e')}
HAND_FAR = {'k': K, 'W': hexc('#d8a688'), 'w': hexc('#bc8466'), 'g': hexc('#8a5440')}
OPEN = ['.kkkk...', 'kWWWWk..', 'kWWWWWk.', 'kWWWWWk.', 'kwWWWWk.', 'kgwwwwk.', '.kkkkk..']
BEARD = (92, 54, 32, 255)
BEARD_D = (62, 36, 20, 255)
ATOM = {'k': K, 'c': (60, 200, 230, 255), 'C': (150, 240, 255, 255), 'W': (255, 255, 255, 255), 'o': (120, 230, 255, 255)}

CLOTH = [(CAPE, 0), (CAPE_FAR, 1)]  # vêtements recolorés en équipe : la cape


def ell(c, rx, ry, n=14, a0=0.0, a1=6.283, rot_=0.0):
    out = []
    for t in range(n + 1):
        a = a0 + (a1 - a0) * t / n
        x, y = rx * math.cos(a), ry * math.sin(a)
        cr, sr = math.cos(rot_), math.sin(rot_)
        out.append((c[0] + x * cr - y * sr, c[1] + x * sr + y * cr))
    return out


def cape_back(T, swing):
    """Grand pan de cape derrière lui : des épaules aux genoux, flotte vers l'arrière avec swing (degrés)."""
    a = T([(22, 20.6)])[0]; b = T([(36, 20.2)])[0]
    bl = add(a, rot((-7, 27), swing * 1.2)); br = add(b, rot((-3, 26), swing))
    mid = add(a, rot((-5.6, 14), swing * 0.9))
    sil = [a, b, br, add(br, rot((-4, 1.6), swing)), add(bl, rot((3, 1.2), swing)), bl, mid]
    fold1 = [add(a, (3, 2)), add(a, (5, 2)), add(add(a, rot((-4, 25), swing * 1.1)), (7, 0)), add(add(a, rot((-4, 25), swing * 1.1)), (4.6, 0))]
    return Part(CAPE_FAR, sil, shades=[(fold1, 0)], base=1)


def torso(P, lean):
    T = lambda pts: [add(rot(sub(p, P0), lean), P) for p in pts]
    it = []
    # jupe de cuir sur les hanches
    it.append(Part(LEATHER, T([(19.6, 38.6), (38.6, 38.6), (39.2, 43.6), (31, 44), (29, 45.4), (27, 44), (19, 43.6)]),
                   shades=[(T([(19.6, 38.6), (24, 38.6), (24.6, 43.8), (19, 43.6)]), 0), (T([(30, 41.6), (36, 41.6), (36.4, 42.4), (30, 42.4)]), 2)], outline='outer'))
    # chemise bleu clair
    it.append(Part(SHIRT, T([(19.4, 22), (26, 20), (35, 20), (39, 22), (38.4, 31), (38.6, 40.5), (20.2, 40.5), (20, 31)]),
                   shades=[(T([(19.4, 22), (24, 21), (24.4, 40.5), (20.2, 40.5), (20, 31)]), 0), (T([(34, 21), (39, 22), (38.6, 30), (36, 29)]), 2)]))
    # boutons
    for y in (25, 29, 33):
        c = T([(31.6, y)])[0]
        it.append(stamp(['W'], {'W': SHIRT[2]}, round(c[0]), round(c[1])))
    # veste beige courte (s'arrête sous la poitrine)
    it.append(Part(JACK, T([(19.2, 22), (25.6, 20.2), (26.6, 22), (26.4, 33.4), (20.4, 33.8), (19.8, 28)]),
                   shades=[(T([(19.2, 22), (22.4, 21.2), (22.6, 33.6), (20.4, 33.8), (19.8, 28)]), 0), (T([(24.6, 21), (25.6, 20.2), (26.6, 22), (26.4, 33.4), (25.4, 33.4)]), 2)]))
    it.append(Part(JACK, T([(35, 20.4), (39.2, 22), (38.8, 33), (36.4, 33.2), (35.6, 24)]),
                   shades=[(T([(37, 21.4), (39.2, 22), (39, 27), (37.6, 26)]), 2)], base=1))
    # sangles de cuir sur la poitrine
    it.append(Part(LEATHER, T([(27.2, 22), (28.6, 22), (29.2, 38.6), (27.8, 38.6)]), base=2, outline=False))
    it.append(Part(LEATHER, T([(34.2, 23.4), (35.4, 23.4), (35.8, 38.6), (34.6, 38.6)]), base=1, outline=False))
    # ceinture et boucle
    it.append(Part(LEATHER, T([(20, 37.6), (38.8, 37.6), (38.8, 40.2), (20, 40.2)]), base=2, outline=False))
    it.append(Part(METAL, T([(32.4, 37.8), (34.4, 37.8), (34.4, 40), (32.4, 40)]), base=1, outline=False))
    # foulard blanc au cou
    it.append(Part(WHITE, T([(28.4, 19), (34.4, 19), (34.6, 22.4), (33, 25), (31.4, 25.4), (30.4, 22.4)]), shades=[(T([(28.4, 19), (30.4, 19), (31.4, 25.4), (30.4, 22.4)]), 0)], base=2))
    # cape : rabats sur les épaules + fermoir
    it.append(Part(CAPE, T([(18.6, 22.4), (21.6, 19.6), (26.4, 19.2), (27.8, 21.4), (25.6, 25.6), (21.4, 27), (18.8, 26)]),
                   shades=[(T([(18.6, 22.4), (20.4, 20.8), (21.6, 26.8), (18.8, 26)]), 0), (T([(22.6, 19.8), (26.4, 19.2), (25.6, 20.6), (22.4, 21.4)]), 3)]))
    it.append(Part(CAPE, T([(34.8, 19.4), (37.6, 20.4), (39.6, 22.6), (38.6, 25), (36, 23.4)]), shades=[(T([(36, 19.8), (37.6, 20.4), (38.6, 22), (36.6, 21.6)]), 3)], base=2))
    c = T([(34.4, 21.2)])[0]
    it.append(stamp(['.k.', 'kWk', '.k.'], {'k': K, 'W': METAL[2]}, round(c[0]) - 1, round(c[1]) - 1))
    return it, T


def head(N, tilt, expr, flow):
    T = lambda pts: [add(rot(sub(p, N0), tilt), N) for p in pts]
    o = (round(N[0] - N0[0]), round(N[1] - N0[1]))
    it = []
    f = flow
    it.append(Part(SKIN, T([(28, 18), (33, 18), (33, 22), (28, 22)]), base=0))
    # visage
    it.append(Part(SKIN, T([(25, 6), (30, 4), (35, 5), (38, 8), (38.4, 11.5), (39.6, 13.6), (38.6, 14.6), (38.2, 16), (37, 18.6), (34, 20.4), (30, 20.4), (27, 18), (24.5, 13)]),
                   shades=[(T([(24.5, 13), (25, 6), (29, 9), (29.6, 20.4), (28.6, 20.2), (27, 18)]), 1),
                           (T([(35, 9), (38, 10), (38.2, 12.4), (36, 13)]), 3), (T([(37.2, 12), (39.6, 13.6), (38.6, 14.6), (37.4, 14.2)]), 3)], base=2))
    # oreille bien visible (décollée)
    it.append(Part(SKIN, T([(25.6, 10.2), (27.6, 9.6), (28.8, 11.6), (28.6, 14.4), (27.2, 15.8), (25.4, 14.6), (24.8, 12)]),
                   shades=[(T([(26.2, 11.2), (27.6, 11), (27.8, 13.8), (26.6, 14.4)]), 1)], base=2))
    # cheveux bouclés en bataille : volume sur le dessus, côtés plus courts, mèches qui partent dans tous les sens
    curls = [(24.4, 10.2), (23, 8.2), (23.6, 5.6), (22.4, 3.6), (24.6, 2.6), (24.8, 0.2), (27.4, 0.8), (28.4, -1.8), (30.8, -0.6), (32.2, -2.6), (34.2, -0.8),
             (36.6, -2), (37.6, 0.4), (40.2, 0.2), (40.8, 2.6), (41.6 + f * 0.3, 4.6), (40.4, 6), (40.8, 7.8), (39.6, 7), (38.8, 9.6), (37.4, 7.6), (36.2, 9.4),
             (35, 7.4), (33.6, 8.6), (32.4, 6.8), (31, 8), (29.8, 6.8), (28.4, 8.2), (27.6, 9.6), (25.8, 9.4)]
    it.append(Part(HAIR, T(curls),
                   shades=[(T([(25.6, 2.4), (29, 0.6), (32.4, 0.2), (31.4, 1.8), (27.8, 2.8), (25.4, 4.4)]), 3), (T([(35, 0.8), (38.6, 1.6), (40.6, 3.8), (36.6, 3)]), 2),
                           (T([(23.4, 9), (23.4, 5.6), (25.6, 6.4), (26.6, 9.4)]), 0),
                           (T([(29.4, 3.4), (31, 2.8), (31.4, 4.4), (30, 4.8)]), 2), (T([(34.4, 3), (36, 2.6), (36.4, 4.2), (35, 4.6)]), 2),
                           (T([(26.4, 5.4), (27.8, 4.8), (28, 6.2), (26.8, 6.6)]), 3), (T([(37.6, 4.2), (39, 3.8), (39.2, 5.2), (38, 5.6)]), 3), (T([(32.4, 4.6), (33.6, 4.2), (33.8, 5.6), (32.6, 5.8)]), 3)]))
    fx, fy = o
    # barbe courte qui suit la mâchoire + moustache
    it.append(Part(mat('#3e2414', '#5c3620', '#7a4c2e'), T([(28.4, 14.4), (30, 16.4), (33.4, 16.6), (35, 15.6), (38.4, 15.6), (38.2, 16.8), (36.8, 18.8), (34, 21), (30.2, 20.8), (27.6, 18)]),
                   shades=[(T([(28.4, 14.4), (30, 16.4), (30.8, 20.8), (27.6, 18)]), 0)], base=1))
    it.append(Part(SKIN, T([(34.2, 17.2), (37.6, 17), (37.2, 18.2), (34.4, 18.4)]), base=1, outline=False))
    if expr == 'hurt':
        it.append(stamp(["BBBB.BB", "kkkk.kk", "....k..", ], FACE, 30 + fx, 8 + fy))
        it.append(stamp(["mmr."], FACE, 34 + fx, 17 + fy))
    elif expr == 'goggles':
        # lunettes noires de l'essai atomique
        it.append(stamp(["kkkkkkkkkk", "kGGGkkGGGk", "kGgGk.kGgk", ".kkk...kk."], dict(FACE, G=(30, 60, 40, 255), g=(90, 150, 110, 255)), 29 + fx, 9 + fy))
        it.append(stamp(["kkk", "mrk"], FACE, 34 + fx, 17 + fy))
    elif expr == 'shout':
        it.append(stamp(["BBBB..BB", "...wk.wk", "...wk..."], FACE, 30 + fx, 9 + fy))
        it.append(stamp(["kkk", "mrk"], FACE, 34 + fx, 17 + fy))
    else:
        it.append(stamp(["BBBB..BB", "...wk.wk", "...wk..."], FACE, 30 + fx, 9 + fy))
        it.append(stamp([".mmk"], FACE, 33 + fx, 17 + fy))
    return it


def cap(wr, ang, far=False):
    """Casquette plate tenue par l'arrière : la visière (avec ses lames) pointe dans la direction ang (degrés)."""
    u = (math.cos(math.radians(ang)), math.sin(math.radians(ang))); n = (-u[1], u[0])
    c = add(wr, mul(u, 5.2))
    a = math.atan2(u[1], u[0])
    M = TWEED
    crown = ell(c, 6.0, 3.9, 16, rot_=a)
    it = [Part(M, crown, base=2, shades=[(ell(add(c, mul(n, 1.4)), 4.6, 1.8, 10, rot_=a), 1), (ell(add(add(c, mul(n, -1.6)), mul(u, -1)), 2.6, 1.0, 8, rot_=a), 3)])]
    # bouton sur le dessus
    t = add(c, mul(n, -3.5))
    it.append(Part(M, [add(t, mul(u, -0.8)), add(t, mul(u, 0.8)), add(add(t, mul(u, 0.8)), mul(n, -1)), add(add(t, mul(u, -0.8)), mul(n, -1))], base=3, outline=False))
    # visière et lames de rasoir au bord
    v0 = add(c, mul(u, 4.0)); v1 = add(c, mul(u, 10.6))
    it.append(Part(M, [add(v0, mul(n, -2.6)), add(v1, mul(n, -0.6)), add(v1, mul(n, 1.6)), add(v0, mul(n, 2.8))], base=1))
    it.append(Part(BLADE, [add(add(v1, mul(u, -2.2)), mul(n, -0.9)), add(v1, mul(n, -0.4)), add(v1, mul(n, 1.4)), add(add(v1, mul(u, -2.2)), mul(n, 1.6))], base=2, outline=False))
    return it


def ball(c):
    disk = ell(c, 4.6, 4.6, 16)
    it = [Part(BALL, disk, base=1, shades=[(ell(add(c, (1.4, 1.4)), 3.4, 3.4, 10, 0.3, 2.6), 0), (ell(add(c, (-1.6, -1.8)), 1.4, 1.0, 8), 3)])]
    # coutures
    it.append(Part(mat('#1a0a04', '#1a0a04'), [add(c, (-4.4, -0.4)), add(c, (4.4, -0.4)), add(c, (4.4, 0.4)), add(c, (-4.4, 0.4))], base=0, outline=False))
    it.append(Part(mat('#1a0a04', '#1a0a04'), [add(c, (-0.4, -4.4)), add(c, (0.4, -4.4)), add(c, (0.4, 4.4)), add(c, (-0.4, 4.4))], base=0, outline=False))
    return it


def chalk(wr, ang):
    u = (math.cos(math.radians(ang)), math.sin(math.radians(ang)))
    return [slab(add(wr, mul(u, 1)), add(wr, mul(u, 6)), 1.8, 1.8, WHITE, base=1, dark=0.3)]


def atom(c):
    return [stamp(['o.......o', '.o..k..o.', '..okCko..', '.kCWWWCk.', 'kcWWWWWck', '.kCWWWCk.', '..okCko..', '.o..k..o.', 'o.......o'], ATOM, round(c[0]) - 4, round(c[1]) - 4)]


def arm(sh, el, wr, far, fist):
    d = sub(wr, el); L = math.hypot(*d) or 1; u = (d[0] / L, d[1] / L)
    M = JACK_FAR if far else JACK
    it = [slab(sh, el, 5.6, 5.0, M, ext0=0.8, ext1=1.0), slab(el, wr, 5.0, 4.6, M, ext0=1.2, ext1=0.2)]
    # poignet de chemise bleu clair
    it.append(slab(add(wr, mul(u, -1.4)), add(wr, mul(u, 0.4)), 5.0, 5.0, SHIRT, base=1, dark=0.4))
    if fist is None: return it
    rows = OPEN if fist == 'O' else FIST[fist]
    anchor = {'R': (0, 3.5), 'L': (7, 3.5), 'U': (3.5, 7), 'UL': (3.5, 7), 'D': (3.5, 0), 'O': (1, 3)}[fist]
    at = (round(wr[0] - anchor[0] + u[0] * 1.2), round(wr[1] - anchor[1] + u[1] * 1.2))
    it.append(stamp(rows, HAND_FAR if far else HAND, *at))
    return it


def leg(hip, kn, an, far, foot, foot_rot):
    M = WHITE_FAR if far else WHITE
    B = BOOT_FAR if far else BOOT
    it = []
    R = lambda pts: [add(rot((x * foot, y), foot_rot * foot), an) for x, y in pts]
    # botte : pied
    it.append(Part(B, R([(-3.8, -1), (3, -1), (3.6, 1.4), (8, 2.6), (9, 4.2), (8.6, 5.2), (-4, 5.2)]), shades=[(R([(-4, 4.2), (8.8, 4.2), (8.6, 5.2), (-4, 5.2)]), 0)]))
    # botte : tige haute jusque sous le genou
    top = add(kn, mul(sub(an, kn), 0.42))
    it.append(slab(top, add(an, mul(sub(an, kn), 0.05)), 7.4, 6.6, B, ext0=0.6))
    it.append(slab(top, add(top, mul(sub(an, kn), 0.12)), 8.0, 7.6, B, base=1, dark=0.3, ext0=0.8))
    # tibia blanc (visible entre genou et botte) et cuisse
    it.append(slab(kn, top, 6.6, 6.4, M, ext0=1.5))
    it.append(slab(hip, kn, 7.8, 6.8, M, ext0=1.0, ext1=1.2))
    # sangles de cuir autour de la cuisse
    for t in (0.5,):
        p = add(hip, mul(sub(kn, hip), t))
        it.append(slab(p, add(p, mul(sub(kn, hip), 0.09)), 8.2, 7.4, LEATHER, base=1, dark=0.3))
    dk = sub(kn, hip); Lk = math.hypot(*dk) or 1
    n = (-dk[1] / Lk, dk[0] / Lk)
    it[-2].shades.append((fold(add(kn, mul(n, -1)), mul(n, 1), 2.6), 0))
    return it


def frame(p):
    P = (p['P'][0] + OX, p['P'][1]); lean = p.get('lean', 0)
    tor, T = torso(P, lean)
    N = add(T([N0])[0], p.get('hd', (0, 0)))
    sN = T([(19, 22.5)])[0]; sF = T([(37, 22.5)])[0]
    hN = T([(23.5, 43)])[0]; hF = T([(33.5, 43)])[0]
    wN = add(sN, p['nA'][1]); wF = add(sF, p['fA'][1])
    nocap = p.get('nocap')
    capA = p.get('cap', 95)
    it = [cape_back(T, p.get('swing', 8))]
    if p.get('capFar') and not nocap: it += cap(wF, capA, far=True)
    it += arm(sF, add(sF, p['fA'][0]), wF, True, p.get('fFist', 'R'))
    if p.get('bbFar'): it += ball(add(wF, p['bbFar']))
    it += leg(hF, add(hF, p['fL'][0]), add(hF, p['fL'][1]), True, p.get('fFoot', 1), p.get('fRot', 0))
    it += leg(hN, add(hN, p['nL'][0]), add(hN, p['nL'][1]), False, p.get('nFoot', -1), p.get('nRot', 0))
    it += tor
    hd_ = head(N, p.get('tilt', 0), p.get('expr', 'normal'), p.get('flow', 0))
    near = []
    if not p.get('capFar') and capA is not None and not nocap and not p.get('capFront'): near += cap(wN, capA)
    if p.get('chalk') is not None: near += chalk(wN, p['chalk'])
    near += arm(sN, add(sN, p['nA'][0]), wN, False, p.get('nFist', 'R'))
    if not p.get('capFar') and capA is not None and not nocap and p.get('capFront'): near += cap(wN, capA)
    if p.get('bb'): near += ball(add(wN, p['bb']))
    if p.get('atom'): near += atom(add(wN, p['atom']))
    # bras levé : derrière la tête (sinon il cache le visage)
    it += (near + hd_) if p.get('armBehind') else (hd_ + near)
    return compose(it, W, H)


IDLE = dict(P=(29, 40), nA=((1, 9.5), (6.5, 2)), fA=((4, 7.5), (8, 5)), cap=100, nL=((-3, 8), (-5.5, 14)), fL=((5, 7), (7, 14)))
POSES = {
    'idle0': IDLE,
    'idle1': dict(IDLE, P=(29, 41), hd=(0, 1), swing=11, nA=((1, 9.5), (6.5, 3)), fA=((4, 7.5), (8, 6)), nL=((-3.5, 7.5), (-5.5, 13)), fL=((5.5, 6.5), (7, 13))),
    'run0': dict(P=(30, 41), lean=10, flow=2, swing=40, nA=((-5, 7), (-10, 11)), fA=((5, 6), (11, 2)), nFist='L', cap=160,
                 nL=((-7, 6), (-14, 10)), fL=((7, 4), (8, 13)), nRot=-30),
    'run1': dict(P=(30, 40), lean=10, flow=3, swing=48, nA=((5, 6), (11, 1)), fA=((-3, 8), (0, 14)), fFist='D', cap=-20,
                 nL=((10, 2), (13, 10)), fL=((-7, 6), (-15, 9)), fRot=-25, nFoot=1),
    'jump': dict(P=(30, 41), lean=4, flow=-2, swing=-20, nA=((-3, 8), (2, 3)), fA=((5, 6), (9, 0)), nFist='U', fFist='U', cap=-110,
                 nL=((3, 7), (-2, 13)), fL=((8, 4), (7, 12)), nRot=-35, fRot=10, nFoot=1),
    'hurt': dict(P=(27, 41), lean=-14, tilt=-14, hd=(-1, 1), expr='hurt', flow=3, swing=-30, nA=((-6, 6), (-10, 0)), fA=((6, -3), (11, -7)),
                 nFist='L', fFist='U', cap=200, nL=((-2, 8), (-5, 15)), fL=((5, 8), (9, 15))),
    # COUP DE VISIÈRE : la casquette balaie devant lui, lames en avant
    'slashPre': dict(P=(29, 41), lean=-6, tilt=-4, expr='shout', swing=0, nA=((-6, 3), (-9, -4)), fA=((5, 6), (10, 3)), nFist='U', cap=-150,
                     nL=((-4, 8), (-7, 14)), fL=((6, 6), (9, 14))),
    'slash': dict(P=(27, 41), lean=10, hd=(1, 0), expr='shout', flow=2, swing=25, nA=((9, 3), (18, 3)), fA=((2, 8), (5, 2)), fFist='U', cap=-5, capFront=True,
                  nL=((-5, 7), (-9, 14)), fL=((7, 6), (9, 14))),
    # REVERS : la casquette revient en arrière en haut
    'slash2': dict(P=(28, 41), lean=4, expr='shout', flow=1, swing=15, nA=((8, -2), (15, -6)), fA=((3, 8), (7, 4)), nFist='U', cap=-40, capFront=True,
                   nL=((-4, 8), (-7, 14)), fL=((6, 6), (9, 14))),
    # COUPE HAUTE : la casquette part vers le ciel
    'slashUp': dict(armBehind=True, P=(29, 40), lean=-6, tilt=-8, expr='shout', flow=-1, swing=-5, nA=((11, -4), (24, -11)), fA=((3, 8), (8, 4)), cap=-75, capFront=True,
                    nL=((-3, 8), (-5, 15)), fL=((6, 5), (9, 12))),
    'slashUpPre': dict(P=(29, 45), lean=12, hd=(1, 1), expr='shout', swing=10, nA=((2, 7), (4, 13)), fA=((4, 6), (8, 4)), nFist='D', cap=120,
                       nL=((-2, 6), (-6, 10)), fL=((8, 3), (9, 10))),
    # FENTE : il se jette en avant, casquette tendue
    'lunge': dict(P=(24, 44), lean=18, hd=(2, 1), expr='shout', swing=40, nA=((12, 1), (24, 0)), fA=((-6, 4), (-11, -3)), fFist='U', cap=0, capFront=True,
                  nL=((-10, 4), (-19, 9)), fL=((11, 2), (15, 11))),
    # BALAYAGE BAS : accroupi, la visière au ras du sol
    'low': dict(P=(27, 48), lean=16, hd=(1, 0), expr='shout', swing=30, nA=((9, 6), (17, 11)), fA=((3, 7), (7, 12)), fFist='D', cap=20, capFront=True,
                nL=((-5, 4), (-12, 6)), fL=((9, 2), (13, 9))),
    # GRAND COUP DE LAMES (lourd) : armé loin derrière, puis tranché à bout de bras
    'bigPre': dict(P=(31, 42), lean=-12, tilt=-6, expr='shout', swing=-10, nA=((-8, 0), (-14, -6)), fA=((6, 4), (12, 1)), nFist='U', cap=-170,
                   nL=((-6, 7), (-11, 14)), fL=((8, 5), (11, 13))),
    'big': dict(P=(24, 43), lean=20, hd=(2, 0), expr='shout', flow=2, swing=45, nA=((13, 0), (26, 2)), fA=((-3, 8), (1, 3)), fFist='U', cap=10, capFront=True,
                nL=((-8, 5), (-15, 11)), fL=((10, 3), (14, 11))),
    # TOUPIE : bras écartés, la cape tourne (2 images)
    'spin': dict(P=(29, 42), lean=0, expr='shout', flow=3, swing=70, nA=((-8, 2), (-16, 0)), fA=((7, 2), (15, -1)), nFist='L', fFist='R', cap=180,
                 nL=((-4, 8), (-7, 14)), fL=((6, 6), (9, 14))),
    'spin2': dict(P=(29, 42), lean=0, expr='shout', flow=-3, swing=-40, nA=((8, 2), (16, 0)), fA=((-6, 2), (-12, -1)), nFist='R', fFist='L', cap=0, capFront=True,
                  nL=((-4, 8), (-7, 14)), fL=((6, 6), (9, 14))),
    'spinPre': dict(P=(29, 45), lean=8, expr='shout', swing=10, nA=((-3, 7), (-6, 12)), fA=((5, 6), (10, 4)), nFist='D', cap=100,
                    nL=((-3, 6), (-7, 10)), fL=((8, 3), (10, 10))),
    # COUP DE BOTTE PLONGEANT
    'stomp': dict(P=(30, 38), lean=-6, flow=-3, swing=-50, nA=((-4, -5), (-6, -12)), fA=((5, -4), (9, -11)), nFist='U', fFist='U', cap=-100,
                  nL=((-2, 7), (-4, 13)), fL=((4, 9), (6, 19)), fRot=60, nRot=-20),
    # LANCER DE CASQUETTE : armé derrière, puis la main vide part vers l'avant
    'throwPre': dict(P=(30, 41), lean=-8, tilt=-4, expr='shout', swing=0, nA=((-7, 2), (-10, -5)), fA=((6, 4), (12, 1)), nFist='U', cap=-160,
                     nL=((-5, 7), (-9, 14)), fL=((7, 6), (9, 14))),
    'throw': dict(P=(26, 42), lean=14, hd=(1, 0), expr='shout', flow=2, swing=35, nA=((10, 2), (20, 0)), fA=((-2, 8), (-5, 13)), nFist='O', fFist='D', cap=None,
                  nL=((-6, 7), (-11, 13)), fL=((8, 5), (11, 13))),
    # ALLEY-OOP : accroupi ballon en main, puis dunk à bout de bras vers le haut
    'dunkPre': dict(P=(29, 46), lean=10, hd=(1, 1), expr='shout', swing=10, nA=((3, 6), (8, 9)), fA=((4, 6), (9, 9)), nFist='R', fFist='R', bb=(3, -3), capFar=True, cap=110,
                    nL=((-3, 6), (-7, 10)), fL=((8, 3), (9, 10))),
    'dunk': dict(armBehind=True, P=(29, 39), lean=-4, tilt=-12, hd=(0, -1), expr='shout', flow=-2, swing=-30, nA=((11, -5), (23, -13)), fA=((3, 8), (6, 14)), nFist='U', fFist='D', bb=(2, -5), capFar=True, cap=100,
                 nL=((-3, 8), (-4, 16)), fL=((5, 7), (6, 15))),
    # FISSION : il brandit l'atome puis l'écrase au sol
    'atomPre': dict(armBehind=True, P=(29, 41), lean=-6, tilt=-6, expr='shout', swing=0, nA=((11, -3), (24, -9)), fA=((5, 6), (10, 3)), nFist='U', atom=(3, -4), capFar=True, cap=100,
                    nL=((-4, 8), (-7, 14)), fL=((6, 6), (9, 14))),
    'atom': dict(P=(27, 47), lean=22, hd=(2, 1), expr='shout', flow=2, swing=30, nA=((8, 6), (14, 12)), fA=((4, 7), (8, 12)), nFist='D', fFist='D', capFar=True, cap=100,
                 nL=((-6, 4), (-12, 8)), fL=((9, 2), (12, 9))),
    # E = MC² : il écrit au tableau, craie levée
    'write': dict(P=(29, 40), lean=2, tilt=-4, expr='normal', swing=6, nA=((8, 6), (15, 4)), fA=((4, 7.5), (7, 5)), nFist='R', chalk=-50, capFar=True, cap=100,
                  nL=((-3, 8), (-5.5, 14)), fL=((5, 7), (7, 14))),
    'write2': dict(P=(29, 40), lean=3, tilt=-2, expr='normal', swing=8, nA=((8, 5), (15, 2)), fA=((4, 7.5), (7, 5)), nFist='R', chalk=-40, capFar=True, cap=100,
                   nL=((-3, 8), (-5.5, 14)), fL=((5, 7), (7, 14))),
    # RÉACTION EN CHAÎNE : lunettes noires, atome serré, puis bras écartés
    'boomPre': dict(P=(29, 45), lean=10, hd=(1, 1), expr='goggles', swing=10, nA=((8, 7), (16, 5)), fA=((5, 6), (11, 4)), nFist='U', fFist='U', atom=(3, -4), capFar=True, cap=100,
                    nL=((-4, 6), (-9, 11)), fL=((8, 3), (10, 10))),
    'boom': dict(P=(29, 40), lean=-8, tilt=-10, expr='goggles', flow=-3, swing=-60, nA=((-7, -4), (-14, -11)), fA=((6, -4), (13, -11)), nFist='O', fFist='O', capFar=True, cap=100,
                 nL=((-5, 8), (-9, 14)), fL=((7, 7), (10, 14))),
}

if __name__ == '__main__':
    import sys
    names = sys.argv[1].split(',') if len(sys.argv) > 1 else list(POSES)
    frames = [frame(POSES[n]) for n in names]
    sheet(frames, '/tmp/claude-0/-home-claude/f0033496-c1d5-528d-bf27-ec4bc044ac61/scratchpad/nx_preview.png', sc=4)
