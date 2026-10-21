# Toro : toutes les postures, dans le style à aplats (pièces dessinées à la main, posées sur des articulations).
import math
from flat import *

W, H = 80, 64
OX = 11  # le bassin de la garde tombe au centre de la case (x = 40)
SKIN = mat('#9a4a28', '#d8854c', '#f4b578', '#ffd9a8')
HAIR = mat('#16121e', '#2e2838', '#4a4258')
RED = mat('#7a1020', '#c42232', '#ec4a4a', '#ff8a7a')
WHITE = mat('#8e94ac', '#d4d8e8', '#ffffff')
BELT = mat('#18161e', '#2e2a38', '#4e4a60')
PANTS = mat('#3e0a18', '#6e1828', '#982838')
SHOE = mat('#121016', '#2a2632', '#4e4a5a')
FACE = {'w': (255, 255, 255, 255), 'k': K, 'b': (40, 24, 20, 255), 'm': (120, 40, 30, 255), 'n': (190, 100, 60, 255), 'd': (154, 74, 40, 255), 'r': (200, 80, 70, 255)}
GLOVE = {'k': K, 'W': hexc('#ffffff'), 'w': hexc('#d4d8e8'), 'g': hexc('#8e94ac')}
GLOVE_FAR = {'k': K, 'W': hexc('#d4d8e8'), 'w': hexc('#aeb2c6'), 'g': hexc('#7a8098')}
FIST = {
    'R': ['.kkkkk..', 'kWWWWWk.', 'kWkkkWWk', 'kWWWkWWk', 'kwWWWkWk', 'kwwWWkWk', 'kgwwwkwk', '.kkkkkk.'],
    'U': ['.kkkkk..', 'kWkWkWk.', 'kWkWkWWk', 'kWWWWWWk', 'kwWkkWWk', 'kwWWWkWk', 'kgwwwwwk', '.kkkkkk.'],
}
FIST['L'] = [r[::-1] for r in FIST['R']]
FIST['D'] = FIST['U'][::-1]
FIST['UL'] = [r[::-1] for r in FIST['U']]
LIGHT = (0.7, -0.7)


CLOTH = [(RED, 0), (PANTS, 0), (mat('#2c0610', '#521220', '#782030'), 1)]  # vêtements recolorés en équipe

def sub(a, b): return (a[0] - b[0], a[1] - b[1])
def add(a, b): return (a[0] + b[0], a[1] + b[1])
def mul(a, k): return (a[0] * k, a[1] * k)
def rot(p, ang, o=(0, 0)):
    r = math.radians(ang); c, s = math.cos(r), math.sin(r); x, y = p[0] - o[0], p[1] - o[1]
    return (o[0] + x * c - y * s, o[1] + x * s + y * c)


def slab(p0, p1, w0, w1, M, base=1, dark=0.36, ext0=0.0, ext1=0.0):
    """Membre en aplats : quadrilatère, une bande d'ombre côté opposé à la lumière, un liseré clair côté lumière."""
    d = sub(p1, p0); L = math.hypot(*d) or 1; u = (d[0] / L, d[1] / L); n = (-u[1], u[0])
    if n[0] * LIGHT[0] + n[1] * LIGHT[1] < 0: n = (-n[0], -n[1])  # n : vers la lumière
    a = add(p0, mul(u, -ext0)); b = add(p1, mul(u, ext1))
    pa, pb = add(a, mul(n, w0 / 2)), add(b, mul(n, w1 / 2))
    qa, qb = add(a, mul(n, -w0 / 2)), add(b, mul(n, -w1 / 2))
    sil = [pa, pb, qb, qa]
    da, db = add(a, mul(n, -w0 / 2 + w0 * dark)), add(b, mul(n, -w1 / 2 + w1 * dark))
    la, lb = add(a, mul(n, w0 / 2 - 1.1)), add(b, mul(n, w1 / 2 - 1.1))
    shades = [([da, db, qb, qa], 0), ([pa, pb, lb, la], base + 1)]
    return Part(M, sil, shades=shades, base=base)


def fold(p, d, ln=2.5):
    return [p, add(p, mul(d, ln)), add(add(p, mul(d, ln)), (0.9, 0.9)), add(p, (0.9, 0.9))]


# ---------------- pièces fixes : torse, tête (repères de la garde) ----------------
P0 = (29, 40)   # bassin
N0 = (30.5, 20)  # base du cou


