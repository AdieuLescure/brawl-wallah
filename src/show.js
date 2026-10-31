// ===========================================================================
// SPECTACLE (demande de Noah) — rien ici ne change le combat, sauf l'arrêt sur image du coup final (identique
// sur les deux téléphones : il est décidé dans la simulation, comme les autres arrêts sur image).
//  - PRÉSENTATION « VS » avant le combat : les deux combattants arrivent de chaque côté, nom et rôle, gros VS.
//  - COUP FINAL : quand le coup qui va gagner le match part (dernière vie, éjection sûre) : arrêt sur image plus long,
//    la caméra zoome sur la victime et la suit ; hors ligne, ralenti pendant un instant.
//  - ÉCRAN DE VICTOIRE : le gagnant en grand dans sa pose de victoire, son nom, sa réplique.
// Combats à 2 seulement (pas l'entraînement, pas la campagne qui a ses propres dialogues, pas les salons à 4).
// ===========================================================================
const SHOW = {
  pose: { toro: 'up', deadlulu: 'chord', denodoom: 'summon', adieulescure: 'juggle', bigzinzin: 'selfie', grom: 'bellyUp', ln4: 'champ', natanax: 'boom', kylian: 'knee' },
  quote: {
    toro: 'TU AS SENTI LA CHALEUR ?',
    deadlulu: 'COUPABLE ! ET EN RÉ DIÈSE.',
    denodoom: 'L\'AIGLE NE PERD JAMAIS.',
    adieulescure: 'PAS DE CTRL+Z POUR TOI.',
    bigzinzin: 'COUPEZ ! C\'EST DANS LA BOÎTE.',
    grom: 'LA PEAU DE PIERRE, ÇA NE SE RAYE PAS.',
    ln4: 'DRAPEAU À DAMIER. CHAMPAGNE !',
    natanax: 'JE SUIS DEVENU LA VICTOIRE.',
    kylian: 'T\'ES PAS CONTENT ?',
    astra: 'LES ÉTOILES L\'AVAIENT DIT.',
    nini: 'LE CHAT A GAGNÉ. PAS MOI.',
  },
  vsMs: 1900, finalStop: 560, slowMs: 900, slow: 0.3, koCamMs: 1300, vicDelay: 1000,
};

