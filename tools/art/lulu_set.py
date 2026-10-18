# Dead Lulu : avocat en costume trois pièces gris, cheveux en bataille, moustache, guitare acoustique.
import math
from flat import *
from toro_set import slab, fold, sub, add, mul, rot, FIST, P0, N0

W, H = 80, 64
OX = 11
SKIN = mat('#a8603e', '#e0a07a', '#f4c4a0', '#ffe0c8')
SKIN_FAR = mat('#80442a', '#b87a58', '#d49c78', '#e8bc98')
HAIR = mat('#1e1008', '#45281a', '#6e4426')
SUIT = mat('#3a404e', '#69717f', '#959dab', '#c0c6d0')
SUIT_FAR = mat('#2a2e3a', '#4e5562', '#6e7582')
PANTS = mat('#323743', '#5a6270', '#828a98')
PANTS_FAR = mat('#22262f', '#40464f', '#5c636e')
VEST = mat('#24272f', '#3e434d', '#5a606c')
WHITE = mat('#9ea4b8', '#dfe3ee', '#ffffff')
TIE = mat('#1a2c66', '#3050aa', '#5a7ae0')
SHOE = mat('#0c0a10', '#211f28', '#4a4656')
GBODY = mat('#7a3410', '#c8661c', '#ec9a3a', '#ffcf7a')
GNECK = mat('#2e1808', '#5e3416', '#8a5a2a')
STRAP = mat('#2a1408', '#4e2a12', '#6e4220')
FACE = {'w': (255, 255, 255, 255), 'k': K, 'b': (36, 20, 10, 255), 'm': (130, 50, 40, 255), 'd': (168, 96, 62, 255), 'r': (200, 80, 70, 255)}
HAND = {'k': K, 'W': hexc('#f4c4a0'), 'w': hexc('#e0a07a'), 'g': hexc('#a8603e')}
HAND_FAR = {'k': K, 'W': hexc('#d49c78'), 'w': hexc('#b87a58'), 'g': hexc('#80442a')}
POINT = ['..kk....', '.kWk....', '.kWk....', '.kWkkk..', 'kWWWWWk.', 'kwWWWWk.', 'kgwwwwk.', '.kkkkk..']


def torso(P, lean):
    T = lambda pts: [add(rot(sub(p, P0), lean), P) for p in pts]
    it = []
    it.append(Part(PANTS, T([(20, 40), (38, 39), (39, 45), (31, 45), (29, 47), (27, 45), (19, 45)]), shades=[(T([(20, 40), (24, 40), (25, 45), (19, 45)]), 0)], outline='outer'))
    # veste : descend jusqu'aux hanches, ouverte en bas devant
    it.append(Part(SUIT, T([(19, 22), (27, 20), (34, 20), (39, 22), (38, 31), (39.5, 44.5), (33, 46), (31, 43), (29, 46), (20.5, 45), (20, 31)]),
                   shades=[(T([(19, 22), (24, 21), (24.5, 45.5), (20.5, 45), (20, 31)]), 0), (T([(35, 21), (39, 22), (38, 29), (36, 27)]), 2),
                           (T([(31, 31), (32, 31), (31.6, 43), (30.6, 43)]), 0),
                           (T([(24, 36), (28, 37), (28, 38), (24, 37)]), 0), (T([(34, 37), (38, 36), (38, 37), (34, 38)]), 0)]))
    # col : gilet foncé, chemise blanche, cravate bleue, revers
    it.append(Part(VEST, T([(27.5, 20), (33.8, 20), (31.6, 32)]), base=1, outline=False))
    it.append(Part(WHITE, T([(29, 20), (33, 20), (31.2, 26.5)]), base=2, shades=[(T([(31.6, 20), (33, 20), (31.6, 25)]), 1)], outline=False))
    it.append(Part(TIE, T([(30.3, 20.6), (31.9, 20.6), (32.4, 27), (31.2, 29.5), (30.0, 27)]), base=1, shades=[(T([(30.3, 20.6), (31.9, 20.6), (31.6, 22), (30.6, 22)]), 0), (T([(31.2, 23), (32.2, 26.5), (31.6, 27)]), 2)], outline=False))
    it.append(Part(SUIT, T([(26.6, 20), (28.4, 20), (31.8, 32), (30.6, 32)]), base=2, outline=False))
    it.append(Part(SUIT, T([(33.6, 20), (35, 20.4), (32.4, 31.6), (31.8, 31)]), base=1, outline=False))
    it.append(Part(WHITE, T([(31.4, 34.4), (32.2, 34.4), (32.2, 35.2), (31.4, 35.2)]), base=0, outline=False))
    it.append(Part(mat('#8a1424', '#e04050', '#ff8090'), T([(35, 25), (37.5, 24.6), (37.5, 25.8), (35, 26.2)]), base=1, outline=False))
    return it, T


