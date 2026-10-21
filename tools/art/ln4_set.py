# LN4 : pilote de F1 et joueur de badminton. Combinaison de course noire à bandes orange (épaules, flancs,
# jambes), gants et bottines noir et orange, cheveux bruns bouclés en volume, barbe courte.
# Pas de logo de marque : seulement un « 4 » orange sur la poitrine.
# Accessoires (dessinés selon la posture) : raquette de badminton (rq), casque orange (hm), bouteille de
# champagne (bt), volant de badminton (sc), tenus dans la main proche (ou lointaine pour le volant).
import math
from flat import *
from toro_set import slab, fold, sub, add, mul, rot, FIST, P0, N0

W, H = 80, 64
OX = 11
SKIN = mat('#9a6446', '#d09a74', '#ecbc96', '#f8d6b8')
HAIR = mat('#140c08', '#2c1a10', '#4a2e1a', '#6a4428')
SUIT = mat('#08080c', '#1a1a22', '#2e2e3a', '#4a4a58')
SUIT_FAR = mat('#060608', '#121218', '#22222c')
ORA = mat('#a84400', '#ff7a00', '#ffa040', '#ffd09a')
ORA_FAR = mat('#803400', '#cc6200', '#e88a30')
BOOT = mat('#08080c', '#1c1c24', '#3a3a46')
FACE = {'w': (255, 255, 255, 255), 'k': K, 'b': (52, 30, 16, 255), 'm': (150, 76, 60, 255), 'r': (205, 92, 80, 255)}
GLOVE = {'k': K, 'W': hexc('#40404c'), 'w': hexc('#26262e'), 'g': hexc('#ff7a00')}
GLOVE_FAR = {'k': K, 'W': hexc('#30303a'), 'w': hexc('#1c1c24'), 'g': hexc('#cc6200')}
BEARD = (118, 76, 52, 255)
BEARD_D = (84, 52, 34, 255)
FOUR = {'o': hexc('#ff8a1e')}
OPEN = ['.kkkk...', 'kWWWWk..', 'kWWWWWk.', 'kWWWWWk.', 'kwWWWWk.', 'kgwwwwk.', '.kkkkk..']


def ell(c, rx, ry, n=14, a0=0.0, a1=6.283, rot_=0.0):
    out = []
    for t in range(n + 1):
        a = a0 + (a1 - a0) * t / n
        x, y = rx * math.cos(a), ry * math.sin(a)
        cr, sr = math.cos(rot_), math.sin(rot_)
        out.append((c[0] + x * cr - y * sr, c[1] + x * sr + y * cr))
    return out


def torso(P, lean):
    T = lambda pts: [add(rot(sub(p, P0), lean), P) for p in pts]
    it = []
    # bas de la combinaison (bassin)
    it.append(Part(SUIT, T([(20, 39), (38, 39), (39, 45), (31, 45), (29, 47), (27, 45), (19, 45)]), shades=[(T([(20, 39), (24, 39), (25, 45), (19, 45)]), 0)], outline='outer'))
    # buste : combinaison noire, épaules et flancs orange, col montant
    it.append(Part(SUIT, T([(19, 22), (26, 20), (35, 20), (39, 22), (38.4, 31), (38.6, 40.5), (20.2, 40.5), (20, 31)]),
                   shades=[(T([(19, 22), (23.5, 21), (24, 40.5), (20.2, 40.5), (20, 31)]), 0), (T([(34, 21), (39, 22), (38.6, 28), (35.4, 26)]), 2),
                           # épaules orange
                           (T([(19, 22), (25, 20.4), (24.6, 24.6), (19.6, 26.2)]), -1)]))
    it.append(Part(ORA, T([(19.4, 22.4), (24.8, 20.6), (24.2, 24), (20, 25.6)]), base=1, outline=False))
    it.append(Part(ORA, T([(34.6, 20.6), (38.8, 22.2), (38.6, 25), (34.4, 23.6)]), base=2, outline=False))
    # bande orange sur le flanc (de l'aisselle à la hanche)
    it.append(Part(ORA, T([(36.6, 25.6), (38.4, 26.4), (38.6, 40.4), (36.8, 40.4)]), base=1, outline=False))
    it.append(Part(ORA, T([(20.2, 27), (21.6, 26.4), (21.8, 40.4), (20.2, 40.4)]), base=0, outline=False))
    # ceinture de la combinaison
    it.append(Part(SUIT, T([(20.2, 38.6), (38.6, 38.6), (38.6, 40.6), (20.2, 40.6)]), base=2, outline=False))
    # col montant orange
    it.append(Part(ORA, T([(27, 19.2), (34, 19.2), (34.4, 21.6), (26.6, 21.6)]), base=1, outline=False))
    # « 4 » orange sur la poitrine
    c = T([(31.6, 27.2)])[0]
    it.append(stamp(['o.o', 'o.o', 'ooo', '..o', '..o'], FOUR, round(c[0]), round(c[1])))
    return it, T


