// ===========================================================================
// NATANAX : éclaireur en cape verte, une casquette « à la Peaky Blinders » à la main (lames dans la visière).
// Mécaniques :
//  - CASQUETTE (SPÉCIAL) : lancée en boomerang, elle coupe à l'aller et au retour. Rattrapée au retour = recharge
//    immédiate. Ratée, elle tombe au sol : il faut aller la ramasser (elle revient seule au bout de 5 s). Sans elle,
//    ses LÉGERS frappent moins fort (aux poings).
//  - TABLEAU E = MC² (SPÉCIAL + BAS TENU, au sol) : il écrit la formule à la craie, 0,5 s par morceau (E, =, MC²),
//    immobile et attaquable. Interrompu, ce qui est écrit reste (effacé seulement quand il perd une vie).
//  - FISSION (SPÉCIAL + BAS, appui court) : l'atome écrasé se coupe en deux, une moitié file de chaque côté.
//    Formule complète : RÉACTION EN CHAÎNE (lunettes noires, préparation longue, explosion, 4 neutrons) ; la formule
//    s'efface.
//  - ALLEY-OOP (SPÉCIAL haut) : saut très haut, dunk sur celui qui est au-dessus, le ballon repart vers le bas.
// Tout l'état de jeu est en champs simples (eqMs, sHold) ou dans les projectiles (back, spent, hits) : sauvegardé.
// ===========================================================================
const NX = { eqMs: 1500, eqStep: 500, holdMs: 130, bare: 0.75, catchX: 42, catchY: 58 };

CHARS.natanax = {
  id: 'natanax', name: 'NATANAX', role: 'ÉCLAIREUR ATOMIQUE', roleCol: '#7ee08a', cardCol: '#2f8a4a',
  speed: 355, jump: 690, weight: 1.0, jumps: 3, cap: true,
  pal: { main: '#1f6a36', dark: '#123a20', skin: '#f2c2a4', skin2: '#dc9e80', hair: '#26180e', accent: '#d29e54', glove: '#f2c2a4' },
  fx: { main: 0x349052, alt: 0xd29e54, core: 0xffffff, cres: 'cres_nx' },
  help: [],
  moves: {},
};
ORDER.push('natanax');