def torso(P, lean):
    T = lambda pts: [add(rot(sub(p, P0), lean), P) for p in pts]
    it = []
    it.append(Part(PANTS, T([(20, 39), (38, 38), (39, 44), (31, 44), (29, 46), (27, 44), (19, 44)]),
                   shades=[(T([(20, 39), (24, 39), (25, 44), (19, 44)]), 0), (T([(27, 44), (29, 46), (31, 44), (29, 43)]), 0)], outline='outer'))
    it.append(Part(RED, T([(19, 22), (27, 20), (34, 20), (39, 22), (38, 30), (37, 37), (21, 37), (20, 30)]),
                   shades=[(T([(19, 22), (24, 21), (24, 37), (21, 37), (20, 30)]), 0), (T([(35, 21), (39, 22), (38, 28), (36, 26)]), 2),
                           (T([(24, 30), (30, 33), (30, 34), (24, 31)]), 0)]))
    it.append(Part(SKIN, T([(28, 20), (33, 20), (31, 27)]), shades=[(T([(30, 20), (33, 20), (31, 25)]), 1)], base=2, outline=False))
    it.append(Part(WHITE, T([(32, 20), (34, 20), (32, 26), (31, 25)]), base=0, outline=False))
    it.append(Part(WHITE, T([(27, 20), (29, 20), (34, 36), (32, 36)]), shades=[(T([(27, 20), (28, 20), (33, 36), (32, 36)]), 1)], base=2, outline=False))
    it.append(Part(BELT, T([(20, 36), (38, 35), (38, 39), (20, 40)]), shades=[(T([(20, 36), (38, 35), (38, 36), (20, 37)]), 2)]))
    return it, T


def belt_tails(T, swing):
    k = T([(35, 37)])[0]
    a = add(k, rot((0, 8), swing)); b = add(k, rot((2.5, 8), swing * 1.3))
    return [slab(add(k, (-1.5, 1)), a, 2.4, 2.2, BELT, base=0, dark=0.4), slab(add(k, (0.5, 1)), b, 2.4, 2.2, BELT, base=1),
            Part(BELT, T([(33, 36), (37, 36), (37, 39), (33, 39)]), shades=[(T([(33, 36), (37, 36), (36, 37), (34, 37)]), 2)])]


def head(N, tilt=0, expr='normal', flow=0):
    T = lambda pts: [add(rot(sub(p, N0), tilt), N) for p in pts]
    o = (round(N[0] - N0[0]), round(N[1] - N0[1]))
    it = []
    # pans du bandeau
    f = flow
    it.append(Part(RED, T([(23, 7), (17, 5 + f), (13, 7 + f * 1.5), (16, 8 + f), (20, 9), (23, 9)]), shades=[(T([(13, 7 + f * 1.5), (17, 7 + f), (20, 9), (16, 8 + f)]), 0)]))
    it.append(Part(RED, T([(23, 9), (18, 10 + f * 0.5), (15, 14 + f * 0.5), (18, 13), (23, 11)]), base=0))
    it.append(Part(SKIN, T([(28, 18), (33, 18), (33, 22), (28, 22)]), base=0))
    it.append(Part(SKIN, T([(25, 6), (30, 4), (35, 5), (38, 8), (38, 12), (39, 14), (38, 15), (37, 18), (34, 20), (29, 20), (26, 17), (24, 13)]),
                   shades=[(T([(24, 13), (25, 6), (29, 9), (30, 20), (29, 20), (26, 17)]), 1), (T([(33, 19), (37, 18), (34, 20)]), 1), (T([(35, 9), (38, 10), (38, 12), (36, 13)]), 3)], base=2))
    it.append(Part(SKIN, T([(26, 12), (28, 12), (28, 16), (26, 16)]), base=0))
    it.append(Part(HAIR, T([(23, 14), (22, 9), (18, 7), (23, 6), (22, 2), (26, 3), (27, 0), (30, 2), (32, 0), (34, 2), (37, 1), (37, 4), (41, 4), (39, 7),
                            (39, 9), (36, 8), (33, 8), (30, 9), (27, 10), (26, 14)]),
                   shades=[(T([(26, 3), (30, 2), (32, 3), (28, 5)]), 2), (T([(33, 2), (37, 2), (37, 4), (34, 4)]), 2), (T([(23, 14), (22, 9), (25, 9), (26, 14)]), 0),
                           (T([(29, 5), (33, 4), (33, 5), (30, 6)]), 2), (T([(35, 5), (38, 5), (38, 6), (36, 6)]), 2), (T([(20, 7), (23, 6), (23, 7), (21, 8)]), 2)]))
    it.append(Part(RED, T([(23, 8), (39, 7), (39, 9), (23, 10)]), shades=[(T([(23, 9), (39, 8), (39, 9), (23, 10)]), 0), (T([(30, 7), (39, 7), (39, 7.6), (30, 8)]), 3)]))
    fx, fy = o
    if expr == 'hurt':
        it.append(stamp(["kkk.", "..kk", "...."], FACE, 32 + fx, 11 + fy))
        it.append(stamp(["kk", "mr"], FACE, 35 + fx, 16 + fy))
    elif expr == 'shout':
        it.append(stamp(["kkkb", "..wk", "..wk"], FACE, 32 + fx, 11 + fy))
        it.append(stamp(["kkk", "mrk"], FACE, 34 + fx, 16 + fy))
    else:
        it.append(stamp(["kkkb", "..wk", "..wk"], FACE, 32 + fx, 11 + fy))
        it.append(stamp(["mm"], FACE, 35 + fx, 17 + fy))
    it.append(stamp(["d"], FACE, 38 + fx, 14 + fy))
    return it