def head(N, tilt=0, expr='normal', flow=0):
    T = lambda pts: [add(rot(sub(p, N0), tilt), N) for p in pts]
    o = (round(N[0] - N0[0]), round(N[1] - N0[1]))
    it = []
    it.append(Part(SKIN, T([(28, 18), (33, 18), (33, 22), (28, 22)]), base=0))
    it.append(Part(SKIN, T([(25, 6), (30, 4), (35, 5), (38, 8), (38, 12), (39, 14), (38, 15), (37, 18), (34, 20), (29, 20), (26, 17), (24, 13)]),
                   shades=[(T([(24, 13), (25, 6), (29, 9), (30, 20), (29, 20), (26, 17)]), 1), (T([(33, 19), (37, 18), (34, 20)]), 1), (T([(35, 9), (38, 10), (38, 12), (36, 13)]), 3)], base=2))
    it.append(Part(SKIN, T([(26, 12), (28, 12), (28, 16), (26, 16)]), base=0))
    f = flow
    # cheveux en bataille : grosses mèches qui partent dans tous les sens
    it.append(Part(HAIR, T([(23, 15), (21, 12), (18, 12 + f), (21, 9), (18, 6 + f), (22, 5), (21, 1), (25, 2), (27, -1), (30, 1.5), (33, 0), (35, 2), (39, 1), (38, 4), (42, 6), (39, 7.5),
                            (39.5, 10), (37, 8.5), (35.5, 10.5), (34, 8.5), (32, 10), (30, 8.5), (28, 10.5), (27, 13), (26, 15)]),
                   shades=[(T([(25, 2.5), (29, 2), (31, 3), (27, 5)]), 2), (T([(33, 1.5), (37, 2), (36, 4), (33.5, 3.5)]), 2), (T([(23, 15), (21, 12), (24, 10), (26, 15)]), 0),
                           (T([(18, 12 + f), (21, 9), (22, 11)]), 0), (T([(30, 5), (34, 5), (34, 6), (31, 6.5)]), 2), (T([(36.5, 6), (39.5, 6.5), (38, 7.2)]), 2)]))
    fx, fy = o
    if expr == 'hurt':
        it.append(stamp(["kkk.", "..kk"], FACE, 32 + fx, 11 + fy))
        it.append(stamp(["bbbb", ".mr."], FACE, 34 + fx, 15 + fy))
    elif expr == 'shout':
        it.append(stamp(["kkkb", "..wk", "..wk"], FACE, 32 + fx, 11 + fy))
        it.append(stamp(["bbbbb", ".kkk.", ".mrk."], FACE, 33 + fx, 15 + fy))
    else:
        it.append(stamp(["kkkb", "..wk", "..wk"], FACE, 32 + fx, 11 + fy))
        it.append(stamp(["bbbbb", "b...b", "..m.."], FACE, 33 + fx, 15 + fy))
    it.append(stamp(["d"], FACE, 38 + fx, 13 + fy))
    return it


def arm(sh, el, wr, far, fist='R'):
    M = SUIT_FAR if far else SUIT
    it = [slab(sh, el, 5.6, 5.0, M, ext0=0.8, ext1=1.0), slab(el, wr, 5.0, 4.6, M, ext0=1.2, ext1=0.2)]
    d = sub(wr, el); L = math.hypot(*d) or 1; u = (d[0] / L, d[1] / L)
    it.append(slab(add(wr, mul(u, -1.4)), add(wr, mul(u, 0.6)), 4.2, 4.2, WHITE if not far else mat('#7a8098', '#aeb2c6', '#d4d8e8'), base=1, dark=0.4))
    if fist is None: return it
    rows = POINT if fist == 'P' else FIST[fist]
    anchor = {'R': (0, 3.5), 'L': (7, 3.5), 'U': (3.5, 7), 'UL': (3.5, 7), 'D': (3.5, 0), 'P': (3, 7)}[fist]
    at = (round(wr[0] - anchor[0] + u[0] * 1.2), round(wr[1] - anchor[1] + u[1] * 1.2))
    it.append(stamp(rows, HAND_FAR if far else HAND, *at))
    return it


