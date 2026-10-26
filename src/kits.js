// ===========================================================================
// MOVESETS — 2 boutons d'attaque façon Brawlhalla (voir le doc « Brawl Proto — armes, spéciales et combos »).
// L'ancienne version (LÉGER / LOURD / SPÉCIAL) est gardée sur la branche git « trois-boutons ».
//
// COUP + direction = les coups de la FAMILLE D'ARME du perso (POINGS, OBJET EN MAIN, ALLONGE, TIR) : mêmes chiffres
// pour toute la famille, chaque perso garde ses postures et ses effets.
//  au sol  : nL (sans direction : enchaînement de 3 coups, chain), sL (avant), uL (haut), dL (bas, fait décoller)
//  en l'air: sA (avant ou neutre), uA (haut), dA (bas)
// SPÉCIAL + direction = les coups du perso :
//  au sol  : nS (sans direction), sS (avant), dS (bas), uS (haut = remonter)
//  en l'air: uS (ou uSA s'il existe) = remonter, dAS = plongeon, nS / sS (ou nSA / sSA s'ils existent)
//  charge: true = se charge en gardant SPÉCIAL (chargeMax) ; relance: true = si elle touche, on peut enchaîner sur
//  un COUP ; recovery: true = pas de recharge en l'air (on peut toujours remonter, une fois par saut).
// Règles de combo (game.js) : un COUP qui TOUCHE peut être coupé par un autre COUP, une spéciale ou l'esquive de
// poursuite (3 annulations au plus). Usure : un coup répété dans les 5 derniers qui ont touché perd de sa force.
//
// Chiffres des coups (en ms et px) : startup (démarrage), active (durée où il touche), total (fin comprise),
// w/h/ox/oy (zone de frappe), dmg (dégâts), kb/ks (recul de base / qui grandit avec les dégâts), ang (angle),
// stun (étourdissement), combo (avantage garanti en ms si le coup touche), pop (petit envol garanti).
// ===========================================================================
(() => {
  // ---- gabarits communs ---------------------------------------------------------------------------------------
  const J = (o) => Object.assign({ type: 'melee', startup: 50, active: 70, total: 230, w: 66, h: 48, ox: 52, oy: -4, dmg: 3, kb: 100, ks: 1.1, ang: -0.15, stun: 150, combo: 120 }, o);
  const FIN = (o) => Object.assign({ type: 'melee', startup: 80, active: 100, total: 400, w: 80, h: 58, ox: 56, oy: -6, dmg: 5, kb: 280, ks: 5.4, ang: -0.55, stun: 200, combo: 60 }, o);
  const SL = (o) => Object.assign({ type: 'melee', startup: 90, active: 100, total: 340, w: 84, h: 50, ox: 60, oy: -4, dmg: 5, kb: 150, ks: 2.4, ang: -0.3, stun: 180, combo: 150, lunge: 220 }, o);
  const UL = (o) => Object.assign({ type: 'melee', startup: 70, active: 110, total: 320, w: 80, h: 92, ox: 22, oy: -52, dmg: 5, kb: 130, ks: 1.6, ang: -1.42, stun: 210, pop: 500, combo: 280 }, o);
  const DL = (o) => Object.assign({ type: 'melee', startup: 70, active: 100, total: 330, w: 96, h: 34, ox: 50, oy: 24, dmg: 5, kb: 110, ks: 1.4, ang: -1.38, stun: 220, pop: 560, combo: 330 }, o);
  const SA = (o) => Object.assign({ type: 'melee', startup: 70, active: 110, total: 380, w: 84, h: 56, ox: 54, oy: -4, dmg: 6, kb: 200, ks: 3.2, ang: -0.4, stun: 170, combo: 140 }, o);
  const UA = (o) => Object.assign({ type: 'melee', startup: 60, active: 120, total: 380, w: 86, h: 74, ox: 14, oy: -52, dmg: 6, kb: 210, ks: 3.2, ang: -1.35, stun: 170, combo: 140, pop: 380 }, o);
  const DA = (o) => Object.assign({ type: 'melee', startup: 70, active: 120, total: 380, w: 62, h: 62, ox: 10, oy: 44, dmg: 6, kb: 210, ks: 4, ang: 1.2, stun: 170, combo: 120 }, o);
  // plongeon (SPÉCIAL bas en l'air)
  const GP = (o) => Object.assign({ type: 'melee', startup: 80, active: 220, total: 580, w: 64, h: 72, ox: 8, oy: 50, dmg: 10, kb: 320, ks: 7, ang: 1.15, stun: 210, dive: 820 }, o);

  // ---- FAMILLES D'ARMES : ce qui change d'une famille à l'autre ----------------------------------------------
  //  spd : démarrage plus lent (ms) ; reach : allonge en plus (px) ; combo : avantage en plus ou en moins (ms)
  //  fin / sa : le 3e coup de l'enchaînement et le coup avant en l'air (ce sont eux qui envoient hors de l'arène)
  const FAMILY = {
    poings: { name: 'POINGS', spd: 0, reach: 0, combo: 0, lunge: 240, fin: { dmg: 6, kb: 310, ks: 7.4 }, sa: { dmg: 7, kb: 240, ks: 6 } },
    objet: { name: 'OBJET EN MAIN', spd: 15, reach: 14, combo: -10, lunge: 270, fin: { dmg: 6, kb: 320, ks: 7.8 }, sa: { dmg: 7, kb: 250, ks: 6.4 } },
    allonge: { name: 'ALLONGE', spd: 30, reach: 36, combo: -30, lunge: 170, fin: { dmg: 7, kb: 330, ks: 8.2 }, sa: { dmg: 8, kb: 260, ks: 6.8 }, bounce: 460 },
  };
  // P : postures et effets du perso pour chaque coup { n1, n2, n3, s, u, d, sa, ua, da }
  const lights = (fam, P) => {
    const F = FAMILY[fam];
    const adj = (m) => {
      m.startup += F.spd;
      m.total += F.spd;
      m.w += F.reach;
      m.ox += Math.round(F.reach * 0.6);
      if (m.combo) m.combo = Math.max(40, m.combo + F.combo);
      return m;
    };
    return {
      nL: adj(J(Object.assign({}, P.n1, { chain: [adj(J(P.n2)), adj(FIN(Object.assign({}, P.n3, F.fin)))] }))),
      sL: adj(SL(Object.assign({ lunge: F.lunge }, P.s))),
      uL: adj(UL(P.u)),
      dL: adj(DL(P.d)),
      sA: adj(SA(Object.assign({}, P.sa, F.sa))),
      uA: adj(UA(P.ua)),
      dA: adj(DA(Object.assign({}, P.da, F.bounce ? { bounce: F.bounce } : {}))),
    };
  };
  // TIR : 2 munitions (rechargement automatique), tir fort de près et faible de loin (falloff), recul en l'air.
  // Les coups de crosse marchent toujours. Pensé pour d'autres armes à distance : seules les postures changent.
  const PELLET = { kind: 'pellet', tex: 'pellet', s: 3, vx: 1500, life: 170, w: 64, h: 52, ox: 46, oy: -8, dmg: 9, kb: 240, ks: 4.4, ang: -0.35, stun: 210, small: true, falloff: true };
  const SHOT = (o, sp) => Object.assign({ type: 'proj', startup: 70, total: 300, shot: true, fx: { blast: 0 }, proj: Object.assign({}, PELLET, sp) }, o);
  const tirLights = (P) => ({
    nL: SHOT(Object.assign({}, P.n1, { chain: [
      SHOT(P.n2, { dmg: 8, kb: 140, ks: 1.6, ang: -0.2, stun: 240 }),
      FIN(Object.assign({}, P.n3, { w: 74, ox: 46, dmg: 7, kb: 330, ks: 8.4 })), // coup de crosse (sans munition)
    ] }), { dmg: 8, kb: 140, ks: 1.6, ang: -0.2, stun: 240 }),
    sL: SL(Object.assign({ lunge: 240, w: 74, ox: 46, dmg: 6 }, P.s)), // crosse en avançant
    uL: SHOT(Object.assign({ fx: { blast: -55 } }, P.u), { vx: 800, vy: -1150, ox: 30, oy: -50, w: 80, h: 76, dmg: 7, kb: 200, ks: 3.6, ang: -1.45 }),
    dL: SHOT(Object.assign({ fx: { blast: 25 } }, P.d), { vx: 1100, life: 170, ground: true, w: 60, h: 30, dmg: 6, kb: 90, ks: 1.2, ang: -1.52, stun: 260, pop: 520 }),
    sA: SHOT(Object.assign({ recoil: { x: -320, y: -60 } }, P.sa), { dmg: 8, kb: 260, ks: 6.6 }),
    uA: SHOT(Object.assign({ fx: { blast: -55 } }, P.ua), { vx: 800, vy: -1150, ox: 30, oy: -50, w: 80, h: 76, dmg: 7, kb: 210, ks: 3.4, ang: -1.4 }),
    dA: SHOT(Object.assign({ recoil: { y: -560, once: 'recoil' }, fx: { blast: 90 } }, P.da), { vx: 0, vy: 1400, life: 150, ox: 4, oy: 50, w: 48, h: 60, dmg: 6, kb: 220, ks: 3.8, ang: 1.2 }),
  });

  const K = {};
  const BARE = {};
  const O = {};
  for (const id of Object.keys(CHARS)) O[id] = CHARS[id].moves;
  const set = (id, stats, moves, help) => {
    K[id] = moves;
    Object.assign(CHARS[id], stats);
    CHARS[id].help = help;
  };

  // ---------------- TORO (POINGS) : poings en feu, jauge CHAUFFE ----------------
  {
    const o = O.toro;
    set('toro', { speed: 340, jump: 690, weight: 0.96, heat: true, role: 'BAGARREUR', family: 'POINGS' }, Object.assign(lights('poings', {
      n1: { pose: 'jab', fx: { cres: 'cres_white', s: 2.6, ang: 0 } }, n2: { pose: 'jab', fx: { cres: 'cres_white', s: 2.4, ang: 0 } },
      n3: { pose: 'heavy', lunge: 120, fx: { cres: 'cres_fire', s: 3.6, ang: -20, flames: 5 } }, // CROCHET DE FEU
      s: { pose: 'cross', fx: { cres: 'cres_fire', s: 3, ang: 0, ghosts: 1 } }, // DIRECT
      u: { pose: 'up', fx: { cres: 'cres_fire', s: 3, ang: -90, flames: 2 } }, // UPPERCUT
      d: { pose: 'sweep', fx: { cres: 'cres_fire', s: 3.2, ang: 18, dust: true } }, // BALAYETTE
      sa: { pose: 'heavy', fx: { cres: 'cres_fire', s: 3.2, ang: 0, flames: 3 } }, // POING VOLANT
      ua: { pose: 'rkick', fx: { cres: 'cres_fire', s: 3, ang: -80 } }, // CISEAUX
      da: { pose: 'stomp', fx: { cres: 'cres_fire', s: 3, ang: 90 } }, // GENOU
    }), {
      // POING DE FEU (se charge)
      nS: Object.assign({}, o.forward, { armor: 0, startup: 190, dmg: 10, kb: 300, ks: 6.6, charge: true, cd: 1800 }),
      // CHARGE DU TAUREAU : il fonce tête baissée, les tirs passent à travers lui
      sS: { type: 'melee', pose: 'charge', prePose: 'heavyPre', startup: 130, active: 180, total: 660, w: 80, h: 64, ox: 40, oy: -4, dmg: 6, kb: 240, ks: 4.6, ang: -0.45, stun: 230, combo: 140, dashV: 720, projImmune: true, liftAir: 160, cd: 5000, onceAir: 'charge', relance: true, fx: { ghosts: 4, flames: 4 } },
      // ÉRUPTION : vide la CHAUFFE en une explosion autour de lui
      dS: { type: 'burst', pose: 'stomp', startup: 160, active: 160, total: 620, w: 150, h: 130, ox: 0, oy: -10, dmg: 5, dmgHeat: 10, kb: 220, kbHeat: 150, ks: 4, ksHeat: 3.5, ang: -1.2, stun: 200, minHeat: 35, cd: 2000, fx: { shock: true, flames: 12, burst: true } },
      // CORNES : coup de tête qui monte (remonter)
      uS: { type: 'melee', pose: 'up', startup: 80, active: 180, total: 520, w: 64, h: 84, ox: 16, oy: -50, dmg: 8, kb: 270, ks: 6, ang: -1.4, stun: 200, rise: 830, riseX: 100, inv: 80, onceAir: 'horn', recovery: true, fx: { ghosts: 2, flames: 3 } },
      dAS: o.downAir, // PIÉTINEMENT
    }), ['COUP   POINGS', 'SPÉCIAL POING DE FEU', 'SPÉ AV CHARGE DU TAUREAU', 'SPÉ H/B CORNES/ÉRUPTION', 'AIR BAS PIÉTINEMENT', 'PASSIF CHAUFFE']);
  }

  // ---------------- ASTRA : mage, ÉTOILE PIÈGE + TÉLÉPORT ----------------
  {
    const o = O.astra;
    set('astra', { speed: 330, jump: 700, weight: 0.9, role: 'MAGE' }, {
      nL: J({ pose: 'cast', startup: 70, total: 270, w: 72, ox: 58, fx: { rune: true }, chain: [
        J({ pose: 'cast', startup: 70, total: 270, w: 72, ox: 58, fx: { rune: true } }),
        FIN({ pose: 'castBig', startup: 100, total: 440, w: 96, h: 80, ox: 50, fx: { burst: true, rune: true } }), // ÉCLAT
      ] }), // RUNE, RUNE (plus lent que les autres : elle n'aime pas le contact)
      sL: SL({ pose: 'cast', startup: 110, active: 90, total: 380, w: 140, h: 34, ox: 90, oy: -8, kb: 170, lunge: 0, combo: 130, fx: { rune: true } }), // IMPULSION
      uL: UL({ pose: 'castUp', fx: { rune: true } }), // ARC STELLAIRE
      dL: DL({ pose: 'castDown', fx: { rune: true } }), // RUNE BASSE
      sA: SA({ pose: 'cast', w: 96, h: 70, ox: 50, fx: { rune: true, burst: true } }), // ÉTINCELLE
      uA: UA({ pose: 'castUp', w: 110, fx: { rune: true } }), // HALO
      dA: DA({ pose: 'castDown', fx: { rune: true } }), // CHUTE DE RUNE
      sH: Object.assign({}, o.forward, { max: 1, startup: 180, proj: Object.assign({}, o.forward.proj, { dmg: 11 }) }), // SPHÈRE (une à la fois)
      uH: o.up, // COMÈTE
      dH: { type: 'melee', pose: 'castDown', startup: 140, active: 140, total: 560, w: 170, h: 90, ox: 0, oy: 0, dmg: 10, kb: 330, ks: 8, ang: -0.6, stun: 210, fx: { burst: true, rune: true, shock: true } }, // NOVA
      uAH: o.upAir, // ÉTOILE FILANTE
      dAH: GP({ pose: 'castDown', dmg: 9, kb: 300, ks: 6.5, dive: 720, fx: { rune: true } }), // CHUTE D'ASTRE
      nS: Object.assign({}, o.neutral, { cd: 600 }), // ORBES (2 à l'écran)
      uS: { type: 'blink', pose: 'castUp', startup: 120, total: 380, rise: 820, cd: 3000, onceAir: 'blink', fx: { rune: true } }, // TÉLÉPORT
      dS: Object.assign({}, o.down, { cd: 1500 }), // ÉTOILE PIÈGE
    }, ['LÉGER  RUNES / IMPULSION', 'LOURD  SPHÈRE', 'LOURD H/B COMÈTE / NOVA', 'SPÉCIAL ORBES', 'SPÉ H/B TÉLÉPORT/ÉTOILE', 'TÉLÉPORT : VERS L\'ÉTOILE']);
  }


  // ---------------- MÉNÈS (id 'grom', POINGS) : claques, PEAU DE PIERRE ----------------
  {
    const o = O.grom;
    const ARM = 8; // PEAU DE PIERRE : ses spéciales (sauf le SUPLEX) encaissent les coups jusqu'à 8 de dégâts
    set('grom', { speed: 295, jump: 640, weight: 1.18, stone: true, role: 'TANK LUTTEUR', family: 'POINGS' }, Object.assign(lights('poings', {
      n1: { pose: 'jab', fx: { cres: 'cres_earth', s: 3, ang: 0 } }, n2: { pose: 'jab', fx: { cres: 'cres_earth', s: 3, ang: 0 } },
      n3: { pose: 'heavy', fx: { cres: 'cres_earth', s: 3.8, ang: -10, dust: true } }, // COUP DE TÊTE
      s: { pose: 'heavy', fx: { dust: true, ghosts: 1 } }, // COUP D'ÉPAULE
      u: { pose: 'up', fx: { dust: true } }, // MANCHETTE
      d: { pose: 'sweep', fx: { dust: true } }, // COUP DE PIED BAS
      sa: { pose: 'slam', fx: { cres: 'cres_earth', s: 3.4, ang: 30 } }, // PLAQUAGE
      ua: { pose: 'up' }, // COUP DE TÊTE
      da: { pose: 'stomp' }, // COUDE
    }), {
      nS: Object.assign({}, o.forward, { cd: 900, throw: Object.assign({}, o.forward.throw, { dmg: 10, kb: 350 }) }), // SUPLEX (une prise : pas d'armure)
      sS: Object.assign({}, o.back, { cd: 1800, armor: ARM, relance: true, proj: Object.assign({}, o.back.proj, { tex: 'mic', s: 3.4, stun: 300 }) }), // MICRO (au bout d'un long fil)
      dS: { type: 'proj', pose: 'slam', startup: 150, total: 520, max: 1, replace: true, cd: 4000, armor: ARM, fx: {}, // MUR DE PRISON
        proj: { kind: 'wall', tex: 'prisonwall', s: 5, vx: 0, life: 3000, act: 220, w: 50, h: 140, ox: 74, oy: 0, bottom: true, dmg: 7, kb: 260, ks: 5, ang: -1.35, stun: 200 } },
      uS: { type: 'melee', pose: 'bellyUp', startup: 100, active: 220, total: 600, w: 80, h: 90, ox: 10, oy: -40, dmg: 8, kb: 280, ks: 6, ang: -1.3, stun: 200, rise: 860, riseX: 120, armor: ARM, armorActive: true, onceAir: 'leap', recovery: true, fx: { dust: true, ghosts: 3 } }, // VENTRE AU CIEL
      dAS: Object.assign({}, o.downAir, { armor: ARM }), // PIÉTINEMENT
    }), ['COUP   POINGS (CLAQUES)', 'SPÉCIAL SUPLEX', 'SPÉ AV MICRO', 'SPÉ H/B VENTRE / PRISON', 'AIR BAS PIÉTINEMENT', 'PASSIF PEAU DE PIERRE']);
  }

  // ---------------- DEADLULU (ALLONGE) : guitare, COUPABLE ! + OBJECTION ----------------
  {
    const o = O.deadlulu;
    set('deadlulu', { speed: 355, jump: 685, weight: 1.05, judge: true, role: 'ROCKEUR AVOCAT', family: 'ALLONGE' }, Object.assign(lights('allonge', {
      n1: { pose: 'guitar', fx: { cres: 'cres_wood', s: 2.6, ang: 0, notes: true } }, n2: { pose: 'guitar', fx: { cres: 'cres_wood', s: 2.6, ang: -10 } },
      n3: { pose: 'guitar', fx: { cres: 'cres_wood', s: 3.6, ang: -25, notes: true } }, // ACCORD
      s: { pose: 'neck', fx: { cres: 'cres_wood', s: 3.2, ang: 0 } }, // COUP DE MANCHE
      u: { pose: 'guitar', fx: { cres: 'cres_wood', s: 3, ang: -90, notes: true } }, // MANCHE AU CIEL
      d: { pose: 'chord', fx: { cres: 'cres_wood', s: 3, ang: 15 } }, // GUITARE AU SOL
      sa: { pose: 'guitarBig', fx: { cres: 'cres_wood', s: 3.2, ang: -20, notes: true } }, // MOULINET
      ua: { pose: 'guitar', fx: { notes: true } }, // SOLO
      da: { pose: 'plunge', fx: { cres: 'cres_wood', s: 3, ang: 90 } }, // PIQUÉ
    }), {
      nS: Object.assign({}, o.neutral, { cd: 500, proj: Object.assign({}, o.neutral.proj, { dmg: 8 }) }), // PASTIS (3 bouteilles à l'écran)
      sS: Object.assign({}, o.down, { book: Object.assign({}, o.down.book, { mark: 5000, dmg: 11 }) }), // CODE PÉNAL : marque COUPABLE 5 s
      dS: Object.assign({}, o.back, { cd: 2000 }), // OBJECTION !
      uS: Object.assign({}, o.upAir, { recovery: true }), // JAMBE DE FEU (remonter)
      dAS: o.downAir, // PLONGEON
    }), ['COUP   ALLONGE (GUITARE)', 'SPÉCIAL PASTIS', 'SPÉ AV CODE PÉNAL', 'SPÉ H/B JAMBE FEU/OBJ.', 'AIR BAS PLONGEON', 'LIVRE = COUPABLE !']);
  }

  // ---------------- DENODOOM (TIR) : fusil à pompe, L'AIGLE DE CARTHAGE ----------------
  {
    const o = O.denodoom;
    set('denodoom', { speed: 370, jump: 690, weight: 1.1, tir: true, role: 'TIREUR', family: 'TIR' }, Object.assign(tirLights({
      n1: { pose: 'gun' }, n2: { pose: 'gun' }, n3: { pose: 'butt', fx: { cres: 'cres_steel', s: 3.4, ang: -10, ghosts: 1 } },
      s: { pose: 'butt', fx: { cres: 'cres_steel', s: 3, ang: 0, ghosts: 1 } }, // CROSSE
      u: { pose: 'gunUp' }, d: { pose: 'gunDown' }, sa: { pose: 'gun' }, ua: { pose: 'gunUp' }, da: { pose: 'gunAirDown' },
    }), {
      nS: o.back, // HANDBALL (garder SPÉCIAL pour charger)
      // COUP DE POÊLE : il fonce poêle en avant
      sS: { type: 'melee', pose: 'panHit', startup: 120, active: 130, total: 500, w: 84, h: 60, ox: 52, oy: -4, dmg: 9, kb: 300, ks: 7.8, ang: -0.45, stun: 230, combo: 140, lunge: 340, cd: 1400, onceAir: 'charge', relance: true, fx: { cres: 'cres_fire', s: 3.6, ang: 0, flames: 4, ghosts: 2 } },
      dS: Object.assign({}, o.down, { cd: 2500 }), // HERMINE
      uS: Object.assign({}, o.up, { cd: 6000 }), // AIGLE DE CARTHAGE (au sol)
      uSA: Object.assign({}, o.upAir, { recovery: true, carryMs: 500 }), // ENVOL DE L'AIGLE (en l'air : remonter)
      dAS: o.downAir, // POÊLE PLONGEANTE
    }), ['COUP   TIR (FUSIL À POMPE)', 'SPÉCIAL HANDBALL (CHARGE)', 'SPÉ AV COUP DE POÊLE', 'SPÉ H/B AIGLE / HERMINE', 'AIR BAS POÊLE', '2 CARTOUCHES PUIS RECHARGE']);
  }

  // ---------------- NINI : invocatrice, COLÈRE DE SCARLETT (elle ne frappe jamais elle-même) ----------------
  {
    const o = O.nini;
    set('nini', { speed: 345, jump: 700, weight: 0.97, role: 'INVOCATRICE' }, {
      nL: J({ pose: 'claw', fx: { cres: 'cres_pink', s: 2.4, ang: 0 }, chain: [
        J({ pose: 'claw', w: 80, ox: 56, fx: { cres: 'cres_pink', s: 3, ang: -30 } }),
        FIN({ pose: 'claw', w: 84, ox: 60, fx: { cres: 'cres_pink', s: 3.4, ang: -30 } }), // FEULEMENT
      ] }), // GRIFFE, GRIFFE (Scarlett)
      sL: SL({ pose: 'claw', lunge: 180, w: 96, ox: 66, fx: { cres: 'cres_pink', s: 3, ang: 0 } }), // COUP DE PATTE
      uL: UL({ pose: 'castUp', fx: { petals: true } }), // PÉTALES
      dL: DL({ pose: 'castUp', w: 96, h: 64, ox: 40, oy: 10, dmg: 6, fx: { peony: true } }), // PIVOINE BASSE
      sA: SA({ pose: 'claw', fx: { cres: 'cres_pink', s: 3.2, ang: 0 } }), // GRIFFES
      uA: UA({ pose: 'float', fx: { wind: 'up' } }), // BOURRASQUE
      dA: DA({ pose: 'claw', fx: { cres: 'cres_pink', s: 3, ang: 70 } }), // GRIFFE PLONGEANTE
      sH: o.forward, // BOND DU CHAT
      uH: o.up, // PIVOINE
      // LA VALISE : elle la jette lourdement devant elle, elle s'ouvre en touchant le sol
      dH: { type: 'proj', pose: 'drop', startup: 150, total: 560, fx: {},
        proj: { kind: 'suitcase', tex: 'suitcase', s: 3.6, vx: 220, vy: -340, grav: 1800, life: 1000, w: 70, h: 50, ox: 40, oy: -30, dmg: 11, kb: 320, ks: 8, ang: -0.7, stun: 230 } },
      uAH: o.upAir, // AUTANT EN EMPORTE LE VENT
      dAH: Object.assign({}, o.downAir, { cd: 1500 }), // VALISE lâchée en dessous
      nS: Object.assign({}, o.back, { cd: 4000 }), // COUP DE FOUDRE (charme, recharge 4 s)
      uS: { type: 'float', pose: 'float', startup: 60, total: 900, hop: 360, onceAir: 'float', fx: {} }, // PARASOL : elle plane
      dS: o.down, // CORGI (recharge 4 s)
    }, ['LÉGER  GRIFFES / PATTE', 'LOURD  BOND DU CHAT', 'LOURD H/B PIVOINE/VALISE', 'SPÉCIAL COUP DE FOUDRE', 'SPÉ H/B PARASOL/CORGI', 'PASSIF COLÈRE DU CHAT']);
  }


  // ---------------- ADIEULESCURE (POINGS, aux pieds) : CTRL+Z ----------------
  {
    const o = O.adieulescure;
    set('adieulescure', { speed: 385, jump: 690, weight: 1.0, role: 'MENEUR DE JEU', family: 'POINGS' }, Object.assign(lights('poings', {
      n1: { pose: 'kick', h: 40, oy: 16, fx: { cres: 'cres_white', s: 2.4, ang: 10 } }, n2: { pose: 'kick', h: 40, oy: 16, fx: { cres: 'cres_white', s: 2.4, ang: 10 } },
      n3: { pose: 'header', fx: { cres: 'cres_white', s: 3.2, ang: -20 } }, // TÊTE
      s: { pose: 'volley', fx: { dust: true, ghosts: 1 } }, // REPRISE
      u: { pose: 'juggle', fx: { cres: 'cres_white', s: 3, ang: -80 } }, // JONGLE
      d: { pose: 'volley', fx: { dust: true, ghosts: 1 } }, // TACLE
      sa: { pose: 'volley', fx: { cres: 'cres_white', s: 3, ang: 0 } }, // VOLÉE
      ua: { pose: 'fiddle', fx: { notes: true, violin: true } }, // VIOLON
      da: { pose: 'kick', fx: { dust: true } }, // CRAMPONS
    }), {
      nS: o.down, // CTRL+Z (recharge 11 s)
      sS: Object.assign({}, o.forward, { lunge: 300, dashV: 640, dmg: 10, kb: 300, ks: 6.8, combo: 140, cd: 2200, onceAir: 'charge', relance: true }), // ÉCHAPPÉE
      dS: Object.assign({}, o.back, { cd: 1500 }), // CONTRÔLE
      uS: Object.assign({}, o.upAir, { recovery: true }), // ÉPERONS (remonter)
      dAS: GP({ pose: 'kick', fx: { dust: true, ghosts: 2 } }), // CRAMPONS
    }), ['COUP   POINGS (AU PIED)', 'SPÉCIAL CTRL+Z', 'SPÉ AV ÉCHAPPÉE', 'SPÉ H/B ÉPERONS/CONTRÔLE', 'AIR BAS CRAMPONS', 'CTRL+Z : 1 S EN ARRIÈRE']);
  }

  // ---------------- BIGZINZIN (OBJET EN MAIN) : téléphone, JACKPOT ----------------
  {
    set('bigzinzin', { speed: 360, jump: 690, weight: 1.07, role: 'MONTEUR EN OR', family: 'OBJET EN MAIN' }, Object.assign(lights('objet', {
      n1: { pose: 'tap', fx: { cres: 'cres_white', s: 2.4, ang: 0 } }, n2: { pose: 'tap', fx: { cres: 'cres_white', s: 2.4, ang: -10 } },
      n3: { pose: 'flash', fx: { flash: true } }, // FLASH (l'appareil photo du téléphone)
      s: { pose: 'swipe', fx: { cres: 'cres_white', s: 3, ang: 10, ghosts: 1 } }, // SWIPE
      u: { pose: 'selfie', fx: { flash: 'up' } }, // SELFIE
      d: { pose: 'low', fx: { cres: 'cres_white', s: 3, ang: 15, dust: true } }, // SCROLL
      sa: { pose: 'swipe', fx: { cres: 'cres_white', s: 3, ang: 0 } }, // NOTIF
      ua: { pose: 'selfie', fx: { flash: 'up' } }, // STORY
      da: { pose: 'dive', fx: { cres: 'cres_white', s: 3, ang: 90 } }, // DROP
    }), {
      // BUZZ : l'antenne lâche un éclair vers le haut
      nS: { type: 'melee', pose: 'antenna', startup: 140, active: 150, total: 560, w: 72, h: 124, ox: 8, oy: -92, dmg: 12, kb: 330, ks: 8.6, ang: -1.45, stun: 220, cd: 900, fx: { zap: true } },
      // FEUILLE A4 : elle plane lentement en ondulant, coupe et ralentit
      sS: { type: 'proj', pose: 'toss', startup: 90, total: 420, max: 1, cd: 1400, relance: true, fx: {},
        proj: { kind: 'paper', tex: 'paper', s: 3.2, vx: 380, life: 1900, w: 40, h: 34, ox: 36, oy: -14, dmg: 8, kb: 200, ks: 4, ang: -0.4, stun: 220, slow: 800, small: true } },
      // KEY FRAME : une image clé posée au sol (4 s) ; qui marche dessus reste figé un instant
      dS: { type: 'proj', pose: 'low', startup: 120, total: 420, max: 1, replace: true, cd: 2500, fx: {},
        proj: { kind: 'keyframe', tex: 'keyframe', s: 3.4, vx: 0, life: 4000, arm: 250, w: 54, h: 40, ox: 90, oy: 28, ground: true, dmg: 6, kb: 120, ks: 1.5, ang: -1.45, stun: 750, freeze: 550, explode: true, small: true } },
      // DOUBLURE : téléport vers le haut, invisible, une silhouette de billets encaisse un coup à sa place (remonter)
      uS: { type: 'vanish', pose: 'antenna', startup: 90, total: 300, cd: 7000, onceAir: 'vanish', recovery: true, fx: {} },
      dAS: GP({ pose: 'dive', fx: { ghosts: 2 } }), // CHUTE LIBRE
    }), ['COUP   OBJET (TÉLÉPHONE)', 'SPÉCIAL BUZZ', 'SPÉ AV FEUILLE A4', 'SPÉ H/B DOUBLURE/KEYFRAME', 'AIR BAS CHUTE LIBRE', 'PASSIF JACKPOT (ARGENT)']);
  }

  // ---------------- LN4 (ALLONGE) : raquette, pilote de F1 ----------------
  {
    set('ln4', { speed: 365, jump: 690, weight: 0.97, role: 'PILOTE SMASHEUR', family: 'ALLONGE' }, Object.assign(lights('allonge', {
      n1: { pose: 'swing', fx: { cres: 'cres_ln', s: 2.6, ang: 0 } }, n2: { pose: 'swing', fx: { cres: 'cres_ln', s: 2.6, ang: -15 } },
      n3: { pose: 'flick', fx: { cres: 'cres_ln', s: 3.4, ang: -40, shuttleFx: true } }, // AMORTI
      s: { pose: 'swing', fx: { cres: 'cres_ln', s: 3, ang: 0, ghosts: 1 } }, // COUP DROIT TENDU
      u: { pose: 'flick', fx: { cres: 'cres_ln', s: 3, ang: -90 } }, // LOB
      d: { pose: 'slide', fx: { dust: true, smoke: true } }, // DÉRAPAGE
      sa: { pose: 'swing', fx: { cres: 'cres_ln', s: 3, ang: 0 } }, // REVERS
      ua: { pose: 'flick', fx: { cres: 'cres_ln', s: 3, ang: -90 } }, // DÉGAGÉ
      da: { pose: 'dive', fx: { cres: 'cres_ln', s: 3, ang: 90 } }, // RABAT
    }), {
      // VOLANT : il part très vite, freine d'un coup et retombe
      nS: { type: 'proj', pose: 'serve', startup: 110, total: 440, max: 1, cd: 1600, fx: {},
        proj: { kind: 'shuttle', tex: 'shuttle', s: 3, vx: 1300, vy: -80, grav: 520, life: 1500, w: 30, h: 26, ox: 40, oy: -16, dmg: 6, kb: 185, ks: 3.4, ang: -0.5, stun: 200, small: true } },
      // FEUX ÉTEINTS : départ arrêté, il fonce tout droit (se charge ; plus loin avec des PNEUS NEUFS)
      sS: { type: 'melee', pose: 'dash', startup: 180, active: 240, total: 660, w: 84, h: 60, ox: 40, oy: -2, dmg: 8, kb: 300, ks: 6.2, ang: -0.4, stun: 230, combo: 140, dashV: 760, charge: true, cd: 2600, onceAir: 'charge', relance: true, fx: { ghosts: 4, lights: true, smoke: true } },
      // ARRÊT AU STAND (au sol) : immobile une demi-seconde, puis PNEUS NEUFS 6 s
      dS: { type: 'pit', pose: 'pit', startup: 500, total: 640, cd: 12000, fx: {} },
      // CHAMPAGNE : le podium ! le jet le propulse vers le haut et arrose ceux qui sont dessous (remonter)
      uS: { type: 'melee', pose: 'champ', startup: 90, active: 260, total: 600, w: 80, h: 110, ox: 0, oy: 60, dmg: 7, kb: 250, ks: 5, ang: -0.9, stun: 200, rise: 860, riseX: 110, onceAir: 'leap', recovery: true, fx: { champ: true } },
      dAS: GP({ pose: 'dive', fx: { ghosts: 2 } }), // SMASH PLONGEANT
    }), ['COUP   ALLONGE (RAQUETTE)', 'SPÉCIAL VOLANT', 'SPÉ AV FEUX ÉTEINTS', 'SPÉ H/B CHAMPAGNE/STAND', 'AIR BAS SMASH PLONGEANT', 'STAND = PNEUS NEUFS (6 S)']);
  }

  // ---------------- NATANAX (OBJET EN MAIN ; sans casquette : POINGS) ----------------
  {
    const NEUTRON = { kind: 'neutron', tex: 'neutron', s: 3, vx: 640, life: 640, w: 34, h: 28, ox: 18, oy: 0, ground: true, trail: 0x7af0ff, dmg: 6, kb: 190, ks: 3.6, ang: -0.6, stun: 220, small: true };
    const NXP = {
      n1: { pose: 'slash', fx: { cres: 'cres_nx', s: 2.6, ang: 0 } }, n2: { pose: 'slash2', fx: { cres: 'cres_nx', s: 2.6, ang: -25 } },
      n3: { pose: 'slash', fx: { cres: 'cres_nx', s: 3.6, ang: -10, ghosts: 1 } }, // TRANCHE
      s: { pose: 'lunge', fx: { cres: 'cres_nx', s: 3, ang: 0, ghosts: 1 } }, // FENTE
      u: { pose: 'slashUp', fx: { cres: 'cres_nx', s: 3, ang: -90 } }, // COUPE HAUTE
      d: { pose: 'low', fx: { cres: 'cres_nx', s: 3, ang: 15, dust: true } }, // VISIÈRE BASSE
      sa: { pose: 'slash', fx: { cres: 'cres_nx', s: 3, ang: 0 } }, // REVERS VOLANT
      ua: { pose: 'slashUp', fx: { cres: 'cres_nx', s: 3, ang: -90 } }, // COUPE AU CIEL
      da: { pose: 'stomp', fx: { cres: 'cres_nx', s: 3, ang: 90 } }, // TALON
    };
    set('natanax', { speed: 355, jump: 690, weight: 1.0, role: 'ÉCLAIREUR ATOMIQUE', family: 'OBJET EN MAIN' }, Object.assign(lights('objet', NXP), {
      // TOUPIE : il tourne sur lui-même, casquette tendue, cape au vent (touche des deux côtés)
      nS: { type: 'melee', pose: 'spin', anim: ['spin', 'spin2'], startup: 150, active: 220, total: 620, w: 190, h: 60, ox: 0, oy: 6, dmg: 10, kb: 310, ks: 7.6, ang: -0.5, stun: 220, cd: 1200, fx: { cres: 'cres_nx', s: 4.2, ang: 10, dust: true } },
      // CASQUETTE : boomerang (rattrapée = recharge immédiate ; ratée = à ramasser)
      sS: { type: 'proj', pose: 'throw', startup: 120, total: 420, cd: 900, relance: true, fx: {},
        proj: { kind: 'cap', tex: 'capProj', s: 3.6, vx: 980, decel: 2300, fallAt: 900, life: 5000, w: 44, h: 30, ox: 30, oy: -14, dmg: 4, kb: 150, ks: 2.8, ang: -0.5, stun: 210, blockable: true } },
      // FISSION (appui court) ; SPÉCIAL + BAS tenu au sol = TABLEAU (dSW) ; formule complète = RÉACTION EN CHAÎNE (dSX)
      dS: { type: 'fission', pose: 'atom', startup: 170, total: 460, cd: 1600, fx: { atomFx: true }, neutron: NEUTRON },
      dSW: { type: 'write', pose: 'write', startup: 0, total: 200 },
      dSX: { type: 'melee', pose: 'boom', prePose: 'boomPre', startup: 420, active: 140, total: 900, w: 270, h: 210, ox: 0, oy: -20, dmg: 15, kb: 350, ks: 9.2, ang: -1.15, stun: 240, cd: 2500, cdKey: 'dS', nuke: true, fx: { nuke: true },
        neutron: Object.assign({}, NEUTRON, { vx: 760, life: 720, dmg: 5 }) },
      // ALLEY-OOP : saut très haut, dunk sur celui qui est au-dessus, puis le ballon repart vers le bas (remonter)
      // (dunk renforcé, demande de Noah : il ne pouvait pas tuer à 275 % ; tue vers 140 % depuis le centre)
      uS: { type: 'melee', pose: 'dunk', startup: 90, active: 220, total: 600, w: 84, h: 100, ox: 16, oy: -64, dmg: 9, kb: 300, ks: 7.6, ang: -1.3, stun: 210, rise: 860, riseX: 100, onceAir: 'leap', recovery: true, dunk: 220, fx: { ghosts: 2, dunkFx: true },
        proj: { kind: 'ball', tex: 'bball', s: 3, vx: 240, vy: 560, grav: 900, life: 1500, w: 34, h: 34, ox: 22, oy: -46, dmg: 7, kb: 230, ks: 4.4, ang: 1.0, stun: 220 } },
      dAS: GP({ pose: 'stomp', fx: { ghosts: 2 } }), // COUP DE BOTTE
    }), ['COUP   OBJET (CASQUETTE)', 'SPÉCIAL TOUPIE', 'SPÉ AV CASQUETTE', 'SPÉ H/B ALLEY-OOP/FISSION', 'AIR BAS COUP DE BOTTE', 'BAS TENU : TABLEAU E=MC²']);
    // sans sa casquette (lancée), ses COUPS sont ceux des POINGS
    BARE.natanax = lights('poings', NXP);
  }

  // ---------------- KYLIAN (POINGS, aux pieds) : JAUGE BISOU, amoureux = plus fort, plus vite, 3 ballons ----------------
  {
    const BALL = { kind: 'kyball', tex: 'kyball', s: 3.2, vx: 940, vy: -60, grav: 260, life: 950, w: 34, h: 34, ox: 34, oy: 6, dmg: 7, kb: 210, ks: 3.8, ang: -0.35, stun: 220, small: true };
    set('kylian', { speed: 375, jump: 690, weight: 1.0, role: 'GÉNÉRAL DU BUT', family: 'POINGS' }, Object.assign(lights('poings', {
      n1: { pose: 'kick', h: 40, oy: 16, fx: { cres: 'cres_ky', s: 2.4, ang: 10 } }, n2: { pose: 'kick', h: 40, oy: 16, fx: { cres: 'cres_ky', s: 2.4, ang: 10 } },
      n3: { pose: 'header', fx: { cres: 'cres_ky', s: 3.2, ang: -20 } }, // COUP DE TÊTE
      s: { pose: 'strike', fx: { cres: 'cres_ky', s: 3, ang: 0, ghosts: 1 } }, // FRAPPE
      u: { pose: 'juggle', fx: { cres: 'cres_ky', s: 3, ang: -80 } }, // JONGLE
      d: { pose: 'tackle', fx: { dust: true, ghosts: 1 } }, // TACLE GLISSÉ
      sa: { pose: 'airkick', fx: { cres: 'cres_ky', s: 3, ang: 0 } }, // REPRISE
      ua: { pose: 'bicycle', fx: { cres: 'cres_ky', s: 3.2, ang: -100 } }, // RETOURNÉ
      da: { pose: 'stomp', fx: { cres: 'cres_ky', s: 3, ang: 90 } }, // SEMELLE
    }), {
      // VOLÉE : la reprise de volée, penché en arrière, bras écartés (le gros coup qui tue)
      nS: { type: 'melee', pose: 'volley', prePose: 'volleyPre', startup: 150, active: 120, total: 540, w: 96, h: 52, ox: 52, oy: 14, dmg: 11, kb: 290, ks: 7.2, ang: -0.55, stun: 230, cd: 1200, fx: { cres: 'cres_ky', s: 4, ang: 15, ghosts: 2, dust: true } },
      // TIR : un ballon ; « T'ES PAS CONTENT ? » au-dessus de sa tête (amoureux : sSL, 3 ballons, recharge plus longue)
      sS: { type: 'proj', pose: 'shoot', prePose: 'shootPre', startup: 110, total: 420, cd: 1000, relance: true, kyShot: true, fx: {}, proj: BALL },
      sSL: { type: 'proj', pose: 'shoot', prePose: 'shootPre', startup: 110, total: 460, cd: 1700, cdKey: 'sS', relance: true, kyShot: true, fx: {}, proj: BALL, spread: [-330, 210] },
      // TROPHÉE : un grand trophée doré sort du sol un peu plus loin et envoie l'ennemi vers le haut
      dS: { type: 'proj', pose: 'point', prePose: 'pointPre', startup: 110, total: 480, cd: 1700, max: 1, replace: true, relance: true, fx: {},
        proj: { kind: 'hermine', tex: 'kyCup', s: 3, vx: 0, life: 800, act: 620, w: 60, h: 118, ox: 128, oy: 0, bottom: true, dmg: 8, kb: 330, ks: 7.2, ang: -1.52, stun: 250, pop: 420 } },
      // MOIII : tête levée, main en porte-voix ; le mot monte à la verticale (remonter)
      uS: { type: 'melee', pose: 'moi', prePose: 'moiPre', startup: 80, active: 300, total: 560, w: 52, h: 200, ox: 6, oy: -104, dmg: 8, kb: 270, ks: 6.4, ang: -1.45, stun: 210, rise: 820, riseX: 90, onceAir: 'moi', recovery: true, moi: true, fx: { ghosts: 2 } },
      // GENOUX : de face, à genoux, bras croisés ; onde de choc à l'atterrissage (un peu plus large que lui)
      dAS: GP({ pose: 'knee', dmg: 9, kb: 300, ks: 6.6, w: 56, h: 66, ox: 0, oy: 40, dive: 800, knee: true, fx: { ghosts: 2 },
        shock: { dmg: 5, kb: 210, ks: 3.4, ang: -1.0, stun: 200, w: 112, h: 34 } }),
    }), ['COUP   POINGS (AU PIED)', 'SPÉCIAL VOLÉE', 'SPÉ AV TIR (3 SI AMOUREUX)', 'SPÉ H/B MOIII/TROPHÉE', 'AIR BAS GENOUX', 'BOUGE : JAUGE BISOU']);
  }

  // ---- finitions communes : catégories, identifiants (usure), charge, tirs que le mur arrête ----
  const LIGHTS = ['nL', 'sL', 'uL', 'dL', 'sA', 'uA', 'dA'];
  const HEAVIES = ['sH', 'uH', 'dH', 'uAH', 'dAH']; // (Astra et Nini, en réserve, gardent l'ancienne grammaire)
  const SPECIALS = ['nS', 'sS', 'uS', 'dS', 'dAS', 'nSA', 'sSA', 'uSA', 'dSA', 'dSW', 'dSX', 'sSL'];
  const BLOCKABLE = { pellet: 1, neutron: 1, orb: 1, comet: 1, bullet: 1, bottle: 1, tomato: 1, ball: 1, kiss: 1, corgi: 1, suitcase: 1, paper: 1, shuttle: 1, kyball: 1 };
  const finish = (id, mv) => {
    for (const k of Object.keys(mv)) {
      const mid = id + '.' + k;
      const m = Object.assign({}, mv[k], { mid });
      if (LIGHTS.includes(k)) m.light = true;
      if (HEAVIES.includes(k)) {
        m.heavy = true;
        if ((k === 'sH' || k === 'uH' || k === 'dH') && (m.type === 'melee' || m.type === 'proj')) m.chargeMax = 500;
      }
      if (SPECIALS.includes(k)) m.special = true;
      // spéciale qui se charge en gardant SPÉCIAL (0,5 s au plus)
      if (m.charge && (m.type === 'melee' || m.type === 'proj')) m.chargeMax = 500;
      const tag = (sp, mm) => sp && Object.assign({}, sp, { mid: mm.mid, heavy: !!mm.heavy, special: !!mm.special, blockable: !!BLOCKABLE[sp.kind] || sp.blockable });
      if (m.chain) m.chain = m.chain.map((c, i) => { const cc = Object.assign({}, c, { mid: mid + (i + 2), light: true }); if (cc.proj) cc.proj = tag(cc.proj, cc); return cc; });
      if (m.proj) m.proj = tag(m.proj, m);
      if (m.book) m.book = tag(m.book, m);
      if (m.ball) m.ball = tag(m.ball, m);
      if (m.neutron) m.neutron = tag(m.neutron, m);
      if (m.throw) m.throw = Object.assign({}, m.throw, { mid, heavy: !!m.heavy, special: !!m.special });
      mv[k] = m;
    }
    return mv;
  };
  for (const id of Object.keys(K)) {
    CHARS[id].moves = finish(id, K[id]);
    CHARS[id].jumps = 3; // un saut au sol + deux en l'air
  }
  for (const id of Object.keys(BARE)) CHARS[id].bareAll = Object.assign({}, CHARS[id].moves, finish(id, BARE[id]));

  // textures de MÉNÈS : le MUR DE PRISON et le MICRO
  const baseExtra = GameScene.prototype.makeExtraTextures;
  GameScene.prototype.makeExtraTextures = function () {
    if (baseExtra) baseExtra.call(this);
    iconTex(this, 'prisonwall', [
      'kkkkkkkkkkk', 'kccccccccck', 'kdddddddddk', 'klllldllllk', 'kmmmmdmmmmk', 'kdddddddddk', 'kldllllldlk', 'kmdmmmmmdmk', 'kdddddddddk',
      'kdkkkkkkkdk', 'kdkwbwbwkdk', 'kdkwbwbwkdk', 'kdkwbwbwkdk', 'kdkwbwbwkdk', 'kdkwbwbwkdk', 'kdkwbwbwkdk', 'kdkkkkkkkdk', 'kdddddddddk',
      'klllldllllk', 'kmmmmdmmmmk', 'kdddddddddk', 'kldllllldlk', 'kmdmmmmmdmk', 'kdddddddddk', 'klllldllllk', 'kmmmmdmmmmk', 'kdddddddddk', 'kkkkkkkkkkk',
    ], '#000', { k: '#14121c', c: '#c9ccd4', d: '#4a4d58', m: '#7d818e', l: '#a4a8b4', w: '#0d1530', b: '#9aa0ac' });
    // micro : la grille en haut (le jeu le tourne vers l'avant), le manche en bas
    iconTex(this, 'mic', ['.kkkk.', 'kLgLgk', 'kgLgGk', 'kLgGGk', '.kkkk.', '.kBBk.', '.kBBk.', '.kRBk.', '.kBBk.', '..kk..'], '#000',
      { k: '#14121c', L: '#e6e8ee', g: '#9aa0ac', G: '#5a5f6a', B: '#2a2a34', R: '#e63946' });
  };
})();