def head(N, tilt, expr, flow):
    T = lambda pts: [add(rot(sub(p, N0), tilt), N) for p in pts]
    o = (round(N[0] - N0[0]), round(N[1] - N0[1]))
    it = []
    f = flow
    # boucles de derrière : du volume, jusqu'en haut de la nuque (bord en vagues = boucles)
    it.append(Part(HAIR, T([(22.4, 8), (24, 4.4), (27.4, 3.4), (28.8, 9), (28.6, 14.6), (27.6, 17.6), (26.4, 19.4 + f * 0.2), (25, 18.4), (23.6, 19.2), (22.6, 17.2), (21.2, 16.4), (21.6, 14), (20.6, 12.4), (21.6, 10.6)]),
                   shades=[(T([(21.2, 16.4), (23.4, 14.6), (24.4, 17.6), (23.6, 19.2), (22.6, 17.2)]), 0), (T([(22.8, 8), (25.4, 6.4), (26, 10.4), (23.2, 11.6)]), 2),
                           (T([(24.4, 12.6), (25.6, 12.2), (25.8, 13.6), (24.6, 14)]), 3)], base=1))
    it.append(Part(SKIN, T([(28, 18), (33, 18), (33, 22), (28, 22)]), base=0))
    # visage
    it.append(Part(SKIN, T([(25, 6), (30, 4), (35, 5), (38, 8), (38.4, 11.5), (39.6, 13.6), (38.6, 14.6), (38.2, 16), (37, 18.6), (34, 20.4), (30, 20.4), (27, 18), (24.5, 13)]),
                   shades=[(T([(24.5, 13), (25, 6), (29, 9), (29.6, 20.4), (28.6, 20.2), (27, 18)]), 1),
                           (T([(35, 9), (38, 10), (38.2, 12.4), (36, 13)]), 3), (T([(37.2, 12), (39.6, 13.6), (38.6, 14.6), (37.4, 14.2)]), 3)], base=2))
    # boucles brunes du dessus : bord irrégulier, une mèche qui tombe sur le front
    curls = [(25.4, 14.6), (23.6, 12.6), (24, 10.4), (22.8, 8.6), (23.6, 6.4), (23.4, 4.4), (25.4, 2.6), (26.6, 0.4), (29, 0.6), (30.6, -1), (32.8, 0), (34.6, -1), (36.4, 0.4), (38.6, 0.4),
             (39.6, 2.4), (41.6, 3.2), (41.4, 5.4), (42.4, 7 + f * 0.3), (40.6, 8.6), (39.4, 7.4), (38.4, 9.2), (37, 7), (35.6, 8.6), (34.4, 6.4), (33, 8.2), (31.6, 6.8), (30.2, 8.6),
             (28.8, 8.2), (28, 10.8), (28.4, 13), (27, 14.4)]
    it.append(Part(HAIR, T(curls),
                   shades=[(T([(26.6, 2.6), (30, 1.2), (33, 0.8), (32, 2.2), (28.6, 3.2), (26.4, 4.6)]), 3), (T([(35, 1.4), (38.6, 2.8), (40.2, 4.8), (36.4, 3.6)]), 2),
                           (T([(24.6, 15.6), (23, 12.2), (23, 8.6), (25.4, 9.4), (27, 13.4), (26.6, 17)]), 0),
                           (T([(29.6, 4.2), (31, 3.6), (31.4, 5), (30, 5.4)]), 2), (T([(34.6, 3.6), (36, 3.2), (36.4, 4.6), (35, 5)]), 2)]))
    fx, fy = o
    # barbe courte brune (joues, menton) + moustache
    st = {'s': BEARD, 'd': BEARD_D}
    it.append(stamp(["s........", "s.......s", ".s.....s.", "..sdddd.."], st, 29 + fx, 15 + fy))
    it.append(stamp(["dd.d"], st, 33 + fx, 15 + fy))
    if expr == 'hurt':
        it.append(stamp(["kkkk.kk", "....k..", ".kkk..."], FACE, 31 + fx, 9 + fy))
        it.append(stamp(["mmr."], FACE, 34 + fx, 17 + fy))
    elif expr == 'shout':
        it.append(stamp(["bbbb..bb", "...wk.wk", "...wk..."], FACE, 30 + fx, 9 + fy))
        it.append(stamp(["kkk", "mrk"], FACE, 34 + fx, 16 + fy))
    else:
        it.append(stamp(["bbbb..bb", "...wk.wk", "...wk..."], FACE, 30 + fx, 9 + fy))
        it.append(stamp([".mmk"], FACE, 33 + fx, 17 + fy))
    return it


