# AdieuLescure : maillot marine à scapulaire blanc (le V des Girondins), jean simple, baskets blanches.
# Tête d'après les photos : cheveux bruns très bouclés (volume sur le dessus, côtés dégradés courts), sourcils épais,
# moustache et bouc roux, barbe courte sur la mâchoire, anneaux dorés à l'oreille.
import math
from flat import *
from toro_set import slab, fold, sub, add, mul, rot, FIST, P0, N0

W, H = 80, 64
OX = 11
SKIN = mat('#a8603e', '#e0a07a', '#f4c4a0', '#ffe0c8')
SKIN_FAR = mat('#80442a', '#b87a58', '#d49c78', '#e8bc98')
HAIR = mat('#1e1009', '#3e2414', '#62391f', '#8a5630')
FADE = mat('#3a2a22', '#5a4438', '#6e5446')
BEARD = (150, 74, 40, 255)
BEARD_D = (112, 52, 28, 255)
NAVY = mat('#0c1024', '#1b2346', '#2c3866', '#43528c')
NAVY_FAR = mat('#080a18', '#131932', '#1f294c')
WHITE = mat('#9ea4b8', '#dfe3ee', '#ffffff')
JEAN = mat('#22385e', '#36578c', '#5079b4', '#7aa0d4')
JEAN_FAR = mat('#182844', '#284068', '#3a5a8c')
SHOE = mat('#7c8094', '#c8ccd8', '#f4f6fa')
SOLE = mat('#3a3a46', '#5a5a66', '#7a7a86')
GOLD = (240, 196, 80, 255)
GOLD_D = (176, 128, 40, 255)
FACE = {'w': (255, 255, 255, 255), 'k': K, 'b': (60, 34, 18, 255), 'm': (130, 50, 40, 255), 'd': (168, 96, 62, 255), 'r': (200, 80, 70, 255),
        'B': BEARD, 'D': BEARD_D, 'c': (240, 236, 226, 255), 'o': (255, 120, 40, 255), 'g': (190, 186, 176, 255)}
HAND = {'k': K, 'W': hexc('#f4c4a0'), 'w': hexc('#e0a07a'), 'g': hexc('#a8603e')}
HAND_FAR = {'k': K, 'W': hexc('#d49c78'), 'w': hexc('#b87a58'), 'g': hexc('#80442a')}
POINT = ['..kk....', '.kWk....', '.kWk....', '.kWkkk..', 'kWWWWWk.', 'kwWWWWk.', 'kgwwwwk.', '.kkkkk..']
OPEN = ['.kkkk...', 'kWWWWk..', 'kWWWWWk.', 'kWWWWWk.', 'kwWWWWk.', 'kgwwwwk.', '.kkkkk..']


def torso(P, lean):
    T = lambda pts: [add(rot(sub(p, P0), lean), P) for p in pts]
    it = []
    # jean (ceinture visible sous le maillot)
    it.append(Part(JEAN, T([(20, 39), (38, 38.5), (39, 45), (31, 45), (29, 47), (27, 45), (19, 45)]),
                   shades=[(T([(20, 39), (24, 39), (25, 45), (19, 45)]), 0), (T([(28.4, 42), (29.4, 42), (29.4, 46), (28.4, 46)]), 0)], outline='outer'))
    # maillot ample, un peu sorti du jean
    it.append(Part(NAVY, T([(19, 22), (27, 20), (34, 20), (39, 22), (38.4, 31), (39.4, 40.6), (34, 41.6), (29, 41.2), (24, 41.8), (20.4, 40.8), (20, 31)]),
                   shades=[(T([(19, 22), (24, 21), (24.6, 41.6), (20.4, 40.8), (20, 31)]), 0), (T([(35, 21), (39, 22), (38.2, 29), (36, 27)]), 2),
                           (T([(25, 35), (30, 36.6), (30, 37.6), (25, 36)]), 0), (T([(33, 37.6), (38, 35.6), (38.4, 36.6), (33, 38.6)]), 0)]))
    # col en V marine
    it.append(Part(SKIN, T([(28.4, 20), (33.4, 20), (31.2, 24.4)]), shades=[(T([(31, 20), (33.4, 20), (31.4, 23)]), 1)], base=2, outline=False))
    it.append(Part(NAVY, T([(27.6, 19.6), (28.8, 19.6), (31.4, 24.8), (30.8, 25.4)]), base=0, outline=False))
    it.append(Part(NAVY, T([(33, 19.6), (34.2, 19.8), (31.6, 25.4), (31.2, 24.6)]), base=0, outline=False))
    # scapulaire : le grand V blanc, des épaules jusqu'au milieu de la poitrine
    it.append(Part(WHITE, T([(20.2, 22.6), (23.2, 21.6), (31.4, 29.6), (31.2, 33.2)]), shades=[(T([(20.2, 22.6), (22, 22), (31.2, 31.6), (31.2, 33.2)]), 0)], base=1, outline=False))
    it.append(Part(WHITE, T([(38.6, 22.4), (36.4, 21.2), (31.4, 29.6), (31.2, 33.2)]), shades=[(T([(37.6, 21.8), (38.6, 22.4), (32.4, 31.6), (32, 30.2)]), 2)], base=1, outline=False))
    return it, T