Object.assign(GameScene.prototype, {
  // la casquette est-elle partie (en vol ou par terre) ?
  nxCapOut(pl) {
    for (const p of this.projs) if (!p.dead && p.owner === pl && p.spec.kind === 'cap') return true;
    return false;
  },

  // choix du coup juste avant qu'il parte (null = refusé)
  nxPick(pl, m, now) {
    if (!pl.def.cap) return m;
    if (m.proj && m.proj.kind === 'cap' && this.nxCapOut(pl)) {
      const c = pl.sprite.body.center;
      this.popup(c.x, c.y - 80, 'PAS DE CASQUETTE', '#cfe8d4');
      pl.cdUntil = now + 150;
      return null;
    }
    // formule complète : la FISSION devient la RÉACTION EN CHAÎNE
    if (m.type === 'fission' && (pl.eqMs || 0) >= NX.eqMs && pl.def.moves.dSX) return pl.def.moves.dSX;
    return m;
  },

  // au départ du coup (pl.atk vient d'être créé)
  nxStart(pl, m, now, grounded) {
    if (!pl.def.cap) return;
    const a = pl.atk, s = pl.sprite;
    if (m.type === 'fission') {
      a.done = true;
      a.moveLock = now + m.startup;
      if (grounded) s.setVelocityX(s.body.velocity.x * 0.3);
      this.sched(m.startup, 'nxFission', { pi: pl.i, aid: a.id });
    }
    if (m.nuke) {
      s.setVelocityX(0);
      this.sched(m.startup, 'nxNuke', { pi: pl.i, aid: a.id });
      if (!this.resim) {
        // l'atome gonfle entre ses mains pendant la préparation
        const c = s.body.center;
        const g = this.add.image(c.x + pl.facing * 18, c.y - 4, 'ring').setTint(0x9ff4ff).setDepth(31).setScale(0.3);
        this.tweens.add({ targets: g, scale: 2.2, alpha: { from: 1, to: 0.2 }, duration: m.startup, onComplete: () => g.destroy() });
      }
    }
    if (m.dunk) this.sched(m.startup + m.dunk, 'nxDunk', { pi: pl.i, aid: a.id });
  },

  nxTimer(t, pl, now) {
    const d = t.data;
    if (!pl || !pl.atk || pl.atk.id !== d.aid || pl.stocks <= 0 || this.over) return;
    const m = pl.atk.m, foe = this.foeOf(pl);
    if (t.kind === 'nxFission') {
      const b = pl.sprite.body;
      const gnd = b.blocked.down || b.touching.down;
      const sp = gnd ? m.neutron : Object.assign({}, m.neutron, { ground: false, oy: 0 });
      this.spawnProj(pl, foe, { backFire: false }, now, 0, sp);
      this.spawnProj(pl, foe, { backFire: true }, now, 0, sp);
      if (!this.resim) {
        const x = b.center.x + pl.facing * 24, y = gnd ? b.bottom - 6 : b.center.y;
        const r = this.add.image(x, y, 'ring').setTint(0x9ff4ff).setDepth(30).setScale(0.5);
        this.tweens.add({ targets: r, scale: 3, alpha: 0, duration: 260, onComplete: () => r.destroy() });
        this.sfx('magic', 0.6);
      }
    } else if (t.kind === 'nxNuke') {
      pl.eqMs = 0; // la formule est consommée
      const sp = m.neutron;
      this.spawnProj(pl, foe, { backFire: false }, now, 0, sp);
      this.spawnProj(pl, foe, { backFire: true }, now, 0, sp);
      const sp2 = Object.assign({}, sp, { vx: sp.vx * 0.62, oy: sp.oy - 34, ground: false });
      this.spawnProj(pl, foe, { backFire: false }, now, -34, sp2);
      this.spawnProj(pl, foe, { backFire: true }, now, -34, sp2);
    } else if (t.kind === 'nxDunk') {
      this.spawnProj(pl, foe, null, now, 0, m.proj);
    }
  },

  // à chaque image (après le reste de step)
  nxStep(pl, now) {
    if (!pl.def.cap) return;
    const s = pl.sprite, b = s.body;
    const grounded = !pl.ledgeSide && (b.blocked.down || b.touching.down);
    if (pl.eqMs === undefined) pl.eqMs = 0;
    // SPÉCIAL + BAS encore tenu peu après l'appui : il ne lance pas la FISSION, il écrit au tableau
    const a = pl.atk;
    if (a && a.m.type === 'fission' && !a.wchk && now >= a.start + NX.holdMs) {
      a.wchk = true;
      if (pl.sHold && grounded && pl.eqMs < NX.eqMs && pl.def.moves.dSW) {
        pl.moveCd.dS = now; // la FISSION n'est pas partie : pas de recharge
        pl.atk = { id: ++this.atkSeq, m: pl.def.moves.dSW, key: 'dSW', pose: 'write', start: now, hitAt: 1e15, end: now + 200, moveLock: now + 200, done: true };
        pl.cdUntil = now + 200;
      }
    }
    const w = pl.atk;
    if (w && w.m.type === 'write' && !w.stop) {
      if (pl.sHold && grounded && pl.eqMs < NX.eqMs && pl.stocks > 0) {
        w.end = w.moveLock = pl.cdUntil = now + 2 * STEP_MS + 1;
        s.setVelocityX(0);
        const before = Math.floor(pl.eqMs / NX.eqStep);
        pl.eqMs = Math.min(NX.eqMs, pl.eqMs + STEP_MS);
        const after = Math.floor(pl.eqMs / NX.eqStep);
        w.pose = Math.floor((now - w.start) / 200) % 2 ? 'write2' : 'write';
        if (after > before) this.sfx(after >= 3 ? 'count' : 'note', 0.5); // un morceau de plus (affiché au-dessus de sa tête)
        if (pl.eqMs >= NX.eqMs) {
          w.stop = true;
          w.end = w.moveLock = pl.cdUntil = now + 250;
          if (!this.resim) {
            const c = b.center;
            this.shockwave(c.x, b.bottom, { main: 0x9ff4ff, alt: 0xffffff });
          }
        }
      } else {
        w.stop = true;
        w.end = w.moveLock = pl.cdUntil = now + 150;
      }
    }
    this.nxShow(pl, now);
  },

  // affichage seulement : la formule au-dessus de la tête, le tableau pendant l'écriture
  nxShow(pl, now) {
    const s = pl.sprite, b = s.body;
    const n = Math.floor((pl.eqMs || 0) / NX.eqStep);
    if (n > 0 && pl.stocks > 0) {
      const txt = ['', 'E', 'E =', 'E = MC²'][Math.min(n, 3)];
      if (!pl.eqImg && !this.resim) pl.eqImg = this.add.text(s.x, s.y - 100, txt, { fontFamily: FONT, fontSize: '15px', color: '#ffffff', stroke: '#123a20', strokeThickness: 5 }).setOrigin(0.5).setDepth(41);
      if (pl.eqImg) {
        if (pl.eqImg.text !== txt) pl.eqImg.setText(txt);
        const full = n >= 3;
        pl.eqImg.setPosition(s.x, s.y - 96 + (full ? dsin(now / 110) * 3 : 0)).setColor(full && Math.floor(now / 160) % 2 ? '#fff3a0' : '#ffffff');
        pl.eqImg.setVisible(!(now < (pl.invisUntil || 0)));
      }
    } else if (pl.eqImg) {
      pl.eqImg.destroy();
      pl.eqImg = null;
    }
    const writing = pl.atk && pl.atk.m.type === 'write' && pl.stocks > 0;
    if (writing) {
      const x = s.x + pl.facing * 64, y = b.bottom;
      if (!pl.boardImg && !this.resim) {
        pl.boardImg = this.add.image(x, y, 'board').setOrigin(0.5, 1).setScale(PX * 1.1).setDepth(8);
        pl.boardTxt = this.add.text(x, y - 46, '', { fontFamily: FONT, fontSize: '11px', color: '#f4f4ec' }).setOrigin(0.5).setDepth(9);
      }
      if (pl.boardImg) {
        pl.boardImg.setPosition(x, y);
        const k = Math.floor(((pl.eqMs || 0) / NX.eqMs) * 7 + 0.001);
        pl.boardTxt.setPosition(x, y - 46).setText('E = MC²'.slice(0, Math.min(k, 7)));
      }
    } else if (pl.boardImg) {
      pl.boardImg.destroy();
      pl.boardTxt.destroy();
      pl.boardImg = pl.boardTxt = null;
    }
  },

  // la casquette (true = déjà traitée, le reste de la boucle des projectiles est sauté)
  nxProj(p, now) {
    const sp = p.spec;
    if (sp.kind !== 'cap') return false;
    const o = p.owner, dt = STEP_MS / 1000;
    if (!p.hits) p.hits = new Set();
    if (now - p.born > sp.life || o.stocks <= 0) {
      // trop longtemps loin de lui : elle revient toute seule
      this.killProj(p, false);
      if (o.stocks > 0 && !this.resim) this.popup(o.sprite.x, o.sprite.y - 90, 'CASQUETTE !', '#cfe8d4');
      return true;
    }
    const ob = o.sprite.body.center;
    const near = Math.abs(p.x - ob.x) < NX.catchX && Math.abs(p.y - ob.y) < NX.catchY;
    if (p.spent) {
      // posée par terre : il la ramasse en passant dessus
      if (near) {
        this.killProj(p, false);
        if (!this.resim) this.popup(ob.x, ob.y - 90, 'CASQUETTE !', '#cfe8d4');
        this.sfx('catch', 0.4);
      }
      return true;
    }
    p.sprite.angle += 26 * p.f;
    const t = now - p.born;
    // boomerang : elle ralentit, fait demi-tour, revient ; après être repassée par son point de départ, elle tombe
    if (!p.back && p.vx * p.f <= 0) {
      p.back = true;
      p.hits = new Set();
    }
    if (t < sp.fallAt) {
      p.vx -= p.f * sp.decel * dt;
      p.vx = Math.max(-sp.vx, Math.min(sp.vx, p.vx));
    } else {
      p.vy += 1700 * dt;
      p.vx *= 0.86;
    }
    if (p.vy > 0 && p.y > L.baseY - 12 && Math.abs(p.x - this.W / 2) < L.mainW / 2) {
      p.y = L.baseY - 12;
      p.vx = p.vy = 0;
      p.spent = true;
      p.sprite.setPosition(p.x, p.y).setAngle(0);
      return true;
    }
    // RATTRAPÉE au retour : recharge immédiate
    if (p.back && near && now >= o.stunUntil) {
      this.killProj(p, false);
      o.moveCd.nS = now;
      if (!this.resim) {
        this.popup(ob.x, ob.y - 90, 'RATTRAPÉE !', '#7ee08a');
        const r = this.add.image(ob.x + o.facing * 10, ob.y - 10, 'ring').setTint(0x7ee08a).setDepth(31).setScale(0.6);
        this.tweens.add({ targets: r, scale: 2.6, alpha: 0, duration: 240, onComplete: () => r.destroy() });
      }
      this.sfx('catch', 0.6);
      return true;
    }
    // elle coupe une fois à l'aller et une fois au retour
    const victims = this.pls.length > 2 ? this.enemiesOf(o) : [p.target];
    for (const v of victims) {
      if (p.dead || p.hits.has(v) || now < v.invulnUntil || v.stocks <= 0 || v.grab) continue;
      if (v.atk && v.atk.m.projImmune && now < v.atk.end) continue;
      const vb = v.sprite.body;
      if (!(p.x + sp.w / 2 > vb.x && p.x - sp.w / 2 < vb.right && p.y + sp.h / 2 > vb.y && p.y - sp.h / 2 < vb.bottom)) continue;
      // CONTRÔLE d'AdieuLescure : il l'attrape et la renvoie
      if (v.atk && v.atk.m.type === 'catch' && now >= v.atk.cFrom && now <= v.atk.cTo) {
        this.catchProj(v, p, now);
        return true;
      }
      p.hits.add(v);
      this.applyHit(o, v, sp, now, Math.sign(p.vx) || p.f, { x: p.x, y: p.y });
    }
    return true;
  },

  // bot (appelé au début de botInput) : il écrit au tableau quand l'adversaire est loin (ou encore sonné), et lâche
  // s'il approche. null = le bot joue normalement.
  nxBot(bot, tgt, now) {
    if (!bot.def.cap || bot.stocks <= 0 || tgt.stocks <= 0 || now < bot.stunUntil || bot.ledgeSide) return null;
    const b = bot.sprite.body;
    const grounded = b.blocked.down || b.touching.down;
    const onStage = Math.abs(bot.sprite.x - this.W / 2) < L.mainW / 2 - 60;
    const far = Math.abs(tgt.sprite.x - bot.sprite.x) > 330 || now < tgt.stunUntil - 300;
    const idle = { sx: 0, sy: 0, jump: false, attack: false, heavy: false, special: false, hold: false, block: false };
    const a = bot.atk;
    if (a && (a.m.type === 'write' || a.m.type === 'fission') && bot.botWrite) {
      if (far && (bot.eqMs || 0) < NX.eqMs) return Object.assign(idle, { sy: 1, shold: true });
      bot.botWrite = false;
      return idle;
    }
    if (!a && grounded && onStage && far && (bot.eqMs || 0) < NX.eqMs && now > bot.cdUntil && Math.random() < 0.08) {
      bot.botWrite = true;
      return Object.assign(idle, { special: true, sy: 1, shold: true });
    }
    return null;
  },

  makeNxTextures() {
    crescentTex(this, 'cres_nx', ['#ffffff', '#d0d6e0', '#5cb874']);
    // casquette plate en vol (visière et lame à droite)
    iconTex(this, 'capProj', ['...kkkkk...', '..kTTTTTk..', '.kTtTTTTTk.', 'kTttTTTTTkk', 'kttttttttBk', '.kkkkkkkkkk'], '#000',
      { k: '#16121a', T: '#6a5c4c', t: '#463c32', B: '#e6eaf2' });
    // neutron (moitié d'atome lumineuse)
    iconTex(this, 'neutron', ['..kkk..', '.kcCck.', 'kcCWCck', 'kCWWWCk', 'kcCWCck', '.kcCck.', '..kkk..'], '#000',
      { k: '#0c3a48', c: '#3cc8e6', C: '#96f0ff', W: '#ffffff' });
    // ballon de basket
    iconTex(this, 'bball', ['..kkkk..', '.kOoOOk.', 'kOOkOOOk', 'kkkkkkkk', 'kOoOkOOk', 'kOOOkOok', '.kOOkOk.', '..kkkk..'], '#000',
      { k: '#1a0a04', O: '#e8761e', o: '#ffb070' });
    // tableau noir sur pieds
    iconTex(this, 'board', [
      'wwwwwwwwwwwwwwwwwwwwww', 'wggggggggggggggggggggw', 'wggggggggggggggggggggw', 'wggggggggggggggggggggw', 'wggggggggggggggggggggw', 'wggggggggggggggggggggw',
      'wggggggggggggggggggggw', 'wggggggggggggggggggggw', 'wggggggggggggggggggggw', 'wggggggggggggggggggggw', 'wwwwwwwwwwwwwwwwwwwwww', '..w................w..',
      '..w................w..', '.w..................w.', '.w..................w.', 'w....................w'], '#000', { w: '#7a4e24', g: '#24402c' });
    // champignon atomique (affichage)
    mkCanvas(this, 'mushroom', 40, 44, (c) => {
      const blob = (x, y, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };
      c.fillStyle = '#c8a070'; c.fillRect(16, 16, 8, 26);
      c.fillStyle = '#e8c890'; c.fillRect(17, 16, 3, 26);
      blob(20, 42, 8, '#a87848');
      for (const [x, y, r] of [[10, 14, 8], [20, 9, 10], [30, 14, 8], [14, 6, 6], [26, 6, 6]]) blob(x, y, r, '#ffb050');
      for (const [x, y, r] of [[12, 12, 5], [20, 7, 6], [28, 12, 5]]) blob(x, y, r, '#fff0b0');
      c.fillStyle = '#ff7030'; c.fillRect(6, 18, 28, 3);
    });
  },
});

