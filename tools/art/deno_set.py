# Denodoom : cheveux très courts dégradés, barbe noire fournie, gros sourcils, anneau à l'oreille, lunettes
# de soleil noires sur les yeux ; long manteau de cuir noir doublé de rouge, tenue noire, ceinture, rangers.
# Arme (famille TIR) : un fusil à pompe toujours en main (sg = angle du canon, sgFar = dans la main lointaine).
# Autres accessoires : poêle, ballon de handball.
import math
from flat import *
from toro_set import slab, fold, sub, add, mul, rot, FIST, P0, N0

W, H = 80, 64
OX = 11
SKIN = mat('#6e3e22', '#b07448', '#d09464', '#ecb688')
SKIN_FAR = mat('#52301a', '#8a5a38', '#a8744c', '#c4906a')
HAIR = mat('#0c0a0c', '#1c1818', '#36302e')
BEARD = mat('#0e0b0b', '#1e1918', '#3a3230')
COAT = mat('#121016', '#302d3a', '#565264', '#8c889a')
COAT_FAR = mat('#0c0b10', '#211f29', '#3a3846')
LINING = mat('#5a0810', '#a8141e', '#e02a30')
INNER = mat('#121117', '#2a2832', '#3e3c48')
PANTS = mat('#141824', '#2a3044', '#465070')
PANTS_FAR = mat('#0e1018', '#1e2232', '#323a52')
BOOT = mat('#060509', '#18161d', '#3c3946')
METAL = mat('#5a5e6a', '#a6abb8', '#e4e8f0')
GOLD = mat('#7a5410', '#c8961e', '#f4d060')
LENS = mat('#3a1c08', '#c06a1c', '#f0b050')
FACE = {'w': (255, 255, 255, 255), 'k': K, 'b': (14, 11, 11, 255), 'm': (110, 50, 40, 255), 'r': (170, 70, 60, 255), 'e': (200, 205, 215, 255)}
HAND = {'k': K, 'W': hexc('#d09464'), 'w': hexc('#b07448'), 'g': hexc('#6e3e22')}
HAND_FAR = {'k': K, 'W': hexc('#a8744c'), 'w': hexc('#8a5a38'), 'g': hexc('#52301a')}
GUN = {'k': K, 'G': hexc('#3a3846'), 'g': hexc('#5c5a6a'), 'h': hexc('#8a8898')}
GUN_R = ['kkkkkkkkkk', 'khhhhhhhgk', 'kgGGGGGGGk', 'kGGkkkkkkk', 'kGGk......', 'kkkk......']
GUN_L = [r[::-1] for r in GUN_R]
SG_METAL = mat('#2a2c36', '#5a5e6c', '#8e94a4', '#c8ccd8')
SG_WOOD = mat('#5a2e10', '#94541e', '#c47a3a')


CLOTH = [(COAT, 0), (COAT_FAR, 1), (LINING, 0)]  # vêtements recolorés en équipe

def torso(P, lean):
    T = lambda pts: [add(rot(sub(p, P0), lean), P) for p in pts]
    it = []
    it.append(Part(PANTS, T([(20, 40), (38, 39), (39, 45), (31, 45), (29, 47), (27, 45), (19, 45)]), shades=[(T([(20, 40), (24, 40), (25, 45), (19, 45)]), 0)], outline='outer'))
    # manteau ouvert : pans de cuir, doublure rouge sur les bords, tenue noire dessous
    it.append(Part(COAT, T([(18.5, 22), (27, 19.5), (34, 19.5), (39.5, 22), (38.5, 31), (39, 41), (20.5, 41), (20, 31)]),
                   shades=[(T([(18.5, 22), (24, 21), (24.4, 41), (20.5, 41), (20, 31)]), 0), (T([(35, 21), (39.5, 22), (38.5, 28), (36, 26)]), 2),
                           (T([(23, 33), (27, 34), (27, 35), (23, 34)]), 0)]))
    it.append(Part(INNER, T([(27.5, 21), (34.5, 21), (35, 41), (28, 41)]), shades=[(T([(27.5, 21), (30, 21), (30, 41), (28, 41)]), 0)], base=1, outline=False))
    # sangles croisées et boucles
    it.append(Part(INNER, T([(28, 26), (35, 30), (35, 31.4), (28, 27.4)]), base=2, outline=False))
    it.append(Part(METAL, T([(31, 27.4), (32.4, 28.2), (32.4, 29.4), (31, 28.6)]), base=1, outline=False))
    it.append(Part(LINING, T([(26.4, 19.6), (28.4, 20.6), (28.4, 41), (26.6, 41)]), shades=[(T([(26.4, 19.6), (27.2, 20), (27.2, 41), (26.6, 41)]), 0)], base=1, outline=False))
    it.append(Part(LINING, T([(34.4, 20.6), (36.2, 20), (35.6, 41), (34.4, 41)]), base=2, outline=False))
    # col relevé
    it.append(Part(COAT, T([(24, 18), (28, 20.4), (27, 23), (23.4, 21.6)]), shades=[(T([(24, 18), (25.6, 19), (24.6, 22)]), 0)]))
    it.append(Part(COAT, T([(36, 18), (37.6, 21), (35, 22.6), (33.6, 20.4)]), base=2))
    # ceinture
    it.append(Part(INNER, T([(27.6, 38.4), (35, 38.4), (35, 40.6), (27.6, 40.6)]), base=0, outline=False))
    it.append(Part(METAL, T([(30.4, 38.6), (32.4, 38.6), (32.4, 40.4), (30.4, 40.4)]), base=2, outline=False))
    return it, T


