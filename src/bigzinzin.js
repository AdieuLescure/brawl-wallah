// ===========================================================================
// BIGZINZIN : costume bleu ciel, petite antenne, lunettes rondes, téléphone à la main (ses coups légers).
// Monteur vidéo et homme d'affaires. Mécaniques :
//  - ARGENT / JACKPOT : il gagne de l'argent en touchant (1,7 € par % infligé) et en perd en étant touché
//    (1 € par % reçu). À 100 € : JACKPOT, costume et antenne en or pendant 8 s : +20 % de dégâts, -15 % de dégâts
//    et de recul reçus. La cagnotte repart de zéro (et est divisée par deux s'il perd une vie).
//  - DOUBLURE (SPÉCIAL haut) : il se téléporte 240 px plus haut et devient invisible ; à sa place, une silhouette
//    en billets verts. La silhouette encaisse UN coup (corps-à-corps ou tir), puis les billets tombent et il
//    réapparaît. Il réapparaît aussi s'il attaque, s'il est touché, ou au bout de 6 s.
//  - KEY FRAME (SPÉCIAL bas) : il pose une image clé au sol (4 s) ; qui marche dessus reste figé un instant.
//  - FEUILLE A4 (SPÉCIAL) : une feuille qui plane en ondulant ; elle coupe et ralentit.
// Tout l'état de jeu est en champs simples (money, goldUntil, invisUntil, decoyId, freezeUntil) : sauvegardé en ligne.
// ===========================================================================
const BZ = { max: 100, gain: 1.7, loss: 1, goldMs: 8000, dmgUp: 1.2, dmgDown: 0.85, invisMs: 6000, dist: 290 };

CHARS.bigzinzin = {
  id: 'bigzinzin', name: 'BIGZINZIN', role: 'MONTEUR EN OR', roleCol: '#8fd0ff', cardCol: '#5c98d0',
  speed: 355, jump: 690, weight: 1.0, jumps: 3, money: true,
  pal: { main: '#5c98d0', dark: '#2e5a88', skin: '#f8d4b8', skin2: '#e8b896', hair: '#a8823a', accent: '#e04050', glove: '#f8d4b8' },
  fx: { main: 0x5c98d0, alt: 0xcfe8ff, core: 0xffffff, cres: 'cres_white' },
  help: [],
  moves: {},
};
ORDER.push('bigzinzin');

