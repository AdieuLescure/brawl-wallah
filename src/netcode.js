// ===========================================================================
// NETCODE : rollback (type GGPO) pour le duel en ligne 1v1
//  - snapshot()/restore() : état complet du combat, restauré à l'identique
//  - netStep() : prédit l'adversaire, corrige et rejoue les images quand son vrai input arrive
//  - pendant un rejeu, aucun effet visuel (sinon on verrait chaque coup en double)
// ===========================================================================
const NET_DELAY = 2; // images de retard volontaire sur MES commandes (≈ 33 ms) : rend les prédictions presque toujours justes
const NET_MAX_PRED = 9; // on attend l'adversaire au-delà de 9 images prédites (≈ 150 ms)
const NET_KEEP = 40;

// Objet « neutre » : accepte n'importe quel appel et ne dessine rien (utilisé pendant les rejeux)
const NULLOBJ = new Proxy(function () {}, {
  get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : k === 'then' ? undefined : NULLOBJ),
  apply: () => NULLOBJ,
  set: () => true,
});

// Etat d'un joueur : tous ses champs simples (nombres, booléens, textes) sont sauvegardés, sauf ceux-ci
const P_SKIP = new Set(['char', 'def', 'sprite', 'tag', 'human', 'hud', 'umb', 'chgBg', 'chgFg', 'chgRing', 'carryImg', 'atk', 'grab', 'moveCd', 'i', 'shade', 'lvl', 'aggr', 'dmgMul', 'spdMul', 'flashUntil', 'lastHeart', 'lastAura', 'charmFx']);
const plainVal = (v) => v === null || typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string';

// --- entrées : 1 entier par image (sx, sy sur 8 bits, + 4 boutons) -> identique des deux côtés
function packInput(i) {
  const q = (v) => Math.max(-127, Math.min(127, Math.round(v * 127))) + 127;
  return q(i.sx || 0) | (q(i.sy || 0) << 8) | (i.jump ? 1 << 16 : 0) | (i.attack ? 1 << 17 : 0) | (i.hold ? 1 << 18 : 0) | (i.block ? 1 << 19 : 0);
}
function unpackInput(v) {
  return { sx: ((v & 255) - 127) / 127, sy: (((v >> 8) & 255) - 127) / 127, jump: !!(v & (1 << 16)), attack: !!(v & (1 << 17)), hold: !!(v & (1 << 18)), block: !!(v & (1 << 19)) };
}
const NEUTRAL_IN = packInput({});
// pour prédire : on garde la direction et les boutons maintenus, jamais les « appuis » ponctuels
const predictFrom = (v) => v & ~((1 << 16) | (1 << 17));

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

