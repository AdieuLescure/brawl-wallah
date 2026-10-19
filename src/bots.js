// ===========================================================================
// BOTS : jouent avec les mêmes règles que le joueur.
// Le niveau règle le temps de réaction, la précision et les choix (jamais de bonus de dégâts).
// ===========================================================================
const BOT_LV = [
  { react: 430, acc: 0.6, aggr: 0.65, dodge: 0.3, punish: 0.35, di: 0.3, escape: 0.2 }, // facile
  { react: 270, acc: 0.8, aggr: 1.0, dodge: 0.5, punish: 0.65, di: 0.7, escape: 0.5 }, // moyen
  { react: 170, acc: 0.92, aggr: 1.25, dodge: 0.7, punish: 0.85, di: 0.95, escape: 0.85 }, // difficile
];

// Coups utilisés par chaque bot : dir (sens du joystick), air (true = en l'air seulement, false = au sol seulement),
// dx (distance horizontale à la cible, en px), dy (cible - bot, négatif = cible au-dessus), w (poids du choix)
const BOT_MOVES = {
  toro: [
    ['nLight', [0, 90], [-60, 50], 4], ['sLight', [40, 150], [-40, 40], 3], ['dLight', [10, 110], [-20, 60], 2],
    ['nSig', [0, 90], [-180, -10], 2], ['sSig', [60, 170], [-50, 50], 2], ['dSig', [30, 150], [-20, 60], 1.5],
    ['nAir', [0, 90], [-70, 70], 3], ['sAir', [40, 160], [-60, 60], 2], ['dAir', [0, 60], [30, 160], 2], ['gp', [0, 70], [60, 260], 1],
  ],
  astra: [
    ['nLight', [140, 600], [-60, 60], 4], ['sLight', [0, 110], [-50, 50], 2], ['dLight', [0, 110], [-20, 60], 2],
    ['nSig', [60, 320], [-260, -60], 2], ['sSig', [200, 650], [-60, 60], 1.5], ['dSig', [40, 230], [-20, 60], 1],
    ['nAir', [0, 90], [-70, 70], 3], ['sAir', [140, 600], [-80, 80], 2], ['dAir', [60, 300], [40, 320], 2],
  ],
  grom: [
    ['nLight', [0, 95], [-60, 50], 3], ['sLight', [180, 420], [-50, 50], 1, { hook: true }], ['dLight', [0, 110], [-20, 60], 2],
    ['nSig', [0, 90], [-180, -20], 2], ['sSig', [0, 85], [-50, 40], 3, { grab: true }], ['dSig', [0, 120], [-20, 40], 1.5, { tgtGround: true }],
    ['nAir', [0, 100], [-70, 70], 3], ['dAir', [30, 120], [-20, 120], 2], ['gp', [0, 60], [30, 220], 1.5],
  ],
  deadlulu: [
    ['nLight', [110, 420], [-60, 60], 4], ['sLight', [0, 110], [-50, 50], 3], ['dLight', [0, 110], [-20, 60], 2],
    ['sSig', [50, 150], [-60, 50], 2], ['dSig', [180, 320], [-40, 60], 1.5, { tgtGround: true }],
    ['nAir', [0, 100], [-70, 70], 3], ['sAir', [30, 140], [-60, 60], 2], ['dAir', [0, 60], [30, 160], 1.5], ['gp', [0, 60], [60, 260], 1],
  ],
  denodoom: [
    ['nLight', [40, 260], [-50, 50], 3], ['sLight', [30, 140], [-50, 50], 3], ['dLight', [0, 110], [-20, 60], 2],
    ['nSig', [0, 120], [-320, -60], 2], ['sSig', [250, 620], [-50, 50], 1, { charge: true }], ['dSig', [90, 170], [-40, 60], 1.5, { tgtGround: true }],
    ['nAir', [0, 100], [-70, 70], 3], ['sAir', [30, 140], [-60, 60], 2], ['dAir', [0, 60], [30, 160], 1.5], ['gp', [0, 60], [60, 260], 1],
  ],
  nini: [
    ['nLight', [0, 95], [-60, 50], 4], ['sLight', [40, 150], [-50, 50], 2.5], ['dLight', [0, 110], [-20, 60], 2],
    ['nSig', [160, 520], [-50, 50], 1.2, { tgtGround: true }], ['sSig', [50, 170], [-50, 50], 2], ['dSig', [160, 600], [-40, 60], 1.2, { tgtGround: true }],
    ['nAir', [0, 95], [-70, 70], 3], ['sAir', [30, 130], [-60, 60], 2], ['dAir', [0, 60], [30, 160], 1.5], ['gp', [0, 80], [40, 260], 1.5],
  ],
  adieulescure: [
    ['nLight', [0, 90], [-50, 60], 4], ['sLight', [40, 200], [-30, 50], 3], ['dLight', [0, 100], [-20, 60], 2],
    ['sSig', [60, 260], [-50, 50], 2],
    ['nAir', [0, 90], [-70, 70], 3], ['sAir', [20, 120], [-50, 50], 2], ['dAir', [60, 260], [40, 260], 1.5],
  ],
};
const BOT_AIR = { nAir: 1, sAir: 1, dAir: 1, rec: 1, gp: 1 };
const BOT_HEAVY = { nSig: 1, sSig: 1, dSig: 1, rec: 1, gp: 1 };
for (const id in BOT_MOVES)
  BOT_MOVES[id] = BOT_MOVES[id].map(([k, dx, dy, w, ex]) => Object.assign({ k, dx, dy, w, air: !!BOT_AIR[k], heavy: !!BOT_HEAVY[k] }, ex || {}));
