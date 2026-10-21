# BIGZINZIN : costume bleu ciel, cheveux blond foncé ondulés jusqu'à la nuque, lunettes rondes transparentes,
# barbe rousse légère, une petite antenne sur la tête, un téléphone à la main.
# Version OR (JACKPOT) : costume et antenne dorés (frame(p) avec gold=True ; export.py fabrique les postures « _g »).
# La case fait 80 x 72 (8 px de plus que les autres) pour laisser la place à l'antenne.
import math
from flat import *
from toro_set import slab, fold, sub, add, mul, rot, FIST, P0, N0

W, H = 80, 72
OX, OY = 11, 8
GOLD_SKIN = True  # export.py : ajoute la version dorée de chaque posture
SKIN = mat('#b87a5a', '#e8b896', '#f8d4b8', '#fff0e0')
SKIN_FAR = mat('#8a5a40', '#c4967a', '#e0b89a', '#f0d0b8')
HAIR = mat('#6a4a18', '#a8823a', '#d2ac5e', '#ecd08c')
SHOE = mat('#0c0a10', '#211f28', '#4a4656')
WHITE = mat('#9ea4b8', '#dfe3ee', '#ffffff')
TIE = mat('#0e1a3a', '#1e3060', '#33508a')
FACE = {'w': (255, 255, 255, 255), 'k': K, 'b': (36, 20, 10, 255), 'm': (150, 70, 60, 255), 'd': (168, 96, 62, 255), 'r': (210, 90, 80, 255)}
HAND = {'k': K, 'W': hexc('#f8d4b8'), 'w': hexc('#e8b896'), 'g': hexc('#b87a5a')}
HAND_FAR = {'k': K, 'W': hexc('#e0b89a'), 'w': hexc('#c4967a'), 'g': hexc('#8a5a40')}
GLASS = {'g': (236, 242, 246, 255), 'G': (176, 192, 204, 255)}
BEARD = (198, 128, 78, 255)
PHONE = mat('#0a0a12', '#1c1c28', '#30304a')
SCREEN = mat('#3a7ac8', '#7ab8ff', '#cfe8ff')
POINT = ['..kk....', '.kWk....', '.kWk....', '.kWkkk..', 'kWWWWWk.', 'kwWWWWk.', 'kgwwwwk.', '.kkkkk..']

PAL_BLUE = dict(
    SUIT=mat('#2e5a88', '#5c98d0', '#90c4ee', '#cfe8ff'), SUIT_FAR=mat('#22446a', '#4878a8', '#6e9ccc'),
    PANTS=mat('#2a5280', '#5288c0', '#7eb0e0'), PANTS_FAR=mat('#1e3c60', '#3c6896', '#5a8abc'),
    ANT=mat('#202028', '#40404e', '#70707e'), BALL=mat('#8a1424', '#e04050', '#ff9aa6'),
)
PAL_GOLD = dict(
    SUIT=mat('#7a5410', '#c8961c', '#f0c840', '#fff2a8'), SUIT_FAR=mat('#5e400c', '#a07818', '#c89e30'),
    PANTS=mat('#6e4c10', '#b8881c', '#e0b638'), PANTS_FAR=mat('#54390c', '#906a16', '#b8902a'),
    ANT=mat('#7a5410', '#c8961c', '#f0c840'), BALL=mat('#a87a10', '#ffd23a', '#fff8c8'),
)


CLOTH = [(PAL_BLUE['SUIT'], 0), (PAL_BLUE['SUIT_FAR'], 1), (PAL_BLUE['PANTS'], 0), (PAL_BLUE['PANTS_FAR'], 1)]  # vêtements recolorés en équipe

