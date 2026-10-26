// ===========================================================================
// BOTS : jouent avec les mêmes règles que le joueur.
// Le niveau règle le temps de réaction, la précision et les choix (jamais de bonus de dégâts).
// ===========================================================================
const BOT_LV = [
  { react: 430, acc: 0.6, aggr: 0.65, dodge: 0.3, punish: 0.35, di: 0.3, escape: 0.2 }, // facile
  { react: 270, acc: 0.8, aggr: 1.0, dodge: 0.5, punish: 0.65, di: 0.7, escape: 0.5 }, // moyen
  { react: 170, acc: 0.92, aggr: 1.25, dodge: 0.7, punish: 0.85, di: 0.95, escape: 0.85 }, // difficile
];

// Coups utilisés par chaque bot : [clé, [dx min, max] (distance horizontale à la cible), [dy min, max] (cible - bot,
// négatif = cible au-dessus), poids du choix, options]. Options : any (au sol comme en l'air), tgtGround (cible au sol),
// grab, charge (ballon), heatMin (CHAUFFE minimale), counter (contre : utilisé en défense)
const BOT_MOVES = {
  // COUP = la famille d'arme (mêmes coups pour la famille) ; SPÉCIAL : nS, sS (avant), uS, dS, dAS (plongeon)
  toro: [
    ['nL', [0, 90], [-60, 50], 4], ['sL', [50, 160], [-50, 50], 2.5], ['uL', [0, 90], [-170, -20], 2], ['dL', [0, 110], [-20, 60], 2],
    ['sA', [30, 140], [-60, 60], 3], ['uA', [0, 90], [-160, 10], 2], ['dA', [0, 60], [30, 160], 1.5],
    ['nS', [40, 150], [-50, 50], 1.4], ['sS', [160, 520], [-60, 60], 1.2, { any: true }], ['dS', [0, 120], [-80, 80], 1.5, { heatMin: 60 }],
    ['uS', [0, 90], [-220, -40], 0.8], ['dAS', [0, 70], [60, 260], 1],
  ],
  grom: [
    ['nL', [0, 90], [-60, 50], 4], ['sL', [50, 160], [-50, 50], 2.5], ['uL', [0, 90], [-170, -20], 2], ['dL', [0, 110], [-20, 60], 2],
    ['sA', [30, 140], [-60, 60], 3], ['uA', [0, 90], [-160, 10], 2], ['dA', [0, 60], [30, 160], 1.5],
    ['nS', [0, 85], [-50, 40], 3, { grab: true }], ['sS', [160, 420], [-60, 60], 1.5, { any: true }], ['dS', [200, 640], [-60, 60], 0.5],
    ['uS', [0, 90], [-220, -40], 0.5], ['dAS', [0, 60], [30, 220], 1.5],
  ],
  deadlulu: [
    ['nL', [0, 120], [-60, 50], 4], ['sL', [60, 190], [-50, 50], 2.5], ['uL', [0, 110], [-170, -20], 2], ['dL', [0, 140], [-20, 60], 2],
    ['sA', [30, 170], [-60, 60], 3], ['uA', [0, 110], [-160, 10], 2], ['dA', [0, 70], [30, 160], 1.5],
    ['nS', [110, 420], [-60, 60], 3, { any: true }], ['sS', [180, 320], [-40, 60], 1.5, { tgtGround: true }],
    ['uS', [0, 90], [-200, -10], 0.8], ['dAS', [0, 60], [60, 260], 1],
  ],
  denodoom: [
    ['nL', [0, 200], [-50, 50], 3], ['sL', [30, 110], [-50, 50], 2.5], ['uL', [0, 120], [-220, -30], 2], ['dL', [0, 220], [-30, 60], 2],
    ['sA', [20, 220], [-60, 60], 3], ['uA', [0, 120], [-220, -20], 2], ['dA', [0, 80], [40, 260], 1.5],
    ['nS', [250, 620], [-50, 50], 1, { charge: true }], ['sS', [40, 180], [-50, 50], 1.5], ['dS', [90, 170], [-40, 60], 1.5, { tgtGround: true }],
    ['uS', [0, 140], [-340, -40], 1.2], ['dAS', [0, 60], [60, 260], 1],
  ],
  adieulescure: [
    ['nL', [0, 90], [-60, 50], 4], ['sL', [50, 160], [-50, 50], 2.5], ['uL', [0, 90], [-170, -20], 2], ['dL', [0, 110], [-20, 60], 2],
    ['sA', [30, 140], [-60, 60], 3], ['uA', [0, 90], [-160, 10], 2], ['dA', [0, 60], [30, 160], 1.5],
    ['sS', [60, 280], [-50, 50], 2], ['uS', [0, 90], [-200, -20], 0.6], ['dAS', [0, 60], [60, 260], 1],
  ],
  bigzinzin: [
    ['nL', [0, 100], [-60, 50], 4], ['sL', [50, 160], [-50, 50], 2.5], ['uL', [0, 90], [-170, -20], 2], ['dL', [0, 110], [-20, 60], 2],
    ['sA', [30, 140], [-60, 60], 3], ['uA', [0, 90], [-160, 10], 2], ['dA', [0, 60], [30, 160], 1.5],
    ['nS', [0, 80], [-220, -20], 1.5], ['sS', [140, 520], [-60, 60], 2, { any: true }], ['dS', [60, 200], [-20, 60], 1, { tgtGround: true }],
    ['uS', [0, 140], [-80, 80], 0.4], ['dAS', [0, 60], [60, 260], 1],
  ],
  ln4: [
    ['nL', [0, 120], [-60, 50], 4], ['sL', [60, 190], [-50, 50], 2.5], ['uL', [0, 110], [-170, -20], 2], ['dL', [0, 140], [-20, 60], 2],
    ['sA', [30, 170], [-60, 60], 3], ['uA', [0, 110], [-160, 10], 2], ['dA', [0, 70], [30, 160], 1.5],
    ['nS', [160, 560], [-60, 60], 2, { any: true }], ['sS', [80, 320], [-50, 50], 2], ['dS', [380, 900], [-200, 200], 0.4],
    ['uS', [0, 100], [-220, -20], 0.6], ['dAS', [0, 60], [60, 260], 1],
  ],
  natanax: [
    ['nL', [0, 100], [-60, 50], 4], ['sL', [50, 160], [-50, 50], 2.5], ['uL', [0, 90], [-170, -20], 2], ['dL', [0, 110], [-20, 60], 2],
    ['sA', [30, 140], [-60, 60], 3], ['uA', [0, 90], [-160, 10], 2], ['dA', [0, 60], [30, 160], 1.5],
    ['nS', [0, 120], [-40, 60], 1.2], ['sS', [120, 380], [-60, 60], 2, { any: true }], ['dS', [0, 150], [-40, 60], 1, { tgtGround: true }],
    ['uS', [0, 100], [-220, -20], 0.6], ['dAS', [0, 60], [60, 260], 1],
  ],
  kylian: [
    ['nL', [0, 90], [-60, 50], 4], ['sL', [50, 160], [-50, 50], 2.5], ['uL', [0, 90], [-170, -20], 2], ['dL', [0, 110], [-20, 60], 2],
    ['sA', [30, 140], [-60, 60], 3], ['uA', [0, 90], [-160, 10], 2], ['dA', [0, 60], [30, 160], 1.5],
    ['nS', [20, 130], [-40, 50], 1.4], ['sS', [140, 520], [-60, 60], 2, { any: true }], ['dS', [90, 170], [-40, 60], 1.2, { tgtGround: true }],
    ['uS', [0, 90], [-220, -20], 0.6], ['dAS', [0, 70], [60, 260], 1],
  ],
  astra: [
    ['nL', [0, 80], [-60, 50], 2], ['sL', [60, 190], [-40, 40], 3], ['uL', [0, 90], [-170, -20], 2], ['dL', [0, 110], [-20, 60], 1.5],
    ['sH', [200, 650], [-60, 60], 1.5], ['uH', [60, 320], [-260, -60], 2], ['dH', [0, 110], [-60, 60], 2],
    ['sA', [30, 150], [-60, 60], 2], ['uA', [0, 90], [-160, 10], 2], ['dA', [0, 60], [30, 160], 1.5],
    ['nS', [160, 620], [-60, 60], 4, { any: true }], ['dS', [40, 260], [-20, 60], 1, { tgtGround: true }],
  ],
  nini: [
    ['nL', [0, 90], [-60, 50], 4], ['sL', [50, 160], [-50, 50], 2], ['uL', [0, 90], [-170, -20], 2], ['dL', [0, 110], [-20, 60], 2],
    ['sH', [50, 170], [-50, 50], 2], ['uH', [0, 90], [-200, -20], 2], ['dH', [30, 140], [-40, 50], 1.2],
    ['sA', [30, 140], [-60, 60], 3], ['uA', [0, 90], [-160, 10], 2], ['dA', [0, 60], [30, 160], 1.5], ['dAH', [0, 80], [40, 260], 1],
    ['nS', [160, 520], [-60, 60], 1.2, { tgtGround: true }], ['dS', [160, 600], [-40, 60], 1.2, { tgtGround: true }],
  ],
};
const BOT_AIR = { sA: 1, uA: 1, dA: 1, uAH: 1, dAH: 1, dAS: 1 };
const BOT_KIND = { sH: 'H', uH: 'H', dH: 'H', uAH: 'H', dAH: 'H', nS: 'S', sS: 'S', uS: 'S', dS: 'S', dAS: 'S', uSA: 'S' };
for (const id in BOT_MOVES)
  BOT_MOVES[id] = BOT_MOVES[id].map(([k, dx, dy, w, ex]) => Object.assign({ k, dx, dy, w, air: !!BOT_AIR[k], kind: BOT_KIND[k] || 'L' }, ex || {}));