def arm(sh, el, wr, far, fist='R', fist_at=None):
    M = mat('#7c3a1e', '#b06a3c', '#d8955c', '#f0bd88') if far else SKIN
    it = [slab(sh, el, 5.2, 4.6, M, ext0=0.5, ext1=1.0), slab(el, wr, 4.4, 3.8, M, ext0=1.2, ext1=0.2)]
    d = sub(wr, el); L = math.hypot(*d) or 1; u = (d[0] / L, d[1] / L)
    wrap0 = add(wr, mul(u, -2.6))
    it.append(slab(wrap0, wr, 4.6, 4.6, WHITE if not far else mat('#7a8098', '#aeb2c6', '#d4d8e8'), base=1, dark=0.4))
    rows = FIST[fist]
    if fist_at is None:
        anchor = {'R': (0, 3.5), 'L': (7, 3.5), 'U': (3.5, 7), 'UL': (3.5, 7), 'D': (3.5, 0)}[fist]
        fist_at = (round(wr[0] - anchor[0] + u[0] * 0.5), round(wr[1] - anchor[1] + u[1] * 0.5))
    it.append(stamp(rows, GLOVE_FAR if far else GLOVE, *fist_at))
    # contour noir du poing (le tampon a déjà le sien)
    return it


def leg(hip, kn, an, far, foot=1, foot_rot=0):
    M = mat('#2c0610', '#521220', '#782030') if far else PANTS
    it = []
    # chaussure
    shoe = [(-4, 1), (4, 1), (8, 3), (8, 5), (-4, 5)]
    shoe = [add(rot((x * foot, y), foot_rot * foot), an) for x, y in shoe]
    hi = [add(rot((x * foot, y), foot_rot * foot), an) for x, y in [(-2, 1), (4, 1), (6, 2), (-1, 2)]]
    it.append(Part(SHOE, shoe, shades=[(hi, 2)]))
    d = sub(an, kn); L = math.hypot(*d) or 1; u = (d[0] / L, d[1] / L)
    it.append(slab(kn, an, 7.2, 6.2, M, ext0=1.5))
    it.append(slab(add(an, mul(u, -3)), add(an, mul(u, 0.6)), 6.6, 6.6, WHITE if not far else mat('#6e7488', '#9ea4b8', '#c4c8d8'), dark=0.4))
    it.append(slab(hip, kn, 8.6, 7.4, M, ext0=1.0, ext1=1.2))
    # pli au genou
    dk = sub(kn, hip); Lk = math.hypot(*dk) or 1
    n = (-dk[1] / Lk, dk[0] / Lk)
    it[-1].shades.append((fold(add(kn, mul(n, -1)), mul(n, 1), 3), 0))
    return it


def frame(p):
    P = (p['P'][0] + OX, p['P'][1]); lean = p.get('lean', 0)
    tor, T = torso(P, lean)
    N = add(T([N0])[0], p.get('hd', (0, 0)))
    sN = T([(18.5, 22.5)])[0]; sF = T([(37, 22.5)])[0]
    hN = T([(23.5, 42)])[0]; hF = T([(33.5, 42)])[0]
    it = []
    hd = head(N, p.get('tilt', 0), p.get('expr', 'normal'), p.get('flow', 0))
    it += hd[:2]  # pans du bandeau derrière
    it += arm(sF, add(sF, p['fA'][0]), add(sF, p['fA'][1]), True, p.get('fFist', 'R'))
    it += leg(hF, add(hF, p['fL'][0]), add(hF, p['fL'][1]), True, p.get('fFoot', 1), p.get('fRot', 0))
    it += leg(hN, add(hN, p['nL'][0]), add(hN, p['nL'][1]), False, p.get('nFoot', -1), p.get('nRot', 0))
    it += tor
    it += belt_tails(T, p.get('swing', 0))
    it += hd[2:]
    it += arm(sN, add(sN, p['nA'][0]), add(sN, p['nA'][1]), False, p.get('nFist', 'R'))
    return compose(it, W, H)