def torso(P, lean, C):
    T = lambda pts: [add(rot(sub(p, P0), lean), P) for p in pts]
    it = []
    it.append(Part(C['PANTS'], T([(20, 40), (38, 39), (39, 45), (31, 45), (29, 47), (27, 45), (19, 45)]), shades=[(T([(20, 40), (24, 40), (25, 45), (19, 45)]), 0)], outline='outer'))
    # veste bleu ciel ouverte en bas, chemise blanche, cravate marine
    it.append(Part(C['SUIT'], T([(19, 22), (27, 20), (34, 20), (39, 22), (38, 31), (39.5, 44.5), (33, 46), (31, 43), (29, 46), (20.5, 45), (20, 31)]),
                   shades=[(T([(19, 22), (24, 21), (24.5, 45.5), (20.5, 45), (20, 31)]), 0), (T([(35, 21), (39, 22), (38, 29), (36, 27)]), 2),
                           (T([(31, 31), (32, 31), (31.6, 43), (30.6, 43)]), 0),
                           (T([(24, 36), (28, 37), (28, 38), (24, 37)]), 0), (T([(34, 37), (38, 36), (38, 37), (34, 38)]), 0)]))
    it.append(Part(WHITE, T([(27.5, 20), (33.8, 20), (31.6, 32)]), base=2, shades=[(T([(31.6, 20), (33.8, 20), (31.6, 30)]), 1)], outline=False))
    it.append(Part(TIE, T([(30.3, 20.6), (31.9, 20.6), (32.4, 27), (31.2, 29.5), (30.0, 27)]), base=1, shades=[(T([(30.3, 20.6), (31.9, 20.6), (31.6, 22), (30.6, 22)]), 0), (T([(31.2, 23), (32.2, 26.5), (31.6, 27)]), 2)], outline=False))
    it.append(Part(C['SUIT'], T([(26.6, 20), (28.4, 20), (31.8, 32), (30.6, 32)]), base=2, outline=False))
    it.append(Part(C['SUIT'], T([(33.6, 20), (35, 20.4), (32.4, 31.6), (31.8, 31)]), base=1, outline=False))
    return it, T


def head(N, tilt, expr, flow, C):
    T = lambda pts: [add(rot(sub(p, N0), tilt), N) for p in pts]
    o = (round(N[0] - N0[0]), round(N[1] - N0[1]))
    it = []
    # petite antenne (derrière les cheveux pour la tige, boule au bout)
    base = T([(31.5, 1.2)])[0]; tip = T([(33.5 - flow * 0.3, -5.5)])[0]
    it.append(slab(base, tip, 1.4, 1.2, C['ANT'], base=1, dark=0.5))
    it.append(Part(C['BALL'], [add(tip, (math.cos(t / 8 * 6.283) * 1.9, math.sin(t / 8 * 6.283) * 1.9)) for t in range(8)],
                   shades=[([add(tip, (-0.6, -1.4)), add(tip, (0.6, -1.4)), add(tip, (0.6, -0.2)), add(tip, (-0.6, -0.2))], 2)], base=1))
    # cheveux de derrière : ils tombent jusqu'à la nuque
    it.append(Part(HAIR, T([(23.2, 10), (24.6, 8), (27.4, 9), (28, 14), (27.6, 19.4), (26.4, 22.4), (24.6, 22.8), (22.6, 21.4), (21.8, 17.4), (22.2, 13)]),
                   shades=[(T([(22.6, 21.4), (24.4, 18), (25.4, 22.6), (24.6, 22.8)]), 0), (T([(24, 12), (26, 11), (26.4, 15), (24.6, 16)]), 2)], base=1))
    it.append(Part(SKIN, T([(28, 18), (33, 18), (33, 22), (28, 22)]), base=0))
    # visage
    it.append(Part(SKIN, T([(25, 6), (30, 4), (35, 5), (38, 8), (38.4, 11.5), (39.6, 13.6), (38.6, 14.6), (38.2, 16), (37, 18.6), (34, 20.4), (30, 20.4), (27, 18), (24.5, 13)]),
                   shades=[(T([(24.5, 13), (25, 6), (29, 9), (29.6, 20.4), (28.6, 20.2), (27, 18)]), 1),
                           (T([(35, 9), (38, 10), (38.2, 12.4), (36, 13)]), 3), (T([(37.2, 12), (39.6, 13.6), (38.6, 14.6), (37.4, 14.2)]), 3)], base=2))
    f = flow
    # cheveux blond foncé ondulés : raie au milieu, mèches qui retombent sur les côtés du visage
    it.append(Part(HAIR, T([(25.4, 16.6), (23.6, 12.6), (23, 8), (24.4, 4.2), (27.4, 1.6), (31.4, 0.4), (35.6, 0.8), (39, 2.8), (41, 5.6), (41.4, 9 + f * 0.3),
                            (40.6, 11.8), (39.4, 10.2), (38.8, 8.4), (37.2, 7.4), (35.4, 6.4), (34.6, 4.6), (33.2, 6.6), (31, 7.6), (29.2, 8.6), (28.2, 11), (28.4, 14.2), (27.6, 17.6)]),
                   shades=[(T([(27, 2.6), (31.4, 1.2), (34.4, 1.6), (33, 3), (29, 3.8), (26.6, 5)]), 3),
                           (T([(36, 1.6), (39.6, 4.2), (40, 5.6), (36.4, 3.4)]), 2),
                           (T([(25.4, 16.6), (23.6, 12.6), (23.2, 8.6), (25.8, 9.6), (27.4, 13.4), (27.6, 17.6)]), 0),
                           (T([(38.4, 7.4), (40.6, 9.4), (40.6, 11.8), (39.4, 10.2)]), 0), (T([(29.2, 5.6), (32.4, 4.8), (32.6, 5.6), (29.6, 6.4)]), 2)]))
    fx, fy = o
    # barbe rousse légère + moustache
    st = {'s': BEARD}
    it.append(stamp(["s......s", ".ssssss.", "..ssss.."], st, 30 + fx, 17 + fy))
    it.append(stamp(["sss"], st, 34 + fx, 15 + fy))
    if expr == 'hurt':
        it.append(stamp(["kkkk.kk", "....k..", ".kkk..."], FACE, 31 + fx, 10 + fy))
        it.append(stamp(["mmr."], FACE, 34 + fx, 16 + fy))
    elif expr == 'shout':
        it.append(stamp(["kkkk..kk", "...wk.wk", "...wk..."], FACE, 30 + fx, 10 + fy))
        it.append(stamp(["kkk", "mrk"], FACE, 34 + fx, 16 + fy))
    else:
        it.append(stamp(["kkkk..kk", "...wk.wk", "...wk..."], FACE, 30 + fx, 10 + fy))
        it.append(stamp([".mmk"], FACE, 33 + fx, 16 + fy))
    # lunettes rondes en plastique transparent, sourcils blonds au-dessus
    it.append(stamp([".gg.gg.", "g..g..g", "g..g..g", ".GG.GG."], GLASS, 32 + fx, 10 + fy))
    it.append(stamp(["bb.bb"], {'b': HAIR[0]}, 33 + fx, 9 + fy))
    return it


