// ===========================================================================
// COMMANDES « À LA BRAWLHALLA » : deux boutons d'attaque, trois directions (AVANT, HAUT, BAS).
//  - LÉGER : au sol sLight (avant, ou sans direction), uLight (haut), dLight (bas) ;
//            en l'air sAir (avant), uAir (haut), dAir (bas). Rapides, faits pour s'enchaîner.
//  - LOURD : au sol sSig (avant), uSig (haut), dSig (bas) ;
//            en l'air seulement rec (LOURD + haut / avant / sans direction : coup vers le haut, une fois par saut)
//            et gp (LOURD + bas : coup de pied plongeant).
// Plus de coup « arrière » : pousser le joystick d'un côté fait se tourner et frapper de ce côté.
// COMBOS : un coup léger qui touche peut être coupé tout de suite par un autre léger ou par un lourd (finisseur).
// Options : light (coup léger), combo (avantage garanti en ms), pop (petit envol garanti, pour relancer en l'air).
// ===========================================================================
(() => {
  const L = (o) => Object.assign({ type: 'melee', startup: 70, active: 100, total: 300, ox: 54, oy: -4, w: 82, h: 52, dmg: 6, kb: 150, ks: 2.6, ang: -0.35, stun: 170, combo: 130 }, o);
  // léger bas : lance l'adversaire un peu en l'air, pour enchaîner en l'air
  const D = (o) => L(Object.assign({ startup: 70, active: 100, total: 330, w: 96, h: 34, ox: 50, oy: 24, dmg: 5, kb: 110, ks: 1.4, ang: -1.38, stun: 220, pop: 560, combo: 330 }, o));
  // léger haut : frappe au-dessus de soi et soulève un peu
  const U = (o) => L(Object.assign({ startup: 70, active: 110, total: 320, w: 80, h: 92, ox: 22, oy: -52, dmg: 5, kb: 130, ks: 1.6, ang: -1.42, stun: 210, pop: 500, combo: 280 }, o));
  // léger en l'air vers le bas : petit coup qui pique (sans plongeon)
  const DA = (o) => L(Object.assign({ startup: 70, active: 120, total: 360, w: 62, h: 62, ox: 10, oy: 44, dmg: 6, kb: 210, ks: 4, ang: 1.2, stun: 170, combo: 120 }, o));
  // ancien coup aérien tout autour -> léger en l'air vers le haut
  const UA = (m, extra) => Object.assign({}, m, { oy: (m.oy || 0) - 28, h: Math.max(m.h || 80, 96), ang: -1.32, combo: 140 }, extra || {});
  const light = (m, extra) => Object.assign({}, m, { combo: m.combo || 120 }, extra || {});
  // coup de pied plongeant générique (LOURD + bas en l'air)
  const GP = (o) => Object.assign({ type: 'melee', startup: 80, active: 220, total: 580, w: 64, h: 72, ox: 8, oy: 50, dmg: 10, kb: 320, ks: 7, ang: 1.15, stun: 210, dive: 820 }, o);
  const K = {};
  const O = {};
  for (const id of Object.keys(CHARS)) O[id] = CHARS[id].moves;

  // ---------------- TORO ----------------
  {
    const o = O.toro;
    K.toro = {
      sLight: light(o.neutral), // JAB x3
      uLight: U({ pose: 'up', fx: { cres: 'cres_fire', s: 3, ang: -90, flames: 3 } }),
      dLight: D({ pose: 'sweep', fx: { cres: 'cres_fire', s: 3.4, ang: 18, dust: true } }),
      sAir: light(o.fwdAir),
      uAir: UA(o.nAir),
      dAir: DA({ pose: 'stomp', fx: { cres: 'cres_fire', s: 3, ang: 90 } }),
      uSig: o.up, // DRAGON
      sSig: o.forward, // POING FEU
      dSig: Object.assign({}, o.down, { startup: 150, active: 130, total: 560, dmg: 11, kb: 330, ks: 8, ang: -0.5, stun: 220, fx: { cres: 'cres_fire', s: 4.6, ang: 18, flames: 8, dust: true } }),
      rec: o.upAir, // FUSÉE (uppercut)
      gp: o.downAir, // PIÉTINEMENT
    };
    CHARS.toro.help = ['LOURD+HAUT DRAGON', 'LOURD      POING FEU', 'LOURD+BAS  BALAYAGE', 'AIR LOURD  FUSEE', 'AIR LRD+BAS PIETINE'];
  }
  // ---------------- ASTRA ----------------
  {
    const o = O.astra;
    K.astra = {
      sLight: o.neutral, // ORBE
      uLight: U({ pose: 'castUp', fx: { rune: true } }),
      dLight: D({ pose: 'castDown', fx: { rune: true } }),
      sAir: Object.assign({}, o.neutral, { total: 360 }),
      uAir: UA(o.nAir),
      dAir: o.downAir,
      uSig: o.up, // COMÈTE
      sSig: o.forward, // SPHÈRE
      dSig: o.down, // MINE
      rec: o.upAir,
      gp: GP({ pose: 'castDown', dmg: 9, kb: 300, ks: 6.5, dive: 720, fx: { rune: true } }),
    };
    CHARS.astra.help = ['LEGER      ORBE', 'LOURD+HAUT COMETE', 'LOURD      SPHERE', 'LOURD+BAS  MINE', 'AIR LOURD  ETOILE'];
  }
  // ---------------- GROM ----------------
  {
    const o = O.grom;
    K.grom = {
      sLight: light(o.neutral, { dmg: 6, combo: 240, kb: 60, ks: 0.8 }), // CLAQUE (garde l'adversaire près, pour le SUPLEX)
      uLight: U({ pose: 'up', fx: { dust: true } }),
      dLight: D({ pose: 'slam', fx: { dust: true } }),
      sAir: Object.assign({}, o.back, { total: 720, proj: Object.assign({}, o.back.proj, { stun: 280 }) }), // GRAPPIN (en l'air, ramène au bord)
      uAir: UA(o.nAir),
      dAir: light(o.fwdAir), // PLAQUAGE
      uSig: o.up, // BÉLIER
      sSig: Object.assign({}, o.forward, { throw: Object.assign({}, o.forward.throw, { dmg: 11, kb: 360 }) }), // SUPLEX
      dSig: o.down, // SÉISME
      rec: o.upAir,
      gp: o.downAir,
    };
    CHARS.grom.help = ['AIR LEGER  GRAPPIN', 'LOURD+HAUT BELIER', 'LOURD      SUPLEX', 'LOURD+BAS  SEISME', 'AIR LRD+BAS PIETINE'];
  }
  // ---------------- DEADLULU ----------------
  {
    const o = O.deadlulu;
    K.deadlulu = {
      sLight: o.neutral, // PASTIS
      uLight: U({ pose: 'guitar', w: 96, oy: -46, fx: { cres: 'cres_wood', s: 3, ang: -70, notes: true } }), // GUITARE vers le haut
      dLight: D({ pose: 'rkick', fx: { cres: 'cres_wood', s: 3, ang: 15 } }),
      sAir: light(o.fwdAir),
      uAir: UA(o.nAir),
      dAir: DA({ pose: 'plunge', fx: { cres: 'cres_wood', s: 3, ang: 90 } }),
      uSig: o.down, // CODE PÉNAL (il pointe le ciel)
      sSig: o.forward, // GUITARE+
      dSig: o.back, // OBJECTION !
      rec: o.upAir, // JAMBE FEU
      gp: o.downAir, // PLONGEON
    };
    CHARS.deadlulu.help = ['LEGER      PASTIS', 'LOURD+HAUT CODE PENAL', 'LOURD      GUITARE+', 'LOURD+BAS  OBJECTION !', 'AIR LOURD  JAMBE FEU'];
  }
  // ---------------- DENODOOM ----------------
  {
    const o = O.denodoom;
    K.denodoom = {
      sLight: o.neutral, // PISTOLETS
      uLight: U({ pose: 'saber', w: 96, fx: { cres: 'cres_steel', s: 3, ang: -80 } }), // SABRE vers le haut
      dLight: D({ pose: 'pointDown', fx: { dust: true } }),
      sAir: light(o.fwdAir),
      uAir: UA(o.nAir),
      dAir: DA({ pose: 'plungePan', fx: { flames: 3 } }),
      uSig: o.up, // AIGLE
      sSig: o.back, // HANDBALL (LOURD tenu = charge)
      dSig: o.down, // HERMINE
      rec: o.upAir,
      gp: o.downAir, // POÊLE
    };
    CHARS.denodoom.help = ['LEGER      PISTOLETS', 'LOURD+HAUT AIGLE', 'LOURD      HANDBALL', 'LOURD+BAS  HERMINE', 'AIR LRD+BAS POELE'];
  }
  // ---------------- NINI ----------------
  {
    const o = O.nini;
    K.nini = {
      sLight: light(o.neutral), // GRIFFES (Scarlett)
      uLight: UA(o.nAir, { pose: 'castUp', combo: 260, pop: 480 }), // PÉTALES au-dessus d'elle
      dLight: D({ pose: 'castUp', w: 96, h: 64, ox: 40, oy: 10, dmg: 6, pop: 580, fx: { peony: true } }), // petite PIVOINE au sol
      sAir: o.back, // COUP DE FOUDRE (en l'air : ralentit)
      uAir: light(o.bAir, { retreat: 0, oy: -50, h: 100, ox: 20, ang: -1.4, kb: 300, dmg: 6, fx: { wind: 'up' } }), // BOURRASQUE vers le haut
      dAir: DA({ pose: 'claw', fx: { cres: 'cres_pink', s: 3, ang: 70 } }),
      uSig: o.up, // PIVOINE
      sSig: o.forward, // BOND DU CHAT
      dSig: o.down, // CORGI
      rec: o.upAir, // AUTANT EN EMPORTE LE VENT
      gp: o.downAir, // VALISE
    };
    CHARS.nini.help = ['AIR LEGER  COUP DE FOUDRE', 'LOURD+HAUT PIVOINE', 'LOURD      BOND DU CHAT', 'LOURD+BAS  CORGI', 'AIR LRD+BAS VALISE', 'PASSIF     COLERE'];
  }
  // ---------------- ADIEULESCURE ----------------
  {
    const o = O.adieulescure;
    K.adieulescure = {
      sLight: light(o.neutral), // PASSE + TÊTE
      uLight: Object.assign({}, o.back, { light: true }), // CONTRÔLE de la poitrine
      dLight: D({ pose: 'volley', w: 92, h: 36, ox: 52, oy: 22, dmg: 6, lunge: 300, fx: { dust: true, ghosts: 1 } }), // TACLE qui fait décoller
      sAir: L({ pose: 'volley', startup: 90, active: 110, total: 420, w: 96, h: 46, ox: 60, oy: 8, dmg: 10, kb: 340, ks: 8, ang: -0.45, stun: 200, combo: 0, fx: { donkey: true, ghosts: 2 } }), // RUADE
      uAir: UA(o.nAir, { dmg: 8, kb: 260 }), // VIOLON
      dAir: Object.assign({}, o.fwdAir, { proj: Object.assign({}, o.fwdAir.proj, { vx: 260, vy: 420, ox: 12, oy: 24 }) }), // TOMATE vers le bas
      uSig: o.up, // IPA
      sSig: Object.assign({}, o.forward, { dmg: 12, kb: 340, ks: 8.6 }), // ÉCHAPPÉE
      dSig: o.down, // CTRL+Z
      rec: o.upAir, // ÉPERONS
      gp: GP({ pose: 'kick', fx: { dust: true, ghosts: 2 } }), // CRAMPONS
    };
    CHARS.adieulescure.help = ['LEGER+HAUT CONTROLE', 'LOURD+HAUT IPA', 'LOURD      ECHAPPEE', 'LOURD+BAS  CTRL+Z', 'AIR LRD+BAS CRAMPONS'];
  }

  const LIGHTS = ['sLight', 'uLight', 'dLight', 'sAir', 'uAir', 'dAir'];
  for (const id of Object.keys(K)) {
    for (const k of LIGHTS) if (K[id][k]) K[id][k] = Object.assign({}, K[id][k], { light: true });
    CHARS[id].moves = K[id];
    CHARS[id].jumps = 3; // un saut au sol + deux en l'air
    CHARS[id].speed = Math.round(CHARS[id].speed * 1.12);
    CHARS[id].jump = Math.round(CHARS[id].jump * 1.06);
  }
})();
