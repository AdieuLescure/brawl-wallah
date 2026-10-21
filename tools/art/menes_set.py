# MÉNÈS (ancien GROM) : costaud au gros ventre, t-shirt blanc trop court (le bas du ventre et le nombril dépassent),
# pantalon noir, claquettes. Cheveux bruns plaqués en arrière, gris sur les tempes, grand visage rond, double menton.
# Accessoires : micro au bout d'un long fil (GRAPPIN), dessiné dans le jeu.
import math
from flat import *
from toro_set import slab, fold, sub, add, mul, rot, FIST, P0, N0

W, H = 80, 64
OX = 11
SKIN = mat('#a86a4c', '#dca282', '#f0c0a0', '#fcdcc4')
SKIN_FAR = mat('#80503a', '#b88264', '#d4a284', '#e6bc9e')
HAIR = mat('#1a1614', '#2e2824', '#4a423c', '#6a625a')
GREY = mat('#3e3c40', '#5e5c62', '#7e7c84')
TEE = mat('#9ea4b8', '#dfe3ee', '#ffffff')
TEE_FAR = mat('#7a8098', '#aeb2c6', '#d4d8e8')
PANTS = mat('#0c0c12', '#1e1e28', '#34343e', '#4a4a56')
PANTS_FAR = mat('#08080c', '#16161e', '#282832')
SOLE = mat('#101018', '#26262e', '#3e3e48')
STRAP = mat('#0e1a3a', '#1e3a7a', '#3a62b8')
FACE = {'w': (255, 255, 255, 255), 'k': K, 'b': (30, 24, 20, 255), 'm': (140, 70, 60, 255), 'r': (200, 90, 80, 255),
        'h': (40, 32, 28, 255), 'n': (150, 90, 66, 255), 'd': (190, 128, 100, 255)}
HAND = {'k': K, 'W': hexc('#f0c0a0'), 'w': hexc('#dca282'), 'g': hexc('#a86a4c')}
HAND_FAR = {'k': K, 'W': hexc('#d4a284'), 'w': hexc('#b88264'), 'g': hexc('#80503a')}
OPEN = ['.kkkk...', 'kWWWWk..', 'kWWWWWk.', 'kWWWWWk.', 'kwWWWWk.', 'kgwwwwk.', '.kkkkk..']
MIC = {'k': K, 'G': (90, 90, 100, 255), 'g': (150, 150, 160, 255), 'L': (210, 210, 220, 255), 'B': (24, 24, 30, 255)}


def ell(c, rx, ry, n=14, a0=0.0, a1=6.283):
    return [(c[0] + rx * math.cos(a0 + (a1 - a0) * t / n), c[1] + ry * math.sin(a0 + (a1 - a0) * t / n)) for t in range(n + 1)]


def torso(P, lean):
    T = lambda pts: [add(rot(sub(p, P0), lean), P) for p in pts]
    it = []
    # pantalon noir, ceinture sous le ventre
    it.append(Part(PANTS, T([(19.4, 39), (39.4, 39.4), (40, 45), (31, 45.4), (29, 47.4), (27, 45.4), (18.6, 45)]),
                   shades=[(T([(19.4, 39), (24, 39.2), (24.6, 45.4), (18.6, 45)]), 0), (T([(19.4, 39), (39.4, 39.4), (39.4, 40.4), (19.4, 40)]), 2)], outline='outer'))
    # gros ventre (peau) : la partie basse dépasse du t-shirt
    belly = ell((33.4, 34.8), 11.6, 8.0, 18)
    it.append(Part(SKIN, T(belly), shades=[(T(ell((33.4, 34.8), 11.6, 8.0, 10, 1.4, 3.6)), 1), (T(ell((39, 34.4), 3.6, 2.8, 8)), 3)], base=2))
    # t-shirt blanc trop court : il s'arrête au milieu du ventre
    tee = [(18, 22.4), (26.6, 20), (34.6, 20), (40.4, 22.4), (41.8, 26), (43.4, 30.4), (44, 33.0), (40.6, 34.6), (35.4, 35.0), (30.6, 34.6), (25.4, 34.4), (21.2, 35.2), (19.4, 31)]
    it.append(Part(TEE, T(tee), shades=[(T([(18, 22.4), (23.6, 21.2), (24.4, 34.6), (21.2, 35.2), (19.4, 31)]), 0), (T([(36, 21.4), (40.4, 22.4), (41.6, 26), (38.4, 25.4)]), 2),
                                        (T([(24, 32.6), (30.6, 33.4), (35.4, 33.8), (40.6, 33.2), (44, 33.0), (40.6, 34.6), (35.4, 35.0), (30.6, 34.6), (25.4, 34.4)]), 1)]))
    # encolure ronde
    it.append(Part(SKIN, T([(28, 19.6), (33.6, 19.6), (32.6, 21.8), (29.2, 21.8)]), base=1, outline=False))
    # nombril
    nv = T([(38.6, 38.2)])[0]
    it.append(stamp(['nd', 'n.'], FACE, round(nv[0]), round(nv[1])))
    return it, T


