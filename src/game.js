// ===========================================================================
// BRAWL PROTO v3 — 3 combattants, effets pixel art, projectiles et prises
// Le jeu ne lit que des "inputs" par joueur : { sx, sy, jump, attack }
// (sx, sy = joystick de -1 à 1). En ligne, ces inputs partiront au serveur.
// ===========================================================================
const FONT = '"BrawlPixel", "Press Start 2P", monospace';
const PX = 4; // 1 pixel d'art = 4 pixels logiques

// --- Simulation déterministe : pas de temps fixe + maths identiques sur tous les appareils
const STEP_MS = 1000 / 60;
const TWO_PI = 6.283185307179586;
function dsin(x) {
  x -= TWO_PI * Math.floor((x + Math.PI) / TWO_PI);
  const x2 = x * x;
  let r = 1;
  for (let k = 10; k >= 1; k--) r = 1 - ((x2 / ((2 * k) * (2 * k + 1))) * r);
  return x * r;
}
function dcos(x) { return dsin(x + 1.5707963267948966); }
function hyp(a, b) { return Math.sqrt(a * a + b * b); }

const GRAVITY = 1700;
const FAST_FALL = 1050;
const STOCKS = 3;
const STICK_R = 90;
// commandes tactiles déplaçables (réglages > PLACER LES BOUTONS) et leur rayon de base
const CTRL_KEYS = ['stick', 'attack', 'special', 'jump', 'block'];
const CTRL_R = { stick: 88, attack: 80, special: 68, jump: 62, block: 56 };

const OUT = '#14121c';
const BOOT = '#2b2740';

// ---------------------------------------------------------------------------
// Les combattants
// Orientation du joystick RELATIVE à l'ennemi : avant = vers lui, arrière = en s'éloignant.
// Types de coups : melee | proj (projectile) | grab (prise) | charge | recover | heal | float | book | counter | carry
// Clés : neutral forward up down back (au sol) ; nAir fwdAir bAir upAir downAir (en l'air, sinon on retombe sur le coup au sol)
// Options : rise/riseX (fait monter), helpless (chute impuissante après un coup de retour en l'air), armor (encaisse sans
// être interrompu pendant le démarrage), inv (invincible au départ), chain (enchaînement en rappuyant), dash (élan aérien,
// une fois par saut), onceAir (une fois par temps en l'air), groundOnly (ne touche que les adversaires au sol), max (objets
// à l'écran), cd (recharge en ms), backFire (tir vers l'arrière)
// ---------------------------------------------------------------------------
const PISTOLS = { type: 'proj', pose: 'shoot', startup: 80, total: 340, double: 120, fx: { guns: true },
  proj: { kind: 'bullet', tex: 'bullet', s: 3, vx: 1500, life: 175, w: 26, h: 16, ox: 46, oy: -10, dmg: 5, kb: 190, ks: 3.5, ang: -0.2, stun: 110, small: true } };
const SABER = { type: 'melee', pose: 'saber', startup: 100, active: 110, total: 390, w: 92, h: 60, ox: 58, oy: -6, dmg: 7, kb: 270, ks: 6, ang: -0.45, stun: 170, lunge: 220,
  fx: { cres: 'cres_steel', s: 3.6, ang: -8, ghosts: 2 } };
const NINI_C2 = { type: 'melee', pose: 'claw', startup: 60, active: 110, total: 340, w: 80, h: 58, ox: 56, oy: -8, dmg: 6, kb: 260, ks: 6, ang: -0.5, stun: 180, fx: { cres: 'cres_pink', s: 3.2, ang: -30 } };
const TORO_J2 = { type: 'melee', pose: 'jab', startup: 50, active: 80, total: 230, w: 66, h: 48, ox: 52, oy: -4, dmg: 3, kb: 110, ks: 1.2, ang: -0.15, stun: 150, fx: { cres: 'cres_white', s: 2.4, ang: 0 } };
const TORO_J3 = { type: 'melee', pose: 'heavy', startup: 70, active: 110, total: 420, w: 80, h: 60, ox: 56, oy: -8, dmg: 4, kb: 300, ks: 5.5, ang: -0.6, stun: 200, lunge: 120, fx: { cres: 'cres_fire', s: 3.6, ang: -20, flames: 5 } };

const CHARS = {
  toro: {
    id: 'toro', name: 'TORO', role: 'CORPS A CORPS', roleCol: '#ff9f43',
    speed: 315, jump: 650, weight: 1.0, jumps: 2,
    pal: { main: '#e63946', dark: '#8c1c26', skin: '#f1c27d', skin2: '#c9955a', hair: '#2b1b17', accent: '#ffb703', glove: '#ffffff' },
    fx: { main: 0xff7b00, alt: 0xffd166, core: 0xfff3b0, cres: 'cres_fire' },
    help: ['NEUTRE  JAB x3', 'AVANT   POING FEU', 'HAUT    DRAGON', 'BAS     BALAYAGE', 'ARRIÈRE COUP PIED', 'AIR     TOUPIE/FUSÉE'],
    moves: {
      neutral: { type: 'melee', pose: 'jab', startup: 50, active: 80, total: 230, w: 66, h: 48, ox: 52, oy: -4, dmg: 3, kb: 110, ks: 1.2, ang: -0.15, stun: 150, chain: [TORO_J2, TORO_J3], fx: { cres: 'cres_white', s: 2.6, ang: 0 } },
      forward: { type: 'melee', pose: 'heavy', startup: 170, active: 120, total: 650, w: 88, h: 56, ox: 64, oy: -2, dmg: 12, kb: 340, ks: 9, ang: -0.3, stun: 220, lunge: 280, armor: 6, fx: { cres: 'cres_fire', s: 4.4, ang: 0, flames: 7, ghosts: 3 } },
      up: { type: 'melee', pose: 'up', startup: 70, active: 220, total: 520, w: 70, h: 100, ox: 24, oy: -50, dmg: 10, kb: 320, ks: 8, ang: -1.35, stun: 200, rise: 480, inv: 50, fx: { cres: 'cres_fire', s: 4.4, ang: -90, flames: 9, pillar: true } },
      upAir: { type: 'melee', pose: 'up', startup: 60, active: 260, total: 520, w: 70, h: 100, ox: 24, oy: -50, dmg: 9, kb: 300, ks: 7, ang: -1.35, stun: 200, rise: 812, riseX: 90, inv: 50, helpless: true, fx: { cres: 'cres_fire', s: 4.4, ang: -90, flames: 9, pillar: true } },
      down: { type: 'melee', pose: 'sweep', startup: 110, active: 130, total: 480, w: 100, h: 32, ox: 62, oy: 26, dmg: 6, kb: 160, ks: 3.5, ang: -0.25, stun: 190, fx: { cres: 'cres_fire', s: 4.2, ang: 18, flames: 5, dust: true } },
      downAir: { type: 'melee', pose: 'stomp', startup: 80, active: 170, total: 470, w: 58, h: 66, ox: 10, oy: 48, dmg: 9, kb: 300, ks: 6.5, ang: 1.2, stun: 190, dive: 620, fx: { cres: 'cres_fire', s: 3.6, ang: 90, flames: 6, ghosts: 3 } },
      back: { type: 'melee', pose: 'rkick', startup: 120, active: 120, total: 520, w: 108, h: 38, ox: 72, oy: 6, dmg: 9, kb: 300, ks: 7, ang: -0.5, stun: 200, retreat: 230, fx: { cres: 'cres_fire', s: 4.4, ang: -10, flames: 6, ghosts: 3 } },
      nAir: { type: 'melee', pose: 'rkick', startup: 60, active: 160, total: 380, w: 110, h: 90, ox: 0, oy: 0, dmg: 7, kb: 220, ks: 5, ang: -0.75, stun: 170, fx: { flames: 6 } },
      fwdAir: { type: 'melee', pose: 'heavy', startup: 80, active: 200, total: 480, w: 80, h: 52, ox: 50, oy: 0, dmg: 8, kb: 280, ks: 6.5, ang: -0.35, stun: 190, dash: 620, fx: { cres: 'cres_fire', s: 3.8, ang: 0, flames: 6, ghosts: 3 } },
      bAir: { type: 'melee', pose: 'rkick', startup: 90, active: 100, total: 400, retreat: 260, w: 90, h: 40, ox: 60, oy: 6, dmg: 10, kb: 300, ks: 7.5, ang: -0.45, stun: 200, fx: { flames: 4, ghosts: 2 } },
    },
  },
  astra: {
    id: 'astra', name: 'ASTRA', role: 'DISTANCE', roleCol: '#b79cff',
    speed: 325, jump: 660, weight: 0.95, jumps: 2,
    pal: { main: '#7a5cff', dark: '#3b2a8c', skin: '#e8c8a9', skin2: '#b99a7c', hair: '#1a1030', accent: '#ffd166', glove: '#7df9ff', eye: '#7df9ff' },
    fx: { main: 0x7a5cff, alt: 0x7df9ff, core: 0xffffff, cres: 'cres_arc' },
    help: ['NEUTRE  ORBE', 'AVANT   SPHÈRE', 'HAUT    COMÈTE', 'BAS     MINE', 'ARRIÈRE SAUT+TIR', 'AIR     ÉCLAT RUNE'],
    moves: {
      neutral: { type: 'proj', pose: 'cast', startup: 60, total: 320, max: 2, fx: { rune: true }, proj: { kind: 'orb', tex: 'orb_s', s: 3, vx: 950, life: 650, w: 24, h: 24, ox: 50, oy: -8, dmg: 8, kb: 230, ks: 5.2, ang: -0.25, stun: 130, trail: 0x7df9ff, small: true } },
      forward: { type: 'proj', pose: 'castBig', startup: 160, total: 660, fx: { rune: true, big: true }, proj: { kind: 'orb', tex: 'orb_l', s: 4, vx: 660, life: 1200, w: 54, h: 54, ox: 56, oy: -6, dmg: 13, kb: 330, ks: 8.5, ang: -0.3, stun: 230, trail: 0x7a5cff, explode: true } },
      up: { type: 'proj', pose: 'castUp', startup: 110, total: 520, fx: { rune: true }, proj: { kind: 'comet', tex: 'comet', s: 3, vx: 250, vy: -780, grav: 1150, spin: 9, life: 2000, w: 36, h: 36, ox: 20, oy: -50, dmg: 9, kb: 270, ks: 8, ang: -1.1, stun: 200, trail: 0xffd166, small: true } },
      upAir: { type: 'proj', pose: 'castUp', startup: 70, total: 520, rise: 775, riseX: 60, helpless: true, fx: { rune: true }, proj: { kind: 'comet', tex: 'comet', s: 3, vx: 120, vy: -900, grav: 1150, spin: 9, life: 1600, w: 36, h: 36, ox: 10, oy: -50, dmg: 7, kb: 250, ks: 6.5, ang: -1.2, stun: 180, trail: 0xffd166, small: true } },
      down: { type: 'proj', pose: 'castDown', startup: 140, total: 620, max: 1, replace: true, fx: { rune: true }, proj: { kind: 'mine', tex: 'mine', s: 4, vx: 0, life: 6000, arm: 340, w: 60, h: 44, ox: 120, oy: 28, ground: true, dmg: 12, kb: 310, ks: 8, ang: -1.3, stun: 240, explode: true, small: true } },
      downAir: { type: 'proj', pose: 'castDown', startup: 80, total: 420, fx: { rune: true }, proj: { kind: 'orb', tex: 'orb_s', s: 3, vx: 520, vy: 520, life: 800, w: 26, h: 26, ox: 30, oy: 20, dmg: 6, kb: 240, ks: 5.5, ang: 0.9, stun: 150, trail: 0x7df9ff, small: true } },
      back: { type: 'proj', pose: 'cast', startup: 70, total: 460, retreat: 520, hop: 380, fx: { rune: true }, proj: { kind: 'orb', tex: 'orb_s', s: 3, vx: 950, life: 650, w: 24, h: 24, ox: 50, oy: -8, dmg: 6, kb: 230, ks: 5.5, ang: -0.25, stun: 130, trail: 0x7df9ff, small: true } },
      nAir: { type: 'melee', pose: 'cast', startup: 70, active: 120, total: 420, w: 124, h: 110, ox: 0, oy: -4, dmg: 7, kb: 260, ks: 6.5, ang: -0.8, stun: 160, fx: { rune: true, burst: true } },
    },
  },
  grom: {
    id: 'grom', name: 'MÉNÈS', role: 'ATTRAPE', roleCol: '#6ee7b7', cardCol: '#dfe3ee',
    speed: 290, jump: 600, weight: 1.2, jumps: 2,
    pal: { main: '#2e2824', dark: '#1e1e28', skin: '#dca282', skin2: '#a86a4c', hair: '#2e2824', accent: '#3a62b8', glove: '#dca282' },
    fx: { main: 0xd9c3a0, alt: 0xffd166, core: 0xffffff, cres: 'cres_earth' },
    help: ['NEUTRE  CLAQUE', 'AVANT   SUPLEX', 'HAUT    BÉLIER', 'BAS     SÉISME', 'ARRIÈRE MICRO', 'AIR     PLAQUAGE'],
    moves: {
      neutral: { type: 'melee', pose: 'jab', startup: 90, active: 110, total: 320, w: 74, h: 56, ox: 56, oy: -4, dmg: 7, kb: 260, ks: 6, ang: -0.35, stun: 160, fx: { cres: 'cres_earth', s: 3.2, ang: 0, dust: true } },
      forward: { type: 'grab', pose: 'grab', startup: 130, active: 110, total: 800, w: 76, h: 80, ox: 54, oy: -4, fx: { grabFx: true }, throw: { dmg: 13, kb: 380, ks: 9.2, ang: -0.75, stun: 260 } },
      up: { type: 'melee', pose: 'up', startup: 120, active: 130, total: 520, w: 78, h: 96, ox: 22, oy: -54, dmg: 11, kb: 330, ks: 8.5, ang: -1.3, stun: 210, fx: { cres: 'cres_earth', s: 4.6, ang: -90, dust: true } },
      upAir: { type: 'melee', pose: 'up', startup: 80, active: 300, total: 560, w: 78, h: 90, ox: 22, oy: -30, dmg: 9, kb: 300, ks: 7, ang: -1.0, stun: 200, rise: 720, riseX: 360, armor: 8, armorActive: true, helpless: true, fx: { cres: 'cres_earth', s: 4.2, ang: -60, ghosts: 3 } },
      down: { type: 'melee', pose: 'slam', startup: 180, active: 160, total: 660, w: 220, h: 38, ox: 0, oy: 28, dmg: 10, kb: 300, ks: 7, ang: -1.0, stun: 220, groundOnly: true, fx: { shock: true } },
      downAir: { type: 'melee', pose: 'stomp', startup: 70, active: 200, total: 520, w: 64, h: 70, ox: 8, oy: 50, dmg: 11, kb: 320, ks: 7, ang: 1.15, stun: 210, dive: 820, fx: { cres: 'cres_earth', s: 3.8, ang: 90, ghosts: 3 } },
      back: { type: 'proj', pose: 'hook', startup: 110, total: 620, fx: {}, proj: { kind: 'hook', tex: 'hook', s: 4, vx: 1150, life: 400, w: 34, h: 34, ox: 42, oy: -10, dmg: 4, pull: 880, stun: 330 } },
      nAir: { type: 'melee', pose: 'slam', startup: 80, active: 140, total: 440, w: 120, h: 100, ox: 0, oy: 10, dmg: 9, kb: 260, ks: 6, ang: -0.6, stun: 190, fx: { dust: true } },
      fwdAir: { type: 'melee', pose: 'slam', startup: 110, active: 110, total: 500, w: 90, h: 80, ox: 50, oy: 20, dmg: 12, kb: 280, ks: 7, ang: 1.1, stun: 220, fx: { cres: 'cres_earth', s: 4, ang: 60, ghosts: 2 } },
    },
  },
  deadlulu: {
    id: 'deadlulu', name: 'DEAD LULU', role: 'GUITARE + DROIT', roleCol: '#ff6b81',
    speed: 335, jump: 645, weight: 1, jumps: 2,
    shout: 'SUPER COUP FINAL',
    pal: { main: '#8b929d', dark: '#5d6470', skin: '#e9b896', skin2: '#c98f6a', hair: '#33200f', accent: '#3f5fb8', glove: '#e9b896' },
    fx: { main: 0xc9a56a, alt: 0xffd166, core: 0xfff3d6, cres: 'cres_wood' },
    help: ['NEUTRE  GUITARE', 'AVANT   GUITARE+', 'HAUT    JAMBE FEU', 'BAS     CODE PÉNAL', 'ARRIÈRE OBJECTION !', 'AIR     MOULINET'],
    moves: {
      neutral: { type: 'melee', pose: 'guitar', startup: 60, active: 110, total: 270, w: 72, h: 52, ox: 54, oy: -4, dmg: 7, kb: 245, ks: 5.5, ang: -0.35, stun: 160, fx: { cres: 'cres_wood', s: 2.8, ang: 0, notes: true } },
      forward: { type: 'melee', pose: 'guitarBig', startup: 170, active: 130, total: 560, w: 96, h: 80, ox: 58, oy: -14, dmg: 12, kb: 340, ks: 9, ang: -0.55, stun: 230, lunge: 200, fx: { cres: 'cres_wood', s: 4.6, ang: -30, notes: true, ghosts: 2 } },
      up: { type: 'melee', pose: 'kickUp', prePose: 'kickUpPre', startup: 90, active: 140, total: 470, w: 62, h: 104, ox: 24, oy: -56, dmg: 11, kb: 330, ks: 8.5, ang: -1.35, stun: 210, fx: { cres: 'cres_fire', s: 4.8, ang: -90, flames: 11, pillar: true, ghosts: 2, transform: true } },
      upAir: { type: 'melee', pose: 'kickUp', prePose: 'kickUpPre', startup: 70, active: 200, total: 500, w: 62, h: 104, ox: 24, oy: -56, dmg: 10, kb: 310, ks: 8, ang: -1.35, stun: 200, rise: 670, riseX: 70, helpless: true, fx: { cres: 'cres_fire', s: 4.8, ang: -90, flames: 11, pillar: true, ghosts: 2, transform: true } },
      down: { type: 'book', pose: 'summon', startup: 110, total: 500, cd: 2500, dist: 250, warn: 500,
        book: { kind: 'book', tex: 'book', s: 1.0, vx: 0, vy: 700, grav: 1500, life: 1100, w: 120, h: 110, ox: 0, oy: -420, dmg: 10, kb: 310, ks: 7.5, ang: -1.15, stun: 240, explode: true } },
      downAir: { type: 'melee', pose: 'plunge', startup: 80, active: 220, total: 600, w: 66, h: 74, ox: 8, oy: 50, dmg: 10, kb: 320, ks: 7, ang: 1.15, stun: 210, dive: 800, fx: { cres: 'cres_wood', s: 3.8, ang: 90, ghosts: 3 } },
      back: { type: 'counter', pose: 'guitar', startup: 50, window: 300, total: 650, mul: 1.2, fx: {} },
      nAir: { type: 'melee', pose: 'guitar', startup: 70, active: 150, total: 400, w: 110, h: 90, ox: 0, oy: -6, dmg: 8, kb: 240, ks: 6, ang: -0.7, stun: 180, fx: { notes: true } },
      fwdAir: { type: 'melee', pose: 'guitarBig', startup: 100, active: 110, total: 460, w: 90, h: 70, ox: 54, oy: -6, dmg: 10, kb: 290, ks: 7, ang: -0.4, stun: 200, fx: { cres: 'cres_wood', s: 3.8, ang: -20, notes: true } },
      bAir: { type: 'melee', pose: 'rkick', startup: 90, active: 110, total: 420, retreat: 260, w: 96, h: 40, ox: 64, oy: 6, dmg: 10, kb: 300, ks: 7.5, ang: -0.5, stun: 200, fx: { ghosts: 2 } },
    },
  },
  denodoom: {
    id: 'denodoom', name: 'DENODOOM', role: 'PISTOLETS + AIGLE', roleCol: '#ff5a6e', cardCol: '#e70013',
    speed: 315, jump: 640, weight: 0.95, jumps: 2,
    pal: { main: '#2e2e3c', dark: '#16161e', skin: '#c18a60', skin2: '#9a6a46', hair: '#15110f', accent: '#d9a82b', glove: '#c18a60' },
    fx: { main: 0xe70013, alt: 0xffe27a, core: 0xffffff, cres: 'cres_steel' },
    help: ['NEUTRE  PISTOLETS', 'AVANT   SABRE', 'HAUT    AIGLE', 'BAS     HERMINE', 'AIR+BAS POÊLE', 'ARRIÈRE HANDBALL', 'AIR     SABRE/TIR'],
    moves: {
      neutral: PISTOLS,
      forward: SABER,
      up: {
        type: 'proj', pose: 'summon', startup: 170, total: 780, fx: { eagleFx: true },
        proj: { kind: 'eagle', tex: 'eagle0', s: 3.2, speed: 700, life: 620, w: 84, h: 56, ox: 18, oy: -44, carryMs: 620,
          throw: { dmg: 9, kb: 320, ks: 7, ang: -1.25, stun: 260 } },
      },
      upAir: { type: 'carry', pose: 'summon', startup: 60, total: 640, carryMs: 300, carrySpeed: 560, riseX: 200, helpless: true, fx: {} },
      down: {
        type: 'proj', pose: 'pointDown', startup: 190, total: 700, max: 1, replace: true, fx: {},
        proj: { kind: 'hermine', tex: 'hermine', s: 4, vx: 0, life: 1150, act: 1000, w: 78, h: 150, ox: 130, oy: 0, bottom: true, dmg: 8, kb: 340, ks: 8.5, ang: -1.5, stun: 240 },
      },
      downAir: { type: 'melee', pose: 'plungePan', startup: 80, active: 220, total: 600, w: 72, h: 80, ox: 8, oy: 50, dmg: 9, kb: 310, ks: 6.5, ang: 1.15, stun: 220, dive: 800, fx: { cres: 'cres_fire', s: 3.8, ang: 90, flames: 8, ghosts: 3 } },
      back: {
        type: 'charge', pose: 'charge', chargeMs: 900, walk: 0.4, fx: {},
        ball: { kind: 'ball', tex: 'hball', s: 3, w: 34, h: 34, ang: -0.3, stun: 180 },
      },
      nAir: { type: 'melee', pose: 'plungePan', startup: 70, active: 150, total: 420, w: 110, h: 90, ox: 0, oy: 0, dmg: 7, kb: 240, ks: 5.5, ang: -0.7, stun: 170, fx: { flames: 4 } },
      fwdAir: { type: 'melee', pose: 'saber', startup: 90, active: 110, total: 430, w: 92, h: 60, ox: 58, oy: -6, dmg: 9, kb: 290, ks: 7, ang: -0.4, stun: 190, fx: { cres: 'cres_steel', s: 3.6, ang: -8, ghosts: 2 } },
      bAir: { type: 'proj', pose: 'shoot', startup: 70, total: 360, retreat: 300, fx: { guns: true },
        proj: { kind: 'bullet', tex: 'bullet', s: 3, vx: 1500, life: 175, w: 26, h: 16, ox: 46, oy: -10, dmg: 5, kb: 220, ks: 4.5, ang: -0.25, stun: 130, small: true } },
    },
  },
  nini: {
    id: 'nini', name: 'NINI', role: 'CHAT + CORGI', roleCol: '#ffa8cf', cardCol: '#ff7eb6',
    speed: 320, jump: 650, weight: 1.0, jumps: 2,
    pal: { main: '#f4f0e8', dark: '#6f93c9', skin: '#d9a077', skin2: '#b57c55', hair: '#3a2216', accent: '#6b7a2e', glove: '#d9a077' },
    fx: { main: 0xff7eb6, alt: 0xffd1e6, core: 0xffffff, cres: 'cres_pink' },
    help: ['NEUTRE  GRIFFES', 'AVANT   BOND DU CHAT', 'HAUT    PIVOINE', 'BAS     CORGI', 'ARRIÈRE COUP DE FOUDRE', 'AIR     VENT / VALISE', 'PASSIF  COLÈRE'],
    // Nini ne frappe jamais elle-même : c'est Scarlett (le chat sur ses épaules), le corgi, l'amour, les fleurs, le vent
    moves: {
      // GRIFFES : Scarlett griffe deux fois depuis l'épaule
      neutral: { type: 'melee', pose: 'claw', startup: 60, active: 90, total: 240, w: 76, h: 54, ox: 54, oy: -6, dmg: 4, kb: 120, ks: 1.5, ang: -0.2, stun: 150, chain: [NINI_C2], fx: { cres: 'cres_pink', s: 2.4, ang: 0 } },
      // BOND DU CHAT : Scarlett saute des épaules et retombe sur l'adversaire (gros coup)
      forward: { type: 'melee', pose: 'pounce', cat: true, startup: 180, active: 120, total: 680, w: 84, h: 64, ox: 78, oy: -12, dmg: 9, kb: 320, ks: 7.6, ang: -0.55, stun: 230, fx: { cres: 'cres_pink', s: 4.2, ang: -20 } },
      // PIVOINE : une pivoine éclot au-dessus de sa tête
      up: { type: 'melee', pose: 'castUp', startup: 130, active: 140, total: 500, w: 110, h: 100, ox: 6, oy: -84, dmg: 9, kb: 320, ks: 8.4, ang: -1.45, stun: 220, fx: { peony: true } },
      // AUTANT EN EMPORTE LE VENT : une bourrasque l'emporte vers le haut (coup de retour)
      upAir: { type: 'melee', pose: 'float', startup: 60, active: 260, total: 560, w: 90, h: 100, ox: 6, oy: -40, dmg: 6, kb: 260, ks: 6, ang: -1.4, stun: 180, rise: 860, riseX: 160, helpless: true, fx: { wind: 'up' } },
      // CORGI : le corgi déboule de derrière elle et fonce au sol (recharge 4 s)
      down: { type: 'proj', pose: 'call', startup: 160, total: 520, max: 1, cd: 4000, cdKey: 'corgi', fx: {},
        proj: { kind: 'corgi', tex: 'corgi0', s: 4, vx: 860, life: 5000, w: 70, h: 44, ox: -30, oy: 0, dmg: 10, kb: 310, ks: 7.5, ang: -0.6, stun: 210 } },
      // VALISE (le voyage) : elle lâche sa valise, qui tombe lourdement ; Nini rebondit un peu
      downAir: { type: 'proj', pose: 'drop', startup: 110, total: 500, hop: 300, cd: 3000, cdKey: 'valise', fx: {},
        proj: { kind: 'suitcase', tex: 'suitcase', s: 3.4, vx: 60, vy: 420, grav: 1600, life: 1500, w: 64, h: 46, ox: 6, oy: 50, dmg: 9, kb: 300, ks: 7, ang: 1.2, stun: 230 } },
      // COUP DE FOUDRE (l'amour) : elle recule et envoie un baiser en coeur qui charme (recharge 5 s)
      back: { type: 'proj', pose: 'ringT', startup: 120, total: 520, retreat: 170, cd: 5000, cdKey: 'charm', fx: {},
        proj: { kind: 'kiss', tex: 'heart', s: 3.6, vx: 560, life: 1200, w: 44, h: 40, ox: 40, oy: -16, dmg: 0, charm: 800, slow: 500, small: true } },
      // BOURRASQUE : le vent repousse l'adversaire pendant qu'elle recule
      bAir: { type: 'melee', pose: 'float', startup: 90, active: 120, total: 440, retreat: 200, w: 130, h: 84, ox: 70, oy: -6, dmg: 4, kb: 540, ks: 3.5, ang: -0.15, stun: 140, fx: { wind: 'side' } },
      // PETALES : un tourbillon de pétales de pivoine autour d'elle
      nAir: { type: 'melee', pose: 'castUp', startup: 60, active: 150, total: 400, w: 108, h: 96, ox: 0, oy: -4, dmg: 6, kb: 220, ks: 5, ang: -0.7, stun: 160, fx: { petals: true } },
      fwdAir: { type: 'melee', pose: 'claw', startup: 80, active: 110, total: 420, w: 80, h: 60, ox: 52, oy: -4, dmg: 8, kb: 270, ks: 6.5, ang: -0.4, stun: 190, fx: { cres: 'cres_pink', s: 3.2, ang: 0 } },
    },
  },

};
const ORDER = ['toro', 'astra', 'grom', 'deadlulu', 'denodoom', 'nini'];
// couleurs d'équipe (salons en ligne « par équipes ») : nom, couleur du texte, 4 tons pour les vêtements
const TEAM_COLS = [
  { name: 'ROUGE', css: '#ff5a5a', ramp: ['#5a0c14', '#b81c2c', '#ec4a4a', '#ff9a8a'] },
  { name: 'BLEU', css: '#5aa8ff', ramp: ['#0c1e5a', '#1e48b8', '#4a86ec', '#a8ccff'] },
  { name: 'VERT', css: '#5ad87a', ramp: ['#0a4a1e', '#1c9a3c', '#4ad06a', '#b0f4b8'] },
  { name: 'JAUNE', css: '#ffd23a', ramp: ['#6a4a00', '#d0a000', '#ffd23a', '#fff2a0'] },
  { name: 'VIOLET', css: '#b88aff', ramp: ['#2e0c5a', '#6a2cc0', '#a070f0', '#d8c0ff'] },
  { name: 'ROSE', css: '#ff7ac8', ramp: ['#6a0c40', '#d02c8a', '#ff70c0', '#ffc8e8'] },
];
// persos mis de côté pour l'instant (le code et les dessins restent, ils ne sont juste plus proposés)
const BENCH = ['astra', 'nini'];
const playable = () => ORDER.filter((id) => !BENCH.includes(id));
const RAGE_MAX = 60, RAGE_MS = 8000;
const RAGE_DMG = 1.3;