def racket(wr, ang):
    """Raquette de badminton tenue dans la main (ang : direction du manche vers la tête, en degrés)."""
    u = (math.cos(math.radians(ang)), math.sin(math.radians(ang))); n = (-u[1], u[0])
    h0 = add(wr, mul(u, -1.5)); h1 = add(wr, mul(u, 4)); s1 = add(wr, mul(u, 11))
    c = add(wr, mul(u, 16.5))
    a = math.atan2(u[1], u[0])
    it = [slab(h0, h1, 2.4, 2.4, ORA, base=1), slab(h1, s1, 1.2, 1.2, SUIT, base=2, dark=0.3)]
    it.append(Part(SUIT, ell(c, 6.2, 4.4, 16, rot_=a), base=2))
    it.append(Part(mat('#8a8c98', '#c8ccd8', '#eef0f6'), ell(c, 4.6, 3.0, 14, rot_=a), base=1, outline=False,
                   shades=[(ell(add(c, mul(n, -1.2)), 3.4, 1.4, 10, rot_=a), 2)]))
    # cordage : deux fils dans chaque sens
    for k in (-1.6, 1.6):
        p = add(c, mul(u, k))
        it.append(Part(mat('#6a6c78', '#6a6c78'), [add(p, mul(n, -2.8)), add(p, mul(n, 2.8)), add(add(p, mul(n, 2.8)), mul(u, 0.5)), add(add(p, mul(n, -2.8)), mul(u, 0.5))], base=0, outline=False))
    return it