def coat_tails(T, P, lean, swing, near=True):
    """Pans du manteau sous la ceinture : jusqu'au mollet, flottent avec swing (degrés, + = vers l'arrière)."""
    if near:
        top = [(19.6, 40), (27.6, 40)]
        base = [T([p])[0] for p in top]
        bot = [add(base[0], rot((-2.5, 15), swing)), add(base[1], rot((-1, 14), swing * 0.8))]
        sil = [base[0], base[1], bot[1], bot[0]]
        lin = [base[1], add(base[1], (-1.6, 0)), add(bot[1], (-1.6, 0)), bot[1]]
        return [Part(COAT + [LINING[1]], sil, shades=[([base[0], add(base[0], (2.6, 0)), add(bot[0], (2.6, 0)), bot[0]], 0), (lin, 4)], base=1, outline=True)]
    top = [(28, 40), (38.6, 40)]
    base = [T([p])[0] for p in top]
    bot = [add(base[0], rot((1.5, 14), swing * 0.8)), add(base[1], rot((3, 15), swing))]
    sil = [base[0], base[1], bot[1], bot[0]]
    lin = [base[0], add(base[0], (1.8, 0)), add(bot[0], (1.8, 0)), bot[0]]
    return [Part(COAT_FAR + [LINING[0]], sil, shades=[(lin, 3)], base=1)]


def back_tail(T, swing):
    base = T([(21, 39)])[0]; b2 = T([(37, 39)])[0]
    return Part(COAT_FAR, [base, b2, add(b2, rot((2, 16), swing)), add(base, rot((-6, 16), swing * 1.2))], base=1)


