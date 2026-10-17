// ===========================================================================
// MODE CAMPAGNE : "La Nuit des Éclats" — 6 chapitres, dialogues, boss final (L'OMBRE)
// Greffé sur GameScene : menu, dialogues, enchaînement des combats, sauvegarde locale.
// ===========================================================================
const SAVE_KEY = 'brawl_campaign_v1';
function campSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ hero: camp.hero, ch: camp.ch })); } catch (e) {}
}
function campLoad() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (s && ORDER.includes(s.hero) && s.ch >= 0 && s.ch < 6) return s;
  } catch (e) {}
  return null;
}
function campClear() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
}

// Difficulté par chapitre : niveau du bot (temps de réaction, précision), jamais de bonus de dégâts,
// sauf un petit bonus pour l'Ombre (chapitre final), justifié par l'histoire
const CAMP_DIFF = [
  { stocks: 2, lvl: 0, aggr: 0.9 },
  { stocks: 2, lvl: 0, aggr: 1.1 },
  { stocks: 3, lvl: 1, aggr: 1.0 },
  { stocks: 3, lvl: 1, aggr: 1.2 },
  { stocks: 3, lvl: 2, aggr: 1.0 },
  { stocks: 3, lvl: 2, aggr: 1.25, dmg: 1.1 },
];

const STORY = {
  prologue: [
    ['nar', 'Chaque automne, la Lune d\'Arène prête son Cristal aux six plus grands combattants de la ville.'],
    ['nar', 'Cette nuit, le Cristal s\'est brisé en six éclats. La Lune s\'éteint. Sans sa lumière, plus de tournoi.'],
    ['hero', 'Cinq de mes rivaux gardent un éclat chacun. Je vais les gagner à la loyale.'],
    ['hero', 'Le sixième, le mien... je saurai bien où le trouver.'],
  ],
  intro: {
    toro: [['toro', 'Un éclat ? Il est là, sous mon bandeau. Viens le chercher au poing !'], ['hero', 'Je préfère le gagner que d\'en discuter.']],
    astra: [['astra', 'Les étoiles disaient que tu viendrais. Elles ne disaient pas si tu gagnerais.'], ['hero', 'Alors on va les départager.']],
    grom: [['grom', 'Mon éclat ? Je l\'ai mis à l\'abri. Dans mon poing.'], ['hero', 'Je vais devoir te faire ouvrir la main.']],
    deadlulu: [['deadlulu', 'Le Cristal, c\'est mon nouveau plectre. Écoute, il sonne ré dièse.'], ['hero', 'Rends-le, ou je te le fais avaler.']],
    denodoom: [['denodoom', 'L\'éclat dort sous la garde de l\'Aigle de Carthage. Il ne cède qu\'au courage.'], ['hero', 'Du courage, j\'en ai à revendre.']],
    nini: [['nini', 'Je suis non-violente. Vraiment. Mais mon chat, lui, a des opinions.'], ['hero', 'Ton chat me regarde bizarrement.']],
    ombre: [['nar', 'Cinq éclats brillent. Un sixième manque, et une silhouette sombre barre la route.'], ['ombre', 'Tu as réuni cinq éclats. Il manque le tien. Je suis tout ce que tu n\'as pas osé être.'], ['hero', 'Alors on règle ça ici.']],
  },
  outro: {
    toro: [['toro', 'Aïe... Bon combat. Prends-le. Et mange un truc, t\'es pâle.'], ['nar', 'Premier éclat récupéré.']],
    astra: [['astra', 'Intéressant. Les étoiles se sont trompées, pour une fois.'], ['nar', 'Éclat suivant en poche.']],
    grom: [['grom', 'Tu cognes fort. Prends-le... mais lâche-moi le bras.'], ['nar', 'La main de Grom s\'ouvre enfin.']],
    deadlulu: [['deadlulu', 'Mon plectre ! ...Garde-le. Je me ferai un rappel.'], ['nar', 'Le Cristal vibre encore d\'un ré dièse.']],
    denodoom: [['denodoom', 'Courage constaté. L\'Aigle s\'incline. Prends l\'éclat, brave.'], ['nar', 'Cinq éclats. Il ne reste que l\'Ombre.']],
    nini: [['nini', 'Le chat dit que tu peux l\'avoir. Le corgi est vexé.'], ['nar', 'Un éclat de plus, sous l\'oeil du chat.']],
  },
  epilogue: [
    ['ombre', 'Tu m\'as vaincue... Je n\'étais que ton doute.'],
    ['nar', 'Les six éclats s\'assemblent. La Lune se rallume sur l\'arène.'],
    ['nar', 'Les six rivaux se retrouvent sous sa lumière. Le tournoi peut commencer... à la prochaine saison.'],
    ['nar', 'FIN. Merci d\'avoir joué !'],
  ],
};
const SPEAKER = { nar: { n: '', c: '#cfd3ff' }, ombre: { n: 'L\'OMBRE', c: '#9b8cff' } };