Object.assign(GameScene.prototype, {
  // ----- Etat ------------------------------------------------------------
  snapshot() {
    const pls = [this.p1, this.p2].map((pl) => {
      const b = pl.sprite.body;
      const o = {
        sx: pl.sprite.x, sy: pl.sprite.y,
        px: b.position.x, py: b.position.y, ppx: b.prev.x, ppy: b.prev.y, pfx: b.prevFrame.x, pfy: b.prevFrame.y,
        vx: b.velocity.x, vy: b.velocity.y, g: b.allowGravity ? 1 : 0,
        bd: b.blocked.down ? 1 : 0, bu: b.blocked.up ? 1 : 0, td: b.touching.down ? 1 : 0, tn: b.touching.none ? 1 : 0,
        atk: pl.atk ? JSON.parse(JSON.stringify(pl.atk)) : null,
        grab: pl.grab ? { v: pl.grab.victim.i, start: pl.grab.start, slamAt: pl.grab.slamAt, spec: pl.grab.spec } : null,
        moveCd: { ...pl.moveCd },
        f: {},
      };
      for (const k in pl) if (!P_SKIP.has(k) && plainVal(pl[k])) o.f[k] = pl[k];
      return o;
    });
    const projs = this.projs
      .filter((p) => !p.dead)
      .map((p) => ({
        id: p.id, o: p.owner.i, t: p.target.i, spec: p.spec, x: p.x, y: p.y, vx: p.vx, vy: p.vy, born: p.born, armedAt: p.armedAt, lastTrail: p.lastTrail, f: p.f,
        spent: !!p.spent, bounced: !!p.bounced, carry: p.carry ? { ...p.carry } : null, hits: p.hits ? [...p.hits].map((q) => q.i) : null,
      }));
    return JSON.stringify({ pls, projs, timers: this.timers, frame: this.frame, simFrames: this.simFrames, freeze: this.freezeLeft, atkSeq: this.atkSeq, projSeq: this.projSeq, sudden: !!this.sudden });
  },

  restore(str) {
    const S = JSON.parse(str);
    [this.p1, this.p2].forEach((pl, i) => {
      const o = S.pls[i];
      const s = pl.sprite, b = s.body;
      b.stop();
      s.setPosition(o.sx, o.sy);
      b.position.set(o.px, o.py);
      b.prev.set(o.ppx, o.ppy);
      b.prevFrame.set(o.pfx, o.pfy);
      b.updateCenter();
      b.velocity.set(o.vx, o.vy);
      b.allowGravity = !!o.g;
      b.blocked.down = !!o.bd; b.blocked.up = !!o.bu; b.touching.down = !!o.td; b.touching.none = !!o.tn;
      for (const k in pl) if (!P_SKIP.has(k) && plainVal(pl[k]) && !(k in o.f)) pl[k] = undefined;
      Object.assign(pl, o.f);
      pl.atk = o.atk;
      pl.moveCd = { ...o.moveCd };
      pl.grab = o.grab ? { victim: this.pl(o.grab.v), start: o.grab.start, slamAt: o.grab.slamAt, spec: o.grab.spec } : null;
      s.setFlipX(pl.facing < 0);
      if (!pl.grab) s.setAngle(0);
    });
    // projectiles : on garde les sprites existants, on recrée ceux qui manquent
    const live = new Map(this.projs.map((p) => [p.id, p]));
    const keep = new Set();
    this.projs = S.projs.map((d) => {
      let p = live.get(d.id);
      keep.add(d.id);
      const owner = this.pl(d.o), target = this.pl(d.t);
      const fields = { owner, target, spec: d.spec, x: d.x, y: d.y, vx: d.vx, vy: d.vy, born: d.born, armedAt: d.armedAt, lastTrail: d.lastTrail, f: d.f, spent: d.spent, bounced: d.bounced, carry: d.carry, dead: false, hits: d.hits ? new Set(d.hits.map((j) => this.pl(j))) : null };
      if (!p) {
        p = { id: d.id, ...fields, sprite: null };
        p.sprite = this.makeProjSprite(p);
      } else Object.assign(p, fields);
      return p;
    });
    live.forEach((p, id) => {
      if (!keep.has(id) && p.sprite && p.sprite !== NULLOBJ) p.sprite.destroy();
    });
    this.timers = S.timers;
    this.frame = S.frame;
    this.simFrames = S.simFrames;
    this.simNow = S.simFrames * STEP_MS;
    this.nowT = this.simNow;
    this.freezeLeft = S.freeze;
    this.atkSeq = S.atkSeq;
    this.projSeq = S.projSeq;
    this.sudden = !!S.sudden;
  },

  makeProjSprite(p) {
    const sp = p.spec;
    const img = this.add.image(p.x, p.y, sp.tex).setScale(sp.s || 3).setDepth(sp.kind === 'mine' ? 8 : 24);
    if (img === NULLOBJ) return NULLOBJ;
    if (sp.kind === 'hook') img.setAngle(p.f * 90);
    else if (sp.kind === 'eagle') img.setAngle(-90).setDepth(27);
    else if (sp.kind === 'ball') img.setDepth(25);
    else if (sp.kind === 'hermine') img.setOrigin(0.5, 1).setScale(sp.s, sp.s);
    else if (sp.kind === 'corgi') img.setFlipX(p.f < 0);
    else if (sp.kind === 'book') img.setDepth(26).setAngle(-12);
    return img;
  },

  // ----- Rejeu silencieux --------------------------------------------------
  beginResim() {
    if (this.resim) return;
    this.resim = true;
    this._real = { add: this.add, tweens: this.tweens, time: this.time, cameras: this.cameras };
    this.add = NULLOBJ;
    this.tweens = NULLOBJ;
    this.time = NULLOBJ;
    this.cameras = NULLOBJ;
  },
  endResim() {
    if (!this.resim) return;
    Object.assign(this, this._real);
    this.resim = false;
    this.projs.forEach((p) => {
      if (p.sprite === NULLOBJ) p.sprite = this.makeProjSprite(p);
    });
  },

  // ----- Match en ligne ------------------------------------------------------
  // cfg : { me: 0|1, chars: [id0, id1], send(msg) }
  beginNetMatch(cfg) {
    this.clearUi();
    this.state = 'play';
    this.setControls && this.setControls(true);
    const [c0, c1] = cfg.chars;
    this.p1 = this.makePlayer(c0, this.W / 2 - 150, L.baseY - 110, cfg.me === 0);
    this.p2 = this.makePlayer(c1, this.W / 2 + 150, L.baseY - 110, cfg.me === 1);
    if (cfg.names) [this.p1, this.p2].forEach((pl, i) => pl.tag.setText(String(cfg.names[i] || '').toUpperCase().slice(0, 12)));
    this.p1.facing = 1;
    this.p2.facing = -1;
    this.p1.i = 0;
    this.p2.i = 1;
    this.projSeq = 0;
    this.timeLimit = MATCH_MS;
    this.sudden = false;
    this.buildHud();
    const D = NET_DELAY;
    this.net = {
      me: cfg.me, send: cfg.send, rtt: cfg.rtt || (() => 0), remoteMax: -1, lastSkip: 0,
      inputs: [{}, {}], // inputs[joueur][image] = entier
      used: {}, snaps: {}, verified: -1, lastRemote: NEUTRAL_IN,
      hashes: { mine: {}, theirs: {} }, desync: false, stalled: 0, rollbacks: 0, maxRoll: 0,
    };
    for (let f = 0; f < D; f++) this.net.inputs[0][f] = this.net.inputs[1][f] = NEUTRAL_IN; // images 0..D-1 : neutre pour les deux
    // les gestes de pistolet/charge utilisent le hasard des bots : jamais en ligne
    this.autoP1 = false;
    this.curIn = [NEUTRAL_IN, NEUTRAL_IN];
    this.netInput = (i) => unpackInput(this.curIn[i]);
    this.snapAt = {};
  },

  netReceive(msg) {
    const n = this.net;
    if (!n) return;
    const r = 1 - n.me;
    if (msg.t === 'in') {
      msg.a.forEach(([f, v]) => {
        if (n.inputs[r][f] === undefined) n.inputs[r][f] = v;
        if (f > n.remoteMax) n.remoteMax = f;
      });
    } else if (msg.t === 'hash') {
      n.hashes.theirs[msg.f] = msg.h;
      this.netCheckHash(msg.f);
    }
  },

  netCheckHash(f) {
    const n = this.net;
    const a = n.hashes.mine[f], b = n.hashes.theirs[f];
    if (a === undefined || b === undefined) return;
    if (a !== b && !n.desync) {
      n.desync = true;
      n.send({ t: 'desync', f });
      if (this.onDesync) this.onDesync(f);
    }
    delete n.hashes.mine[f];
    delete n.hashes.theirs[f];
  },

  sampleLocal() {
    const inp = { sx: this.stick.sx, sy: this.stick.sy, jump: this.queue.jump, attack: this.queue.attack, hold: this.btn.attack.id !== null, block: this.btn.block.id !== null };
    this.queue.jump = this.queue.attack = this.queue.block = false;
    return packInput(inp);
  },

  netUpdate(delta) {
    const n = this.net;
    this.acc = Math.min((this.acc || 0) + Math.min(delta, 100), STEP_MS * 6);
    while (this.acc >= STEP_MS && !this.over) {
      // trop d'images prédites sans nouvelles de l'adversaire : on patiente
      if (this.frame - n.verified > NET_MAX_PRED) {
        n.stalled++;
        this.netVerify(this.frame);
        if (n.stalled % 3 === 0) {
          // en attente : on renvoie nos dernières entrées (sinon blocage mutuel avec l'envoi à 30 Hz) ;
          // de temps en temps, tout l'historique gardé (utile après une coupure réseau)
          this.netResend(n.stalled % 30 === 0 ? NET_KEEP - 2 : 16);
        }
        break;
      }
      // recalage du rythme : si on est en avance sur l'adversaire, on ralentit d'une image de temps en temps
      if (n.remoteMax >= 0 && this.frame - n.lastSkip > 20) {
        const remoteNow = n.remoteMax - NET_DELAY + Math.round(n.rtt() / 2 / STEP_MS);
        if (this.frame - remoteNow > 2) {
          n.lastSkip = this.frame;
          this.acc -= STEP_MS;
          continue;
        }
      }
      this.acc -= STEP_MS;
      this.netStep();
    }
    this.updateHud();
  },

  netResend(win) {
    const n = this.net;
    if (!n) return;
    const pk = [];
    for (let k = this.frame + NET_DELAY; k > this.frame + NET_DELAY - win && k >= 0; k--) if (n.inputs[n.me][k] !== undefined) pk.push([k, n.inputs[n.me][k]]);
    n.send({ t: 'in', a: pk });
  },

  // vérifie les prédictions contre les vraies commandes reçues (rollback si besoin) + empreintes
  netVerify(f) {
    const n = this.net;
    const r = 1 - n.me;
    // 2. l'adversaire a-t-il fait autre chose que prévu ?
    let mis = -1;
    let v = n.verified + 1;
    while (v < f && n.inputs[r][v] !== undefined) {
      if (n.used[v][r] !== n.inputs[r][v]) {
        mis = v;
        break;
      }
      v++;
    }
    if (mis < 0) n.verified = v - 1;
    else {
      n.verified = mis - 1;
      this.netRollback(mis, f);
      // on revérifie ce qui vient d'être rejoué
      let w = mis;
      while (w < f && n.inputs[r][w] !== undefined) w++;
      n.verified = w - 1;
    }
    // 3. empreinte de l'état (images confirmées) pour détecter une désynchronisation
    if (n.verified >= 30 && (n.verified % 30 === 0 || n.lastHashF === undefined)) {
      const F = n.verified - (n.verified % 30);
      if (F > (n.lastHashF || 0) && n.snaps[F]) {
        n.lastHashF = F;
        const h = hashStr(this.stateKey(n.snaps[F]));
        n.hashes.mine[F] = h;
        n.send({ t: 'hash', f: F, h });
        this.netCheckHash(F);
      }
    }
  },

  netStep() {
    const n = this.net;
    const me = n.me, r = 1 - me;
    const f = this.frame;
    // 1. mes commandes de l'image f+D, envoyées avec les 5 précédentes (redondance)
    n.inputs[me][f + NET_DELAY] = this.sampleLocal();
    const pk = [];
    for (let k = f + NET_DELAY; k > f + NET_DELAY - 6 && k >= 0; k--) if (n.inputs[me][k] !== undefined) pk.push([k, n.inputs[me][k]]);
    if ((f & 1) === 0) n.send({ t: 'in', a: pk }); // 30 Hz : économise le quota Cloudflare
    this.netVerify(f);
    // 4. on joue l'image f
    this.netPlay(f);
    // ménage
    const old = f - NET_KEEP;
    if (old >= 0) {
      delete n.snaps[old];
      delete n.used[old];
      delete n.inputs[0][old];
      delete n.inputs[1][old];
    }
  },

  netPlay(f) {
    const n = this.net;
    const me = n.me, r = 1 - me;
    n.snaps[f] = this.snapshot();
    const mine = n.inputs[me][f] !== undefined ? n.inputs[me][f] : NEUTRAL_IN;
    let theirs = n.inputs[r][f];
    if (theirs === undefined) theirs = n.lastRemote;
    else n.lastRemote = predictFrom(theirs);
    const used = [0, 0];
    used[me] = mine;
    used[r] = theirs;
    n.used[f] = used;
    this.curIn = used;
    this.simTick();
  },

  netRollback(from, to) {
    const n = this.net;
    n.rollbacks++;
    n.maxRoll = Math.max(n.maxRoll, to - from);
    this.restore(n.snaps[from]);
    this.beginResim();
    // la dernière entrée adverse connue AVANT l'image rejouée sert de base de prédiction
    for (let k = from; k < to; k++) this.netPlay(k);
    this.endResim();
  },

  // clé d'état stable (positions arrondies : le bruit de virgule flottante ne compte pas)
  stateKey(snapStr) {
    const S = JSON.parse(snapStr);
    const r = (x) => Math.round(x * 100) / 100;
    return JSON.stringify([S.frame, S.pls.map((o) => [r(o.sx), r(o.sy), r(o.vx), r(o.vy), o.f.damage, o.f.stocks, o.f.rage, o.f.jumps, o.f.ledgeSide, r(o.f.stunUntil)]), S.projs.map((p) => [p.id, r(p.x), r(p.y)])]);
  },
});