def head(N, tilt=0, expr='normal', flow=0):
    T = lambda pts: [add(rot(sub(p, N0), tilt), N) for p in pts]
    o = (round(N[0] - N0[0]), round(N[1] - N0[1]))
    it = []
    it.append(Part(SKIN, T([(28, 18), (33, 18), (33, 22), (28, 22)]), base=0))
    # crâne rasé : forme de la tête visible, cheveux très courts sur le dessus
    it.append(Part(SKIN, T([(25, 7), (29, 4), (35, 4.4), (38.4, 7.6), (38.6, 11.4), (39.8, 13.4), (38.8, 14.4), (38.4, 16), (37, 18.8), (34, 20.6), (30, 20.6), (26.6, 18), (24.6, 13)]),
                   shades=[(T([(24.6, 13), (25, 7), (28.6, 9), (29.4, 20.6), (28.6, 20.4), (26.6, 18)]), 1), (T([(35, 9), (38.2, 9.6), (38.4, 12), (36, 12.6)]), 3),
                           (T([(37.4, 11.8), (39.8, 13.4), (38.8, 14.4), (37.6, 14)]), 3)], base=2))
    it.append(Part(SKIN, T([(26, 11.6), (28.2, 11.6), (28.6, 15.6), (26.2, 15.6)]), base=0))
    # coupe courte dégradée : dessus foncé, côtés plus clairs (peau qui transparaît)
    it.append(Part(HAIR, T([(24.6, 11), (24.4, 7), (26.6, 4.2), (30, 2.8), (34.6, 3), (37.8, 5.4), (38.6, 7.6), (36.4, 7.2), (33, 7.4), (30, 8), (28, 9.4), (26.8, 11.6)]),
                   shades=[(T([(27, 4.4), (31, 3.4), (34, 3.6), (30, 4.8)]), 2)]))
    it.append(Part(mat('#3a281c', '#5a4030', '#7a5a44'), T([(24.6, 11), (26.8, 11.6), (26.4, 14), (24.8, 13.4)]), base=1, outline=False))
    # barbe noire fournie : mâchoire, menton, moustache
    it.append(Part(BEARD, T([(27.4, 14.4), (29.4, 16.6), (33, 16.4), (35, 15.2), (38.6, 15.4), (38.4, 16.6), (37, 19), (34, 21.6), (30, 21.4), (27, 18.6)]),
                   shades=[(T([(27.4, 14.4), (29.4, 16.6), (30.4, 21.4), (27, 18.6)]), 0)], base=1))
    it.append(Part(SKIN, T([(34, 17.2), (37.4, 17), (37, 18.2), (34.2, 18.4)]), base=1, outline=False))
    fx, fy = o
    # lunettes de soleil noires sur les yeux (verres fins, reflet)
    it.append(stamp(["kkkkk.kkk"], FACE, 29 + fx, 9 + fy) if expr != 'hurt' else stamp(["kkkk..kkk"], FACE, 29 + fx, 8 + fy))
    G = mat('#060508', '#121018', '#5a5868')
    it.append(Part(G, T([(30.8, 11), (34.6, 11), (34.4, 13), (33.4, 13.6), (31.2, 13.2)]), shades=[(T([(31.2, 11.1), (32.4, 11.1), (31.6, 12)]), 2)], base=1, outline=False))
    it.append(Part(G, T([(35.8, 11), (38.4, 11), (38.2, 12.8), (36.2, 13.2)]), shades=[(T([(36, 11.1), (36.8, 11.1), (36.2, 11.8)]), 2)], base=1, outline=False))
    it.append(Part(G, T([(34.4, 11), (35.9, 11), (35.9, 11.8), (34.4, 11.8)]), base=0, outline=False))
    it.append(Part(G, T([(26.6, 11.4), (31, 11), (31, 11.9), (26.6, 12.3)]), base=0, outline=False))
    if expr == 'hurt':
        it.append(stamp(["mrm"], FACE, 34 + fx, 17 + fy))
    elif expr == 'shout':
        it.append(stamp(["kkk", "rmk"], FACE, 34 + fx, 17 + fy))
    else:
        it.append(stamp(["mmm"], FACE, 34 + fx, 17 + fy))
    it.append(stamp(["e"], FACE, 26 + fx, 16 + fy))  # anneau à l'oreille
    return it


def arm(sh, el, wr, far, fist='R', gun=False):
    M = COAT_FAR if far else COAT
    it = [slab(sh, el, 6.0, 5.4, M, ext0=0.8, ext1=1.0), slab(el, wr, 5.4, 5.0, M, ext0=1.2, ext1=0.2)]
    d = sub(wr, el); L = math.hypot(*d) or 1; u = (d[0] / L, d[1] / L)
    it.append(slab(add(wr, mul(u, -1.6)), add(wr, mul(u, 0.4)), 5.6, 5.6, LINING, base=1, dark=0.4))
    if fist is None: return it
    rows = FIST[fist]
    anchor = {'R': (0, 3.5), 'L': (7, 3.5), 'U': (3.5, 7), 'UL': (3.5, 7), 'D': (3.5, 0)}[fist]
    at = (round(wr[0] - anchor[0] + u[0] * 1.2), round(wr[1] - anchor[1] + u[1] * 1.2))
    if gun:
        g = GUN_R if gun == 'R' else GUN_L
        it.append(stamp(g, GUN, at[0] + (3 if gun == 'R' else -6), at[1] - 1))
    it.append(stamp(rows, HAND_FAR if far else HAND, *at))
    return it