def phone(wr, ang):
    """Téléphone tenu dans la main : coque sombre, écran bleu (ang = direction du haut du téléphone, en degrés)."""
    u = (math.cos(math.radians(ang)), math.sin(math.radians(ang))); n = (-u[1], u[0])
    c = add(wr, mul(u, 2.5))
    corner = lambda a, b: add(c, add(mul(u, a), mul(n, b)))
    body = [corner(-3.4, -2.2), corner(4.6, -2.2), corner(4.6, 2.2), corner(-3.4, 2.2)]
    scr = [corner(-2.4, -1.2), corner(3.6, -1.2), corner(3.6, 1.2), corner(-2.4, 1.2)]
    return [Part(PHONE, body, base=1), Part(SCREEN, scr, base=1, shades=[([corner(1.6, -1.2), corner(3.6, -1.2), corner(3.6, 0), corner(1.6, 0)], 2)], outline=False)]


def arm(sh, el, wr, far, fist, C):
    d = sub(wr, el); L = math.hypot(*d) or 1; u = (d[0] / L, d[1] / L)
    M = C['SUIT_FAR'] if far else C['SUIT']
    it = [slab(sh, el, 5.6, 5.0, M, ext0=0.8, ext1=1.0), slab(el, wr, 5.0, 4.6, M, ext0=1.2, ext1=0.2)]
    it.append(slab(add(wr, mul(u, -1.4)), add(wr, mul(u, 0.6)), 4.2, 4.2, WHITE if not far else mat('#7a8098', '#aeb2c6', '#d4d8e8'), base=1, dark=0.4))
    if fist is None: return it
    rows = POINT if fist == 'P' else FIST[fist]
    anchor = {'R': (0, 3.5), 'L': (7, 3.5), 'U': (3.5, 7), 'UL': (3.5, 7), 'D': (3.5, 0), 'P': (3, 7)}[fist]
    at = (round(wr[0] - anchor[0] + u[0] * 1.2), round(wr[1] - anchor[1] + u[1] * 1.2))
    it.append(stamp(rows, HAND_FAR if far else HAND, *at))
    return it


def leg(hip, kn, an, far, foot, foot_rot, C):
    M = C['PANTS_FAR'] if far else C['PANTS']
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


