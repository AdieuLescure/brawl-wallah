# KYLIAN : uniforme militaire marron d'apparat (vareuse à col montant, pattes de col rouges bordées d'or, épaulettes
# dorées, rangée de barrettes et 4 médailles, boutons dorés, baudrier de cuir), crâne rasé, peau foncée, air sérieux.
# Insignes INVENTÉS (aucun vrai drapeau ni écusson). Pantalon du même marron, bottes noires.
# Aussi sur la planche : la DEMOISELLE en robe de soirée rouge (personnage inventé) qui vient lui faire un bisou
# (postures 'girl0', 'girl1', 'girlKiss'), et la posture de face à genoux, bras croisés ('knee', plongeon).
import math
from flat import *
from toro_set import slab, fold, sub, add, mul, rot, FIST, P0, N0

W, H = 80, 64
OX = 11
SKIN = mat('#3e2216', '#5e3624', '#7c4c34', '#986246')
HAIR = mat('#0c0808', '#1a1312', '#2a201e')
UNI = mat('#3a2e1c', '#5c4a2e', '#7a6440', '#957d54')
UNI_FAR = mat('#2a2214', '#463822', '#5e4c32')
RED = mat('#6e1010', '#b42222', '#e04040')
GOLD = mat('#7a5414', '#c8962a', '#f0c850', '#fff0a0')
LEATHER = mat('#1e100a', '#3e2414', '#5e3a20', '#7e5030')
BOOT = mat('#0c0a0e', '#1e1c22', '#36343c', '#52505a')
BOOT_FAR = mat('#08060a', '#16141a', '#2a2830')
SILVER = mat('#6a6e78', '#b4b8c4', '#eef0f6')
FACE = {'w': (255, 255, 255, 255), 'k': K, 'b': (14, 8, 6, 255), 'B': (34, 20, 14, 255), 'm': (80, 36, 30, 255), 'r': (150, 60, 56, 255),
        'e': (110, 66, 48, 255), 'p': (196, 110, 120, 255)}
HAND = {'k': K, 'W': hexc('#986246'), 'w': hexc('#7c4c34'), 'g': hexc('#5e3624')}
HAND_FAR = {'k': K, 'W': hexc('#7c4c34'), 'w': hexc('#643c28'), 'g': hexc('#4a2a1c')}
OPEN = ['.kkkk...', 'kWWWWk..', 'kWWWWWk.', 'kWWWWWk.', 'kwWWWWk.', 'kgwwwwk.', '.kkkkk..']
CUP = ['..kkkk..', '.kWWWWk.', 'kWWwwWWk', 'kWw..wWk', 'kWw..wWk', 'kgww.wWk', '.kgwwwk.', '..kkkk..']  # main en porte-voix

CLOTH = [(UNI, 0), (UNI_FAR, 1)]  # vêtements recolorés en équipe : l'uniforme

