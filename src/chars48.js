// Personnages 48x40 : DENODOOM, TORO, ASTRA, GROM, DEAD LULU
(function (S) {
  const { pal, ramp, hex } = S;

  // =====================================================================
  // DENODOOM : crâne rasé dégradé, barbe pleine, long manteau noir doublé de rouge, deux pistolets
  // =====================================================================
  const DN = pal({
    h: '#1b1714', H: '#3a322c', f: '#6a4a38', F: '#4c372b',
    s: '#c18a60', l: '#d9a47a', S: '#9a6a46', D: '#7a4f34',
    b: '#241c18', B: '#40342c', w: '#f3efe7', e: '#24130a', m: '#7a3f33', g: '#eef1f8',
    K: '#2a2a35', k: '#454553', d: '#15151c', R: '#b3202e', r: '#701220', Q: '#d63a48',
    Y: '#0f0f15', y: '#23232d', n: '#6b4a2a', G: '#e0b030', t: '#8a5a3a',
  });
  const DN_HEAD = [
    '....hhhhhh....',
    '..hhhHHhhhhh..',
    '.hhhhHhhhhhhh.',
    '.hhhhhhhhhhhh.',
    '.fhhhhhsssss..',
    '.fFhhsshhhhhs.',
    '.FFSSsswesslss',
    '..SgSssssssssl',
    '..SDbssssssssl',
    '..bbbbbbBbbssS',
    '..bBbbbmmbbbb.',
    '...bbbbbbbbbb.',
    '....bbbbbbbb..',
    '.....SSSSSS...',
  ];
  const DN_TORSO = [
    '..kkkkkkkkkk..',
    '.kKKKKKKKKKKK.',
    '.KKKKKKKKQRrKK',
    '.KKKKKKKQRrYKK',
    '.KKKKKKKQRYYYK',
    '.KKKKKKKQRYYYK',
    '.KKKKKKKQRYYYK',
    '.KKKKKKKKRYYKK',
    '.dKKKKKKKKRrKK',
    '.dKKKKKKKKRrKK',
    '.dKKKKKKKKKKKK',
    '.dnnnnnnGnnnnK',
    '.ddKKKKKKKKKKK',
    '..ddKKKKKKKKK.',
  ];
  const DNC = {
    th: 2, armR: 2.3, legR: 2.5,
    sleeve: ramp('#2a2a35'),
    sleeveBack: ramp('#1b1b24'),
    hand: ramp('#c18a60'),
    handBack: ramp('#9a6a46'),
    pants: ramp('#2c2c3a'),
    legBack: ramp('#1c1c27'),
    boot: ramp('#17171f'),
    head(c) {
      c.g.commit(c.g.bmp(DN_HEAD, DN, 18 + c.ox, 2 + c.oy));
    },
    torso(c) {
      c.g.commit(c.g.bmp(DN_TORSO, DN, 18 + c.ox, 16 + c.oy));
    },
    // pan arrière du manteau, doublure rouge visible quand il flotte
    pre(c) {
      const { g, ox, oy, pose } = c;
      const sw = Math.max(-5, Math.min(5, ((pose.bL[2] + pose.fL[2]) / 2 - 12.5) * 1.6));
      const top = 25 + oy, hem = Math.min(37, 34 + oy);
      const pts = [[19 + ox, top], [25 + ox, top], [27 + ox + sw * 0.4, hem - 1], [22 + ox + sw, hem + 1], [15 + ox + sw * 1.2, hem], [17 + ox + sw * 0.6, top + 4]];
      g.commit(g.poly(pts, (x, y) => (y >= hem - 1 ? DN.r : y >= hem - 3 ? DN.R : x < 22 + ox + sw * 0.5 ? DN.d : DN.K)));
    },
    // pan avant : manteau long jusqu'aux genoux, bord rouge
    post(c) {
      const { g, ox, oy, pose } = c;
      const sw = Math.max(-5, Math.min(5, ((pose.bL[2] + pose.fL[2]) / 2 - 12.5) * 1.2));
      const top = 26 + oy, hem = Math.min(37, 34 + oy);
      const pts = [[19 + ox, top], [31 + ox, top], [32 + ox + sw * 0.3, hem - 1], [26 + ox + sw * 0.6, hem + 1], [20 + ox + sw, hem]];
      g.commit(g.poly(pts, (x, y) => {
        const fe = 31 + ox + (y - top) * 0.1 + sw * 0.3 * ((y - top) / (hem - top));
        if (y >= hem) return DN.r;
        if (y >= hem - 1) return DN.R;
        if (x >= fe - 1) return DN.R;
        if (x <= 21 + ox) return DN.k;
        if (x >= 28 + ox) return DN.d;
        return DN.K;
      }));
      // boutons du manteau
      g.dot(28 + ox, 28 + oy, DN.G);
    },
    backHand(c, a) {
      if (['charge', 'plungePan'].includes(c.pose.__n)) return;
      pistol(c, a, DN_GUN);
    },
    frontHand(c, a) {
      if (['summon', 'charge', 'throwBall', 'plungePan', 'saber'].includes(c.pose.__n)) return;
      pistol(c, a, DN_GUN);
    },
    acc(c) {
      const { g, pose, ox, oy } = c;
      if (pose.saber) {
        const [x1, y1, x2, y2] = pose.saber;
        const ax = 2 * x1 + 1, ay = 2 * y1 + 1, bx = 2 * x2, by = 2 * y2;
        g.commit(g.capsule(ax, ay, bx, by, 1.2, ramp('#e8f0fa')));
        g.commit(g.capsule(ax - 1.5, ay + 1.5, ax + 1.5, ay - 1.5, 1.1, ramp('#d9a82b')));
      }
      if (pose.ball) {
        const [x, y, r] = pose.ball;
        const bx = 2 * (x + r / 2) - 2, by = 2 * (y + r / 2), rr = r + 0.8;
        g.commit(g.poly(circle(bx, by, rr), (px, py) => (Math.abs((px - bx) - (py - by)) < 1.6 ? hex('#1d4fa3') : hex('#ffd23f'))));
      }
      if (pose.pan) {
        g.commit(g.capsule(24, 22, 26, 31, 1.3, ramp('#6a4a30')));
        g.commit(g.capsule(14, 36, 36, 36, 3.4, ramp('#8a93a0')));
        g.commit(g.capsule(17, 35.5, 33, 35.5, 1.4, ramp('#23232b')));
      }
    },
  };
  function circle(cx, cy, r) {
    const p = [];
    for (let i = 0; i < 20; i++) p.push([cx + Math.cos((i / 20) * 6.2832) * r, cy + Math.sin((i / 20) * 6.2832) * r]);
    return p;
  }
  // pistolet : canon aligné sur l'avant-bras
  const DN_GUN = { slide: ramp('#b4bcc9'), grip: ramp('#4a3020'), dark: ramp('#2a2f3a') };
  function pistol(c, a, gun) {
    const { g } = c;
    let dx = a.dx, dy = a.dy;
    const l = Math.hypot(dx, dy) || 1;
    dx /= l; dy /= l;
    if (dy > 0.5) { dx = 0.82; dy = 0.5; } // bras le long du corps : arme tenue vers l'avant
    const n = Math.hypot(dx, dy) || 1;
    dx /= n; dy /= n;
    const px = a.hx + dx * 0.5, py = a.hy + dy * 0.5;
    // le canon reste dans la cellule 48 x 40
    let L = 8.4;
    if (dx > 0.01) L = Math.min(L, (46.2 - px) / dx);
    if (dx < -0.01) L = Math.min(L, (px - 1.8) / -dx);
    if (dy > 0.01) L = Math.min(L, (38.2 - py) / dy);
    if (dy < -0.01) L = Math.min(L, (py - 1.8) / -dy);
    L = Math.max(4, L);
    let gx = -dy, gy = dx;
    if (gy < 0) { gx = -gx; gy = -gy; }
    g.commit(g.capsule(px - gx * 1.2, py - gy * 1.2, px + gx * 2.2, py + gy * 2.2, 1.2, gun.grip)); // crosse
    g.commit(g.capsule(px - dx * 1.5, py - dy * 1.5, px + dx * (L - 1.9), py + dy * (L - 1.9), 1.35, gun.slide)); // culasse
    g.commit(g.capsule(px + dx * (L - 2.4), py + dy * (L - 2.4), px + dx * (L - 0.2), py + dy * (L - 0.2), 0.7, gun.dark)); // bouche
  }
  S.CH.denodoom = DNC;

  const circleP = circle;

  // =====================================================================
  // TORO : bandeau rouge, cheveux en pics, gilet rouge à bande blanche, gants blancs
  // =====================================================================
  const TO = pal({
    h: '#2b1b17', H: '#4a342d', s: '#f1c27d', l: '#ffe0a8', S: '#c9955a', R: '#e63946', Q: '#ff7b86', r: '#8c1c26',
    w: '#ffffff', e: '#2a170d', m: '#a04a3a', W: '#f7f7f7', A: '#ffb703', a: '#c98a00', P: '#8c1c26', p: '#5e1219',
  });
  const TO_HEAD = [
    '...h..hh..h...',
    '..hhhhhhhhhh..',
    '.hhhHhhhhhhhh.',
    '.hhhhhhhhhhhhh',
    'rrRRRRRRRRRRQ.',
    '.rrRRRRRRRRRr.',
    '..SsssshhhhsS.',
    '..SSssswwessl.',
    '..SSsssssssssl',
    '...ssssssssss.',
    '...sssssmmmss.',
    '....ssssssss..',
    '.....SSSSSS...',
    '.....SSSSSS...',
  ];
  const TO_TORSO = [
    '..QQQQQQQQQQ..',
    '.QRRRRRRRRRRR.',
    '.RRRRRRRRWWRRR',
    '.RRRRRRRRWWRRR',
    '.RRRRRRRRWWRRR',
    '.rRRRRRRRWWRRR',
    '.rRRRRRRRWWRRR',
    '.rRRRRRRRWWRRR',
    '.rrRRRRRRWWRRR',
    '.rrrRRRRRWWRRr',
    '.AAAAAAAAAAAAA',
    '.PPPPPPPAAPPPP',
    '.pPPPPPPPPPPPP',
    '..pPPPPPPPPPP.',
  ];
  S.CH.toro = {
    th: 2, armR: 2.3, legR: 2.5,
    sleeve: ramp('#f1c27d'), sleeveBack: ramp('#c9955a'),
    hand: ramp('#ffffff'), handBack: ramp('#d8d8e0'),
    pants: ramp('#8c1c26'), legBack: ramp('#5e1219'), boot: ramp('#2b2740'),
    head(c) { c.g.commit(c.g.bmp(TO_HEAD, TO, 18 + c.ox, 2 + c.oy)); },
    torso(c) { c.g.commit(c.g.bmp(TO_TORSO, TO, 18 + c.ox, 16 + c.oy)); },
    post(c) {
      // ceinture nouée : pans de tissu
      const { g, ox, oy } = c;
      g.commit(g.poly([[20 + ox, 28 + oy], [30 + ox, 28 + oy], [31 + ox, 33 + oy], [27 + ox, 31 + oy], [22 + ox, 33 + oy]], (x, y) => (y > 31 + oy ? TO.p : TO.P)));
    },
  };

  // =====================================================================
  // ASTRA : capuche violette, yeux cyan, liseré doré, cape et robe
  // =====================================================================
  const AS = pal({
    p: '#7a5cff', P: '#a08cff', q: '#3b2a8c', v: '#1d1237', c: '#7df9ff', C: '#d6ffff', y: '#ffd166', Y: '#c9a040',
    n: '#5a46c8', d: '#2a1d6e', x: '#9ff3ff',
  });
  const AS_HEAD = [
    '....pppppp....',
    '..ppPPPPpppp..',
    '.ppPPpppppppp.',
    '.pppppppppppp.',
    '.pyyyyyyyyyyp.',
    'ppqvvvvvvvvvvp',
    'ppqvvvvvvvvvvp',
    'ppqvvvvcCvcCvp',
    '.pqvvvvvvvvvpp',
    '.ppqvvvvvvvpp.',
    '..ppqqvvvvqp..',
    '...pppqqqqpp..',
    '....ppppppp...',
    '.....qqqqq....',
  ];
  const AS_TORSO = [
    '..yyyyyyyyyy..',
    '.pPPPPPPyPPPp.',
    '.pppppppyppppp',
    '.pppxpppyppppp',
    '.pppppppyppxpp',
    '.nppppppYpppqp',
    '.nppxpppYpppqp',
    '.nppppppYppppp',
    '.nnppppyYpppqp',
    '.nnpppppYppxqp',
    '.nnqqqqqqqqqqq',
    '.yyyyyyyyyyyyy',
    '.qqqqqqqqqqqqq',
    '..qqqqqqqqqq..',
  ];
  function orb(g, cx, cy, r) {
    g.commit(g.poly(circleP(cx, cy, r + 1.2), hex('#3b2a8c')));
    g.commit(g.poly(circleP(cx, cy, r), (x, y) => (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < r * 0.45 ? hex('#ffffff') : Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < r * 0.75 ? hex('#9ff3ff') : hex('#7df9ff'))), false);
  }
  S.CH.astra = {
    th: 2, armR: 2.3, legR: 2.5,
    sleeve: ramp('#7a5cff'), sleeveBack: ramp('#3b2a8c'),
    hand: ramp('#7df9ff'), handBack: ramp('#4cc0d0'),
    pants: ramp('#3b2a8c'), legBack: ramp('#241a50'), boot: ramp('#241a50'),
    pre(c) {
      const { g, ox, oy, pose } = c;
      const sw = Math.max(-4, Math.min(4, ((pose.bL[2] + pose.fL[2]) / 2 - 12.5) * 1.2));
      g.commit(g.poly([[19 + ox, 18 + oy], [24 + ox, 19 + oy], [25 + ox, 34 + oy], [17 + ox + sw, 37 + oy], [10 + ox + sw * 1.4, 35 + oy], [13 + ox, 24 + oy]], (x, y) => (y >= 34 + oy ? AS.n : x < 16 + ox ? AS.q : AS.d)));
    },
    head(c) { c.g.commit(c.g.bmp(AS_HEAD, AS, 18 + c.ox, 2 + c.oy)); },
    torso(c) { c.g.commit(c.g.bmp(AS_TORSO, AS, 18 + c.ox, 16 + c.oy)); },
    post(c) {
      const { g, ox, oy, pose } = c;
      const sw = Math.max(-4, Math.min(4, ((pose.bL[2] + pose.fL[2]) / 2 - 12.5) * 1.0));
      const top = 28 + oy, hem = Math.min(36, 33 + oy);
      g.commit(g.poly([[19 + ox, top], [31 + ox, top], [32 + ox + sw * 0.3, hem], [26 + ox + sw * 0.5, hem + 1.5], [20 + ox + sw * 0.8, hem]], (x, y) => (y >= hem - 0.5 ? AS.y : x > 28 + ox ? AS.q : x < 22 + ox ? AS.P : AS.p)));
    },
    acc(c) {
      const { g, pose } = c;
      if (pose.orb) {
        const r = pose.orb * 1.5;
        orb(g, 2 * (pose.fA[2] + 1) + 2, 2 * (pose.fA[3] - pose.orb / 2) , r);
      }
    },
  };

  // =====================================================================
  // GROM : colosse barbu roux, tunique verte, épaulières d'acier
  // =====================================================================
  const GR = pal({
    h: '#7a3b12', H: '#a8571f', b: '#6a3210', B: '#8a4a1c', s: '#eab995', l: '#f6d2b4', S: '#c98f6a',
    w: '#ffffff', e: '#24130a', m: '#7a3f33', T: '#2a9d8f', t: '#17594f', U: '#5cc4b6', A: '#ffd166', k: '#aeb6c4', K: '#7d8794', Z: '#3a2a1c',
  });
  const GR_HEAD = [
    '....hhhhhh....',
    '..hhhHHhhhhh..',
    '.hhhhhhhhhhhhh',
    '.hhhhhhhhhhhh.',
    '.hhsssssssssl.',
    '.hSssbbbbbbbsl',
    '.hSSsswwessssl',
    '..SSssssssssss',
    '..bbsssssssbbl',
    '.bbbbbbmmbbbbb',
    '.bbBbbbbbbbbb.',
    '..bbbbbbbbbb..',
    '...bbbbbbbb...',
    '....SSSSSS....',
  ];
  const GR_TORSO = [
    '..UUUUUUUUUUUU....'.slice(0, 18),
    '.UTTTTTTTTTTTTTT..'.slice(0, 18),
  ];
  const GR_T = [
    '..UUUUUUUUUUUUUU..',
    '.UTTTTTTTTTTTTTTT.',
    '.TTTTTTTTTTTsssTTT',
    '.TTTTTTTTTTsSsSTTT',
    '.TTTTTTTTTTTSsTTTT',
    '.tTTTTTTTTTTTTTTTT',
    '.tTTTTTTTTTTTTTTTT',
    '.tTTTTTTTTTTTTTTTT',
    '.ttTTTTTTTTTTTTTTT',
    '.ttTTTTTTTTTTTTTTt',
    '.AAAAAAAAAAAAAAAAA',
    '.ZZZZZZZZZAAZZZZZZ',
    '.tttttttttttttttt.',
    '..tttttttttttttt..',
  ];
  S.CH.grom = {
    th: 3, armR: 3.2, legR: 3.3,
    sleeve: ramp('#eab995'), sleeveBack: ramp('#c98f6a'),
    hand: ramp('#aeb6c4'), handBack: ramp('#7d8794'),
    pants: ramp('#17594f'), legBack: ramp('#0f3b34'), boot: ramp('#3a2a1c'),
    head(c) { c.g.commit(c.g.bmp(GR_HEAD, GR, 18 + c.ox, 2 + c.oy)); },
    torso(c) {
      const { g, ox, oy } = c;
      g.commit(g.bmp(GR_T, GR, 16 + ox, 16 + oy));
    },
    post(c) {
      const { g, ox, oy } = c;
      // épaulières d'acier
      g.commit(g.capsule(19 + ox, 19 + oy, 21 + ox, 19 + oy, 3.4, ramp('#7d8794')));
      g.commit(g.capsule(31 + ox, 19 + oy, 33 + ox, 19 + oy, 3.4, ramp('#aeb6c4')));
      g.dot(19 + ox, 18 + oy, hex('#e8eef6'));
      g.dot(32 + ox, 18 + oy, hex('#ffffff'));
      // pagne
      g.commit(g.poly([[19 + ox, 29 + oy], [33 + ox, 29 + oy], [32 + ox, 33 + oy], [26 + ox, 34 + oy], [20 + ox, 33 + oy]], (x, y) => (y >= 32 + oy ? GR.t : GR.T)));
    },
  };

  // =====================================================================
  // DEAD LULU : costume trois pièces gris, cheveux ébouriffés, moustache, guitare
  // =====================================================================
  const LU = pal({
    h: '#33200f', H: '#5a3a1e', s: '#e9b896', l: '#f6d2b4', S: '#c98f6a', w: '#ffffff', e: '#24130a', m: '#a04a3a',
    J: '#8b929d', l2: '#b4bac4', j: '#5d6470', W: '#f1f3f7', b: '#3f5fb8', B: '#2b4590', V: '#3b4250', R: '#e84a5f', x: '#d9dde4', L: '#c4c9d2',
  });
  const LU_HEAD = [
    '...hhh.hhhh...',
    '..hhhhhhhhhhh.',
    '.hhhHhhhhhhhhh',
    '.hhhhhhhhhhhh.',
    '.hhhsssssssss.',
    '.hhsssshhhhhs.',
    '..SsssswwesssS',
    '..SSssssssssss',
    '...sssshhhhhs.',
    '...ssssshhhhss',
    '....sssssmsss.',
    '....sssssssl..',
    '.....SSSSSS...',
    '.....SSSSSS...',
  ];
  const LU_TORSO = [
    '..LLLLLLLLLL..',
    '.LJJJJJJJJJJj.',
    '.JJJJJJJjWbWjJ',
    '.JJJJJJJjWbWjJ',
    '.JJRRJJJjVbVjJ',
    '.JJJJJJJjVBVjJ',
    '.JJJJJJJJVBVJJ',
    '.JJJJJJJJVxVJJ',
    '.jJJJJJJJVVVJJ',
    '.jJJJJJJJJxJJJ',
    '.jJJJJJJJJJJJJ',
    '.jjJJJJJJJJJJj',
    '..jjJJJJJJJJj.',
    '..jjjjjjjjjj..',
  ];
  function guitar(g, bx, by, nx, ny) {
    g.commit(g.capsule(nx, ny, bx, by, 1.2, ramp('#7a4a22')));
    g.commit(g.capsule(nx - 1, ny - 1, nx + 1, ny - 1.5, 1.6, ramp('#c9a56a')));
    g.commit(g.poly(circleP(bx, by + 1.2, 5.6), (x, y) => (Math.hypot(x + 0.5 - bx, y + 0.5 - by - 1.2) < 1.9 ? hex('#2b1b17') : y < by - 1 && x < bx - 1 ? hex('#ffb066') : hex('#e0802e'))));
    g.commit(g.poly(circleP(bx - 1.5, by - 3, 3.2), hex('#e0802e')), false);
    g.rect(Math.round(bx - 1), Math.round(by + 3), 3, 1, hex('#5a3418'));
  }
  S.CH.deadlulu = {
    th: 2, armR: 2.3, legR: 2.5,
    sleeve: ramp('#8b929d'), sleeveBack: ramp('#5d6470'),
    hand: ramp('#e9b896'), handBack: ramp('#c98f6a'),
    pants: ramp('#5d6470'), legBack: ramp('#3b4250'), boot: ramp('#1a1a22'),
    pre(c) {
      const { g, ox, oy, pose } = c;
      if (!pose.gtr) guitar(g, 12 + ox, 26 + oy, 8 + ox, 6 + oy);
    },
    head(c) { c.g.commit(c.g.bmp(LU_HEAD, LU, 18 + c.ox, 2 + c.oy)); },
    torso(c) { c.g.commit(c.g.bmp(LU_TORSO, LU, 18 + c.ox, 16 + c.oy)); },
    post(c) {
      const { g, ox, oy } = c;
      g.commit(g.poly([[19 + ox, 28 + oy], [31 + ox, 28 + oy], [31 + ox, 32 + oy], [25 + ox, 33 + oy], [19 + ox, 32 + oy]], (x, y) => (y >= 31 + oy ? LU.j : x < 21 + ox ? LU.L : LU.J)));
      g.rect(24 + ox, 29 + oy, 1, 3, hex('#5d6470'));
    },
    acc(c) {
      const { g, pose } = c;
      if (pose.gtr) {
        const t = pose.gtr;
        guitar(g, 2 * t.bx, 2 * t.by, 2 * t.nx, 2 * t.ny);
        // la main avant par-dessus le manche
        const a = pose.fA;
        g.commit(g.capsule(2 * (a[2] + 1), 2 * (a[3] + 1), 2 * (a[2] + 1), 2 * (a[3] + 1), 2.6, ramp('#e9b896')));
      }
    },
  };

  // =====================================================================
  // NINI : cheveux bouclés à reflets blonds, crop top blanc, jean baggy, ballerines olive,
  //        et son chat sur les épaules. Jamais violente : tout passe par le chat, le corgi et la bague.
  // =====================================================================
  const NI = pal({
    h: '#3b2216', m: '#5a3320', B: '#9a6232', b: '#c28c4a', s: '#c99a72', l: '#dcb08a', S: '#a87450', p: '#d98c78',
    w: '#ffffff', e: '#2a170d', r: '#c4687a', k: '#2a170d', G: '#e0b030',
    W: '#f6f6f8', V: '#cfd3de', U: '#a9afbe',
    J: '#6f93c9', j: '#4a6aa0', K: '#9db8e0',
  });
  // visage (tourné vers la droite) : grands yeux marron, sourcils marqués, anneau de nez doré
  const NI_HEAD = [
    '...mhBmhmBh...',
    '..hmBhmmhBmhm.',
    '.hmBhmhhmBhmmh',
    '.hhmBmhmhhBmhh',
    'hmhBmssssshBmh',
    'hhmhsshhhhhsmh',
    'hmhsSssweeesl.',
    '.hhsSsswesssl.',
    '.hmSSssssssspl',
    '..hmsssssssss.',
    '..hmsssssGrss.',
    '...hsssrrrsl..',
    '....SSSSSS....',
    '.....SSSSS....',
  ];
  const NI_HEAD_R = NI_HEAD.slice();
  NI_HEAD_R[5] = 'hhmhshhhhhhsmh';
  NI_HEAD_R[6] = 'hmhsSsshweesl.';
  NI_HEAD_R[10] = '..hmsssssGrrs.';
  const NI_TORSO = [
    '..WWWWWWWWWW..',
    '.WWWWWWWWWWWW.',
    '.WWWWWWWWWWWWW',
    '.WWWWWWWWWWWV.',
    '.WWWWWWWWWWVV.',
    '..VWWWWWWWWV..',
    '...sssssssss..',
    '...ssssssSSs..',
    '..jJJJJJJJJJj.',
    '.jJKJJJJJJJJJj',
    '.jJJJJJJJJJJJj',
    '.jJJJJJJJJJJJj',
    '.jjJJJJJJJJJjj',
    '.jjJJJJJJJJJjj',
  ];
  // chat mi-long gris-crème, masque tigré, yeux bleus, poitrail blanc
  const CAT = pal({
    g: '#b3ab9f', G: '#cfc8bc', c: '#ebe5da', d: '#6e675d', D: '#4a443d', w: '#f6f3ec', W: '#d9d4c9', n: '#e48a9c', e: '#8fc8f4', E: '#ff5a5a', o: '#14121c', t: '#46434c',
  });
  function curlCloud(c) {
    const { g, ox, oy } = c;
    const curls = [[19, 17, 3.4], [17, 12.5, 3.8], [18, 7.5, 3.8], [21, 4, 3.8], [25, 2.8, 3.8], [29, 4, 3.6], [15.5, 17, 3], [20, 20, 3], [31.5, 8, 3.2], [31, 13, 3], [22.5, 14, 3.6]];
    const m = new Map();
    curls.forEach(([cx, cy, r]) => {
      cx += ox; cy += oy;
      g.poly(circ(cx, cy, r), (px, py) => {
        const d = (px + 0.5 - cx) * -0.6 + (py + 0.5 - cy) * -0.8;
        return d > r * 0.45 ? ((px + py) % 4 === 0 ? NI.b : NI.B) : d < -r * 0.45 ? NI.h : NI.m;
      }).forEach((v, k) => m.set(k, v));
    });
    g.commit(m);
  }
  function circ(cx, cy, r) {
    const p = [];
    for (let i = 0; i < 20; i++) p.push([cx + Math.cos((i / 20) * 6.2832) * r, cy + Math.sin((i / 20) * 6.2832) * r]);
    return p;
  }
  // chat sur les épaules : corps et queue derrière le cou (pre), tête posée sur l'épaule avant (post)
  function catBack(c) {
    const { g, ox, oy, pose, rage } = c;
    const k = rage ? 1.3 : 1;
    const sw = /run/.test(pose.__n) ? 2 : /jump|float/.test(pose.__n) ? -2 : /idle1/.test(pose.__n) ? 1 : 0;
    // queue en panache qui pend dans le dos, bout sombre
    const t0 = [16 + ox, 21 + oy], t1 = [12.5 + ox - sw, 26 + oy], t2 = [13.5 + ox - sw * 1.5, 32 + oy];
    g.commit(g.capsule(t0[0], t0[1], t1[0], t1[1], 1.5 * k, ramp('#b3ab9f')));
    g.commit(g.capsule(t1[0], t1[1], t2[0], t2[1], 1.7 * k, ramp('#a9a195')));
    g.commit(g.capsule(t2[0], t2[1] + 0.5, t2[0], t2[1] + 1.6, 1.8 * k, ramp('#46434c')));
    // corps moelleux drapé autour des épaules
    g.commit(g.capsule(16 + ox, 20 + oy, 32 + ox, 19.8 + oy, 3.5 * k, ramp('#b3ab9f')));
    [[19, 17.3], [22.5, 16.8], [26, 17], [29.5, 17.4]].forEach(([x, y]) => g.rect(Math.round(x + ox), Math.round(y + oy - (k - 1) * 3), 2, 1, CAT.d));
    g.rect(Math.round(18 + ox), Math.round(20 + oy), 1, 2, CAT.G);
  }
  function catFront(c) {
    const { g, ox, oy, pose, rage } = c;
    const k = rage ? 1.28 : 1;
    const claw = !!pose.claw;
    const hx = 35 + ox + (claw ? 1.5 : 0), hy = 18.4 + oy;
    const ear = (x0, up) => g.commit(g.poly([[x0, hy - 2.4 * k], [x0 + 1.2 * k, hy - 7.6 * k - up], [x0 + 4.2 * k, hy - 3 * k]], (x, y) => (y < hy - 4 * k && x > x0 + 0.9 ? CAT.n : CAT.g)));
    ear(hx - 4.6 * k, 0);
    ear(hx + 0.6 * k, 0.4);
    // tête : masque tigré foncé au centre, joues crème, menton blanc
    g.commit(g.poly(circ(hx, hy, 4.7 * k), (x, y) => {
      const dx = x + 0.5 - hx, dy = y + 0.5 - hy;
      if (dy > 2.1 * k) return CAT.w;
      if (Math.abs(dx) < 2.6 * k && dy < 1.8 * k) return dy < -1.4 * k && Math.abs(dx) < 0.6 ? CAT.D : CAT.d;
      return dx < -2.2 * k ? CAT.g : CAT.G;
    }));
    // yeux bleu clair
    if (pose.purr) {
      g.line(hx - 2.8, hy - 0.4, hx - 1.3, hy - 1.2, CAT.o);
      g.line(hx + 0.8, hy - 1.2, hx + 2.4, hy - 0.4, CAT.o);
    } else {
      const ec = rage ? CAT.E : CAT.e;
      g.rect(Math.round(hx - 3), Math.round(hy - 1.4), 2, 2, ec);
      g.rect(Math.round(hx + 0.8), Math.round(hy - 1.4), 2, 2, ec);
      g.dot(hx - 2.4, hy - 0.8, CAT.o);
      g.dot(hx + 1.4, hy - 0.8, CAT.o);
      if (rage) { g.line(hx - 3.6, hy - 2.8, hx - 1, hy - 1.8, CAT.o); g.line(hx + 2.6, hy - 2.8, hx + 0.4, hy - 1.8, CAT.o); }
    }
    g.dot(hx - 0.2, hy + 1.4, CAT.n); // nez rose
    g.dot(hx - 1.6, hy + 2.7, CAT.o);
    g.dot(hx + 1.2, hy + 2.7, CAT.o);
    if (rage) { g.dot(hx - 1.4, hy + 3.3, CAT.w); g.dot(hx + 0.9, hy + 3.3, CAT.w); }
    if (claw) {
      // patte avant tendue : mitaine blanche, griffes sorties
      g.commit(g.capsule(hx + 1, hy + 3.4, 42 + ox, hy + 2.8, 1.8 * k, ramp('#b3ab9f')));
      g.commit(g.capsule(42 + ox, hy + 2.8, 43.4 + ox, hy + 2.8, 2 * k, ramp('#f6f3ec')));
      [-2, 0, 2].forEach((d) => g.line(44.6 + ox, hy + 2.8 + d, 46.6 + ox, hy + 2.8 + d * 1.5, hex('#ffffff')));
    } else {
      g.commit(g.capsule(hx - 1.6, hy + 4.3, hx + 1.4, hy + 4.5, 1.5, ramp('#f6f3ec')));
    }
  }
  S.CH.nini = {
    th: 2, armR: 2.1, legR: 3.1, bootR: 1.8, cap: ramp('#f6f6f8'), capBack: ramp('#cfd3de'),
    sleeve: ramp('#c99a72'), sleeveBack: ramp('#a87450'),
    hand: ramp('#c99a72'), handBack: ramp('#a87450'),
    pants: ramp('#6f93c9'), legBack: ramp('#4a6aa0'), boot: ramp('#6b7a2e'),
    pre(c) {
      curlCloud(c);
      catBack(c);
    },
    head(c) { c.g.commit(c.g.bmp(c.rage ? NI_HEAD_R : NI_HEAD, NI, 18 + c.ox, 2 + c.oy)); },
    torso(c) { c.g.commit(c.g.bmp(NI_TORSO, NI, 18 + c.ox, 16 + c.oy)); },
    post(c) {
      const { g, ox, oy, pose } = c;
      // jean baggy : large, retombe sur les ballerines
      const sw = Math.max(-3, Math.min(3, ((pose.bL[2] + pose.fL[2]) / 2 - 12.5) * 0.9));
      const hem = Math.min(36, 34 + oy);
      g.commit(g.poly([[19 + ox, 27 + oy], [32 + ox, 27 + oy], [33 + ox + sw * 0.4, hem], [26 + ox + sw * 0.6, Math.min(37, 36 + oy)], [18 + ox + sw * 0.6, hem]], (x, y) => (y >= hem - 1 ? NI.j : x > 29 + ox ? NI.j : x < 22 + ox ? NI.K : NI.J)));
      g.rect(24 + ox, 29 + oy, 1, 5, NI.j);
      catFront(c);
    },
  };

  // =====================================================================
  // Accessoires de NINI (textures 48x40 : corgi qui court, alliance, coeur, parapluie)
  // =====================================================================
  S.extras = ['corgi0', 'corgi1', 'wring', 'heart', 'umbrella'];
  S.drawExtra = function (name) {
    const g = S.makeGfx();
    const O = ramp('#e0963a'), Wh = ramp('#f6efe2');
    if (name === 'corgi0' || name === 'corgi1') {
      const f = name === 'corgi0';
      // pattes (derrière le corps)
      g.commit(g.capsule(30, 34, f ? 36 : 33, 38, 1.7, Wh));
      g.commit(g.capsule(14, 34, f ? 8 : 15, 38, 1.7, Wh));
      g.commit(g.capsule(12, 29, 31, 29, 6.2, O)); // corps
      g.commit(g.poly(circ(5.5, 26.5, 2.4), O.base)); // petit moignon de queue
      g.commit(g.capsule(22, 33, 31, 33, 2.2, Wh), false); // ventre blanc
      g.commit(g.capsule(30, 34, f ? 34 : 31, 38, 1.8, Wh));
      g.commit(g.capsule(17, 34, f ? 12 : 18, 38, 1.8, Wh));
      // oreilles dressées
      g.commit(g.poly([[31.5, 20], [32.5, 11], [36.5, 18]], (x, y) => (y > 15 && x > 33 ? hex('#f0a0a8') : O.base)));
      g.commit(g.poly([[36, 19], [39.5, 11.5], [41, 20]], (x, y) => (y > 15 && x < 39 ? hex('#f0a0a8') : O.base)));
      // tête, museau blanc
      g.commit(g.poly(circ(36.5, 24.5, 5.8), (x, y) => (y > 26.5 || x > 40 ? Wh.base : x < 33 ? O.lo : O.base)));
      g.commit(g.capsule(40, 27, 44.5, 27.6, 2, Wh));
      g.dot(45, 26, hex('#14121c')); g.dot(44, 26, hex('#14121c')); // truffe
      g.rect(38, 23, 2, 2, hex('#14121c')); g.dot(38, 23, hex('#ffffff')); // oeil
      g.commit(g.capsule(41, 30, 42, 31.4, 1.2, ramp('#ff7a90')), false); // langue
    } else if (name === 'wring') {
      g.commit(g.poly(circ(24, 22, 9), (x, y) => {
        const d = Math.hypot(x + 0.5 - 24, y + 0.5 - 22);
        if (d < 5.6) return null;
        const t = ((x + 0.5 - 24) * -0.6 + (y + 0.5 - 22) * -0.8) / 9;
        return t > 0.35 ? hex('#fff3b0') : t < -0.3 ? hex('#b8860b') : hex('#ffd23f');
      }));
      g.commit(g.poly([[24, 5], [28, 9.5], [24, 14], [20, 9.5]], (x, y) => (y < 9 ? hex('#e8fbff') : hex('#8fdcff'))));
      g.dot(30, 6, hex('#ffffff')); g.dot(30, 5, hex('#ffffff')); g.dot(30, 7, hex('#ffffff')); g.dot(29, 6, hex('#ffffff')); g.dot(31, 6, hex('#ffffff'));
    } else if (name === 'heart') {
      g.commit(g.poly(circ(24, 20, 10), (x, y) => {
        const X = (x + 0.5 - 24) / 8.2, Y = -(y + 0.5 - 21) / 8.2;
        const v = Math.pow(X * X + Y * Y - 1, 3) - X * X * Y * Y * Y;
        if (v > 0) return null;
        return X < -0.1 && Y > 0.3 ? hex('#ffd0e0') : Y < -0.5 ? hex('#c2255c') : hex('#ff5f8f');
      }));
    } else if (name === 'umbrella') {
      const cols = ['#ff8fb3', '#ffe08a'];
      g.commit(g.poly([[3, 22], [6, 14], [14, 8], [24, 5], [34, 8], [42, 14], [45, 22], [39, 19.5], [33, 22], [28, 19.5], [24, 22], [20, 19.5], [15, 22], [9, 19.5]], (x) => cols[Math.floor((x - 3) / 7) % 2] ? hex(cols[Math.floor((x - 3) / 7) % 2]) : null));
      g.commit(g.capsule(24, 22, 24, 33, 0.9, ramp('#6a4a30')));
      g.commit(g.capsule(24, 34, 21, 35, 1.1, ramp('#6a4a30')));
    }
    const out = new Uint8ClampedArray(S.W * S.H * 4);
    g.buf.forEach((cc, i) => { if (cc) { out[i * 4] = cc[0]; out[i * 4 + 1] = cc[1]; out[i * 4 + 2] = cc[2]; out[i * 4 + 3] = 255; } });
    return out;
  };
})(typeof module !== 'undefined' ? require('./sprites48.js') : SPR48);
