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
      // taille / côté par défaut : remet aussi les boutons placés à la main à leur place d'origine
      btnSize: () => { SETTINGS.btnSize = (SETTINGS.btnSize + 1) % 3; delete SETTINGS.layout; },
      flip: () => { SETTINGS.flip = !SETTINGS.flip; delete SETTINGS.layout; },
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
    // placer chaque bouton tactile soi-même (sur une fausse partie)
    const pw = two ? bw * 2 + 28 : bw;
    const rp = this.add.rectangle(this.W / 2, yb, pw, bh, 0x1a1d33, 1).setStrokeStyle(4, 0xf72585).setDepth(D);
    const tp = this.add.text(this.W / 2, yb, 'PLACER LES BOUTONS' + (SETTINGS.layout ? ' (PERSO)' : ''), { fontFamily: FONT, fontSize: '17px', color: '#fff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(D + 1);
    this.ui.push(rp, tp);
    this.uiBtns.push({ x: this.W / 2, y: yb, w: pw, h: bh, fn: () => { saveSettings(); this.showButtonEditor(); } });
    const yr = yb + bh + gap;
    const r = this.add.rectangle(this.W / 2, yr, 360, bh, 0x1a1d33, 1).setStrokeStyle(4, 0x888888).setDepth(D);
    const t = this.add.text(this.W / 2, yr, 'RETOUR', { fontFamily: FONT, fontSize: '17px', color: '#fff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(D + 1);
    this.ui.push(r, t);
    // les boutons de combat changent de taille / de côté : on recrée la scène en revenant
    this.uiBtns.push({ x: this.W / 2, y: yr, w: 360, h: bh, fn: () => this.scene.restart() });
  },

  // --- Éditeur de boutons : on déplace et on redimensionne chaque commande sur une fausse partie -----------------
  // Glisser = déplacer (les boutons se contournent : jamais deux l'un sur l'autre) ; toucher = choisir, puis - / + = taille.
  showButtonEditor() {
    // une fausse partie immobile derrière (on garde la recréation de scène pour les boutons d'origine)
    editButtons = true;
    this.scene.restart();
  },

  startButtonEditor() {
    editButtons = false;
    this.editing = true;
    this.beginMatch(chosen || playable()[0]);
    for (let i = 0; i < 40; i++) this.simTick();
    this.updateHud();
    this.state = 'editor';
    KB.used = false;
    this.setControls(true);
    if (this.touchObjs) this.touchObjs.forEach((o) => o.setVisible(true));
    this.edPos = this.ctrlLayout();
    this.edSel = null;
    this.edDrag = null;
    this.edUi = [];
    this.edRing = this.add.circle(0, 0, 10).setStrokeStyle(4, 0xffd166).setFillStyle(0xffd166, 0.12).setDepth(89).setVisible(false);
    this.drawEditorBar();
  },

  // la barre d'outils (en haut au centre, sous le chrono)
  drawEditorBar() {
    (this.edUi || []).forEach((o) => o.destroy());
    this.edUi = [];
    this.edBtns = [];
    const D = 96, W = this.W, P = L.portrait;
    const cy = P ? 230 : 190;
    const add = (o) => (this.edUi.push(o), o);
    add(this.add.rectangle(W / 2, cy, Math.min(W - 40, 680), 170, 0x0b0d1f, 0.86).setStrokeStyle(3, 0xf72585).setDepth(D));
    const txt = (x, y, s, size, col) => add(this.add.text(x, y, s, { fontFamily: FONT, fontSize: size + 'px', color: col || '#fff', stroke: '#000', strokeThickness: 4, align: 'center' }).setOrigin(0.5).setDepth(D + 2));
    const btn = (x, y, w, label, col, fn) => {
      add(this.add.rectangle(x, y, w, 44, 0x1a1d33, 1).setStrokeStyle(3, col).setDepth(D + 1));
      txt(x, y, label, 13);
      this.edBtns.push({ x, y, w, h: 44, fn });
    };
    const sel = this.edSel;
    const NAMES = { stick: 'JOYSTICK', attack: 'LÉGER', heavy: 'LOURD', special: 'SPÉCIAL', jump: 'SAUT', block: 'ESQUIVE' };
    txt(W / 2, cy - 62, sel ? NAMES[sel] : 'PLACE TES BOUTONS', 15, '#ffd166');
    txt(W / 2, cy - 34, sel ? 'GLISSE-LE OU CHANGE SA TAILLE' : 'GLISSE UN BOUTON POUR LE DÉPLACER\nTOUCHE-LE POUR CHANGER SA TAILLE', 10, '#cfd3ff');
    if (sel) {
      const s = this.edPos[sel].s;
      btn(W / 2 - 120, cy + 12, 70, '-', 0x4cc9f0, () => this.editorResize(-0.1));
      txt(W / 2, cy + 12, Math.round(s * 100) + ' %', 15);
      btn(W / 2 + 120, cy + 12, 70, '+', 0x4cc9f0, () => this.editorResize(0.1));
    }
    const bw = P ? 200 : 210;
    btn(W / 2 - bw / 2 - 8, cy + 60, bw, 'PAR DÉFAUT', 0x888888, () => this.editorReset());
    btn(W / 2 + bw / 2 + 8, cy + 60, bw, 'TERMINÉ', 0x6ee7b7, () => this.editorDone());
    this.edTop = cy + 85 + 8; // les boutons restent sous la barre d'outils
  },

  editorR(k, s) {
    return CTRL_R[k] * s;
  },

  // pose une commande à (x, y) sans chevaucher les autres : elle glisse autour d'elles, et reste dans l'écran
  editorFit(k, x, y, s) {
    const r = this.editorR(k, s), GAP = 10;
    const top = this.edTop + r, bot = this.H - r - 4, lef = r + 4, rig = this.W - r - 4;
    const clamp = () => {
      x = Phaser.Math.Clamp(x, lef, rig);
      y = Phaser.Math.Clamp(y, top, bot);
    };
    clamp();
    for (let it = 0; it < 12; it++) {
      let moved = false;
      for (const o of CTRL_KEYS) {
        if (o === k) continue;
        const q = this.edPos[o], ro = this.editorR(o, q.s);
        let dx = x - q.x, dy = y - q.y;
        let d = Math.hypot(dx, dy);
        const min = r + ro + GAP;
        if (d < min) {
          if (d < 0.01) { dx = 1; dy = 0; d = 1; }
          x = q.x + (dx / d) * min;
          y = q.y + (dy / d) * min;
          moved = true;
        }
      }
      clamp();
      if (!moved) break;
    }
    // encore un chevauchement (coincé contre le bord) : refusé
    for (const o of CTRL_KEYS) {
      if (o === k) continue;
      const q = this.edPos[o];
      if (Math.hypot(x - q.x, y - q.y) < r + this.editorR(o, q.s) + GAP - 0.5) return null;
    }
    return { x, y };
  },

  // applique la position / taille d'une commande à son image
  editorApply(k) {
    const c = this.edPos[k];
    if (k === 'stick') {
      this.stickHome = { x: c.x, y: c.y };
      this.stickS = c.s;
      this.stickBase.setPosition(c.x, c.y).setScale(PX * c.s);
      this.stickKnob.setPosition(c.x, c.y).setScale(PX * c.s);
    } else {
      const b = this.btn[k];
      b.x = c.x;
      b.y = c.y;
      b.s = c.s;
      this.sizeBtn(b);
      if (k === 'special') this.placeSpDots();
    }
    if (this.edSel === k) this.edRing.setPosition(c.x, c.y).setRadius(this.editorR(k, c.s) + 8).setVisible(true);
  },

  editorDown(p) {
    for (const b of this.edBtns || []) {
      if (Math.abs(p.x - b.x) <= b.w / 2 && Math.abs(p.y - b.y) <= b.h / 2) {
        if (SETTINGS.sound && typeof SFX !== 'undefined') SFX.play('ui');
        return b.fn();
      }
    }
    let best = null, bd = 1e9;
    for (const k of CTRL_KEYS) {
      const c = this.edPos[k];
      const d = Math.hypot(p.x - c.x, p.y - c.y);
      if (d < this.editorR(k, c.s) + 12 && d < bd) { best = k; bd = d; }
    }
    if (!best) {
      this.edSel = null;
      this.edRing.setVisible(false);
      return this.drawEditorBar();
    }
    const c = this.edPos[best];
    this.edDrag = { id: p.id, k: best, dx: c.x - p.x, dy: c.y - p.y };
    if (this.edSel !== best) {
      this.edSel = best;
      this.drawEditorBar();
    }
    this.editorApply(best);
  },

  editorMove(p) {
    const g = this.edDrag;
    if (!g || g.id !== p.id) return;
    const c = this.edPos[g.k];
    const at = this.editorFit(g.k, p.x + g.dx, p.y + g.dy, c.s);
    if (!at) return;
    c.x = at.x;
    c.y = at.y;
    this.editorApply(g.k);
  },

  editorUp(p) {
    if (this.edDrag && this.edDrag.id === p.id) this.edDrag = null;
  },

  editorResize(ds) {
    const k = this.edSel;
    if (!k) return;
    const c = this.edPos[k];
    const s = Phaser.Math.Clamp(Math.round((c.s + ds) * 10) / 10, 0.7, 1.4);
    const at = this.editorFit(k, c.x, c.y, s);
    if (!at) return this.popup(this.W / 2, this.edTop + 40, 'PAS ASSEZ DE PLACE', '#ff8fa3');
    c.s = s;
    c.x = at.x;
    c.y = at.y;
    this.editorApply(k);
    this.drawEditorBar();
  },

  editorReset() {
    this.edPos = this.defaultLayout();
    CTRL_KEYS.forEach((k) => this.editorApply(k));
    if (SETTINGS.layout) delete SETTINGS.layout[L.portrait ? 'P' : 'L'];
    this.edSel = null;
    this.edRing.setVisible(false);
    this.drawEditorBar();
  },

  editorDone() {
    const o = {};
    for (const k of CTRL_KEYS) {
      const c = this.edPos[k];
      o[k] = { fx: Math.round((c.x / this.W) * 1000) / 1000, fy: Math.round((c.y / this.H) * 1000) / 1000, s: c.s };
    }
    // disposition différente de celle par défaut : on la garde (une pour le téléphone en largeur, une en hauteur)
    const def = this.defaultLayout();
    const same = CTRL_KEYS.every((k) => Math.abs(def[k].x - this.edPos[k].x) < 1 && Math.abs(def[k].y - this.edPos[k].y) < 1 && def[k].s === this.edPos[k].s);
    SETTINGS.layout = SETTINGS.layout || {};
    if (same) delete SETTINGS.layout[L.portrait ? 'P' : 'L'];
    else SETTINGS.layout[L.portrait ? 'P' : 'L'] = o;
    if (!Object.keys(SETTINGS.layout).length) delete SETTINGS.layout;
    saveSettings();
    this.editing = false;
    reopenSettings = true;
    this.scene.restart();
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