# --- la demoiselle (personnage inventé) ---
G_SKIN = mat('#b07a60', '#e0aa8c', '#f6ccb0', '#ffe4d0')
G_HAIR = mat('#8a6a24', '#c8a04a', '#e8c878', '#fae6aa')
G_DRESS = mat('#5a0612', '#9a1022', '#cc2034', '#f05060')
G_DRESS_FAR = mat('#40040c', '#760c1a', '#9e1828')
G_FACE = {'k': K, 'w': (255, 255, 255, 255), 'b': (60, 40, 30, 255), 'l': (200, 40, 60, 255), 'L': (240, 90, 110, 255), 'p': (240, 140, 140, 255)}


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
    # vareuse longue (descend sur les hanches), plis de côté
    it.append(Part(UNI, T([(19.2, 22.4), (25.6, 19.8), (35.2, 19.8), (39.4, 22.4), (38.8, 31), (39.6, 44.6), (31, 45.2), (29, 46), (27, 45.2), (19, 44.6), (19.8, 31)]),
                   shades=[(T([(19.2, 22.4), (23.6, 21.2), (24.2, 44.8), (19, 44.6), (19.8, 31)]), 0), (T([(35, 20.6), (39.4, 22.4), (38.8, 29), (36, 27.6)]), 3),
                           (T([(27, 45.2), (29, 46), (31, 45.2), (29, 44.2)]), 0)]))
    # boutonnage doré
    for y in (24, 28.4, 32.8, 37.2):
        c = T([(31.4, y)])[0]
        it.append(stamp(['g'], {'g': GOLD[2]}, round(c[0]), round(c[1])))
    # poches basses à rabat
    it.append(Part(UNI, T([(24.4, 38.2), (30.2, 38.2), (30, 40.4), (24.6, 40.4)]), base=1, shades=[(T([(24.4, 40), (30.2, 40), (30, 40.4), (24.6, 40.4)]), 0)], outline=False))
    c = T([(27.3, 39.4)])[0]
    it.append(stamp(['g'], {'g': GOLD[1]}, round(c[0]), round(c[1])))
    it.append(Part(UNI, T([(33.4, 38.2), (38.6, 38.2), (38.6, 40.4), (33.6, 40.4)]), base=2, shades=[(T([(33.4, 40), (38.6, 40), (38.6, 40.4), (33.6, 40.4)]), 1)], outline=False))
    # baudrier : de l'épaule proche à la hanche lointaine
    it.append(Part(LEATHER, T([(21.6, 21), (24.2, 20.6), (38.4, 41.2), (35.8, 41.6)]), base=2, shades=[(T([(21.6, 21), (22.6, 20.8), (36.8, 41.4), (35.8, 41.6)]), 1)]))
    c = T([(30.8, 33.6)])[0]
    it.append(stamp(['kkk', 'kgk', 'kkk'], {'k': K, 'g': GOLD[2]}, round(c[0]) - 1, round(c[1]) - 1))
    # barrettes de décorations + 4 médailles (sur la poitrine, côté lointain)
    bars = [(RED[1], GOLD[2]), (GOLD[2], RED[1]), (RED[2], GOLD[1]), ((60, 90, 170, 255), GOLD[2])]
    for i, (a, b) in enumerate(bars):
        c = T([(32.2 + i * 1.6, 25.6)])[0]
        it.append(stamp(['ab', 'ab'], {'a': a, 'b': b}, round(c[0]), round(c[1])))
    for i in range(4):
        c = T([(32.4 + i * 1.6, 27.6)])[0]
        it.append(stamp(['.k.', 'kSk', '.k.'][1:2] + ['kSk'], {'k': K, 'S': SILVER[2]}, round(c[0]) - 1, round(c[1])))
    # col montant + pattes de col rouges bordées d'or
    it.append(Part(UNI, T([(27.6, 17.6), (34.6, 17.6), (35, 21.4), (27.2, 21.4)]), base=2, shades=[(T([(27.6, 17.6), (29.6, 17.6), (29.2, 21.4), (27.2, 21.4)]), 1)]))
    it.append(Part(RED, T([(29.6, 18.2), (33.8, 18.2), (34.2, 21), (30, 21.2)]), base=1, shades=[(T([(29.6, 18.2), (33.8, 18.2), (33.8, 18.8), (29.6, 18.8)]), 2)]))
    c = T([(32.4, 19.6)])[0]
    it.append(stamp(['g'], {'g': GOLD[3]}, round(c[0]), round(c[1])))
    # épaulettes dorées (raies rouges, petite étoile inventée) ; celle du côté lointain dépasse à peine
    it.append(Part(GOLD, T([(17.8, 21.8), (25.4, 19.6), (26.6, 21.2), (19, 24.2)]), base=2, shades=[(T([(17.8, 21.8), (19.6, 21.2), (19.4, 24), (19, 24.2)]), 1)]))
    it.append(Part(RED, T([(20.6, 21.6), (24.6, 20.4), (24.8, 21), (20.8, 22.2)]), base=1, outline=False))
    it.append(Part(GOLD, T([(35.8, 19.8), (39.6, 21.2), (39.8, 22.6), (36.4, 21.6)]), base=1))
    return it, T