def leg(hip, kn, an, far, foot=1, foot_rot=0):
    M = PANTS_FAR if far else PANTS
    it = []
    boot = [(-3.8, -3), (3, -3), (3.6, 1), (8, 2.4), (9, 4), (8.6, 5.2), (-4, 5.2)]
    boot = [add(rot((x * foot, y), foot_rot * foot), an) for x, y in boot]
    hi = [add(rot((x * foot, y), foot_rot * foot), an) for x, y in [(-1.6, -2.6), (2, -2.6), (2.6, 1), (6, 2.6), (1, 2.6)]]
    sole = [add(rot((x * foot, y), foot_rot * foot), an) for x, y in [(-4, 4.2), (8.8, 4.2), (8.6, 5.2), (-4, 5.2)]]
    it.append(Part(BOOT, boot, shades=[(hi, 2), (sole, 0)]))
    it.append(slab(kn, add(an, mul(sub(an, kn), -0.15)), 6.6, 6.2, M, ext0=1.5))
    it.append(slab(hip, kn, 7.8, 6.8, M, ext0=1.0, ext1=1.2))
    dk = sub(kn, hip); Lk = math.hypot(*dk) or 1
    n = (-dk[1] / Lk, dk[0] / Lk)
    it[-1].shades.append((fold(add(kn, mul(n, -1)), mul(n, 1), 2.6), 0))
    return it


def saber(hand, ang):
    """Sabre courbe : garde dorée à la main, lame argentée dans la direction ang (degrés, 0 = droite)."""
    u = (math.cos(math.radians(ang)), math.sin(math.radians(ang))); n = (-u[1], u[0])
    pts_t, pts_b = [], []
    for i in range(9):
        t = i / 8
        c = add(add(hand, mul(u, 3 + 22 * t)), mul(n, -2.4 * t * t))
        w = 1.6 * (1 - 0.6 * t * t)
        pts_t.append(add(c, mul(n, w))); pts_b.append(add(c, mul(n, -w)))
    blade = pts_t + pts_b[::-1]
    edge = pts_t[1:] + [add(p, mul(n, -0.9)) for p in pts_t[1:][::-1]]
    guard = [add(add(hand, mul(u, 2)), mul(n, 3)), add(add(hand, mul(u, 3.2)), mul(n, 3)), add(add(hand, mul(u, 3.2)), mul(n, -3)), add(add(hand, mul(u, 2)), mul(n, -3))]
    grip = [add(add(hand, mul(u, -3)), mul(n, 1)), add(add(hand, mul(u, 2)), mul(n, 1)), add(add(hand, mul(u, 2)), mul(n, -1)), add(add(hand, mul(u, -3)), mul(n, -1))]
    return [Part(METAL, blade, shades=[(edge, 2)], base=1), Part(INNER, grip, base=1), Part(GOLD, guard, base=1)]


def pan(hand, ang):
    u = (math.cos(math.radians(ang)), math.sin(math.radians(ang))); n = (-u[1], u[0])
    c = add(hand, mul(u, 10))
    disk = [add(c, add(mul(u, 6.2 * math.cos(t / 12 * 6.283)), mul(n, 5.6 * math.sin(t / 12 * 6.283)))) for t in range(12)]
    inner = [add(c, add(mul(u, 4.4 * math.cos(t / 12 * 6.283) - 0.6), mul(n, 3.8 * math.sin(t / 12 * 6.283) - 0.6))) for t in range(12)]
    handle = slab(add(hand, mul(u, -2)), add(hand, mul(u, 4.4)), 2.2, 2.2, INNER, base=1)
    return [handle, Part(mat('#2a2a34', '#5a5a68', '#8a8a98', '#c0c0cc'), disk, shades=[(inner, 0)], base=2)]


def handball(c):
    disk = [add(c, (4.2 * math.cos(t / 14 * 6.283), 4.2 * math.sin(t / 14 * 6.283))) for t in range(14)]
    return [Part(mat('#a03018', '#f4f0e8', '#ffffff'), disk, shades=[([add(c, (-1, -4.2)), add(c, (1.2, -4.2)), add(c, (1.2, 4.2)), add(c, (-1, 4.2))], 0),
                                                                    ([add(c, (1, 1.4)), add(c, (4.2, 1)), add(c, (3.6, 3)), add(c, (1, 3.4))], 0)], base=1)]



def shotgun(hand, ang):
    """Fusil à pompe tenu à la main : canon dans la direction ang (degrés), crosse en bois derrière la main."""
    u = (math.cos(math.radians(ang)), math.sin(math.radians(ang))); n = (-u[1], u[0])
    it = []
    # crosse (bois), un peu cassée vers le bas
    c0 = add(hand, mul(u, -1)); c1 = add(add(hand, mul(u, -8)), mul(n, 1.6))
    it.append(slab(c0, c1, 3.0, 4.6, SG_WOOD, base=1, dark=0.4))
    # canon (métal) et pompe (bois) dessous
    it.append(slab(add(hand, mul(u, -1.5)), add(hand, mul(u, 20)), 3.0, 2.6, SG_METAL, base=1, dark=0.4))
    it.append(slab(add(add(hand, mul(u, 8)), mul(n, 1.6)), add(add(hand, mul(u, 14)), mul(n, 1.6)), 3.0, 3.0, SG_WOOD, base=1, dark=0.4))
    return it


