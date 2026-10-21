// ===========================================================================
// LN4 : pilote de F1 (combinaison noire et orange, gants, bottines, casque) et joueur de badminton (raquette, volant).
// Mécaniques :
//  - VOLANT (SPÉCIAL) : le volant part très vite puis freine d'un coup et retombe (comme un vrai volant).
//  - CHAMPAGNE (SPÉCIAL haut) : le podium ! le jet de champagne le propulse vers le haut et arrose en dessous.
//  - ARRÊT AU STAND (SPÉCIAL bas, au sol) : une demi-seconde immobile (attaquable), puis PNEUS NEUFS pendant 6 s :
//    il court 25 % plus vite et FEUX ÉTEINTS (LOURD) l'emmène 30 % plus loin.
//  - FEUX ÉTEINTS (LOURD) : départ arrêté, les 5 feux rouges s'éteignent et il fonce tout droit.
// Tout l'état de jeu est en champs simples (tyreUntil, spdMul) : sauvegardé en ligne.
// ===========================================================================
const LN = { tyreMs: 6000, spd: 1.25, dash: 1.3, drag: 0.94 };

CHARS.ln4 = {
  id: 'ln4', name: 'LN4', role: 'PILOTE SMASHEUR', roleCol: '#ffa040', cardCol: '#ff7a00',
  speed: 365, jump: 690, weight: 0.97, jumps: 3, f1: true,
  pal: { main: '#2c1a10', dark: '#1a1a22', skin: '#ecbc96', skin2: '#d09a74', hair: '#2c1a10', accent: '#ff7a00', glove: '#26262e' },
  fx: { main: 0xff7a00, alt: 0xffd09a, core: 0xffffff, cres: 'cres_ln' },
  help: [],
  moves: {},
};
ORDER.push('ln4');

Object.assign(GameScene.prototype, {
  // ARRÊT AU STAND terminé : pneus neufs
  lnPit(pl, now) {
    pl.tyreUntil = now + LN.tyreMs;
    if (this.resim) return;
    const c = pl.sprite.body.center;
    this.popup(c.x, c.y - 100, 'PNEUS NEUFS !', '#ffa040');
    this.shockwave(c.x, pl.sprite.body.bottom, { main: 0xff7a00, alt: 0xffd09a });
    for (let i = 0; i < 8; i++) this.smokeFx(c.x + (i - 4) * 10, pl.sprite.body.bottom - 4, i % 2 ? 1 : -1, 1);
    this.sfx('count');
  },

  // à chaque image (après le reste de step)
  lnStep(pl, now) {
    if (!pl.def.f1) return;
    const fresh = now < (pl.tyreUntil || 0);
    pl.spdMul = fresh ? LN.spd : 1;
    if (!fresh || this.resim) return;
    // pneus neufs : fumée de gomme quand il roule au sol
    const s = pl.sprite, b = s.body;
    if ((b.blocked.down || b.touching.down) && Math.abs(b.velocity.x) > 120 && now - (pl.tyreFx || 0) > 70) {
      pl.tyreFx = now;
      this.smokeFx(s.x - Math.sign(b.velocity.x) * 20, b.bottom - 4, -Math.sign(b.velocity.x), 0.6);
    }
  },

  // projectiles propres à LN4 (true = déjà traité)
  lnProj(p, now) {
    const sp = p.spec;
    if (sp.kind !== 'shuttle') return false;
    // le volant freine très vite (frottement de l'air sur les plumes) puis tombe
    p.vx *= LN.drag;
    p.sprite.setAngle((Math.atan2(p.vy, p.vx) * 180) / Math.PI);
    if (p.y > L.baseY - 12 && Math.abs(p.x - this.W / 2) < L.mainW / 2) {
      this.killProj(p, false);
      return true;
    }
    return false;
  },

  // petite bouffée de fumée grise (affichage seulement)
  smokeFx(x, y, dir, k) {
    const r = this.add.circle(x, y, 6 * k + Math.random() * 4, Math.random() < 0.5 ? 0xb8b8c0 : 0x8a8a94, 0.75).setDepth(13);
    this.tweens.add({ targets: r, x: x + dir * (20 + Math.random() * 30) * k, y: y - 10 - Math.random() * 16, scale: 2.2, alpha: 0, duration: 420 + Math.random() * 200, onComplete: () => r.destroy() });
  },

  makeLnTextures() {
    crescentTex(this, 'cres_ln', ['#ffffff', '#ffd09a', '#ff7a00']);
    // volant de badminton (le bouchon vers la droite = vers l'avant)
    iconTex(this, 'shuttle', ['.kkk....', 'kwwlkkk.', 'kwwwlwkk', 'kwwwlwwW', 'kwwwlwkk', 'kwwlkkk.', '.kkk....'], '#000',
      { k: '#3a3e4c', w: '#ffffff', l: '#c8ccd8', W: '#ffffff' });
    // feu rouge de départ
    iconTex(this, 'f1light', ['.kkk.', 'krrrk', 'krRrk', 'krrrk', '.kkk.'], '#000', { k: '#101014', r: '#e8202a', R: '#ff8a8a' });
  },
});