def head(N, tilt=0, expr='normal'):
    T = lambda pts: [add(rot(sub(p, N0), tilt), N) for p in pts]
    o = (round(N[0] - N0[0]), round(N[1] - N0[1]))
    it = []
    # gros cou
    it.append(Part(SKIN, T([(27, 17), (34, 17), (34.6, 22), (26.6, 22)]), base=0))
    # grand visage rond, joues pleines, double menton
    it.append(Part(SKIN, T([(24.6, 7), (29.4, 3.8), (35.6, 4.2), (39.2, 7.6), (39.6, 11.2), (40.8, 13.2), (39.8, 14.6), (40, 17.2), (38.6, 20.2), (34.6, 22.4), (29.4, 22), (26, 19.4), (24, 14)]),
                   shades=[(T([(24, 14), (24.6, 7), (28.6, 9.6), (29.4, 22), (26, 19.4)]), 1), (T([(30.6, 20.6), (37.6, 19.4), (35.6, 21.4), (32, 21.8)]), 1),
                           (T([(35.4, 8.6), (38.6, 9.4), (38.8, 12.4), (36.4, 12.6)]), 3), (T([(37.6, 11.6), (40.8, 13.2), (39.8, 14.6), (37.8, 14.4)]), 3),
                           (T([(35.6, 15.4), (39.4, 16.2), (39, 17.6), (36, 16.6)]), 3)], base=2))
    # oreille
    it.append(Part(SKIN, T([(25.6, 11.2), (28, 11), (28.6, 15.6), (26.6, 16.2), (25.6, 14.2)]), shades=[(T([(26.2, 12), (27.4, 12), (27.6, 14.6), (26.6, 14.6)]), 0)], base=1))
    # cheveux plaqués en arrière, tempes grises
    hair = [(24.6, 11.6), (23.2, 8.6), (23.6, 5), (26.2, 2.2), (30, 0.6), (34.6, 0.6), (38.4, 2.4), (39.6, 5.2), (38.4, 5.8), (35.6, 4.6), (32, 4.4), (29, 5.6), (27.6, 7.6), (26.4, 11)]
    it.append(Part(HAIR, T(hair), shades=[(T([(26.4, 3.4), (30.6, 1.6), (35, 1.6), (34, 2.6), (29.6, 3.2), (27, 4.8)]), 3), (T([(24.6, 11.6), (23.2, 8.6), (24.4, 8.4), (26.4, 11)]), 0)], base=1))
    it.append(Part(GREY, T([(24.4, 8.2), (26.6, 7.4), (27.2, 10.6), (25.2, 11.2)]), base=1, outline=False))
    fx, fy = o
    # sourcils épais, petits yeux, bouche
    if expr == 'hurt':
        it.append(stamp(["hhh..hh", "...k..k", ".kk...."], FACE, 31 + fx, 9 + fy))
        it.append(stamp(["mmr."], FACE, 35 + fx, 17 + fy))
    elif expr == 'shout':
        it.append(stamp(["hhhh.hhh", "....wb.b"], FACE, 30 + fx, 9 + fy))
        it.append(stamp(["kkk", "mrk"], FACE, 35 + fx, 16 + fy))
    else:
        it.append(stamp(["hhhh.hhh", "....wb.b"], FACE, 30 + fx, 9 + fy))
        it.append(stamp([".mmm"], FACE, 34 + fx, 17 + fy))
    return it


def arm(sh, el, wr, far, fist='R', hold=None):
    """Bras épais : manche courte blanche, avant-bras nu ; hold = 'mic' (micro)."""
    d = sub(wr, el); L = math.hypot(*d) or 1; u = (d[0] / L, d[1] / L)
    Sk = SKIN_FAR if far else SKIN
    mid = add(sh, mul(sub(el, sh), 0.55))
    it = [slab(add(sh, mul(sub(el, sh), 0.4)), el, 6.0, 5.6, Sk, ext1=0.6), slab(el, wr, 5.6, 5.0, Sk, ext0=0.4, ext1=0.2),
          slab(sh, mid, 7.6, 7.2, TEE_FAR if far else TEE, ext0=1.0, ext1=0.4)]
    if fist is None: return it
    rows = OPEN if fist == 'O' else FIST[fist]
    anchor = {'R': (0, 3.5), 'L': (7, 3.5), 'U': (3.5, 7), 'UL': (3.5, 7), 'D': (3.5, 0), 'O': (1, 3)}[fist]
    at = (round(wr[0] - anchor[0] + u[0] * 1.2), round(wr[1] - anchor[1] + u[1] * 1.2))
    it.append(stamp(rows, HAND_FAR if far else HAND, *at))
    if hold == 'mic':
        it.append(stamp(['.kkk.', 'kLgGk', 'kgGGk', '.kGk.', '.kBk.', '.kBk.', '.kBk.', '..k..'], MIC, round(at[0] + 2 + u[0] * 2), round(at[1] - 5 + u[1] * 2)))
    return it