def head(N, tilt=0, expr='normal', clope=False):
    T = lambda pts: [add(rot(sub(p, N0), tilt), N) for p in pts]
    o = (round(N[0] - N0[0]), round(N[1] - N0[1]))
    it = []
    it.append(Part(SKIN, T([(28, 18), (33, 18), (33, 22), (28, 22)]), base=0))
    # visage plein, joues rondes, nez droit et marqué
    it.append(Part(SKIN, T([(25, 6), (30, 4), (35, 5), (38, 8), (38.4, 11.2), (39.8, 13.4), (38.6, 14.6), (38.4, 16.2), (37, 18.8), (33.6, 20.6), (30, 20.6), (26.6, 18), (24.4, 13)]),
                   shades=[(T([(24.4, 13), (25, 6), (29, 9), (29.6, 20.6), (28.6, 20.2), (26.6, 18)]), 1), (T([(33, 19.8), (37, 18.6), (33.6, 20.6)]), 1),
                           (T([(35, 9), (38, 10), (38.2, 12.4), (36, 13)]), 3), (T([(37.2, 11.6), (39.8, 13.4), (38.6, 14.6), (37.4, 14.2)]), 3)], base=2))
    # oreille (côté visible), avec les anneaux dorés
    it.append(Part(SKIN, T([(25.6, 11.6), (28, 11.4), (28.6, 16), (26.6, 16.6), (25.6, 14.6)]), shades=[(T([(26.2, 12.4), (27.4, 12.4), (27.6, 15), (26.6, 15)]), 0)], base=1))
    # côtés dégradés courts (derrière l'oreille)
    it.append(Part(FADE, T([(24.2, 13.6), (23.8, 10.4), (26, 10), (26, 11.6), (25.4, 14)]), base=1, outline=False))
    # boucles : grosse masse ronde et irrégulière, mèches bouclées qui tombent sur le front
    sil = [(24.2, 11.4), (22.8, 9.2), (22.4, 6.6), (23.4, 4.6), (23.0, 3.2), (24.8, 2.4), (25.4, 0.8), (27.4, 1.0), (28.6, -0.2), (30.6, 0.6),
           (32.2, -0.4), (34.0, 0.6), (35.8, 0.0), (37.2, 1.4), (39.0, 1.4), (39.6, 3.2), (41.2, 4.2), (41.0, 6.0), (42.0, 7.4), (40.8, 8.6),
           (40.6, 10.0), (39.4, 9.2), (38.6, 10.4), (37.4, 9.0), (36.4, 9.8), (35.4, 8.6), (34.2, 9.6), (33.2, 8.4), (32.0, 9.2), (31.0, 8.0),
           (29.8, 8.8), (28.8, 8.0), (27.6, 9.2), (26.6, 8.6), (26.2, 10.6)]
    curls = []
    for (cx, cy, r) in [(25.6, 3.6, 1.5), (28.8, 2.0, 1.6), (32.4, 1.8, 1.6), (36.0, 2.2, 1.5), (39.0, 4.2, 1.3), (24.6, 7.2, 1.3), (28.2, 5.6, 1.4),
                        (31.8, 5.2, 1.4), (35.2, 5.6, 1.4), (38.4, 7.2, 1.1), (30.2, 7.6, 0.9), (33.6, 7.8, 0.9), (36.8, 8.2, 0.9)]:
        curls.append(([(cx + r * math.cos(t / 7 * 6.283), cy + r * 0.85 * math.sin(t / 7 * 6.283)) for t in range(7)], 3 if cy < 4 else 2))
        curls.append(([(cx + 0.4 + r * 0.55 * math.cos(t / 5 * 6.283), cy + 0.7 + r * 0.45 * math.sin(t / 5 * 6.283)) for t in range(5)], 0))
    sq = lambda pts: [(32 + (x - 32) * 0.95, 9.4 + (y - 9.4) * 0.84) if y < 9.4 else (x, y) for x, y in pts]
    sil = sq(sil)
    curls = [(sq(c), tn) for c, tn in curls]
    it.append(Part(HAIR, T(sil), shades=[(T([(22.6, 7), (24.6, 9), (26.2, 10.6), (24.2, 11.4), (22.8, 9.2)]), 0)] + [(T(c), tn) for c, tn in curls], base=1))
    fx, fy = o
    # barbe rousse courte : points le long de la mâchoire, moustache fine, bouc sous la lèvre
    st = {'s': (190, 120, 86, 255), 'B': BEARD, 'D': BEARD_D}
    it.append(stamp(["s.......", ".ss.....", "..sss...", "....ss.."], st, 28 + fx, 16 + fy))
    it.append(stamp(["BBBB"], FACE, 35 + fx, 15 + fy))
    it.append(stamp(["BDBB", ".BB."], st, 34 + fx, 17 + fy))
    # anneaux à l'oreille
    it.append(stamp(["G", "g", "G"], {'G': GOLD, 'g': GOLD_D}, 26 + fx, 13 + fy))
    # sourcils épais + yeux
    if expr == 'hurt':
        it.append(stamp(["kkkkk.kkk", "....k....", ".kkk....."], FACE, 29 + fx, 10 + fy))
        it.append(stamp(["mmr."], FACE, 35 + fx, 16 + fy))
    elif expr == 'shout':
        it.append(stamp(["kkkkk.kkk", "...wbk.wb", "...wk...."], FACE, 29 + fx, 10 + fy))
        it.append(stamp(["kkk", "mrk"], FACE, 35 + fx, 16 + fy))
    else:
        it.append(stamp(["kkkkk.kkk", "...wbk.wb", "...wk...."], FACE, 29 + fx, 10 + fy))
        it.append(stamp(["..k", "mk."], FACE, 36 + fx, 16 + fy))
    if clope:  # cigarette au coin des lèvres
        it.append(stamp(["cccco", ".gg.."], FACE, 37 + fx, 17 + fy))
    return it