def helmet(c, ang):
    """Casque intégral orange à bandes noires, visière fumée (ang = où regarde la visière)."""
    a = math.radians(ang); u = (math.cos(a), math.sin(a)); n = (-u[1], u[0])
    it = [Part(ORA, ell(c, 6.4, 6.0, 18), base=1, shades=[(ell(add(c, (1.6, 1.8)), 4.6, 4.2, 12, 0.2, 2.6), 0), (ell(add(c, (-2, -2.4)), 2.2, 1.4, 8), 3)])]
    it.append(Part(SUIT, [add(c, add(mul(u, -6.2), mul(n, -1))), add(c, add(mul(u, 1), mul(n, -6.0))), add(c, add(mul(u, 2.4), mul(n, -5.2))), add(c, add(mul(u, -5.4), mul(n, 0.4)))], base=1, outline=False))
    it.append(Part(mat('#101018', '#2a3040', '#5a6a88'), [add(c, add(mul(u, 1.2), mul(n, -3.4))), add(c, add(mul(u, 6.4), mul(n, -2))), add(c, add(mul(u, 6.4), mul(n, 1.6))), add(c, add(mul(u, 1.6), mul(n, 1.4)))],
                   base=1, shades=[([add(c, add(mul(u, 3), mul(n, -2.8))), add(c, add(mul(u, 5.8), mul(n, -1.8))), add(c, add(mul(u, 5.6), mul(n, -1))), add(c, add(mul(u, 3), mul(n, -1.8)))], 2)]))
    return it


def bottle(wr, ang):
    """Bouteille de champagne : verre vert sombre, coiffe dorée (ang : direction du goulot)."""
    u = (math.cos(math.radians(ang)), math.sin(math.radians(ang)))
    b0 = add(wr, mul(u, -3)); b1 = add(wr, mul(u, 5)); n1 = add(wr, mul(u, 11.5))
    return [slab(b0, b1, 5.4, 5.4, mat('#06200e', '#0e4a20', '#2a7a40'), base=1),
            slab(b1, add(b1, mul(u, 1.6)), 5.0, 2.6, mat('#06200e', '#0e4a20', '#2a7a40'), base=1),
            slab(add(b1, mul(u, 1.4)), n1, 2.8, 2.6, mat('#8a6410', '#e0b030', '#fff0a0'), base=1)]


def shuttle(c, ang):
    """Volant de badminton : bouchon blanc arrondi, jupe de plumes (ang : direction du bouchon)."""
    u = (math.cos(math.radians(ang)), math.sin(math.radians(ang))); n = (-u[1], u[0])
    skirt = [add(c, mul(n, -1.6)), add(c, mul(n, 1.6)), add(add(c, mul(u, -6)), mul(n, 3.6)), add(add(c, mul(u, -6)), mul(n, -3.6))]
    return [Part(mat('#9ea4b8', '#dfe3ee', '#ffffff'), skirt, base=1, shades=[([add(c, mul(n, -1.6)), add(c, (0, 0)), add(add(c, mul(u, -6)), (0, 0)), add(add(c, mul(u, -6)), mul(n, -3.6))], 0)]),
            Part(mat('#b0b4c0', '#ffffff', '#ffffff'), ell(add(c, mul(u, 1.4)), 1.8, 1.8, 8), base=1)]


def arm(sh, el, wr, far, fist):
    d = sub(wr, el); L = math.hypot(*d) or 1; u = (d[0] / L, d[1] / L)
    M = SUIT_FAR if far else SUIT
    O = ORA_FAR if far else ORA
    it = [slab(sh, el, 5.6, 5.0, M, ext0=0.8, ext1=1.0), slab(el, wr, 5.0, 4.6, M, ext0=1.2, ext1=0.2)]
    # bande orange le long du bras (épaule -> coude)
    it.append(slab(sh, add(sh, mul(sub(el, sh), 0.75)), 2.0, 1.6, O, base=1, dark=0.3))
    if fist is None: return it
    rows = OPEN if fist == 'O' else FIST[fist]
    anchor = {'R': (0, 3.5), 'L': (7, 3.5), 'U': (3.5, 7), 'UL': (3.5, 7), 'D': (3.5, 0), 'O': (1, 3)}[fist]
    at = (round(wr[0] - anchor[0] + u[0] * 1.2), round(wr[1] - anchor[1] + u[1] * 1.2))
    it.append(stamp(rows, GLOVE_FAR if far else GLOVE, *at))
    return it