def leg(hip, kn, an, far, foot=1, foot_rot=0):
    M = PANTS_FAR if far else PANTS
    Sk = SKIN_FAR if far else SKIN
    it = []
    R = lambda pts: [add(rot((x * foot, y), foot_rot * foot), an) for x, y in pts]
    # claquette : semelle plate, pied nu, large bride
    it.append(Part(SOLE, R([(-3.6, 4.0), (8.6, 4.0), (8.8, 5.2), (-3.8, 5.2)]), base=1))
    it.append(Part(Sk, R([(-3, 1.2), (2.6, 1.0), (7.2, 2.6), (8, 4.0), (-3.2, 4.0)]), shades=[(R([(4.6, 2.6), (8, 3.4), (8, 4.0), (4.6, 4.0)]), 2)], base=1))
    it.append(Part(STRAP, R([(0.4, 1.0), (4.4, 1.6), (4.6, 4.0), (0.6, 4.0)]), shades=[(R([(0.4, 1.0), (4.4, 1.6), (4.4, 2.2), (0.4, 1.8)]), 2)], base=1))
    it.append(slab(kn, add(an, mul(sub(an, kn), 0.1)), 7.6, 7.0, M, ext0=1.5))
    it.append(slab(hip, kn, 8.8, 7.8, M, ext0=1.0, ext1=1.2))
    dk = sub(kn, hip); Lk = math.hypot(*dk) or 1
    n = (-dk[1] / Lk, dk[0] / Lk)
    it[-1].shades.append((fold(add(kn, mul(n, -1)), mul(n, 1), 2.6), 0))
    return it


def frame(p):
    P = (p['P'][0] + OX, p['P'][1]); lean = p.get('lean', 0)
    tor, T = torso(P, lean)
    N = add(T([N0])[0], p.get('hd', (0, 0)))
    sN = T([(23.6, 23.4)])[0]; sF = T([(37, 22.8)])[0]
    hN = T([(23.5, 43)])[0]; hF = T([(33.5, 43)])[0]
    it = []
    it += arm(sF, add(sF, p['fA'][0]), add(sF, p['fA'][1]), True, p.get('fFist', 'R'))
    it += leg(hF, add(hF, p['fL'][0]), add(hF, p['fL'][1]), True, p.get('fFoot', 1), p.get('fRot', 0))
    it += leg(hN, add(hN, p['nL'][0]), add(hN, p['nL'][1]), False, p.get('nFoot', -1), p.get('nRot', 0))
    it += tor
    it += head(N, p.get('tilt', 0), p.get('expr', 'normal'))
    it += arm(sN, add(sN, p['nA'][0]), add(sN, p['nA'][1]), False, p.get('nFist', 'R'), p.get('hold'))
    return compose(it, W, H)