def arm(sh, el, wr, far, fist='R'):
    """Manche courte marine (liseré blanc), avant-bras nu."""
    d = sub(wr, el); L = math.hypot(*d) or 1; u = (d[0] / L, d[1] / L)
    M = NAVY_FAR if far else NAVY
    Sk = SKIN_FAR if far else SKIN
    mid = add(sh, mul(sub(el, sh), 0.55))
    it = [slab(add(sh, mul(sub(el, sh), 0.4)), el, 4.6, 4.2, Sk, ext1=0.6), slab(el, wr, 4.2, 3.8, Sk, ext0=0.4, ext1=0.2),
          slab(sh, mid, 6.4, 6.2, M, ext0=0.9, ext1=0.2)]
    du = sub(mid, sh); Lu = math.hypot(*du) or 1; uu = (du[0] / Lu, du[1] / Lu)
    it.append(slab(add(mid, mul(uu, -1.2)), add(mid, mul(uu, -0.3)), 6.2, 6.2, WHITE if not far else mat('#7a8098', '#aeb2c6', '#d4d8e8'), base=1, dark=0.4))
    if fist is None: return it
    rows = POINT if fist == 'P' else OPEN if fist == 'O' else FIST[fist]
    anchor = {'R': (0, 3.5), 'L': (7, 3.5), 'U': (3.5, 7), 'UL': (3.5, 7), 'D': (3.5, 0), 'P': (3, 7), 'O': (1, 3)}[fist]
    at = (round(wr[0] - anchor[0] + u[0] * 1.2), round(wr[1] - anchor[1] + u[1] * 1.2))
    it.append(stamp(rows, HAND_FAR if far else HAND, *at))
    return it