def head(N, tilt, expr, flow):
    T = lambda pts: [add(rot(sub(p, N0), tilt), N) for p in pts]
    o = (round(N[0] - N0[0]), round(N[1] - N0[1]))
    it = []
    it.append(Part(SKIN, T([(28.2, 16.6), (33.4, 16.6), (33.4, 21), (28.2, 21)]), base=0))
    # visage : mâchoire carrée, menton marqué
    it.append(Part(SKIN, T([(25.2, 6.6), (30, 4.2), (35.2, 4.8), (38, 7.6), (38.6, 11.4), (39.8, 13.4), (38.8, 14.4), (38.6, 16.4), (37.8, 18.8), (34.4, 20.2), (30, 20), (26.8, 17.4), (24.6, 13)]),
                   shades=[(T([(24.6, 13), (25.2, 6.6), (29, 9), (29.4, 20), (28.4, 19.6), (26.8, 17.4)]), 1),
                           (T([(35, 9), (38, 10), (38.2, 12.4), (36, 13)]), 3), (T([(37.4, 12.2), (39.8, 13.4), (38.8, 14.4), (37.6, 14.2)]), 3),
                           (T([(34.6, 18.6), (37.8, 18.8), (34.4, 20.2)]), 1)], base=2))
    # oreille
    it.append(Part(SKIN, T([(25.8, 10.4), (27.6, 10), (28.6, 11.8), (28.4, 14.4), (27, 15.6), (25.6, 14.4), (25.2, 12)]),
                   shades=[(T([(26.4, 11.4), (27.6, 11.2), (27.6, 13.8), (26.6, 14.2)]), 1)], base=2))
    # crâne rasé : une fine calotte, un peu plus d'épaisseur sur le dessus
    it.append(Part(HAIR, T([(24.6, 10.6), (24, 7), (25.4, 4.4), (28.4, 2.6), (32, 2.2), (35.6, 3), (37.8, 5), (38.2, 7.2), (36.6, 6.6), (34.6, 5.6),
                            (31, 5.4), (28.2, 6.4), (26.6, 8.4), (26.2, 10.6)]),
                   shades=[(T([(28.6, 2.8), (32, 2.4), (33.6, 3), (30, 3.6)]), 2), (T([(24.6, 10.6), (24, 7), (25.6, 7.4), (26.2, 10.6)]), 0)], base=1))
    fx, fy = o
    up = expr == 'moi'
    if expr == 'hurt':
        it.append(stamp(["BBB..B", "kkk.kk", "...k.."], FACE, 31 + fx, 8 + fy))
        it.append(stamp(["mmr"], FACE, 34 + fx, 17 + fy))
    elif expr == 'shout':
        it.append(stamp(["BBBB.BB", "..wk.wk", "..wk..."], FACE, 31 + fx, 8 + fy))
        it.append(stamp(["kkk", "mrk"], FACE, 34 + fx, 16 + fy))
    elif up:
        # tête levée, il crie MOI : les yeux regardent vers le haut, bouche grande ouverte
        it.append(stamp(["BBBB.BB", "..kw.kw", "......."], FACE, 31 + fx, 8 + fy))
        it.append(stamp(["kkk", "rrk", "kkk"], FACE, 34 + fx, 16 + fy))
    elif expr == 'love':
        # amoureux : yeux plissés, sourire, joues roses
        it.append(stamp(["BBB..BB", ".kk..kk", "......."], FACE, 31 + fx, 9 + fy))
        it.append(stamp(["pp"], FACE, 36 + fx, 13 + fy))
        it.append(stamp(["k..k", ".kk."], FACE, 33 + fx, 16 + fy))
    else:
        # air sérieux : sourcils bas et droits, bouche fermée
        it.append(stamp(["BBBB.BB", "..wk.wk", "..kk..."], FACE, 31 + fx, 8 + fy))
        it.append(stamp(["mmmk"], FACE, 33 + fx, 17 + fy))
    return it


def arm(sh, el, wr, far, fist):
    d = sub(wr, el); L = math.hypot(*d) or 1; u = (d[0] / L, d[1] / L)
    M = UNI_FAR if far else UNI
    it = [slab(sh, el, 5.8, 5.2, M, ext0=0.8, ext1=1.0), slab(el, wr, 5.2, 4.8, M, ext0=1.2, ext1=0.2)]
    # parement de manche : liseré doré
    it.append(slab(add(wr, mul(u, -1.6)), add(wr, mul(u, -0.6)), 5.2, 5.2, GOLD, base=1, dark=0.4))
    if fist is None: return it
    rows = OPEN if fist == 'O' else CUP if fist == 'C' else FIST[fist]
    anchor = {'R': (0, 3.5), 'L': (7, 3.5), 'U': (3.5, 7), 'UL': (3.5, 7), 'D': (3.5, 0), 'O': (1, 3), 'C': (1, 4)}[fist]
    at = (round(wr[0] - anchor[0] + u[0] * 1.2), round(wr[1] - anchor[1] + u[1] * 1.2))
    it.append(stamp(rows, HAND_FAR if far else HAND, *at))
    return it


def leg(hip, kn, an, far, foot, foot_rot):
    M = UNI_FAR if far else UNI
    B = BOOT_FAR if far else BOOT
    it = []
    R = lambda pts: [add(rot((x * foot, y), foot_rot * foot), an) for x, y in pts]
    # botte noire : pied et tige jusqu'à mi-mollet
    it.append(Part(B, R([(-3.8, -1), (3, -1), (3.6, 1.4), (8, 2.6), (9, 4.2), (8.6, 5.2), (-4, 5.2)]), shades=[(R([(-4, 4.2), (8.8, 4.2), (8.6, 5.2), (-4, 5.2)]), 0), (R([(0, 0), (3, 0), (6, 2.4), (3, 1.6)]), len(B) - 1)]))
    top = add(kn, mul(sub(an, kn), 0.5))
    it.append(slab(top, add(an, mul(sub(an, kn), 0.05)), 7.0, 6.6, B, ext0=0.6))
    # pantalon droit
    it.append(slab(kn, top, 6.8, 6.6, M, ext0=1.5))
    it.append(slab(hip, kn, 8.2, 7.0, M, ext0=1.0, ext1=1.2))
    dk = sub(kn, hip); Lk = math.hypot(*dk) or 1
    n = (-dk[1] / Lk, dk[0] / Lk)
    it[-1].shades.append((fold(add(kn, mul(n, -1)), mul(n, 1), 2.6), 0))
    return it