(() => {
  const P = GameScene.prototype;
  const baseTex = P.makeExtraTextures;
  P.makeExtraTextures = function () {
    if (baseTex) baseTex.call(this);
    this.makeNxTextures();
  };
  const baseStep = P.bzStep;
  P.bzStep = function (pl, other, now) {
    if (baseStep) baseStep.call(this, pl, other, now);
    this.nxStep(pl, now);
  };
  const baseProj = P.bzProj;
  P.bzProj = function (p, now) {
    if (baseProj && baseProj.call(this, p, now)) return true;
    return this.nxProj(p, now);
  };
  // sans casquette, ses coups légers frappent moins fort
  const baseHit = P.bzHit;
  P.bzHit = function (att, vic, spec, now) {
    if (baseHit) spec = baseHit.call(this, att, vic, spec, now);
    if (att.def.cap && spec.light && this.nxCapOut(att)) spec = Object.assign({}, spec, { dmg: spec.dmg * NX.bare });
    return spec;
  };
  // perdre une vie efface la formule ; la casquette revient
  const baseDie = P.die;
  P.die = function (pl, now) {
    if (pl.def.cap) {
      pl.eqMs = 0;
      for (const p of this.projs) if (!p.dead && p.owner === pl && p.spec.kind === 'cap') this.killProj(p, false);
    }
    return baseDie.call(this, pl, now);
  };
  // effets des coups de NATANAX
  const baseFx = P.extraFx;
  P.extraFx = function (pl, m, fx, b, f) {
    if (baseFx) baseFx.call(this, pl, m, fx, b, f);
    if (fx.nuke) {
      // RÉACTION EN CHAÎNE : flash blanc, ondes, champignon
      this.cameras.main.flash(220, 255, 255, 255);
      this.cameras.main.shake(320, 0.018);
      this.popup(b.x, b.y - 130, 'JE SUIS DEVENU LA MORT', '#fff3a0');
      for (let i = 0; i < 3; i++) {
        const r = this.add.image(b.x, b.y + 10, 'ring').setTint(i % 2 ? 0xffd070 : 0xffffff).setDepth(30).setScale(0.6);
        this.tweens.add({ targets: r, scale: 9 + i * 3, alpha: 0, delay: i * 70, duration: 520, ease: 'Cubic.easeOut', onComplete: () => r.destroy() });
      }
      const mu = this.add.image(b.x, b.y + 34, 'mushroom').setOrigin(0.5, 1).setDepth(7).setScale(PX * 0.6).setAlpha(0.95);
      this.tweens.add({ targets: mu, scale: PX * 2.4, y: b.y + 20, duration: 700, ease: 'Cubic.easeOut' });
      this.tweens.add({ targets: mu, alpha: 0, delay: 650, duration: 600, onComplete: () => mu.destroy() });
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const q = this.add.rectangle(b.x, b.y, 9, 9, i % 2 ? 0xffd070 : 0x9ff4ff).setDepth(30);
        this.tweens.add({ targets: q, x: b.x + Math.cos(a) * 170, y: b.y + Math.sin(a) * 120, alpha: 0, duration: 480, onComplete: () => q.destroy() });
      }
      this.sfx('boom');
      this.sfx('rumble');
    }
    if (fx.atomFx) {
      // l'atome écrasé au sol
      const x = b.x + f * 24, y = b.y + 28;
      const r = this.add.image(x, y, 'ring').setTint(0x9ff4ff).setDepth(30).setScale(0.4);
      this.tweens.add({ targets: r, scale: 2.4, alpha: 0, duration: 240, onComplete: () => r.destroy() });
    }
    if (fx.dunkFx) {
      for (let i = 0; i < 6; i++) {
        const q = this.add.rectangle(b.x + (Math.random() - 0.5) * 30, b.y - 50, 6, 6, i % 2 ? 0xe8761e : 0xffffff).setDepth(30);
        this.tweens.add({ targets: q, y: q.y - 50 - Math.random() * 40, x: q.x + (Math.random() - 0.5) * 60, alpha: 0, duration: 380, onComplete: () => q.destroy() });
      }
    }
  };
})();
