// ===========================================================================
// ADIEULESCURE : maillot marine à scapulaire, jean, boucles et barbe rousse, clope au bec.
// Ses coups piochent dans : les Girondins (passe, tête, contrôle de la poitrine), Tottenham (les éperons de
// Harry Hotspur, le coq sur le ballon), Les Banshees d'Inisherin (le violon de la chanson, l'ânesse Jenny),
// le cyclisme (l'échappée), Marmande (la « pomme d'amour », capitale de la tomate), l'IPA, la cigarette,
// et le graphisme : CTRL+Z.
// Deux mécaniques que personne d'autre n'a :
//  - CTRL+Z : il revient là où il était une seconde plus tôt, et les dégâts reçus entre-temps sont annulés
//  - CONTRÔLE : il amortit un projectile et le renvoie de volée, ou attrape l'attaquant et le projette
// ===========================================================================
const ADIEU_NAIR = { type: 'melee', pose: 'header', startup: 60, active: 100, total: 300, w: 70, h: 56, ox: 50, oy: -18, dmg: 5, kb: 250, ks: 5.8, ang: -0.6, stun: 170, fx: { cres: 'cres_white', s: 2.8, ang: -20 } };
CHARS.adieulescure = {
  id: 'adieulescure', name: 'ADIEULESCURE', role: 'CTRL+Z + CONTRÔLE', roleCol: '#7fb2ff', cardCol: '#2c3866',
  speed: 320, jump: 650, weight: 1.0, jumps: 2,
  rewind: true, idleFx: true,
  pal: { main: '#1b2346', dark: '#0c1024', skin: '#f4c4a0', skin2: '#e0a07a', hair: '#3e2414', accent: '#ffffff', glove: '#f4c4a0' },
  fx: { main: 0x2c3866, alt: 0xffffff, core: 0xdfe3ee, cres: 'cres_white' },
  help: ['NEUTRE  PASSE+TÊTE', 'AVANT   ÉCHAPPÉE', 'HAUT    IPA', 'BAS     CTRL+Z', 'ARRIÈRE CONTRÔLE', 'AIR     VIOLON', 'AIR+AV  TOMATE'],
  moves: {
    // PASSE puis TÊTE (Girondins)
    neutral: { type: 'melee', pose: 'kick', startup: 60, active: 90, total: 250, w: 74, h: 40, ox: 52, oy: 16, dmg: 4, kb: 120, ks: 1.4, ang: -0.25, stun: 150, chain: [ADIEU_NAIR], fx: { cres: 'cres_white', s: 2.4, ang: 10 } },
    // ÉCHAPPÉE : il enfourche son vélo et fonce (le vélo touche pendant tout le trajet)
    forward: { type: 'melee', pose: 'ride0', anim: ['ride0', 'ride1'], startup: 190, active: 220, total: 720, w: 88, h: 70, ox: 40, oy: 6, dmg: 10, kb: 310, ks: 8, ang: -0.35, stun: 210, lunge: 560, fx: { bike: true, ghosts: 3 } },
    // IPA : il secoue la bouteille, la mousse jaillit au-dessus de lui
    up: { type: 'melee', pose: 'drink', startup: 120, active: 160, total: 500, w: 84, h: 110, ox: 10, oy: -84, dmg: 9, kb: 320, ks: 8.4, ang: -1.4, stun: 210, fx: { foam: true } },
    // ÉPERONS : coup de pied retourné vers le haut, le coq chante (coup de retour)
    upAir: { type: 'melee', pose: 'spur', startup: 60, active: 240, total: 520, w: 70, h: 100, ox: 22, oy: -50, dmg: 9, kb: 300, ks: 7, ang: -1.35, stun: 200, rise: 800, riseX: 110, inv: 50, helpless: true, fx: { rooster: true, ghosts: 2 } },
    // CTRL+Z : retour une seconde en arrière (recharge 11 s)
    down: { type: 'rewind', pose: 'ctrl', startup: 120, total: 380, cd: 11000, cdKey: 'ctrlz', fx: { undo: true } },
    downAir: { type: 'rewind', pose: 'ctrl', startup: 120, total: 380, cd: 11000, cdKey: 'ctrlz', fx: { undo: true } },
    // CONTRÔLE : amorti de la poitrine ; projectile renvoyé de volée, attaquant attrapé et projeté
    back: { type: 'catch', pose: 'catch', startup: 60, window: 260, total: 720, fx: {},
      throw: { dmg: 10, kb: 360, ks: 8.6, ang: -0.75, stun: 250, name: 'GRAND PONT !' } },
    // VIOLON (Banshees d'Inisherin) : la mélodie tourne autour de lui
    nAir: { type: 'melee', pose: 'fiddle', startup: 70, active: 160, total: 420, w: 116, h: 100, ox: 0, oy: -6, dmg: 7, kb: 240, ks: 5.6, ang: -0.75, stun: 170, fx: { notes: true, violin: true } },
    // POMME D'AMOUR (Marmande) : une tomate lancée en cloche, qui éclate
    fwdAir: { type: 'proj', pose: 'toss', startup: 90, total: 420, max: 2, fx: {},
      proj: { kind: 'tomato', tex: 'tomato', s: 3, vx: 560, vy: -60, grav: 1500, life: 1200, w: 30, h: 30, ox: 34, oy: -14, dmg: 7, kb: 250, ks: 6, ang: -0.4, stun: 170, spin: 8, breakGround: true, splat: 0xe0302a } },
    // RUADE (l'ânesse Jenny) : double coup de pied vers l'arrière
    bAir: { type: 'melee', pose: 'rkick', startup: 90, active: 110, total: 430, turn: true, w: 96, h: 46, ox: -60, oy: 8, dmg: 11, kb: 330, ks: 8, ang: -0.45, stun: 210, fx: { donkey: true, ghosts: 2 } },
  },
};
ORDER.push('adieulescure');