def frame(p):
    if p.get('girl'): return girl_frame(p)
    if p.get('front'): return front_frame(p)
    P = (p['P'][0] + OX, p['P'][1]); lean = p.get('lean', 0)
    tor, T = torso(P, lean)
    N = add(T([N0])[0], p.get('hd', (0, 0)))
    sN = T([(19.4, 22.8)])[0]; sF = T([(37, 22.6)])[0]
    hN = T([(23.5, 43)])[0]; hF = T([(33.5, 43)])[0]
    wN = add(sN, p['nA'][1]); wF = add(sF, p['fA'][1])
    it = []
    it += arm(sF, add(sF, p['fA'][0]), wF, True, p.get('fFist', 'R'))
    it += leg(hF, add(hF, p['fL'][0]), add(hF, p['fL'][1]), True, p.get('fFoot', 1), p.get('fRot', 0))
    it += leg(hN, add(hN, p['nL'][0]), add(hN, p['nL'][1]), False, p.get('nFoot', -1), p.get('nRot', 0))
    it += tor
    hd_ = head(N, p.get('tilt', 0), p.get('expr', 'normal'), p.get('flow', 0))
    near = arm(sN, add(sN, p['nA'][0]), wN, False, p.get('nFist', 'R'))
    it += (near + hd_) if p.get('armBehind') else (hd_ + near)
    return compose(it, W, H)


