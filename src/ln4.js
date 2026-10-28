// ===========================================================================
// LN4 : pilote de F1 (combinaison orange à bandes noires, longs cheveux ondulés, bottines, casque) et joueur de badminton (raquette, volant).
// Mécaniques :
//  - VOLANT (SPÉCIAL) : le volant part très vite puis freine d'un coup et retombe (comme un vrai volant).
//  - CHAMPAGNE (SPÉCIAL haut) : le podium ! le jet de champagne le propulse vers le haut et arrose en dessous.
//  - ARRÊT AU STAND (SPÉCIAL bas, au sol) : une demi-seconde immobile (attaquable), puis PNEUS NEUFS pendant 6 s :
//    il court 25 % plus vite et FEUX ÉTEINTS (LOURD) l'emmène 30 % plus loin.
//  - FEUX ÉTEINTS (LOURD) : départ arrêté, les 5 feux rouges s'éteignent et il fonce tout droit.
//  - POISON (passif, demande de Noah) : après un premier coup sur l'ennemi, s'il en place 3 autres (COUP ou SPÉCIAL)
//    dans les 10 s, l'ennemi est empoisonné : 1 % toutes les 0,8 s pendant 4 s (5 % en tout), sans recul.
//    Pas de cumul : les coups ne comptent pas tant que le poison agit (réglé par simulations de bots). Des points verts au-dessus de l'ennemi montrent le compte.
// Tout l'état de jeu est en champs simples (tyreUntil, spdMul ; sur la victime : lnFrom, lnT0, lnHits,
// poisonUntil, poisonNext) : sauvegardé en ligne.
// ===========================================================================
const LN = { tyreMs: 6000, spd: 1.25, dash: 1.3, drag: 0.94, poiWin: 10000, poiNeed: 4, poiMs: 4000, poiEvery: 800, poiTick: 1 };

CHARS.ln4 = {
  id: 'ln4', name: 'LN4', role: 'PILOTE SMASHEUR', roleCol: '#ffa040', cardCol: '#ff7a00',
  speed: 365, jump: 690, weight: 0.97, jumps: 3, f1: true,
  pal: { main: '#f06a00', dark: '#18181f', skin: '#ecbc96', skin2: '#d09a74', hair: '#2a1a10', accent: '#d8f030', glove: '#ecbc96' },
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

  // POISON : compte des coups de LN4 sur sa victime (appelé avant les dégâts de chaque coup)
  lnCount(att, vic, now) {
    if (!att.def.f1 || att === vic) return;
    if (now < (vic.poisonUntil || 0)) return; // (pas de compte tant que le poison agit)
    if (vic.lnFrom !== att.i || !vic.lnHits || now - (vic.lnT0 || 0) > LN.poiWin) {
      vic.lnFrom = att.i;
      vic.lnT0 = now;
      vic.lnHits = 1;
    } else vic.lnHits++;
    if (vic.lnHits < LN.poiNeed) return;
    vic.lnHits = 0;
    vic.poisonUntil = now + LN.poiMs;
    vic.poisonNext = now + LN.poiEvery;
    if (this.resim) return;
    const c = vic.sprite.body.center;
    this.popup(c.x, c.y - 100, 'EMPOISONNÉ !', '#9cff5a');
    this.shockwave(c.x, c.y, { main: 0x7cff4a, alt: 0xd8f030 });
  },

  // POISON : les petits dégâts réguliers (tous les persos peuvent le subir)
  lnPoison(pl, now) {
    if (!(now < (pl.poisonUntil || 0)) || pl.stocks <= 0) return;
    if (now < (pl.poisonNext || 0)) return;
    pl.poisonNext = (pl.poisonNext || now) + LN.poiEvery;
    pl.damage += LN.poiTick;
    pl.flashUntil = now + 90;
    pl.flashCol = 0x7cff4a;
    if (this.resim) return;
    const s = pl.sprite;
    for (let i = 0; i < 3; i++) {
      const q = this.add.rectangle(s.x + (Math.random() - 0.5) * 36, s.y - 10 + (Math.random() - 0.5) * 30, 6, 6, i % 2 ? 0x7cff4a : 0xd8f030).setDepth(31);
      this.tweens.add({ targets: q, y: q.y - 30 - Math.random() * 20, alpha: 0, duration: 420, onComplete: () => q.destroy() });
    }
  },

  // affichage : 4 points au-dessus de la victime (verts = coups comptés), qui clignotent pendant le poison
  lnPips(pl, now) {
    const on = pl.stocks > 0 && pl.lnHits > 0 && now - (pl.lnT0 || 0) <= LN.poiWin;
    const poisoned = pl.stocks > 0 && now < (pl.poisonUntil || 0);
    if (!on && !poisoned) {
      if (pl.lnGfx) { pl.lnGfx.destroy(); pl.lnGfx = null; }
      return;
    }
    if (!pl.lnGfx && !this.resim) pl.lnGfx = this.add.graphics().setDepth(41);
    const g = pl.lnGfx;
    if (!g) return;
    g.clear();
    const s = pl.sprite, x0 = s.x - 27, y = s.body.y - 34;
    if (poisoned) {
      g.fillStyle(Math.floor(now / 140) % 2 ? 0x7cff4a : 0x2e8a1a, 1);
      g.fillRect(x0 + 6, y - 2, 42, 8);
      g.lineStyle(2, 0x000000, 1).strokeRect(x0 + 6, y - 2, 42, 8);
      return;
    }
    for (let i = 0; i < LN.poiNeed; i++) {
      g.fillStyle(i < pl.lnHits ? 0x7cff4a : 0x203020, 1);
      g.fillRect(x0 + i * 14, y, 10, 6);
      g.lineStyle(2, 0x000000, 1).strokeRect(x0 + i * 14, y, 10, 6);
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
    this.lnPoison(pl, now);
    this.lnPips(pl, now);
  };
  const baseHit = P.bzHit;
  P.bzHit = function (att, vic, spec, now) {
    if (baseHit) spec = baseHit.call(this, att, vic, spec, now);
    this.lnCount(att, vic, now);
    return spec;
  };
  // perdre une vie : le poison et le compte s'arrêtent
  const baseDie = P.die;
  P.die = function (pl, now) {
    pl.poisonUntil = 0;
    pl.lnHits = 0;
    return baseDie.call(this, pl, now);
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
