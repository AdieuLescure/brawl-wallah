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
    { d: 'neutral', air: false, dx: [0, 90], dy: [-60, 50], w: 4 },
    { d: 'forward', air: false, dx: [50, 150], dy: [-50, 50], w: 2 },
    { d: 'up', air: false, dx: [0, 80], dy: [-170, -20], w: 2 },
    { d: 'down', air: false, dx: [30, 140], dy: [-20, 60], w: 1.5 },
    { d: 'back', air: false, dx: [40, 150], dy: [-40, 40], w: 1 },
    { d: 'neutral', air: true, dx: [0, 90], dy: [-70, 70], w: 3 },
    { d: 'forward', air: true, dx: [40, 160], dy: [-60, 60], w: 2 },
    { d: 'down', air: true, dx: [0, 60], dy: [30, 160], w: 2 },
  ],
  astra: [
    { d: 'neutral', air: false, dx: [140, 600], dy: [-60, 60], w: 4 },
    { d: 'forward', air: false, dx: [200, 650], dy: [-60, 60], w: 1.5 },
    { d: 'up', air: false, dx: [60, 320], dy: [-260, -60], w: 2 },
    { d: 'down', air: false, dx: [40, 230], dy: [-20, 60], w: 1 },
    { d: 'back', air: false, dx: [0, 160], dy: [-60, 60], w: 3 },
    { d: 'neutral', air: true, dx: [0, 90], dy: [-70, 70], w: 3 },
    { d: 'forward', air: true, dx: [200, 650], dy: [-80, 80], w: 1 },
    { d: 'down', air: true, dx: [60, 300], dy: [40, 320], w: 2 },
  ],
  grom: [
    { d: 'neutral', air: false, dx: [0, 95], dy: [-60, 50], w: 3 },
    { d: 'forward', air: false, dx: [0, 85], dy: [-50, 40], w: 3, grab: true },
    { d: 'up', air: false, dx: [0, 90], dy: [-180, -20], w: 2 },
    { d: 'down', air: false, dx: [0, 120], dy: [-20, 40], w: 1.5, tgtGround: true },
    { d: 'back', air: false, dx: [180, 420], dy: [-50, 50], w: 1, hook: true },
    { d: 'neutral', air: true, dx: [0, 100], dy: [-70, 70], w: 3 },
    { d: 'forward', air: true, dx: [30, 120], dy: [-20, 120], w: 2 },
    { d: 'down', air: true, dx: [0, 60], dy: [30, 160], w: 2 },
  ],
  deadlulu: [
    { d: 'neutral', air: false, dx: [0, 95], dy: [-60, 50], w: 4 },
    { d: 'forward', air: false, dx: [50, 150], dy: [-60, 50], w: 2 },
    { d: 'up', air: false, dx: [0, 80], dy: [-180, -20], w: 2 },
    { d: 'down', air: false, dx: [180, 320], dy: [-40, 60], w: 1.5, tgtGround: true },
    { d: 'neutral', air: true, dx: [0, 100], dy: [-70, 70], w: 3 },
    { d: 'forward', air: true, dx: [30, 140], dy: [-60, 60], w: 2 },
    { d: 'down', air: true, dx: [0, 60], dy: [30, 160], w: 1.5 },
  ],
  denodoom: [
    { d: 'neutral', air: false, dx: [40, 260], dy: [-50, 50], w: 3 },
    { d: 'forward', air: false, dx: [30, 140], dy: [-50, 50], w: 3 },
    { d: 'up', air: false, dx: [0, 120], dy: [-320, -60], w: 2 },
    { d: 'down', air: false, dx: [90, 170], dy: [-40, 60], w: 1.5, tgtGround: true },
    { d: 'back', air: false, dx: [250, 620], dy: [-50, 50], w: 1, charge: true },
    { d: 'neutral', air: true, dx: [0, 100], dy: [-70, 70], w: 3 },
    { d: 'forward', air: true, dx: [30, 140], dy: [-60, 60], w: 2 },
    { d: 'down', air: true, dx: [0, 60], dy: [30, 160], w: 1.5 },
  ],
  nini: [
    { d: 'neutral', air: false, dx: [0, 95], dy: [-60, 50], w: 4 },
    { d: 'forward', air: false, dx: [40, 650], dy: [-30, 60], w: 2.5 },
    { d: 'down', air: false, dx: [120, 560], dy: [-40, 60], w: 1.2, tgtGround: true },
    { d: 'up', air: false, dx: [0, 80], dy: [-180, -20], w: 2 },
    { d: 'back', air: false, dx: [320, 900], dy: [-300, 300], w: 1, heal: true },
    { d: 'neutral', air: true, dx: [0, 90], dy: [-70, 70], w: 3 },
    { d: 'forward', air: true, dx: [30, 130], dy: [-60, 60], w: 2 },
  ],
};
const BOT_PREF = { toro: 70, astra: 330, grom: 60, deadlulu: 80, denodoom: 160, nini: 90 };

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
      const o = grounded ? { d: adx < 90 ? 'neutral' : 'forward' } : { d: 'forward' };
      return this.botUse(bot, i, o, dir, { acc: 1 });
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
    let key = o.d;
    if (!grounded) {
      const ak = { neutral: 'nAir', forward: 'fwdAir', back: 'bAir', up: 'upAir', down: 'downAir' }[o.d];
      if (mv[ak]) key = ak;
    }
    const m = mv[key];
    if (!m) return false;
    if ((m.cd || m.cooldown) && now < (bot.moveCd[m.cdKey || key] || 0)) return false;
    if (m.max && m.proj && !m.replace && this.projs.filter((p) => !p.dead && p.owner === bot && p.spec.kind === m.proj.kind && p.spec.tex === m.proj.tex).length >= m.max) return false;
    return true;
  },

  botUse(bot, i, o, dir, lv) {
    i.attack = true;
    i.sx = 0;
    i.sy = 0;
    let d = o.d;
    // erreur de précision : mauvais coup de temps en temps
    if (Math.random() > lv.acc) d = ['neutral', 'forward', 'down', 'up'][Math.floor(Math.random() * 4)];
    if (d === 'forward') i.sx = dir;
    else if (d === 'back') i.sx = -dir;
    else if (d === 'up') i.sy = -1;
    else if (d === 'down') i.sy = 1;
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
      i.attack = true;
      i.sx = -bot.facing;
      i.sy = 0;
      return;
    }
    if (b.velocity.y > -80) {
      if (bot.jumps > 0 && now - bot.lastJump > 220 && (below || out > 160)) i.jump = true;
      else if (bot.jumps === 0 && !bot.recUsed && (s.y > L.baseY - 60 || out > 140)) {
        // coup de retour (HAUT en l'air), en visant le terrain
        i.attack = true;
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
