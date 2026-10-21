// ===========================================================================
// SON, VIBRATION, INDICATEURS, RÉGLAGES, ENTRAÎNEMENT
// ===========================================================================

// --- Sons synthétisés (aucun fichier à charger) --------------------------------
const SFX = {
  ctx: null,
  noise: null,
  last: {},
  init() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      this.ctx = new AC();
      const n = this.ctx.sampleRate * 0.5;
      this.noise = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      let seed = 12345;
      for (let i = 0; i < n; i++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        d[i] = (seed / 0x3fffffff - 1) * 0.9;
      }
    } catch (e) {
      this.ctx = null;
    }
    return this.ctx;
  },
  tone(type, f0, f1, dur, vol, t0) {
    const c = this.ctx, t = c.currentTime + (t0 || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  },
  hiss(filter, freq, dur, vol, sweep) {
    const c = this.ctx, t = c.currentTime;
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.noise;
    f.type = filter;
    f.frequency.setValueAtTime(freq, t);
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(c.destination);
    src.start(t);
    src.stop(t + dur + 0.02);
  },
  play(name, k) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = performance.now();
    if (now - (this.last[name] || 0) < 45) return;
    this.last[name] = now;
    k = k || 0.5;
    try {
      if (name === 'hit') {
        this.hiss('bandpass', 700 + k * 700, 0.09, 0.22 + 0.2 * k);
        this.tone('sine', 140, 55, 0.12, 0.35 + 0.2 * k);
      } else if (name === 'ko') {
        this.tone('sine', 100, 35, 0.45, 0.55);
        this.hiss('lowpass', 900, 0.35, 0.3, 200);
      } else if (name === 'jump') this.tone('square', 330, 620, 0.08, 0.05);
      else if (name === 'dodge') this.hiss('highpass', 1800, 0.13, 0.12, 5000);
      else if (name === 'swing') this.hiss('bandpass', 1400, 0.06, 0.05, 2600);
      else if (name === 'parry') this.tone('triangle', 900, 1500, 0.12, 0.14);
      else if (name === 'armor') this.tone('square', 210, 160, 0.09, 0.09);
      else if (name === 'charm') this.tone('sine', 700, 1150, 0.18, 0.1);
      else if (name === 'count') this.tone('square', 660, 660, 0.12, 0.08);
      else if (name === 'go') this.tone('square', 990, 990, 0.25, 0.1);
      else if (name === 'ui') this.tone('triangle', 520, 640, 0.05, 0.06);
      else if (name === 'rumble') {
        this.tone('sine', 55, 38, 1.4, 0.3);
        this.hiss('lowpass', 260, 1.6, 0.22, 120);
      }
    } catch (e) {}
  },
};
// le son ne peut démarrer qu'après un toucher
['pointerdown', 'touchstart', 'keydown'].forEach((ev) =>
  window.addEventListener(
    ev,
    () => {
      const c = SFX.init();
      if (c && c.state !== 'running') c.resume().catch(() => {});
    },
    { passive: true }
  )
);

