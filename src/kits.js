// ===========================================================================
// COMMANDES « À LA BRAWLHALLA » : deux boutons d'attaque.
//  - LÉGER : coups rapides qui s'enchaînent (nLight / sLight / dLight au sol, nAir / sAir / dAir en l'air)
//  - LOURD : les gros coups signature (nSig / sSig / dSig au sol) ; en l'air : coup de retour (rec, une fois par saut)
//    ou piqué (gp, LOURD + bas)
// Plus de coup « arrière » : pousser le joystick d'un côté fait se tourner et frapper de ce côté.
// Options des coups légers : combo (avantage garanti en ms après le coup, pour enchaîner), pop (petit envol vertical
// garanti, pour relancer en l'air : léger bas -> saut -> léger en l'air).
// Ce fichier reprend les coups existants de chaque perso et ajoute les coups légers qui manquaient.
// ===========================================================================
(() => {
  const L = (o) => Object.assign({ type: 'melee', startup: 70, active: 100, total: 300, ox: 54, oy: -4, w: 82, h: 52, dmg: 6, kb: 150, ks: 2.6, ang: -0.35, stun: 170, combo: 130 }, o);
  // léger bas : lance l'adversaire un peu en l'air, pour enchaîner en l'air
  const D = (o) => L(Object.assign({ startup: 70, active: 100, total: 330, w: 96, h: 34, ox: 50, oy: 24, dmg: 5, kb: 110, ks: 1.4, ang: -1.38, stun: 220, pop: 560, combo: 330 }, o));
  // léger en l'air vers le bas : petit coup qui pique (sans plongeon)
  const DA = (o) => L(Object.assign({ startup: 70, active: 120, total: 360, w: 62, h: 62, ox: 10, oy: 44, dmg: 6, kb: 210, ks: 4, ang: 1.2, stun: 170, combo: 120 }, o));
  const light = (m, extra) => Object.assign({}, m, { combo: m.combo || 120 }, extra || {});
  const K = {};
  const O = {};
  for (const id of Object.keys(CHARS)) O[id] = CHARS[id].moves;

  // ---------------- TORO ----------------
  {
    const o = O.toro;
    K.toro = {
      nLight: light(o.neutral),
      sLight: L({ pose: 'rkick', w: 92, h: 40, ox: 60, oy: 6, lunge: 260, fx: { cres: 'cres_fire', s: 3, ang: -10, ghosts: 1 } }),
      dLight: D({ pose: 'sweep', fx: { cres: 'cres_fire', s: 3.4, ang: 18, dust: true } }),
      nAir: light(o.nAir),
      sAir: light(o.fwdAir),
      dAir: DA({ pose: 'stomp', fx: { cres: 'cres_fire', s: 3, ang: 90 } }),
      nSig: o.up,
      sSig: o.forward,
      dSig: Object.assign({}, o.down, { startup: 150, active: 130, total: 560, dmg: 11, kb: 330, ks: 8, ang: -0.5, stun: 220, fx: { cres: 'cres_fire', s: 4.6, ang: 18, flames: 8, dust: true } }),
      rec: o.upAir,
      gp: o.downAir,
    };
    CHARS.toro.help = ['LOURD     DRAGON', 'LOURD+COTE POING FEU', 'LOURD+BAS BALAYAGE', 'AIR LOURD FUSEE', 'AIR LOURD+BAS PIETINE'];
  }
  // ---------------- ASTRA ----------------
  {
    const o = O.astra;
    K.astra = {
      nLight: o.neutral,
      sLight: L({ pose: 'cast', lunge: 200, fx: { rune: true } }),
      dLight: D({ pose: 'castDown', fx: { rune: true } }),
      nAir: light(o.nAir),
      sAir: Object.assign({}, o.neutral, { total: 360 }),
      dAir: o.downAir,
      nSig: o.up,
      sSig: o.forward,
      dSig: o.down,
      rec: o.upAir,
      gp: { type: 'melee', pose: 'castDown', startup: 80, active: 220, total: 560, w: 64, h: 70, ox: 8, oy: 50, dmg: 9, kb: 300, ks: 6.5, ang: 1.15, stun: 200, dive: 720, fx: { rune: true } },
    };
    CHARS.astra.help = ['LEGER     ORBE', 'LOURD     COMETE', 'LOURD+COTE SPHERE', 'LOURD+BAS MINE', 'AIR LOURD ETOILE'];
  }
  // ---------------- GROM ----------------
  {
    const o = O.grom;
    K.grom = {
      nLight: light(o.neutral, { dmg: 6 }),
      sLight: Object.assign({}, o.back, { total: 720, proj: Object.assign({}, o.back.proj, { stun: 280 }) }), // GRAPPIN
      dLight: D({ pose: 'slam', fx: { dust: true } }),
      nAir: light(o.nAir),
      sAir: o.back, // le grappin marche aussi en l'air (et ramène au bord)
      dAir: light(o.fwdAir),
      nSig: o.up,
      sSig: Object.assign({}, o.forward, { throw: Object.assign({}, o.forward.throw, { dmg: 11, kb: 360 }) }), // SUPLEX
      dSig: o.down, // SÉISME
      rec: o.upAir,
      gp: o.downAir,
    };
    CHARS.grom.help = ['LEGER+COTE GRAPPIN', 'LOURD     BELIER', 'LOURD+COTE SUPLEX', 'LOURD+BAS SEISME', 'AIR LOURD+BAS PLAQUAGE'];
  }
  // ---------------- DEADLULU ----------------
  {
    const o = O.deadlulu;
    K.deadlulu = {
      nLight: o.neutral, // PASTIS
      sLight: L({ pose: 'guitar', active: 110, w: 72, h: 52, oy: -4, dmg: 6, kb: 160, lunge: 180, fx: { cres: 'cres_wood', s: 2.8, ang: 0, notes: true } }),
      dLight: D({ pose: 'rkick', fx: { cres: 'cres_wood', s: 3, ang: 15 } }),
      nAir: light(o.nAir),
      sAir: light(o.fwdAir),
      dAir: DA({ pose: 'plunge', fx: { cres: 'cres_wood', s: 3, ang: 90 } }),
      nSig: o.back, // OBJECTION !
      sSig: o.forward, // GUITARE+
      dSig: o.down, // CODE PÉNAL
      rec: o.upAir, // JAMBE FEU
      gp: o.downAir,
    };
    CHARS.deadlulu.help = ['LEGER     PASTIS', 'LOURD     OBJECTION !', 'LOURD+COTE GUITARE+', 'LOURD+BAS CODE PENAL', 'AIR LOURD JAMBE FEU'];
  }
  // ---------------- DENODOOM ----------------
  {
    const o = O.denodoom;
    K.denodoom = {
      nLight: o.neutral, // PISTOLETS
      sLight: light(o.forward, { dmg: 6, kb: 200, ks: 3 }), // SABRE
      dLight: D({ pose: 'pointDown', fx: { dust: true } }),
      nAir: light(o.nAir),
      sAir: light(o.fwdAir),
      dAir: DA({ pose: 'plungePan', fx: { flames: 3 } }),
      nSig: o.up, // AIGLE
      sSig: o.back, // HANDBALL (LOURD tenu = charge)
      dSig: o.down, // HERMINE
      rec: o.upAir,
      gp: o.downAir, // POÊLE
    };
    CHARS.denodoom.help = ['LEGER     PISTOLETS', 'LOURD     AIGLE', 'LOURD+COTE HANDBALL', 'LOURD+BAS HERMINE', 'AIR LOURD+BAS POELE'];
  }
  // ---------------- NINI ----------------
  {
    const o = O.nini;
    K.nini = {
      nLight: light(o.neutral), // GRIFFES
      sLight: L({ pose: 'claw', w: 84, h: 58, ox: 58, oy: -6, dmg: 7, kb: 170, lunge: 240, fx: { cres: 'cres_pink', s: 3, ang: 0 } }),
      dLight: D({ pose: 'castUp', w: 96, h: 64, ox: 40, oy: 10, dmg: 6, pop: 580, fx: { peony: true } }), // PIVOINE qui éclot au sol
      nAir: light(o.nAir), // PÉTALES
      sAir: light(o.bAir, { dmg: 6, kb: 480 }), // BOURRASQUE
      dAir: DA({ pose: 'claw', fx: { cres: 'cres_pink', s: 3, ang: 70 } }),
      nSig: o.back, // COUP DE FOUDRE
      sSig: o.forward, // BOND DU CHAT
      dSig: o.down, // CORGI
      rec: o.upAir, // AUTANT EN EMPORTE LE VENT
      gp: o.downAir, // VALISE
    };
    CHARS.nini.help = ['LEGER+BAS PIVOINE', 'LOURD     COUP DE FOUDRE', 'LOURD+COTE BOND DU CHAT', 'LOURD+BAS CORGI', 'AIR LOURD+BAS VALISE', 'PASSIF    COLERE'];
  }
  // ---------------- ADIEULESCURE ----------------
  {
    const o = O.adieulescure;
    K.adieulescure = {
      nLight: light(o.neutral), // PASSE + TÊTE
      sLight: L({ pose: 'volley', w: 92, h: 36, ox: 52, oy: 22, dmg: 7, kb: 170, lunge: 340, fx: { dust: true, ghosts: 1 } }), // TACLE
      dLight: D({ pose: 'drink', w: 80, h: 80, ox: 20, oy: -20, pop: 580, fx: { foam: true } }), // IPA : la mousse soulève
      nAir: light(o.nAir, { dmg: 8, kb: 260 }), // VIOLON
      sAir: L({ pose: 'volley', startup: 90, active: 110, total: 420, w: 96, h: 46, ox: 60, oy: 8, dmg: 10, kb: 340, ks: 8, ang: -0.45, stun: 200, combo: 0, fx: { donkey: true, ghosts: 2 } }), // RUADE
      dAir: Object.assign({}, o.fwdAir, { proj: Object.assign({}, o.fwdAir.proj, { vx: 260, vy: 420, ox: 12, oy: 24 }) }), // TOMATE vers le bas
      nSig: o.back, // CONTRÔLE
      sSig: Object.assign({}, o.forward, { dmg: 12, kb: 340, ks: 8.6 }), // ÉCHAPPÉE
      dSig: o.down, // CTRL+Z
      rec: o.upAir, // ÉPERONS
      gp: o.downAir, // CTRL+Z en l'air
    };
    CHARS.adieulescure.help = ['LEGER+BAS IPA', 'LOURD     CONTROLE', 'LOURD+COTE ECHAPPEE', 'LOURD+BAS CTRL+Z', 'AIR LEGER RUADE/TOMATE'];
  }

  for (const id of Object.keys(K)) {
    CHARS[id].moves = K[id];
    CHARS[id].jumps = 3; // un saut au sol + deux en l'air
    CHARS[id].speed = Math.round(CHARS[id].speed * 1.12);
    CHARS[id].jump = Math.round(CHARS[id].jump * 1.06);
  }
})();