def frame(p):
    C = PAL_GOLD if p.get('gold') else PAL_BLUE
    P = (p['P'][0] + OX, p['P'][1] + OY); lean = p.get('lean', 0)
    tor, T = torso(P, lean, C)
    N = add(T([N0])[0], p.get('hd', (0, 0)))
    sN = T([(19, 22.5)])[0]; sF = T([(37, 22.5)])[0]
    hN = T([(23.5, 43)])[0]; hF = T([(33.5, 43)])[0]
    it = []
    it += arm(sF, add(sF, p['fA'][0]), add(sF, p['fA'][1]), True, p.get('fFist', 'R'), C)
    it += leg(hF, add(hF, p['fL'][0]), add(hF, p['fL'][1]), True, p.get('fFoot', 1), p.get('fRot', 0), C)
    it += leg(hN, add(hN, p['nL'][0]), add(hN, p['nL'][1]), False, p.get('nFoot', -1), p.get('nRot', 0), C)
    it += tor
    it += head(N, p.get('tilt', 0), p.get('expr', 'normal'), p.get('flow', 0), C)
    wr = add(sN, p['nA'][1])
    if p.get('ph') is not None: it += phone(wr, p['ph'])
    it += arm(sN, add(sN, p['nA'][0]), wr, False, p.get('nFist', 'R'), C)
    if p.get('ph') is not None and p.get('phFront'): it += phone(wr, p['ph'])
    return compose(it, W, H)