const BOT_PREF = { toro: 70, astra: 330, grom: 60, deadlulu: 200, denodoom: 160, nini: 90, adieulescure: 90, bigzinzin: 120, ln4: 120, natanax: 110, kylian: 110 };
// le coup peut-il servir dans cette situation (au sol / en l'air) ?
const botFits = (o, grounded) => o.any || o.air === !grounded;

Object.assign(GameScene.prototype, {
  botInput(bot, tgt, now) {
    const i = { sx: 0, sy: 0, jump: false, attack: false, heavy: false, special: false, hold: false, block: false };
    if (bot.stocks <= 0 || tgt.stocks <= 0) return i;
    if (this.nxBot) { const nx = this.nxBot(bot, tgt, now); if (nx) return nx; } // NATANAX : le TABLEAU
    const lv = BOT_LV[bot.lvl === undefined ? 1 : bot.lvl];
    const aggr = lv.aggr * (bot.aggr || 1);
    const s = bot.sprite, b = s.body, ts = tgt.sprite, tb = ts.body;
    // adversaire invisible (DOUBLURE) : le bot ne voit que la silhouette de billets
    const dcy = now < (tgt.invisUntil || 0) && this.projs.find((q) => !q.dead && q.id === tgt.decoyId);
    const tx = dcy ? dcy.x : ts.x, ty = dcy ? dcy.y : ts.y;
    const dx = tx - s.x, dy = ty - s.y, adx = Math.abs(dx), dir = Math.sign(dx) || 1;
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
    // lourd chargé : on garde LOURD appuyé un moment
    if (bot.atk && bot.atk.m.chargeMax && now < (bot.botHoldUntil || 0) && bot.atk.start >= (bot.botHoldFrom || 0)) {
      i.hold = true;
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
        if (h < 0.45) i.sx = -Math.sign(bot.ledgeSide);
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
        i.sx = dir * 0.3; // sans direction (sinon ce serait un autre coup)
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
      // contre (OBJECTION !, CONTRÔLE) : en bas + SPÉCIAL
      const ctr = bot.def.moves.dS;
      if (coming && ctr && (ctr.type === 'counter' || ctr.type === 'catch') && !bot.atk && now > bot.cdUntil && this.botReady(bot, { k: 'dS' }, grounded, now) && Math.random() < lv.dodge * 0.35) {
        i.special = true;
        i.sy = 1;
        i.sx = dir * 0.3;
        return i;
      }
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
        const cm = bot.def.moves.dS;
        if (cm && cm.type === 'catch' && !bot.atk && now > bot.cdUntil && this.botReady(bot, { k: 'dS' }, grounded, now) && Math.random() < lv.dodge * 0.7) {
          i.sx = dir * 0.3;
          i.sy = 1;
          i.special = true;
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
      const opts = (BOT_MOVES[bot.char] || []).filter((o) => botFits(o, grounded) && adx >= o.dx[0] - 30 && adx <= o.dx[1] + 20 && !o.charge && o.kind !== 'S');
      if (opts.length) return this.botUse(bot, i, opts[0], dir, lv);
    }

    // --- déplacement : distance préférée, sans tomber du terrain
    const pref = BOT_PREF[bot.char] || 90;
    const tOff = Math.abs(tx - cx) > half || ty > L.baseY + 10;
    if (tOff) {
      // l'adversaire est dehors : on se place près du bord pour le gêner
      const ex = cx + Math.sign(tx - cx) * (half - 50);
      if (Math.abs(ex - s.x) > 20) i.sx = Math.sign(ex - s.x) * 0.9;
    } else if (adx > pref + 40) i.sx = dir * 0.9;
    else if (adx < pref - 40) i.sx = -dir * 0.7;
    if (Math.abs(s.x + i.sx * 60 - cx) > half - 30 && !tOff) i.sx = 0; // pas de chute volontaire
    // monter sur une plateforme / en descendre
    if (dy < -110 && grounded && adx < 260 && Math.random() < 0.025 * aggr) i.jump = true;
    // CÉRÉMONIE : bloqué contre un mur (le pupitre, un balcon) -> on saute par dessus
    if (this.stageId === 'gala' && grounded && bot.jumps > 0 && ((b.blocked.left && i.sx < -0.2) || (b.blocked.right && i.sx > 0.2))) i.jump = true;
    // CÉRÉMONIE : balcons plus hauts qu'un saut -> en l'air, on relance un saut pour rejoindre la cible
    if (this.stageId === 'gala' && GALA.botClimb !== false && !grounded && !bot.atk && dy < -90 && adx < 240 && bot.jumps > 0 && s.body.velocity.y > -150 && now - bot.lastJump > 200 && Math.random() < 0.25) {
      i.jump = true;
      i.sx = dir * 0.6;
    }
    if (dy > 110 && grounded && s.y < L.baseY - 60 && adx < 200 && Math.random() < 0.5) {
      i.sy = 1;
      i.sx = 0;
    }

    // l'adversaire est charmé : on en profite avec un coup fort
    if (tgt.charmUntil > now && !bot.atk && now > bot.cdUntil && adx < 200) {
      const o = grounded ? { k: adx < 90 ? 'uL' : 'sL', kind: 'L' } : { k: 'sA', air: true, kind: 'L' };
      return this.botUse(bot, i, o, dir, { acc: 1 });
    }
    // combo : un léger vient de toucher -> on finit par un lourd (coupe le léger)
    // combo : un léger vient de toucher -> on le coupe : léger bas (pour jongler), lourd ou spéciale pour finir
    if (bot.atk && bot.atk.landed && bot.atk.m.light && now >= bot.atk.landed + 40 && (bot.atk.cancels || 0) < 2 && bot.botCancelFor !== bot.atk.id) {
      bot.botCancelFor = bot.atk.id;
      if (Math.random() < lv.acc * 0.6) {
        const r = Math.random();
        let k;
        if (!grounded) k = dy < -40 ? 'uA' : 'sA';
        else if (r < 0.3 && bot.atk.key !== 'dL') k = 'dL';
        else if (r < 0.75) k = dy < -60 ? 'uL' : 'sS';
        else k = 'nS';
        const o = { k, air: !grounded, kind: BOT_KIND[k] || 'L', any: true };
        if (k !== bot.atk.key && bot.def.moves[k] && this.botReady(bot, o, grounded, now)) return this.botUse(bot, i, o, dir, { acc: 1 });
      }
    }
    // combo : l'adversaire est sonné juste au-dessus -> on saute et on enchaîne en l'air
    if (now < tgt.stunUntil && adx < 120 && !bot.atk && now > bot.cdUntil && Math.random() < lv.acc) {
      if (grounded && dy < -40 && dy > -260 && bot.jumps > 0) {
        i.jump = true;
        i.sx = dir * 0.5;
        return i;
      }
      if (!grounded && Math.abs(dy) < 90) {
        const k = adx > 60 ? 'sA' : 'uA';
        if (this.botReady(bot, { k }, grounded, now)) return this.botUse(bot, i, { k, air: true, kind: 'L' }, dir, lv);
      }
    }
    // --- attaque
    if (!bot.atk && now > bot.cdUntil) {
      const opts = (BOT_MOVES[bot.char] || []).filter(
        (o) =>
          botFits(o, grounded) &&
          adx >= o.dx[0] && adx <= o.dx[1] &&
          dy >= o.dy[0] && dy <= o.dy[1] &&
          (!o.tgtGround || tGround) &&
          (!o.heatMin || (bot.heat || 0) >= o.heatMin) &&
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
    if (m.type === 'burst' && (bot.heat || 0) < (m.minHeat || 25)) return false;
    if (!grounded && m.onceAir && bot[m.onceAir + 'Used']) return false;
    if (!grounded && m.helpless && bot.recUsed) return false;
    if (m.max && m.proj && !m.replace && this.projs.filter((p) => !p.dead && p.owner === bot && p.spec.kind === m.proj.kind && p.spec.tex === m.proj.tex).length >= m.max) return false;
    return true;
  },

  botUse(bot, i, o, dir, lv) {
    let k = o.k;
    let kind = o.kind || BOT_KIND[k] || 'L';
    // erreur de précision : mauvais coup de temps en temps
    if (Math.random() > lv.acc) {
      k = (o.air ? ['uA', 'sA', 'dA'] : ['nL', 'sL', 'uL', 'dL'])[Math.floor(Math.random() * (o.air ? 3 : 4))];
      kind = BOT_KIND[k] || 'L';
    }
    i.attack = kind === 'L';
    i.heavy = false;
    i.special = kind === 'S';
    i.sy = 0;
    const a = k[0];
    // neutre : on effleure le joystick vers la cible (pour se tourner) sans sortir de la zone morte
    i.sx = a === 's' ? dir : dir * 0.3;
    if (a === 'd') i.sy = 1;
    if (a === 'u') i.sy = -1;
    if (o.charge) bot.botCharge = 200 + Math.random() * 800;
    // lourd : on le charge parfois
    const m = bot.def.moves[k];
    if (m && m.chargeMax && Math.random() < 0.45) {
      bot.botHoldUntil = this.simNow + m.startup + 60 + Math.random() * 420;
      bot.botHoldFrom = this.simNow;
      i.hold = true;
    }
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
    if (bot.char === 'grom' && !bot.atk && this.botReady(bot, { k: 'sS' }, false, now) && out < 330 && Math.abs(s.y - L.baseY) < 110 && now > bot.cdUntil && Math.random() < 0.3) {
      i.special = true; // GRAPPIN (spéciale), vers le terrain
      i.sx = -side;
      i.sy = 0;
      return;
    }
    if (b.velocity.y > -80) {
      if (bot.jumps > 0 && now - bot.lastJump > 220 && (below || out > 160)) i.jump = true;
      else if (bot.jumps === 0 && (s.y > L.baseY - 60 || out > 140) && this.botRecoverSpecial(bot, i, now, side)) {
        // SPÉCIAL haut (remonter) ou spéciale de côté qui donne de l'élan, en visant le terrain
      } else if (bot.jumps === 0 && !bot.airDodged && s.y > L.baseY + 20 && out < 260 && Math.random() < lv.escape) {
        i.block = !bot.botBlockPrev;
        i.sx = -side;
        i.sy = -0.8;
      }
    }
  },

  // spéciale de retour : haut si elle fait monter (ou CTRL+Z), sinon la spéciale de côté si elle donne de l'élan
  botRecoverSpecial(bot, i, now, side) {
    if (bot.atk || now <= bot.cdUntil) return false;
    for (const k0 of ['uS', 'sS']) {
      const k = bot.def.moves[k0 + 'A'] ? k0 + 'A' : k0; // en l'air : la version aérienne si elle existe
      const m = bot.def.moves[k];
      if (!m) continue;
      const mobile = m.rise || m.type === 'blink' || m.type === 'vanish' || m.type === 'float' || m.type === 'carry' || (k0 === 'sS' && (m.dashV || m.lunge));
      if (!mobile || !this.botReady(bot, { k }, false, now)) continue;
      i.special = true;
      i.sy = k0 === 'uS' ? -1 : 0;
      i.sx = k0 === 'sS' ? -side : -side * 0.3;
      return true;
    }
    return false;
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