Object.assign(GameScene.prototype, {
  sfx(name, k) {
    if (this.resim || !SETTINGS.sound) return;
    SFX.play(name, k);
  },
  buzz(ms) {
    if (this.resim || !SETTINGS.vib || !navigator.vibrate) return;
    try {
      navigator.vibrate(Math.round(ms));
    } catch (e) {}
  },

  // --- Indicateurs : perso hors de l'écran, changement de côté --------------------
  overlayFx(now) {
    if (this.resim || !this.p1 || !this.p2 || !this.pls) return;
    if (!this.ovl) this.ovl = {};
    this.pls.forEach((pl, i) => {
      const s = pl.sprite;
      let o = this.ovl[i];
      if (!o) {
        o = this.ovl[i] = {
          bg: this.add.circle(0, 0, 30, 0x0b0d1f, 0.85).setStrokeStyle(3, pl.human ? 0xffe9a8 : 0xff8fa3).setDepth(65),
          ico: this.add.image(0, 0, `stock_${pl.char}`).setScale(5).setDepth(66),
          arrow: this.add.triangle(0, 0, 0, -10, 18, 0, 0, 10, pl.human ? 0xffe9a8 : 0xff8fa3).setDepth(66),
          side: this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '14px', color: '#ffe9a8', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(41),
        };
      }
      const m = 40;
      // position à l'écran (la caméra du combat zoome et se déplace)
      const cam = this.cameras.main, wv = cam.worldView;
      const px = (s.x - wv.x) * cam.zoom, py = (s.y - wv.y) * cam.zoom;
      const out = pl.stocks > 0 && !(now < (pl.invisUntil || 0)) && wv.width > 0 && (px < 0 || px > this.W || py < 0 || py > this.H);
      [o.bg, o.ico, o.arrow].forEach((g) => g.setVisible(out));
      if (out) {
        const x = Phaser.Math.Clamp(px, m, this.W - m), y = Phaser.Math.Clamp(py, m, this.H - m);
        o.bg.setPosition(x, y);
        o.ico.setPosition(x, y);
        const a = Math.atan2(py - y, px - x);
        o.arrow.setPosition(x + Math.cos(a) * 40, y + Math.sin(a) * 40).setRotation(a);
      }
      // petite flèche sous les pieds quand AVANT / ARRIÈRE changent de sens
      const flip = pl.flipAt && now - pl.flipAt < 450 && pl.stocks > 0;
      o.side.setVisible(!!flip).setText(pl.facing > 0 ? '>' : '<').setPosition(s.x, s.y + 52);
    });
    if (this.net && this.updateNetHud) this.updateNetHud();
  },

  // --- Réglages -------------------------------------------------------------------
  showSettings() {
    this.menuBase('RÉGLAGES');
    const D = 120;
    const lab = {
      sound: () => 'BRUITAGES : ' + (SETTINGS.sound ? 'OUI' : 'NON'),
      music: () => 'MUSIQUE : ' + (SETTINGS.music !== false ? 'OUI' : 'NON'),
      zoom: () => 'CAMÉRA : ' + (SETTINGS.zoom !== false ? 'ZOOM' : 'FIXE'),
      vib: () => 'VIBRATION : ' + (SETTINGS.vib ? 'OUI' : 'NON'),
      btnSize: () => 'BOUTONS : ' + ['PETITS', 'MOYENS', 'GRANDS'][SETTINGS.btnSize],
      flip: () => 'MAINS : ' + (SETTINGS.flip ? 'GAUCHER' : 'DROITIER'),
      timer: () => 'CHRONO : ' + (SETTINGS.timer ? '8 MIN' : 'AUCUN'),
      botLevel: () => 'BOT : ' + ['FACILE', 'MOYEN', 'DIFFICILE'][SETTINGS.botLevel],
    };
    const next = {
      sound: () => (SETTINGS.sound = !SETTINGS.sound),
      music: () => { SETTINGS.music = SETTINGS.music === false; if (typeof MUSIC !== 'undefined') MUSIC.setVolume(); },
      zoom: () => (SETTINGS.zoom = SETTINGS.zoom === false),
      vib: () => (SETTINGS.vib = !SETTINGS.vib),
      btnSize: () => (SETTINGS.btnSize = (SETTINGS.btnSize + 1) % 3),
      flip: () => (SETTINGS.flip = !SETTINGS.flip),
      timer: () => (SETTINGS.timer = !SETTINGS.timer),
      botLevel: () => (SETTINGS.botLevel = (SETTINGS.botLevel + 1) % 3),
    };
    const keys = Object.keys(lab);
    this.uiBtns = [];
    const two = !L.portrait;
    const bw = two ? 440 : Math.min(this.W - 80, 520), bh = two ? 66 : 76, gap = two ? 18 : 18;
    const y0 = two ? this.H * 0.36 : this.H * 0.3;
    keys.forEach((k, idx) => {
      const col = two ? idx % 2 : 0, row = two ? Math.floor(idx / 2) : idx;
      const x = two ? this.W / 2 + (col ? 1 : -1) * (bw / 2 + 14) : this.W / 2;
      const y = y0 + row * (bh + gap);
      const r = this.add.rectangle(x, y, bw, bh, 0x1a1d33, 1).setStrokeStyle(4, 0x4cc9f0).setDepth(D);
      const t = this.add.text(x, y, lab[k](), { fontFamily: FONT, fontSize: '17px', color: '#fff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(D + 1);
      this.ui.push(r, t);
      this.uiBtns.push({ x, y, w: bw, h: bh, fn: () => { next[k](); saveSettings(); t.setText(lab[k]()); } });
    });
    const rows = two ? Math.ceil(keys.length / 2) : keys.length;
    const yb = y0 + rows * (bh + gap) + 10;
    const r = this.add.rectangle(this.W / 2, yb, 360, bh, 0x1a1d33, 1).setStrokeStyle(4, 0x888888).setDepth(D);
    const t = this.add.text(this.W / 2, yb, 'RETOUR', { fontFamily: FONT, fontSize: '17px', color: '#fff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(D + 1);
    this.ui.push(r, t);
    // les boutons de combat changent de taille / de côté : on recrée la scène en revenant
    this.uiBtns.push({ x: this.W / 2, y: yb, w: 360, h: bh, fn: () => this.scene.restart() });
  },

  // --- Entraînement ---------------------------------------------------------------
  trainSetup() {
    const D = 55;
    this.trainBtns = [];
    const labels = [
      ['% À ZÉRO', () => { this.p1.damage = 0; this.p2.damage = 0; }],
      [() => 'MANNEQUIN : ' + ['IMMOBILE', 'SAUTE', 'ESQUIVE', 'BOT'][trainDummyMode], () => { trainDummyMode = (trainDummyMode + 1) % 4; this.dummyMode = trainDummyMode; }],
      [() => 'FACE À : ' + CHARS[trainDummy].name, () => { { const R = playable(); trainDummy = R[(R.indexOf(trainDummy) + 1) % R.length]; } this.scene.restart(); }],
      ['COUPS', () => this.toggleMoveList()],
      ['QUITTER', () => { trainingMode = false; chosen = null; goSelect = false; this.scene.restart(); }],
    ];
    this.dummyMode = trainDummyMode;
    const portrait = L.portrait;
    const bw = portrait ? 220 : 172, bh = 34;
    labels.forEach(([lab, fn], i) => {
      const per = portrait ? 3 : 5;
      const row = Math.floor(i / per), col = i % per;
      const n = Math.min(per, labels.length - row * per);
      const x = this.W / 2 + (col - (n - 1) / 2) * (bw + 8);
      const y = (portrait ? 220 : 128) + row * (bh + 8);
      const r = this.add.rectangle(x, y, bw, bh, 0x0b0d1f, 0.8).setStrokeStyle(2, 0x4cc9f0).setDepth(D);
      const t = this.add.text(x, y, typeof lab === 'function' ? lab() : lab, { fontFamily: FONT, fontSize: '10px', color: '#fff' }).setOrigin(0.5).setDepth(D + 1);
      this.trainBtns.push({ x, y, w: bw, h: bh, fn: () => { fn(); if (typeof lab === 'function' && t.active) t.setText(lab()); } });
    });
    this.trainInfo = this.add
      .text(this.W / 2, (portrait ? 220 : 128) + (portrait ? 2 : 1) * (bh + 8) + 6, 'TOUCHE LE MANNEQUIN POUR VOIR LES CHIFFRES', { fontFamily: FONT, fontSize: '11px', color: '#ffe9a8', stroke: '#000', strokeThickness: 4, align: 'center' })
      .setOrigin(0.5, 0)
      .setDepth(D);
  },

  trainReport(att, vic, spec, stunMs, rem, combo) {
    if (!this.trainInfo || att !== this.p1) return;
    this.trainCombo = combo ? (this.trainCombo || 1) + 1 : 1;
    this.trainComboDmg = combo ? (this.trainComboDmg || 0) + spec.dmg : spec.dmg;
    const adv = rem === undefined ? null : Math.round((stunMs - rem) / STEP_MS);
    const advTxt = adv === null ? '' : `  AVANCE ${adv >= 0 ? '+' : ''}${adv}`;
    const cTxt = this.trainCombo > 1 ? `\nENCHAÎNEMENT : ${this.trainCombo} COUPS, ${Math.round(this.trainComboDmg)} %` : '';
    this.trainInfo.setText(`COUP : ${Math.round(spec.dmg)} %${advTxt}  ÉTOURDI ${Math.round(stunMs / STEP_MS)} IMAGES${cTxt}`);
  },

  toggleMoveList() {
    if (this.moveList) {
      this.moveList.forEach((o) => o.destroy());
      this.moveList = null;
      return;
    }
    const def = this.p1.def;
    const txt = def.name + '\n\n' + def.help.join('\n') + "\n\nLOURD TENU = COUP CHARGE\nESQUIVE EN L'AIR + ATTAQUE = COUP DU SOL";
    const bg = this.add.rectangle(this.W / 2, this.H * 0.45, Math.min(this.W - 60, 560), 330, 0x0b0d1f, 0.9).setStrokeStyle(3, 0xffe9a8).setDepth(80);
    const t = this.add.text(this.W / 2, this.H * 0.45, txt, { fontFamily: FONT, fontSize: '12px', color: '#cfd3ff', align: 'left', lineSpacing: 8 }).setOrigin(0.5).setDepth(81);
    this.moveList = [bg, t];
  },
});

let trainDummy = 'toro';
let trainDummyMode = 0;

// --- Bouton QUITTER pendant le combat ---------------------------------------------
Object.assign(GameScene.prototype, {
  buildQuitBtn(D) {
    this.quitBtn = { x: this.W / 2 + 74, y: 40, w: 56, h: 46 };
    const r = this.add.rectangle(this.quitBtn.x, this.quitBtn.y, 46, 38, 0x000000, 0.45).setStrokeStyle(2, 0xffffff, 0.6).setDepth(D);
    const t = this.add.text(this.quitBtn.x, this.quitBtn.y + 1, 'X', { fontFamily: FONT, fontSize: '20px', color: '#ffffff' }).setOrigin(0.5).setDepth(D + 1).setAlpha(0.85);
    this.ctrlObjs.push(r, t);
    this.quitUi = null;
  },

  // renvoie true si le toucher a été pris par le bouton ou par la question « quitter ? »
  quitTap(p) {
    const inside = (b) => Math.abs(p.x - b.x) <= b.w / 2 && Math.abs(p.y - b.y) <= b.h / 2;
    if (this.quitUi) {
      for (const b of this.quitUi.btns) if (inside(b)) { b.fn(); return true; }
      return true; // la question est ouverte : on ignore le reste
    }
    if (this.over || this.state !== 'play' || !this.quitBtn || !inside(this.quitBtn)) return false;
    if (this.ctrlObjs && this.ctrlObjs[0] && !this.ctrlObjs[0].visible) return false;
    this.askQuit();
    return true;
  },

  askQuit() {
    const D = 130, cx = this.W / 2, cy = this.H * 0.42;
    const objs = [];
    objs.push(this.add.rectangle(cx, this.H / 2, this.W, this.H, 0x000000, 0.55).setDepth(D));
    const bw = Math.min(600, this.W - 40);
    objs.push(this.add.rectangle(cx, cy, bw, 250, 0x1a1d33, 1).setStrokeStyle(4, 0xf72585).setDepth(D + 1));
    const q = this.net ? 'ABANDONNER ?\n(DÉFAITE)' : 'QUITTER LE COMBAT ?';
    objs.push(this.add.text(cx, cy - 64, q, { fontFamily: FONT, fontSize: '22px', color: '#ffffff', stroke: '#000', strokeThickness: 5, align: 'center', lineSpacing: 10 }).setOrigin(0.5).setDepth(D + 2));
    const btns = [];
    const half = Math.min(125, bw / 4 + 10), w = Math.min(220, bw / 2 - 20);
    const mk = (x, label, col, fn) => {
      objs.push(this.add.rectangle(x, cy + 54, w, 66, 0x0b0d1f, 1).setStrokeStyle(4, col).setDepth(D + 2));
      objs.push(this.add.text(x, cy + 54, label, { fontFamily: FONT, fontSize: '16px', color: '#ffffff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(D + 3));
      btns.push({ x, y: cy + 54, w, h: 66, fn });
    };
    mk(cx - half, 'QUITTER', 0xff5a5a, () => this.doQuit());
    mk(cx + half, 'CONTINUER', 0x6ee7b7, () => this.closeQuit());
    this.quitUi = { objs, btns };
    // pas de coup « fantôme » au retour
    if (this.stick) { this.stick.id = null; this.stick.sx = this.stick.sy = 0; }
    if (this.btn) Object.values(this.btn).forEach((b) => { b.id = null; b.img.setAlpha(0.75); });
    if (this.queue) this.queue.attack = this.queue.heavy = this.queue.jump = false;
  },

  closeQuit() {
    if (!this.quitUi) return;
    this.quitUi.objs.forEach((o) => o.destroy());
    this.quitUi = null;
    this.acc = 0;
  },

  doQuit() {
    this.closeQuit();
    if (this.net) {
      // en ligne : abandon immédiat (l'adversaire gagne), puis retour au menu
      try { Online.conn && Online.conn.send({ t: 'leave' }); } catch (e) {}
      Online.leaving = true;
      setTimeout(() => leaveOnline(), 150);
      return;
    }
    trainingMode = false;
    camp = null;
    chosen = null;
    goSelect = false;
    this.scene.restart();
  },
});