Object.assign(GameScene.prototype, {
  // --- argent et JACKPOT (appelé par applyHit, avant les dégâts) ---------------------------------------------
  bzHit(att, vic, spec, now) {
    if (att.def.money && att !== vic && now < (att.goldUntil || 0)) spec = Object.assign({}, spec, { dmg: spec.dmg * BZ.dmgUp });
    if (vic.def.money && now < (vic.goldUntil || 0)) spec = Object.assign({}, spec, { dmg: spec.dmg * BZ.dmgDown });
    if (att.def.money && att !== vic && !(now < (att.goldUntil || 0))) {
      att.money = (att.money || 0) + spec.dmg * BZ.gain;
      if (!this.resim) {
        const c = att.sprite.body.center;
        this.moneyFx(c.x, c.y - 40, '+' + Math.round(spec.dmg * BZ.gain) + ' €', '#7cff7c');
      }
      if (att.money >= BZ.max) this.bzJackpot(att, now);
    }
    if (vic.def.money && !(now < (vic.goldUntil || 0))) {
      const lost = Math.min(vic.money || 0, spec.dmg * BZ.loss);
      vic.money = (vic.money || 0) - lost;
      if (lost >= 1 && !this.resim) {
        const c = vic.sprite.body.center;
        this.moneyFx(c.x, c.y - 40, '-' + Math.round(lost) + ' €', '#ff7070');
      }
    }
    // touché pendant la DOUBLURE : il réapparaît
    if (now < (vic.invisUntil || 0)) this.bzReveal(vic, now);
    return spec;
  },

  bzJackpot(pl, now) {
    pl.money = 0;
    pl.goldUntil = now + BZ.goldMs;
    if (this.resim) return;
    const c = pl.sprite.body.center;
    this.popup(c.x, c.y - 110, 'JACKPOT !', '#ffd23a');
    this.shockwave(c.x, c.y + 20, { main: 0xffd23a, alt: 0xfff3a0 });
    for (let i = 0; i < 14; i++) this.coinFx(c.x, c.y - 10, i);
    this.sfx('crowd');
    this.cameras.main.shake(200, 0.008);
  },

  // petit texte « +6 € » qui monte (affichage seulement)
  moneyFx(x, y, txt, col) {
    const t = this.add.text(x + (Math.random() - 0.5) * 20, y, txt, { fontFamily: FONT, fontSize: '13px', color: col, stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(42);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 700, onComplete: () => t.destroy() });
  },

  coinFx(x, y, i) {
    const q = this.add.rectangle(x, y, 7, 7, i % 3 ? 0xffd23a : 0xfff3a0).setDepth(31).setAngle(45);
    const a = -Math.PI * (0.1 + 0.8 * Math.random()), d = 60 + Math.random() * 90;
    this.tweens.add({ targets: q, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, duration: 260, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: q, y: y + 40, alpha: 0, angle: 360, delay: 260, duration: 380, ease: 'Quad.easeIn', onComplete: () => q.destroy() });
  },

  // --- à chaque image (après le reste de step) -----------------------------------------------------------------
  bzStep(pl, other, now) {
    const s = pl.sprite;
    // KEY FRAME : image figée (tous les persos peuvent la subir)
    if (now < (pl.freezeUntil || 0)) {
      s.body.setVelocity(0, 0);
      s.setTint(0x9fd8ff);
    }
    if (!pl.def.money) return;
    // DOUBLURE : invisible pour l'adversaire (le joueur, lui, voit une silhouette très pâle)
    if (now < (pl.invisUntil || 0)) {
      const decoy = this.projs.find((p) => !p.dead && p.id === pl.decoyId);
      if (!decoy) this.bzReveal(pl, now);
      else s.setAlpha(pl.human ? 0.22 : 0);
    } else if (pl.invisUntil) {
      this.bzReveal(pl, now);
    }
    // JACKPOT : paillettes d'or
    if (now < (pl.goldUntil || 0) && !this.resim && !(now < (pl.invisUntil || 0)) && now - (pl.goldFx || 0) > 70) {
      pl.goldFx = now;
      const q = this.add.rectangle(s.x + (Math.random() - 0.5) * 50, s.y + (Math.random() - 0.5) * 70, 5, 5, Math.random() < 0.5 ? 0xffd23a : 0xffffff).setDepth(12).setAngle(45);
      this.tweens.add({ targets: q, y: q.y - 30, scale: 0.2, alpha: 0, duration: 500, onComplete: () => q.destroy() });
    }
  },

  // --- DOUBLURE ---------------------------------------------------------------------------------------------
  bzVanish(pl, now) {
    const s = pl.sprite;
    const x0 = s.x, y0 = s.y;
    // la silhouette en billets reste à sa place (un « projectile » immobile, sauvegardé en ligne comme les autres)
    const sp = { kind: 'decoy', tex: `${pl.char}_idle0`, s: PX, vx: 0, life: BZ.invisMs, w: 44, h: 76, ox: 0, oy: 0, dmg: 0 };
    const img = this.add.image(x0, y0, sp.tex).setScale(PX).setDepth(9).setTint(0x5fbf5a).setFlipX(pl.facing < 0);
    this.projs.push({ id: ++this.projSeq, owner: pl, target: this.foeOf(pl), spec: sp, x: x0, y: y0, vx: 0, vy: 0, born: now, armedAt: now, lastTrail: 0, sprite: img, dead: false, f: pl.facing });
    pl.decoyId = this.projSeq;
    pl.invisUntil = now + BZ.invisMs;
    // téléport vers le haut (sans sortir par le haut de l'écran)
    const y1 = Math.max(y0 - BZ.dist, L.baseY - BLAST_TOP + 140);
    if (pl.ledgeSide) { pl.ledgeSide = 0; s.body.allowGravity = true; }
    this.putAt(s, x0, y1);
    s.body.setVelocity(0, -60);
    if (this.resim) return;
    for (let i = 0; i < 12; i++) this.billFx(x0, y0, i, false);
    this.popup(x0, y0 - 80, 'DOUBLURE', '#7cff7c');
    this.sfx('magic', 0.6);
  },

  // il réapparaît ; la silhouette (si elle est encore là) s'effondre en billets
  bzReveal(pl, now) {
    pl.invisUntil = 0;
    const d = this.projs.find((p) => !p.dead && p.id === pl.decoyId);
    pl.decoyId = 0;
    if (d) {
      if (!this.resim) for (let i = 0; i < 14; i++) this.billFx(d.x, d.y, i, true);
      this.killProj(d, false);
    }
    if (!this.resim) {
      const s = pl.sprite;
      this.runeFx(s.x, s.y - 10, { main: 0x5fbf5a, alt: 0xb8f0a0 }, 1.6);
    }
  },

  // billets verts qui volent (départ) ou tombent (silhouette détruite)
  billFx(x, y, i, fall) {
    const q = this.add.image(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 70, 'bill').setScale(PX * 0.6).setDepth(28).setAngle(Math.random() * 360);
    if (fall) this.tweens.add({ targets: q, y: L.baseY + 10, x: q.x + (Math.random() - 0.5) * 60, angle: q.angle + 200, alpha: 0, duration: 700 + Math.random() * 300, ease: 'Quad.easeIn', onComplete: () => q.destroy() });
    else this.tweens.add({ targets: q, y: q.y - 40 - Math.random() * 40, x: q.x + (Math.random() - 0.5) * 80, angle: q.angle + 120, alpha: 0, duration: 500, onComplete: () => q.destroy() });
  },

  // un coup au corps-à-corps de « pl » touche-t-il la silhouette de « other » ? (elle encaisse à sa place)
  bzDecoyHit(pl, other, box, now) {
    if (!other.def.money || !(now < (other.invisUntil || 0))) return false;
    const d = this.projs.find((p) => !p.dead && p.id === other.decoyId);
    if (!d) return false;
    const r = new Phaser.Geom.Rectangle(d.x - d.spec.w / 2, d.y - d.spec.h / 2, d.spec.w, d.spec.h);
    if (!Phaser.Geom.Intersects.RectangleToRectangle(box, r)) return false;
    if (!this.resim) {
      this.popup(d.x, d.y - 70, 'LEURRE !', '#7cff7c');
      this.sfx('hit', 0.3);
    }
    this.bzReveal(other, now);
    return true;
  },

  // --- projectiles propres à BIGZINZIN (true = déjà traité) ---------------------------------------------------
  bzProj(p, now) {
    const sp = p.spec;
    if (sp.kind === 'decoy') {
      // immobile ; un tir adverse qui la traverse s'arrête et la détruit
      for (const q of this.projs) {
        if (q.dead || q === p || q.owner === p.owner || q.spec.kind === 'decoy') continue;
        if (Math.abs(q.x - p.x) < (sp.w + q.spec.w) / 2 && Math.abs(q.y - p.y) < (sp.h + q.spec.h) / 2) {
          this.killProj(q, true);
          if (!this.resim) this.popup(p.x, p.y - 70, 'LEURRE !', '#7cff7c');
          this.bzReveal(p.owner, now);
          return true;
        }
      }
      if (now - p.born > sp.life) this.bzReveal(p.owner, now);
      return true;
    }
    if (sp.kind === 'paper') {
      // la feuille plane en ondulant (vitesse verticale tirée du temps : identique sur les deux téléphones)
      p.vy = (16 * 1000 / 130) * dcos((now - p.born) / 130);
      p.sprite.setAngle(10 * dsin((now - p.born) / 90));
    }
    if (sp.kind === 'keyframe' && now >= p.armedAt) p.sprite.setAlpha(0.7 + 0.3 * dsin(now / 80));
    return false;
  },

  makeBzTextures() {
    // feuille A4 (lignes de texte)
    iconTex(this, 'paper', ['kkkkkkkkk', 'kwwwwwwwk', 'kwggggwwk', 'kwwwwwwwk', 'kwgggggwk', 'kwwwwwwwk', 'kwggggwwk', 'kwwwwwwwk', 'kwgggwwwk', 'kwwwwwwwk', 'kkkkkkkkk'], '#000',
      { k: '#3a4050', w: '#ffffff', g: '#9aa4b8' });
    // image clé (losange de logiciel de montage)
    iconTex(this, 'keyframe', ['....k....', '...kyk...', '..kyyyk..', '.kyyhyyk.', 'kyyhhhyyk', '.kyyhyyk.', '..kyyyk..', '...kyk...', '....k....'], '#000',
      { k: '#1a1410', y: '#ffd23a', h: '#ffffff' });
    // billet vert
    iconTex(this, 'bill', ['kkkkkkk', 'kgglggk', 'kgldlgk', 'kgglggk', 'kkkkkkk'], '#000', { k: '#1e4a1e', g: '#5fbf5a', l: '#b8f0a0', d: '#2e7a2e' });
  },
});