IDLE = dict(P=(29, 40), nA=((2, 9), (9, 3)), fA=((4, 7.5), (8, 5)), nL=((-4, 8), (-6.5, 14)), fL=((6, 7), (8, 14)))
POSES = {
    'idle0': IDLE,
    'idle1': dict(IDLE, P=(29, 41), hd=(0, 1), nA=((2, 9), (9, 4)), fA=((4, 7.5), (8, 6)), nL=((-4.5, 7.5), (-6.5, 13)), fL=((6.5, 6.5), (8, 13))),
    'run0': dict(P=(30, 41), lean=8, nA=((-5, 7), (-10, 11)), fA=((5, 6), (11, 2)), nFist='L',
                 nL=((-7, 6), (-14, 10)), fL=((7, 4), (8, 13)), nRot=-30),
    'run1': dict(P=(30, 40), lean=8, nA=((5, 6), (11, 1)), fA=((-3, 8), (0, 14)), fFist='D',
                 nL=((10, 2), (13, 10)), fL=((-7, 6), (-15, 9)), fRot=-25, nFoot=1),
    'jump': dict(P=(30, 41), lean=2, nA=((-3, 8), (2, 3)), fA=((5, 6), (9, 0)), nFist='U', fFist='U',
                 nL=((3, 7), (-2, 13)), fL=((8, 4), (7, 12)), nRot=-35, fRot=10, nFoot=1),
    'hurt': dict(P=(27, 41), lean=-14, tilt=-14, hd=(-1, 1), expr='hurt', nA=((-6, 6), (-10, 0)), fA=((6, -3), (11, -7)),
                 nFist='L', fFist='U', nL=((-2, 8), (-5, 15)), fL=((5, 8), (9, 15))),
    # CLAQUE : la main ouverte
    'jab': dict(P=(26, 41), lean=6, hd=(1, 0), expr='shout', nA=((9, 5), (20, 5)), fA=((1, 8), (3, 0)), nFist='O', fFist='U',
                nL=((-5, 7), (-9, 14)), fL=((7, 6), (9, 14))),
    # COUP D'ÉPAULE / COUP DE TÊTE : tout le poids en avant
    'heavyPre': dict(P=(31, 42), lean=-10, tilt=-4, expr='shout', nA=((-7, 3), (-5, -5)), fA=((6, 4), (12, 1)), nFist='U',
                     nL=((-6, 7), (-11, 14)), fL=((8, 5), (11, 13))),
    'heavy': dict(P=(25, 42), lean=16, hd=(2, 0), expr='shout', nA=((11, 5), (22, 4)), fA=((-2, 8), (2, 3)), fFist='U',
                  nL=((-7, 6), (-13, 12)), fL=((9, 4), (12, 12))),
    # BÉLIER / MANCHETTE : bras vers le haut
    'upPre': dict(P=(29, 46), lean=10, hd=(1, 1), expr='shout', nA=((2, 7), (4, 13)), fA=((4, 6), (8, 4)), nFist='D',
                  nL=((-3, 6), (-7, 10)), fL=((8, 3), (9, 10))),
    'up': dict(P=(29, 39), lean=-6, tilt=-6, expr='shout', nA=((9, 0), (14, -11)), fA=((3, 8), (8, 4)), nFist='U', fFist='R',
               nL=((-3, 8), (-5, 15)), fL=((6, 4), (9, 10)), fRot=20),
    # COUP DE PIED BAS
    'sweepPre': dict(P=(29, 45), lean=6, expr='shout', nA=((-3, 7), (-6, 12)), fA=((5, 6), (10, 4)), nFist='D',
                     nL=((-3, 6), (-7, 10)), fL=((8, 3), (10, 10))),
    'sweep': dict(P=(27, 48), lean=10, hd=(1, 0), expr='shout', nA=((-4, 6), (-6, 12)), fA=((5, 5), (10, 3)), nFist='D', fFist='R',
                  nL=((-4, 4), (-12, 6)), fL=((10, 2), (22, 6)), fRot=-10),
    # SÉISME / PLAQUAGE / MUR : il frappe le sol des deux mains
    'slam': dict(P=(29, 47), lean=22, hd=(2, 1), expr='shout', nA=((8, 7), (14, 14)), fA=((6, 8), (11, 15)), nFist='D', fFist='D',
                 nL=((-5, 4), (-11, 8)), fL=((8, 3), (11, 9))),
    # PIÉTINEMENT : en l'air, les pieds en avant
    'stomp': dict(P=(30, 41), lean=-4, nA=((-5, 6), (-8, 0)), fA=((5, 4), (10, -1)), nFist='UL', fFist='U',
                  nL=((-2, 7), (-4, 14)), fL=((4, 9), (5, 19)), fRot=60, nRot=-20),
    # SUPLEX : il attrape à deux bras
    'grab': dict(P=(27, 42), lean=12, hd=(1, 0), expr='shout', nA=((9, 5), (18, 6)), fA=((8, 4), (17, 2)), nFist='O', fFist='O',
                 nL=((-6, 7), (-11, 14)), fL=((8, 5), (11, 13))),
    # MICRO : il lance le micro au bout du fil
    'hook': dict(P=(27, 41), lean=8, hd=(1, 0), expr='shout', nA=((9, 4), (20, 2)), fA=((2, 8), (6, 4)), nFist='O', fFist='U',
                 nL=((-5, 7), (-9, 14)), fL=((7, 6), (9, 14))),
    # VENTRE AU CIEL : couché sur le dos, le ventre vers le haut, il décolle
    'bellyUp': dict(P=(29, 38), lean=-80, tilt=-60, hd=(-2, 3), expr='shout', nA=((-2, -8), (0, -15)), fA=((4, -8), (6, -15)), nFist='U', fFist='U',
                    nL=((6, 6), (12, 9)), fL=((7, 4), (14, 6)), nRot=-60, fRot=-60),
}

if __name__ == '__main__':
    import sys
    names = sys.argv[1].split(',') if len(sys.argv) > 1 else list(POSES)
    frames = [frame(POSES[n]) for n in names]
    sheet(frames, '/tmp/claude-0/-home-claude/f0033496-c1d5-528d-bf27-ec4bc044ac61/scratchpad/menes_preview.png', sc=4)