def leg(hip, kn, an, far, foot=1, foot_rot=0):
    M = PANTS_FAR if far else PANTS
    it = []
    shoe = [(-3.5, 1.5), (3, 1.5), (8, 3.2), (9, 4.4), (8.5, 5), (-3.8, 5)]
    shoe = [add(rot((x * foot, y), foot_rot * foot), an) for x, y in shoe]
    hi = [add(rot((x * foot, y), foot_rot * foot), an) for x, y in [(-1, 1.6), (3, 1.6), (6, 2.6), (1, 2.6)]]
    it.append(Part(SHOE, shoe, shades=[(hi, 2)]))
    it.append(slab(kn, add(an, mul(sub(an, kn), 0.08)), 6.6, 6.0, M, ext0=1.5))
    it.append(slab(hip, kn, 7.8, 6.8, M, ext0=1.0, ext1=1.2))
    dk = sub(kn, hip); Lk = math.hypot(*dk) or 1
    n = (-dk[1] / Lk, dk[0] / Lk)
    it[-1].shades.append((fold(add(kn, mul(n, -1)), mul(n, 1), 2.6), 0))
    return it


def guitar(neck_end, body_c, M=GBODY, N_=GNECK):
    """Guitare acoustique : manche depuis la tête (neck_end) vers la caisse centrée sur body_c."""
    d = sub(body_c, neck_end); L = math.hypot(*d) or 1; u = (d[0] / L, d[1] / L); n = (-u[1], u[0])
    loc = lambda a, b: add(body_c, add(mul(u, a), mul(n, b)))
    it = []
    it.append(slab(add(neck_end, mul(u, -2.2)), add(neck_end, mul(u, 1.2)), 3.6, 3.0, N_, base=0))
    it.append(slab(neck_end, loc(-6, 0), 2.6, 2.6, N_, base=1))
    half = [(-9, 0), (-8.4, -3.0), (-6.6, -4.4), (-4.4, -4.2), (-3, -3.3), (-1.4, -4.4), (1.4, -6.0), (4.4, -6.3), (6.7, -4.8), (7.8, -2.2), (8.1, 0)]
    outline = [loc(a, b) for a, b in half] + [loc(a, -b) for a, b in half[::-1][1:-1]]
    light = [loc(a, b) for a, b in [(-8, -2.6), (-6.4, -3.6), (-4.4, -3.4), (-1, -3.6), (2, -5), (4.5, -5.2), (4.5, -2), (-8, -1)]]
    side = 1 if n[0] * 0.7 + n[1] * -0.7 > 0 else -1  # liseré clair du côté de la lumière
    if side < 0: light = [loc(a, -b) for a, b in [(-8, -2.6), (-6.4, -3.6), (-4.4, -3.4), (-1, -3.6), (2, -5), (4.5, -5.2), (4.5, -2), (-8, -1)]]
    dark = [loc(a, -b * side) for a, b in [(1, 4), (4.4, 5.6), (6.6, 4.4), (7.6, 2), (7.8, 0), (3, 1.5)]]
    hole = [loc(-1.6 + 1.7 * math.cos(t / 8 * 6.283), 1.7 * math.sin(t / 8 * 6.283)) for t in range(8)]
    bridge = [loc(3.4, -2.2), loc(4.4, -2.2), loc(4.4, 2.2), loc(3.4, 2.2)]
    it.append(Part(M + [K], outline, shades=[(light, 2), (dark, 0), (hole, 4), (bridge, 0)], base=1))
    return it


def back_guitar(T):
    # rangée dans le dos (caisse derrière les hanches, manche derrière l'épaule)
    return guitar(T([(16, 11)])[0], T([(21, 39)])[0])


def frame(p):
    P = (p['P'][0] + OX, p['P'][1]); lean = p.get('lean', 0)
    tor, T = torso(P, lean)
    N = add(T([N0])[0], p.get('hd', (0, 0)))
    sN = T([(19, 22.5)])[0]; sF = T([(37, 22.5)])[0]
    hN = T([(23.5, 43)])[0]; hF = T([(33.5, 43)])[0]
    it = []
    held = p.get('gtr')
    if not held: it += back_guitar(T)
    it += arm(sF, add(sF, p['fA'][0]), add(sF, p['fA'][1]), True, p.get('fFist', 'R'))
    it += leg(hF, add(hF, p['fL'][0]), add(hF, p['fL'][1]), True, p.get('fFoot', 1), p.get('fRot', 0))
    it += leg(hN, add(hN, p['nL'][0]), add(hN, p['nL'][1]), False, p.get('nFoot', -1), p.get('nRot', 0))
    it += tor
    if not held:  # sangle en travers du torse
        it.append(slab(T([(22, 22)])[0], T([(37, 38)])[0], 1.8, 1.8, STRAP, base=1, dark=0.5))
    it += head(N, p.get('tilt', 0), p.get('expr', 'normal'), p.get('flow', 0))
    if held:
        it += guitar(add(sN, held[0]), add(sN, held[1]))
    it += arm(sN, add(sN, p['nA'][0]), add(sN, p['nA'][1]), False, p.get('nFist', 'R'))
    return compose(it, W, H)