def leg(hip, kn, an, far, foot=1, foot_rot=0):
    M = JEAN_FAR if far else JEAN
    it = []
    shoe = [(-3.5, 1.0), (3, 1.0), (8, 2.8), (9, 4.0), (8.5, 5), (-3.8, 5)]
    shoe = [add(rot((x * foot, y), foot_rot * foot), an) for x, y in shoe]
    sole = [add(rot((x * foot, y), foot_rot * foot), an) for x, y in [(-3.8, 4), (8.8, 4), (8.5, 5), (-3.8, 5)]]
    hi = [add(rot((x * foot, y), foot_rot * foot), an) for x, y in [(-1, 1.2), (3, 1.2), (6, 2.4), (1, 2.4)]]
    it.append(Part(SHOE, shoe, shades=[(hi, 2), (sole, 0)]))
    it.append(slab(kn, add(an, mul(sub(an, kn), 0.08)), 6.8, 6.4, M, ext0=1.5))
    it.append(slab(hip, kn, 7.8, 7.0, M, ext0=1.0, ext1=1.2))
    dk = sub(kn, hip); Lk = math.hypot(*dk) or 1
    n = (-dk[1] / Lk, dk[0] / Lk)
    it[-1].shades.append((fold(add(kn, mul(n, -1)), mul(n, 1), 2.6), 0))
    return it


# ---- accessoires dessinés avec le perso -------------------------------------------------------
BIKE = mat('#7a1020', '#c42232', '#ec4a4a')
TIRE = mat('#0c0a10', '#26242e', '#4a4656')
METAL = mat('#5a5e6a', '#9aa0ae', '#d8dce6')


def wheel(c, r):
    """Roue en pixels : pneu noir, jante claire, rayons fins (l'intérieur reste transparent)."""
    m = {}
    R = int(r) + 2
    for y in range(-R, R + 1):
        for x in range(-R, R + 1):
            px_, py_ = round(c[0]) + x, round(c[1]) + y
            d = math.hypot(px_ + 0.5 - c[0], py_ + 0.5 - c[1])
            if r - 1.6 <= d <= r + 0.4: m[(px_, py_)] = K if d > r - 0.6 else (60, 58, 70, 255)
            elif r - 2.4 <= d < r - 1.6: m[(px_, py_)] = (200, 204, 214, 255)
    for k in range(6):
        a = k / 6 * math.pi
        for t in range(1, int(r - 2)):
            for sg in (-1, 1):
                m[(round(c[0] + sg * math.cos(a) * t), round(c[1] + sg * math.sin(a) * t))] = (150, 154, 166, 255)
    m[(round(c[0]), round(c[1]))] = K
    return [m]