# ---------------------------------------------------------------- DE FACE, à genoux, bras croisés (le plongeon)
def front_frame(p):
    cx, top = 40, p.get('top', 4)
    it = []
    # jambes : cuisses qui descendent, genoux en bas (les tibias partent vers l'arrière, cachés)
    for sgn in (-1, 1):
        hip = (cx + sgn * 4.6, top + 38)
        kn = (cx + sgn * 6.6, top + 52)
        it.append(slab(hip, kn, 8.8, 8.0, UNI if sgn < 0 else UNI_FAR, ext0=1.0, ext1=0.4))
        # genou arrondi (le tibia part vers l'arrière, caché)
        it.append(Part(UNI if sgn < 0 else UNI_FAR, ell((kn[0], kn[1] - 0.6), 4.2, 2.6, 12), base=2 if sgn < 0 else 1, shades=[(ell((kn[0], kn[1] + 0.8), 4.2, 1.4, 10), 0)], outline='outer'))
    # vareuse de face
    it.append(Part(UNI, [(cx - 10.6, top + 21.6), (cx - 4, top + 18.4), (cx + 4, top + 18.4), (cx + 10.6, top + 21.6), (cx + 10, top + 31), (cx + 10.6, top + 42.6),
                         (cx - 10.6, top + 42.6), (cx - 10, top + 31)],
                   shades=[([(cx - 10.6, top + 21.6), (cx - 7, top + 20), (cx - 6.6, top + 42.6), (cx - 10.6, top + 42.6), (cx - 10, top + 31)], 0),
                           ([(cx + 6, top + 20), (cx + 10.6, top + 21.6), (cx + 10, top + 28), (cx + 7, top + 26)], 3)]))
    for y in (24, 28.4, 33, 37.4):
        it.append(stamp(['g'], {'g': GOLD[2]}, cx, round(top + y)))
    it.append(Part(LEATHER, [(cx - 8.6, top + 20.4), (cx - 6.2, top + 19.6), (cx + 9.6, top + 40.6), (cx + 7.2, top + 41.6)], base=2, shades=[([(cx - 8.6, top + 20.4), (cx - 7.6, top + 20.1), (cx + 8.2, top + 41.1), (cx + 7.2, top + 41.6)], 1)]))
    # médailles côté gauche de l'image
    bars = [(RED[1], GOLD[2]), (GOLD[2], RED[1]), (RED[2], GOLD[1]), ((60, 90, 170, 255), GOLD[2])]
    for i, (a, b) in enumerate(bars):
        it.append(stamp(['ab', 'ab'], {'a': a, 'b': b}, round(cx + 2 + i * 2), round(top + 24)))
    # col et pattes rouges
    it.append(Part(UNI, [(cx - 4.4, top + 16.4), (cx + 4.4, top + 16.4), (cx + 5, top + 20.4), (cx - 5, top + 20.4)], base=2))
    it.append(Part(RED, [(cx - 4.4, top + 17.4), (cx - 1, top + 18), (cx - 1, top + 20.2), (cx - 4.8, top + 20)], base=1))
    it.append(Part(RED, [(cx + 1, top + 18), (cx + 4.4, top + 17.4), (cx + 4.8, top + 20), (cx + 1, top + 20.2)], base=1))
    # épaulettes
    for sgn in (-1, 1):
        it.append(Part(GOLD, [(cx + sgn * 4.6, top + 19), (cx + sgn * 11.8, top + 20.4), (cx + sgn * 12, top + 23), (cx + sgn * 5, top + 21.4)], base=2 if sgn > 0 else 1))
    # bras croisés sur la poitrine (avant-bras en X)
    it.append(slab((cx - 11, top + 23), (cx - 10.4, top + 31), 5.6, 5.2, UNI_FAR, ext0=0.6))
    it.append(slab((cx + 11, top + 23), (cx + 10.4, top + 31), 5.6, 5.2, UNI, ext0=0.6))
    it.append(slab((cx - 10.4, top + 31), (cx + 6, top + 25), 5.0, 4.6, UNI_FAR, ext0=1.0))
    it.append(stamp(['.kkkk.', 'kWWWWk', 'kwWWWk', '.kkkk.'], HAND_FAR, round(cx + 5), round(top + 23)))
    it.append(slab((cx + 10.4, top + 31), (cx - 6, top + 25), 5.0, 4.6, UNI, ext0=1.0))
    it.append(stamp(['.kkkk.', 'kWWWWk', 'kwWWWk', '.kkkk.'], HAND, round(cx - 10), round(top + 23)))
    # tête de face
    it.append(Part(SKIN, [(cx - 3, top + 14), (cx + 3, top + 14), (cx + 3, top + 18.6), (cx - 3, top + 18.6)], base=0))
    it.append(Part(SKIN, [(cx - 6.6, top + 4.4), (cx - 3, top + 1.6), (cx + 3, top + 1.6), (cx + 6.6, top + 4.4), (cx + 7, top + 9.6), (cx + 6, top + 14.4), (cx + 2.6, top + 17.4),
                          (cx - 2.6, top + 17.4), (cx - 6, top + 14.4), (cx - 7, top + 9.6)],
                   shades=[([(cx - 6.6, top + 4.4), (cx - 4, top + 6), (cx - 4.6, top + 14.4), (cx - 2.6, top + 17.4), (cx - 6, top + 14.4), (cx - 7, top + 9.6)], 1),
                           ([(cx + 3.6, top + 5), (cx + 6.6, top + 5.4), (cx + 6.4, top + 9), (cx + 4, top + 8)], 3)], base=2))
    for sgn in (-1, 1):
        it.append(Part(SKIN, [(cx + sgn * 6.6, top + 7.6), (cx + sgn * 8.6, top + 7.4), (cx + sgn * 8.8, top + 11), (cx + sgn * 7, top + 12.4)], base=1 if sgn < 0 else 2))
    it.append(Part(HAIR, [(cx - 7, top + 7.2), (cx - 6.6, top + 2.6), (cx - 3.4, top + 0.2), (cx + 3.4, top + 0.2), (cx + 6.6, top + 2.6), (cx + 7, top + 7.2), (cx + 5.6, top + 4.6),
                          (cx + 2, top + 3.4), (cx - 2, top + 3.4), (cx - 5.6, top + 4.6)], base=1, shades=[([(cx - 2, top + 0.6), (cx + 2.6, top + 0.6), (cx + 2, top + 1.8), (cx - 2, top + 1.8)], 2)]))
    it.append(stamp(["BBB...BBB", ".kw...wk.", "........."], FACE, cx - 4, round(top + 7)))
    it.append(stamp(["e"], FACE, cx, round(top + 11)))
    it.append(stamp(["mmmm"], FACE, cx - 2, round(top + 14)))
    return compose(it, W, H)