(() => {
  const P = GameScene.prototype;
  const baseTex = P.makeExtraTextures;
  P.makeExtraTextures = function () {
    if (baseTex) baseTex.call(this);
    this.makeLnTextures();
  };
  const baseStep = P.bzStep;
  P.bzStep = function (pl, other, now) {
    if (baseStep) baseStep.call(this, pl, other, now);
    this.lnStep(pl, now);
  };
  const baseProj = P.bzProj;
  P.bzProj = function (p, now) {
    if (baseProj && baseProj.call(this, p, now)) return true;
    return this.lnProj(p, now);
  };
  // effets des coups de LN4
  const baseFx = P.extraFx;
  P.extraFx = function (pl, m, fx, b, f) {
    if (baseFx) baseFx.call(this, pl, m, fx, b, f);
    if (fx.smoke) {
      const n = fx.smoke === 'big' ? 14 : 6;
      for (let i = 0; i < n; i++) {
        const dir = fx.smoke === 'big' ? (i % 2 ? 1 : -1) : -f;
        this.time.delayedCall(i * 25, () => this.smokeFx(b.x + dir * (10 + Math.random() * 20), b.y + 30, dir, fx.smoke === 'big' ? 1.4 : 0.8));
      }
    }
    if (fx.lights) {
      // les 5 feux rouges au-dessus de lui, qui s'éteignent d'un coup au départ
      for (let i = 0; i < 5; i++) {
        const q = this.add.image(b.x + (i - 2) * 22, b.y - 96, 'f1light').setScale(PX).setDepth(31);
        this.tweens.add({ targets: q, alpha: 0, delay: 80, duration: 120, onComplete: () => q.destroy() });
      }
    }
    if (fx.champ) {
      // jet de champagne vers le bas (il s'envole), mousse dorée
      for (let i = 0; i < 18; i++) {
        const q = this.add.rectangle(b.x + (Math.random() - 0.5) * 16, b.y + 20, 6, 6, i % 3 ? 0xfff0a0 : 0xffffff).setDepth(30);
        this.tweens.add({ targets: q, x: q.x + (Math.random() - 0.5) * 90, y: q.y + 60 + Math.random() * 90, alpha: 0, scale: 0.4, delay: i * 14, duration: 380, onComplete: () => q.destroy() });
      }
    }
    if (fx.shuttleFx) {
      const q = this.add.image(b.x + f * 40, b.y - 30, 'shuttle').setScale(PX * 0.7).setDepth(31).setAngle(f > 0 ? -45 : -135);
      this.tweens.add({ targets: q, x: q.x + f * 160, y: q.y - 120, alpha: 0, duration: 380, onComplete: () => q.destroy() });
    }
  };
})();