const BOT_PREF = { toro: 70, astra: 330, grom: 60, deadlulu: 200, denodoom: 160, nini: 90, adieulescure: 90 };

Object.assign(GameScene.prototype, {
  botInput(bot, tgt, now) {
    const i = { sx: 0, sy: 0, jump: false, attack: false, hold: false, block: false };
    if (bot.stocks <= 0 || tgt.stocks <= 0) return i;
    const lv = BOT_LV[bot.lvl === undefined ? 1 : bot.lvl];
    const aggr = lv.aggr * (bot.aggr || 1);
    const s = bot.sprite, b = s.body, ts = tgt.sprite, tb = ts.body;
    const dx = ts.x - s.x, dy = ts.y - s.y, adx = Math.abs(dx), dir = Math.sign(dx) || 1;
    const cx = this.W / 2, half = L.mainW / 2;
    const grounded = b.blocked.down || b.touching.down;
    const tGround = tb.blocked.down || tb.touching.down;
    const offstage = Math.abs(s.x - cx) > half - 4 || s.y > L.baseY + 6;
    const press = () => {
      // un appui d'esquive = un front montant : on relâche une image sur deux
      i.block = !bot.botBlockPrev;
    };
    bot.botBlockPrev = false;

    // ballon de handball : on maintient le temps voulu
    if (bot.atk && bot.atk.charging) {
      i.hold = now - bot.atk.start < (bot.botCharge || 400);
      return i;
    }
    // accroché au rebord : on attend un peu, puis on remonte, on saute, on attaque ou on roule
    if (bot.ledgeSide) {
      if (bot.botLedgeAt !== bot.ledgeAt) {
        bot.botLedgeAt = bot.ledgeAt;
        bot.botLedgeWait = lv.react * 0.6 + Math.random() * 500;
        bot.botLedgeHow = Math.random();
      }
      if (now - bot.ledgeAt > bot.botLedgeWait) {
        const h = bot.botLedgeHow;
        if (h < 0.45) i.sx = -bot.ledgeSide;
        else if (h < 0.7) i.jump = true;
        else if (h < 0.85) i.attack = true;
        else press();
      }
      bot.botBlockPrev = i.block;
      return i;
    }
    // éjecté : influence directionnelle vers le terrain, et sortie d'éjection quand ça devient dangereux
    if (now < bot.stunUntil) {
      if (Math.random() < lv.di) {
        i.sx = Math.sign(cx - s.x) || 0;
        i.sy = -0.5;
      }
      const fast = hyp(b.velocity.x, b.velocity.y) > 700;
      if (fast && now - bot.stunStart >= STUN_ESCAPE && !bot.airDodged && Math.random() < lv.escape * 0.2) press();
      bot.botBlockPrev = i.block;
      return i;
    }
    // enchaînement (jab x3 de Toro, griffes de Nini) : on rappuie pendant le coup
    if (bot.atk && bot.atk.chainKey && now >= bot.atk.hitAt && bot.atk.chainIdx < bot.def.moves[bot.atk.chainKey].chain.length) {
      if (bot.botChainFor !== bot.atk.id) {
        bot.botChainFor = bot.atk.id;
        bot.botChainGo = Math.random() < lv.acc;
      }
      if (bot.botChainGo) {
        i.attack = true;
        return i;
      }
    }
    // hors du terrain : on revient
    if (offstage && !grounded) {
      this.botRecover(bot, i, now, lv);
      bot.botBlockPrev = i.block;
      return i;
    }

    // --- défense : esquiver ce qu'on a vu venir (après le temps de réaction)
    const ta = tgt.atk;
    if (ta && ta.id !== bot.botSeenAtk && now - ta.start >= lv.react && !ta.charging) {
      bot.botSeenAtk = ta.id;
      const m = ta.m;
      const reach = (m.ox || 0) + (m.w || 0) / 2 + 40;
      const coming = now < ta.hitAt + (m.active || 0) && (m.type === 'melee' || m.type === 'grab') && adx < reach + 30 && Math.abs(dy) < 140;
      if (coming && Math.random() < lv.dodge && now >= bot.dodgeCd && !bot.atk) {
        const r = Math.random();
        if (r < 0.5) i.sx = 0;
        else i.sx = r < 0.8 ? -dir : dir;
        press();
        bot.botBlockPrev = i.block;
        return i;
      }
      // punition : le coup adverse va rater et sa fin est longue
      if (!coming && m.type !== 'proj' && adx < 170 && Math.random() < lv.punish) bot.botPunish = ta.id;
    }
    for (const p of this.projs) {
      if (p.dead || p.owner !== tgt || p.id === bot.botSeenProj) continue;
      const pdx = s.x - p.x;
      const approaching = Math.sign(p.vx || 0) === Math.sign(pdx) || (p.spec.kind === 'book' && Math.abs(pdx) < 110);
      if (approaching && Math.abs(pdx) < 220 && Math.abs(p.y - s.y) < 120 && now - p.born >= lv.react * 0.5) {
        bot.botSeenProj = p.id;
        const cm = bot.def.moves.nSig;
        if (cm && cm.type === 'catch' && grounded && !bot.atk && now > bot.cdUntil && Math.random() < lv.dodge * 0.7) {
          i.sx = dir * 0.35;
          i.heavy = true;
          return i;
        }
        if (Math.random() < lv.dodge) {
          if (grounded && Math.random() < 0.5 && bot.jumps > 0) i.jump = true;
          else press();
          bot.botBlockPrev = i.block;
          return i;
        }
      }
    }
    // punir un coup raté (pendant sa fin)
    if (ta && bot.botPunish === ta.id && now >= ta.hitAt + (ta.m.active || 0) && !bot.atk) {
      bot.botPunish = 0;
      const opts = (BOT_MOVES[bot.char] || []).filter((o) => o.air === !grounded && adx >= o.dx[0] - 30 && adx <= o.dx[1] + 20 && !o.heal && !o.charge);
      if (opts.length) return this.botUse(bot, i, opts[0], dir, lv);
    }

    // --- déplacement : distance préférée, sans tomber du terrain
    const pref = BOT_PREF[bot.char] || 90;
    const tOff = Math.abs(ts.x - cx) > half || ts.y > L.baseY + 10;
    if (tOff) {
      // l'adversaire est dehors : on se place près du bord pour le gêner
      const ex = cx + Math.sign(ts.x - cx) * (half - 50);
      if (Math.abs(ex - s.x) > 20) i.sx = Math.sign(ex - s.x) * 0.9;
    } else if (adx > pref + 40) i.sx = dir * 0.9;
    else if (adx < pref - 40) i.sx = -dir * 0.7;
    if (Math.abs(s.x + i.sx * 60 - cx) > half - 30 && !tOff) i.sx = 0; // pas de chute volontaire
    // monter sur une plateforme / en descendre
    if (dy < -110 && grounded && adx < 260 && Math.random() < 0.025 * aggr) i.jump = true;
    if (dy > 110 && grounded && s.y < L.baseY - 60 && adx < 200 && Math.random() < 0.5) {
      i.sy = 1;
      i.sx = 0;
    }

    // l'adversaire est charmé : on en profite avec un coup fort
    if (tgt.charmUntil > now && !bot.atk && now > bot.cdUntil && adx < 200) {
      const o = grounded ? { k: adx < 90 ? 'nSig' : 'sSig' } : { k: 'sAir', air: true };
      return this.botUse(bot, i, o, dir, { acc: 1 });
    }
    // combo : l'adversaire est sonné juste au-dessus -> on saute et on enchaîne en l'air
    if (now < tgt.stunUntil && adx < 120 && !bot.atk && now > bot.cdUntil && Math.random() < lv.acc) {
      if (grounded && dy < -40 && dy > -260 && bot.jumps > 0) {
        i.jump = true;
        i.sx = dir * 0.5;
        return i;
      }
      if (!grounded && Math.abs(dy) < 90) {
        const k = adx > 60 ? 'sAir' : 'nAir';
        if (this.botReady(bot, { k }, grounded, now)) return this.botUse(bot, i, { k, air: true }, dir, lv);
      }
    }
    // --- attaque
    if (!bot.atk && now > bot.cdUntil) {
      const opts = (BOT_MOVES[bot.char] || []).filter(
        (o) =>
          o.air === !grounded &&
          adx >= o.dx[0] && adx <= o.dx[1] &&
          dy >= o.dy[0] && dy <= o.dy[1] &&
          (!o.tgtGround || tGround) &&
          (!o.heal || bot.damage > 35) &&
          this.botReady(bot, o, grounded, now)
      );
      if (opts.length && Math.random() < 0.055 * aggr) {
        let tot = opts.reduce((a, o) => a + o.w, 0), r = Math.random() * tot, pick = opts[0];
        for (const o of opts) {
          r -= o.w;
          if (r <= 0) { pick = o; break; }
        }
        return this.botUse(bot, i, pick, dir, lv);
      }
    }
    bot.botBlockPrev = i.block;
    return i;
  },

  // le coup est-il disponible (recharge, objets déjà à l'écran) ?
  botReady(bot, o, grounded, now) {
    const mv = bot.def.moves;
    const key = o.k;
    const m = mv[key];
    if (!m) return false;
    if ((m.cd || m.cooldown) && now < (bot.moveCd[m.cdKey || key] || 0)) return false;
    if (m.max && m.proj && !m.replace && this.projs.filter((p) => !p.dead && p.owner === bot && p.spec.kind === m.proj.kind && p.spec.tex === m.proj.tex).length >= m.max) return false;
    return true;
  },

  botUse(bot, i, o, dir, lv) {
    let k = o.k;
    // erreur de précision : mauvais coup de temps en temps
    if (Math.random() > lv.acc) k = (o.air ? ['nAir', 'sAir', 'dAir'] : ['nLight', 'sLight', 'dLight', 'nSig'])[Math.floor(Math.random() * (o.air ? 3 : 4))];
    const heavy = !!BOT_HEAVY[k];
    i.attack = !heavy;
    i.heavy = heavy;
    i.sy = 0;
    const a = k[0] === 'n' || k === 'rec' ? 'n' : k[0] === 's' ? 's' : 'd';
    // neutre/bas : un léger mouvement vers la cible pour se tourner vers elle (sans en faire un coup de côté)
    i.sx = a === 's' ? dir : dir * 0.35;
    if (a === 'd' || k === 'gp') i.sy = 1;
    if (o.charge) bot.botCharge = 200 + Math.random() * 800;
    bot.botBlockPrev = false;
    return i;
  },

  botRecover(bot, i, now, lv) {
    const s = bot.sprite, b = s.body;
    const cx = this.W / 2, half = L.mainW / 2;
    const side = Math.sign(s.x - cx) || 1;
    const edgeX = cx + side * half;
    const out = (s.x - edgeX) * side; // distance hors du terrain
    const below = s.y > L.baseY - 30;
    i.sx = -side;
    // Grom : grappin vers le bord quand il est assez près
    if (bot.char === 'grom' && !bot.atk && out < 330 && Math.abs(s.y - L.baseY) < 110 && now > bot.cdUntil && Math.random() < 0.3) {
      i.attack = true; // grappin (léger + côté en l'air), vers le terrain
      i.sx = -side;
      i.sy = 0;
      return;
    }
    // AdieuLescure : CTRL+Z pour revenir là où il était (s'il était plus près du terrain)
    if (bot.def.rewind && !bot.atk && now > bot.cdUntil && now >= (bot.moveCd.ctrlz || 0) && bot.zn >= 6) {
      const j = bot.zn < 10 ? 0 : bot.zi || 0;
      const back = (bot['zx' + j] - edgeX) * side;
      if (back < out - 120 && Math.random() < 0.3 * lv.escape + 0.1) {
        i.heavy = true; // LOURD + bas en l'air = CTRL+Z
        i.sy = 1;
        i.sx = 0;
        return;
      }
    }
    if (b.velocity.y > -80) {
      if (bot.jumps > 0 && now - bot.lastJump > 220 && (below || out > 160)) i.jump = true;
      else if (bot.jumps === 0 && !bot.recUsed && (s.y > L.baseY - 60 || out > 140)) {
        // coup de retour (LOURD en l'air), en visant le terrain
        i.heavy = true;
        i.sy = -1;
        i.sx = -side * 0.6;
      } else if (bot.jumps === 0 && bot.recUsed && !bot.airDodged && s.y > L.baseY + 20 && out < 260 && Math.random() < lv.escape) {
        i.block = !bot.botBlockPrev;
        i.sx = -side;
        i.sy = -0.8;
      }
    }
  },

  // Mannequin du mode entraînement
  dummyInput(pl, other, now) {
    const i = { sx: 0, sy: 0, jump: false, attack: false, hold: false, block: false };
    const mode = this.dummyMode || 0;
    if (mode === 1) {
      // saute régulièrement
      if ((pl.sprite.body.blocked.down || pl.sprite.body.touching.down) && Math.floor(now / 900) !== pl.dumJump) {
        pl.dumJump = Math.floor(now / 900);
        i.jump = true;
      }
    } else if (mode === 2) {
      // esquive dès qu'une attaque part
      const a = other.atk;
      if (a && a.id !== pl.dumSeen && now - a.start > 60) {
        pl.dumSeen = a.id;
        i.block = true;
      }
    } else if (mode === 3) return this.botInput(pl, other, now);
    // revient au centre s'il est poussé hors du terrain
    const cx = this.W / 2;
    if (Math.abs(pl.sprite.x - cx) > L.mainW / 2 - 10 || pl.sprite.y > L.baseY + 6) this.botRecover(pl, i, now, BOT_LV[2]);
    return i;
  },
});