def frame(p):
    P = (p['P'][0] + OX, p['P'][1]); lean = p.get('lean', 0)
    tor, T = torso(P, lean)
    N = add(T([N0])[0], p.get('hd', (0, 0)))
    sN = T([(19, 22.5)])[0]; sF = T([(37, 22.5)])[0]
    hN = T([(23.5, 43)])[0]; hF = T([(33.5, 43)])[0]
    sw = p.get('swing', 0)
    it = [back_tail(T, sw)]
    wF = add(sF, p['fA'][1])
    if p.get('sgFar') is not None: it += shotgun(wF, p['sgFar'])
    it += arm(sF, add(sF, p['fA'][0]), wF, True, p.get('fFist', 'R'), p.get('fGun', False))
    it += leg(hF, add(hF, p['fL'][0]), add(hF, p['fL'][1]), True, p.get('fFoot', 1), p.get('fRot', 0))
    it += coat_tails(T, P, lean, sw, near=False)
    it += leg(hN, add(hN, p['nL'][0]), add(hN, p['nL'][1]), False, p.get('nFoot', -1), p.get('nRot', 0))
    it += coat_tails(T, P, lean, sw, near=True)
    it += tor
    hd_ = head(N, p.get('tilt', 0), p.get('expr', 'normal'))
    wr = add(sN, p['nA'][1])
    near = []
    # le fusil dans la main proche (sauf si elle tient autre chose : il passe alors dans la main lointaine)
    sg = p.get('sg', 40)
    hold = sg is not None and p.get('sgFar') is None and p.get('pan') is None and not p.get('ball')
    if hold and not p.get('sgFront'): near += shotgun(wr, sg)
    near += arm(sN, add(sN, p['nA'][0]), wr, False, p.get('nFist', 'R'), p.get('nGun', False))
    if hold and p.get('sgFront'): near += shotgun(wr, sg)
    if p.get('ball'): near += handball(add(sN, p['ball']))
    if p.get('pan') is not None: near += pan(wr, p['pan'])
    # bras levé : derrière la tête (sinon il cache le visage)
    it += (near + hd_) if p.get('armBehind') else (hd_ + near)
    return compose(it, W, H)