def bike(rear, front, crank, pedal, seat, bars):
    """Vélo de course : deux roues, cadre rouge, selle, guidon."""
    it = wheel(rear, 7.6) + wheel(front, 7.6)
    head_t = (bars[0] - 2, bars[1] + 3)
    it.append(slab(rear, crank, 1.8, 1.8, BIKE, base=1, dark=0.4))
    it.append(slab(crank, seat, 2.0, 2.0, BIKE, base=1, dark=0.4))
    it.append(slab(add(seat, (0, 2)), head_t, 2.0, 2.0, BIKE, base=1, dark=0.4))
    it.append(slab(crank, head_t, 2.2, 2.2, BIKE, base=1, dark=0.4))
    it.append(slab(rear, add(seat, (0, 2)), 1.6, 1.6, BIKE, base=1, dark=0.4))
    it.append(slab(head_t, front, 1.8, 1.8, METAL, base=1, dark=0.4))
    it.append(slab(head_t, bars, 1.6, 1.6, METAL, base=1, dark=0.4))
    it.append(slab(bars, add(bars, (2, 2)), 1.6, 1.6, METAL, base=1, dark=0.4))
    it.append(Part(TIRE, [add(seat, (-3, -0.6)), add(seat, (3, -1.2)), add(seat, (3, 0.8)), add(seat, (-3, 1))], base=1))
    it.append(slab(crank, pedal, 1.4, 1.4, METAL, base=1, dark=0.4))
    return it


def fiddle(neck_end, body_c):
    """Violon : caisse vernie, manche noir, chevilles."""
    d = sub(body_c, neck_end); L = math.hypot(*d) or 1; u = (d[0] / L, d[1] / L); n = (-u[1], u[0])
    loc = lambda a, b: add(body_c, add(mul(u, a), mul(n, b)))
    M = mat('#5a2008', '#a0461a', '#d07430', '#f0a860')
    it = [slab(neck_end, loc(-4, 0), 1.8, 1.8, mat('#0c0a10', '#26242e', '#4a4656'), base=1)]
    half = [(-5, 0), (-4.4, -2.6), (-2.6, -3.0), (-1.2, -2.0), (0.6, -2.0), (2.4, -3.4), (4.4, -3.0), (5.2, 0)]
    outline = [loc(a, b) for a, b in half] + [loc(a, -b) for a, b in half[::-1][1:-1]]
    it.append(Part(M, outline, shades=[([loc(a, b) for a, b in [(-4, -2), (-1, -1.6), (3, -2.6), (3, -0.6), (-4, -0.6)]], 2)], base=1))
    return it


def bottle(base, up):
    """Bouteille de bière brune (IPA) avec étiquette."""
    d = up; L = math.hypot(*d) or 1; u = (d[0] / L, d[1] / L); n = (-u[1], u[0])
    loc = lambda a, b: add(base, add(mul(u, a), mul(n, b)))
    G = mat('#3a1a06', '#7a3a10', '#b06420', '#e09a4a')
    it = [Part(G, [loc(0, -2), loc(7, -2), loc(9, -0.9), loc(12, -0.9), loc(12, 0.9), loc(9, 0.9), loc(7, 2), loc(0, 2)],
               shades=[([loc(1, -2), loc(6, -2), loc(6, -1), loc(1, -1)], 3)], base=1)]
    it.append(Part(mat('#8a6a10', '#e8c040', '#fff0a0'), [loc(2, -2), loc(5.4, -2), loc(5.4, 2), loc(2, 2)], base=1, outline=False))
    return it


def frame(p):
    P = (p['P'][0] + OX, p['P'][1]); lean = p.get('lean', 0)
    tor, T = torso(P, lean)
    N = add(T([N0])[0], p.get('hd', (0, 0)))
    sN = T([(19, 22.5)])[0]; sF = T([(37, 22.5)])[0]
    hN = T([(23.5, 43)])[0]; hF = T([(33.5, 43)])[0]
    it = []
    if p.get('bike'):
        bk = p['bike']
        it += bike(*[add(P, q) for q in bk])
    it += arm(sF, add(sF, p['fA'][0]), add(sF, p['fA'][1]), True, p.get('fFist', 'R'))
    it += leg(hF, add(hF, p['fL'][0]), add(hF, p['fL'][1]), True, p.get('fFoot', 1), p.get('fRot', 0))
    it += leg(hN, add(hN, p['nL'][0]), add(hN, p['nL'][1]), False, p.get('nFoot', -1), p.get('nRot', 0))
    it += tor
    it += head(N, p.get('tilt', 0), p.get('expr', 'normal'), p.get('clope', False))
    if p.get('fid'):
        it += fiddle(add(sN, p['fid'][0]), add(sN, p['fid'][1]))
    if p.get('btl'):
        it += bottle(add(sN, p['btl'][0]), p['btl'][1])
    it += arm(sN, add(sN, p['nA'][0]), add(sN, p['nA'][1]), False, p.get('nFist', 'R'))
    return compose(it, W, H)