# Postures (même repère que Deadlulu) ; ph = angle du téléphone dans la main proche (None = pas de téléphone visible)
POSES = {
    'idle0': dict(P=(29, 40), nA=((1, 9.5), (6.5, 0)), fA=((4, 7.5), (8, 5)), ph=-80, nL=((-3, 8), (-5.5, 14)), fL=((5, 7), (7, 14))),
    'idle1': dict(P=(29, 41), hd=(0, 1), nA=((1, 9.5), (6.5, 1)), fA=((4, 7.5), (8, 6)), ph=-80, nL=((-3.5, 7.5), (-5.5, 13)), fL=((5.5, 6.5), (7, 13))),
    'run0': dict(P=(30, 41), lean=10, flow=2, nA=((-5, 7), (-10, 11)), fA=((5, 6), (11, 2)), nFist='L', ph=200,
                 nL=((-7, 6), (-14, 10)), fL=((7, 4), (8, 13)), nRot=-30),
    'run1': dict(P=(30, 40), lean=10, flow=3, nA=((5, 6), (11, 1)), fA=((-3, 8), (0, 14)), fFist='D', ph=-40,
                 nL=((10, 2), (13, 10)), fL=((-7, 6), (-15, 9)), fRot=-25, nFoot=1),
    'jump': dict(P=(30, 41), lean=4, flow=-2, nA=((-3, 8), (2, 3)), fA=((5, 6), (9, 0)), nFist='U', fFist='U', ph=-90,
                 nL=((3, 7), (-2, 13)), fL=((8, 4), (7, 12)), nRot=-35, fRot=10, nFoot=1),
    'hurt': dict(P=(27, 41), lean=-14, tilt=-14, hd=(-1, 1), expr='hurt', flow=3, nA=((-6, 6), (-10, 0)), fA=((6, -3), (11, -7)),
                 nFist='L', fFist='U', ph=160, nL=((-2, 8), (-5, 15)), fL=((5, 8), (9, 15))),
    # TAP : petit coup de téléphone vers l'avant
    'tap': dict(P=(27, 41), lean=8, hd=(1, 0), expr='shout', nA=((9, 2), (19, 1)), fA=((2, 8), (5, 2)), fFist='U', ph=0, phFront=True,
                nL=((-5, 7), (-9, 14)), fL=((7, 6), (9, 14))),
    # FLASH : téléphone brandi devant, écran vers l'adversaire
    'flash': dict(P=(26, 41), lean=12, hd=(1, 0), expr='shout', nA=((10, 0), (19, -3)), fA=((3, 7), (8, 3)), fFist='U', ph=-90, phFront=True,
                  nL=((-6, 7), (-11, 13)), fL=((8, 5), (11, 13))),
    # SWIPE : grand balayage du téléphone en avançant
    'swipe': dict(P=(25, 42), lean=16, hd=(2, 0), expr='shout', flow=2, nA=((12, 2), (22, 5)), fA=((-2, 8), (2, 3)), fFist='U', ph=20, phFront=True,
                  nL=((-7, 6), (-13, 12)), fL=((9, 4), (12, 12))),
    # SELFIE : téléphone levé au-dessus de la tête
    'selfie': dict(P=(29, 40), lean=-6, tilt=-8, expr='shout', flow=-1, nA=((6, -6), (9, -15)), fA=((3, 8), (8, 4)), ph=-100, phFront=True,
                   nL=((-3, 8), (-5, 15)), fL=((6, 5), (9, 12))),
    # LOW : accroupi, le téléphone balaie le sol (aussi pour poser la key frame)
    'low': dict(P=(28, 48), lean=18, hd=(1, 0), expr='shout', nA=((7, 6), (15, 10)), fA=((4, 6), (9, 8)), fFist='D', ph=10, phFront=True,
                nL=((-4, 4), (-12, 6)), fL=((9, 2), (12, 9))),
    # PHONE PUSH : (VIRAL) téléphone poussé à bout de bras
    'pushPre': dict(P=(30, 42), lean=-8, tilt=-4, expr='shout', nA=((-5, 4), (-9, -2)), fA=((5, 6), (10, 3)), fFist='U', ph=-100,
                    nL=((-5, 7), (-9, 14)), fL=((6, 6), (9, 14))),
    'push': dict(P=(24, 43), lean=20, hd=(2, 0), expr='shout', swing=-25, nA=((13, 0), (26, -2)), fA=((-3, 8), (1, 3)), fFist='U', ph=-90, phFront=True,
                 nL=((-8, 5), (-15, 11)), fL=((10, 3), (14, 11))),
    # ANTENNE : la tête levée, les bras le long du corps, l'antenne grésille
    'antennaPre': dict(P=(29, 45), lean=8, tilt=4, expr='shout', nA=((-3, 8), (-6, 14)), fA=((4, 8), (3, 14)), nFist='D', fFist='D', ph=90,
                       nL=((-6, 5), (-6, 12)), fL=((7, 4), (7, 11))),
    'antenna': dict(P=(29, 39), lean=-4, tilt=-12, hd=(0, -1), expr='shout', flow=-2, nA=((-4, 7), (-8, 13)), fA=((5, 7), (9, 12)), nFist='D', fFist='D', ph=90,
                    nL=((-3, 8), (-4, 16)), fL=((5, 7), (6, 15))),
    # KRACH : il frappe le sol des deux poings
    'slamPre': dict(P=(29, 40), lean=-6, tilt=-6, expr='shout', nA=((3, -7), (6, -15)), fA=((5, -6), (9, -14)), nFist='U', fFist='U', ph=-90,
                    nL=((-4, 8), (-7, 14)), fL=((6, 7), (9, 14))),
    'slam': dict(P=(29, 47), lean=24, hd=(2, 1), expr='shout', nA=((8, 7), (14, 14)), fA=((6, 8), (11, 15)), nFist='D', fFist='D', ph=90,
                 nL=((-5, 4), (-11, 8)), fL=((8, 3), (11, 9))),
    # PLONGEON : téléphone devant, il tombe en piqué
    'dive': dict(P=(30, 38), lean=-6, flow=-3, nA=((3, 8), (6, 15)), fA=((5, 4), (10, -1)), fFist='U', ph=90, phFront=True,
                 nL=((-2, 7), (-4, 13)), fL=((4, 9), (5, 19)), fRot=60, nRot=-20),
    # FEUILLE A4 : lancer à plat
    'tossPre': dict(P=(28, 41), lean=-6, tilt=-4, expr='normal', nA=((-6, 2), (-8, -6)), fA=((5, 6), (10, 3)), nFist='U', ph=-90,
                    nL=((-4, 8), (-7, 14)), fL=((5, 7), (8, 14))),
    'toss': dict(P=(30, 41), lean=12, hd=(1, 0), expr='shout', fA=((8, 5), (17, 6)), nA=((-1, 8), (-4, 13)), fFist='R', nFist='D', ph=90,
                 nL=((-6, 7), (-11, 13)), fL=((7, 6), (9, 14))),
}

if __name__ == '__main__':
    import sys, os
    names = sys.argv[1].split(',') if len(sys.argv) > 1 else list(POSES)
    frames = [frame(POSES[n]) for n in names] + [frame(dict(POSES[n], gold=True)) for n in names[:3]]
    sheet(frames, 'bz_all.png', sc=5)