// --- Règles du combat (réglées par simulation) ---------------------------------
const KB_BASE = 0.5; // part du recul de base gardée (la croissance avec les % reste entière)
const KB_GROW = 1.15;
const STUN_BASE = 0.7, STUN_GROW = 0.2; // étourdissement : base du coup x 0,7 + recul x 0,2 ms
const DI_MAX = 0.26; // influence directionnelle : jusqu'à 15° de déviation
const BUF_MS = 100; // tampon d'entrée (6 images)
const STUN_ESCAPE = 417; // au bout de 25 images d'étourdissement, on peut esquiver en l'air
const BLAST_X = 740, BLAST_TOP = 640, BLAST_BOTTOM = 420; // zones de KO depuis le centre / le sol
let KO_GRACE = 400; // ms après l'étourdissement pendant lesquelles on peut encore sortir de l'écran (KO)
const WALL_IN = 50; // mur invisible (côtés, haut) à 50 px avant la zone de KO, pour qui n'a pas été projeté
// GROS POURCENTAGES : projeté loin, on dérive moins bien en l'air jusqu'à se reposer (sol ou rebord)
const tumbleFor = (dmg) => Math.max(0, Math.min(TUMBLE_MAX, (dmg - TUMBLE_FROM) / TUMBLE_SPAN));
const TUMBLE_FROM = 50, TUMBLE_SPAN = 150, TUMBLE_MAX = 0.7;
const MATCH_MS = 480000; // chrono de 8 min (pas de mort subite) : à la fin, plus de vies gagne, puis moins de %
// attaque en remontant du rebord
const HELP_TXT = "COUP / SPÉCIAL + JOYSTICK :\nNEUTRE, AVANT, HAUT OU BAS\n\nCOUP = L'ARME DE TON PERSO (SA FAMILLE)\nCOUP SANS DIRECTION x3 = ENCHAÎNEMENT\nUN COUP QUI TOUCHE SE COUPE EN\nUN AUTRE COUP, UNE SPÉCIALE OU UNE ESQUIVE\n\nSPÉCIAL HAUT = REMONTER, EN L'AIR BAS = PLONGEON\nCERTAINES SPÉCIALES SE CHARGENT (GARDER)\nESQUIVE EN L'AIR + ATTAQUE = COUP DU SOL\n\nSAUT x3 - ESQUIVE + CÔTÉ = SPRINT";
const HELP_KB = "CLAVIER : ZQSD OU FLÈCHES, ESPACE = SAUT\nJ = COUP, K = SPÉCIAL, L = ESQUIVE\n(OU X, C ET MAJ) - ÉCHAP = QUITTER";
const LEDGE_ATK = { type: 'melee', pose: 'rkick', startup: 120, active: 100, total: 420, w: 96, h: 50, ox: 50, oy: 0, dmg: 6, kb: 240, ks: 4, ang: -0.4, stun: 170, fx: { dust: true } };

// --- Réglages du joueur (gardés sur le téléphone) ------------------------------
const SETTINGS = Object.assign(
  { sound: true, music: true, vib: true, btnSize: 1, flip: false, timer: true, botLevel: 1, stage: 2 },
  (() => {
    try {
      return JSON.parse(localStorage.getItem('brawl_settings') || '{}');
    } catch (e) {
      return {};
    }
  })()
);
function saveSettings() {
  try {
    localStorage.setItem('brawl_settings', JSON.stringify(SETTINGS));
  } catch (e) {}
}

// --- CLAVIER (ordinateur) : touches physiques (même place en AZERTY et en QWERTY) ------------------
// Bouger : ZQSD ou flèches · SAUT : Espace · COUP : J ou X · SPÉCIAL : I, V, K ou C (tenir = charger)
// SPÉCIAL : I ou V · ESQUIVE : L ou Maj · Échap : quitter le combat
const KEYMAP = {
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
  Space: 'jump', KeyJ: 'attack', KeyX: 'attack', KeyK: 'special', KeyC: 'special', KeyI: 'special', KeyV: 'special',
  KeyL: 'block', ShiftLeft: 'block', ShiftRight: 'block',
};
const KB = { held: {}, q: {}, used: false };
// suffixes des variantes de postures dessinées (dorée de BIGZINZIN, sans casquette de NATANAX)
const VARIANTS = ['_g', '_n'];
if (typeof window !== 'undefined') {
  const typing = (e) => e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
  window.addEventListener('keydown', (e) => {
    if (typing(e)) return;
    if (e.code === 'Escape') {
      const sc = game && game.scene.getScene('game');
      if (sc && sc.state === 'play' && !sc.over && sc.askQuit) (sc.quitUi ? sc.closeQuit() : sc.askQuit());
      return;
    }
    const sel = game && game.scene.getScene('game');
    if (sel && sel.state === 'select' && sel.cards && sel.cards.length) {
      const C = sel.selCols || 3;
      const mv = { ArrowLeft: -1, KeyA: -1, ArrowRight: 1, KeyD: 1, ArrowUp: -C, KeyW: -C, ArrowDown: C, KeyS: C }[e.code];
      if (mv) { e.preventDefault(); sel.selectCard(sel.selIdx + mv); return; }
      if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyJ' || e.code === 'KeyX') { e.preventDefault(); if (!e.repeat) sel.confirmSelect(); return; }
    }
    const a = KEYMAP[e.code];
    if (!a) return;
    e.preventDefault();
    if (!KB.held[a] && !e.repeat) KB.q[a] = true;
    KB.held[a] = true;
    KB.used = true;
  });
  window.addEventListener('keyup', (e) => {
    const a = KEYMAP[e.code];
    if (a) KB.held[a] = false;
  });
  window.addEventListener('blur', () => { KB.held = {}; });
}

let game = null;
let L = null; // mise en page courante
let chosen = null; // personnage choisi par le joueur
let goSelect = false;
let camp = null; // état de la campagne (null = combat rapide)
let campPick = false;
let reopenSettings = false; // retour aux réglages après l'éditeur de boutons
let editButtons = false; // ouvrir l'éditeur de boutons au prochain démarrage de la scène
let lastPortrait = null;

// ---------------------------------------------------------------------------
// Helpers canvas / pixel art
// ---------------------------------------------------------------------------
// Résolution des textures : RES sous-pixels par pixel d'art (la taille à l'écran ne change pas)
const RES = 2;

// Lissage « Scale2x » (EPX) : double la résolution en affinant les diagonales
function epxUpscale(src, w, h, dst) {
  const a = src.getImageData(0, 0, w, h).data;
  const out = dst.createImageData(w * 2, h * 2);
  const o = out.data;
  const same = (i, j) => a[i] === a[j] && a[i + 1] === a[j + 1] && a[i + 2] === a[j + 2] && a[i + 3] === a[j + 3];
  const at = (x, y) => (Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))) * 4;
  const put = (x, y, i) => {
    const k = (y * w * 2 + x) * 4;
    o[k] = a[i]; o[k + 1] = a[i + 1]; o[k + 2] = a[i + 2]; o[k + 3] = a[i + 3];
  };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
      put(x * 2, y * 2, same(C, A) && !same(C, D) && !same(A, B) ? A : P);
      put(x * 2 + 1, y * 2, same(A, B) && !same(A, C) && !same(B, D) ? B : P);
      put(x * 2, y * 2 + 1, same(D, C) && !same(D, B) && !same(C, A) ? C : P);
      put(x * 2 + 1, y * 2 + 1, same(B, D) && !same(B, A) && !same(D, C) ? D : P);
    }
  dst.putImageData(out, 0, 0);
}

// mode : 'epx' (dessin 1x lissé en 2x), 'native' (le dessin se fait directement en RESx), 'raw' (tel quel)
function mkCanvas(scene, key, w, h, fn, mode) {
  mode = mode || 'epx';
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const r = mode === 'raw' ? 1 : RES;
  const t = scene.textures.createCanvas(key, w * r, h * r);
  const c = t.getContext();
  c.imageSmoothingEnabled = false;
  if (mode === 'native') fn(c, r);
  else if (mode === 'epx') {
    const tmp = document.createElement('canvas');
    tmp.width = w;
    tmp.height = h;
    const tc = tmp.getContext('2d');
    tc.imageSmoothingEnabled = false;
    fn(tc, 1);
    epxUpscale(tc, w, h, c);
  } else fn(c, 1);
  t.refresh();
  if (r !== 1) HRTEX.add(key);
  else HRTEX.delete(key);
  return t;
}

// Les textures haute résolution (RES x plus de pixels) sont affichées avec une échelle divisée par RES :
// tout le reste du jeu continue de raisonner en « pixels d'art » logiques.
const HRTEX = new Set();
const TEXSCALE = {}; // textures des persos dessinés (PNG) : échelle propre
const texK = (o) => (o && o.texture ? TEXSCALE[o.texture.key] || (HRTEX.has(o.texture.key) ? 1 / RES : 1) : 1);
// Textes : Phaser mesure la hauteur des lettres avec une chaîne mal encodée dans sa propre version (« |MÃ‰qgy ») ;
// on lui donne la bonne, avec nos majuscules accentuées plus hautes, sinon les accents sont coupés.
{
  const F = Phaser.GameObjects.GameObjectFactory.prototype;
  const origText = F.text;
  F.text = function (x, y, txt, style) {
    return origText.call(this, x, y, txt, Object.assign({ testString: '|MÉÈÊÔqgy' }, style));
  };
}
['Image', 'Sprite'].forEach((n) => {
  const P = Phaser.GameObjects[n].prototype;
  const orig = P.setScale;
  P.setScale = function (x, y) {
    if (x === undefined) x = 1;
    if (y === undefined) y = x;
    const k = texK(this);
    return orig.call(this, x * k, y * k);
  };
});
{
  const addTween = Phaser.Tweens.TweenManager.prototype.add;
  Phaser.Tweens.TweenManager.prototype.add = function (cfg) {
    const t = cfg && cfg.targets;
    const k = texK(Array.isArray(t) ? t[0] : t);
    if (k !== 1) {
      cfg = Object.assign({}, cfg);
      ['scale', 'scaleX', 'scaleY'].forEach((p) => {
        const v = cfg[p];
        if (typeof v === 'number') cfg[p] = v * k;
        else if (v && typeof v === 'object') {
          const o = Object.assign({}, v);
          ['from', 'to', 'start'].forEach((q) => typeof o[q] === 'number' && (o[q] *= k));
          cfg[p] = o;
        }
      });
    }
    return addTween.call(this, cfg);
  };
}

// Parcourt chaque sous-pixel : f(xLogique, yLogique) -> couleur ou null
function hiPx(c, R, w, h, f) {
  for (let j = 0; j < h * R; j++)
    for (let i = 0; i < w * R; i++) {
      const col = f((i + 0.5) / R, (j + 0.5) / R);
      if (col) {
        c.fillStyle = col;
        c.fillRect(i, j, 1, 1);
      }
    }
}

function circleTex(scene, key, n, fill, stroke, ring) {
  mkCanvas(scene, key, n, n, (c, R) => {
    const r = n / 2;
    hiPx(c, R, n, n, (x, y) => {
      const d = hyp(x - r, y - r);
      return d <= r ? (d > r - ring ? stroke : fill) : null;
    });
  }, 'native');
}

function iconTex(scene, key, rows, color, colors) {
  mkCanvas(scene, key, rows[0].length, rows.length, (c) => {
    rows.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch === '.') return;
        c.fillStyle = colors && colors[ch] ? colors[ch] : color;
        c.fillRect(x, y, 1, 1);
      })
    );
  });
}

// Orbe lumineuse : cols = [halo, extérieur, intérieur, coeur]
function orbTex(scene, key, n, cols) {
  mkCanvas(scene, key, n, n, (c, R) => {
    const r = n / 2;
    hiPx(c, R, n, n, (x, y) => {
      const d = hyp(x - r, y - r) / r;
      return d > 1 ? null : d > 0.82 ? cols[0] : d > 0.55 ? cols[1] : d > 0.28 ? cols[2] : cols[3];
    });
  }, 'native');
}

// Croissant de coup (ouvert à gauche, bombé à droite)
function crescentTex(scene, key, cols) {
  const n = 28;
  mkCanvas(scene, key, n, n, (c, R) => {
    hiPx(c, R, n, n, (x, y) => {
      const o = hyp(x - 12, y - 14);
      const i = hyp(x - 5, y - 14);
      if (o <= 13 && i > 12) {
        const edge = 13 - o;
        return edge < 1.6 ? cols[0] : edge < 3.6 ? cols[1] : cols[2];
      }
      return null;
    });
  }, 'native');
}

// Sprite pixel à partir de polygones (test du centre de chaque pixel -> bords nets) + contour automatique
function polyTex(scene, key, w, h, layers, outline) {
  const inside = (x, y, pts) => {
    let ok = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ok = !ok;
    }
    return ok;
  };
  mkCanvas(scene, key, w, h, (c, R) => {
    const W = w * R, H = h * R;
    const g = Array.from({ length: H }, () => Array(W).fill(null));
    layers.forEach(([col, pts]) => {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inside((x + 0.5) / R, (y + 0.5) / R, pts)) g[y][x] = col;
    });
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        let col = g[y][x];
        if (!col && outline) {
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const yy = y + dy, xx = x + dx;
            if (yy >= 0 && yy < H && xx >= 0 && xx < W && g[yy][xx]) col = outline;
          }
        }
        if (col) {
          c.fillStyle = col;
          c.fillRect(x, y, 1, 1);
        }
      }
  }, 'native');
}

// Sprites des personnages : moteur natif 48x40 (sprites48.js + chars48.js)
const POSES = SPR48.POSES;

// ---------------------------------------------------------------------------
// Scène
// ---------------------------------------------------------------------------
class GameScene extends Phaser.Scene {
  constructor() {
    super('game');
  }

  create() {
    this.W = L.W;
    this.H = L.H;
    this.over = false;
    this.freezeLeft = 0;
    this.simFrames = 0;
    this.simNow = 0;
    this.frame = 0;
    this.acc = 0;
    this.timers = [];
    this.atkSeq = 0;
    this.projSeq = 0;
    this.net = null;
    this.netInput = null;
    this.resim = false;
    this.simScale = 1;
    this.sudden = false;
    this.timeLimit = 0;
    this.training = trainingMode;
    this.reco = null;
    this.dropTxt = null;
    this.ovl = null;
    this.moveList = null;
    this.trainBtns = null;
    this.trainInfo = null;
    this.forceBot = this.forceBot || null;
    this.physics.world.pause(); // la physique est pilotée à la main : un pas de 1/60 s par image de simulation
    this.projs = [];
    this.ui = [];
    this.makeTextures();
    if (this.makeExtraTextures) this.makeExtraTextures();
    this.buildBackground();
    this.buildStage();
    if (this.buildDune) {
      this.buildDune();
      this.applyStage(this.pickStage());
    }
    this.chainGfx = this.add.graphics().setDepth(14);
    this.setupInput();
    this.buildControlsUi();

    this.editing = false;
    if (editButtons) {
      this.startButtonEditor();
    } else if (onlineStage) {
      this.onlineEnter();
    } else if (camp && camp.phase) {
      this.campEnter();
    } else if (chosen && !goSelect) {
      this.state = 'play';
      this.beginMatch(chosen);
    } else if (goSelect) {
      this.state = 'select';
      if (this.showStagePick) this.showStagePick(() => this.showSelect());
      else this.showSelect();
    } else if (sessionReady) {
      this.state = 'menu';
      this.showMenu();
      if (reopenSettings) {
        reopenSettings = false;
        this.showSettings();
      }
    } else {
      this.state = 'title';
      this.showTitle();
    }
  }

  // ----- Textures ---------------------------------------------------------
  makeTextures() {
    ORDER.forEach((id) => {
      const png = typeof PNG_IMG !== 'undefined' && PNG_IMG[id] && PNG_CHARS[id];
      if (png) {
        // perso dessiné en pixel art : une case par posture dans la planche (posture absente -> garde)
        const all = new Set([...SPR48.namesFor(id), ...png.names]);
        // variantes de chaque posture : dorée « _g » (BIGZINZIN), sans casquette « _n » (NATANAX)
        for (const sfx of VARIANTS) if (png.names.some((n) => n.endsWith(sfx))) [...all].forEach((n) => !VARIANTS.some((v) => n.endsWith(v)) && all.add(n + sfx));
        all.forEach((name) => {
          const fi = png.names.indexOf(name) >= 0 ? png.names.indexOf(name) : png.names.indexOf('idle0' + (VARIANTS.find((v) => name.endsWith(v)) || ''));
          mkCanvas(this, `${id}_${name}`, png.w, png.h, (c) => c.drawImage(PNG_IMG[id], fi * png.w, 0, png.w, png.h, 0, 0, png.w, png.h), 'raw');
          TEXSCALE[`${id}_${name}`] = png.scale / PX;
        });
      } else
      SPR48.namesFor(id).forEach((name) => {
        mkCanvas(this, `${id}_${name}`, 24, 20, (c) => c.putImageData(new ImageData(SPR48.draw(id, name), SPR48.W, SPR48.H), 0, 0), 'native');
        if (id === 'nini') mkCanvas(this, `${id}_${name}_r`, 24, 20, (c) => c.putImageData(new ImageData(SPR48.draw(id, name, { rage: true }), SPR48.W, SPR48.H), 0, 0), 'native');
      });
      const p = CHARS[id].pal;
      mkCanvas(this, `stock_${id}`, 7, 7, (c) => {
        c.fillStyle = OUT;
        c.fillRect(0, 0, 7, 7);
        c.fillStyle = p.skin;
        c.fillRect(1, 1, 5, 5);
        c.fillStyle = p.main;
        c.fillRect(1, 1, 5, 2);
      });
    });

    SPR48.extras.forEach((n) => mkCanvas(this, n, 24, 20, (c) => c.putImageData(new ImageData(SPR48.drawExtra(n), SPR48.W, SPR48.H), 0, 0), 'native'));
    crescentTex(this, 'cres_pink', ['#ffffff', '#ffd1e6', '#ff7eb6']);

    // Interface
    circleTex(this, 'stickBase', 44, 'rgba(255,255,255,0.10)', 'rgba(255,255,255,0.55)', 2);
    circleTex(this, 'stickKnob', 18, 'rgba(255,255,255,0.45)', 'rgba(255,255,255,0.9)', 2);
    circleTex(this, 'btnAtk', 28, 'rgba(247,37,133,0.35)', 'rgba(255,255,255,0.8)', 2);
    circleTex(this, 'btnBlk', 24, 'rgba(110,231,183,0.35)', 'rgba(255,255,255,0.8)', 2);
    circleTex(this, 'shield', 48, 'rgba(120,205,255,0.22)', 'rgba(190,235,255,0.95)', 2);
    iconTex(this, 'icoBlk', ['....XXXX.', '..XX....X', '.X.......', 'X..XXXXX.', 'X........', 'X..XXXXX.', '.X.......', '..XX....X', '....XXXX.'], '#ffffff');
    circleTex(this, 'btnJump', 24, 'rgba(76,201,240,0.35)', 'rgba(255,255,255,0.8)', 2);
    iconTex(this, 'icoAtk', ['....X....', '.X..X..X.', '..X.X.X..', '...XXX...', 'XXXXXXXXX', '...XXX...', '..X.X.X..', '.X..X..X.', '....X....'], '#ffffff');
    iconTex(this, 'icoJump', ['....X....', '...XXX...', '..XXXXX..', '.XXXXXXX.', '....X....', '....X....', '....X....', '....X....', '....X....'], '#ffffff');
    // bouton SPÉCIAL (violet) et son icône (étincelle)
    circleTex(this, 'btnSp', 24, 'rgba(160,110,255,0.38)', 'rgba(255,255,255,0.8)', 2);
    iconTex(this, 'icoSp', ['....X....', '....X....', '...XXX...', 'XXXXXXXXX', '.XXXXXXX.', '..XXXXX..', '..XX.XX..', '.XX...XX.', '.X.....X.'], '#ffffff');
    iconTex(this, 'icoFs', ['XXX...XXX', 'X.......X', 'X.......X', '.........', '.........', '.........', 'X.......X', 'X.......X', 'XXX...XXX'], '#ffffff');

    // Effets
    crescentTex(this, 'cres_white', ['#ffffff', '#bdf0ff', '#4cc9f0']);
    crescentTex(this, 'cres_fire', ['#fff3b0', '#ffb703', '#e8590c']);
    crescentTex(this, 'cres_arc', ['#ffffff', '#9ff3ff', '#7a5cff']);
    crescentTex(this, 'cres_earth', ['#ffffff', '#e8d5b0', '#9c7a4e']);
    crescentTex(this, 'cres_wood', ['#ffffff', '#ffe0a8', '#e0802e']);
    // --- DENODOOM ---
    crescentTex(this, 'cres_steel', ['#ffffff', '#d8e6f5', '#7f9bbd']);
    iconTex(this, 'bullet', ['.XXXXXX.', 'XXXXXXXX', '.XXXXXX.'], '#ffe27a');
    // ballon de handball
    mkCanvas(this, 'hball', 10, 10, (c, R) => {
      hiPx(c, R, 10, 10, (x, y) => {
        const d = hyp(x - 5, y - 5);
        if (d > 5) return null;
        if (d > 4.5) return OUT;
        if (hyp(x - 3.1, y - 3.1) < 0.9) return '#fff3b0';
        return Math.abs(x - y) < 1.4 ? '#1d4fa3' : d > 3.6 ? '#e0a92a' : '#ffd23f';
      });
    }, 'native');
    // aigle de Carthage (2 images : ailes en haut / en bas)
    const EG_BODY = '#d6293e', EG_DK = '#8c1c26', EG_HEAD = '#f6f2e8', EG_BEAK = '#ffc83d', EG_HL = '#ff6b7c';
    const egCommon = [
      [EG_DK, [[0, 11], [6, 9.5], [8, 13], [6, 16], [1, 16]]],
      ['#f6f2e8', [[0, 11], [2, 10.6], [2, 15.6], [1, 16]]],
    ];
    const egHead = (dy) => [
      [EG_HEAD, [[20, 6 + dy], [24, 5.5 + dy], [26, 8 + dy], [24, 10.5 + dy], [20, 10 + dy]]],
      [EG_BEAK, [[25, 7 + dy], [29.5, 8.5 + dy], [28.5, 10.8 + dy], [27, 9.6 + dy], [26, 10.4 + dy]]],
      ['#14121c', [[23, 6.8 + dy], [24.6, 6.8 + dy], [24.6, 8.4 + dy], [23, 8.4 + dy]]],
      ['#14121c', [[22.4, 5.6 + dy], [25.4, 6.4 + dy], [25.4, 7 + dy], [22.4, 6.4 + dy]]],
    ];
    polyTex(this, 'eagle0', 32, 20, [
      [EG_DK, [[9, 9], [5, 2], [8, 0.5], [10, 3], [13, 1], [14, 4], [17, 3], [17, 9]]],
      ...egCommon,
      [EG_BODY, [[5, 10], [10, 8], [19, 8], [23, 10], [22, 13], [16, 15], [9, 14]]],
      [EG_BODY, [[8, 9], [4, 3], [7, 2], [8, 0], [11, 2], [13, 0], [15, 3], [18, 2], [20, 5], [22, 9]]],
      [EG_HL, [[8, 5], [11, 3.5], [13, 3.5], [11, 7]]],
      ...egHead(0),
      [EG_BEAK, [[11, 14], [11.5, 18], [13, 18], [13.5, 14]]],
      [EG_BEAK, [[15, 14], [15.5, 18], [17, 18], [17.5, 14]]],
    ], OUT);
    polyTex(this, 'eagle1', 32, 20, [
      [EG_DK, [[9, 10], [6, 16], [11, 16], [15, 11]]],
      ...egCommon,
      [EG_BODY, [[5, 9], [10, 7], [19, 7], [23, 9], [22, 12], [16, 14], [9, 13]]],
      [EG_BODY, [[8, 10], [5, 17], [8, 19], [10, 16.5], [12, 19], [14, 16.5], [16, 18.5], [19, 12], [21, 10]]],
      [EG_HL, [[9, 12], [12, 11], [13, 13], [10, 15]]],
      ...egHead(-1),
    ], OUT);
    // hermine (selon la 2e photo : trois losanges en croix + corps triangulaire à queue dentelée)
    {
      const hs = (arr) => arr.map(([x, y]) => [(x - 280) / 16.5, (y - 178) / 16.5]);
      polyTex(this, 'hermine', 24, 37, [
        ['#0d0d12', hs([[472, 178], [513, 265], [472, 352], [432, 265]])],
        ['#0d0d12', hs([[281, 368], [370, 328], [456, 368], [370, 409]])],
        ['#0d0d12', hs([[490, 368], [576, 328], [664, 370], [576, 410]])],
        ['#0d0d12', hs([[472, 384], [598, 642], [543, 626], [557, 684], [508, 642], [472, 768], [436, 642], [388, 684], [401, 626], [346, 642]])],
      ], '#f1eee2');
    }
    // drapeau tunisien (pixel) : fond rouge, disque blanc, croissant et étoile rouges
    mkCanvas(this, 'flagtn', 28, 20, (c) => {
      const RED = '#e70013';
      const f = (x, y, w, h, col) => ((c.fillStyle = col), c.fillRect(x, y, w, h));
      f(0, 0, 2, 20, '#d9d2c0'); // hampe
      f(0, 0, 2, 1, '#d9a82b');
      f(2, 1, 26, 17, OUT);
      f(3, 2, 24, 15, RED);
      for (let y = 0; y < 15; y++)
        for (let x = 0; x < 24; x++) {
          const cx = x + 0.5 - 12, cy = y + 0.5 - 7.5;
          if (hyp(cx, cy) <= 6) f(3 + x, 2 + y, 1, 1, '#ffffff');
        }
      for (let y = 0; y < 15; y++)
        for (let x = 0; x < 24; x++) {
          const px0 = x + 0.5 - 11, px1 = x + 0.5 - 12.8, cy = y + 0.5 - 7.5;
          if (hyp(px0, cy) <= 4.6 && hyp(px1, cy) > 3.6) f(3 + x, 2 + y, 1, 1, RED);
        }
      // étoile
      [[13, 7], [12, 7], [14, 7], [13, 6], [13, 8]].forEach(([x, y]) => f(3 + x, 2 + y, 1, 1, RED));
    });
    iconTex(this, 'note',['...XXX.', '...X.XX', '...X..X', '...X...', '...X...', 'XXXX...', 'XXXX...', '.XX....'], '#ffe27a');
    // Code pénal (dessiné en vectoriel, texture lissée)
    mkCanvas(this, 'book', 128, 96, (c) => drawBook(c, 128, 96), 'raw');
    this.textures.get('book').setFilter(Phaser.Textures.FilterMode.LINEAR);
    circleTex(this, 'ring', 24, 'rgba(255,255,255,0)', '#ffffff', 2);
    iconTex(
      this,
      'flame',
      ['...X...', '..XX...', '..XXX..', '.XXXX..', '.XXXXX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..'],
      '#ff7b00',
      null
    );
    // flamme : dégradé vertical
    mkCanvas(this, 'flame', 7, 9, (c) => {
      const rows = ['...X...', '..XX...', '..XXX..', '.XXXX..', '.XXXXX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..'];
      const cols = ['#fff3b0', '#fff3b0', '#ffd166', '#ffb703', '#ff7b00', '#ff7b00', '#e8590c', '#e8590c', '#b8300c'];
      rows.forEach((r, y) => [...r].forEach((ch, x) => ch === 'X' && ((c.fillStyle = cols[y]), c.fillRect(x, y, 1, 1))));
    });
    mkCanvas(this, 'burst', 17, 17, (c) => {
      const f = (x, y, w, h, col) => ((c.fillStyle = col), c.fillRect(x, y, w, h));
      f(0, 7, 17, 3, '#ffe9a8');
      f(7, 0, 3, 17, '#ffe9a8');
      for (let i = 2; i < 15; i++) {
        f(i, i, 2, 2, '#ffe9a8');
        f(16 - i, i, 2, 2, '#ffe9a8');
      }
      f(3, 8, 11, 1, '#ffffff');
      f(8, 3, 1, 11, '#ffffff');
      f(6, 6, 5, 5, '#ffffff');
    });
    orbTex(this, 'orb_s', 8, ['#4b2fbf', '#7a5cff', '#9ff3ff', '#ffffff']);
    orbTex(this, 'orb_l', 14, ['#3b2a8c', '#7a5cff', '#9ff3ff', '#ffffff']);
    mkCanvas(this, 'comet', 11, 11, (c) => {
      const f = (x, y, w, h, col) => ((c.fillStyle = col), c.fillRect(x, y, w, h));
      f(4, 0, 3, 11, '#ffb703');
      f(0, 4, 11, 3, '#ffb703');
      f(3, 3, 5, 5, '#ffd166');
      f(4, 4, 3, 3, '#ffffff');
    });
    mkCanvas(this, 'mine', 12, 8, (c) => {
      for (let y = 0; y < 8; y++)
        for (let x = 0; x < 12; x++) {
          const d = hyp((x + 0.5 - 6) / 6, (y + 0.5 - 4) / 4);
          if (d > 1) continue;
          c.fillStyle = d > 0.78 ? '#7df9ff' : d > 0.35 ? '#3b2a8c' : '#ffffff';
          c.fillRect(x, y, 1, 1);
        }
      c.fillStyle = '#7a5cff';
      c.fillRect(5, 1, 2, 6);
      c.fillRect(2, 3, 8, 2);
      c.fillStyle = '#ffffff';
      c.fillRect(5, 3, 2, 2);
    });
    mkCanvas(this, 'hook', 8, 8, (c) => {
      const rows = ['...XX...', '..XXXX..', '.XXXXXX.', 'XXXXXXXX', '..XXXX..', '..XXXX..', '...XX...', '...XX...'];
      rows.forEach((r, y) =>
        [...r].forEach((ch, x) => {
          if (ch === 'X') {
            c.fillStyle = x < 3 ? '#e5e9f0' : x > 4 ? '#6b7280' : '#aab2bd';
            c.fillRect(x, y, 1, 1);
          }
        })
      );
    });
  }