POSES = {
    'idle0': dict(P=(29, 40), nA=((1, 9.5), (6.5, 0)), fA=((4, 7.5), (8, 5)), sg=12, nL=((-3, 8), (-5.5, 14)), fL=((5, 7), (7, 14))),
    'idle1': dict(P=(29, 41), hd=(0, 1), swing=3, nA=((1, 9.5), (6.5, 1)), fA=((4, 7.5), (8, 6)), sg=14, nL=((-3.5, 7.5), (-5.5, 13)), fL=((5.5, 6.5), (7, 13))),
    'run0': dict(P=(30, 41), lean=10, swing=35, nA=((-5, 7), (-10, 11)), fA=((5, 6), (11, 2)), nFist='L', sg=160,
                 nL=((-7, 6), (-14, 10)), fL=((7, 4), (8, 13)), nRot=-30),
    'run1': dict(P=(30, 40), lean=10, swing=45, nA=((5, 6), (11, 1)), fA=((-3, 8), (0, 14)), fFist='D', sg=10,
                 nL=((10, 2), (13, 10)), fL=((-7, 6), (-15, 9)), fRot=-25, nFoot=1),
    'jump': dict(P=(30, 41), lean=4, swing=-25, nA=((-3, 8), (2, 3)), fA=((5, 6), (9, 0)), nFist='U', fFist='U', sg=165,
                 nL=((3, 7), (-2, 13)), fL=((8, 4), (7, 12)), nRot=-35, fRot=10, nFoot=1),
    'hurt': dict(P=(27, 41), lean=-14, tilt=-14, hd=(-1, 1), expr='hurt', swing=-30, nA=((-6, 6), (-10, 0)), fA=((6, -3), (11, -7)),
                 nFist='L', fFist='U', sg=200, nL=((-2, 8), (-5, 15)), fL=((5, 8), (9, 15))),
    # FUSIL À POMPE : épaulé, tir devant
    'gun': dict(P=(27, 41), lean=6, expr='shout', swing=10, nA=((9, 1), (17, -1)), fA=((8, 3), (15, -1)), sg=-3, fFist='R',
                nL=((-4, 7), (-8, 14)), fL=((6, 6), (8, 14))),
    # tir vers le haut
    'gunUp': dict(P=(28, 41), lean=-6, tilt=-6, expr='shout', swing=0, armBehind=True, nA=((10, -4), (20, -12)), fA=((8, -3), (15, -9)), sg=-50, fFist='R',
                  nL=((-4, 8), (-7, 14)), fL=((6, 6), (9, 14))),
    # tir vers le sol devant lui (ricochet)
    'gunDown': dict(P=(28, 45), lean=14, hd=(1, 1), expr='shout', swing=20, nA=((9, 4), (17, 9)), fA=((8, 5), (14, 10)), sg=30, fFist='R',
                    nL=((-5, 5), (-10, 10)), fL=((8, 3), (10, 10))),
    # en l'air : tir droit vers le bas (le recul le fait remonter)
    'gunAirDown': dict(P=(30, 38), lean=0, swing=-35, nA=((4, 8), (6, 16)), fA=((5, 7), (8, 14)), sg=88, fFist='R',
                       nL=((-4, 6), (-8, 11)), fL=((5, 6), (9, 11)), nRot=-30, fRot=20),
    # COUP DE CROSSE : le fusil retourné, crosse en avant
    'butt': dict(P=(25, 42), lean=16, hd=(2, 0), expr='shout', swing=30, nA=((10, 5), (19, 5)), fA=((-2, 8), (-5, 13)), sg=188, sgFront=True, fFist='D',
                 nL=((-8, 5), (-14, 11)), fL=((10, 3), (13, 11))),
    # COUP DE POÊLE : poêle en avant, le fusil dans l'autre main
    'panHit': dict(P=(26, 42), lean=16, hd=(1, 0), expr='shout', swing=30, nA=((11, 1), (19, 0)), fA=((-2, 8), (-4, 13)), pan=-10, sgFar=100, fFist='D',
                   nL=((-8, 5), (-14, 11)), fL=((10, 3), (13, 11))),
    # AIGLE : bras levé, l'aigle part de la manche
    'summon': dict(P=(29, 40), lean=-4, tilt=-4, expr='shout', fA=((3, -8), (5, -15)), nA=((1, 9.5), (6.5, 0)), fFist='U', sg=40,
                   nL=((-3, 8), (-5.5, 14)), fL=((5, 7), (7, 14))),
    # HERMINE : la main frappe le sol
    'pointDown': dict(P=(29, 44), lean=18, hd=(1, 0), expr='shout', swing=-10, nA=((6, 6), (9, 14)), fA=((3, 7), (5, 13)), nFist='D', fFist='D', sg=100,
                      nL=((-6, 4), (-7, 11)), fL=((8, 3), (9, 10))),
    # HANDBALL : ballon armé derrière l'épaule, le fusil dans l'autre main
    'charge': dict(P=(30, 41), lean=-8, tilt=-4, swing=-15, nA=((-7, 3), (-9, -6)), fA=((7, 4), (13, 1)), nFist='U', ball=(-9.5, -15), sgFar=20,
                   nL=((-5, 7), (-9, 14)), fL=((7, 6), (9, 14))),
    'throwBall': dict(P=(26, 42), lean=14, hd=(1, 0), expr='shout', swing=30, nA=((10, 2), (20, 0)), fA=((-2, 8), (-5, 13)), nFist='O' if False else 'R', sgFar=100, sg=None,
                      nL=((-6, 7), (-11, 13)), fL=((8, 5), (11, 13))),
    # POÊLE : plongeon en l'air, poêle vers le bas
    'plungePan': dict(P=(30, 38), lean=6, swing=-35, nA=((5, 6), (6, 13)), fA=((-4, 5), (-8, 0)), fFist='UL', nFist='D', pan=90, sgFar=200,
                      nL=((-2, 7), (-4, 13)), fL=((5, 6), (6, 14)), fRot=40, nRot=-20),
}

if __name__ == '__main__':
    import sys, os
    names = sys.argv[1].split(',') if len(sys.argv) > 1 else list(POSES)
    os.makedirs('deno', exist_ok=True)
    for n in names: frame(POSES[n]).save(f'deno/{n}.png')
