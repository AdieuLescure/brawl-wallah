# Postures en plus pour fluidifier l'animation (ajoutées aux planches par export.py) :
#  - run2 / run3 : temps de passage de la course (genou qui remonte), pour une course en 4 images
#  - crouch : réception d'un saut (jambes fléchies)
#  - fall : chute (bras levés, jambes pendantes)
#  - '<coup>Pre' : préparation des gros coups (le jeu les montre pendant le démarrage du coup)

COMMON = {
    # genou proche qui remonte, jambe lointaine en appui sous le corps
    'run2': dict(P=(30, 39), lean=10, nA=((1, 8), (5, 13)), fA=((1, 8), (-2, 14)), nFist='D', fFist='D',
                 nL=((8, 1), (6, 9)), fL=((2, 7), (0, 15)), nFoot=1),
    # genou lointain qui remonte, jambe proche en appui
    'run3': dict(P=(30, 39), lean=10, nA=((-1, 8), (-4, 14)), fA=((3, 7), (8, 9)), nFist='D', fFist='R',
                 nL=((1, 7), (-1, 15)), fL=((8, 0), (6, 8))),
    'crouch': dict(P=(29, 45), lean=8, hd=(1, 1), nA=((2, 8), (8, 4)), fA=((5, 7), (10, 5)),
                   nL=((-2, 6), (-6, 10)), fL=((8, 3), (9, 10))),
    'fall': dict(P=(30, 40), lean=-4, nA=((-4, -6), (-2, -13)), fA=((5, -5), (9, -11)), nFist='U', fFist='U',
                 nL=((-1, 8), (-3, 15)), fL=((6, 7), (6, 14)), nFoot=-1),
}

# préparations, par perso
PRE = {
    'toro': {
        'heavyPre': dict(P=(31, 42), lean=-10, tilt=-4, expr='shout', swing=15, nA=((-7, 3), (-5, -5)), fA=((6, 4), (12, 1)), nFist='U',
                         nL=((-6, 7), (-11, 14)), fL=((8, 5), (11, 13))),
        'upPre': dict(P=(29, 46), lean=12, hd=(1, 1), expr='shout', nA=((2, 7), (4, 13)), fA=((4, 6), (8, 4)), nFist='D',
                      nL=((-2, 6), (-6, 10)), fL=((8, 3), (9, 10))),
        'sweepPre': dict(P=(29, 45), lean=6, expr='shout', nA=((-3, 7), (-6, 12)), fA=((5, 6), (10, 4)), nFist='D',
                         nL=((-3, 6), (-7, 10)), fL=((8, 3), (10, 10))),
        'rkickPre': dict(P=(28, 41), lean=-6, expr='shout', nA=((1, 8), (5, 2)), fA=((5, 6), (10, 3)), nFist='U',
                         nL=((-3, 8), (-5, 15)), fL=((9, 1), (5, 8)), fRot=-20),
    },
    'deadlulu': {
        'guitarBigPre': dict(P=(30, 41), lean=-12, tilt=-6, expr='shout', nA=((-1, -8), (-3, -14)), fA=((3, -7), (1, -13)), nFist='U', fFist='U',
                             gtr=((-2, -16), (-14, -6)), nL=((-5, 7), (-9, 14)), fL=((7, 6), (9, 14))),
        'rkickPre': dict(P=(28, 41), lean=-6, expr='shout', nA=((1, 8), (5, 2)), fA=((5, 6), (10, 3)), nFist='U',
                         nL=((-3, 8), (-5, 15)), fL=((9, 1), (5, 8)), fRot=-20),
    },
    'denodoom': {
        'saberPre': dict(P=(30, 41), lean=-8, tilt=-4, expr='shout', swing=-10, nA=((-6, 2), (-8, -7)), fA=((6, 5), (11, 3)), saber=-150,
                         nL=((-5, 7), (-9, 14)), fL=((7, 6), (9, 14))),
        'summonPre': dict(P=(29, 43), lean=8, expr='shout', fA=((3, 6), (6, 0)), nA=((1, 9.5), (6.5, 0)), fFist='U',
                          nL=((-3, 7), (-6, 12)), fL=((6, 5), (8, 12))),
    },
    'adieulescure': {
        'kickPre': dict(P=(29, 40), lean=-6, expr='shout', nA=((-3, 8), (-6, 3)), fA=((5, 6), (10, 3)), nFist='L',
                        nL=((-2, 8), (-4, 15)), fL=((-2, 7), (-7, 12)), fRot=10),
        'headerPre': dict(P=(28, 41), lean=-14, tilt=-14, hd=(-2, 0), expr='shout', nA=((-5, 5), (-9, 8)), fA=((-3, 6), (-7, 9)), nFist='L', fFist='L',
                          nL=((-4, 8), (-7, 14)), fL=((6, 6), (9, 14))),
        'drinkPre': dict(P=(29, 41), lean=4, expr='normal', nA=((3, 7), (8, 2)), fA=((4, 7.5), (8, 5)), nFist='U',
                         btl=((7, 1), (0, -1)), nL=((-3, 8), (-5.5, 14)), fL=((5, 7), (7, 14))),
        'tossPre': dict(P=(28, 41), lean=-6, tilt=-4, nA=((-6, 2), (-8, -6)), fA=((5, 6), (10, 3)), nFist='U',
                        nL=((-4, 8), (-7, 14)), fL=((5, 7), (8, 14))),
        'rkickPre': dict(P=(31, 42), lean=14, tilt=8, expr='shout', nA=((3, 8), (7, 12)), fA=((4, 7), (8, 11)), nFist='D', fFist='D',
                         nL=((-4, 6), (-8, 10)), fL=((-3, 7), (-7, 12)), nFoot=1),
        'fiddlePre': dict(P=(29, 40), lean=-4, tilt=8, hd=(0, 1), fA=((4, 2), (9, -2)), nA=((2, 6), (6, 9)), fFist='R', nFist='R',
                          fid=((9, -6), (14, 1)), nL=((-3, 8), (-5.5, 14)), fL=((5, 7), (7, 14))),
    },
}
# même allure que la garde pour chaque perso (cape, cheveux, ceinture : valeurs neutres)
EXTRA_KEYS = {'toro': dict(swing=-15, flow=1), 'denodoom': dict(swing=20), 'deadlulu': dict(flow=1), 'adieulescure': {}}


def extra_for(cid):
    out = {}
    for n, d in COMMON.items():
        out[n] = dict(EXTRA_KEYS.get(cid, {}), **d)
    out.update(PRE.get(cid, {}))
    return out
