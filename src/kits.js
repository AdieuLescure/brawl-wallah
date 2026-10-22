// ===========================================================================
// MOVESETS — grammaire commune à tous les persos (voir le doc « Brawl Proto — refonte du combat »)
//
// Commandes : LÉGER, LOURD, SPÉCIAL + direction du joystick (neutre / avant / haut / bas), lues au moment de l'appui.
//  LÉGER au sol   : nL (sans direction : enchaînement de 3 coups en rappuyant), sL (avant), uL (haut), dL (bas, fait décoller)
//  LÉGER en l'air : sA (avant ou neutre), uA (haut), dA (bas)
//  LOURD au sol   : sH (avant ou neutre), uH (haut), dH (bas) — se chargent en gardant LOURD appuyé (chargeMax)
//  LOURD en l'air : uAH (haut, avant ou neutre : coup vers le haut = retour, une fois par saut), dAH (bas : plongeon)
//  SPÉCIAL        : nS (neutre ou avant), uS (haut), dS (bas), chacune avec sa recharge (cd) ; en l'air la même
//                   (ou nSA/uSA/dSA si le perso en a une version aérienne). onceAir = une fois par saut.
// Règles de combo (game.js) : un léger qui TOUCHE peut être coupé par un autre léger, un lourd, une spéciale ou
// l'esquive de poursuite (3 annulations au plus). Usure : un coup répété dans les 5 derniers qui ont touché perd de
// sa force (mid = identifiant du coup). Gravity Cancel : esquive aérienne sur place puis attaque = coup du sol en l'air.
//
// Chiffres des coups (en ms et px) : startup (démarrage), active (durée où il touche), total (fin comprise),
// w/h/ox/oy (zone de frappe), dmg (dégâts), kb/ks (recul de base / qui grandit avec les dégâts), ang (angle),
// stun (étourdissement), combo (avantage garanti en ms si le coup touche), pop (petit envol garanti).
// ===========================================================================
(() => {
  // ---- gabarits communs (les persos les ajustent) ---------------------------------------------------------
  // coup d'enchaînement (1er et 2e coups)
  const J = (o) => Object.assign({ type: 'melee', startup: 50, active: 70, total: 230, w: 66, h: 48, ox: 52, oy: -4, dmg: 3, kb: 100, ks: 1.1, ang: -0.15, stun: 150, combo: 120 }, o);
  // 3e coup de l'enchaînement : repousse et termine
  const FIN = (o) => Object.assign({ type: 'melee', startup: 80, active: 100, total: 400, w: 80, h: 58, ox: 56, oy: -6, dmg: 5, kb: 280, ks: 5.4, ang: -0.55, stun: 200, combo: 60 }, o);
  // léger avant : avance et touche, démarre un combo
  const SL = (o) => Object.assign({ type: 'melee', startup: 90, active: 100, total: 340, w: 84, h: 50, ox: 60, oy: -4, dmg: 5, kb: 150, ks: 2.4, ang: -0.3, stun: 180, combo: 150, lunge: 220 }, o);
  // léger haut : au-dessus de soi, soulève un peu
  const UL = (o) => Object.assign({ type: 'melee', startup: 70, active: 110, total: 320, w: 80, h: 92, ox: 22, oy: -52, dmg: 5, kb: 130, ks: 1.6, ang: -1.42, stun: 210, pop: 500, combo: 280 }, o);
  // léger bas : fait décoller l'adversaire, pour enchaîner en l'air
  const DL = (o) => Object.assign({ type: 'melee', startup: 70, active: 100, total: 330, w: 96, h: 34, ox: 50, oy: 24, dmg: 5, kb: 110, ks: 1.4, ang: -1.38, stun: 220, pop: 560, combo: 330 }, o);
  // légers en l'air
  const SA = (o) => Object.assign({ type: 'melee', startup: 70, active: 110, total: 380, w: 84, h: 56, ox: 54, oy: -4, dmg: 6, kb: 200, ks: 3.2, ang: -0.4, stun: 170, combo: 140 }, o);
  const UA = (o) => Object.assign({ type: 'melee', startup: 60, active: 120, total: 380, w: 86, h: 74, ox: 14, oy: -52, dmg: 6, kb: 210, ks: 3.2, ang: -1.35, stun: 170, combo: 140, pop: 380 }, o);
  const DA = (o) => Object.assign({ type: 'melee', startup: 70, active: 120, total: 380, w: 62, h: 62, ox: 10, oy: 44, dmg: 6, kb: 210, ks: 4, ang: 1.2, stun: 170, combo: 120 }, o);
  // lourd en l'air vers le bas : plongeon
  const GP = (o) => Object.assign({ type: 'melee', startup: 80, active: 220, total: 580, w: 64, h: 72, ox: 8, oy: 50, dmg: 10, kb: 320, ks: 7, ang: 1.15, stun: 210, dive: 820 }, o);
  const K = {};
  const O = {};
  for (const id of Object.keys(CHARS)) O[id] = CHARS[id].moves;
  const set = (id, stats, moves, help) => {
    K[id] = moves;
    Object.assign(CHARS[id], stats);
    CHARS[id].help = help;
  };

  // ---------------- TORO : bagarreur, jauge CHAUFFE ----------------
  {
    const o = O.toro;
    set('toro', { speed: 360, jump: 690, weight: 1.08, heat: true, role: 'BAGARREUR' }, {
      nL: J({ pose: 'jab', fx: { cres: 'cres_white', s: 2.6, ang: 0 }, chain: [
        J({ pose: 'jab', dmg: 4, fx: { cres: 'cres_white', s: 2.4, ang: 0 } }),
        FIN({ pose: 'heavy', lunge: 120, dmg: 6, fx: { cres: 'cres_fire', s: 3.6, ang: -20, flames: 5 } }), // CROCHET DE FEU
      ] }), // JAB, JAB
      sL: SL({ pose: 'cross', lunge: 300, w: 74, ox: 58, dmg: 6, fx: { cres: 'cres_fire', s: 3, ang: 0, ghosts: 1 } }), // DIRECT
      uL: UL({ pose: 'up', fx: { cres: 'cres_fire', s: 3, ang: -90, flames: 2 } }), // UPPERCUT
      dL: DL({ pose: 'sweep', fx: { cres: 'cres_fire', s: 3.2, ang: 18, dust: true } }), // BALAYETTE
      sA: SA({ pose: 'heavy', dmg: 7, fx: { cres: 'cres_fire', s: 3.2, ang: 0, flames: 3 } }), // POING VOLANT
      uA: UA({ pose: 'rkick', fx: { cres: 'cres_fire', s: 3, ang: -80 } }), // CISEAUX
      dA: DA({ pose: 'stomp', fx: { cres: 'cres_fire', s: 3, ang: 90 } }), // GENOU
      sH: Object.assign({}, o.forward, { armor: 0, startup: 150, dmg: 13 }), // POING DE FEU
      uH: Object.assign({}, o.up, { startup: 110, dmg: 11, kb: 330, ks: 8.5 }), // DRAGON
      dH: Object.assign({}, o.down, { startup: 150, active: 130, total: 560, w: 176, ox: 24, dmg: 11, kb: 330, ks: 8, ang: -0.5, stun: 220, fx: { cres: 'cres_fire', s: 4.6, ang: 18, flames: 8, dust: true } }), // BALAYAGE DE FEU
      uAH: o.upAir, // FUSÉE
      dAH: o.downAir, // PIÉTINEMENT
      // CHARGE DU TAUREAU : il fonce tête baissée, les tirs passent à travers lui
      nS: { type: 'melee', pose: 'charge', prePose: 'heavyPre', startup: 110, active: 260, total: 640, w: 80, h: 64, ox: 40, oy: -4, dmg: 9, kb: 300, ks: 7, ang: -0.45, stun: 210, dashV: 900, projImmune: true, liftAir: 160, cd: 3000, onceAir: 'charge', fx: { ghosts: 4, flames: 4 } },
      // CORNES : coup de tête qui monte (anti-aérien, 2e retour)
      uS: { type: 'melee', pose: 'up', startup: 80, active: 160, total: 520, w: 64, h: 80, ox: 16, oy: -50, dmg: 7, kb: 260, ks: 5, ang: -1.4, stun: 200, rise: 640, riseX: 60, inv: 80, cd: 2500, onceAir: 'horn', fx: { ghosts: 2, flames: 3 } },
      // ÉRUPTION : vide la CHAUFFE en une explosion autour de lui (plus la jauge est pleine, plus elle est forte)
      dS: { type: 'burst', pose: 'stomp', startup: 160, active: 160, total: 620, w: 150, h: 130, ox: 0, oy: -10, dmg: 6, dmgHeat: 12, kb: 220, kbHeat: 200, ks: 4, ksHeat: 6, ang: -1.2, stun: 200, minHeat: 25, fx: { shock: true, flames: 12, burst: true } },
    }, ['LÉGER  JAB x3 / DIRECT', 'LOURD  POING DE FEU', 'LOURD H/B DRAGON/BALAYAGE', 'SPÉCIAL CHARGE TAUREAU', 'SPÉ H/B CORNES/ÉRUPTION', 'PASSIF CHAUFFE']);
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

  // ---------------- MÉNÈS (id 'grom') : tank lutteur, PEAU DE PIERRE ----------------
  {
    const o = O.grom;
    const ARM = 8; // PEAU DE PIERRE : ses lourds encaissent les coups jusqu'à 8 de dégâts pendant leur préparation
    set('grom', { speed: 295, jump: 640, weight: 1.18, stone: true, role: 'TANK LUTTEUR' }, {
      nL: J({ pose: 'jab', startup: 80, active: 90, total: 300, w: 74, ox: 56, dmg: 4, kb: 70, ks: 0.8, combo: 150, fx: { cres: 'cres_earth', s: 3, ang: 0 }, chain: [
        J({ pose: 'jab', startup: 80, active: 90, total: 300, w: 74, ox: 56, dmg: 4, kb: 70, ks: 0.8, combo: 150, fx: { cres: 'cres_earth', s: 3, ang: 0 } }),
        FIN({ pose: 'heavy', startup: 110, total: 480, dmg: 6, kb: 300, ks: 6, fx: { cres: 'cres_earth', s: 3.8, ang: -10, dust: true } }), // COUP DE TÊTE
      ] }), // CLAQUE, CLAQUE
      sL: SL({ pose: 'heavy', startup: 100, lunge: 260, w: 80, dmg: 5, kb: 80, ks: 0.9, combo: 230, fx: { dust: true, ghosts: 1 } }), // COUP D'ÉPAULE (garde l'adversaire près, pour le SUPLEX)
      uL: UL({ pose: 'up', fx: { dust: true } }), // MANCHETTE
      dL: DL({ pose: 'sweep', fx: { dust: true } }), // COUP DE PIED BAS
      sA: SA({ pose: 'slam', startup: 90, total: 440, w: 90, h: 70, ox: 48, oy: 6, ang: -0.3, fx: { cres: 'cres_earth', s: 3.4, ang: 30 } }), // PLAQUAGE
      uA: UA({ pose: 'up' }), // COUP DE TÊTE
      dA: DA({ pose: 'stomp' }), // COUDE
      sH: Object.assign({}, o.forward, { throw: Object.assign({}, o.forward.throw, { dmg: 11, kb: 370 }) }), // SUPLEX (une prise : pas d'armure)
      uH: Object.assign({}, o.up, { armor: ARM }), // BÉLIER
      dH: Object.assign({}, o.down, { armor: ARM }), // SÉISME
      uAH: o.upAir, // CATAPULTE (armure)
      dAH: o.downAir, // PIÉTINEMENT
      nS: Object.assign({}, o.back, { cd: 1800, proj: Object.assign({}, o.back.proj, { tex: 'mic', s: 3.4, stun: 300 }) }), // MICRO (au bout d'un long fil)
      uS: { type: 'melee', pose: 'bellyUp', startup: 100, active: 220, total: 600, w: 80, h: 90, ox: 10, oy: -40, dmg: 8, kb: 280, ks: 6, ang: -1.3, stun: 200, rise: 860, riseX: 120, armor: ARM, armorActive: true, cd: 3000, onceAir: 'leap', fx: { dust: true, ghosts: 3 } }, // VENTRE AU CIEL : il fonce vers le haut, ventre en avant
      dS: { type: 'proj', pose: 'slam', startup: 150, total: 520, max: 1, replace: true, cd: 4000, fx: {}, // MUR DE PRISON
        proj: { kind: 'wall', tex: 'prisonwall', s: 5, vx: 0, life: 3000, act: 220, w: 50, h: 140, ox: 74, oy: 0, bottom: true, dmg: 7, kb: 260, ks: 5, ang: -1.35, stun: 200 } },
    }, ['LÉGER  CLAQUES / ÉPAULE', 'LOURD  SUPLEX', 'LOURD H/B BÉLIER / SÉISME', 'SPÉCIAL MICRO', 'SPÉ H/B VENTRE / PRISON', 'PASSIF PEAU DE PIERRE']);
  }

  // ---------------- DEADLULU : technique, COUPABLE ! + OBJECTION ----------------
  {
    const o = O.deadlulu;
    set('deadlulu', { speed: 355, jump: 685, weight: 1.05, judge: true, role: 'ROCKEUR AVOCAT' }, {
      nL: J({ pose: 'guitar', w: 76, ox: 56, fx: { cres: 'cres_wood', s: 2.6, ang: 0, notes: true }, chain: [
        J({ pose: 'guitar', w: 76, ox: 56, fx: { cres: 'cres_wood', s: 2.6, ang: -10 } }),
        FIN({ pose: 'guitar', w: 90, h: 70, ox: 58, fx: { cres: 'cres_wood', s: 3.6, ang: -25, notes: true } }), // ACCORD
      ] }), // RIFF, RIFF
      sL: SL({ pose: 'neck', startup: 100, lunge: 160, w: 104, ox: 70, fx: { cres: 'cres_wood', s: 3.2, ang: 0 } }), // COUP DE MANCHE
      uL: UL({ pose: 'kickUp', fx: { cres: 'cres_white', s: 3, ang: -90 } }), // COUP DE PIED HAUT
      dL: DL({ pose: 'rkick', fx: { cres: 'cres_wood', s: 3, ang: 15 } }), // BALAYETTE
      sA: SA({ pose: 'guitarBig', fx: { cres: 'cres_wood', s: 3.2, ang: -20, notes: true } }), // MOULINET
      uA: UA({ pose: 'guitar', fx: { notes: true } }), // SOLO
      dA: DA({ pose: 'plunge', fx: { cres: 'cres_wood', s: 3, ang: 90 } }), // PIQUÉ
      sH: Object.assign({}, o.forward, { dmg: 13 }), // GUITARE+
      uH: o.up, // JAMBE DE FEU
      dH: { type: 'melee', pose: 'chord', prePose: 'guitarBigPre', startup: 160, active: 140, total: 600, w: 190, h: 50, ox: 10, oy: 26, dmg: 11, kb: 320, ks: 8, ang: -0.9, stun: 220, fx: { shock: true, notes: true, cres: 'cres_wood', s: 4, ang: 80 } }, // POWER CHORD
      uAH: o.upAir, // JAMBE DE FEU (retour)
      dAH: o.downAir, // PLONGEON
      nS: Object.assign({}, o.neutral, { cd: 500 }), // PASTIS (3 bouteilles à l'écran)
      uS: Object.assign({}, o.down, { book: Object.assign({}, o.down.book, { mark: 5000 }) }), // CODE PÉNAL : marque COUPABLE 5 s
      dS: Object.assign({}, o.back, { cd: 2000 }), // OBJECTION !
    }, ['LÉGER  RIFFS / MANCHE', 'LOURD  GUITARE+', 'LOURD H/B JAMBE FEU/CHORD', 'SPÉCIAL PASTIS', 'SPÉ H/B CODE PÉNAL/OBJ.', 'LIVRE = COUPABLE !']);
  }

  // ---------------- DENODOOM : assassin, L'AIGLE DE CARTHAGE ----------------
  {
    const o = O.denodoom;
    set('denodoom', { speed: 365, jump: 690, weight: 1.0, role: 'DUELLISTE' }, {
      nL: J({ pose: 'saber', w: 80, ox: 58, fx: { cres: 'cres_steel', s: 2.6, ang: 0 }, chain: [
        J({ pose: 'saber', w: 80, ox: 58, fx: { cres: 'cres_steel', s: 2.6, ang: -15 } }),
        FIN({ pose: 'saber', w: 96, ox: 60, dmg: 6, fx: { cres: 'cres_steel', s: 3.6, ang: -30, ghosts: 2 } }), // TAILLADE
      ] }), // ESTOC, ESTOC
      sL: SL({ pose: 'lunge', startup: 100, lunge: 380, w: 100, ox: 66, dmg: 7, fx: { cres: 'cres_steel', s: 3.4, ang: -5, ghosts: 2 } }), // FENTE
      uL: UL({ pose: 'saberUp', w: 90, fx: { cres: 'cres_steel', s: 3, ang: -80 } }), // MOULINET
      dL: DL({ pose: 'plungePan', fx: { flames: 2, dust: true } }), // COUP DE POÊLE BAS
      sA: SA({ pose: 'saber', fx: { cres: 'cres_steel', s: 3.2, ang: -8, ghosts: 1 } }), // SABRE
      uA: UA({ pose: 'plungePan', fx: { flames: 2 } }), // POÊLE
      dA: DA({ pose: 'plungePan', fx: { flames: 3 } }), // POÊLE PLONGEANTE
      sH: o.back, // HANDBALL (garder LOURD pour charger)
      uH: { type: 'melee', pose: 'saberUp', prePose: 'saberPre', startup: 140, active: 130, total: 560, w: 84, h: 110, ox: 30, oy: -58, dmg: 11, kb: 330, ks: 8.6, ang: -1.38, stun: 220, fx: { cres: 'cres_steel', s: 4.4, ang: -90, ghosts: 2 } }, // SABRE MONTANT
      dH: { type: 'melee', pose: 'sweepSaber', prePose: 'saberPre', startup: 150, active: 130, total: 580, w: 180, h: 40, ox: 20, oy: 24, dmg: 11, kb: 320, ks: 8, ang: -0.5, stun: 220, fx: { cres: 'cres_steel', s: 4.4, ang: 20, dust: true } }, // BALAYAGE AU SABRE
      uAH: o.upAir, // ENVOL DE L'AIGLE (retour)
      dAH: o.downAir, // POÊLE
      nS: Object.assign({}, o.neutral, { cd: 600 }), // PISTOLETS
      uS: Object.assign({}, o.up, { cd: 6000 }), // AIGLE DE CARTHAGE
      dS: Object.assign({}, o.down, { cd: 2500 }), // HERMINE
    }, ['LÉGER  SABRE / FENTE', 'LOURD  HANDBALL (CHARGE)', 'LOURD H/B SABRE/BALAYAGE', 'SPÉCIAL PISTOLETS', 'SPÉ H/B AIGLE/HERMINE', 'AIR LOURD H ENVOL AIGLE']);
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

  // ---------------- ADIEULESCURE : rapide et technique, CTRL+Z ----------------
  {
    const o = O.adieulescure;
    set('adieulescure', { speed: 385, jump: 690, weight: 0.95, role: 'MENEUR DE JEU' }, {
      nL: J({ pose: 'kick', h: 40, oy: 16, fx: { cres: 'cres_white', s: 2.4, ang: 10 }, chain: [
        J({ pose: 'kick', h: 40, oy: 16, fx: { cres: 'cres_white', s: 2.4, ang: 10 } }),
        FIN({ pose: 'header', ox: 50, oy: -18, w: 72, h: 56, fx: { cres: 'cres_white', s: 3.2, ang: -20 } }), // TÊTE
      ] }), // PASSE, PASSE
      sL: SL({ pose: 'volley', lunge: 260, w: 90, h: 46, ox: 58, oy: 6, fx: { dust: true, ghosts: 1 } }), // REPRISE
      uL: UL({ pose: 'juggle', fx: { cres: 'cres_white', s: 3, ang: -80 } }), // JONGLE
      dL: DL({ pose: 'volley', w: 92, h: 36, ox: 52, oy: 22, dmg: 6, lunge: 300, fx: { dust: true, ghosts: 1 } }), // TACLE
      sA: SA({ pose: 'volley', fx: { cres: 'cres_white', s: 3, ang: 0 } }), // VOLÉE
      uA: UA({ pose: 'fiddle', w: 116, h: 100, ox: 0, oy: -30, fx: { notes: true, violin: true } }), // VIOLON
      dA: DA({ pose: 'kick', fx: { dust: true } }), // CRAMPONS
      sH: Object.assign({}, o.forward, { lunge: 300, dashV: 640, dmg: 11, kb: 330, ks: 8.4 }), // ÉCHAPPÉE
      uH: o.up, // IPA
      dH: { type: 'melee', pose: 'rkick', startup: 140, active: 140, total: 560, w: 200, h: 46, ox: 0, oy: 8, dmg: 11, kb: 330, ks: 8, ang: -0.45, stun: 210, fx: { donkey: true, ghosts: 2 } }, // RUADE
      uAH: o.upAir, // ÉPERONS
      dAH: GP({ pose: 'kick', fx: { dust: true, ghosts: 2 } }), // CRAMPONS
      nS: Object.assign({}, o.fwdAir, { cd: 800 }), // POMME D'AMOUR
      uS: o.down, // CTRL+Z (recharge 11 s)
      dS: Object.assign({}, o.back, { cd: 1500 }), // CONTRÔLE
    }, ['LÉGER  PASSES / REPRISE', 'LOURD  ÉCHAPPÉE', 'LOURD H/B IPA / RUADE', 'SPÉCIAL POMME D\'AMOUR', 'SPÉ H/B CTRL+Z/CONTRÔLE', 'CTRL+Z : 1 S EN ARRIÈRE']);
  }

  // ---------------- BIGZINZIN : JACKPOT (argent), DOUBLURE, KEY FRAME, FEUILLE A4 ----------------
  {
    set('bigzinzin', { speed: 360, jump: 690, weight: 1.03, role: 'MONTEUR EN OR' }, {
      nL: J({ pose: 'tap', fx: { cres: 'cres_white', s: 2.4, ang: 0 }, chain: [
        J({ pose: 'tap', fx: { cres: 'cres_white', s: 2.4, ang: -10 } }),
        FIN({ pose: 'flash', fx: { flash: true } }), // FLASH (l'appareil photo du téléphone)
      ] }), // TAP, TAP
      sL: SL({ pose: 'swipe', lunge: 240, fx: { cres: 'cres_white', s: 3, ang: 10, ghosts: 1 } }), // SWIPE
      uL: UL({ pose: 'selfie', fx: { flash: 'up' } }), // SELFIE
      dL: DL({ pose: 'low', fx: { cres: 'cres_white', s: 3, ang: 15, dust: true } }), // SCROLL
      sA: SA({ pose: 'swipe', fx: { cres: 'cres_white', s: 3, ang: 0 } }), // NOTIF
      uA: UA({ pose: 'selfie', fx: { flash: 'up' } }), // STORY
      dA: DA({ pose: 'dive', fx: { cres: 'cres_white', s: 3, ang: 90 } }), // DROP
      // VIRAL : téléphone poussé à bout de bras, une pluie de cœurs
      sH: { type: 'melee', pose: 'push', startup: 160, active: 120, total: 600, w: 92, h: 64, ox: 62, oy: -6, dmg: 12, kb: 340, ks: 8.8, ang: -0.45, stun: 220, lunge: 160, fx: { hearts: true, cres: 'cres_white', s: 4.2, ang: -10, ghosts: 2 } },
      // BUZZ : l'antenne lâche un éclair vers le haut
      uH: { type: 'melee', pose: 'antenna', startup: 140, active: 150, total: 560, w: 72, h: 124, ox: 8, oy: -92, dmg: 11, kb: 330, ks: 8.6, ang: -1.45, stun: 220, fx: { zap: true } },
      // KRACH : il frappe le sol, les pièces volent des deux côtés
      dH: { type: 'melee', pose: 'slam', startup: 160, active: 140, total: 600, w: 190, h: 46, ox: 0, oy: 26, dmg: 11, kb: 320, ks: 8, ang: -0.9, stun: 220, fx: { shock: true, coins: true } },
      // ANTENNE : il s'envole porté par le signal (retour)
      uAH: { type: 'melee', pose: 'antenna', startup: 60, active: 220, total: 520, w: 66, h: 96, ox: 14, oy: -56, dmg: 9, kb: 300, ks: 7, ang: -1.35, stun: 200, rise: 800, riseX: 90, inv: 50, helpless: true, fx: { zap: true, ghosts: 2 } },
      dAH: GP({ pose: 'dive', fx: { ghosts: 2 } }), // CHUTE LIBRE
      // FEUILLE A4 : elle plane lentement en ondulant, coupe et ralentit
      nS: { type: 'proj', pose: 'toss', startup: 90, total: 420, max: 1, cd: 1400, fx: {},
        proj: { kind: 'paper', tex: 'paper', s: 3.2, vx: 380, life: 1900, w: 40, h: 34, ox: 36, oy: -14, dmg: 6, kb: 200, ks: 4, ang: -0.4, stun: 220, slow: 800, small: true } },
      // DOUBLURE : téléport vers le haut, invisible, une silhouette de billets encaisse un coup à sa place
      uS: { type: 'vanish', pose: 'antenna', startup: 90, total: 300, cd: 7000, onceAir: 'vanish', fx: {} },
      // KEY FRAME : une image clé posée au sol (4 s) ; qui marche dessus reste figé un instant
      dS: { type: 'proj', pose: 'low', startup: 120, total: 420, max: 1, replace: true, cd: 2500, fx: {},
        proj: { kind: 'keyframe', tex: 'keyframe', s: 3.4, vx: 0, life: 4000, arm: 250, w: 54, h: 40, ox: 90, oy: 28, ground: true, dmg: 6, kb: 120, ks: 1.5, ang: -1.45, stun: 750, freeze: 550, explode: true, small: true } },
    }, ['LÉGER  TAP x3 / SWIPE', 'LOURD  VIRAL', 'LOURD H/B BUZZ / KRACH', 'SPÉCIAL FEUILLE A4', 'SPÉ H/B DOUBLURE/KEYFRAME', 'PASSIF JACKPOT (ARGENT)']);
  }

  // ---------------- LN4 : pilote de F1 et joueur de badminton ----------------
  {
    set('ln4', { speed: 365, jump: 690, weight: 0.97, role: 'PILOTE SMASHEUR' }, {
      nL: J({ pose: 'swing', fx: { cres: 'cres_ln', s: 2.6, ang: 0 }, chain: [
        J({ pose: 'swing', fx: { cres: 'cres_ln', s: 2.6, ang: -15 } }),
        FIN({ pose: 'flick', w: 84, h: 70, ox: 50, oy: -18, ang: -0.8, fx: { cres: 'cres_ln', s: 3.4, ang: -40, shuttleFx: true } }), // AMORTI
      ] }), // COUP DROIT, REVERS
      sL: SL({ pose: 'helmet', lunge: 260, fx: { ghosts: 1, dust: true } }), // COUP DE CASQUE
      uL: UL({ pose: 'flick', fx: { cres: 'cres_ln', s: 3, ang: -90 } }), // LOB
      dL: DL({ pose: 'slide', w: 112, ox: 56, oy: 28, fx: { dust: true, smoke: true } }), // DÉRAPAGE
      sA: SA({ pose: 'swing', fx: { cres: 'cres_ln', s: 3, ang: 0 } }), // REVERS
      uA: UA({ pose: 'flick', fx: { cres: 'cres_ln', s: 3, ang: -90 } }), // DÉGAGÉ
      dA: DA({ pose: 'dive', fx: { cres: 'cres_ln', s: 3, ang: 90 } }), // RABAT
      // FEUX ÉTEINTS : départ arrêté, il fonce tout droit (plus loin chargé, et encore plus avec des PNEUS NEUFS)
      sH: { type: 'melee', pose: 'dash', startup: 180, active: 240, total: 660, w: 84, h: 60, ox: 40, oy: -2, dmg: 11, kb: 340, ks: 8.6, ang: -0.4, stun: 230, dashV: 760, fx: { ghosts: 4, lights: true, smoke: true } },
      // SMASH : saut, smash puissant vers le haut et l'avant
      uH: { type: 'melee', pose: 'smash', startup: 150, active: 130, total: 580, w: 92, h: 100, ox: 30, oy: -60, dmg: 12, kb: 340, ks: 8.8, ang: -1.2, stun: 220, fx: { cres: 'cres_ln', s: 4.4, ang: -60, shuttleFx: true } },
      // BURN-OUT : les pneus patinent, nuage de fumée des deux côtés
      dH: { type: 'melee', pose: 'burn', startup: 170, active: 170, total: 640, w: 200, h: 44, ox: 0, oy: 26, dmg: 11, kb: 310, ks: 8, ang: -0.9, stun: 220, fx: { smoke: 'big', shock: true } },
      // AILERON : smash vers le ciel, il remonte (retour)
      uAH: { type: 'melee', pose: 'smash', startup: 60, active: 220, total: 520, w: 80, h: 96, ox: 18, oy: -56, dmg: 9, kb: 300, ks: 7, ang: -1.35, stun: 200, rise: 790, riseX: 110, inv: 50, helpless: true, fx: { cres: 'cres_ln', s: 4, ang: -90, ghosts: 2 } },
      dAH: GP({ pose: 'dive', fx: { ghosts: 2 } }), // SMASH PLONGEANT
      // VOLANT : il part très vite, freine d'un coup et retombe
      nS: { type: 'proj', pose: 'serve', startup: 110, total: 440, max: 1, cd: 1350, fx: {},
        proj: { kind: 'shuttle', tex: 'shuttle', s: 3, vx: 1300, vy: -80, grav: 520, life: 1500, w: 30, h: 26, ox: 40, oy: -16, dmg: 6, kb: 185, ks: 3.4, ang: -0.5, stun: 200, small: true } },
      // CHAMPAGNE : le podium ! le jet le propulse vers le haut et arrose ceux qui sont dessous
      uS: { type: 'melee', pose: 'champ', startup: 90, active: 260, total: 600, w: 80, h: 110, ox: 0, oy: 60, dmg: 7, kb: 250, ks: 5, ang: -0.9, stun: 200, rise: 840, riseX: 100, cd: 3200, onceAir: 'leap', fx: { champ: true } },
      // ARRÊT AU STAND (au sol) : immobile une demi-seconde, puis PNEUS NEUFS 6 s
      dS: { type: 'pit', pose: 'pit', startup: 500, total: 640, cd: 12000, fx: {} },
    }, ['LÉGER  RAQUETTE x3 / CASQUE', 'LOURD  FEUX ÉTEINTS', 'LOURD H/B SMASH / BURN-OUT', 'SPÉCIAL VOLANT', 'SPÉ H/B CHAMPAGNE / STAND', 'STAND = PNEUS NEUFS (6 S)']);
  }

  // ---------------- NATANAX : casquette à lames (boomerang), TABLEAU E = MC², FISSION, ALLEY-OOP ----------------
  {
    // FISSION : une moitié d'atome file au ras du sol de chaque côté
    const NEUTRON = { kind: 'neutron', tex: 'neutron', s: 3, vx: 640, life: 640, w: 34, h: 28, ox: 18, oy: 0, ground: true, trail: 0x7af0ff, dmg: 6, kb: 190, ks: 3.6, ang: -0.6, stun: 220, small: true };
    set('natanax', { speed: 355, jump: 690, weight: 1.0, role: 'ÉCLAIREUR ATOMIQUE' }, {
      nL: J({ pose: 'slash', fx: { cres: 'cres_nx', s: 2.6, ang: 0 }, chain: [
        J({ pose: 'slash2', fx: { cres: 'cres_nx', s: 2.6, ang: -25 } }),
        FIN({ pose: 'slash', w: 86, fx: { cres: 'cres_nx', s: 3.6, ang: -10, ghosts: 1 } }), // TRANCHE
      ] }), // VISIÈRE, REVERS
      sL: SL({ pose: 'lunge', lunge: 260, w: 90, ox: 62, fx: { cres: 'cres_nx', s: 3, ang: 0, ghosts: 1 } }), // FENTE
      uL: UL({ pose: 'slashUp', fx: { cres: 'cres_nx', s: 3, ang: -90 } }), // COUPE HAUTE
      dL: DL({ pose: 'low', fx: { cres: 'cres_nx', s: 3, ang: 15, dust: true } }), // VISIÈRE BASSE
      sA: SA({ pose: 'slash', fx: { cres: 'cres_nx', s: 3, ang: 0 } }), // REVERS VOLANT
      uA: UA({ pose: 'slashUp', fx: { cres: 'cres_nx', s: 3, ang: -90 } }), // COUPE AU CIEL
      dA: DA({ pose: 'stomp', fx: { cres: 'cres_nx', s: 3, ang: 90 } }), // TALON
      // GRAND COUP DE LAMES : armé loin derrière, tranché à bout de bras
      sH: { type: 'melee', pose: 'big', startup: 160, active: 120, total: 600, w: 108, h: 60, ox: 64, oy: -6, dmg: 11, kb: 340, ks: 8.6, ang: -0.42, stun: 220, lunge: 150, fx: { cres: 'cres_nx', s: 4.4, ang: -10, ghosts: 2 } },
      // COUPE MONTANTE
      uH: { type: 'melee', pose: 'slashUp', startup: 140, active: 130, total: 560, w: 86, h: 116, ox: 24, oy: -62, dmg: 11, kb: 330, ks: 8.6, ang: -1.4, stun: 220, fx: { cres: 'cres_nx', s: 4.4, ang: -90, ghosts: 1 } },
      // TOUPIE : il tourne sur lui-même, casquette tendue, cape au vent (touche des deux côtés)
      dH: { type: 'melee', pose: 'spin', anim: ['spin', 'spin2'], startup: 150, active: 220, total: 620, w: 190, h: 60, ox: 0, oy: 6, dmg: 11, kb: 320, ks: 8, ang: -0.5, stun: 220, fx: { cres: 'cres_nx', s: 4.2, ang: 10, dust: true } },
      // VRILLE : il remonte en tournant (retour)
      uAH: { type: 'melee', pose: 'spin', anim: ['spin', 'spin2'], startup: 60, active: 220, total: 520, w: 90, h: 96, ox: 10, oy: -40, dmg: 9, kb: 300, ks: 7, ang: -1.35, stun: 200, rise: 790, riseX: 110, inv: 50, helpless: true, fx: { ghosts: 2 } },
      dAH: GP({ pose: 'stomp', fx: { ghosts: 2 } }), // COUP DE BOTTE
      // CASQUETTE : boomerang (rattrapée = recharge immédiate ; ratée = à ramasser)
      nS: { type: 'proj', pose: 'throw', startup: 120, total: 420, cd: 900, fx: {},
        proj: { kind: 'cap', tex: 'capProj', s: 3.6, vx: 980, decel: 2300, fallAt: 900, life: 5000, w: 44, h: 30, ox: 30, oy: -14, dmg: 4, kb: 150, ks: 2.8, ang: -0.5, stun: 210, blockable: true } },
      // ALLEY-OOP : saut très haut, dunk sur celui qui est au-dessus, puis le ballon repart vers le bas
      uS: { type: 'melee', pose: 'dunk', startup: 90, active: 220, total: 600, w: 84, h: 100, ox: 16, oy: -64, dmg: 7, kb: 250, ks: 5, ang: -1.3, stun: 210, rise: 860, riseX: 100, cd: 3000, onceAir: 'leap', dunk: 220, fx: { ghosts: 2, dunkFx: true },
        proj: { kind: 'ball', tex: 'bball', s: 3, vx: 240, vy: 560, grav: 900, life: 1500, w: 34, h: 34, ox: 22, oy: -46, dmg: 7, kb: 230, ks: 4.4, ang: 1.0, stun: 220 } },
      // FISSION (appui court) ; SPÉCIAL + BAS tenu au sol = TABLEAU (dSW) ; formule complète = RÉACTION EN CHAÎNE (dSX)
      dS: { type: 'fission', pose: 'atom', startup: 170, total: 460, cd: 1600, fx: { atomFx: true }, neutron: NEUTRON },
      dSW: { type: 'write', pose: 'write', startup: 0, total: 200 },
      dSX: { type: 'melee', pose: 'boom', prePose: 'boomPre', startup: 420, active: 140, total: 900, w: 270, h: 210, ox: 0, oy: -20, dmg: 15, kb: 350, ks: 9.2, ang: -1.15, stun: 240, cd: 2500, cdKey: 'dS', nuke: true, fx: { nuke: true },
        neutron: Object.assign({}, NEUTRON, { vx: 760, life: 720, dmg: 5 }) },
    }, ['LÉGER  CASQUETTE x3 / FENTE', 'LOURD  GRAND COUP DE LAMES', 'LOURD H/B COUPE / TOUPIE', 'SPÉCIAL CASQUETTE BOOMERANG', 'SPÉ H/B ALLEY-OOP / FISSION', 'BAS TENU : TABLEAU E = MC²']);
  }

  // ---- finitions communes : catégories, identifiants (usure), charge des lourds, tirs que le mur arrête ----
  const LIGHTS = ['nL', 'sL', 'uL', 'dL', 'sA', 'uA', 'dA'];
  const HEAVIES = ['sH', 'uH', 'dH', 'uAH', 'dAH'];
  const SPECIALS = ['nS', 'uS', 'dS', 'nSA', 'uSA', 'dSA'];
  const BLOCKABLE = { neutron: 1, orb: 1, comet: 1, bullet: 1, bottle: 1, tomato: 1, ball: 1, kiss: 1, corgi: 1, suitcase: 1, paper: 1, shuttle: 1 };
  for (const id of Object.keys(K)) {
    const mv = K[id];
    for (const k of Object.keys(mv)) {
      const mid = id + '.' + k;
      const m = Object.assign({}, mv[k], { mid });
      if (LIGHTS.includes(k)) m.light = true;
      if (HEAVIES.includes(k)) {
        m.heavy = true;
        // lourds au sol : garder LOURD appuyé les charge (0,5 s au plus)
        if ((k === 'sH' || k === 'uH' || k === 'dH') && (m.type === 'melee' || m.type === 'proj')) m.chargeMax = 500;
      }
      if (SPECIALS.includes(k)) m.special = true;
      if (m.chain) m.chain = m.chain.map((c, i) => Object.assign({}, c, { mid: mid + (i + 2), light: true }));
      const tag = (sp) => sp && Object.assign({}, sp, { mid, heavy: !!m.heavy, blockable: !!BLOCKABLE[sp.kind] || sp.blockable });
      if (m.proj) m.proj = tag(m.proj);
      if (m.book) m.book = tag(m.book);
      if (m.ball) m.ball = tag(m.ball);
      if (m.neutron) m.neutron = tag(m.neutron);
      if (m.throw) m.throw = Object.assign({}, m.throw, { mid, heavy: !!m.heavy });
      mv[k] = m;
    }
    CHARS[id].moves = mv;
    CHARS[id].jumps = 3; // un saut au sol + deux en l'air
  }

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