(() => {
  const P = GameScene.prototype;
  const rnow = () => performance.now();
  const duel = (sc) => sc.pls && sc.pls.length === 2 && !sc.training && !sc.editing;

  // ------------------------------------------------------------------ présentation VS
  P.vsSplash = function (a, b, names) {
    const W = this.W, H = this.H, D = 56;
    const objs = [];
    const keep = (o) => (objs.push(o), o);
    const y0 = H * 0.2, y1 = H * 0.8, sl = 70;
    [a, b].forEach((pl, i) => {
      const left = i === 0, f = left ? 1 : -1;
      const col = Phaser.Display.Color.HexStringToColor(pl.def.cardCol || '#444').color;
      const g = keep(this.add.graphics().setDepth(D));
      g.fillStyle(col, 1);
      if (left) g.fillPoints([{ x: 0, y: y0 }, { x: W * 0.5 + sl, y: y0 }, { x: W * 0.5 - sl, y: y1 }, { x: 0, y: y1 }], true);
      else g.fillPoints([{ x: W * 0.5 + sl, y: y0 }, { x: W, y: y0 }, { x: W, y: y1 }, { x: W * 0.5 - sl, y: y1 }], true);
      g.lineStyle(6, 0x000000, 0.9).strokePoints(left ? [{ x: W * 0.5 + sl, y: y0 }, { x: W * 0.5 - sl, y: y1 }] : [{ x: W * 0.5 + sl, y: y0 }, { x: W * 0.5 - sl, y: y1 }]);
      const cx = left ? W * 0.24 : W * 0.76;
      const im = keep(this.add.image(cx, y1 - 40, `${pl.char}_idle0`).setOrigin(0.5, 58 / 64).setScale(PX * 2.6).setFlipX(!left).setDepth(D + 1));
      const nm = keep(this.add.text(cx, y0 + 34, (names && names[i]) || pl.def.name, { fontFamily: FONT, fontSize: '34px', color: '#ffffff', stroke: '#000', strokeThickness: 8 }).setOrigin(0.5).setDepth(D + 2));
      const ro = keep(this.add.text(cx, y0 + 74, pl.def.role || '', { fontFamily: FONT, fontSize: '15px', color: pl.def.roleCol || '#ffe9a8', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setDepth(D + 2));
      // arrivée : chaque côté glisse depuis son bord
      [g, im, nm, ro].forEach((o) => {
        const x = o.x;
        o.x = x - f * W * 0.7;
        this.tweens.add({ targets: o, x, duration: 260, delay: i * 90, ease: 'Cubic.easeOut' });
        this.tweens.add({ targets: o, x: x - f * W * 0.8, duration: 240, delay: SHOW.vsMs - 300, ease: 'Cubic.easeIn' });
      });
    });
    const vs = keep(this.add.text(W / 2, H / 2, 'VS', { fontFamily: FONT, fontSize: '96px', color: '#ffd166', stroke: '#000', strokeThickness: 14 }).setOrigin(0.5).setDepth(D + 3).setScale(3).setAlpha(0));
    this.tweens.add({ targets: vs, scale: 1, alpha: 1, duration: 220, delay: 330, ease: 'Back.easeOut', onStart: () => { this.sfx('hit', 0.9); this.cameras.main.shake(160, 0.008); } });
    this.tweens.add({ targets: vs, alpha: 0, scale: 0.6, duration: 200, delay: SHOW.vsMs - 280 });
    this.time.delayedCall(SHOW.vsMs + 60, () => objs.forEach((o) => o.active && o.destroy()));
    return objs;
  };

  // hors ligne : la présentation, puis « COMBAT ! » et le match commence
  const baseBegin = P.beginMatch;
  P.beginMatch = function (charId) {
    baseBegin.call(this, charId);
    if (!duel(this) || (typeof camp !== 'undefined' && camp && camp.phase)) return;
    this.state = 'countdown';
    this.vsSplash(this.p1, this.p2);
    this.time.delayedCall(SHOW.vsMs, () => {
      if (this.state !== 'countdown' || this.over) return;
      this.state = 'play';
      this.acc = 0;
      const t = this.add.text(this.W / 2, this.H * 0.4, 'COMBAT !', { fontFamily: FONT, fontSize: '64px', color: '#ffffff', stroke: '#f72585', strokeThickness: 12 }).setOrigin(0.5).setDepth(58).setScale(1.6);
      this.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.easeOut' });
      this.tweens.add({ targets: t, alpha: 0, delay: 650, duration: 250, onComplete: () => t.destroy() });
      this.sfx('go');
    });
  };
  // en ligne : la présentation pendant le compte à rebours qui existe déjà
  const baseNet = P.beginNetMatch;
  if (baseNet) {
    P.beginNetMatch = function (o) {
      baseNet.call(this, o);
      if (this.pls && this.pls.length === 2 && !this.resim) this.vsSplash(this.p1, this.p2, o && o.names);
    };
  }

  // ------------------------------------------------------------------ coup final
  const baseImpact = P.impactFx;
  P.impactFx = function (att, vic, spec, hitPos, lethal) {
    baseImpact.call(this, att, vic, spec, hitPos, lethal);
    if (!lethal || !duel(this) || this.over || vic.stocks !== 1) return;
    // (dans la simulation : même arrêt sur image chez les deux joueurs)
    this.hitstop(SHOW.finalStop);
    if (this.resim) return;
    this.koCam = { pl: vic, until: rnow() + SHOW.koCamMs };
    if (!this.net) this.slowFrom = rnow() + SHOW.finalStop * 0.6, this.slowUntil = rnow() + SHOW.finalStop + SHOW.slowMs;
    const t = this.add.text(this.W / 2, this.H * 0.3, 'COUP FINAL !', { fontFamily: FONT, fontSize: '54px', color: '#ffd166', stroke: '#000', strokeThickness: 12 }).setOrigin(0.5).setDepth(58).setScale(2.2).setAngle(-6);
    this.tweens.add({ targets: t, scale: 1, duration: 180, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, delay: 900, duration: 300, onComplete: () => t.destroy() });
  };

  // ralenti (hors ligne) : le temps du jeu avance moins vite pendant un instant
  const baseUpdate = P.update;
  P.update = function (time, delta) {
    const n = rnow();
    if (!this.net && this.slowUntil && n < this.slowUntil && n >= (this.slowFrom || 0)) delta *= SHOW.slow;
    baseUpdate.call(this, time, delta);
    if (this.over && this.vicAt && !this.vicShown && n >= this.vicAt) this.victoryScreen(this.vicWinner);
  };

  // ------------------------------------------------------------------ écran de victoire
  const baseFinish = P.finish;
  P.finish = function (winner) {
    baseFinish.call(this, winner);
    if (!this.over) return; // en ligne : fin pas encore confirmée
    if (!winner || !duel(this) || (typeof camp !== 'undefined' && camp && camp.phase)) return;
    this.vicWinner = winner;
    this.vicAt = rnow() + SHOW.vicDelay;
    this.vicShown = false;
  };

  P.victoryScreen = function (w) {
    this.vicShown = true;
    if (!w || !w.def) return;
    const W = this.W, H = this.H, D = 52;
    this.add.rectangle(W / 2, H / 2, W, H, 0x05060f, 0.62).setDepth(D);
    const col = Phaser.Display.Color.HexStringToColor(w.def.cardCol || '#444').color;
    const cx = W * 0.25, by = H * 0.84;
    const rays = this.add.image(cx, by - 120, 'burst').setScale(PX * 6).setTint(col).setAlpha(0.35).setDepth(D + 1);
    this.tweens.add({ targets: rays, angle: 360, duration: 9000, repeat: -1 });
    const pose = SHOW.pose[w.char];
    const key = pose && this.textures.exists(`${w.char}_${pose}`) ? `${w.char}_${pose}` : `${w.char}_idle0`;
    const im = this.add.image(cx, by, key).setOrigin(0.5, 58 / 64).setScale(PX * 0.5).setDepth(D + 2);
    this.tweens.add({ targets: im, scale: PX * 3.2, duration: 380, ease: 'Back.easeOut' });
    this.add.text(cx, by + 30, w.name || w.def.name, { fontFamily: FONT, fontSize: '30px', color: w.def.roleCol || '#ffffff', stroke: '#000', strokeThickness: 7 }).setOrigin(0.5).setDepth(D + 3);
    const q = SHOW.quote[w.char];
    if (q) {
      const t = this.add.text(W * 0.64, H * 0.34, '« ' + q + ' »', { fontFamily: FONT, fontSize: '24px', color: '#ffffff', stroke: '#000', strokeThickness: 6, align: 'center', wordWrap: { width: Math.min(620, W * 0.5) } }).setOrigin(0.5).setDepth(D + 3).setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, y: H * 0.32, delay: 300, duration: 300 });
    }
    // le titre (VICTOIRE / DÉFAITE) passe en haut, le petit texte sous la réplique ; les boutons tactiles s'effacent
    if (this.banner) this.banner.setY(H * 0.14).setDepth(60);
    if (this.sub) this.sub.setPosition(W * 0.64, H * 0.47).setDepth(60);
    (this.touchObjs || []).forEach((o) => o.setVisible(false));
    for (let i = 0; i < 18; i++) {
      const c = this.add.rectangle(cx + (Math.random() - 0.5) * 200, by - 160, 8, 8, i % 2 ? col : 0xffd166).setDepth(D + 2).setAngle(45);
      this.tweens.add({ targets: c, x: c.x + (Math.random() - 0.5) * 320, y: c.y - 60 - Math.random() * 120, alpha: 0, angle: 360, duration: 900 + Math.random() * 500, ease: 'Quad.easeOut', onComplete: () => c.destroy() });
    }
  };

  // caméra du coup final : elle zoome sur la victime et la suit (affichage seulement)
  const baseCam = P.updateCamera;
  P.updateCamera = function (dt) {
    const kc = this.koCam;
    if (kc && rnow() < kc.until && kc.pl && kc.pl.sprite && kc.pl.sprite.active) {
      this.camForce = { x: kc.pl.sprite.x, y: kc.pl.sprite.y, z: 1.75 };
    } else this.camForce = null;
    baseCam.call(this, dt);
  };
})();