# ---------------------------------------------------------------- la demoiselle en robe de soirée rouge (inventée)
def girl_frame(p):
    bx, lean, step, kiss = 40 + p.get('dx', 0), p.get('lean', 0), p.get('step', 0), p.get('kiss', False)
    by = 58  # sol
    C = (bx, by - 30)  # taille
    R = lambda pts: [add(rot(sub(q, C), lean), C) for q in pts]
    it = []
    # cheveux longs blonds (derrière)
    hc = add(rot((0, -21), lean), C)
    it.append(Part(G_HAIR, R([(bx - 7.6, by - 52), (bx - 1, by - 56.4), (bx + 4.6, by - 54), (bx + 2, by - 46), (bx - 1.6, by - 38), (bx - 6.6, by - 33), (bx - 9.4, by - 38), (bx - 9.6, by - 46)]),
                   shades=[(R([(bx - 9.4, by - 38), (bx - 9.6, by - 46), (bx - 7, by - 46), (bx - 6.6, by - 34)]), 0)], base=2))
    # robe : longue, évasée jusqu'au sol, la traîne bouge avec le pas
    sw = step * 2.2
    it.append(Part(G_DRESS, R([(bx - 4.6, by - 41), (bx + 4.4, by - 41.6), (bx + 4, by - 31), (bx + 7.4 + sw, by - 10), (bx + 9.6 + sw, by), (bx - 9.6 - sw * 0.4, by), (bx - 7.6, by - 12), (bx - 4.4, by - 31)]),
                   shades=[(R([(bx - 4.6, by - 41), (bx - 1.6, by - 41), (bx - 2, by - 31), (bx - 4, by), (bx - 9.6 - sw * 0.4, by), (bx - 7.6, by - 12), (bx - 4.4, by - 31)]), 0),
                           (R([(bx + 1.6, by - 30), (bx + 3, by - 30), (bx + 7 + sw, by - 2), (bx + 5, by - 2)]), 3), (R([(bx - 3, by - 31.6), (bx + 4, by - 31.6), (bx + 4, by - 30.4), (bx - 3, by - 30.4)]), 1)], base=2))
    # bras nus (proche) ; bretelle fine
    # épaules nues au-dessus du décolleté
    it.append(Part(G_SKIN, R([(bx - 3.6, by - 44.6), (bx + 3.4, by - 44.8), (bx + 4.4, by - 41.4), (bx - 4.4, by - 41)]), base=2, outline='outer'))
    it.append(Part(G_DRESS, R([(bx - 4.6, by - 41.4), (bx - 1, by - 40.4), (bx + 1.6, by - 41.6), (bx + 4.6, by - 41.8), (bx + 4.4, by - 38), (bx - 4.4, by - 38)]), base=1, outline=False))
    # bras nus (proche)
    if kiss:
        a0, a1, a2 = (bx + 1, by - 43), (bx - 3.6, by - 36), (bx - 6.4, by - 31)
    else:
        a0, a1, a2 = (bx + 1, by - 43), (bx + 1.6 - step, by - 35), (bx + 2.6 - step * 1.6, by - 28)
    for q0, q1, w0, w1 in ((a0, a1, 3.2, 2.8), (a1, a2, 2.8, 2.4)):
        sl = slab(R([q0])[0], R([q1])[0], w0, w1, G_SKIN, base=2)
        sl.outline = 'outer'
        it.append(sl)
    # bretelle fine sur l'épaule
    it.append(Part(G_DRESS, R([(bx + 0.4, by - 45), (bx + 1.4, by - 45), (bx + 1.6, by - 41.6), (bx + 0.6, by - 41.6)]), base=2, outline=False))
    # fente et reflet de la robe
    it.append(Part(G_DRESS, R([(bx + 2.6, by - 22), (bx + 3.4, by - 22), (bx + 5.6 + sw * 0.6, by - 1), (bx + 4.6 + sw * 0.6, by - 1)]), base=0, outline=False))
    # cou et tête de profil
    it.append(Part(G_SKIN, R([(bx - 0.6, by - 46.6), (bx + 2.4, by - 46.6), (bx + 2.4, by - 42), (bx - 0.6, by - 42)]), base=1))
    face = [(bx - 3.6, by - 54), (bx + 1, by - 56.4), (bx + 4.4, by - 55), (bx + 5.6, by - 52), (bx + 6.6, by - 50.4), (bx + 5.6, by - 49.4), (bx + 6, by - 48.2),
            (bx + 5.2, by - 47.6), (bx + 4.6, by - 46), (bx + 1.4, by - 45.4), (bx - 2, by - 47.4), (bx - 4, by - 51)]
    it.append(Part(G_SKIN, R(face), shades=[(R([(bx - 4, by - 51), (bx - 3.6, by - 54), (bx - 1, by - 52), (bx - 0.6, by - 46), (bx - 2, by - 47.4)]), 1)], base=2))
    # frange et mèche devant l'oreille
    it.append(Part(G_HAIR, R([(bx - 5, by - 52), (bx - 3.6, by - 56), (bx + 1, by - 57.6), (bx + 5, by - 56), (bx + 5.8, by - 53.4), (bx + 3, by - 54.6), (bx - 0.6, by - 54.2), (bx - 2.4, by - 51), (bx - 3.4, by - 47)]),
                   shades=[(R([(bx - 0.6, by - 57), (bx + 3, by - 56.8), (bx + 2, by - 56), (bx - 0.4, by - 56)]), 3)], base=2))
    o = add(rot((0, 0), lean), (0, 0))
    e = R([(bx + 3, by - 52)])[0]
    it.append(stamp(['kb', '.k'] if not kiss else ['kk', '..'], G_FACE, round(e[0]), round(e[1])))
    m = R([(bx + 4.4, by - 48.4)])[0]
    it.append(stamp(['lL', 'l.'] if kiss else ['l'], G_FACE, round(m[0]), round(m[1])))
    it.append(stamp(['p'], G_FACE, round(e[0]) - 1, round(e[1]) + 2))
    # boucle d'oreille dorée
    er = R([(bx - 0.6, by - 49)])[0]
    it.append(stamp(['g', 'g'], {'g': GOLD[2]}, round(er[0]), round(er[1])))
    return compose(it, W, H)