// ===========================================================================
// FAMILLES D'ARMES : ce qui se passe pendant le combat
//  - NATANAX sans sa casquette : ses COUPS sont ceux des POINGS (famMoves)
//  - TIR : 2 munitions (pl.ammo), rechargement automatique (vide : 0,8 s ; une seule : 1,5 s sans tirer),
//    tir à vide = « CLIC », recul en l'air (recoil), plombs plus faibles de loin (falloff)
//  - ALLONGE : le coup bas en l'air fait rebondir sur l'adversaire (bounce)
// Tout l'état est en champs simples (ammo, reloadAt, lastShot, recoilUsed) : sauvegardé en ligne.
// ===========================================================================
(() => {
  const TIR = { ammo: 2, reloadEmpty: 650, reloadOne: 1200, falloff: 0.3 };
  const P = GameScene.prototype;

  // les coups utilisables en ce moment (famille d'arme du perso, ou celle sans objet)
  P.famMoves = function (pl) {
    if (pl.def.bareAll && this.nxCapOut && this.nxCapOut(pl)) return pl.def.bareAll;
    return pl.def.moves;
  };

  // tir : munitions et recul (au moment où le plomb part)
  const baseSpawn = P.spawnProj;
  P.spawnProj = function (pl, target, m, now, dy, spOverride) {
    if (m && m.shot && !spOverride && pl.def.tir) {
      const ammo = pl.ammo === undefined ? TIR.ammo : pl.ammo;
      const c = pl.sprite.body.center;
      if (ammo <= 0) {
        this.popup(c.x + pl.facing * 30, c.y - 70, 'CLIC', '#c9ccd4');
        this.sfx('ui', 0.4);
        return;
      }
      pl.ammo = ammo - 1;
      pl.lastShot = now;
      if (pl.ammo <= 0) pl.reloadAt = now + TIR.reloadEmpty;
      const r = m.recoil;
      if (r && (!r.once || !pl[r.once + 'Used'])) {
        const b = pl.sprite.body;
        if (r.x) pl.sprite.setVelocityX(pl.facing * r.x);
        if (r.y) pl.sprite.setVelocityY(Math.min(b.velocity.y, r.y));
        if (r.once) pl[r.once + 'Used'] = true;
      }
    }
    return baseSpawn.call(this, pl, target, m, now, dy, spOverride);
  };

  // à chaque image : rechargement, recul rendu au sol, affichage des cartouches
  const baseStep = P.bzStep;
  P.bzStep = function (pl, other, now) {
    if (baseStep) baseStep.call(this, pl, other, now);
    if (!pl.def.tir) return;
    const b = pl.sprite.body;
    if (b.blocked.down || b.touching.down) pl.recoilUsed = false;
    const ammo = pl.ammo === undefined ? TIR.ammo : pl.ammo;
    if (ammo < TIR.ammo && ((ammo <= 0 && now >= (pl.reloadAt || 0)) || (ammo > 0 && now - (pl.lastShot || 0) >= TIR.reloadOne))) {
      pl.ammo = TIR.ammo;
      if (!this.resim) this.sfx('ui', 0.25);
    }
    // affichage seulement : les cartouches au-dessus de la tête quand il en manque
    const show = pl.stocks > 0 && (pl.ammo === undefined ? TIR.ammo : pl.ammo) < TIR.ammo;
    if (show) {
      if (!pl.ammoImg && !this.resim) pl.ammoImg = [0, 1].map(() => this.add.rectangle(0, 0, 7, 12, 0xe8b030).setStrokeStyle(2, 0x000000).setDepth(41));
      if (pl.ammoImg) pl.ammoImg.forEach((r, i) => r.setPosition(pl.sprite.x - 6 + i * 12, pl.sprite.y - 92).setFillStyle(i < pl.ammo ? 0xe8b030 : 0x3a3a44));
    } else if (pl.ammoImg) {
      pl.ammoImg.forEach((r) => r.destroy());
      pl.ammoImg = null;
    }
  };

  // plombs du fusil : plus faibles de loin, s'arrêtent sur le premier touché
  const baseProj = P.bzProj;
  P.bzProj = function (p, now) {
    if (baseProj && baseProj.call(this, p, now)) return true;
    const sp = p.spec;
    if (sp.kind !== 'pellet') return false;
    if (now - p.born > sp.life) { this.killProj(p, false); return true; }
    p.sprite.setAlpha(1 - 0.6 * ((now - p.born) / sp.life));
    const victims = this.pls.length > 2 ? this.enemiesOf(p.owner) : [p.target];
    for (const v of victims) {
      if (now < v.invulnUntil || v.stocks <= 0 || v.grab) continue;
      if (v.atk && v.atk.m.projImmune && now < v.atk.end) continue;
      const vb = v.sprite.body;
      if (!(p.x + sp.w / 2 > vb.x && p.x - sp.w / 2 < vb.right && p.y + sp.h / 2 > vb.y && p.y - sp.h / 2 < vb.bottom)) continue;
      if (v.atk && v.atk.m.type === 'catch' && now >= v.atk.cFrom && now <= v.atk.cTo) { this.catchProj(v, p, now); return true; }
      const k = 1 - TIR.falloff * Math.min((now - p.born) / sp.life, 1);
      const spec = Object.assign({}, sp, { dmg: sp.dmg * k, kb: sp.kb * (0.5 + 0.5 * k), ks: sp.ks * k });
      const dir = sp.vx ? Math.sign(p.vx) || p.f : Math.sign(v.sprite.x - p.owner.sprite.x) || p.f;
      this.applyHit(p.owner, v, spec, now, dir, { x: p.x, y: p.y });
      this.killProj(p, false);
      return true;
    }
    return true;
  };

  // ALLONGE : le coup bas en l'air rebondit sur l'adversaire
  const baseHit = P.bzHit;
  P.bzHit = function (att, vic, spec, now) {
    if (baseHit) spec = baseHit.call(this, att, vic, spec, now);
    if (spec.bounce && att !== vic) {
      const b = att.sprite.body;
      if (!(b.blocked.down || b.touching.down)) att.sprite.setVelocityY(-spec.bounce);
    }
    return spec;
  };

  // effets : éclair au bout du canon
  const baseFx = P.extraFx;
  P.extraFx = function (pl, m, fx, b, f) {
    if (baseFx) baseFx.call(this, pl, m, fx, b, f);
    if (fx.blast !== undefined) {
      const a = (fx.blast * Math.PI) / 180;
      const ux = Math.cos(a) * f, uy = Math.sin(a);
      const x = b.x + ux * 46, y = b.y - 8 + uy * 46;
      const fl = this.add.image(x, y, 'burst').setScale(PX * 0.45).setTint(0xffe27a).setDepth(31);
      this.tweens.add({ targets: fl, scale: PX * 0.8, alpha: 0, duration: 120, onComplete: () => fl.destroy() });
      for (let i = 0; i < 5; i++) {
        const q = this.add.rectangle(x, y, 5, 5, i % 2 ? 0xffe27a : 0xffffff).setDepth(31);
        const sp = (Math.random() - 0.5) * 0.6;
        const vx = Math.cos(a + sp) * f, vy = Math.sin(a + sp);
        this.tweens.add({ targets: q, x: x + vx * (60 + Math.random() * 60), y: y + vy * (60 + Math.random() * 60), alpha: 0, duration: 160, onComplete: () => q.destroy() });
      }
      const sm = this.add.circle(x, y, 7, 0xb8b8c0, 0.7).setDepth(30);
      this.tweens.add({ targets: sm, y: y - 16, scale: 2, alpha: 0, duration: 380, onComplete: () => sm.destroy() });
      this.sfx('shoot', 0.8);
    }
  };

  const baseTex = P.makeExtraTextures;
  P.makeExtraTextures = function () {
    if (baseTex) baseTex.call(this);
    // plombs du fusil à pompe (gerbe)
    iconTex(this, 'pellet', ['....kY', '..kY..', 'kYkkYk', '..kY..', '....kY'], '#000', { k: '#3a2a10', Y: '#ffe27a' });
  };
})();