def leg(hip, kn, an, far, foot, foot_rot):
    M = SUIT_FAR if far else SUIT
    O = ORA_FAR if far else ORA
    it = []
    R = lambda pts: [add(rot((x * foot, y), foot_rot * foot), an) for x, y in pts]
    # bottine de course : noire, talon et lacets orange
    it.append(Part(BOOT, R([(-3.5, 1.2), (3, 1.2), (8, 3.0), (9, 4.4), (8.5, 5), (-3.8, 5)]), shades=[(R([(-3.6, 3.6), (-1, 3.6), (-1, 5), (-3.8, 5)]), -1)]))
    it.append(Part(ORA if not far else ORA_FAR, R([(-3.6, 3.4), (-0.6, 3.4), (-0.6, 5), (-3.8, 5)]), base=1, outline=False))
    it.append(Part(ORA if not far else ORA_FAR, R([(1.2, 1.6), (4, 1.8), (4.4, 2.8), (1.4, 2.6)]), base=2, outline=False))
    it.append(slab(kn, add(an, mul(sub(an, kn), 0.08)), 6.6, 6.0, M, ext0=1.5))
    it.append(slab(hip, kn, 7.8, 6.8, M, ext0=1.0, ext1=1.2))
    # bande orange sur le côté de la jambe
    it.append(slab(add(hip, mul(sub(kn, hip), 0.1)), kn, 1.8, 1.6, O, base=1, dark=0.3))
    it.append(slab(kn, add(kn, mul(sub(an, kn), 0.85)), 1.6, 1.4, O, base=1, dark=0.3))
    dk = sub(kn, hip); Lk = math.hypot(*dk) or 1
    n = (-dk[1] / Lk, dk[0] / Lk)
    it[-3].shades.append((fold(add(kn, mul(n, -1)), mul(n, 1), 2.6), 0))
    return it


def frame(p):
    P = (p['P'][0] + OX, p['P'][1]); lean = p.get('lean', 0)
    tor, T = torso(P, lean)
    N = add(T([N0])[0], p.get('hd', (0, 0)))
    sN = T([(19, 22.5)])[0]; sF = T([(37, 22.5)])[0]
    hN = T([(23.5, 43)])[0]; hF = T([(33.5, 43)])[0]
    wN = add(sN, p['nA'][1]); wF = add(sF, p['fA'][1])
    it = []
    if p.get('sc') is not None and p.get('scFar'): it += shuttle(add(wF, (2, -3)), p['sc'])
    it += arm(sF, add(sF, p['fA'][0]), wF, True, p.get('fFist', 'R'))
    it += leg(hF, add(hF, p['fL'][0]), add(hF, p['fL'][1]), True, p.get('fFoot', 1), p.get('fRot', 0))
    it += leg(hN, add(hN, p['nL'][0]), add(hN, p['nL'][1]), False, p.get('nFoot', -1), p.get('nRot', 0))
    it += tor
    it += head(N, p.get('tilt', 0), p.get('expr', 'normal'), p.get('flow', 0))
    if p.get('rq') is not None and not p.get('rqFront'): it += racket(wN, p['rq'])
    it += arm(sN, add(sN, p['nA'][0]), wN, False, p.get('nFist', 'R'))
    if p.get('bt') is not None: it += bottle(wN, p['bt'])
    if p.get('rq') is not None and p.get('rqFront'): it += racket(wN, p['rq'])
    if p.get('hm') is not None: it += helmet(add(wN, p.get('hmOff', (4, 0))), p['hm'])
    if p.get('sc') is not None and not p.get('scFar'): it += shuttle(add(wN, p.get('scOff', (6, -2))), p['sc'])
    return compose(it, W, H)