IDLE = dict(P=(29, 40), nA=((1, 9.5), (6.5, 0)), fA=((4, 7.5), (8, 5)), nL=((-3, 8), (-5.5, 14)), fL=((5, 7), (7, 14)), clope=True)
POSES = {
    'idle0': IDLE,
    'idle1': dict(IDLE, P=(29, 41), hd=(0, 1), nA=((1, 9.5), (6.5, 1)), fA=((4, 7.5), (8, 6)), nL=((-3.5, 7.5), (-5.5, 13)), fL=((5.5, 6.5), (7, 13))),
    'run0': dict(P=(30, 41), lean=10, nA=((-5, 7), (-10, 11)), fA=((5, 6), (11, 2)), nFist='L',
                 nL=((-7, 6), (-14, 10)), fL=((7, 4), (8, 13)), nRot=-30),
    'run1': dict(P=(30, 40), lean=10, nA=((5, 6), (11, 1)), fA=((-3, 8), (0, 14)), fFist='D',
                 nL=((10, 2), (13, 10)), fL=((-7, 6), (-15, 9)), fRot=-25, nFoot=1),
    'jump': dict(P=(30, 41), lean=4, nA=((-3, 8), (2, 3)), fA=((5, 6), (9, 0)), nFist='U', fFist='U',
                 nL=((3, 7), (-2, 13)), fL=((8, 4), (7, 12)), nRot=-35, fRot=10, nFoot=1),
    'hurt': dict(P=(27, 41), lean=-14, tilt=-14, hd=(-1, 1), expr='hurt', nA=((-6, 6), (-10, 0)), fA=((6, -3), (11, -7)),
                 nFist='L', fFist='U', nL=((-2, 8), (-5, 15)), fL=((5, 8), (9, 15))),
    # PASSE : petit coup de pied intérieur, au ras du sol
    'kick': dict(P=(27, 41), lean=-8, tilt=-4, expr='shout', nA=((-5, 6), (-9, 2)), fA=((5, 6), (10, 3)), nFist='L',
                 nL=((-2, 8), (-4, 15)), fL=((9, 4), (17, 7)), fRot=-30),
    # TÊTE : coup de tête, le buste jeté en avant
    'header': dict(P=(29, 42), lean=26, tilt=18, hd=(3, 1), expr='shout', nA=((-6, 4), (-11, 7)), fA=((-4, 6), (-9, 9)), nFist='L', fFist='L',
                   nL=((-6, 7), (-11, 13)), fL=((6, 6), (8, 14))),
    # ÉCHAPPÉE : en danseuse sur le vélo (deux images de pédalage)
    'ride0': dict(P=(28, 40), lean=38, tilt=14, hd=(2, 0), expr='shout', nA=((8, 7), (11, 14)), fA=((2, 6), (-1, 5)), nFist='R', fFist='R',
                  nL=((8, 1), (11, 11)), fL=((4, 2), (-4, 7)), nFoot=1, fFoot=1,
                  bike=((-12, 13), (18, 13), (1, 11), (5, 10), (-4, 1), (15, -5))),
    'ride1': dict(P=(28, 40), lean=38, tilt=14, hd=(2, 0), expr='shout', nA=((8, 7), (11, 14)), fA=((2, 6), (-1, 5)), nFist='R', fFist='R',
                  nL=((7, 4), (3, 13)), fL=((6, 0), (8, 6)), nFoot=1, fFoot=1,
                  bike=((-12, 13), (18, 13), (1, 11), (-3, 13), (-4, 1), (15, -5))),
    # IPA : il secoue la bouteille et la mousse jaillit vers le haut
    'drink': dict(P=(29, 41), lean=-6, tilt=-14, hd=(-1, 0), expr='shout', nA=((3, -6), (5, -14)), fA=((4, 7.5), (8, 5)), nFist='U',
                  btl=((5, -13), (1, -3)), nL=((-4, 8), (-6, 14)), fL=((5, 7), (8, 14))),
    # ÉPERONS : coup de pied retourné vers le haut
    'spur': dict(P=(27, 41), lean=-16, tilt=-6, hd=(-1, 0), expr='shout', nA=((-5, 6), (-9, 1)), fA=((4, 7), (6, 1)), nFist='L', fFist='U',
                 nL=((-1, 8), (-3, 16)), fL=((7, -8), (12, -18)), fRot=-95),
    # CTRL+Z : un doigt levé, comme sur le clavier
    'ctrl': dict(P=(29, 40), lean=-4, tilt=-4, expr='shout', fA=((3, -8), (5, -15)), nA=((1, 9.5), (6.5, 0)), fFist='P',
                 nL=((-3, 8), (-5.5, 14)), fL=((5, 7), (7, 14))),
    # CONTRÔLE : bras écartés, la poitrine en avant pour amortir
    'catch': dict(P=(28, 41), lean=-10, tilt=-8, expr='normal', nA=((-6, 4), (-12, 0)), fA=((6, 3), (12, -1)), nFist='O', fFist='O',
                  nL=((-4, 7), (-7, 14)), fL=((6, 6), (9, 14))),
    # REPRISE / PROJECTION : jambe tendue (aussi utilisée pour la prise)
    'volley': dict(P=(27, 39), lean=-22, tilt=-10, hd=(-2, 1), expr='shout', nA=((-4, 7), (-1, 1)), fA=((5, 5), (8, -1)), nFist='U', fFist='U',
                   nL=((-2, 8), (-4, 16)), fL=((9, -2), (19, -4)), fRot=-80),
    'slam': dict(P=(29, 41), lean=-8, tilt=-10, expr='shout', nA=((3, -7), (6, -15)), fA=((5, -6), (9, -14)), nFist='U', fFist='U',
                 nL=((-4, 8), (-7, 14)), fL=((6, 7), (9, 14))),
    # VIOLON : sous le menton, l'archet passe
    'fiddle': dict(P=(29, 40), lean=-4, tilt=8, hd=(0, 1), expr='normal', fA=((4, 2), (9, -2)), nA=((6, 4), (13, 3)), fFist='R', nFist='R',
                   fid=((9, -6), (14, 1)), nL=((-3, 8), (-5.5, 14)), fL=((5, 7), (7, 14))),
    # POMME D'AMOUR : lancer de tomate
    'toss': dict(P=(30, 41), lean=12, hd=(1, 0), expr='shout', nA=((8, 5), (17, 6)), fA=((-1, 8), (-4, 13)), nFist='O', fFist='D',
                 nL=((-6, 7), (-11, 13)), fL=((7, 6), (9, 14))),
    # RUADE : double coup de pied en arrière (comme l'âne)
    'rkick': dict(P=(34, 40), lean=30, tilt=20, hd=(3, 2), expr='shout', nA=((3, 9), (8, 14)), fA=((4, 8), (9, 13)), nFist='D', fFist='D',
                  nL=((-9, 1), (-19, 0)), fL=((-8, 4), (-17, 5)), nRot=80, fRot=70, nFoot=1),
}

if __name__ == '__main__':
    import sys
    names = sys.argv[1].split(',') if len(sys.argv) > 1 else list(POSES)
    import os; os.makedirs('adieu', exist_ok=True)
    frames = [frame(POSES[n]) for n in names]
    for n, f in zip(names, frames): f.save(f'adieu/{n}.png')
    sheet(frames, 'adieu_preview.png', sc=6)