function campOpp(hero, ch) {
  const others = ORDER.filter((x) => x !== hero);
  return ch < 5 ? others[ch] : hero;
}
function campChapterLines(ch) {
  const hero = camp.hero;
  const opp = campOpp(hero, ch);
  const key = ch < 5 ? opp : 'ombre';
  const title = ch < 5 ? `CHAPITRE ${ch + 1} : ${CHARS[opp].name}` : 'CHAPITRE FINAL : L\'OMBRE';
  const lines = [['title', title], ...STORY.intro[key]];
  return ch === 0 ? [...STORY.prologue, ...lines] : lines;
}

Object.assign(GameScene.prototype, {
  // ----- Menu principal ---------------------------------------------------
  menuButtons(list, y0) {
    const D = 120;
    this.uiBtns = [];
    const bw = Math.min(this.W - 80, 520), bh = L.portrait ? 84 : 70, gap = 22;
    list.forEach((b, i) => {
      const y = y0 + i * (bh + gap);
      const r = this.add.rectangle(this.W / 2, y, bw, bh, 0x1a1d33, 1).setStrokeStyle(4, b.col || 0xf72585).setDepth(D);
      const t = this.add.text(this.W / 2, y, b.label, { fontFamily: FONT, fontSize: L.portrait ? '20px' : '18px', color: '#ffffff', stroke: '#000', strokeThickness: 5, align: 'center' }).setOrigin(0.5).setDepth(D + 1);
      this.ui.push(r, t);
      this.uiBtns.push({ x: this.W / 2, y, w: bw, h: bh, fn: b.fn });
    });
  },

  menuBase(title, opts) {
    opts = opts || {};
    this.clearUi();
    this.state = 'menu';
    this.barBtn = null;
    const small = !!opts.small;
    this.ui.push(
      this.add.rectangle(this.W / 2, this.H / 2, this.W, this.H, 0x0b0d1f, 0.88).setDepth(100),
      this.add.text(this.W / 2, small ? 100 : this.H * (L.portrait ? 0.14 : 0.21), title, { fontFamily: FONT, fontSize: small ? '36px' : L.portrait ? '44px' : '48px', color: '#ffffff', stroke: '#f72585', strokeThickness: small ? 8 : 10, align: 'center', lineSpacing: 10 }).setOrigin(0.5).setDepth(101)
    );
    if (typeof ONLINE_OK !== 'undefined' && ONLINE_OK && !opts.noBar && Auth.name) this.drawBar();
  },

  // encart pseudo en haut : un toucher ouvre le profil
  drawBar() {
    const p = Auth.profile;
    let txt = Auth.name.toUpperCase().slice(0, 16);
    txt += Auth.session ? (p ? `  -  ${p.rating} PTS` : '') : '  (INVITE)';
    const w = Math.min(Math.max(300, txt.length * 20 + 80), this.W - 40), h = 46, x = this.W / 2, y = 32;
    this.ui.push(
      this.add.rectangle(x, y, w, h, 0x1a1d33, 1).setStrokeStyle(3, 0xffe9a8).setDepth(130),
      this.add.text(x, y, txt + '  >', { fontFamily: FONT, fontSize: '15px', color: '#ffe9a8', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(131)
    );
    this.barBtn = { x, y, w, h, fn: () => this.showProfile() };
  },

  showMenu() {
    this.menuBase('BRAWL\nPROTO');
    const y0 = this.H * (L.portrait ? 0.38 : 0.5);
    this.menuButtons(
      [
        { label: 'JOUER', fn: () => this.showPlayMenu() },
        { label: 'CAMPAGNE', col: 0x4cc9f0, fn: () => this.showCampMenu() },
        { label: 'REGLAGES', col: 0xffb703, fn: () => this.showSettings() },
        { label: 'COMMENT JOUER', col: 0x6ee7b7, fn: () => this.showHelp() },
      ],
      y0
    );
  },

  showHelp() {
    this.menuBase('COMMENT\nJOUER');
    this.ui.push(
      this.add
        .text(this.W / 2, this.H * 0.52, HELP_TXT, { fontFamily: FONT, fontSize: L.portrait ? '18px' : '14px', color: '#cfd3ff', align: 'center', lineSpacing: 7 })
        .setOrigin(0.5)
        .setDepth(101)
    );
    this.menuButtons([{ label: 'RETOUR', col: 0x888888, fn: () => this.showMenu() }], this.H * (L.portrait ? 0.86 : 0.9));
  },

  showPlayMenu() {
    this.menuBase('JOUER');
    const list = [{ label: 'VS BOT', fn: () => { campPick = false; camp = null; trainingMode = false; this.training = false; this.showSelect(); } }];
    if (typeof ONLINE_OK !== 'undefined' && ONLINE_OK)
      list.push({ label: 'EN LIGNE', col: 0xffb703, fn: async () => { if (await Auth.ensure()) setTimeout(goOnline, 0); } });
    list.push({ label: 'ENTRAINEMENT', col: 0x6ee7b7, fn: () => { campPick = false; camp = null; trainingMode = true; this.training = true; this.showSelect(); } });
    list.push({ label: 'RETOUR', col: 0x888888, fn: () => this.showMenu() });
    this.menuButtons(list, this.H * (L.portrait ? 0.38 : 0.5));
  },

  showCampMenu() {
    const save = campLoad();
    if (!save) {
      campPick = true;
      this.showSelect();
      return;
    }
    this.menuBase('CAMPAGNE');
    const y0 = this.H * (L.portrait ? 0.36 : 0.46);
    this.menuButtons(
      [
        { label: `CONTINUER\n${CHARS[save.hero].name} - CHAP. ${save.ch + 1}/6`, fn: () => this.campResume(save) },
        { label: 'NOUVELLE PARTIE', col: 0xffb703, fn: () => { campPick = true; this.showSelect(); } },
        { label: 'RETOUR', col: 0x888888, fn: () => this.showMenu() },
      ],
      y0
    );
  },

  uiTap(p) {
    if (this.state === 'story' && this.storyTap) {
      this.storyTap();
      return;
    }
    if (SETTINGS.sound) SFX.play('ui');
    const bb = this.barBtn;
    if (bb && Math.abs(p.x - bb.x) <= bb.w / 2 && Math.abs(p.y - bb.y) <= bb.h / 2) {
      bb.fn();
      return;
    }
    for (const b of this.uiBtns || []) {
      if (Math.abs(p.x - b.x) <= b.w / 2 && Math.abs(p.y - b.y) <= b.h / 2) {
        b.fn();
        return;
      }
    }
  },

  // ----- Déroulement de la campagne ----------------------------------------
  campNew(hero) {
    campPick = false;
    camp = { hero, ch: 0 };
    campSave();
    this.campChapter();
  },

  campResume(save) {
    camp = { hero: save.hero, ch: save.ch };
    campPick = false;
    this.campChapter(true);
  },

  campChapter(skipPrologue) {
    camp.phase = 'story';
    camp.after = 'match';
    camp.opp = campOpp(camp.hero, camp.ch);
    let lines = campChapterLines(camp.ch);
    if (skipPrologue && camp.ch === 0) lines = lines.slice(STORY.prologue.length);
    camp.lines = lines;
    chosen = camp.hero;
    goSelect = false;
    this.scene.restart();
  },

  campEnter() {
    const c = camp;
    this.setControls(false);
    if (c.phase === 'story') {
      this.state = 'story';
      this.campStory();
    } else if (c.phase === 'match') {
      this.setControls(true);
      this.state = 'play';
      chosen = c.hero;
      this.forceBot = c.opp;
      this.beginMatch(c.hero);
      this.campApply();
    } else if (c.phase === 'lost') {
      this.showCampLost();
    }
  },

  campApply() {
    const d = CAMP_DIFF[camp.ch];
    const e = this.p2;
    e.stocks = d.stocks;
    e.aggr = d.aggr;
    e.lvl = d.lvl;
    if (d.dmg) e.dmgMul = d.dmg;
    if (camp.ch === 5) {
      e.shade = 0x7c6bd6;
      e.tag.setText('OMBRE');
      e.hud.name.setText('OMBRE');
    }
    this.add
      .text(this.W / 2, 78, camp.ch === 5 ? 'CHAPITRE FINAL' : `CHAPITRE ${camp.ch + 1}/6`, { fontFamily: FONT, fontSize: '14px', color: '#ffe9a8', stroke: '#000', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(50);
  },

  campFinish(won) {
    const c = camp;
    let fired = false;
    const go = () => {
      if (fired) return;
      fired = true;
      this.campSkip = null;
      if (won) {
        c.phase = 'story';
        const key = c.ch < 5 ? c.opp : null;
        c.lines = key ? STORY.outro[key] : STORY.epilogue;
        c.after = key ? 'advance' : 'quit';
      } else c.phase = 'lost';
      if (won && c.ch === 5) campClear();
      this.scene.restart();
    };
    this.campSkip = go;
    this.sub.setText(won ? 'TOUCHE POUR CONTINUER' : '');
    this.time.delayedCall(won ? 3500 : 2200, go);
  },

  showCampLost() {
    this.state = 'menu';
    this.ui.push(this.add.rectangle(this.W / 2, this.H / 2, this.W, this.H, 0x0b0d1f, 0.92).setDepth(100));
    this.ui.push(this.add.text(this.W / 2, this.H * 0.2, 'DEFAITE...', { fontFamily: FONT, fontSize: '44px', color: '#ff5a6e', stroke: '#000', strokeThickness: 8 }).setOrigin(0.5).setDepth(101));
    this.menuButtons(
      [
        { label: 'REESSAYER', fn: () => { camp.phase = 'match'; this.scene.restart(); } },
        { label: 'MENU PRINCIPAL', col: 0x888888, fn: () => { camp = null; chosen = null; goSelect = false; this.scene.restart(); } },
      ],
      this.H * (L.portrait ? 0.4 : 0.5)
    );
  },

  // ----- Dialogues ---------------------------------------------------------
  setControls(v) {
    (this.ctrlObjs || []).forEach((o) => o.setVisible(v));
  },

  campStory() {
    const c = camp;
    const D = 110;
    const W = this.W, H = this.H;
    const lines = c.lines.slice();
    const heroName = CHARS[c.hero].name;
    const oppId = c.opp;
    const gy = L.baseY - 34;

    // les deux personnages sur la scène
    const hs = this.add.image(W / 2 - 150, gy, `${c.hero}_idle0`).setScale(PX).setDepth(10);
    const os = this.add.image(W / 2 + 150, gy, `${oppId}_idle0`).setScale(PX).setDepth(10).setFlipX(true);
    if (c.ch === 5) os.setTint(0x7c6bd6);
    this.ui.push(hs, os);
    this.tweens.add({ targets: [hs, os], y: gy + 3, duration: 450, yoyo: true, repeat: -1 });

    const ph = L.portrait ? 270 : 190;
    const py = H - ph / 2 - 16;
    this.ui.push(this.add.rectangle(W / 2, py, W - 32, ph, 0x0b0d1f, 0.94).setStrokeStyle(4, 0xffffff, 0.8).setDepth(D));
    const fs = L.portrait ? 20 : 17;
    const name = this.add.text(32 + 18, py - ph / 2 + 16, '', { fontFamily: FONT, fontSize: fs + 2 + 'px', color: '#fff', stroke: '#000', strokeThickness: 5 }).setDepth(D + 1);
    const body = this.add
      .text(32 + 18, py - ph / 2 + 16 + fs + 20, '', { fontFamily: FONT, fontSize: fs + 'px', color: '#ffffff', lineSpacing: 10, wordWrap: { width: W - 100 } })
      .setDepth(D + 1);
    const more = this.add.text(W - 52, py + ph / 2 - 22, '▼', { fontFamily: FONT, fontSize: '18px', color: '#ffe9a8' }).setOrigin(0.5).setDepth(D + 1);
    this.tweens.add({ targets: more, alpha: 0.2, duration: 450, yoyo: true, repeat: -1 });
    this.ui.push(name, body, more);

    let cur = null, typing = null, full = '';
    const finish = () => {
      if (typing) typing.remove();
      typing = null;
      body.setText(full);
      more.setVisible(true);
    };
    const next = () => {
      const ln = lines.shift();
      if (!ln) {
        this.storyTap = null;
        const a = c.after;
        if (a === 'match') c.phase = 'match';
        else if (a === 'advance') {
          c.ch++;
          campSave();
          c.opp = campOpp(c.hero, c.ch);
          c.phase = 'story';
          c.after = 'match';
          c.lines = campChapterLines(c.ch);
        } else {
          camp = null;
          chosen = null;
          goSelect = false;
        }
        this.scene.restart();
        return;
      }
      const [who, raw] = ln;
      if (who === 'title') {
        // carte de chapitre
        name.setText('');
        full = raw;
        body.setText('').setFontSize(fs + 6);
        body.setColor('#ffe9a8');
      } else {
        body.setFontSize(fs).setColor('#ffffff');
        let spk = SPEAKER[who];
        if (who === 'hero') spk = { n: heroName, c: '#ffe9a8' };
        else if (!spk) spk = { n: CHARS[who].name, c: CHARS[who].roleCol };
        name.setText(spk.n).setColor(spk.c);
        full = raw;
        body.setText('');
        const isHero = who === 'hero';
        hs.setAlpha(who === 'nar' || isHero ? 1 : 0.55);
        os.setAlpha(who === 'nar' || (!isHero && who !== 'nar') ? 1 : 0.55);
      }
      more.setVisible(false);
      let i = 0;
      typing = this.time.addEvent({
        delay: 26,
        loop: true,
        callback: () => {
          i++;
          body.setText(full.slice(0, i));
          if (i >= full.length) finish();
        },
      });
    };
    this.storyTap = () => (typing ? finish() : next());
    next();
  },
});