IDLE = dict(P=(29, 40), nA=((1, 9.5), (6.5, 2)), fA=((4, 7.5), (8, 5)), rq=115, nL=((-3, 8), (-5.5, 14)), fL=((5, 7), (7, 14)))
POSES = {
    'idle0': IDLE,
    'idle1': dict(IDLE, P=(29, 41), hd=(0, 1), nA=((1, 9.5), (6.5, 3)), fA=((4, 7.5), (8, 6)), nL=((-3.5, 7.5), (-5.5, 13)), fL=((5.5, 6.5), (7, 13))),
    'run0': dict(P=(30, 41), lean=10, flow=2, nA=((-5, 7), (-10, 11)), fA=((5, 6), (11, 2)), nFist='L', rq=200,
                 nL=((-7, 6), (-14, 10)), fL=((7, 4), (8, 13)), nRot=-30),
    'run1': dict(P=(30, 40), lean=10, flow=3, nA=((5, 6), (11, 1)), fA=((-3, 8), (0, 14)), fFist='D', rq=-30,
                 nL=((10, 2), (13, 10)), fL=((-7, 6), (-15, 9)), fRot=-25, nFoot=1),
    'jump': dict(P=(30, 41), lean=4, flow=-2, nA=((-3, 8), (2, 3)), fA=((5, 6), (9, 0)), nFist='U', fFist='U', rq=160,
                 nL=((3, 7), (-2, 13)), fL=((8, 4), (7, 12)), nRot=-35, fRot=10, nFoot=1),
    'hurt': dict(P=(27, 41), lean=-14, tilt=-14, hd=(-1, 1), expr='hurt', flow=3, nA=((-6, 6), (-10, 0)), fA=((6, -3), (11, -7)),
                 nFist='L', fFist='U', rq=150, nL=((-2, 8), (-5, 15)), fL=((5, 8), (9, 15))),
    # COUP DROIT (raquette) : la raquette balaie devant lui
    'swingPre': dict(P=(29, 41), lean=-6, tilt=-4, expr='shout', nA=((-6, 3), (-9, -4)), fA=((5, 6), (10, 3)), nFist='U', rq=-160,
                     nL=((-4, 8), (-7, 14)), fL=((6, 6), (9, 14))),
    'swing': dict(P=(27, 41), lean=10, hd=(1, 0), expr='shout', flow=2, nA=((9, 3), (18, 3)), fA=((2, 8), (5, 2)), fFist='U', rq=-10, rqFront=True,
                  nL=((-5, 7), (-9, 14)), fL=((7, 6), (9, 14))),
    # AMORTI / SMASH HAUT : la raquette part vers le ciel
    'flick': dict(P=(29, 40), lean=-6, tilt=-8, expr='shout', flow=-1, nA=((6, -5), (10, -13)), fA=((3, 8), (8, 4)), rq=-80, rqFront=True,
                  nL=((-3, 8), (-5, 15)), fL=((6, 5), (9, 12))),
    # COUP DE CASQUE : il tient son casque et le pousse devant lui
    'helmet': dict(P=(26, 42), lean=14, hd=(1, 0), expr='shout', flow=2, nA=((10, 3), (20, 2)), fA=((8, 4), (17, 3)), fFist='R', hm=0, hmOff=(5, 0),
                   nL=((-6, 7), (-11, 13)), fL=((8, 5), (11, 13))),
    # GLISSADE : glissé au sol, jambe tendue
    'slide': dict(P=(27, 49), lean=-30, tilt=-14, hd=(-1, 1), expr='shout', flow=3, nA=((-6, 4), (-12, 6)), fA=((-2, 7), (-7, 9)), nFist='L', fFist='L', rq=180,
                  nL=((9, 2), (19, 3)), fL=((7, 4), (14, 8)), nRot=-80, fRot=-40, nFoot=1),
    # PLONGEON : raquette pointée vers le bas
    'dive': dict(P=(30, 38), lean=-6, flow=-3, nA=((3, 8), (6, 14)), fA=((5, 4), (10, -1)), fFist='U', rq=80, rqFront=True,
                 nL=((-2, 7), (-4, 13)), fL=((4, 9), (5, 19)), fRot=60, nRot=-20),
    # FEUX ÉTEINTS : position de départ, puis il s'élance très bas
    'dashPre': dict(P=(29, 47), lean=22, hd=(1, 1), expr='shout', nA=((4, 7), (8, 13)), fA=((5, 6), (9, 11)), nFist='D', fFist='D', rq=100,
                    nL=((-6, 4), (-12, 8)), fL=((8, 2), (11, 9))),
    'dash': dict(P=(25, 45), lean=34, tilt=12, hd=(3, 2), expr='shout', flow=3, nA=((8, 4), (15, 1)), fA=((6, 5), (12, 3)), nFist='R', fFist='R',
                 nL=((-9, 4), (-17, 8)), fL=((10, 1), (15, 9)), nRot=-20),
    # SMASH : saut, raquette armée derrière la tête puis frappée vers l'avant et le haut
    'smashPre': dict(P=(30, 42), lean=-12, tilt=-8, expr='shout', flow=-2, nA=((-4, -6), (-9, -12)), fA=((5, 2), (11, -4)), fFist='U', rq=150,
                     nL=((-4, 8), (-7, 14)), fL=((6, 6), (9, 13))),
    'smash': dict(P=(28, 39), lean=8, tilt=-4, hd=(1, -1), expr='shout', flow=1, nA=((10, -3), (17, -8)), fA=((2, 8), (6, 4)), rq=-40, rqFront=True,
                  nL=((-3, 8), (-6, 14)), fL=((6, 4), (9, 10)), fRot=20),
    # BURN-OUT : accroupi, les deux mains sur un volant imaginaire, la fumée sort des pieds
    'burnPre': dict(P=(29, 44), lean=10, expr='shout', nA=((6, 6), (12, 4)), fA=((6, 5), (12, 2)), nFist='R', fFist='R',
                    nL=((-4, 6), (-9, 11)), fL=((8, 3), (10, 10))),
    'burn': dict(P=(29, 47), lean=18, hd=(1, 1), expr='shout', flow=2, nA=((6, 5), (13, 2)), fA=((6, 4), (13, 0)), nFist='R', fFist='R',
                 nL=((-6, 4), (-12, 8)), fL=((9, 2), (13, 9))),
    # SERVICE : il lance le volant de la main lointaine et frappe en dessous
    'servePre': dict(P=(29, 41), lean=-4, nA=((-5, 6), (-9, 10)), fA=((5, 2), (9, -4)), nFist='D', fFist='U', rq=150, sc=90, scFar=True,
                     nL=((-4, 8), (-7, 14)), fL=((6, 6), (9, 14))),
    'serve': dict(P=(27, 41), lean=8, hd=(1, 0), expr='shout', nA=((8, 6), (16, 2)), fA=((5, 6), (9, 3)), rq=-30, rqFront=True,
                  nL=((-5, 7), (-9, 14)), fL=((7, 6), (9, 14))),
    # CHAMPAGNE : bouteille brandie au-dessus de la tête, comme sur le podium
    'champ': dict(P=(29, 39), lean=-4, tilt=-12, hd=(0, -1), expr='shout', flow=-2, nA=((10, -2), (17, -8)), fA=((5, -5), (8, -12)), nFist='U', fFist='U', bt=-55,
                  nL=((-3, 8), (-4, 16)), fL=((5, 7), (6, 15))),
    # ARRÊT AU STAND : casque à la main, il fait signe à son équipe
    'pit': dict(P=(29, 40), lean=0, tilt=-6, expr='shout', nA=((2, 9), (7, 4)), fA=((4, -6), (6, -14)), fFist='O', hm=-20, hmOff=(4, 2),
                nL=((-4, 8), (-6.5, 14)), fL=((5, 7), (7, 14))),
}

if __name__ == '__main__':
    import sys
    names = sys.argv[1].split(',') if len(sys.argv) > 1 else list(POSES)
    frames = [frame(POSES[n]) for n in names]
    sheet(frames, '/tmp/claude-0/-home-claude/f0033496-c1d5-528d-bf27-ec4bc044ac61/scratchpad/ln4_preview.png', sc=4)