# Postures : articulations relatives à l'épaule (bras) et à la hanche (jambes) : (coude/genou, poignet/cheville)
POSES = {
    'idle0': dict(P=(29, 40), nA=((0, 9.5), (6.5, -1)), fA=((4, 7.5), (8, 5.5)), nL=((-3, 8), (-6, 15)), fL=((5.5, 7), (7.5, 15))),
    'idle1': dict(P=(29, 41), hd=(0, 1), nA=((0, 9.5), (6.5, 0)), fA=((4, 7.5), (8, 6.5)), nL=((-3.5, 7.5), (-6, 14)), fL=((6, 6.5), (7.5, 14))),
    'run0': dict(P=(30, 41), lean=12, swing=-25, flow=2, nA=((-5, 7), (-10, 11)), fA=((5, 6), (11, 2)), fFist='R', nFist='L',
                 nL=((-7, 6), (-14, 10)), fL=((7, 4), (8, 13)), nRot=-30),
    'run1': dict(P=(30, 40), lean=12, swing=-30, flow=3, nA=((5, 6), (11, 1)), fA=((-3, 8), (0, 14)), fFist='D', nFist='R',
                 nL=((10, 2), (13, 10)), fL=((-7, 6), (-15, 9)), fRot=-25, nFoot=1),
    'jump': dict(P=(30, 41), lean=4, swing=20, flow=-2, nA=((-3, 8), (2, 3)), fA=((5, 6), (9, 0)), nFist='U', fFist='U',
                 nL=((3, 7), (-2, 13)), fL=((8, 4), (7, 12)), nRot=-35, fRot=10, nFoot=1),
    'hurt': dict(P=(27, 41), lean=-14, tilt=-14, hd=(-1, 1), expr='hurt', swing=25, flow=3, nA=((-6, 6), (-10, 0)), fA=((6, -3), (11, -7)),
                 nFist='L', fFist='U', nL=((-2, 8), (-5, 15)), fL=((5, 8), (9, 15))),
    'jab': dict(P=(26, 41), lean=8, hd=(1, 0), expr='shout', nA=((10, 2), (27, 1)), fA=((1, 8), (3, 0)), fFist='U',
                nL=((-5, 7), (-9, 14)), fL=((7, 6), (9, 14))),
    'heavy': dict(P=(25, 42), lean=16, hd=(2, 0), expr='shout', swing=-20, flow=2, nA=((12, 1), (28, -1)), fA=((-2, 8), (2, 3)), fFist='U',
                  nL=((-7, 6), (-13, 12)), fL=((9, 4), (12, 12))),
    'up': dict(P=(29, 39), lean=-6, hd=(0, 0), tilt=-6, expr='shout', flow=-1, nA=((11, -2), (19, -12)), fA=((3, 8), (8, 4)), nFist='U', fFist='R',
               nL=((-3, 8), (-5, 15)), fL=((6, 4), (9, 10)), fRot=20),
    'sweep': dict(P=(27, 48), lean=10, hd=(1, 0), expr='shout', swing=30, nA=((-4, 6), (-6, 12)), fA=((5, 5), (10, 3)), nFist='D', fFist='R',
                  nL=((-4, 4), (-12, 6)), fL=((10, 2), (22, 6)), nRot=0, fRot=-10),
    'stomp': dict(P=(30, 41), lean=-4, swing=-25, flow=-3, nA=((-5, 6), (-8, 0)), fA=((5, 4), (10, -1)), nFist='UL', fFist='U',
                  nL=((-2, 7), (-4, 14)), fL=((4, 9), (5, 19)), fRot=60, nRot=-20),
    'rkick': dict(P=(26, 40), lean=-18, tilt=-8, hd=(-2, 1), expr='shout', swing=30, nA=((-4, 7), (-1, 1)), fA=((5, 5), (8, -1)), nFist='U', fFist='U',
                  nL=((-2, 8), (-4, 16)), fL=((9, -1), (19, -3)), fRot=-80),
}

if __name__ == '__main__':
    import sys
    names = sys.argv[1].split(',') if len(sys.argv) > 1 else list(POSES)
    frames = [frame(POSES[n]) for n in names]
    for n, f in zip(names, frames): f.save(f'toro/{n}.png')
    sheet(frames, 'toro_all.png', sc=5)