  buildBackground() {
    const w = Math.ceil(this.W / PX);
    const h = Math.ceil(this.H / PX);
    const horizon = Math.round(L.baseY / PX) + 6;
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    mkCanvas(this, 'bg', w, h, (c) => {
      const stops = [[11, 13, 31], [42, 27, 77], [91, 42, 99]];
      for (let y = 0; y < h; y++) {
        const t = Math.min(y / horizon, 1);
        const q = Math.floor(t * 9) / 9;
        const seg = q < 0.5 ? 0 : 1;
        const u = q < 0.5 ? q * 2 : (q - 0.5) * 2;
        const a = stops[seg], b = stops[seg + 1];
        c.fillStyle = `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * u)).join(',')})`;
        c.fillRect(0, y, w, 1);
      }
      for (let i = 0; i < w * 0.35; i++) {
        c.fillStyle = rnd() > 0.8 ? '#ffe9a8' : '#cfd3ff';
        c.fillRect(Math.floor(rnd() * w), Math.floor(rnd() * horizon * 0.7), 1, 1);
      }
      const mx = Math.round(w * 0.8), my = Math.round(horizon * 0.28);
      for (let y = -9; y <= 9; y++)
        for (let x = -9; x <= 9; x++)
          if (x * x + y * y <= 81) {
            c.fillStyle = x * x + y * y > 64 ? '#d9d4ff' : '#f5f0ff';
            c.fillRect(mx + x, my + y, 1, 1);
          }
      c.fillStyle = '#cfc8f0';
      [[-3, -2], [2, 3], [3, -4], [-4, 4]].forEach(([x, y]) => c.fillRect(mx + x, my + y, 2, 2));
      for (let x = 0; x < w; x++) {
        const top = horizon - (8 + 6 * Math.sin(x * 0.06) + 4 * Math.sin(x * 0.17 + 1));
        c.fillStyle = '#231a45';
        c.fillRect(x, Math.round(top), 1, h);
      }
      let x = 0;
      while (x < w) {
        const bw = 4 + Math.floor(rnd() * 5);
        const bh = 8 + Math.floor(rnd() * 16);
        const top = horizon + 2 - bh;
        c.fillStyle = '#120e26';
        c.fillRect(x, top, bw, h);
        for (let wy = top + 2; wy < horizon; wy += 3)
          for (let wx = x + 1; wx < x + bw - 1; wx += 2)
            if (rnd() > 0.72) {
              c.fillStyle = rnd() > 0.5 ? '#ffd166' : '#8be9fd';
              c.fillRect(wx, wy, 1, 1);
            }
        x += bw + (rnd() > 0.6 ? 1 : 0);
      }
      c.fillStyle = '#0a0818';
      c.fillRect(0, horizon + 2, w, h);
    });
    this.bgImg = this.add.image(0, 0, 'bg').setOrigin(0).setScale(PX).setDepth(-10);
  }

  buildStage() {
    const mw = L.mainW;
    const tw = Math.round(mw / PX);
    mkCanvas(this, 'main', tw, 14, (c) => {
      for (let y = 0; y < 14; y++)
        for (let x = 0; x < tw; x++) {
          let col;
          if (y === 0) col = '#86e06f';
          else if (y === 1) col = '#3f9e4a';
          else if (y === 13) col = '#241810';
          else {
            const row = y - 2;
            const off = Math.floor(row / 3) % 2 ? 3 : 0;
            const brickEdge = row % 3 === 2 || (x + off) % 7 === 0;
            col = brickEdge ? '#4e3428' : (x * 7 + y * 13) % 11 === 0 ? '#7a5a46' : '#6b4a3a';
          }
          c.fillStyle = col;
          c.fillRect(x, y, 1, 1);
        }
    });
    mkCanvas(this, 'soft', 50, 5, (c) => {
      for (let y = 0; y < 5; y++)
        for (let x = 0; x < 50; x++) {
          c.fillStyle = y === 0 ? '#e0b46c' : y === 4 ? '#4d2f1c' : x % 10 === 0 ? '#5e3a22' : '#8a5a36';
          c.fillRect(x, y, 1, 1);
        }
    });

    this.platforms = this.physics.add.staticGroup();
    const main = this.platforms.create(this.W / 2, L.baseY + 28, 'main').setScale(PX).refreshBody();
    main.setDepth(5);
    this.mainPlat = main;
    this.softPlats = [];
    // tout le bloc (herbe + terre) est solide : on ne traverse plus la terre par les côtés ni par dessous
    const sx = mw * 0.3;
    [
      [this.W / 2 - sx, L.baseY - 170],
      [this.W / 2 + sx, L.baseY - 170],
      [this.W / 2, L.baseY - 310],
    ].forEach(([x, y]) => {
      const p = this.platforms.create(x, y, 'soft').setScale(PX).refreshBody();
      p.setDepth(5);
      p.soft = true;
      this.softPlats.push(p);
      p.body.checkCollision.down = false;
      p.body.checkCollision.left = false;
      p.body.checkCollision.right = false;
    });
  }