// PASTIS de Deadlulu : petites bouteilles lancées à mi-distance, qui éclatent
CHARS.deadlulu.name = 'DEADLULU';
CHARS.deadlulu.help[0] = 'NEUTRE  PASTIS';
CHARS.deadlulu.moves.neutral = {
  type: 'proj', pose: 'toss', prePose: 'tossPre', startup: 70, total: 320, max: 3, fx: {},
  proj: { kind: 'bottle', tex: 'pastis', s: 3, vx: 700, vy: -180, grav: 1200, life: 900, w: 26, h: 34, ox: 30, oy: -14, dmg: 7, kb: 240, ks: 5.5, ang: -0.35, stun: 180, spin: 14, small: true, breakGround: true, splat: 0xf0b030 },
};

Object.assign(GameScene.prototype, {
  makeExtraTextures() {
    // bouton LOURD (orange) et son icône (gros poing)
    circleTex(this, 'btnHeavy', 28, 'rgba(255,140,40,0.35)', 'rgba(255,255,255,0.8)', 2);
    iconTex(this, 'icoHeavy', ['..XXXXX..', '.XX.X.XX.', 'XX.XX.XXX', 'XXXXXXXXX', 'XXXXXXXXX', 'XXXXXXXX.', '.XXXXXXX.', '..XXXXX..', '..XXXXX..'], '#ffffff');
    // bouteille de pastis (verre, liquide ambré, étiquette jaune et bleue)
    iconTex(this, 'pastis', ['...kkk...', '...kbk...', '...kgk...', '...kgk...', '..kgggk..', '.kgaaagk.', '.khaaaak.', '.kyyyyyk.', '.kybbbyk.', '.kyyyyyk.', '.khaaaak.', '.kaaaaak.', '.kgaaagk.', '..kkkkk..'], '#000',
      { k: '#14121c', b: '#1e3a8a', g: '#d8f0ea', a: '#f0b030', h: '#ffe9a0', y: '#ffd23a' });
    // tomate de Marmande
    iconTex(this, 'tomato', ['...gg.g..', '..kgggk..', '.kkrgrkk.', 'krrhrrrrk', 'krhhrrrrk', 'krrrrrrrk', 'krrrrrrdk', '.krrrrdk.', '..kkkkk..'], '#000',
      { k: '#3a0a0a', g: '#3fa040', r: '#e0302a', h: '#ff8a70', d: '#a01818' });
    // ballon renvoyé de volée
    iconTex(this, 'football', ['..kkkk..', '.kwwkwk.', 'kwkkwwwk', 'kwkwwkwk', 'kwwwkkwk', 'kwkwwwwk', '.kwwkwk.', '..kkkk..'], '#000', { k: '#14121c', w: '#ffffff' });
    // coq dressé sur le ballon (silhouette)
    iconTex(this, 'rooster', ['.....rr.....', '....kkr.....', '...kwwk.....', '..kwwwwy....', '..kwwwk.....', '.kwwwwwk..kk', 'kwwwwwwwkkwk', 'kwwwwwwwwwk.', '.kwwwwwwwk..', '..kwwwwwk...', '...k..k.....', '..kk.kk.....', '..kwwwwk....', '.kwkwwkwk...', '.kwwkkwwk...', '..kwwwwk....'], '#000',
      { k: '#0c1024', w: '#ffffff', r: '#e0302a', y: '#ffd23a' });
    // l'ânesse (tête et oreilles)
    iconTex(this, 'donkey', ['.kk..kk.....', '.kgk.kgk....', '.kgk.kgk....', '..kgkgk.....', '..kggggkk...', '.kggggggk...', '.kgkgggggk..', '.kggggggggk.', '..kgggggwwk.', '...kggggwwk.', '....kkkkkk..'], '#000',
      { k: '#2a1a14', g: '#8a7a70', w: '#d8cfc6' });
    // flèche « annuler »
    iconTex(this, 'undo', ['...k......', '..kk......', '.kwkkkkk..', 'kwwwwwwwk.', '.kwkkkkwwk', '..kk...kwk', '...k...kwk', '.......kwk', '....kkkwwk', '....kwwwk.', '....kkkk..'], '#000', { k: '#14121c', w: '#7fb2ff' });
  },

  // --- CTRL+Z : trace de la dernière seconde (10 points, un toutes les 6 images) --------------------------
  zRecord(pl, now) {
    if (this.simFrames % 6) return;
    const s = pl.sprite, i = pl.zi || 0;
    pl['zx' + i] = Math.round(s.x * 10) / 10;
    pl['zy' + i] = Math.round(s.y * 10) / 10;
    pl['zd' + i] = pl.damage;
    pl['zf' + i] = pl.facing;
    pl.zi = (i + 1) % 10;
    pl.zn = Math.min((pl.zn || 0) + 1, 10);
  },

  doRewind(pl, now) {
    if (!pl.zn) return;
    const i = pl.zn < 10 ? 0 : pl.zi || 0; // le point le plus ancien
    const x = pl['zx' + i], y = pl['zy' + i];
    const s = pl.sprite;
    const from = { x: s.x, y: s.y };
    if (pl.grab) this.releaseGrab(pl);
    [this.p1, this.p2].forEach((o) => o.grab && o.grab.victim === pl && this.releaseGrab(o));
    pl.ledgeSide = 0;
    s.body.allowGravity = true;
    this.putAt(s, x, y);
    s.body.setVelocity(0, 0);
    const undone = Math.max(0, pl.damage - pl['zd' + i]);
    pl.damage = Math.min(pl.damage, pl['zd' + i]);
    pl.stunUntil = 0;
    pl.helpless = false;
    pl.invulnUntil = Math.max(pl.invulnUntil, now + 250);
    pl.zn = 0; // on ne peut pas remonter plus loin
    if (this.resim) return;
    // visuel : la silhouette reste au départ, une ligne de curseur rejoint l'arrivée
    const g = this.add.image(from.x, from.y, s.texture.key).setScale(PX).setFlipX(s.flipX).setTint(0x7fb2ff).setAlpha(0.55).setDepth(9);
    this.tweens.add({ targets: g, alpha: 0, duration: 420, onComplete: () => g.destroy() });
    const n = 8;
    for (let k = 0; k <= n; k++) {
      const q = this.add.rectangle(from.x + ((x - from.x) * k) / n, from.y - 30 + ((y - from.y) * k) / n, 8, 8, k % 2 ? 0x7fb2ff : 0xffffff).setDepth(30);
      this.tweens.add({ targets: q, alpha: 0, scale: 0.2, duration: 300, delay: k * 18, onComplete: () => q.destroy() });
    }
    const u = this.add.image(x, y - 90, 'undo').setScale(PX).setDepth(40);
    this.tweens.add({ targets: u, y: y - 120, angle: -360, alpha: 0, duration: 520, onComplete: () => u.destroy() });
    this.popup(x, y - 70, undone >= 1 ? `CTRL+Z  -${Math.round(undone)}%` : 'CTRL+Z', '#7fb2ff');
    this.sfx('rewind');
  },

  // --- CONTRÔLE ---------------------------------------------------------------------------------------
  catchProj(v, p, now) {
    const a = v.atk;
    a.cTo = 0;
    a.pose = 'volley';
    a.end = now + 320;
    v.cdUntil = a.end;
    this.killProj(p, false);
    const o = p.owner;
    v.facing = Math.sign(o.sprite.x - v.sprite.x) || v.facing;
    v.sprite.setFlipX(v.facing < 0);
    const sp = { kind: 'volley', tex: 'football', s: 3, vx: 1250, life: 750, w: 30, h: 30, ox: 34, oy: -4, spin: 20,
      dmg: Math.max(5, Math.min(12, Math.round(p.spec.dmg || 6))), kb: 300, ks: 7, ang: -0.3, stun: 200, small: true };
    this.spawnProj(v, o, null, now, 0, sp);
    v.invulnUntil = Math.max(v.invulnUntil, now + 120);
    this.hitstop(60);
    if (this.resim) return;
    const c = v.sprite.body.center;
    this.popup(c.x, c.y - 90, 'CONTRÔLE !', '#7fb2ff');
    const r = this.add.image(c.x, c.y - 10, 'ring').setTint(0xffffff).setDepth(31).setScale(0.8);
    this.tweens.add({ targets: r, scale: 4, alpha: 0, duration: 280, onComplete: () => r.destroy() });
    this.sfx('catch');
  },

  catchMelee(v, att, spec, now) {
    const a = v.atk;
    a.cTo = 0;
    v.facing = Math.sign(att.sprite.x - v.sprite.x) || v.facing;
    v.sprite.setFlipX(v.facing < 0);
    if (att.grab) this.releaseGrab(att);
    this.startGrab(v, att, a.m, now);
    v.invulnUntil = Math.max(v.invulnUntil, now + 300);
    this.sfx('catch');
  },

  // --- effets visuels ----------------------------------------------------------------------------------
  extraFx(pl, m, fx, b, f) {
    if (fx.foam) {
      // geyser de mousse au-dessus de la tête
      for (let i = 0; i < 16; i++) {
        const q = this.add.rectangle(b.x + f * 8 + (Math.random() - 0.5) * 20, b.y - 40, 8 + Math.random() * 8, 8 + Math.random() * 8, i % 3 ? 0xfff6e0 : 0xf0b030).setDepth(22);
        this.tweens.add({ targets: q, x: q.x + (Math.random() - 0.5) * 90, y: b.y - 120 - Math.random() * 90, alpha: 0, duration: 380 + Math.random() * 200, delay: i * 10, onComplete: () => q.destroy() });
      }
    }
    if (fx.rooster) {
      const r = this.add.image(b.x, b.y - 20, 'rooster').setScale(PX * 0.6).setDepth(22).setFlipX(f < 0).setAlpha(0.95);
      this.tweens.add({ targets: r, y: b.y - 150, scale: PX * 1.1, alpha: 0, duration: 520, ease: 'Cubic.easeOut', onComplete: () => r.destroy() });
      this.popup(b.x, b.y - 110, 'COCORICO !', '#ffffff');
      this.sfx('rooster');
    }
    if (fx.donkey) {
      const d = this.add.image(b.x - f * 80, b.y + 4, 'donkey').setScale(PX * 0.5).setDepth(22).setFlipX(f > 0);
      this.tweens.add({ targets: d, scale: PX * 1.1, alpha: 0, duration: 380, onComplete: () => d.destroy() });
      this.dust(b.x - f * 60, b.y + 10, -f, 4, pl.def.fx);
    }
    if (fx.bike) { this.dust(b.x - f * 30, b.y + 34, -f, 6, pl.def.fx); this.sfx('bike'); }
    if (fx.violin || fx.notes) this.sfx('note');
    if (fx.violin) for (let i = 0; i < 6; i++) this.noteFx(b.x + Math.cos(i) * 50, b.y - 10 + Math.sin(i * 1.7) * 40, i % 2 ? 1 : -1, i);
  },

  // éclats de verre / jus de tomate
  splatFx(p) {
    if (this.resim) return;
    const sp = p.spec, col = sp.splat || 0xffffff;
    this.sfx(sp.kind === 'bottle' ? 'glass' : 'splat');
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI * Math.random();
      const d = 20 + Math.random() * 50;
      const q = this.add.rectangle(p.x, p.y, 6, 6, i % 3 === 0 ? 0xffffff : col).setDepth(30);
      this.tweens.add({ targets: q, x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d + 20, alpha: 0, duration: 340, onComplete: () => q.destroy() });
    }
  },

  // cigarette : petites bouffées de fumée quand il attend
  idleFx(pl, name, now) {
    if (name !== 'idle0' && name !== 'idle1') return;
    if (now - (pl.lastPuff || 0) < 700) return;
    pl.lastPuff = now;
    const s = pl.sprite;
    const x = s.x + pl.facing * 24, y = s.y - 50;
    const q = this.add.circle(x, y, 5, 0xdedad4, 0.7).setDepth(12);
    this.tweens.add({ targets: q, x: x + pl.facing * 10 + (Math.random() - 0.5) * 10, y: y - 40, scale: 2.4, alpha: 0, duration: 1200, onComplete: () => q.destroy() });
  },
});