// textures en plus + effets visuels des coups (flash du téléphone, éclair d'antenne, pièces)
(() => {
  const P = GameScene.prototype;
  const baseTex = P.makeExtraTextures;
  P.makeExtraTextures = function () {
    if (baseTex) baseTex.call(this);
    this.makeBzTextures();
  };
  const baseFx = P.extraFx;
  P.extraFx = function (pl, m, fx, b, f) {
    if (baseFx) baseFx.call(this, pl, m, fx, b, f);
    if (fx.flash) {
      const up = fx.flash === 'up';
      const x = b.x + f * (up ? 10 : (m.ox || 50)), y = b.y + (up ? (m.oy || -50) : (m.oy || 0) - 4);
      const g = this.add.image(x, y, 'burst').setScale(PX * 0.5).setTint(0xffffff).setDepth(31);
      this.tweens.add({ targets: g, scale: PX * 1.4, alpha: 0, duration: 160, onComplete: () => g.destroy() });
      const r = this.add.image(x, y, 'ring').setTint(0xcfe8ff).setDepth(30).setScale(0.6);
      this.tweens.add({ targets: r, scale: 3, alpha: 0, duration: 220, onComplete: () => r.destroy() });
    }
    if (fx.zap) this.zapFx(b.x + f * 4, b.y - 50, b.y + (m.oy || -80) - (m.h || 100) / 2);
    if (fx.coins) for (let i = 0; i < 12; i++) this.coinFx(b.x + (i - 6) * 10, b.y + 30, i);
  };
  // éclair qui part de l'antenne vers le haut
  P.zapFx = function (x, y0, y1) {
    let px = x, py = y0;
    for (let k = 0; k < 7; k++) {
      const ny = y0 + ((y1 - y0) * (k + 1)) / 7, nx = x + (k % 2 ? 10 : -10) * Math.random();
      const n = 5;
      for (let j = 0; j < n; j++) {
        const q = this.add.rectangle(px + ((nx - px) * j) / n, py + ((ny - py) * j) / n, 6, 6, j % 2 ? 0xffe27a : 0xffffff).setDepth(31);
        this.tweens.add({ targets: q, alpha: 0, duration: 240, delay: k * 12, onComplete: () => q.destroy() });
      }
      px = nx; py = ny;
    }
    this.sfx('magic', 0.5);
  };
})();