  // ----- Joueurs ----------------------------------------------------------
  makePlayer(charId, x, y, isHuman) {
    const def = CHARS[charId];
    const sprite = this.physics.add.sprite(x, y, `${charId}_idle0`).setScale(PX).setDepth(10);
    const bw = charId === 'grom' ? 9 : charId === 'astra' ? 6 : 7;
    const bh = charId === 'grom' ? 16 : 15;
    const png = typeof PNG_IMG !== 'undefined' && PNG_IMG[charId] && PNG_CHARS[charId];
    if (png) {
      // même boîte de collision qu'avant (en pixels du monde), pieds en bas de la case
      const k = png.scale, w = (bw * 4) / k, h = (bh * 4) / k;
      sprite.body.setSize(w, h, false).setOffset(png.w / 2 - w / 2, png.h - 1 - h);
    } else sprite.body.setSize(bw * RES, bh * RES, false).setOffset((12 - bw / 2) * RES, (20 - bh) * RES);
    sprite.body.setGravityY(GRAVITY);
    const tag = this.add
      .text(x, y, isHuman ? 'TOI' : 'BOT', { fontFamily: FONT, fontSize: '12px', color: isHuman ? '#ffe9a8' : '#ff8fa3', stroke: '#000', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(40);
    const pl = {
      char: charId,
      def,
      sprite,
      tag,
      human: isHuman,
      facing: isHuman ? 1 : -1,
      damage: 0,
      stocks: STOCKS,
      jumps: def.jumps,
      stunUntil: 0,
      tumble: 0,
      stunStart: 0,
      cdUntil: 0,
      invulnUntil: 0,
      lastJump: 0,
      lastGhost: 0,
      atk: null,
      grab: null,
      prevBlock: false,
      rollUntil: 0,
      rollDir: 1,
      dodgeUntil: 0,
      dodgeCd: 0,
      dodgeLock: 0,
      airDodged: false,
      helpless: false,
      recUsed: false,
      hopUsed: false,
      floatUsed: false,
      dashUsed: false,
      ledgeSide: 0,
      ledgeAt: 0,
      ledgeCdUntil: 0,
      ledgeInvUsed: false,
      bufAtk: 0,
      bufHeavy: 0,
      bufSp: 0,
      bufAim: 'n',
      gcUntil: 0,
      heat: 0,
      markUntil: 0,
      sti: 0,
      st0: '', st1: '', st2: '', st3: '', st4: '',
      chargeUsed: false,
      hornUsed: false,
      blinkUsed: false,
      leapUsed: false,
      dashCd: 0,
      sprintDir: 0,
      chaseLeft: 0,
      chaseUntil: 0,
      chaseAtkUntil: 0,
      bufJump: 0,
      bufDodge: 0,
      lastSx: 0,
      lastSy: 0,
      armorUntil: 0,
      slowUntil: 0,
      dropUntil: 0,
      downHold: 0,
      rage: 0,
      rageUntil: 0,
      charmUntil: 0,
      flipAt: 0,
      moveCd: {},
    };
    // plateformes fines : on peut les traverser vers le bas (BAS tenu)
    this.physics.add.collider(sprite, this.platforms, null, (spr, plat) => !(plat.soft && pl.dropUntil > this.simNow));
    return pl;
  }

  beginMatch(charId) {
    const others = playable().filter((c) => c !== charId);
    const botChar = this.forceBot || (this.training ? trainDummy : others[Math.floor(Math.random() * others.length)]);
    this.p1 = this.makePlayer(charId, this.W / 2 - 150, L.baseY - 110, true);
    this.p2 = this.makePlayer(botChar, this.W / 2 + 150, L.baseY - 110, false);
    this.p1.i = 0;
    this.p2.i = 1;
    this.p1.team = 0;
    this.p2.team = 1;
    this.pls = [this.p1, this.p2];
    this.p2.lvl = SETTINGS.botLevel;
    this.timeLimit = this.training || camp ? 0 : SETTINGS.timer ? MATCH_MS : 0;
    this.buildHud();
    if (this.training) this.trainSetup();
    if (typeof MUSIC !== 'undefined') MUSIC.play(this.stageId === 'dune' ? 'desert' : 'night');
  }

  buildHud() {
    const k = L.portrait ? 1.35 : this.pls.length > 2 ? 0.82 : 1;
    const mk = (pl, x, align) => {
      const ox = align === 'left' ? 0 : 1;
      const label = this.pls.length > 2 && pl.name ? pl.name : pl.def.name;
      const name = this.add
        .text(x, 20, label, { fontFamily: FONT, fontSize: `${Math.round(16 * k)}px`, color: pl.teamCss || '#ffffff', stroke: '#000', strokeThickness: 4 })
        .setOrigin(ox, 0)
        .setDepth(50);
      const dmg = this.add
        .text(x, 20 + 26 * k, '0%', { fontFamily: FONT, fontSize: `${Math.round(34 * k)}px`, color: '#ffffff', stroke: '#000', strokeThickness: 6 })
        .setOrigin(ox, 0)
        .setDepth(50);
      const icons = [];
      for (let i = 0; i < STOCKS; i++) {
        const ix = align === 'left' ? x + 14 * k + i * 34 * k : x - 14 * k - i * 34 * k;
        icons.push(this.add.image(ix, 20 + 86 * k, `stock_${pl.char}`).setScale(4 * k).setDepth(50));
      }
      // jauge d'esquive : pleine = esquive au sol prête ; point = esquive aérienne disponible
      const gw = 120 * k, gy = 20 + 112 * k;
      const gx = align === 'left' ? x : x - gw;
      this.add.rectangle(gx, gy, gw, 8 * k, 0x000000, 0.55).setOrigin(0, 0.5).setDepth(50).setStrokeStyle(2, 0xffffff, 0.5);
      const gfg = this.add.rectangle(gx, gy, gw, 8 * k, 0x7df9ff).setOrigin(0, 0.5).setDepth(51);
      const air = this.add.rectangle(align === 'left' ? gx + gw + 10 * k : gx - 10 * k, gy, 8 * k, 8 * k, 0xffe9a8).setDepth(51);
      let rfg = null;
      if (pl.char === 'nini' || pl.def.heat || pl.def.money) {
        const ry = gy + 14 * k;
        this.add.rectangle(gx, ry, gw, 8 * k, 0x000000, 0.55).setOrigin(0, 0.5).setDepth(50).setStrokeStyle(2, 0xffffff, 0.5);
        rfg = this.add.rectangle(gx, ry, 1, 8 * k, 0xff4d8d).setOrigin(0, 0.5).setDepth(51);
      }
      pl.hud = { name, dmg, icons, gfg, gw, rfg, air };
    };
    if (this.pls.length > 2) {
      // à plusieurs : 4 encarts en haut (deux à gauche, deux à droite du chrono)
      const L2 = [[24, 'left'], [24 + 250, 'left']], R2 = [[this.W - 24, 'right'], [this.W - 24 - 250, 'right']];
      const teamed = this.pls.some((p) => p.teamCss);
      if (teamed && this.pls.filter((p) => p.team === 0).length <= 2 && this.pls.filter((p) => p.team === 1).length <= 2) {
        // par équipes : l'équipe 1 à gauche, l'équipe 2 à droite
        let l = 0, r = 0;
        this.pls.forEach((pl) => (pl.team === 0 ? mk(pl, ...L2[l++]) : mk(pl, ...R2[r++])));
      } else {
        const X = [L2[0], R2[0], L2[1], R2[1]];
        this.pls.forEach((pl, i) => mk(pl, X[i][0], X[i][1]));
      }
    } else {
      mk(this.p1, 24, 'left');
      mk(this.p2, this.W - 24, 'right');
    }
    this.timerTxt = this.add.text(this.W / 2, 84, '', { fontFamily: FONT, fontSize: '20px', color: '#ffffff', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setDepth(50);

    this.banner = this.add
      .text(this.W / 2, L.baseY - 150, '', { fontFamily: FONT, fontSize: '48px', color: '#ffffff', stroke: '#000', strokeThickness: 8, align: 'center' })
      .setOrigin(0.5)
      .setDepth(60);
    this.sub = this.add
      .text(this.W / 2, L.baseY - 80, '', { fontFamily: FONT, fontSize: '18px', color: '#ffe9a8', stroke: '#000', strokeThickness: 5, align: 'center' })
      .setOrigin(0.5)
      .setDepth(60);
  }

  updateHud() {
    const now = this.nowT || 0;
    (this.pls || [this.p1, this.p2]).forEach((pl) => {
      const d = Math.round(pl.damage);
      const t = Math.min(d / 150, 1);
      const col = t < 0.5 ? this.lerpCol(0xffffff, 0xffd166, t * 2) : this.lerpCol(0xffd166, 0xff3b3b, (t - 0.5) * 2);
      pl.hud.dmg.setText(`${d}%`).setColor('#' + col.toString(16).padStart(6, '0'));
      pl.hud.icons.forEach((im, i) => im.setVisible(this.training || i < pl.stocks));
      const gk = Phaser.Math.Clamp(1 - (pl.dodgeCd - now) / 1000, 0, 1);
      pl.hud.gfg.width = Math.max(pl.hud.gw * gk, 1);
      pl.hud.gfg.setFillStyle(gk >= 1 ? 0x7df9ff : 0x5b6b8c);
      pl.hud.air.setFillStyle(pl.airDodged ? 0x3a3f5c : 0xffe9a8);
      if (pl.hud.rfg && pl.def.money) {
        const gold = now < (pl.goldUntil || 0);
        const mk = gold ? (pl.goldUntil - now) / BZ.goldMs : Math.min((pl.money || 0) / BZ.max, 1);
        pl.hud.rfg.width = Math.max(pl.hud.gw * mk, 1);
        pl.hud.rfg.setFillStyle(gold ? (Math.floor(now / 110) % 2 ? 0xffd23a : 0xfff3a0) : 0x4caf50);
      } else if (pl.hud.rfg && pl.def.heat) {
        const hk = Math.min((pl.heat || 0) / 100, 1);
        pl.hud.rfg.width = Math.max(pl.hud.gw * hk, 1);
        pl.hud.rfg.setFillStyle(hk >= 1 ? (Math.floor(now / 120) % 2 ? 0xffd166 : 0xff5a1f) : hk >= 0.25 ? 0xff7b00 : 0x8a4a20);
      } else if (pl.hud.rfg) {
        const raging = now < pl.rageUntil;
        const rk = raging ? (pl.rageUntil - now) / RAGE_MS : Math.min(pl.rage / RAGE_MAX, 1);
        pl.hud.rfg.width = Math.max(pl.hud.gw * rk, 1);
        pl.hud.rfg.setFillStyle(raging ? (Math.floor(now / 100) % 2 ? 0xff2b2b : 0xffd166) : rk > 0.75 ? 0xff7a45 : 0xff4d8d);
      }
    });
    // au clavier : on cache les boutons tactiles (ils reviennent dès qu'on touche l'écran)
    if (this.touchObjs) {
      if (KB.used) this.touchObjs.forEach((o) => o.setVisible(false));
      else if (this.kbWasUsed) this.touchObjs.forEach((o) => o.setVisible(true));
      this.kbWasUsed = KB.used;
    }
    // points des spéciales (joueur local) : allumés = prête
    const me = this.pls ? this.pls.find((p) => p.human) || null : null;
    if (this.spDots && me) {
      for (const { k, d } of this.spDots) {
        const m = me.def.moves[k];
        if (!m || KB.used) { d.setVisible(false); continue; }
        const ready = !(m.cd && now < (me.moveCd[m.cdKey || k] || 0)) && !(m.type === 'burst' && (me.heat || 0) < (m.minHeat || 25));
        d.setVisible(true).setFillStyle(ready ? 0xd8c4ff : 0x3a3f5c);
      }
    }
    if (this.timerTxt) {
      if (this.sudden) this.timerTxt.setText('MORT SUBITE').setColor(Math.floor(now / 250) % 2 ? '#ff5a5a' : '#ffffff');
      else if (this.timeLimit) {
        const left = Math.max(0, Math.ceil((this.timeLimit - now) / 1000));
        this.timerTxt.setText(`${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`).setColor(left <= 10 ? '#ff5a5a' : '#ffffff');
      } else this.timerTxt.setText('');
    }
    this.overlayFx(now);
  }

  lerpCol(a, b, t) {
    const ch = (s) => Math.round(((a >> s) & 255) + ((((b >> s) & 255) - ((a >> s) & 255)) * t));
    return (ch(16) << 16) | (ch(8) << 8) | ch(0);
  }

  // ----- Titre + sélection de personnage ---------------------------------
  clearUi() {
    this.ui.forEach((o) => o.destroy());
    this.ui = [];
    // lignes de la liste des salons publics (créées à part) : sinon elles restaient affichées pendant le combat
    if (this.roomObjs) {
      this.roomObjs.forEach((o) => o.destroy());
      this.roomObjs = [];
    }
    if (this.cardTimer) this.cardTimer.remove();
    if (this.roomPoll) {
      this.roomPoll.remove();
      this.roomPoll = null;
    }
  }

  showTitle() {
    if (typeof MUSIC !== 'undefined') MUSIC.play('menu');
    const D = 100;
    this.ui.push(
      this.add.rectangle(this.W / 2, this.H / 2, this.W, this.H, 0x0b0d1f, 0.78).setDepth(D),
      this.add
        .text(this.W / 2, this.H * 0.22, 'BRAWL\nPROTO', { fontFamily: FONT, fontSize: '60px', color: '#ffffff', stroke: '#f72585', strokeThickness: 12, align: 'center', lineSpacing: 12 })
        .setOrigin(0.5)
        .setDepth(D + 1),
      this.add
        .text(
          this.W / 2,
          this.H * 0.55,
          HELP_TXT,
          { fontFamily: FONT, fontSize: L.portrait ? '18px' : '14px', color: '#cfd3ff', align: 'center', lineSpacing: 7 }
        )
        .setOrigin(0.5)
        .setDepth(D + 1)
    );
    const tap = this.add
      .text(this.W / 2, this.H * (L.portrait ? 0.74 : 0.86), 'TOUCHE POUR JOUER', { fontFamily: FONT, fontSize: '24px', color: '#ffe9a8', stroke: '#000', strokeThickness: 6 })
      .setOrigin(0.5)
      .setDepth(D + 1);
    this.tweens.add({ targets: tap, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });
    this.ui.push(tap);
  }

  // ----- Choix du perso : grille de cartes (buste) + grand perso en pied + VALIDER --------
  cardTex(id, on) {
    const key = `card_${id}${on ? '_on' : ''}`;
    if (this.textures.exists(key)) return key;
    const NW = 46, NH = 38, K = 8;
    const def = CHARS[id];
    const src = this.textures.get(`${id}_idle0`).getSourceImage();
    const sw = src.width, sh = src.height;
    // zone dessinée du perso : haut de la tête et centre de la tête
    const tmp = document.createElement('canvas');
    tmp.width = sw;
    tmp.height = sh;
    const tc = tmp.getContext('2d');
    tc.drawImage(src, 0, 0);
    const px = tc.getImageData(0, 0, sw, sh).data;
    let top = sh, xs = 0, n = 0;
    for (let y = 0; y < sh && top === sh; y++) for (let x = 0; x < sw; x++) if (px[(y * sw + x) * 4 + 3] > 0) { top = y; break; }
    for (let y = top; y < Math.min(sh, top + 12); y++) for (let x = 0; x < sw; x++) if (px[(y * sw + x) * 4 + 3] > 0) { xs += x; n++; }
    const hx = n ? Math.round(xs / n) : sw / 2;
    const col = Phaser.Display.Color.HexStringToColor(def.cardCol || def.pal.main);
    const border = on ? '#ffd166' : `rgb(${col.red},${col.green},${col.blue})`;
    const mix = (k) => `rgb(${Math.round(26 + (col.red - 26) * k)},${Math.round(29 + (col.green - 29) * k)},${Math.round(51 + (col.blue - 51) * k)})`;
    mkCanvas(this, key, NW, NH, (c) => {
      for (let y = 0; y < NH; y++) {
        const x0 = Math.round(K * (1 - y / (NH - 1))), x1 = x0 + NW - K - 1;
        // fond : sombre en haut, couleur du perso en bas
        c.fillStyle = mix((on ? 0.15 : 0.05) + (y / NH) * (on ? 0.55 : 0.35));
        c.fillRect(x0, y, x1 - x0 + 1, 1);
        // bande claire en diagonale
        const bx = x0 + 10 + Math.round((NH - y) * 0.2);
        c.fillStyle = 'rgba(255,255,255,0.06)';
        c.fillRect(bx, y, 6, 1);
        // le buste, ligne par ligne, coupé au bord de la carte
        const sy = top - 3 + y;
        const sx = hx - Math.round(NW / 2) + 0;
        const from = Math.max(x0 + 2, -sx), to = Math.min(x1 - 1, sw - sx - 1);
        if (sy >= 0 && sy < sh && to >= from) c.drawImage(tmp, sx + from, sy, to - from + 1, 1, from, y, to - from + 1, 1);
        // contour
        c.fillStyle = border;
        if (y < 2 || y >= NH - 2) c.fillRect(x0, y, x1 - x0 + 1, 1);
        else {
          c.fillRect(x0, y, 2, 1);
          c.fillRect(x1 - 1, y, 2, 1);
        }
      }
    }, 'raw');
    return key;
  }

  showSelect() {
    this.clearUi();
    if (typeof MUSIC !== 'undefined') MUSIC.play('menu');
    const D = 100;
    this.state = 'select';
    this.cards = [];
    const ids = playable();
    this.selIds = ids;
    this.selIdx = Math.max(0, ids.indexOf(chosen));
    const P = L.portrait;
    this.ui.push(this.add.rectangle(this.W / 2, this.H / 2, this.W, this.H, 0x0b0d1f, 0.92).setDepth(D));
    this.ui.push(
      this.add
        .text(this.W / 2, P ? 60 : 44, 'CHOISIS TON COMBATTANT', { fontFamily: FONT, fontSize: P ? '22px' : '24px', color: '#ffffff', stroke: '#f72585', strokeThickness: 6 })
        .setOrigin(0.5)
        .setDepth(D + 1)
    );
    const NW = 46, NH = 38, K = 8, cols = ids.length > 6 ? 4 : 3, rows = Math.ceil(ids.length / cols);
    this.selCols = cols;
    // zones : grille (gauche / bas) et grand perso (droite / haut)
    let grid, pane, btnH;
    if (P) {
      btnH = 96;
      const gsc = Math.min(5, Math.floor((this.W - 48) / (cols * NW + (cols - 1) * 3)));
      const gh = rows * NH * gsc + (rows - 1) * 3 * gsc;
      const gy = this.H - 40 - btnH - 40 - gh;
      pane = { x: 40, y: 104, w: this.W - 80, h: gy - 104 - 110 };
      grid = { x: 24, y: gy, w: this.W - 48, h: gh };
    } else {
      btnH = 80;
      const pw = Math.min(430, Math.round(this.W * 0.3));
      pane = { x: this.W - pw - 60, y: 92, w: pw, h: this.H - 92 - btnH - 120 };
      grid = { x: 40, y: 100, w: pane.x - 100, h: this.H - 140 };
    }
    // taille des cartes : un multiple entier des pixels du dessin (net)
    const gap = 3;
    const sc = Math.max(2, Math.min(Math.floor(grid.w / (cols * NW + (cols - 1) * gap)), Math.floor(grid.h / (rows * NH + (rows - 1) * gap)), 7));
    const cw = NW * sc, ch = NH * sc, g = gap * sc;
    const gx0 = grid.x + (grid.w - (cols * cw + (cols - 1) * g)) / 2, gy0 = grid.y + (grid.h - (rows * ch + (rows - 1) * g)) / 2;
    ids.forEach((id, i) => {
      const cx = gx0 + (i % cols) * (cw + g) + cw / 2, cy = gy0 + Math.floor(i / cols) * (ch + g) + ch / 2;
      const img = this.add.image(cx, cy, this.cardTex(id, false)).setScale(sc).setDepth(D + 2);
      this.cardTex(id, true);
      this.ui.push(img);
      this.cards.push({ id, cx, cy, cw, ch, img, sc });
    });
    // grand perso en pied
    this.ui.push(this.add.rectangle(pane.x + pane.w / 2, pane.y + pane.h / 2, pane.w, pane.h, 0x14162a, 1).setDepth(D + 1));
    this.selFrame = this.add.rectangle(pane.x + pane.w / 2, pane.y + pane.h / 2, pane.w, pane.h).setStrokeStyle(6, 0xffffff).setDepth(D + 3);
    this.selGlow = this.add.ellipse(pane.x + pane.w / 2, pane.y + pane.h - 30, pane.w * 0.7, 34, 0x000000, 0.45).setDepth(D + 1);
    const k = Math.max(3, Math.floor(Math.min((pane.h - 30) / 64, (pane.w - 20) / 70)));
    this.selBig = this.add.image(pane.x + pane.w / 2, pane.y + pane.h - 18, `${ids[0]}_idle0`).setOrigin(0.5, 1).setScale(k).setDepth(D + 2);
    this.selBigK = k;
    this.selName = this.add
      .text(pane.x, pane.y + pane.h + (P ? 22 : 18), '', { fontFamily: FONT, fontSize: P ? '34px' : '30px', color: '#ffffff', stroke: '#000', strokeThickness: 6 })
      .setDepth(D + 2);
    const by = P ? this.H - 40 - btnH / 2 : pane.y + pane.h + 80 + btnH / 2;
    const bx = pane.x + pane.w / 2;
    const bw = P ? this.W - 80 : pane.w;
    const btn = this.add.rectangle(bx, by, bw, btnH, 0xf72585, 1).setStrokeStyle(4, 0x000000).setDepth(D + 2);
    const btnT = this.add.text(bx, by, 'VALIDER', { fontFamily: FONT, fontSize: P ? '30px' : '26px', color: '#ffffff', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setDepth(D + 3);
    this.selBtn = { x: bx, y: by, w: bw, h: btnH };
    this.ui.push(this.selFrame, this.selGlow, this.selBig, this.selName, btn, btnT);
    this.tweens.add({ targets: btn, scaleX: 1.03, scaleY: 1.06, duration: 520, yoyo: true, repeat: -1 });
    this.selectCard(this.selIdx);
    // respiration du grand perso
    this.cardTimer = this.time.addEvent({
      delay: 420,
      loop: true,
      callback: () => {
        this.cardFrame = !this.cardFrame;
        const id = this.selIds[this.selIdx];
        if (this.selBig && this.selBig.active) this.selBig.setTexture(`${id}_${this.cardFrame ? 'idle0' : 'idle1'}`);
      },
    });
  }

  selectCard(i) {
    if (!this.cards || !this.cards.length) return;
    i = (i + this.cards.length) % this.cards.length;
    this.selIdx = i;
    this.cards.forEach((c, j) => {
      c.img.setTexture(`card_${c.id}${j === i ? '_on' : ''}`).setScale(j === i ? c.sc * 1.06 : c.sc).setDepth(j === i ? 103 : 102);
      if (j === i) c.img.clearTint();
      else c.img.setTint(0x8a8aa6);
    });
    const id = this.cards[i].id, def = CHARS[id];
    const col = Phaser.Display.Color.HexStringToColor(def.cardCol || def.pal.main).color;
    this.selBig.setTexture(`${id}_idle0`).setScale(this.selBigK / (TEXSCALE[`${id}_idle0`] || 1));
    this.selFrame.setStrokeStyle(6, col);
    this.selName.setText(def.name);
  }

  confirmSelect() {
    const id = this.selIds[this.selIdx];
    if (typeof SFX !== 'undefined' && SFX.play) SFX.play('ui');
    if (onlinePick) onlinePick(id);
    else if (campPick) this.campNew(id);
    else this.startMatch(id);
  }

  selectTap(p) {
    if (this.selBtn && Math.abs(p.x - this.selBtn.x) <= this.selBtn.w / 2 && Math.abs(p.y - this.selBtn.y) <= this.selBtn.h / 2) return this.confirmSelect();
    const i = this.cardAt(p.x, p.y);
    if (i < 0) return;
    if (i === this.selIdx && p.wasTouch === false) return this.confirmSelect(); // double clic à la souris
    this.selectCard(i);
  }

  cardAt(x, y) {
    return this.cards.findIndex((c) => Math.abs(x - c.cx) <= c.cw / 2 && Math.abs(y - c.cy) <= c.ch / 2);
  }

  startMatch(charId) {
    chosen = charId;
    goSelect = false;
    this.clearUi();
    this.state = 'play';
    this.beginMatch(charId);
    enterFullscreen();
  }

  // ----- Interface tactile ------------------------------------------------
  // Disposition des commandes : par défaut (selon MAINS et BOUTONS) ou celle placée par le joueur dans les réglages
  // (SETTINGS.layout.L / .P : position en fraction de l'écran + taille, par commande)
  defaultLayout() {
    const z = SETTINGS.btnSize === 0 ? 0.82 : SETTINGS.btnSize === 2 ? 1.2 : 1;
    const fx = (x) => (SETTINGS.flip ? this.W - x : x);
    const P = L.portrait;
    const at = (lx, ly, px, py) => (P ? [this.W - px * z, this.H - py * z] : [this.W - lx * z, this.H - ly * z]);
    const o = { stick: { x: fx(180), y: this.H - 170, s: 1 } };
    const put = (k, [x, y]) => (o[k] = { x: fx(x), y, s: z });
    put('attack', at(150, 150, 140, 190));
    put('special', at(330, 112, 300, 118));
    put('jump', at(132, 338, 128, 370));
    put('block', at(318, 290, 290, 300));
    return o;
  }

  ctrlLayout() {
    const def = this.defaultLayout();
    const cus = SETTINGS.layout && SETTINGS.layout[L.portrait ? 'P' : 'L'];
    if (!cus) return def;
    const o = {};
    for (const k of CTRL_KEYS) {
      const c = cus[k];
      o[k] = c ? { x: c.fx * this.W, y: c.fy * this.H, s: c.s } : def[k];
    }
    return o;
  }

  buildControlsUi() {
    const D = 90;
    const lay = this.ctrlLayout();
    this.stickHome = { x: lay.stick.x, y: lay.stick.y };
    this.stickS = lay.stick.s;
    this.stickBase = this.add.image(this.stickHome.x, this.stickHome.y, 'stickBase').setScale(PX * this.stickS).setAlpha(0.35).setDepth(D);
    this.stickKnob = this.add.image(this.stickHome.x, this.stickHome.y, 'stickKnob').setScale(PX * this.stickS).setAlpha(0.35).setDepth(D + 1);
    this.ctrlObjs = [this.stickBase, this.stickKnob];
    this.touchObjs = [this.stickBase, this.stickKnob]; // cachés quand on joue au clavier

    const mkBtn = (key, tex, ico) => {
      const c = lay[key];
      const img = this.add.image(c.x, c.y, tex).setAlpha(0.75).setDepth(D);
      const icon = this.add.image(c.x, c.y, ico).setAlpha(0.95).setDepth(D + 1);
      this.ctrlObjs.push(img, icon);
      this.touchObjs.push(img, icon);
      const b = { key, x: c.x, y: c.y, r: CTRL_R[key] * c.s, s: c.s, img, icon, id: null, texW: tex === 'btnAtk' || tex === 'btnHeavy' ? 28 : 24 };
      this.sizeBtn(b);
      return b;
    };
    // 4 boutons : COUP (le plus gros, sous le pouce), SPÉCIAL, SAUT, ESQUIVE
    this.btn = {
      attack: mkBtn('attack', 'btnAtk', 'icoAtk'),
      special: mkBtn('special', 'btnSp', 'icoSp'),
      jump: mkBtn('jump', 'btnJump', 'icoJump'),
      block: mkBtn('block', 'btnBlk', 'icoBlk'),
    };
    // 4 points autour du bouton SPÉCIAL : haut, avant, sans direction, bas (allumés = capacité prête)
    this.spDots = ['uS', 'sS', 'nS', 'dS'].map((k) => {
      const d = this.add.circle(0, 0, 8, 0x3a3f5c).setStrokeStyle(2, 0x000000, 0.6).setDepth(D + 1);
      this.ctrlObjs.push(d);
      this.touchObjs.push(d);
      return { k, d };
    });
    this.placeSpDots();
    this.fsBtn = { x: this.W / 2, y: 40, r: 34 };
    this.ctrlObjs.push(this.add.image(this.fsBtn.x, this.fsBtn.y, 'icoFs').setScale(3).setAlpha(0.6).setDepth(D));
    if (this.buildQuitBtn) this.buildQuitBtn(D);
  }

  // taille d'un bouton tactile (rayon = rayon de base x taille choisie)
  sizeBtn(b) {
    b.r = CTRL_R[b.key] * b.s;
    b.img.setPosition(b.x, b.y).setScale((b.r * 2) / b.texW);
    b.icon.setPosition(b.x, b.y).setScale(PX * b.s);
  }

  // les 3 points de SPÉCIAL : en haut, en bas, et sur le côté qui regarde le centre de l'écran
  placeSpDots() {
    const sb = this.btn.special;
    const dr = sb.r + 12, side = sb.x > this.W / 2 ? -1 : 1;
    const off = { uS: [0, -dr], sS: [side * dr, 0], nS: [-side * dr, 0], dS: [0, dr] };
    this.spDots.forEach(({ k, d }) => d.setPosition(sb.x + off[k][0], sb.y + off[k][1]).setRadius(8 * Math.min(sb.s, 1.2)));
  }

  setupInput() {
    this.input.addPointer(3);
    this.stick = { id: null, ox: 0, oy: 0, sx: 0, sy: 0 };
    this.queue = { jump: false, attack: false, heavy: false, special: false };

    this.input.on('pointerdown', (p) => {
      if (this.state === 'editor') return this.editorDown(p);
      if (p.wasTouch) KB.used = false; // on touche l'écran : retour des boutons tactiles
      if (this.state === 'lobby' || this.state === 'menu' || this.state === 'story') {
        this.uiTap(p);
        return;
      }
      if (this.state === 'title') {
        enterFullscreen();
        this.state = 'gate';
        const gate = typeof ONLINE_OK !== 'undefined' && ONLINE_OK ? Promise.resolve(Auth.ready).then(() => Auth.gate()) : Promise.resolve(true);
        gate.then((ok) => {
          if (ok) {
            sessionReady = true;
            this.showMenu();
          } else this.state = 'title';
        });
        return;
      }
      if (this.state === 'select') {
        this.selectTap(p);
        return;
      }
      if (this.quitTap && this.quitTap(p)) return;
      if (this.over) {
        if (camp && camp.phase === 'match') {
          if (this.campSkip) this.campSkip();
          return;
        }
        if (this.net) return;
        goSelect = true;
        this.scene.restart();
        return;
      }
      if (this.training && this.trainBtns) {
        for (const tb of this.trainBtns) {
          if (Math.abs(p.x - tb.x) <= tb.w / 2 && Math.abs(p.y - tb.y) <= tb.h / 2) {
            tb.fn();
            return;
          }
        }
      }
      if (hyp(p.x - this.fsBtn.x, p.y - this.fsBtn.y) < this.fsBtn.r + 14) {
        toggleFullscreen();
        return;
      }
      // bouton le plus proche du doigt (les zones se touchent)
      let best = null, bd = 1e9;
      for (const b of Object.values(this.btn)) {
        const d = hyp(p.x - b.x, p.y - b.y) / b.r;
        if (b.id === null && d < 1.3 && d < bd) { best = b; bd = d; }
      }
      if (best) {
        best.id = p.id;
        this.queue[best.key] = true;
        best.img.setAlpha(1);
        return;
      }
      if ((this.stickHome.x >= this.W / 2 ? p.x >= this.W * 0.5 : p.x < this.W * 0.5) && this.stick.id === null) {
        this.stick.id = p.id;
        this.stick.ox = p.x;
        this.stick.oy = p.y;
        this.stick.sx = this.stick.sy = 0;
        this.stickBase.setPosition(p.x, p.y).setAlpha(0.9);
        this.stickKnob.setPosition(p.x, p.y).setAlpha(0.95);
      }
    });

    this.input.on('pointermove', (p) => {
      if (this.state === 'editor') return this.editorMove(p);
      if (p.id !== this.stick.id) return;
      let dx = p.x - this.stick.ox;
      let dy = p.y - this.stick.oy;
      const d = hyp(dx, dy);
      const SR = STICK_R * (this.stickS || 1);
      if (d > SR) {
        const k = (d - SR) / d;
        this.stick.ox += dx * k;
        this.stick.oy += dy * k;
        dx = p.x - this.stick.ox;
        dy = p.y - this.stick.oy;
        this.stickBase.setPosition(this.stick.ox, this.stick.oy);
      }
      this.stick.sx = Phaser.Math.Clamp(dx / SR, -1, 1);
      this.stick.sy = Phaser.Math.Clamp(dy / SR, -1, 1);
      this.stickKnob.setPosition(this.stick.ox + this.stick.sx * SR, this.stick.oy + this.stick.sy * SR);
    });

    const release = (p) => {
      if (this.state === 'editor') return this.editorUp(p);
      if (p.id === this.stick.id) {
        this.stick.id = null;
        this.stick.sx = this.stick.sy = 0;
        this.stickBase.setPosition(this.stickHome.x, this.stickHome.y).setAlpha(0.35);
        this.stickKnob.setPosition(this.stickHome.x, this.stickHome.y).setAlpha(0.35);
      }
      for (const b of Object.values(this.btn)) {
        if (b.id === p.id) {
          b.id = null;
          b.img.setAlpha(0.75);
        }
      }
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
  }

  // ----- Bot (adapté au personnage) --------------------------------------
  update(time, delta) {
    if (this.state !== 'play' || this.over) return;
    if (this.quitUi && !this.net) return; // pause pendant la question « quitter ? » (hors ligne)
    if (this.net) {
      this.netUpdate(delta);
      return;
    }
    // pas de temps FIXE (60 Hz) : indispensable pour que deux téléphones simulent exactement le même combat
    this.acc = Math.min((this.acc || 0) + Math.min(delta, 100), STEP_MS * 6);
    while (this.acc >= STEP_MS && !this.over) {
      this.acc -= STEP_MS;
      this.simTick();
    }
    this.updateHud();
  }

  simTick() {
    this.frame++;
    if (this.freezeLeft > 0) {
      this.freezeLeft--;
      return;
    }
    this.simFrames++;
    const now = (this.simNow = this.simFrames * STEP_MS);
    this.nowT = now;
    const dt = 1 / 60;
    this.physicsTick(dt);
    this.runTimers(now);

    const pls = this.pls;
    const multi = pls.length > 2;
    // un joueur parti en pleine partie à plusieurs (entrée « parti ») est éliminé au même moment chez tout le monde
    if (multi && this.netInput) pls.forEach((pl, i) => pl.stocks > 0 && this.curIn[i] === LEFT_IN && this.eliminate(pl, now));
    const ins = pls.map((pl, i) => this.inputFor(pl, this.foeOf(pl), i, now));
    pls.forEach((pl, i) => {
      if (multi && pl.stocks <= 0) return; // éliminé : spectateur
      this.step(pl, this.foeOf(pl), now, dt, ins[i]);
    });
    this.updateProjs(now, dt);
    // chrono : à la fin, plus de vies gagne ; à vies égales, le moins de % ; sinon égalité
    if (this.timeLimit && !this.over && now >= this.timeLimit) this.finish(this.timeWinner());
  }

  // ----- Plusieurs joueurs (salons en ligne jusqu'à 4) -----------------------
  // ennemis encore en jeu (en équipe, pas de coups entre coéquipiers)
  enemiesOf(pl) {
    return this.pls.filter((o) => o !== pl && o.stocks > 0 && o.team !== pl.team);
  }

  // l'ennemi le plus proche (à deux : toujours l'autre joueur)
  foeOf(pl) {
    const pls = this.pls;
    if (pls.length === 2) return pls[0] === pl ? pls[1] : pls[0];
    let best = null, bd = 1e9;
    for (const o of pls) {
      if (o === pl || o.team === pl.team || o.stocks <= 0) continue;
      const d = Math.abs(o.sprite.x - pl.sprite.x) + Math.abs(o.sprite.y - pl.sprite.y);
      if (d < bd) { bd = d; best = o; }
    }
    return best || pls.find((o) => o !== pl) || pl;
  }

  // fin du chrono : le camp avec le plus de vies, puis le moins de % ; null = égalité
  timeWinner() {
    const sides = {};
    for (const p of this.pls) {
      const s = sides[p.team] || (sides[p.team] = { stocks: 0, dmg: 0, best: null });
      s.stocks += Math.max(p.stocks, 0);
      if (p.stocks > 0) s.dmg += Math.round(p.damage);
      if (p.stocks > 0 && (!s.best || p.damage < s.best.damage)) s.best = p;
    }
    const list = Object.values(sides).sort((a, b) => b.stocks - a.stocks || a.dmg - b.dmg);
    if (list.length < 2) return list[0] && list[0].best;
    if (list[0].stocks === list[1].stocks && list[0].dmg === list[1].dmg) return null;
    return list[0].best;
  }

  // retire un joueur de la partie (plus de vies, ou parti) ; la partie s'arrête quand il ne reste qu'un camp
  eliminate(pl, now) {
    pl.stocks = 0;
    pl.ledgeSide = 0;
    pl.atk = null;
    if (pl.grab) this.releaseGrab(pl);
    this.pls.forEach((o) => o.grab && o.grab.victim === pl && this.releaseGrab(o));
    pl.sprite.body.enable = false;
    pl.sprite.setVisible(false);
    pl.tag.setVisible(false);
    if (this.over) return;
    const alive = this.pls.filter((o) => o.stocks > 0);
    const teams = new Set(alive.map((o) => o.team));
    if (teams.size <= 1) this.finish(alive[0] || null);
    else if (!this.resim) this.popup(this.W / 2, L.baseY - 220, (pl.name || pl.def.name) + ' ÉLIMINÉ', '#ff8fa3');
  }

  // le tir touche-t-il un ennemi de son lanceur ? (à plusieurs : le premier touché)
  projVictim(p, now) {
    const sp = p.spec;
    const pcy = sp.bottom ? p.y - sp.h / 2 : p.y;
    for (const v of this.enemiesOf(p.owner)) {
      if (now < v.invulnUntil || v.grab) continue;
      const vb = v.sprite.body;
      if (p.x + sp.w / 2 > vb.x && p.x - sp.w / 2 < vb.right && pcy + sp.h / 2 > vb.y && pcy - sp.h / 2 < vb.bottom) return v;
    }
    return null;
  }

  physicsTick(dt) {
    const w = this.physics.world;
    const bs = w.bodies.entries;
    for (let i = 0; i < bs.length; i++) if (bs[i].enable) bs[i].preUpdate(true, dt);
    if (w.useTree) {
      w.tree.clear();
      w.tree.load(bs);
    }
    const cs = w.colliders.update();
    for (let i = 0; i < cs.length; i++) if (cs[i].active) cs[i].update();
    w.stepsLastFrame = 1;
    w.postUpdate();
  }

  // Les commandes de chaque joueur pour cette image : joystick local, bot, ou (plus tard) réseau
  inputFor(pl, other, i, now) {
    if (this.netInput) return this.netInput(i, now);
    if (this.editing) return { sx: 0, sy: 0 }; // fausse partie derrière l'éditeur de boutons
    if (i === 0 && !this.autoP1) {
      return this.localInput();
    }
    if (this.training && i === 1) return this.dummyInput(pl, other, now);
    return this.botInput(pl, other, now);
  }

  // commandes du joueur sur ce téléphone / cet ordinateur : écran tactile + clavier
  localInput() {
    const q = this.queue, h = KB.held, k = KB.q;
    let sx = this.stick.sx, sy = this.stick.sy;
    const kx = (h.right ? 1 : 0) - (h.left ? 1 : 0), ky = (h.down ? 1 : 0) - (h.up ? 1 : 0);
    if (kx || ky) { sx = kx; sy = ky; }
    const inp = {
      sx, sy,
      jump: q.jump || !!k.jump, attack: q.attack || !!k.attack, heavy: false, special: q.special || !!k.special,
      // SPÉCIAL tenu = charge (et TABLEAU de NATANAX)
      hold: this.btn.special.id !== null || !!h.special || !!this.forceHold, block: this.btn.block.id !== null || !!h.block,
      shold: this.btn.special.id !== null || !!h.special, // SPÉCIAL tenu (TABLEAU de NATANAX)
    };
    q.jump = q.attack = q.heavy = q.special = q.block = false;
    KB.q = {};
    return inp;
  }

  sched(ms, kind, data) {
    this.timers.push({ at: this.simNow + ms, kind, data });
  }

  runTimers(now) {
    if (!this.timers.length) return;
    const due = this.timers.filter((t) => t.at <= now);
    if (!due.length) return;
    this.timers = this.timers.filter((t) => t.at > now);
    due.forEach((t) => this.fireTimer(t, now));
  }

  fireTimer(t, now) {
    const d = t.data;
    const pl = d.pi === undefined ? null : this.pl(d.pi);
    if (t.kind === 'double') {
      if (pl.atk && pl.atk.id === d.aid && !this.over && pl.stocks > 0) {
        this.spawnProj(pl, this.foeOf(pl), pl.atk.m, now, 7);
        this.muzzle(pl, 1);
      }
    } else if (t.kind === 'dive') {
      if (pl.atk && pl.atk.id === d.aid) pl.sprite.setVelocityY(pl.atk.m.dive);
    } else if (t.kind === 'rise') {
      const a = pl.atk;
      if (!a || a.id !== d.aid) return;
      if (a.m.type === 'carry') a.carryUntil = now + a.m.carryMs;
      else {
        pl.sprite.setVelocityY(-a.m.rise);
        if (a.m.riseX) pl.sprite.setVelocityX(a.rdir * a.m.riseX * (1 - (pl.tumble || 0)));
      }
    } else if (t.kind === 'skill') {
      if (pl.atk && pl.atk.id === d.aid) this.niniSkillFire(pl, pl.atk.m, d.key, now);
    } else if (t.kind === 'book') {
      this.bookLand(pl, this.foeOf(pl), d, now);
    } else if (t.kind === 'lunge') {
      if (pl.atk && pl.atk.id === d.aid) pl.sprite.setVelocityX(pl.facing * pl.atk.m.lunge);
    } else if (t.kind === 'vanish') {
      if (pl.atk && pl.atk.id === d.aid && pl.stocks > 0 && !this.over) this.bzVanish(pl, now);
    } else if (t.kind === 'blink') {
      if (pl.atk && pl.atk.id === d.aid && pl.stocks > 0 && !this.over) this.doBlink(pl, now);
    } else if (t.kind === 'pit') {
      if (pl.atk && pl.atk.id === d.aid && pl.stocks > 0 && !this.over) this.lnPit(pl, now);
    } else if (t.kind === 'rewind') {
      if (pl.atk && pl.atk.id === d.aid && pl.stocks > 0 && !this.over) this.doRewind(pl, now);
    } else if (this.nxTimer && t.kind.startsWith('nx')) {
      this.nxTimer(t, pl, now);
    }
  }

  pl(i) {
    return this.pls ? this.pls[i] : i === 0 ? this.p1 : this.p2;
  }

  // directions : neutre ('n', doigt au centre), avant ('s'), haut ('u'), bas ('d')
  // haut / bas seulement si on pousse franchement : une diagonale reste « avant »
  aimOf(pl, inp) {
    const sx = inp.sx || 0, sy = inp.sy || 0;
    if (hyp(sx, sy) < 0.4) return 'n';
    if (sy < -0.55 && -sy >= Math.abs(sx) * 0.8) return 'u';
    if (sy > 0.55 && sy >= Math.abs(sx) * 0.8) return 'd';
    return 's';
  }

  // Grammaire commune (voir kits.js) : kind 'L' (léger), 'H' (lourd), 'S' (spéciale)
  //  au sol  : nL (enchaînement) sL uL dL · sH uH dH (neutre = avant) · nS uS dS
  //  en l'air: sA uA dA (neutre = avant) · uAH (lourd haut / avant / neutre = retour) dAH (lourd bas) · spéciales (nSA… si elles existent)
  moveKey(pl, aim, grounded, kind) {
    if (kind === 'H') return grounded ? { n: 'sH', s: 'sH', u: 'uH', d: 'dH' }[aim] : aim === 'd' ? 'dAH' : 'uAH';
    if (kind === 'S') {
      const mv = pl.def.moves;
      let k = { n: 'nS', s: 'sS', u: 'uS', d: 'dS' }[aim];
      if (!mv[k] && k === 'sS') k = 'nS'; // (persos en réserve : une seule spéciale de côté)
      if (grounded) return k;
      if (k === 'dS' && mv.dAS) return 'dAS'; // en l'air, bas = plongeon
      return mv[k + 'A'] ? k + 'A' : k;
    }
    return grounded ? { n: 'nL', s: 'sL', u: 'uL', d: 'dL' }[aim] : { n: 'sA', s: 'sA', u: 'uA', d: 'dA' }[aim];
  }

  step(pl, other, now, dt, inp) {
    const s = pl.sprite;
    const b = s.body;
    const def = pl.def;
    const grounded = !pl.ledgeSide && (b.blocked.down || b.touching.down);
    let stunned = now < pl.stunUntil;
    if (grounded) this.landReset(pl);
    if (def.rewind) this.zRecord(pl, now); // CTRL+Z d'AdieuLescure : on garde la trace de la dernière seconde
    // --- tampon d'entrée : un appui fait un peu trop tôt part dès que c'est possible
    if (inp.attack) { pl.bufAtk = now + BUF_MS; pl.bufHeavy = pl.bufSp = 0; }
    if (inp.heavy) { pl.bufHeavy = now + BUF_MS; pl.bufAtk = pl.bufSp = 0; }
    if (inp.special) { pl.bufSp = now + BUF_MS; pl.bufAtk = pl.bufHeavy = 0; }
    // direction au moment de l'appui (si le coup part un peu plus tard et que le joystick est relâché entre-temps)
    if (inp.attack || inp.heavy || inp.special) pl.bufAim = this.aimOf(pl, inp);
    if (inp.jump) pl.bufJump = now + BUF_MS;
    pl.sHold = !!inp.shold; // SPÉCIAL tenu
    const dEdge = !!inp.block && !pl.prevBlock;
    pl.prevBlock = !!inp.block;
    if (dEdge) pl.bufDodge = now + BUF_MS;
    pl.lastSx = inp.sx || 0;
    pl.lastSy = inp.sy || 0;
    // CHARME (alliance de Nini) : plus aucune commande, attiré vers Nini
    const charmed = now < pl.charmUntil && other.stocks > 0;
    if (charmed) {
      const dxc = other.sprite.x - s.x;
      inp = { sx: Math.abs(dxc) > 70 ? Math.sign(dxc) * Math.min(200 / def.speed, 1) : 0, sy: 0, jump: false, attack: false, hold: false, block: false };
      pl.bufAtk = pl.bufHeavy = pl.bufSp = pl.bufJump = pl.bufDodge = 0;
      pl.charmFx = true;
      if (now - (pl.lastHeart || 0) > 260) { pl.lastHeart = now; this.heartFx(s.x + (Math.random() - 0.5) * 30, s.y - 50, 1.4); }
    } else if (pl.charmFx) {
      pl.charmFx = false;
    }
    // RAS-LE-BOL (Nini)
    const raging = now < pl.rageUntil;
    if (raging && now - (pl.lastAura || 0) > 70) {
      pl.lastAura = now;
      const q = this.add.rectangle(s.x + (Math.random() - 0.5) * 50, s.y + 20 + Math.random() * 20, 7, 7, Math.random() < 0.5 ? 0xff2b2b : 0xffa23b).setDepth(9);
      this.tweens.add({ targets: q, y: q.y - 70 - Math.random() * 40, alpha: 0, duration: 420, onComplete: () => q.destroy() });
    }

    // on regarde du côté où l'on pousse le joystick (pas pendant un coup, une prise, au rebord ou sonné)
    if (!pl.grab && !pl.atk && !pl.ledgeSide && !stunned && Math.abs(inp.sx || 0) > 0.3) {
      const nf = inp.sx > 0 ? 1 : -1;
      if (nf !== pl.facing) {
        pl.facing = nf;
        pl.flipAt = now;
      }
    }
    s.setFlipX(pl.facing < 0);

    // fin du coup ; après un coup de retour en l'air : chute impuissante jusqu'au sol
    if (pl.atk && now >= pl.atk.end) pl.atk = null; // plus de chute impuissante : le coup de retour se fait une fois par saut

    let rolling = false;
    if (pl.ledgeSide) {
      this.ledgeStep(pl, other, now, inp);
    } else {
      // sortie d'étourdissement : après 25 images, une esquive aérienne coupe l'éjection
      if (stunned && !grounded && pl.bufDodge >= now && !pl.airDodged && now - pl.stunStart >= STUN_ESCAPE) {
        pl.stunUntil = now;
        stunned = false;
      }
      // une esquive annule la charge du handball
      if (!stunned && pl.atk && pl.atk.charging && pl.bufDodge >= now) {
        pl.atk = null;
        pl.cdUntil = now;
        this.clearCharge(pl);
      }
      // --- ESQUIVES (façon Brawlhalla) : sur place, sprint (au sol + côté), esquive aérienne, poursuite après un coup
      const free = !stunned && !pl.atk && !pl.grab && !pl.helpless && now >= pl.dodgeLock;
      // un coup LÉGER qui vient de toucher peut être coupé par l'esquive de poursuite
      const lightHit = !stunned && !pl.grab && pl.atk && pl.atk.landed && pl.atk.m.light && now >= pl.atk.landed + 2 * STEP_MS;
      if ((free || lightHit) && pl.bufDodge >= now && pl.chaseLeft > 0 && now < pl.chaseUntil && !(grounded && Math.abs(inp.sx) > 0.5)) {
        // ESQUIVE DE POURSUITE : juste après avoir touché, une esquive rapide dans n'importe quelle direction (sauf en
        // arrière), sans recharge : pour coller à l'adversaire et enchaîner
        if (pl.atk) { pl.atk = null; pl.cdUntil = now; }
        pl.bufDodge = 0;
        pl.chaseLeft--;
        const mag = hyp(inp.sx, inp.sy);
        let dx = mag > 0.4 ? inp.sx / mag : pl.facing, dy = mag > 0.4 ? inp.sy / mag : 0;
        if (dx * pl.facing < 0) { dx = 0; dy = dy || -1; }
        s.setVelocity(dx * 620, dy * 520 - 40);
        pl.dodgeUntil = pl.invulnUntil = Math.max(pl.invulnUntil, now + 260);
        pl.dodgeLock = now + 180;
        pl.chaseAtkUntil = now + 330; // une attaque pendant la poursuite la coupe
        this.ghost(pl, 0xffe27a);
        this.sfx('dodge');
      } else if (free && pl.bufDodge >= now && now >= pl.rollUntil) {
        if (grounded && Math.abs(inp.sx) > 0.5 && now >= pl.dashCd) {
          // SPRINT : élan rapide (sans invincibilité), qu'on peut couper par un saut ou une attaque
          pl.bufDodge = 0;
          pl.dashCd = now + 350;
          pl.rollDir = Math.sign(inp.sx);
          pl.facing = pl.rollDir;
          pl.rollUntil = now + 210;
          pl.sprintDir = pl.rollDir;
          this.dust(s.x, b.bottom, -pl.rollDir, 4, def.fx);
          this.sfx('dodge');
        } else if (grounded && now >= pl.dodgeCd) {
          pl.bufDodge = 0;
          pl.dodgeCd = now + 1000;
          {
            pl.dodgeLock = now + 367;
            pl.dodgeUntil = pl.invulnUntil = Math.max(pl.invulnUntil, now + 267);
            s.setVelocityX(0);
          }
          this.sfx('dodge');
        } else if (!grounded && !pl.airDodged) {
          pl.bufDodge = 0;
          pl.airDodged = true;
          const mag = hyp(inp.sx, inp.sy);
          if (mag > 0.4) {
            s.setVelocity((inp.sx / mag) * 480, (inp.sy / mag) * 420 - 40);
            pl.dodgeUntil = pl.invulnUntil = Math.max(pl.invulnUntil, now + 200);
            pl.dodgeLock = now + 300;
          } else {
            s.setVelocity(b.velocity.x * 0.4, Math.min(b.velocity.y, 0) * 0.3);
            pl.dodgeUntil = pl.invulnUntil = Math.max(pl.invulnUntil, now + 333);
            pl.dodgeLock = now + 333;
            // GRAVITY CANCEL : juste après une esquive aérienne sur place, une attaque fait le coup du SOL en l'air
            pl.gcUntil = now + 300;
          }
          this.ghost(pl, 0x9fd8ff);
          this.sfx('dodge');
        }
      }
      rolling = now < pl.rollUntil;
      const spotLock = now < pl.dodgeLock;
      // le sprint continue tant qu'on garde le joystick du même côté au sol
      if (pl.sprintDir && (!grounded || Math.sign(inp.sx || 0) !== pl.sprintDir || Math.abs(inp.sx) < 0.5 || pl.atk || stunned)) pl.sprintDir = grounded || stunned ? 0 : pl.sprintDir;

      if (!stunned) {
        const charging = !!(pl.atk && pl.atk.charging);
        const moveLocked = (pl.atk && !charging && now < pl.atk.moveLock) || (spotLock && grounded);
        const dashing = pl.atk && pl.atk.m.dashV && now >= pl.atk.hitAt && now < pl.atk.hitAt + (pl.atk.m.active || 0);
        if (rolling && !pl.atk) {
          s.setVelocityX(pl.rollDir * def.speed * 1.9);
        } else if (dashing) {
          // élan tenu pendant tout le coup (CHARGE DU TAUREAU, ÉCHAPPÉE) ; un lourd chargé va plus loin
          const f = pl.atk.chg && pl.atk.m.chargeMax ? Math.min(pl.atk.chg / pl.atk.m.chargeMax, 1) : 0;
          s.setVelocityX(pl.facing * pl.atk.m.dashV * (1 + 0.5 * f) * (now < (pl.tyreUntil || 0) ? 1.3 : 1));
        } else if (!moveLocked) {
          let spd = def.speed * (raging ? 1.12 : 1) * (pl.spdMul || 1) * (pl.sprintDir ? 1.35 : 1);
          if (charging) spd *= pl.atk.m.walk || 0;
          if (now < pl.slowUntil) spd *= 0.5;
          if (pl.helpless) spd *= 0.7;
          if (!grounded && pl.tumble) spd *= 1 - pl.tumble;
          const target = Math.abs(inp.sx) > 0.2 ? inp.sx * spd : 0;
          const a = (grounded ? 3000 : 1500) * dt;
          s.setVelocityX(b.velocity.x + Phaser.Math.Clamp(target - b.velocity.x, -a, a));
        } else {
          s.setVelocityX(b.velocity.x * 0.96);
        }
        // saut
        if (pl.bufJump >= now && pl.jumps > 0 && now - pl.lastJump > 140 && !pl.grab && !pl.helpless && !spotLock && !charging) {
          pl.bufJump = 0;
          if (rolling) { pl.rollUntil = now; s.setVelocityX(pl.rollDir * def.speed * 1.6); } // saut d'élan
          s.setVelocityY(-def.jump);
          pl.jumps--;
          pl.lastJump = now;
          this.sfx('jump');
        }
        // chute rapide
        if (inp.sy > 0.75 && !grounded && !pl.atk && b.velocity.y > -50) s.setVelocityY(Math.max(b.velocity.y, FAST_FALL));
        // BAS tenu 0,15 s sur une plateforme fine : on la traverse
        if (grounded && inp.sy > 0.7 && Math.abs(inp.sx) < 0.5 && b.bottom < L.baseY - 4 && !pl.atk) {
          pl.downHold++;
          if (pl.downHold >= 9) {
            pl.dropUntil = now + 250;
            pl.downHold = 0;
            s.setVelocityY(150);
          }
        } else pl.downHold = 0;
        // attaque : LÉGER / LOURD / SPÉCIAL + direction
        const wantL = pl.bufAtk >= now, wantH = pl.bufHeavy >= now, wantS = pl.bufSp >= now;
        const gc = !grounded && now < (pl.gcUntil || 0);
        if ((wantL || wantH || wantS) && !pl.grab && (!spotLock || now < (pl.chaseAtkUntil || 0) || gc) && !pl.helpless) {
          const a0 = pl.atk;
          let aim = this.aimOf(pl, inp);
          if (aim === 'n' && pl.bufAim && pl.bufAim !== 'n') aim = pl.bufAim;
          const kind = wantH ? 'H' : wantS ? 'S' : 'L';
          const gnd = grounded || gc; // Gravity Cancel : on choisit le coup du sol
          const nextKey = this.moveKey(pl, aim, gnd, kind);
          // ENCHAÎNEMENT : LÉGER sans direction pendant le coup = coup suivant de la chaîne (même s'il a raté)
          const fm = this.famMoves ? this.famMoves(pl) : pl.def.moves;
          const chainLen = a0 && a0.chainKey && fm[a0.chainKey] ? (fm[a0.chainKey].chain || []).length : 0;
          const chainNext = kind === 'L' && aim === 'n' && a0 && a0.chainKey && now >= a0.hitAt + 2 * STEP_MS && a0.chainIdx < chainLen;
          // COMBO : un léger qui a TOUCHÉ peut être coupé par un autre coup (léger différent, lourd ou spéciale), 3 fois au plus
          // RELANCE : une spéciale marquée relance qui a touché peut être coupée par un COUP
          const cancel = !!(a0 && a0.landed && (a0.m.light || (a0.m.relance && kind === 'L')) && now >= a0.landed + 2 * STEP_MS && (a0.cancels || 0) < 3 && nextKey !== a0.key && pl.def.moves[nextKey]);
          if (chainNext) {
            pl.bufAtk = 0;
            this.startChain(pl, now);
          } else if (now > pl.cdUntil || cancel) {
            pl.bufAtk = pl.bufHeavy = pl.bufSp = 0;
            if (rolling) pl.rollUntil = now; // une attaque coupe le sprint
            if (spotLock) pl.dodgeLock = now; // ... et l'esquive de poursuite
            if (gc) {
              // l'attaque met fin à l'esquive
              pl.gcUntil = 0;
              if (now < pl.dodgeUntil) pl.dodgeUntil = pl.invulnUntil = now;
            }
            const n0 = cancel ? (a0.cancels || 0) + 1 : 0;
            if (cancel) { pl.atk = null; pl.cdUntil = now; }
            this.startAttack(pl, nextKey, grounded, now, inp, gc);
            if (pl.atk && cancel) pl.atk.cancels = n0;
          }
        }
      } else {
        s.setVelocityX(b.velocity.x * (1 - 0.8 * dt));
      }
    }

    // BOND DU CHAT : Scarlett quitte les épaules, bondit devant Nini puis revient (simple visuel)
    if (pl.atk && pl.atk.m.cat && !this.resim) {
      const a = pl.atk, m = a.m;
      const t = now - a.start;
      const far = m.startup + (m.active || 0) * 0.5;
      const k = t < far ? t / far : Math.max(0, 1 - (t - far) / Math.max(m.total - far, 1));
      const e = 1 - (1 - k) * (1 - k);
      const bc = b.center;
      const x0 = bc.x + pl.facing * 12, y0 = bc.y - 30;
      const x1 = bc.x + pl.facing * (m.ox + 6), y1 = bc.y + (m.oy || 0) - 4;
      const cxp = x0 + (x1 - x0) * e, cyp = y0 + (y1 - y0) * e - Math.sin(e * Math.PI) * 34;
      if (!pl.catImg) pl.catImg = this.add.image(cxp, cyp, 'scarlett').setScale(PX).setDepth(12);
      pl.catImg.setTexture(raging ? 'scarlett_r' : 'scarlett').setPosition(cxp, cyp).setFlipX(pl.facing < 0).setAngle(pl.facing * (t < far ? -12 : 10));
    } else if (pl.catImg) {
      pl.catImg.destroy();
      pl.catImg = null;
    }

    // Parasol de Nini : chute ralentie
    if (pl.atk && pl.atk.m.type === 'float') {
      if (b.velocity.y > 90) s.setVelocityY(90);
      if (!pl.umb && !this.resim) pl.umb = this.add.image(s.x, s.y - 74, 'umbrella').setScale(PX).setDepth(11);
      if (pl.umb) pl.umb.setPosition(s.x + pl.facing * 4, s.y - 70).setFlipX(pl.facing < 0);
    } else if (pl.umb) { pl.umb.destroy(); pl.umb = null; }

    // Aigle de Denodoom en l'air : il l'emporte vers le haut
    if (pl.atk && pl.atk.m.type === 'carry' && pl.atk.carryUntil && now < pl.atk.carryUntil) {
      s.setVelocity(pl.atk.rdir * pl.atk.m.riseX * (1 - (pl.tumble || 0)), -pl.atk.m.carrySpeed);
      if (!pl.carryImg && !this.resim) pl.carryImg = this.add.image(s.x, s.y - 70, 'eagle0').setScale(3).setDepth(27);
      if (pl.carryImg) pl.carryImg.setPosition(s.x, s.y - 66).setTexture(Math.floor(now / 85) % 2 ? 'eagle1' : 'eagle0').setFlipX(pl.atk.rdir < 0);
    } else if (pl.carryImg) {
      const eg = pl.carryImg;
      pl.carryImg = null;
      if (this.resim) eg.destroy();
      else this.tweens.add({ targets: eg, y: eg.y - 160, alpha: 0, duration: 380, onComplete: () => eg.destroy() });
    }

    // Prise en cours
    if (pl.grab) this.updateGrab(pl, now);

    // Tir de handball : charge tant que le bouton est maintenu
    if (pl.atk && pl.atk.charging) {
      const a = pl.atk;
      const el = now - a.start;
      a.lv = Math.min(Math.max(el - 130, 0) / (a.m.chargeMs - 130), 1);
      this.chargeUi(pl, a.lv, now);
      if (el > 130 && (!inp.hold || el > a.m.chargeMs + 450)) {
        a.charging = false;
        a.pose = 'throwBall';
        a.end = now + 300;
        a.moveLock = now + 200;
        pl.cdUntil = now + 300;
        this.clearCharge(pl);
        pl.sprite.setVelocityX(-pl.facing * 120);
        this.spawnBall(pl, a.m, a.lv, now);
      }
    } else if (pl.chgBg) this.clearCharge(pl);

    // LOURD CHARGÉ : garder LOURD appuyé retient le coup juste avant qu'il parte (m.chargeMax ms au plus)
    if (pl.atk && pl.atk.m.chargeMax && !pl.atk.done && !pl.atk.chgShut && now < pl.atk.hitAt && pl.atk.hitAt - now <= STEP_MS + 0.01) {
      const a = pl.atk;
      if (inp.hold && (a.chg || 0) < a.m.chargeMax) {
        a.chg = (a.chg || 0) + STEP_MS;
        s.setVelocityX(b.velocity.x * 0.85); // on se plante pour charger
        a.hitAt += STEP_MS;
        a.end += STEP_MS;
        a.moveLock += STEP_MS;
        pl.cdUntil += STEP_MS;
        // les minuteries du coup (élan, plongeon…) attendent aussi
        for (const t of this.timers) if (t.data && t.data.aid === a.id && t.data.pi === pl.i) t.at += STEP_MS;
        if (a.chg >= a.m.chargeMax - 0.01 && !this.resim) this.popup(s.x, s.y - 90, 'MAX !', '#ffe9a8');
      } else a.chgShut = true;
    }

    // Fenêtre active : frappe, projectile ou prise
    if (pl.atk && !pl.atk.done) {
      const m = pl.atk.m;
      if (m.type === 'proj') {
        if (now >= pl.atk.hitAt) {
          pl.atk.done = true;
          this.spawnProj(pl, other, m, now);
          if (m.double) this.sched(m.double, 'double', { pi: pl.i, aid: pl.atk.id });
        }
      } else if (now >= pl.atk.hitAt && now < pl.atk.hitAt + m.active) {
        const bc = b.center;
        const box = new Phaser.Geom.Rectangle(bc.x + pl.facing * m.ox - m.w / 2, bc.y + m.oy - m.h / 2, m.w, m.h);
        const victims = this.pls.length > 2 ? this.enemiesOf(pl) : [other];
        // un coup au corps-à-corps détruit les petits projectiles adverses (orbes, balles, anneau, mine)
        for (const p of this.projs) {
          if (p.dead || !victims.includes(p.owner) || !p.spec.small) continue;
          const ph = p.spec;
          if (p.x + ph.w / 2 > box.x && p.x - ph.w / 2 < box.right && p.y + ph.h / 2 > box.y && p.y - ph.h / 2 < box.bottom) {
            this.killProj(p, true);
            this.sfx('parry');
          }
        }
        // la silhouette de billets de l'adversaire encaisse le coup à sa place
        for (const v of victims) if (!pl.atk.done && this.bzDecoyHit && this.bzDecoyHit(pl, v, box, now)) pl.atk.done = true;
        // à plusieurs, un même coup peut toucher plusieurs ennemis dans la même image (une prise : un seul)
        const wasDone = pl.atk.done;
        let hitOne = false;
        for (const v of victims) {
          if (wasDone || (hitOne && m.type === 'grab')) break;
          const vb = v.sprite.body;
          const vr = new Phaser.Geom.Rectangle(vb.x, vb.y, vb.width, vb.height);
          const vGround = vb.blocked.down || vb.touching.down;
          if (now >= v.invulnUntil && v.stocks > 0 && !v.grab && (!m.groundOnly || vGround) && Phaser.Geom.Intersects.RectangleToRectangle(box, vr)) {
            hitOne = true;
            pl.atk.done = true;
            pl.atk.landed = now;
            const dir = Math.sign(v.sprite.x - s.x) || pl.facing;
            if (m.type === 'grab') this.startGrab(pl, v, m, now);
            else this.applyHit(pl, v, this.charged(m, pl.atk), now, dir, null, pl.atk.end - now);
            if (!pl.atk) break;
          }
        }
      } else if (now >= pl.atk.hitAt + m.active) pl.atk.done = true;
    }

    // Rebord : on s'y accroche automatiquement en tombant près du coin du terrain
    // (en tombant, ou en montant sous le niveau du bord : saut, coup de retour)
    if (!pl.ledgeSide && !grounded && !stunned && now >= pl.ledgeCdUntil && !rolling) {
      const underLip = b.top > L.baseY - 10;
      const recovering = pl.atk && pl.atk.m.helpless && now >= pl.atk.hitAt;
      if ((b.velocity.y >= -60 && (!pl.atk || pl.helpless)) || (underLip && (!pl.atk || recovering || pl.helpless))) this.tryLedge(pl, other, now);
    }

    // Animation
    let name;
    if (stunned) name = 'hurt';
    else if (pl.ledgeSide) name = 'jump';
    else if (pl.atk) name = pl.atk.m.prePose && now < pl.atk.hitAt ? pl.atk.m.prePose : pl.atk.m.anim && pl.atk.pose === pl.atk.m.pose ? pl.atk.m.anim[Math.floor(now / 90) % 2] : pl.atk.pose || pl.atk.m.pose;
    else if (rolling) name = Math.floor(now / 70) % 2 ? 'run0' : 'run1';
    else if (!grounded) name = 'jump';
    else if (Math.abs(b.velocity.x) > 60) name = Math.floor(now / 130) % 2 ? 'run0' : 'run1';
    else name = Math.floor(now / 450) % 2 ? 'idle0' : 'idle1';
    s.setTexture(`${pl.char}_${name}${raging && pl.char === 'nini' ? '_r' : ''}${def.money && now < (pl.goldUntil || 0) ? '_g' : ''}${def.cap && this.nxCapOut(pl) ? '_n' : ''}`);
    if (def.idleFx && !this.resim) this.idleFx(pl, name, now);
    // teinte décidée à chaque image d'après l'état (jamais par minuterie : en ligne, un rejeu sautait la minuterie
    // et le perso restait tout blanc)
    if (now < (pl.flashUntil || 0)) s.setTintFill(pl.flashCol || 0xffffff);
    else if (charmed) s.setTint(0xffb0d8);
    else if (pl.atk && pl.atk.chg && now < pl.atk.hitAt) s.setTint(Math.floor(now / 60) % 2 ? 0xfff0a0 : 0xffffff); // lourd en charge
    else if (pl.atk && now < pl.armorUntil && pl.def.stone) s.setTint(0xb8b0a4); // PEAU DE PIERRE
    else if (pl.shade) s.setTint(pl.shade);
    else if (s.isTinted) s.clearTint();
    s.setAlpha(now < pl.dodgeUntil ? 0.4 : now < pl.invulnUntil ? (Math.floor(now / 90) % 2 ? 0.35 : 0.8) : pl.helpless ? 0.75 : 1);
    pl.tag.setPosition(s.x, s.y - 66).setVisible(pl.stocks > 0 && !(now < (pl.invisUntil || 0)));
    if (this.bzStep) this.bzStep(pl, other, now);
    // COUPABLE ! : un petit marteau de juge au-dessus de la tête (affichage seulement)
    if (now < (pl.markUntil || 0) && pl.stocks > 0) {
      if (!pl.markImg && !this.resim) pl.markImg = this.add.text(s.x, s.y - 96, '§', { fontFamily: FONT, fontSize: '26px', color: '#ffd166', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setDepth(41);
      if (pl.markImg) pl.markImg.setPosition(s.x, s.y - 92 + Math.sin(now / 120) * 3).setAlpha(pl.markUntil - now < 1000 && Math.floor(now / 100) % 2 ? 0.3 : 1);
    } else if (pl.markImg) {
      pl.markImg.destroy();
      pl.markImg = null;
    }
    // CHAUFFE pleine : flammèches autour de Toro
    if (pl.def.heat && (pl.heat || 0) >= 100 && !this.resim && now - (pl.heatFx || 0) > 90) {
      pl.heatFx = now;
      this.flame(s.x + (Math.random() - 0.5) * 40, s.y + 10, pl.def.fx);
    }

    // Zones de KO (mêmes distances depuis le centre en portrait et en paysage).
    // Côtés et haut : on n'y meurt que projeté par l'adversaire (encore étourdi, + une petite marge). Seul (saut,
    // retour, élan d'un coup…), on bute sur un mur invisible juste avant. En bas : on meurt toujours (retour raté).
    const cx = this.W / 2;
    const out = s.x < cx - BLAST_X || s.x > cx + BLAST_X || s.y < L.baseY - BLAST_TOP;
    const launched = now < pl.stunUntil + KO_GRACE || !!(pl.grab || this.pls.some((o) => o.grab && o.grab.victim === pl));
    if (s.y > L.baseY + BLAST_BOTTOM || (out && launched)) return this.die(pl, now);
    if (launched) return;
    const bd = s.body;
    if (s.x < cx - BLAST_X + WALL_IN && bd.velocity.x < 0) bd.setVelocityX(0);
    if (s.x > cx + BLAST_X - WALL_IN && bd.velocity.x > 0) bd.setVelocityX(0);
    if (s.y < L.baseY - BLAST_TOP + WALL_IN && bd.velocity.y < 0) bd.setVelocityY(0);
  }

  // key : clé du coup (voir moveKey) ; gc : coup du sol fait en l'air (Gravity Cancel)
  startAttack(pl, key, grounded, now, inp, gc) {
    const mv = this.famMoves ? this.famMoves(pl) : pl.def.moves;
    let m = mv[key];
    if (!m) return;
    if (this.nxPick) { m = this.nxPick(pl, m, now); if (!m) return; } // NATANAX : casquette partie, RÉACTION EN CHAÎNE
    // coup de côté : on se tourne d'abord du côté poussé
    if (inp && Math.abs(inp.sx || 0) > 0.2 && this.aimOf(pl, inp) === 's') {
      pl.facing = inp.sx > 0 ? 1 : -1;
      pl.sprite.setFlipX(pl.facing < 0);
    }
    const cdKey = m.cdKey || key;
    // un coup pour remonter (recovery) n'a jamais de recharge en l'air : on peut toujours revenir
    if ((m.cd || m.cooldown) && now < (pl.moveCd[cdKey] || 0) && !(m.recovery && !grounded)) {
      const b0 = pl.sprite.body.center;
      this.popup(b0.x, b0.y - 70, 'PAS ENCORE', '#ffd1e6');
      pl.cdUntil = now + 250;
      return;
    }
    // invisible (DOUBLURE) : attaquer fait réapparaître
    if (now < (pl.invisUntil || 0) && this.bzReveal) this.bzReveal(pl, now);
    // ÉRUPTION (Toro) : il faut un peu de CHAUFFE ; l'explosion grandit avec la jauge, qui se vide
    if (m.type === 'burst') {
      const heat = pl.heat || 0;
      if (heat < (m.minHeat || 25)) {
        const b0 = pl.sprite.body.center;
        this.popup(b0.x, b0.y - 70, 'PAS ASSEZ CHAUD', '#ffb347');
        pl.cdUntil = now + 250;
        return;
      }
      const lv = heat / 100;
      m = Object.assign({}, m, { type: 'melee', w: Math.round(m.w * (0.75 + 0.5 * lv)), h: Math.round(m.h * (0.75 + 0.5 * lv)), dmg: Math.round(m.dmg + m.dmgHeat * lv), kb: Math.round(m.kb + m.kbHeat * lv), ks: m.ks + m.ksHeat * lv, burstLv: lv });
      pl.heat = 0;
    }
    // une seule fois par temps en l'air (capacités qui font bouger : parasol, charge, cornes, téléport…)
    if (!grounded && m.onceAir && pl[m.onceAir + 'Used']) { pl.cdUntil = now + 150; return; }
    if (!grounded && m.type === 'pit') { pl.cdUntil = now + 150; return; } // ARRÊT AU STAND : seulement au sol
    if (!grounded && m.helpless && pl.recUsed) { pl.cdUntil = now + 150; return; }
    // nombre d'objets limité à l'écran
    if (m.max && m.proj) {
      const mine = this.projs.filter((p) => !p.dead && p.owner === pl && p.spec.kind === m.proj.kind && p.spec.tex === m.proj.tex);
      if (mine.length >= m.max) {
        if (m.replace) mine.slice(0, mine.length - m.max + 1).forEach((p) => this.killProj(p, true));
        else { pl.cdUntil = now + 120; return; }
      }
    }
    if (now < pl.rageUntil) m = { ...m, startup: m.startup * 0.75, total: m.total * 0.75, active: m.active ? m.active * 0.75 : m.active };
    if (m.type === 'charge') {
      // ballon de handball : on maintient pour charger (on peut marcher lentement), on relâche pour tirer
      pl.atk = { id: ++this.atkSeq, m, key, pose: m.pose, start: now, hitAt: 1e15, end: now + m.chargeMs + 1600, moveLock: 0, done: true, charging: true, lv: 0 };
      pl.cdUntil = now + m.chargeMs + 1600;
      pl.sprite.setVelocityX(pl.sprite.body.velocity.x * 0.3);
      return;
    }
    pl.atk = { id: ++this.atkSeq, m, key, pose: m.pose, start: now, hitAt: now + m.startup, end: now + m.total, moveLock: now + m.startup + (m.active || 0), done: false };
    if (m.chain) {
      pl.atk.chainKey = key;
      pl.atk.chainIdx = 0;
    }
    pl.cdUntil = now + m.total;
    const s = pl.sprite;
    if (m.turn) pl.facing = -pl.facing; // coup donné dos à l'adversaire (ruade)
    // élan : tout de suite, sauf pour un lourd qui se charge (il part au moment de frapper)
    if (m.lunge && !m.chargeMax) s.setVelocityX(pl.facing * m.lunge);
    if (m.lunge && m.chargeMax) this.sched(m.startup, 'lunge', { pi: pl.i, aid: pl.atk.id });
    if (m.liftAir && !grounded) s.setVelocityY(Math.min(s.body.velocity.y, -m.liftAir)); // capacité de côté en l'air : un peu de hauteur
    if (m.retreat) s.setVelocityX(-pl.facing * m.retreat);
    if (m.hop && (grounded || !pl.hopUsed)) {
      s.setVelocityY(-m.hop);
      if (!grounded) pl.hopUsed = true;
    }
    if (m.dash && !grounded && !pl.dashUsed) {
      s.setVelocity(pl.facing * m.dash, -120);
      pl.dashUsed = true;
    }
    if (m.armor) {
      pl.armorUntil = now + m.startup + (m.armorActive ? m.active || 0 : 0);
      pl.armorMax = m.armor; // l'armure encaisse les coups légers, pas les gros
    }
    if (m.inv) pl.invulnUntil = Math.max(pl.invulnUntil, now + m.inv);
    if (m.rise || m.type === 'carry') {
      const sx = inp ? inp.sx : 0;
      pl.atk.rdir = Math.abs(sx) > 0.3 ? Math.sign(sx) : Math.sign(this.W / 2 - s.x) || pl.facing;
      if (m.helpless && !grounded) pl.recUsed = true;
      this.sched(m.startup, 'rise', { pi: pl.i, aid: pl.atk.id });
    }
    if (m.type === 'recover' && m.helpless && !grounded) pl.recUsed = true;
    if (m.onceAir && !grounded) pl[m.onceAir + 'Used'] = true;
    if (m.dive) this.sched(m.startup, 'dive', { pi: pl.i, aid: pl.atk.id });
    if (m.type === 'book') this.bookCast(pl, m, now);
    if (m.type === 'counter') {
      pl.atk.cFrom = now + m.startup;
      pl.atk.cTo = now + m.startup + m.window;
      pl.atk.done = true;
      pl.atk.moveLock = now + m.total;
    }
    if (m.type === 'recover' || m.type === 'heal' || m.type === 'float') this.niniSkill(pl, m, key, now);
    // CONTRÔLE (AdieuLescure) : fenêtre où il attrape projectiles et coups
    if (m.type === 'catch') {
      pl.atk.cFrom = now + m.startup;
      pl.atk.cTo = now + m.startup + m.window;
      pl.atk.done = true;
      pl.atk.moveLock = now + m.total;
      s.setVelocityX(s.body.velocity.x * 0.2);
    }
    // DOUBLURE (BIGZINZIN) : téléport vers le haut, invisible, une silhouette de billets reste à sa place
    if (m.type === 'vanish') {
      pl.atk.done = true;
      pl.atk.moveLock = now + m.startup;
      this.sched(m.startup, 'vanish', { pi: pl.i, aid: pl.atk.id });
    }
    // TÉLÉPORT (Astra)
    if (m.type === 'blink') {
      pl.atk.done = true;
      pl.atk.moveLock = now + m.startup;
      this.sched(m.startup, 'blink', { pi: pl.i, aid: pl.atk.id });
    }
    // ARRÊT AU STAND (LN4) : immobile pendant le démarrage, puis pneus neufs
    if (m.type === 'pit') {
      pl.atk.done = true;
      pl.atk.moveLock = now + m.total;
      s.setVelocityX(0);
      this.sched(m.startup, 'pit', { pi: pl.i, aid: pl.atk.id });
    }
    // CTRL+Z (AdieuLescure) : retour une seconde en arrière
    if (m.type === 'rewind') {
      pl.atk.done = true;
      pl.atk.moveLock = now + m.total;
      this.sched(m.startup, 'rewind', { pi: pl.i, aid: pl.atk.id });
    }
    if (this.nxStart) this.nxStart(pl, m, now, grounded);
    if (m.cd) pl.moveCd[cdKey] = now + m.cd;
    this.attackFx(pl, m);
    this.sfx('swing', Math.min(((m.dmg || (m.proj && m.proj.dmg) || 6) - 3) / 10, 1));
    // coup puissant : petit éclat de préparation pour qu'on le voie venir
    if ((m.dmg || (m.proj && m.proj.dmg) || 0) >= 10 && m.startup >= 120 && !this.resim) {
      const c = pl.sprite.body.center;
      const g = this.add.image(c.x - pl.facing * 10, c.y - 30, 'burst').setScale(PX * 0.5).setTint(0xffffff).setDepth(31);
      this.tweens.add({ targets: g, scale: PX * 1.1, alpha: 0, angle: 90, duration: Math.min(m.startup, 180), onComplete: () => g.destroy() });
    }
  }

  niniSkill(pl, m, key, now) {
    const atk = pl.atk;
    atk.done = true;
    atk.moveLock = m.type === 'float' ? 0 : now + m.total * 0.6;
    this.sched(m.startup, 'skill', { pi: pl.i, aid: atk.id, key });
  }

  niniSkillFire(pl, m, key, now) {
    const s = pl.sprite;
    if (!s.active) return;
    if (m.type === 'recover') {
      s.setVelocityY(-m.vy);
      for (let i = 0; i < 5; i++) this.time.delayedCall(i * 60, () => this.heartFx(s.x + (Math.random() - 0.5) * 50, s.y + 30, 1.6));
      this.dust(s.x, s.body.bottom, -1, 3, pl.def.fx);
    } else if (m.type === 'heal') {
      pl.moveCd[key] = now + m.cooldown;
      const before = pl.damage;
      pl.damage = Math.max(0, pl.damage - m.heal);
      this.popup(s.x, s.y - 80, before > 0 ? 'RONRON -' + Math.round(before - pl.damage) + '%' : 'RONRON', '#ffd1e6');
      for (let i = 0; i < 6; i++) this.time.delayedCall(i * 70, () => this.heartFx(s.x + (Math.random() - 0.5) * 60, s.y - 20, 1.8));
    } else {
      this.popup(s.x, s.y - 90, 'PARASOL', '#ffd1e6');
    }
  }

  heartFx(x, y, k) {
    const h = this.add.image(x, y, 'heart').setScale(PX * 0.34 * (k || 1)).setDepth(32);
    this.tweens.add({ targets: h, y: y - 60 - Math.random() * 30, x: x + (Math.random() - 0.5) * 30, alpha: 0, duration: 650, onComplete: () => h.destroy() });
  }

  gainRage(vic, amount, now) {
    if (vic.char !== 'nini' || now < vic.rageUntil) return;
    vic.rage += amount;
    if (vic.rage < RAGE_MAX) return;
    vic.rage = 0;
    vic.rageUntil = now + RAGE_MS;
    vic.rageOn = true;
    const b = vic.sprite.body.center;
    this.popup(b.x, b.y - 100, 'SCARLETT SE FÂCHE !', '#ff4d4d');
    this.shockwave(b.x, b.y + 20, { main: 0xff2b2b, alt: 0xffa23b });
    this.cameras.main.shake(260, 0.012);
    this.hitstop(120);
  }

  // ---- Effets visuels des coups ------------------------------------------
  // effet à jouer quand le coup PART vraiment (un lourd chargé attend que la touche soit lâchée)
  whenAtk(pl, off, fn) {
    const id = pl.atk ? pl.atk.id : null;
    if (id === null) return;
    const ev = this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (!pl.sprite.active || !pl.atk || pl.atk.id !== id) return ev.remove();
        if ((this.nowT || 0) >= pl.atk.hitAt + off) {
          ev.remove();
          fn();
        }
      },
    });
  }

  attackFx(pl, m) {
    const fx = m.fx || {};
    const col = pl.def.fx;
    // ghosts (traînée d'images rémanentes)
    if (fx.ghosts) for (let i = 0; i < fx.ghosts; i++) this.whenAtk(pl, i * 45, () => this.ghost(pl, col.main));

    // changement de tenue (JAMBE FEU de Lulu) : éclair blanc, étincelles dorées, puis bouffée de fumée au retour
    if (fx.transform) this.transformFx(pl, m);

    // runes magiques (ASTRA)
    if (fx.rune) this.whenAtk(pl, -Math.min(40, m.startup), () => {
      const b = pl.sprite.body.center;
      this.runeFx(b.x + pl.facing * 44, b.y - 10, col, fx.big ? 2.4 : 1.5);
    });

    this.whenAtk(pl, 0, () => {
      const f = pl.facing;
      const b = pl.sprite.body.center;

      if (fx.cres) {
        const k = fx.s || 3;
        const ang = (fx.ang || 0) * f;
        const vertical = Math.abs(fx.ang || 0) >= 80;
        const cx = b.x + f * (vertical ? (m.ox || 0) * 0.6 : (m.ox || 0) - 6 * k);
        const cy = b.y + (m.oy || 0);
        const img = this.add.image(cx, cy, fx.cres).setDepth(21).setFlipX(f < 0).setScale(k * 0.55).setAngle(ang - 38 * f);
        this.tweens.add({ targets: img, scale: k, angle: ang + 38 * f, alpha: { from: 1, to: 0 }, duration: (m.active || 120) + 110, ease: 'Cubic.easeOut', onComplete: () => img.destroy() });
      }
      if (fx.flames) for (let i = 0; i < fx.flames; i++) {
        const t = i / Math.max(fx.flames - 1, 1);
        const fxp = b.x + f * (m.ox * (0.45 + 0.6 * t));
        const fyp = fx.pillar ? b.y + m.oy * (0.2 + 1.1 * t) : b.y + (m.oy || 0) + (Math.random() - 0.5) * 30;
        this.time.delayedCall(i * 18, () => this.flame(fxp, fyp, col));
      }
      if (fx.notes) for (let i = 0; i < 3; i++) this.noteFx(b.x + f * (40 + i * 14), b.y - 10 + i * 8, f, i);
      if (fx.hearts) for (let i = 0; i < 6; i++) this.time.delayedCall(i * 50, () => this.heartFx(b.x + (Math.random() - 0.5) * 50, b.y + 20 - i * 12, 1.6));
      if (fx.peony) this.peonyFx(b.x + f * (m.ox || 0), b.y + (m.oy || 0), pl);
      if (fx.petals) this.petalRing(b.x, b.y + (m.oy || 0), m.active || 150);
      if (fx.wind) this.windFx(pl, fx.wind, m);
      if (fx.burst) this.runeFx(b.x, b.y, col, 2.2);
      if (fx.dust) this.dust(b.x + f * 40, b.y + 30, f, 5, col);
      if (fx.shock) this.shockwave(b.x, b.y + 28, col);
      if (this.extraFx) this.extraFx(pl, m, fx, b, f);
      if (fx.grabFx) {
        const g = this.add.image(b.x + f * 56, b.y - 6, 'ring').setTint(col.alt).setScale(1).setDepth(21);
        this.tweens.add({ targets: g, scale: 3.4, alpha: 0, duration: 260, onComplete: () => g.destroy() });
      }
    });
  }

  transformFx(pl, m) {
    const s = pl.sprite;
    const c = s.body.center;
    pl.flashUntil = (this.nowT || 0) + 60;
    pl.flashCol = 0xffffff;
    s.setTintFill(0xffffff);
    const ring = this.add.image(c.x, c.y, 'ring').setTint(0xffe27a).setScale(0.6).setDepth(31);
    this.tweens.add({ targets: ring, scale: 3.4, alpha: 0, duration: 260, onComplete: () => ring.destroy() });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const q = this.add.rectangle(c.x, c.y - 10, i % 3 ? 5 : 8, i % 3 ? 5 : 8, i % 2 ? 0xffe27a : 0xffffff).setDepth(31).setAngle(45);
      this.tweens.add({ targets: q, x: c.x + Math.cos(a) * 60, y: c.y - 10 + Math.sin(a) * 50, angle: 225, alpha: 0, duration: 320, onComplete: () => q.destroy() });
    }
    this.time.delayedCall(m.total, () => this.puffFx(pl));
  }

  puffFx(pl) {
    const s = pl.sprite;
    if (!s.active) return;
    const c = s.body.center;
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const q = this.add.circle(c.x + Math.cos(a) * 10, c.y + Math.sin(a) * 18, 9 + (i % 3) * 3, 0xe8e8f0, 0.9).setDepth(31);
      this.tweens.add({ targets: q, x: q.x + Math.cos(a) * 26, y: q.y + Math.sin(a) * 22 - 10, scale: 1.6, alpha: 0, duration: 380, onComplete: () => q.destroy() });
    }
  }

  // ---- NINI : pivoine, pétales, vent ------------------------------------------
  petal(x, y, tx, ty, dur, delay) {
    const cols = [0xff8fb3, 0xe8578a, 0xffb3cc, 0xffffff];
    const q = this.add.rectangle(x, y, 7, 5, cols[Math.floor(Math.random() * cols.length)]).setDepth(26).setAngle(Math.random() * 90);
    this.tweens.add({ targets: q, x: tx, y: ty, angle: q.angle + 200, alpha: 0, duration: dur, delay: delay || 0, ease: 'Sine.easeOut', onComplete: () => q.destroy() });
  }

  peonyFx(x, y, pl) {
    const img = this.add.image(x, y + 10, 'peony').setScale(0.8).setDepth(25);
    this.tweens.add({ targets: img, scale: PX * 1.4, y, duration: 120, ease: 'Back.easeOut' });
    this.tweens.add({ targets: img, alpha: 0, scale: PX * 1.6, delay: 220, duration: 160, onComplete: () => img.destroy() });
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      this.petal(x, y, x + Math.cos(a) * (70 + Math.random() * 40), y + Math.sin(a) * 50 + 30, 520, 90);
    }
  }

  petalRing(x, y, ms) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r = 46;
      this.petal(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.85, x + Math.cos(a + 1.6) * (r + 24), y + Math.sin(a + 1.6) * (r + 20), ms + 220);
    }
  }

  windFx(pl, kind, m) {
    const b = pl.sprite.body.center;
    const f = pl.facing;
    for (let i = 0; i < 9; i++) {
      const up = kind === 'up';
      const x = up ? b.x + (Math.random() - 0.5) * 60 : b.x + f * (20 + Math.random() * 30);
      const y = up ? b.y + 30 + Math.random() * 30 : b.y - 30 + Math.random() * 60;
      const w = up ? 4 : 26 + Math.random() * 20, h = up ? 22 + Math.random() * 18 : 4;
      const q = this.add.rectangle(x, y, w, h, i % 3 ? 0xeef4ff : 0xbfd8ff, 0.85).setDepth(26);
      this.tweens.add({ targets: q, x: up ? x : x + f * (110 + Math.random() * 60), y: up ? y - 120 - Math.random() * 60 : y, alpha: 0, duration: 300 + Math.random() * 120, delay: i * 18, onComplete: () => q.destroy() });
      if (i % 3 === 0) this.petal(x, y, up ? x + (Math.random() - 0.5) * 60 : x + f * 160, up ? y - 150 : y - 20, 520, i * 18);
    }
  }

  noteFx(x, y, dir, i) {
    const n = this.add.image(x, y, 'note').setScale(PX * 0.9).setDepth(24).setTint(i % 2 ? 0xffe27a : 0xffffff);
    this.tweens.add({ targets: n, x: x + dir * (50 + i * 24), y: y - 40 - i * 18, angle: dir * 25, alpha: 0, duration: 520 + i * 90, onComplete: () => n.destroy() });
  }

  // ---- DENODOOM : éclair de bouche, charge du ballon, drapeau --------------------
  muzzle(pl, which) {
    const f = pl.facing;
    const b = pl.sprite.body.center;
    const x = b.x + f * (which ? 30 : 42), y = b.y - 10 + (which ? 7 : 0);
    const img = this.add.image(x + f * 14, y, 'burst').setScale(PX * 0.55).setDepth(28).setTint(0xffe27a).setAngle(Math.random() * 45);
    this.tweens.add({ targets: img, scale: PX * 1.0, alpha: 0, duration: 110, onComplete: () => img.destroy() });
  }

  chargeUi(pl, lv, now) {
    if (this.resim) return;
    const s = pl.sprite;
    if (!pl.chgBg) {
      pl.chgBg = this.add.rectangle(0, 0, 66, 12, 0x000000, 0.7).setDepth(41).setStrokeStyle(2, 0xffffff);
      pl.chgFg = this.add.rectangle(0, 0, 60, 6, 0xffffff).setDepth(42).setOrigin(0, 0.5);
      pl.chgRing = this.add.image(0, 0, 'ring').setDepth(20).setTint(0xffd23f).setAlpha(0.9);
    }
    const x = s.x, y = s.y - 90;
    pl.chgBg.setPosition(x, y);
    pl.chgFg.setPosition(x - 30, y).setSize(Math.max(60 * lv, 1), 6);
    pl.chgFg.width = Math.max(60 * lv, 1);
    pl.chgFg.setFillStyle(lv >= 1 ? (Math.floor(now / 70) % 2 ? 0xff5a5a : 0xffffff) : this.lerpCol(0xffe27a, 0xff7b00, lv));
    pl.chgRing.setPosition(s.x - pl.facing * 14, s.y - 12).setScale(1.8 - lv * 0.9 + 0.1 * Math.sin(now / 60));
    pl.chgRing.setAlpha(0.35 + lv * 0.6);
  }

  clearCharge(pl) {
    if (this.resim) return;
    ['chgBg', 'chgFg', 'chgRing'].forEach((k) => {
      if (pl[k]) {
        pl[k].destroy();
        pl[k] = null;
      }
    });
  }

  // plus on charge, plus le tir est tendu et fort ; peu chargé : tir en cloche
  spawnBall(pl, m, lv, now) {
    const b = m.ball;
    const tgt = this.foeOf(pl);
    const spec = {
      ...b,
      vx: 300 + 1000 * lv,
      vy: -460 + 450 * lv,
      grav: 1300 - 1200 * lv,
      life: 2200,
      ox: 36,
      oy: -26,
      dmg: Math.round(6 + 8 * lv),
      kb: 210 + 150 * lv,
      ks: 4.5 + 4.5 * lv,
      spin: 12,
      trail: lv > 0.6 ? 0xffe27a : undefined,
    };
    this.spawnProj(pl, tgt, m, now, 0, spec);
    const bc = pl.sprite.body.center;
    const ring = this.add.image(bc.x + pl.facing * 30, bc.y - 20, 'ring').setTint(0xffd23f).setDepth(28).setScale(0.8);
    this.tweens.add({ targets: ring, scale: 2 + lv * 2, alpha: 0, duration: 240, onComplete: () => ring.destroy() });
    if (lv > 0.95) this.popup(bc.x, bc.y - 90, 'TIR PUISSANT !', '#ffd23f');
  }

  flagFx(x, y) {
    const fl = this.add.image(x, y - 118, 'flagtn').setScale(0.2).setDepth(45).setAngle(-8);
    this.tweens.add({ targets: fl, scale: PX * 0.95, duration: 220, ease: 'Back.easeOut' });
    this.tweens.add({ targets: fl, angle: 7, duration: 180, yoyo: true, repeat: 4, ease: 'Sine.easeInOut', delay: 220 });
    this.tweens.add({ targets: fl, alpha: 0, y: y - 150, duration: 320, delay: 1000, onComplete: () => fl.destroy() });
    for (let i = 0; i < 14; i++) {
      const q = this.add.rectangle(x, y - 40, 8, 8, i % 2 ? 0xe70013 : 0xffffff).setDepth(44);
      const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 90;
      this.tweens.add({ targets: q, x: x + Math.cos(a) * d, y: y - 40 + Math.sin(a) * d, alpha: 0, angle: 180, duration: 520, onComplete: () => q.destroy() });
    }
    this.popup(x, y - 190, 'AIGLE DE CARTHAGE !', '#ff5a6e');
  }

  ghost(pl, tint) {
    const s = pl.sprite;
    const g = this.add.image(s.x, s.y, s.texture.key).setScale(PX).setFlipX(s.flipX).setTint(tint).setAlpha(0.5).setDepth(9);
    this.tweens.add({ targets: g, alpha: 0, duration: 240, onComplete: () => g.destroy() });
  }

  flame(x, y, col) {
    const img = this.add.image(x, y, 'flame').setScale(PX * (0.7 + Math.random() * 0.5)).setDepth(22).setAngle((Math.random() - 0.5) * 30);
    this.tweens.add({ targets: img, y: y - 50 - Math.random() * 60, x: x + (Math.random() - 0.5) * 30, scale: 0.8, alpha: 0, duration: 420 + Math.random() * 240, onComplete: () => img.destroy() });
  }

  dust(x, y, dir, n, col) {
    for (let i = 0; i < n; i++) {
      const s = 6 + Math.random() * 8;
      const r = this.add.rectangle(x + (Math.random() - 0.5) * 16, y, s, s, 0xd9c3a0, 0.9).setDepth(18);
      this.tweens.add({ targets: r, x: r.x + dir * (20 + Math.random() * 60), y: y - 10 - Math.random() * 26, alpha: 0, scale: 0.4, duration: 340 + Math.random() * 200, onComplete: () => r.destroy() });
    }
  }

  shockwave(x, y, col) {
    // onde de choc au sol : anneau aplati + deux traînées de poussière
    const ring = this.add.image(x, y, 'ring').setTint(col.alt).setDepth(21).setScale(1.2, 0.35);
    this.tweens.add({ targets: ring, scaleX: 11, scaleY: 1.4, alpha: 0, duration: 420, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    [-1, 1].forEach((dir) => {
      for (let i = 0; i < 7; i++) {
        const s = 8 + Math.random() * 10;
        const r = this.add.rectangle(x, y + 2, s, s, i % 2 ? 0xd9c3a0 : 0x9c7a4e).setDepth(20);
        this.tweens.add({ targets: r, x: x + dir * (60 + i * 22), y: y - 8 - Math.random() * 18, alpha: 0, scale: 0.3, delay: i * 25, duration: 380, onComplete: () => r.destroy() });
      }
    });
    this.cameras.main.shake(120, 0.005);
  }

  runeFx(x, y, col, k) {
    const r = this.add.image(x, y, 'ring').setTint(col.alt).setDepth(21).setScale(0.6);
    this.tweens.add({ targets: r, scale: k * 1.6, angle: 120, alpha: 0, duration: 260, onComplete: () => r.destroy() });
    const r2 = this.add.image(x, y, 'ring').setTint(col.main).setDepth(21).setScale(k * 1.7).setAlpha(0.8);
    this.tweens.add({ targets: r2, scale: 0.4, angle: -120, alpha: 0, duration: 260, onComplete: () => r2.destroy() });
  }

  popup(x, y, text, color) {
    const t = this.add.text(x, y, text, { fontFamily: FONT, fontSize: '16px', color, stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setDepth(46);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 800, onComplete: () => t.destroy() });
  }

  // ---- Code pénal : tombe du ciel sur l'adversaire (DEAD LULU, plongeon) -----------
  // ---- Code pénal : Lulu le brandit, le livre tombe à une distance fixe devant elle -----------
  bookCast(pl, m, now) {
    const gy = L.baseY + 2;
    const cx = this.W / 2, half = L.mainW / 2;
    const tx = Phaser.Math.Clamp(pl.sprite.x + pl.facing * m.dist, cx - half + 40, cx + half - 40);
    // ombre d'avertissement au sol (visuel)
    const sh = this.add.ellipse(tx, gy, m.book.w + 10, 22, 0x000000, 0.45).setDepth(6);
    const ex = this.add.text(tx, gy - 34, '!', { fontFamily: FONT, fontSize: '30px', color: '#ff4d6d', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setDepth(40);
    this.tweens.add({ targets: sh, scaleX: 0.6, scaleY: 0.6, duration: m.warn, ease: 'Sine.easeIn' });
    this.tweens.add({ targets: ex, y: gy - 50, duration: 120, yoyo: true, repeat: 2 });
    this.time.delayedCall(m.warn + 250, () => {
      sh.destroy();
      ex.destroy();
    });
    this.sched(m.warn, 'book', { pi: pl.i, tx });
  }

  bookLand(pl, tgt, d, now) {
    const sp = Object.values(pl.def.moves).find((m) => m && m.book).book;
    if (this.over || pl.stocks <= 0 || !sp) return;
    const x = d.tx;
    const y = L.baseY - 40 + sp.oy;
    const img = this.add.image(x, y, sp.tex).setScale(sp.s).setDepth(26).setAngle(-12);
    this.projs.push({ id: ++this.projSeq, owner: pl, target: tgt, spec: sp, x, y, vx: 0, vy: sp.vy, born: now, armedAt: 0, lastTrail: 0, sprite: img, dead: false, f: pl.facing, label: null });
  }

  hitstop(ms) {
    this.freezeLeft = Math.max(this.freezeLeft, Math.round(ms / STEP_MS));
  }

  // Le coup est-il absorbé par la garde ? (les prises et l'aigle passent à travers)
  // ---- Dégâts --------------------------------------------------------------
  counterHit(lulu, att, spec, now) {
    const a = lulu.atk;
    a.cTo = 0;
    a.end = now + 250;
    lulu.cdUntil = a.end;
    lulu.invulnUntil = Math.max(lulu.invulnUntil, now + 300);
    const c = lulu.sprite.body.center;
    this.popup(c.x, c.y - 90, 'OBJECTION !', '#ffd166');
    const r = this.add.image(c.x, c.y, 'ring').setTint(0xffd166).setDepth(31).setScale(1);
    this.tweens.add({ targets: r, scale: 6, alpha: 0, duration: 320, onComplete: () => r.destroy() });
    this.hitstop(160);
    this.sfx('parry');
    const ac = att.sprite.body.center;
    if (Math.abs(ac.x - c.x) < 230 && Math.abs(ac.y - c.y) < 170 && now >= att.invulnUntil) {
      const cs = { dmg: Math.max(6, Math.round(spec.dmg * a.m.mul)), kb: 300, ks: 7, ang: -0.45, stun: 220 };
      this.applyHit(lulu, att, cs, now, Math.sign(ac.x - c.x) || lulu.facing, null, undefined, true);
    }
  }

  applyHit(att, vic, spec, now, dirSign, hitPos, rem, noCounter) {
    if (this.over) return;
    if (att.dmgMul) spec = { ...spec, dmg: spec.dmg * att.dmgMul };
    if (now < att.rageUntil) spec = { ...spec, dmg: spec.dmg * RAGE_DMG };
    // OBJECTION ! : la parade de Lulu annule le coup et riposte
    if (!noCounter && vic.atk && vic.atk.m.type === 'counter' && now >= vic.atk.cFrom && now <= vic.atk.cTo) return this.counterHit(vic, att, spec, now);
    // CONTRÔLE : AdieuLescure attrape l'attaquant et le projette
    if (!noCounter && vic.atk && vic.atk.m.type === 'catch' && now >= vic.atk.cFrom && now <= vic.atk.cTo) return this.catchMelee(vic, att, spec, now);
    // armure : on encaisse les dégâts sans être interrompu
    if (now < vic.armorUntil && spec.dmg <= (vic.armorMax || 0) && !this.sudden) {
      vic.damage += spec.dmg;
      this.gainRage(vic, spec.dmg, now);
      vic.flashUntil = now + 90;
      vic.flashCol = 0xffd166;
      vic.sprite.setTintFill(0xffd166);
      const c = vic.sprite.body.center;
      this.popup(c.x, c.y - 80, 'ARMURE', '#ffd166');
      this.hitstop(50);
      this.sfx('armor');
      return;
    }
    if (vic.grab) this.releaseGrab(vic);
    if (vic.ledgeSide) {
      vic.ledgeSide = 0;
      vic.sprite.body.allowGravity = true;
    }
    vic.charmUntil = 0;
    // USURE : un coup déjà placé parmi les 5 derniers coups qui ont touché perd 10 % par répétition (40 % au plus)
    let stale = 1, reps = 0;
    if (spec.mid && att !== vic) {
      for (let i = 0; i < 5; i++) if (att['st' + i] === spec.mid) reps++;
      stale = Math.max(0.6, 1 - 0.1 * reps);
      const si = att.sti || 0;
      att['st' + si] = spec.mid;
      att.sti = (si + 1) % 5;
      if (stale < 1) spec = Object.assign({}, spec, { dmg: spec.dmg * stale });
    }
    // COUPABLE ! (Deadlulu) : le livre marque ; le prochain lourd de Deadlulu sur un marqué est renforcé
    const vc0 = vic.sprite.body.center;
    if (spec.mark) {
      vic.markUntil = now + spec.mark;
      this.popup(vc0.x, vc0.y - 110, 'COUPABLE !', '#ffd166');
    } else if ((spec.special || spec.heavy) && att.def.judge && now < (vic.markUntil || 0)) {
      spec = Object.assign({}, spec, { dmg: spec.dmg * 1.25, kb: spec.kb * 1.25 });
      vic.markUntil = 0;
      this.popup(vc0.x, vc0.y - 110, 'CONDAMNÉ !', '#ff5a5a');
    }
    // BIGZINZIN : en OR il frappe plus fort et encaisse mieux ; l'argent monte quand il touche, baisse quand il est touché
    if (this.bzHit) spec = this.bzHit(att, vic, spec, now);
    // CHAUFFE (Toro) : la jauge monte quand il touche et quand il est touché
    if (att.def.heat && att !== vic) att.heat = Math.min(100, (att.heat || 0) + spec.dmg * 1.5);
    if (vic.def.heat) vic.heat = Math.min(100, (vic.heat || 0) + spec.dmg * 0.8);
    this.gainRage(vic, spec.dmg, now);
    vic.damage += spec.dmg;
    const power = ((spec.kb * KB_BASE + vic.damage * spec.ks * KB_GROW) / vic.def.weight) * (vic.def.money && now < (vic.goldUntil || 0) ? 0.85 : 1);
    let ux = dirSign * dcos(spec.ang), uy = dsin(spec.ang);
    // influence directionnelle : le joystick tenu dévie la trajectoire (15° au plus)
    const sx = vic.lastSx || 0, sy = vic.lastSy || 0;
    if (hyp(sx, sy) > 0.3) {
      const th = DI_MAX * Phaser.Math.Clamp(ux * sy - uy * sx, -1, 1);
      const c = dcos(th), sn = dsin(th);
      const nx = ux * c - uy * sn, ny = ux * sn + uy * c;
      ux = nx;
      uy = ny;
    }
    let vy = uy * power;
    // coups légers vers le haut (léger bas) : petit envol garanti, pour relancer en l'air
    if (spec.pop) vy = Math.min(vy, -spec.pop * (1 + Math.min(vic.damage, 120) / 400));
    vic.sprite.setVelocity(ux * power, vy);
    const combo = now < vic.stunUntil;
    let stunMs = (spec.stun * STUN_BASE + power * STUN_GROW) * stale;
    // un coup qui touche laisse toujours l'avantage ; les coups légers en laissent assez pour enchaîner
    // (sauf un coup trop répété : l'usure supprime la garantie, pour éviter les boucles)
    if (rem !== undefined && reps < 2) stunMs = Math.max(stunMs, rem + (spec.combo || 2 * STEP_MS) * stale);
    // poursuite : l'attaquant peut esquiver juste après pour suivre (2 fois au sol, 1 fois en l'air)
    const ab = att.sprite.body;
    att.chaseLeft = ab.blocked.down || ab.touching.down ? 2 : 1;
    att.chaseUntil = Math.max(now, att.atk ? att.atk.end : now) + 220;
    vic.stunUntil = now + stunMs;
    vic.stunStart = now;
    if (vic.atk && vic.atk.charging) this.clearCharge(vic);
    vic.atk = null;
    vic.helpless = false;
    vic.recUsed = false;
    vic.dodgeLock = 0;
    vic.rollUntil = 0;
    vic.gcUntil = 0;
    if (spec.freeze) vic.freezeUntil = now + spec.freeze; // KEY FRAME : image figée
    if (spec.slow) vic.slowUntil = now + spec.slow;
    vic.chargeUsed = vic.hornUsed = vic.blinkUsed = vic.leapUsed = vic.floatUsed = vic.vanishUsed = false; // être touché rend aussi les capacités de retour
    if (vic.jumps === 0) vic.jumps = 1; // être touché rend un saut
    vic.tumble = Math.max(vic.tumble || 0, tumbleFor(vic.damage));
    if (this.training) this.trainReport(att, vic, spec, stunMs, rem, combo);
    const lethal = this.isLethal(vic, now);
    this.impactFx(att, vic, spec, hitPos, lethal);
    if (this.sudden) this.finish(att);
  }

  impactFx(att, vic, spec, hitPos, lethal) {
    const col = att.def.fx;
    const vc = vic.sprite.body.center;
    const x = hitPos ? hitPos.x : vc.x;
    const y = hitPos ? hitPos.y : vc.y;
    const power = Math.min(spec.dmg / 12, 1.2);

    // étoile d'impact
    const burst = this.add.image(x, y, 'burst').setScale(PX * (0.7 + power * 0.6)).setDepth(30).setAngle(Math.random() * 45);
    this.tweens.add({ targets: burst, scale: PX * (1.4 + power * 1.3), alpha: 0, angle: burst.angle + 40, duration: 190, onComplete: () => burst.destroy() });
    // anneau
    const ring = this.add.image(x, y, 'ring').setTint(col.main).setScale(0.8).setDepth(29);
    this.tweens.add({ targets: ring, scale: 2.6 + power * 2, alpha: 0, duration: 280, onComplete: () => ring.destroy() });
    // étincelles pixel dans les couleurs du combattant
    const n = 8 + Math.round(power * 8);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 30 + Math.random() * 70;
      const sz = 6 + Math.random() * 6;
      const r = this.add.rectangle(x, y, sz, sz, i % 2 ? col.main : col.alt).setDepth(30);
      this.tweens.add({ targets: r, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, scale: 0.3, duration: 260 + Math.random() * 160, onComplete: () => r.destroy() });
    }
    if (att.char === 'toro') for (let i = 0; i < 3; i++) this.time.delayedCall(i * 40, () => this.flame(x + (Math.random() - 0.5) * 30, y + 10, col));

    // flash blanc de la victime
    vic.flashUntil = (this.nowT || 0) + 90;
    vic.flashCol = 0xffffff;
    vic.sprite.setTintFill(0xffffff);
    this.cameras.main.shake(90, Math.min(0.002 + vic.damage * 0.00003 + power * 0.002, 0.009));
    this.sfx('hit', power);
    if (vic.human || att.human) this.buzz(lethal ? 90 : 25 + power * 25);
    if (lethal) {
      // coup qui envoie au KO : gros arrêt sur image + flash (remplace l'ancienne cinématique)
      this.hitstop(320);
      const fl = this.add.rectangle(this.W / 2, this.H / 2, this.W, this.H, 0xffffff, 0.75).setDepth(70);
      this.tweens.add({ targets: fl, alpha: 0, duration: 300, onComplete: () => fl.destroy() });
      this.cameras.main.shake(300, 0.014);
      this.popup(vc.x, vc.y - 100, 'K.O. !', '#ffffff');
      this.sfx('ko');
    } else this.hitstop(40 + power * 50);
  }

  startGrab(pl, vic, m, now) {
    vic.atk = null;
    vic.stunUntil = now + 900;
    vic.sprite.body.allowGravity = false;
    vic.sprite.setVelocity(0, 0);
    pl.atk.pose = 'slam';
    pl.atk.end = now + 560;
    pl.atk.moveLock = now + 560;
    pl.sprite.setVelocityX(0);
    pl.grab = { victim: vic, start: now, slamAt: now + 400, spec: m.throw };
    this.sfx('grab');
    const vc = vic.sprite.body.center;
    this.popup(vc.x, vc.y - 70, 'ATTRAPE !', '#6ee7b7');
    const g = this.add.image(vc.x, vc.y, 'ring').setTint(0x6ee7b7).setScale(1).setDepth(30);
    this.tweens.add({ targets: g, scale: 4, alpha: 0, duration: 300, onComplete: () => g.destroy() });
    this.hitstop(60);
  }

  updateGrab(pl, now) {
    const g = pl.grab;
    const v = g.victim;
    const t = Math.min((now - g.start) / (g.slamAt - g.start), 1);
    const f = pl.facing;
    v.sprite.setPosition(pl.sprite.x + f * (50 - 40 * dsin(t * Math.PI * 0.5)), pl.sprite.y - 14 - 70 * dsin(t * Math.PI));
    v.sprite.body.setVelocity(0, 0);
    v.sprite.setAngle(f * t * 300);
    v.stunUntil = Math.max(v.stunUntil, now + 120);
    if (now >= g.slamAt) {
      const spec = g.spec;
      this.releaseGrab(pl);
      v.sprite.setPosition(pl.sprite.x + f * 56, pl.sprite.y + 6);
      // suplex vers l'arrière par défaut ; joystick vers l'avant = projection devant
      const dir = pl.lastSx * f > 0.5 ? f : -f;
      this.applyHit(pl, v, spec, now, dir, null);
      this.shockwave(v.sprite.x, v.sprite.body.bottom, pl.def.fx);
      this.popup(v.sprite.x, v.sprite.y - 70, spec.name || 'SUPLEX !', '#ffd166');
    }
  }

  releaseGrab(pl) {
    if (!pl.grab) return;
    const v = pl.grab.victim;
    v.sprite.body.allowGravity = true;
    v.sprite.setAngle(0);
    pl.grab = null;
  }

  // =========================================================================
  // PROJECTILES (ASTRA, grappin de GROM)
  // =========================================================================
  spawnProj(pl, target, m, now, dy, spOverride) {
    let sp = spOverride || m.proj;
    // lourd chargé : le projectile frappe plus fort
    if (!spOverride && m && pl.atk && pl.atk.m === m && pl.atk.chg) {
      const f = Math.min(pl.atk.chg / m.chargeMax, 1);
      sp = Object.assign({}, sp, { dmg: sp.dmg * (1 + 0.5 * f), kb: sp.kb * (1 + 0.25 * f), s: (sp.s || 3) * (1 + 0.25 * f), w: sp.w * (1 + 0.2 * f), h: sp.h * (1 + 0.2 * f) });
    }
    let f = m && m.backFire ? -pl.facing : pl.facing;
    // grappin lancé hors du terrain, en l'air : il part vers le terrain (pour s'accrocher au bord)
    if (sp && sp.kind === 'hook') {
      const ob = pl.sprite.body;
      const air = !(ob.blocked.down || ob.touching.down);
      if (air && Math.abs(ob.center.x - this.W / 2) > L.mainW / 2 - 4) f = Math.sign(this.W / 2 - ob.center.x) || f;
    }
    const bc = pl.sprite.body.center;
    let x = bc.x + f * sp.ox;
    let y = bc.y + sp.oy + (dy || 0);
    if (sp.ground) y = pl.sprite.body.bottom - 14;
    if (sp.kind === 'corgi') {
      const gnd = pl.sprite.body.blocked.down || pl.sprite.body.touching.down;
      y = (gnd ? pl.sprite.body.bottom : L.baseY) - 24;
      if (now < pl.rageUntil) sp = { ...sp, s: sp.s * 1.35, w: sp.w * 1.35, h: sp.h * 1.35 };
    }
    let vx = (sp.vx || 0) * f;
    let vy = sp.vy || 0;
    if (sp.kind === 'ring') {
      const bv = pl.sprite.body.velocity.y;
      const gnd = pl.sprite.body.blocked.down || pl.sprite.body.touching.down;
      vy = gnd ? -110 : bv < -60 ? -430 : bv > 60 ? 430 : 120;
    }
    if (sp.kind === 'hermine' || sp.kind === 'wall') {
      // l'hermine (et le mur de Grom) surgit du sol à distance FIXE devant le lanceur
      y = pl.sprite.body.bottom + 2;
    }
    const img = this.add.image(x, y, sp.tex).setScale(sp.s || 3).setDepth(sp.kind === 'mine' ? 8 : 24);
    if (sp.kind === 'hook') img.setAngle(f * 90);
    if (sp.kind === 'corgi') { img.setFlipX(f < 0); this.dust(x - f * 30, y + 30, -f, 4, pl.def.fx); }
    if (sp.kind === 'eagle') {
      // l'aigle jaillit de la manche et monte droit vers le ciel (aucune visée)
      vx = 0;
      vy = -sp.speed;
      img.setScale(0.5).setAngle(-90).setDepth(27);
      this.tweens.add({ targets: img, scale: sp.s, duration: 160, ease: 'Back.easeOut' });
      for (let i = 0; i < 6; i++) {
        const q = this.add.rectangle(x, y, 7, 7, i % 2 ? 0xe70013 : 0xffffff).setDepth(26);
        const a = Math.random() * Math.PI * 2;
        this.tweens.add({ targets: q, x: x + Math.cos(a) * 50, y: y + Math.sin(a) * 50, alpha: 0, duration: 340, onComplete: () => q.destroy() });
      }
    }
    if (sp.kind === 'ball') img.setDepth(25);
    if (sp.kind === 'wall') {
      img.setOrigin(0.5, 1).setScale(sp.s, sp.s * 0.1).setDepth(9);
      this.tweens.add({ targets: img, scaleY: sp.s, duration: 140, ease: 'Back.easeOut' });
      this.dust(x, y - 4, -1, 6, pl.def.fx);
      this.dust(x, y - 4, 1, 6, pl.def.fx);
      this.cameras.main.shake(120, 0.006);
    }
    if (sp.kind === 'hermine') {
      img.setOrigin(0.5, 1).setScale(sp.s, 0.05);
      this.tweens.add({ targets: img, scaleY: sp.s, duration: 130, ease: 'Back.easeOut' });
      this.tweens.add({ targets: img, scaleY: 0.05, duration: 200, delay: Math.max((sp.act || 320) - 60, 100), ease: 'Cubic.easeIn' });
      this.dust(x, y - 4, -1, 6, pl.def.fx);
      this.dust(x, y - 4, 1, 6, pl.def.fx);
      const rg = this.add.image(x, y - 2, 'ring').setTint(0xf1eee2).setDepth(21).setScale(1.2, 0.3);
      this.tweens.add({ targets: rg, scaleX: 6, scaleY: 1, alpha: 0, duration: 340, onComplete: () => rg.destroy() });
      this.cameras.main.shake(110, 0.005);
    }
    const proj = {
      id: ++this.projSeq,
      owner: pl,
      target,
      spec: sp,
      x,
      y,
      vx,
      vy,
      born: now,
      armedAt: now + (sp.arm || 0),
      lastTrail: 0,
      sprite: img,
      dead: false,
      f,
      hits: sp.kind === 'corgi' ? new Set() : null,
    };
    this.projs.push(proj);
    if (!spOverride && sp.kind === 'bullet') this.muzzle(pl, 0);
    const snd = { bullet: 'shoot', orb: 'magic', comet: 'magic', mine: 'magic', ring: 'charm', kiss: 'charm', eagle: 'rooster' }[sp.kind];
    this.sfx(snd || 'throw', sp.tex === 'orb_l' ? 1 : 0.3);
    if (sp.kind === 'mine') {
      img.setAlpha(0);
      this.tweens.add({ targets: img, alpha: 1, duration: 200 });
      this.runeFx(x, y, pl.def.fx, 1.8);
    }
  }

  // vêtements qui volent quand la valise s'ouvre
  clothesFx(x, y) {
    const cols = [0xffffff, 0x6f93c9, 0xff8fb3, 0xffe08a, 0x6fbf5a];
    for (let i = 0; i < 8; i++) {
      const q = this.add.rectangle(x, y, 10, 8, cols[i % cols.length]).setDepth(27);
      const dx = (Math.random() - 0.5) * 220;
      this.tweens.add({ targets: q, x: x + dx, y: y - 60 - Math.random() * 70, angle: dx, duration: 260, ease: 'Quad.easeOut' });
      this.tweens.add({ targets: q, y: y + 20, alpha: 0, delay: 260, duration: 300, ease: 'Quad.easeIn', onComplete: () => q.destroy() });
    }
  }

  killProj(p, boom) {
    p.dead = true;
    if (p.carry) {
      p.target.sprite.body.allowGravity = true;
      p.target.sprite.setAngle(0);
      p.carry = null;
    }
    if (boom) {
      this.sfx('boom');
      const col = p.owner.def.fx;
      const r = this.add.image(p.x, p.y, 'ring').setTint(col.alt).setDepth(30).setScale(1);
      this.tweens.add({ targets: r, scale: 7, alpha: 0, duration: 380, ease: 'Cubic.easeOut', onComplete: () => r.destroy() });
      const r2 = this.add.image(p.x, p.y, 'ring').setTint(col.main).setDepth(30).setScale(0.6);
      this.tweens.add({ targets: r2, scale: 4.5, alpha: 0, duration: 300, onComplete: () => r2.destroy() });
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = 50 + Math.random() * 90;
        const q = this.add.rectangle(p.x, p.y, 8, 8, i % 2 ? col.main : col.alt).setDepth(30);
        this.tweens.add({ targets: q, x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, alpha: 0, duration: 380, onComplete: () => q.destroy() });
      }
      this.cameras.main.shake(100, 0.004);
    }
    p.sprite.destroy();
  }

  updateProjs(now, dt) {
    this.chainGfx.clear();
    for (const p of this.projs) {
      if (p.dead) continue;
      const sp = p.spec;
      if (sp.grav) p.vy += sp.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.sprite.setPosition(p.x, p.y);
      if (sp.spin) p.sprite.angle += sp.spin;
      if (sp.kind === 'orb' && sp.tex === 'orb_l') p.sprite.setScale((sp.s || 3) * (1 + 0.08 * Math.sin(now / 60)));
      if (sp.kind === 'mine' && now >= p.armedAt) p.sprite.setAlpha(0.65 + 0.35 * Math.sin(now / 90));

      // traînée
      if (sp.trail !== undefined && now - p.lastTrail > 32) {
        p.lastTrail = now;
        const sz = sp.tex === 'orb_l' ? 14 : 8;
        const q = this.add.rectangle(p.x, p.y, sz, sz, sp.trail, 0.8).setDepth(23);
        this.tweens.add({ targets: q, alpha: 0, scale: 0.2, duration: 260, onComplete: () => q.destroy() });
      }

      // micro de Ménès hors du terrain : s'il touche un coin, il ramène Ménès au rebord
      if (sp.kind === 'hook') {
        const o = p.owner, ob = o.sprite.body;
        const offstage = Math.abs(ob.center.x - this.W / 2) > L.mainW / 2 - 4 || ob.bottom > L.baseY + 4;
        const airborne = !(ob.blocked.down || ob.touching.down);
        if (offstage && airborne && !o.ledgeSide && now >= o.stunUntil && o.stocks > 0) {
          let hit = 0;
          for (const side of [-1, 1]) {
            const ex = this.W / 2 + side * (L.mainW / 2);
            if (Math.abs(p.x - ex) < 60 && Math.abs(p.y - L.baseY) < 80 && !this.pls.some((q) => q !== o && q.ledgeSide === side)) hit = side;
          }
          if (hit) {
            this.grabLedge(o, hit, now);
            this.popup(p.x, p.y - 40, 'MICRO !', '#6ee7b7');
            this.killProj(p, false);
            continue;
          }
        }
      }
      // fil du micro (MÉNÈS) : un long câble noir qui pend un peu
      if (sp.kind === 'hook') {
        const o = p.owner.sprite.body.center;
        const hx = o.x + p.f * 20, hy = o.y - 6;
        const d = hyp(p.x - hx, p.y - hy), n = Math.max(Math.floor(d / 4), 1);
        const sag = Math.min(d * 0.12, 30);
        this.chainGfx.fillStyle(0x14121c, 1);
        for (let i = 0; i <= n; i++) {
          const t = i / n;
          this.chainGfx.fillRect(Math.round(hx + (p.x - hx) * t) - 2, Math.round(hy + (p.y - hy) * t + sag * 4 * t * (1 - t)) - 2, 4, 4);
        }
      }

      // --- DENODOOM : balle de handball qui rebondit une fois au sol
      if (sp.kind === 'ball' && p.vy > 0 && p.y > L.baseY - 16 && Math.abs(p.x - this.W / 2) < L.mainW / 2 + 10) {
        if (!p.bounced) {
          p.bounced = true;
          p.y = L.baseY - 16;
          p.vy *= -0.4;
          this.dust(p.x, L.baseY, -1, 3, p.owner.def.fx);
        } else {
          this.killProj(p, false);
          continue;
        }
      }
      // --- DENODOOM : l'aigle de Carthage (vol guidé, prise, drapeau, lancer)
      if (sp.kind === 'eagle') {
        if (!p.carry && this.pls.length > 2) p.target = this.projVictim(p, now) || p.target;
        const v = p.target;
        p.sprite.setTexture(Math.floor(now / 85) % 2 ? 'eagle1' : 'eagle0');
        if (!p.carry) {
          // vol vertical : l'aigle monte sans jamais viser l'adversaire
          p.sprite.setAngle(-90);
          if (now - p.born > sp.life) {
            this.killProj(p, false);
            continue;
          }
          if (now < v.invulnUntil || v.stocks <= 0 || v.grab) continue;
          const vb = v.sprite.body;
          if (p.x + sp.w / 2 > vb.x && p.x - sp.w / 2 < vb.right && p.y + sp.h / 2 > vb.y && p.y - sp.h / 2 < vb.bottom) {
            // PRISE réussie : l'aigle emporte l'adversaire, drapeau tunisien
            if (v.grab) this.releaseGrab(v);
            v.atk = null;
            v.sprite.body.allowGravity = false;
            v.sprite.setVelocity(0, 0);
            v.stunUntil = now + sp.carryMs + 300;
            p.carry = { t0: now, x0: p.x, y0: p.y, stocks: v.stocks };
            p.vx = p.vy = 0;
            this.flagFx(v.sprite.x, v.sprite.y);
            this.hitstop(70);
          }
          continue;
        }
        // en vol avec l'adversaire
        const k = Math.min((now - p.carry.t0) / sp.carryMs, 1);
        const e = 1 - (1 - k) * (1 - k);
        p.x = p.carry.x0 + p.f * 70 * e;
        p.y = p.carry.y0 - 130 * dsin(k * Math.PI * 0.5);
        p.sprite.setPosition(p.x, p.y).setAngle(0).setFlipX(p.f < 0);
        v.sprite.setPosition(p.x, p.y + 52).setAngle(p.f * k * 40);
        v.sprite.body.setVelocity(0, 0);
        v.stunUntil = Math.max(v.stunUntil, now + 120);
        if (v.stocks !== p.carry.stocks) {
          this.killProj(p, false);
          continue;
        }
        if (k >= 1) {
          v.sprite.body.allowGravity = true;
          v.sprite.setAngle(0);
          p.carry = null;
          p.dead = true;
          this.applyHit(p.owner, v, sp.throw, now, p.f, { x: p.x, y: p.y + 40 });
          const eg = p.sprite;
          this.tweens.add({ targets: eg, x: eg.x + p.f * 260, y: eg.y - 150, alpha: 0, duration: 420, onComplete: () => eg.destroy() });
        }
        continue;
      }
      if (sp.kind === 'corgi') {
        p.sprite.setTexture(Math.floor(now / 90) % 2 ? 'corgi1' : 'corgi0').setFlipX(p.f < 0);
        if (Math.abs(p.x - this.W / 2) > L.mainW / 2 + 40) {
          this.dust(p.x, p.y + 30, -p.f, 5, p.owner.def.fx);
          this.killProj(p, false);
          continue;
        }
        for (const v2 of this.pls.length > 2 ? this.enemiesOf(p.owner) : [p.target]) {
          const vb2 = v2.sprite.body;
          if (!p.hits.has(v2) && now >= v2.invulnUntil && v2.stocks > 0 && !v2.grab && p.x + sp.w / 2 > vb2.x && p.x - sp.w / 2 < vb2.right && p.y + sp.h / 2 > vb2.y && p.y - sp.h / 2 < vb2.bottom) {
            p.hits.add(v2);
            this.applyHit(p.owner, v2, sp, now, p.f, { x: p.x, y: p.y });
          }
        }
        continue;
      }
      if (sp.kind === 'ring' && (p.y > L.baseY + 500 || p.y < L.baseY - 900)) { this.killProj(p, false); continue; }
      if (sp.kind === 'kiss') p.sprite.setScale((sp.s || 2) * (1 + 0.12 * Math.sin((now - p.born) / 70)));
      // VALISE : elle s'ouvre en touchant le sol
      if (sp.kind === 'suitcase' && p.vy > 0 && p.y > L.baseY - 22 && Math.abs(p.x - this.W / 2) < L.mainW / 2 + 16) {
        this.dust(p.x, L.baseY, -1, 5, p.owner.def.fx);
        this.dust(p.x, L.baseY, 1, 5, p.owner.def.fx);
        this.clothesFx(p.x, L.baseY - 20);
        this.cameras.main.shake(110, 0.005);
        this.killProj(p, false);
        continue;
      }
      if (sp.kind === 'hermine' && now - p.born > sp.act) p.spent = true;
      if (this.bzProj && this.bzProj(p, now)) continue;
      // MUR DE PRISON (Ménès) : arrête les tirs adverses ; il ne frappe qu'en sortant du sol
      if (sp.kind === 'wall') {
        if (now - p.born > sp.act) p.spent = true;
        for (const q of this.projs) {
          if (q.dead || q.owner === p.owner || !q.spec.blockable) continue;
          if (Math.abs(q.x - p.x) < (sp.w + q.spec.w) / 2 && q.y > p.y - sp.h - q.spec.h / 2 && q.y < p.y + 10) {
            this.killProj(q, true);
            this.sfx('parry');
          }
        }
        if (now - p.born > sp.life - 200 && !p.crumble) {
          p.crumble = true;
          if (!this.resim) this.tweens.add({ targets: p.sprite, scaleY: 0.05, alpha: 0.4, duration: 180 });
        }
      }

      if (sp.kind === 'book' && p.y > L.baseY - 30 && Math.abs(p.x - this.W / 2) < L.mainW / 2 + 20) {
        // le livre s'écrase sur le sol
        this.dust(p.x, L.baseY, -1, 5, p.owner.def.fx);
        this.dust(p.x, L.baseY, 1, 5, p.owner.def.fx);
        this.cameras.main.shake(140, 0.006);
        this.killProj(p, false);
        continue;
      }
      if (sp.kind === 'book') p.sprite.angle = Math.max(p.sprite.angle * 0.94, -3);
      // bouteilles, tomates : éclatent en touchant le sol du terrain
      if (sp.breakGround && p.vy > 0 && p.y > L.baseY - 10 && Math.abs(p.x - this.W / 2) < L.mainW / 2 + 10) {
        this.splatFx(p);
        this.killProj(p, false);
        continue;
      }
      if (now - p.born > sp.life) {
        this.killProj(p, false);
        continue;
      }

      // collision avec l'adversaire (la CHARGE DU TAUREAU passe à travers les tirs)
      if (this.pls.length > 2) {
        if (p.spent || now < p.armedAt) continue;
        const vv = this.projVictim(p, now);
        if (!vv) continue;
        p.target = vv;
      }
      const v = p.target;
      if (p.spent || now < p.armedAt || now < v.invulnUntil || v.stocks <= 0 || v.grab) continue;
      if (v.atk && v.atk.m.projImmune && now < v.atk.end && sp.blockable) continue;
      const vb = v.sprite.body;
      const pcy = sp.bottom ? p.y - sp.h / 2 : p.y;
      const hit = p.x + sp.w / 2 > vb.x && p.x - sp.w / 2 < vb.right && pcy + sp.h / 2 > vb.y && pcy - sp.h / 2 < vb.bottom;
      if (!hit) continue;
      // CONTRÔLE : AdieuLescure amortit le projectile et le renvoie de volée
      if (v.atk && v.atk.m.type === 'catch' && now >= v.atk.cFrom && now <= v.atk.cTo && sp.kind !== 'hermine' && sp.kind !== 'mine') {
        this.catchProj(v, p, now);
        continue;
      }

      if (sp.kind === 'ring' || sp.kind === 'kiss') {
        const vb3 = v.sprite.body;
        if (v.grab) this.releaseGrab(v);
        if ((vb3.blocked.down || vb3.touching.down) && !v.ledgeSide) {
          // au sol : charme court (attirée vers Nini, plus aucune commande)
          v.atk = null;
          v.charmUntil = now + sp.charm * (now < p.owner.rageUntil ? 1.3 : 1);
          v.sprite.setVelocityX(0);
          this.popup(v.sprite.x, v.sprite.y - 80, 'CHARME !', '#ff7eb6');
          for (let i = 0; i < 6; i++) this.time.delayedCall(i * 50, () => this.heartFx(v.sprite.x + (Math.random() - 0.5) * 50, v.sprite.y - 20, 1.6));
          this.shockwave(v.sprite.x, v.sprite.y, p.owner.def.fx);
        } else {
          // en l'air : seulement ralentie
          v.slowUntil = now + sp.slow;
          v.sprite.setVelocityX(v.sprite.body.velocity.x * 0.5);
          this.popup(v.sprite.x, v.sprite.y - 80, 'RALENTI', '#ff7eb6');
          this.heartFx(v.sprite.x, v.sprite.y - 30, 1.4);
        }
        this.sfx('charm');
        this.killProj(p, false);
      } else if (sp.kind === 'hook') {
        v.damage += sp.dmg;
        this.gainRage(v, sp.dmg, now);
        const toward = Math.sign(p.owner.sprite.x - v.sprite.x) || -p.f;
        v.sprite.setVelocity(toward * sp.pull, -140);
        v.stunUntil = now + sp.stun;
        v.atk = null;
        this.popup(v.sprite.x, v.sprite.y - 70, 'MICRO !', '#6ee7b7');
        this.impactFx(p.owner, v, { dmg: 4 }, null);
        this.killProj(p, false);
      } else {
        const dir = sp.kind === 'comet' || sp.kind === 'mine' || sp.kind === 'book' || sp.kind === 'hermine' || sp.kind === 'wall' ? Math.sign(v.sprite.x - p.x) || p.f : Math.sign(p.vx) || p.f;
        this.applyHit(p.owner, v, sp, now, dir, { x: p.x, y: sp.bottom ? p.y - sp.h / 2 : p.y });
        if (sp.kind === 'hermine' || sp.kind === 'wall') p.spent = true; // elle retourne sous terre toute seule (le mur reste)
        else {
          if (sp.breakGround) this.splatFx(p);
          this.killProj(p, !!sp.explode);
        }
      }
    }
    this.projs = this.projs.filter((p) => !p.dead);
  }

  // =========================================================================
  die(pl, now) {
    const s = pl.sprite;
    if (pl.grab) this.releaseGrab(pl);
    this.pls.forEach((o) => o.grab && o.grab.victim === pl && this.releaseGrab(o));
    s.body.allowGravity = true;
    s.setAngle(0).clearTint();
    pl.rage = 0; pl.rageUntil = 0; pl.charmUntil = 0; pl.slowUntil = 0; pl.armorUntil = 0;
    pl.markUntil = 0; pl.heat = 0;
    if (pl.def.money) { pl.money = Math.floor((pl.money || 0) / 2); pl.goldUntil = 0; }
    if (now < (pl.invisUntil || 0) && this.bzReveal) this.bzReveal(pl, now);
    pl.ledgeSide = 0;
    this.landReset(pl);
    if (pl.umb) { pl.umb.destroy(); pl.umb = null; }
    if (pl.carryImg) { pl.carryImg.destroy(); pl.carryImg = null; }
    this.clearCharge(pl);
    const px = Phaser.Math.Clamp(s.x, 24, this.W - 24);
    const py = Phaser.Math.Clamp(s.y, 24, this.H - 24);
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 40 + Math.random() * 110;
      const r = this.add.rectangle(px, py, 10, 10, i % 2 ? 0xff5a5a : 0xffe9a8).setDepth(45);
      this.tweens.add({ targets: r, x: px + Math.cos(a) * d, y: py + Math.sin(a) * d, alpha: 0, duration: 420, onComplete: () => r.destroy() });
    }
    const star = this.add.image(px, py, 'burst').setScale(PX * 2).setDepth(45);
    this.tweens.add({ targets: star, scale: PX * 4, alpha: 0, duration: 300, onComplete: () => star.destroy() });
    this.cameras.main.shake(200, 0.01);
    this.sfx('ko');
    if (!this.training) pl.stocks--;
    pl.damage = 0;
    pl.atk = null;
    if (pl.stocks <= 0) {
      if (this.pls.length > 2) return this.eliminate(pl, now);
      s.setVisible(false);
      s.body.enable = false;
      this.finish(pl === this.p1 ? this.p2 : this.p1);
      return;
    }
    s.setPosition(this.W / 2, L.baseY - 330).setVelocity(0, 0);
    pl.invulnUntil = now + 1800;
    pl.stunUntil = 0;
    pl.jumps = pl.def.jumps;
  }

  finish(winner) {
    this.over = true;
    const meP = this.net ? this.pl(this.net.me) : this.p1;
    const won = !!winner && (winner === meP || (this.pls.length > 2 && winner.team === meP.team));
    if (winner && !this.resim && typeof MUSIC !== 'undefined') MUSIC.jingle(won ? 'win' : 'lose');
    if (!winner) {
      // fin du chrono à égalité parfaite (mêmes vies, mêmes %)
      this.banner.setText('ÉGALITÉ');
      this.sub.setText(this.net ? '' : 'TOUCHE POUR REJOUER');
      if (this.net && this.onlineOverButtons) this.onlineOverButtons();
    } else if (this.net) {
      this.onlineFinish(winner);
    } else {
      this.banner.setText(winner === this.p1 ? 'VICTOIRE !' : 'DÉFAITE...');
      this.sub.setText('TOUCHE POUR REJOUER');
    }
    this.pls.forEach((p) => {
      this.clearCharge(p);
      if (p.sprite.body.enable) p.sprite.setVelocity(0, 0);
    });
    this.projs.forEach((p) => !p.dead && this.killProj(p, false));
    this.projs = [];
    this.chainGfx.clear();
    if (camp && camp.phase === 'match') this.campFinish(winner === this.p1);
  }

  landReset(pl) {
    pl.jumps = pl.def.jumps;
    pl.tumble = 0;
    pl.airDodged = false;
    pl.helpless = false;
    pl.recUsed = false;
    pl.hopUsed = false;
    pl.floatUsed = false;
    pl.dashUsed = false;
    pl.ledgeInvUsed = false;
    pl.chargeUsed = pl.hornUsed = pl.blinkUsed = pl.leapUsed = pl.vanishUsed = false;
    pl.gcUntil = 0;
  }

  tryLedge(pl, other, now) {
    const b = pl.sprite.body;
    const cx = this.W / 2, half = L.mainW / 2;
    for (const side of [-1, 1]) {
      const edgeX = cx + side * half;
      const out = (b.center.x - edgeX) * side; // > 0 : dehors
      // sous le niveau du bord (contre le mur de terre ou juste dessous), la zone d'accroche est plus large
      // et si on se cogne sous le terrain près du coin, on attrape quand même le bord
      const ceiling = b.blocked.up || b.touching.up;
      const inner = ceiling ? b.halfWidth + 130 : b.top > L.baseY - 6 ? b.halfWidth + 36 : 8;
      if (out < -inner || out > b.halfWidth + 46) continue;
      if (b.top < L.baseY - 50 || b.top > L.baseY + 70) continue;
      if (this.pls.some((o) => o !== pl && o.ledgeSide === side)) continue; // déjà pris par quelqu'un
      this.grabLedge(pl, side, now);
      return true;
    }
    return false;
  }

  grabLedge(pl, side, now) {
    const s = pl.sprite;
    this.sfx('ledge');
    if (pl.grab) this.releaseGrab(pl);
    pl.ledgeSide = side;
    pl.ledgeAt = now;
    pl.atk = null;
    pl.helpless = false;
    pl.rollUntil = 0;
    pl.dodgeLock = 0;
    pl.facing = -side;
    s.setFlipX(pl.facing < 0);
    if (!pl.ledgeInvUsed) {
      pl.invulnUntil = Math.max(pl.invulnUntil, now + 500);
      pl.ledgeInvUsed = true;
    }
    s.body.allowGravity = false;
    s.setVelocity(0, 0);
    this.placeOnLedge(pl);
    this.dust(s.x, L.baseY, -side, 3, pl.def.fx);
  }

  placeOnLedge(pl) {
    const s = pl.sprite, b = s.body, side = pl.ledgeSide;
    const edgeX = this.W / 2 + side * (L.mainW / 2);
    const dx = s.x - b.center.x, dy = s.y - b.center.y;
    const x = edgeX + side * (b.halfWidth + 2) + dx;
    const y = L.baseY - 6 + b.halfHeight + dy;
    this.putAt(s, x, y);
  }

  // déplace un perso d'un coup (le corps physique suit tout de suite, décalage compris)
  putAt(s, x, y) {
    const b = s.body;
    s.setPosition(x, y);
    b.reset(x, y);
    b.updateFromGameObject();
    b.prev.copy(b.position);
    b.prevFrame.copy(b.position);
  }

  ledgeStep(pl, other, now, inp) {
    const s = pl.sprite, side = pl.ledgeSide;
    s.body.allowGravity = false;
    s.setVelocity(0, 0);
    this.placeOnLedge(pl);
    pl.jumps = pl.def.jumps;
    pl.tumble = 0;
    pl.airDodged = false;
    pl.recUsed = false;
    pl.hopUsed = pl.floatUsed = pl.dashUsed = false;
    const t = now - pl.ledgeAt;
    if (t > 3000) return this.leaveLedge(pl, now, 'drop');
    if (t < 100) return;
    const toward = -side;
    if (pl.bufJump >= now) { pl.bufJump = 0; return this.leaveLedge(pl, now, 'jump'); }
    if (pl.bufAtk >= now) { pl.bufAtk = 0; return this.leaveLedge(pl, now, 'attack'); }
    if (pl.bufDodge >= now) { pl.bufDodge = 0; return this.leaveLedge(pl, now, 'roll'); }
    if (inp.sx * toward > 0.5 || inp.sy < -0.6) return this.leaveLedge(pl, now, 'climb');
    if (inp.sx * side > 0.5 || inp.sy > 0.6) return this.leaveLedge(pl, now, 'drop');
  }

  leaveLedge(pl, now, how) {
    const s = pl.sprite, b = s.body, side = pl.ledgeSide;
    pl.ledgeSide = 0;
    b.allowGravity = true;
    pl.ledgeCdUntil = now + 400;
    if (how === 'drop') {
      s.setVelocity(side * 60, 100);
      return;
    }
    if (how === 'jump') {
      s.setVelocity(-side * 120, -pl.def.jump * 1.05);
      pl.jumps = pl.def.jumps - 1;
      pl.lastJump = now;
      this.sfx('jump');
      return;
    }
    // remonte sur le terrain
    const edgeX = this.W / 2 + side * (L.mainW / 2);
    const dx = s.x - b.center.x, dy = s.y - b.center.y;
    const x = edgeX - side * (b.halfWidth + 10) + dx;
    const y = L.baseY - b.halfHeight - 1 + dy;
    this.putAt(s, x, y);
    s.setVelocity(0, 0);
    pl.facing = -side;
    if (how === 'climb') {
      pl.invulnUntil = Math.max(pl.invulnUntil, now + 150);
      pl.cdUntil = Math.max(pl.cdUntil, now + 150);
    } else if (how === 'roll') {
      pl.rollDir = -side;
      pl.rollUntil = now + 300;
      pl.dodgeUntil = pl.invulnUntil = Math.max(pl.invulnUntil, now + 280);
      pl.dodgeCd = now + 1000;
    } else if (how === 'attack') {
      pl.invulnUntil = Math.max(pl.invulnUntil, now + 120);
      const m = LEDGE_ATK;
      pl.atk = { id: ++this.atkSeq, m, key: 'ledge', pose: m.pose, start: now, hitAt: now + m.startup, end: now + m.total, moveLock: now + m.total, done: false };
      pl.cdUntil = now + m.total;
      this.attackFx(pl, m);
    }
  }

  // bonus d'un lourd chargé : jusqu'à +50 % de dégâts et +25 % de recul
  charged(spec, atk) {
    if (!atk || !atk.chg || !atk.m.chargeMax) return spec;
    const f = Math.min(atk.chg / atk.m.chargeMax, 1);
    return Object.assign({}, spec, { dmg: spec.dmg * (1 + 0.5 * f), kb: spec.kb * (1 + 0.25 * f) });
  }

  // TÉLÉPORT (Astra) : sur son étoile piège si elle existe (l'étoile disparaît), sinon un bond vers le haut
  doBlink(pl, now) {
    const s = pl.sprite;
    const star = this.projs.find((p) => !p.dead && p.owner === pl && p.spec.kind === 'mine');
    const from = { x: s.x, y: s.y };
    if (star) {
      if (pl.grab) this.releaseGrab(pl);
      pl.ledgeSide = 0;
      s.body.allowGravity = true;
      this.putAt(s, star.x, star.y - 40);
      s.body.setVelocity(0, -120);
      this.killProj(star, false);
      pl.invulnUntil = Math.max(pl.invulnUntil, now + 200);
    } else {
      s.body.setVelocity(s.body.velocity.x * 0.3, -pl.atk.m.rise);
    }
    if (this.resim) return;
    this.runeFx(from.x, from.y - 20, pl.def.fx, 2);
    this.runeFx(s.x, s.y - 20, pl.def.fx, 2.4);
    this.popup(s.x, s.y - 80, star ? 'TÉLÉPORT !' : 'ENVOL', '#b79cff');
    this.sfx('magic', 0.8);
  }

  startChain(pl, now) {
    const a0 = pl.atk;
    const base = (this.famMoves ? this.famMoves(pl) : pl.def.moves)[a0.chainKey];
    let m = base.chain[a0.chainIdx];
    if (now < pl.rageUntil) m = { ...m, startup: m.startup * 0.75, total: m.total * 0.75, active: m.active * 0.75 };
    pl.atk = { id: ++this.atkSeq, m, key: a0.chainKey, pose: m.pose, start: now, hitAt: now + m.startup, end: now + m.total, moveLock: now + m.startup + (m.active || 0), done: false, chainKey: a0.chainKey, chainIdx: a0.chainIdx + 1 };
    pl.cdUntil = now + m.total;
    if (m.lunge) pl.sprite.setVelocityX(pl.facing * m.lunge);
    this.attackFx(pl, m);
    this.sfx('swing', Math.min(((m.dmg || (m.proj && m.proj.dmg) || 6) - 3) / 10, 1));
  }

  // Le coup va-t-il faire sortir la victime ? (prévision simple, identique sur les deux téléphones)
  isLethal(vic, now) {
    const b = vic.sprite.body;
    let x = vic.sprite.x, y = vic.sprite.y, vx = b.velocity.x, vy = b.velocity.y;
    const T = Math.max((vic.stunUntil - now) / 1000, 0);
    const cx = this.W / 2;
    for (let t = 0; t < T; t += 1 / 60) {
      vy += GRAVITY / 60;
      vx *= 1 - 0.8 / 60;
      x += vx / 60;
      y += vy / 60;
      if (x < cx - BLAST_X || x > cx + BLAST_X || y < L.baseY - BLAST_TOP) return true;
    }
    return false;
  }
}

// ---------------------------------------------------------------------------
// Plein écran + démarrage
// ---------------------------------------------------------------------------
function enterFullscreen() {
  try {
    const d = document;
    if (d.fullscreenElement || d.webkitFullscreenElement) return;
    const el = d.documentElement;
    const f = el.requestFullscreen || el.webkitRequestFullscreen;
    if (f) {
      const r = f.call(el);
      if (r && r.catch) r.catch(() => {});
    }
  } catch (e) {}
}
function toggleFullscreen() {
  try {
    const d = document;
    if (d.fullscreenElement || d.webkitFullscreenElement) {
      const x = d.exitFullscreen || d.webkitExitFullscreen;
      if (x) {
        const r = x.call(d);
        if (r && r.catch) r.catch(() => {});
      }
    } else enterFullscreen();
  } catch (e) {}
}

let trainingMode = false; // mode entraînement
let sessionReady = false; // connecté ou invité : on saute l'écran titre
let canonLayout = false; // jeu en ligne : géométrie identique sur tous les téléphones
function computeLayout() {
  if (canonLayout) return { W: 1280, H: 720, portrait: false, mainW: 760, baseY: 490 };
  const vw = Math.max(window.innerWidth, 320);
  const vh = Math.max(window.innerHeight, 240);
  const portrait = vh > vw;
  let W, H;
  if (portrait) {
    W = 720;
    H = Math.min(Math.round((720 * vh) / vw), 1800);
  } else {
    H = 720;
    W = Math.min(Math.round((720 * vw) / vh), 1800);
  }
  const mainW = Math.min(portrait ? 560 : 760, W - 80);
  const baseY = Math.round(portrait ? H * 0.45 : H * 0.68);
  return { W, H, portrait, mainW, baseY };
}

function boot() {
  if (game) {
    game.destroy(true);
    game = null;
  }
  document.getElementById('game').innerHTML = '';
  L = computeLayout();
  lastPortrait = L.portrait;
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: L.W,
    height: L.H,
    pixelArt: true,
    backgroundColor: '#0b0d1f',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 4, touch: { capture: true } },
    physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
    scene: [GameScene],
  });
}

let resizeTimer = null;
function onResize() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (!canonLayout && window.innerHeight > window.innerWidth !== lastPortrait) boot();
  }, 300);
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);
document.addEventListener('contextmenu', (e) => e.preventDefault());

Promise.race([
  document.fonts ? document.fonts.load('16px "BrawlPixel"') : Promise.resolve(),
  new Promise((r) => setTimeout(r, 2000)),
])
  .catch(() => {})
  .then(() => (typeof loadPngChars === 'function' ? loadPngChars() : null))
  .then(boot);