IDLE = dict(P=(29, 40), nA=((1, 9.5), (6.5, 2)), fA=((4, 7.5), (8, 5)), nL=((-3, 8), (-5.5, 14)), fL=((5, 7), (7, 14)))
POSES = {
    'idle0': IDLE,
    'idle1': dict(IDLE, P=(29, 41), hd=(0, 1), nA=((1, 9.5), (6.5, 3)), fA=((4, 7.5), (8, 6)), nL=((-3.5, 7.5), (-5.5, 13)), fL=((5.5, 6.5), (7, 13))),
    'run0': dict(P=(30, 41), lean=10, nA=((-5, 7), (-10, 11)), fA=((5, 6), (11, 2)), nFist='L',
                 nL=((-7, 6), (-14, 10)), fL=((7, 4), (8, 13)), nRot=-30),
    'run1': dict(P=(30, 40), lean=10, nA=((5, 6), (11, 1)), fA=((-3, 8), (0, 14)), fFist='D',
                 nL=((10, 2), (13, 10)), fL=((-7, 6), (-15, 9)), fRot=-25, nFoot=1),
    'jump': dict(P=(30, 41), lean=4, nA=((-3, 8), (2, 3)), fA=((5, 6), (9, 0)), nFist='U', fFist='U',
                 nL=((3, 7), (-2, 13)), fL=((8, 4), (7, 12)), nRot=-35, fRot=10, nFoot=1),
    'hurt': dict(P=(27, 41), lean=-14, tilt=-14, hd=(-1, 1), expr='hurt', nA=((-6, 6), (-10, 0)), fA=((6, -3), (11, -7)),
                 nFist='L', fFist='U', nL=((-2, 8), (-5, 15)), fL=((5, 8), (9, 15))),
    # --- COUPS (pieds) ---
    # PETIT PONT : coup de pied sec, rasant
    'kickPre': dict(P=(29, 40), lean=-6, expr='shout', nA=((-3, 8), (-6, 3)), fA=((5, 6), (10, 3)), nFist='L',
                    nL=((-2, 8), (-4, 15)), fL=((-2, 7), (-7, 12)), fRot=10),
    'kick': dict(P=(27, 41), lean=-10, expr='shout', nA=((-5, 6), (-10, 2)), fA=((5, 6), (10, 4)), nFist='L',
                 nL=((-3, 8), (-5, 15)), fL=((10, 4), (19, 8)), fRot=-30),
    # COUP DE TÊTE
    'headerPre': dict(P=(28, 41), lean=-14, tilt=-14, hd=(-2, 0), expr='shout', nA=((-5, 5), (-9, 8)), fA=((-3, 6), (-7, 9)), nFist='L', fFist='L',
                      nL=((-4, 8), (-7, 14)), fL=((6, 6), (9, 14))),
    'header': dict(P=(25, 42), lean=24, tilt=16, hd=(4, 2), expr='shout', nA=((-6, 4), (-11, 8)), fA=((-4, 5), (-9, 9)), nFist='L', fFist='L',
                   nL=((-8, 5), (-14, 12)), fL=((9, 4), (12, 12))),
    # FRAPPE : grand coup de pied en avançant (coup avant)
    'strikePre': dict(P=(30, 41), lean=-8, expr='shout', nA=((-6, 4), (-10, 0)), fA=((6, 3), (12, 0)), nFist='L', fFist='R',
                      nL=((-3, 8), (-5, 15)), fL=((-6, 5), (-12, 1)), fRot=60),
    'strike': dict(P=(26, 40), lean=-14, tilt=-6, expr='shout', nA=((-6, 3), (-12, 0)), fA=((6, 2), (12, -2)), nFist='O', fFist='O',
                   nL=((-2, 8), (-5, 15)), fL=((11, -1), (21, -4)), fRot=-70),
    # JONGLE (haut) : genou puis pied qui remontent
    'juggle': dict(P=(28, 40), lean=-6, tilt=-4, expr='shout', nA=((-5, 6), (-9, 2)), fA=((5, 6), (10, 3)), nFist='L',
                   nL=((-2, 8), (-4, 15)), fL=((8, -2), (12, -9)), fRot=-70),
    # TACLE GLISSÉ (bas)
    'tackle': dict(P=(28, 50), lean=-28, tilt=-10, hd=(-2, 2), expr='shout', nA=((-7, 4), (-12, 8)), fA=((-4, 6), (-9, 10)), nFist='D', fFist='D',
                   nL=((-4, 4), (-2, 8)), fL=((10, 2), (20, 6)), fRot=-50, nFoot=1),
    # REPRISE EN L'AIR (avant en l'air) : jambe tendue
    'airkick': dict(P=(28, 39), lean=-18, tilt=-6, expr='shout', nA=((-6, 2), (-12, -2)), fA=((6, 2), (11, -1)), nFist='O', fFist='O',
                    nL=((2, 7), (-3, 12)), fL=((11, 1), (21, 0)), fRot=-80, nFoot=1),
    # RETOURNÉ (haut en l'air) : le corps bascule, le pied passe au-dessus de la tête
    'bicycle': dict(P=(30, 44), lean=-70, tilt=-30, hd=(-2, 2), expr='shout', nA=((-6, 4), (-11, 8)), fA=((-4, 6), (-8, 11)), nFist='O', fFist='O',
                    nL=((4, 6), (2, 13)), fL=((11, -2), (19, -6)), fRot=-110, nFoot=1),
    # SEMELLE (bas en l'air) et plongeon latéral
    'stomp': dict(P=(30, 38), lean=-6, nA=((-4, -5), (-6, -12)), fA=((5, -4), (9, -11)), nFist='U', fFist='U',
                  nL=((-2, 7), (-4, 13)), fL=((4, 9), (6, 19)), fRot=60, nRot=-20),
    # --- SPÉCIALES ---
    # MOIII (haut) : tête vers le ciel, main en porte-voix à côté de la bouche
    'moiPre': dict(P=(29, 44), lean=8, hd=(1, 1), expr='shout', nA=((3, 7), (7, 9)), fA=((4, 6), (8, 9)), nFist='D', fFist='D',
                   nL=((-2, 6), (-6, 10)), fL=((8, 3), (9, 10))),
    'moi': dict(P=(29, 39), lean=-8, tilt=-30, hd=(-1, 0), expr='moi', nA=((7, 3), (13, -7)), fA=((3, 8), (5, 14)), nFist='C', fFist='D',
                nL=((-2, 8), (-3, 15)), fL=((4, 8), (5, 15)), nFoot=-1),
    # TIR (avant) : la frappe du ballon
    'shootPre': dict(P=(30, 41), lean=-6, expr='shout', nA=((-6, 4), (-10, 0)), fA=((6, 3), (11, 0)), nFist='L',
                     nL=((-3, 8), (-5, 15)), fL=((-7, 4), (-13, -1)), fRot=70),
    'shoot': dict(P=(27, 41), lean=-8, expr='shout', nA=((-6, 3), (-11, 0)), fA=((6, 3), (11, 1)), nFist='O', fFist='O',
                  nL=((-2, 8), (-4, 15)), fL=((10, 3), (19, 4)), fRot=-60),
    # VOLÉE (neutre) : penché en arrière, jambe tendue en avant au ras du sol, bras écartés
    'volleyPre': dict(P=(31, 41), lean=-10, tilt=-4, expr='shout', nA=((-5, 2), (-9, -4)), fA=((6, 2), (12, -2)), nFist='O', fFist='O',
                      nL=((-4, 8), (-8, 13)), fL=((-5, 6), (-11, 3)), fRot=60),
    'volley': dict(P=(28, 42), lean=-24, tilt=-12, hd=(-1, 1), expr='shout', nA=((-7, -2), (-14, -6)), fA=((7, 4), (13, 8)), nFist='O', fFist='O',
                   nL=((-4, 7), (-7, 14)), fL=((10, 4), (20, 8)), fRot=-45),
    # TROPHÉE (bas au sol) : il désigne le sol devant lui
    'pointPre': dict(P=(29, 41), lean=-4, expr='shout', nA=((-3, 6), (-5, 0)), fA=((4, 7.5), (8, 5)), nFist='U',
                     nL=((-3, 8), (-5.5, 14)), fL=((5, 7), (7, 14))),
    'point': dict(P=(28, 42), lean=10, hd=(1, 0), expr='shout', nA=((8, 5), (15, 11)), fA=((4, 7.5), (7, 6)), nFist='O',
                  nL=((-4, 7), (-7, 14)), fL=((6, 6), (9, 14))),
    # GENOUX (plongeon) : de face, à genoux, bras croisés
    'knee': dict(front=True, top=4),
    # le bisou : il sourit, la main sur le coeur
    'kissed': dict(P=(29, 40), lean=-2, tilt=-6, expr='love', nA=((6, 4), (9, -1)), fA=((4, 7.5), (8, 5)), nFist='O',
                   nL=((-3, 8), (-5.5, 14)), fL=((5, 7), (7, 14))),
    # la demoiselle
    'girl0': dict(girl=True, step=1),
    'girl1': dict(girl=True, step=-1),
    'girlKiss': dict(girl=True, kiss=True, lean=12, dx=2),
}

if __name__ == '__main__':
    import sys
    names = sys.argv[1].split(',') if len(sys.argv) > 1 else list(POSES)
    frames = [frame(POSES[n]) for n in names]
    sheet(frames, '/tmp/claude-0/-home-claude/f0033496-c1d5-528d-bf27-ec4bc044ac61/scratchpad/ky_preview.png', sc=4)