POSES = {
    'idle0': dict(P=(29, 40), nA=((1, 9.5), (6.5, 0)), fA=((4, 7.5), (8, 5)), nL=((-3, 8), (-5.5, 14)), fL=((5, 7), (7, 14))),
    'idle1': dict(P=(29, 41), hd=(0, 1), nA=((1, 9.5), (6.5, 1)), fA=((4, 7.5), (8, 6)), nL=((-3.5, 7.5), (-5.5, 13)), fL=((5.5, 6.5), (7, 13))),
    'run0': dict(P=(30, 41), lean=10, flow=2, nA=((-5, 7), (-10, 11)), fA=((5, 6), (11, 2)), nFist='L',
                 nL=((-7, 6), (-14, 10)), fL=((7, 4), (8, 13)), nRot=-30),
    'run1': dict(P=(30, 40), lean=10, flow=3, nA=((5, 6), (11, 1)), fA=((-3, 8), (0, 14)), fFist='D',
                 nL=((10, 2), (13, 10)), fL=((-7, 6), (-15, 9)), fRot=-25, nFoot=1),
    'jump': dict(P=(30, 41), lean=4, flow=-2, nA=((-3, 8), (2, 3)), fA=((5, 6), (9, 0)), nFist='U', fFist='U',
                 nL=((3, 7), (-2, 13)), fL=((8, 4), (7, 12)), nRot=-35, fRot=10, nFoot=1),
    'hurt': dict(P=(27, 41), lean=-14, tilt=-14, hd=(-1, 1), expr='hurt', flow=3, nA=((-6, 6), (-10, 0)), fA=((6, -3), (11, -7)),
                 nFist='L', fFist='U', nL=((-2, 8), (-5, 15)), fL=((5, 8), (9, 15))),
    # GUITARE : il frappe avec la guitare tenue par le manche, à l'horizontale
    'guitar': dict(P=(26, 41), lean=10, hd=(1, 0), expr='shout', nA=((9, 3), (16, 4)), fA=((6, 6), (13, 5)), nFist='R', fFist='R',
                   gtr=((14, 3), (38, 1)), nL=((-5, 7), (-9, 14)), fL=((7, 6), (9, 14))),
    # GUITARE+ : grand coup de haut en bas
    'guitarBig': dict(P=(26, 42), lean=16, hd=(2, 1), expr='shout', flow=2, nA=((10, 1), (17, 6)), fA=((7, 5), (14, 8)), nFist='R', fFist='R',
                      gtr=((16, 6), (29, 21)), nL=((-7, 6), (-13, 12)), fL=((9, 4), (12, 12))),
    # JAMBE FEU : coup de pied vers le haut
    'kickUp': dict(P=(27, 41), lean=-14, tilt=-6, hd=(-1, 0), expr='shout', nA=((-5, 6), (-9, 1)), fA=((4, 7), (6, 1)), nFist='L', fFist='U',
                   nL=((-1, 8), (-3, 16)), fL=((7, -8), (12, -18)), fRot=-95),
    # PLONGEON : coup de pied vers le bas en l'air
    'plunge': dict(P=(30, 38), lean=-6, flow=-3, nA=((-5, 5), (-9, -1)), fA=((5, 4), (10, -1)), nFist='UL', fFist='U',
                   nL=((-2, 7), (-4, 13)), fL=((4, 9), (5, 19)), fRot=60, nRot=-20),
    # COUP DE PIED (arrière / rebord)
    'rkick': dict(P=(26, 40), lean=-18, tilt=-8, hd=(-2, 1), expr='shout', nA=((-4, 7), (-1, 1)), fA=((5, 5), (8, -1)), nFist='U', fFist='U',
                  nL=((-2, 8), (-4, 16)), fL=((9, -1), (19, -3)), fRot=-80),
    # CODE PÉNAL : il pointe le ciel, le livre tombe
    'summon': dict(P=(29, 40), lean=-4, tilt=-4, expr='shout', fA=((3, -8), (5, -15)), nA=((1, 9.5), (6.5, 0)), fFist='P',
                   nL=((-3, 8), (-5.5, 14)), fL=((5, 7), (7, 14))),
}

if __name__ == '__main__':
    import sys
    names = sys.argv[1].split(',') if len(sys.argv) > 1 else list(POSES)
    import os; os.makedirs('lulu', exist_ok=True)
    frames = [frame(POSES[n]) for n in names]
    for n, f in zip(names, frames): f.save(f'lulu/{n}.png')
