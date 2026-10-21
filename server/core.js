// ===========================================================================
// Logique serveur (salles + file d'attente), indépendante de la plateforme.
// Utilisée par Cloudflare (relay.js) ET par le serveur de test local (dev-server.js).
// ===========================================================================
export const CHARS = ['toro', 'astra', 'grom', 'deadlulu', 'denodoom', 'nini', 'adieulescure', 'bigzinzin', 'ln4'];
export const STAGES = ['night', 'dune'];
const MAX_MSG = 4000;

const send = (sock, o) => {
  try {
    sock.send(typeof o === 'string' ? o : JSON.stringify(o));
  } catch (e) {}
};

export const MODES = ['ffa', 'team'];
export const NCOLS = 6; // couleurs d'équipe possibles (voir TEAM_COLS côté jeu)

export class RoomCore {
  constructor(io) {
    this.io = io;
    this.cap = 4; // salon : jusqu'à 4 joueurs ; duel classé : 2
    this.slots = [null, null, null, null]; // { sock, id, name, anon, char, ready, reported, left, lastIn }
    this.expect = null; // ids attendus (salle classée)
    this.ranked = false;
    this.started = false;
    this.finalized = false;
    this.desync = false;
    this.rematch = [];
    this.stage = null; // arène choisie par le créateur du salon
    this.mode = null; // 'ffa' (chacun pour soi) ou 'team' (par équipes), choisi par le créateur
    this.teams = [0, 1, 0, 1]; // équipe de chaque place (le chef du salon la change)
    this.tcols = [0, 1]; // couleur de chaque équipe (indices dans TEAM_COLS)
    this.order = []; // places des joueurs de la partie en cours (index de joueur = rang dans cette liste)
  }

  init(ids, ranked) {
    this.expect = ids;
    this.ranked = !!ranked;
    if (this.ranked) {
      this.cap = 2;
      this.slots = [null, null];
      this.mode = 'ffa';
    }
  }

  here() {
    return this.slots.map((s, i) => (s && !s.left ? i : -1)).filter((i) => i >= 0);
  }
  host() {
    const h = this.here();
    return h.length ? h[0] : -1;
  }
  peersInfo() {
    return this.slots.map((s, i) => (s ? { name: s.name, char: s.char || null, ready: !!s.ready, here: !s.left, team: this.teams[i] } : null));
  }
  roomInfo() {
    return { peers: this.peersInfo(), mode: this.mode || 'ffa', tcols: this.tcols, host: this.host(), cap: this.cap };
  }
  broadcast(o) {
    this.slots.forEach((s) => s && !s.left && send(s.sock, o));
  }
  others(i, o) {
    this.slots.forEach((s, j) => j !== i && s && !s.left && send(s.sock, o));
  }
  slotOf(sock) {
    return this.slots.findIndex((s) => s && s.sock === sock);
  }
  // un joueur parti : les autres l'apprennent (en pleine partie : avec sa dernière image, pour l'éliminer au même moment)
  tellLeft(i, inMatch) {
    const me = this.slots[i];
    this.others(i, { t: 'left', started: inMatch, slot: i, p: this.order.indexOf(i), last: me && me.lastIn !== undefined ? me.lastIn : -1 });
    this.others(i, { t: 'peers', ...this.roomInfo() });
  }

  async onMessage(sock, raw) {
    if (typeof raw !== 'string' || raw.length > MAX_MSG) return;
    let m;
    try {
      m = JSON.parse(raw);
    } catch (e) {
      return;
    }
    if (m.t === 'ping') return send(sock, { t: 'pong', ts: m.ts });
    if (m.t === 'join') return this.join(sock, m);
    const i = this.slotOf(sock);
    if (i < 0) return;
    const me = this.slots[i];
    const isHost = i === this.host();

    switch (m.t) {
      case 'in':
        if (!this.started) return;
        // dernière image envoyée par ce joueur (s'il part, les autres l'éliminent juste après)
        if (Array.isArray(m.a)) for (const q of m.a) if (Array.isArray(q) && typeof q[0] === 'number' && !(q[0] <= (me.lastIn ?? -1))) me.lastIn = q[0];
        this.others(i, raw);
        break;
      case 'hash':
        if (this.started) this.others(i, raw);
        break;
      case 'desync':
        this.desync = true;
        this.others(i, { t: 'desync', f: m.f });
        break;
      case 'pick':
        if (this.started || !CHARS.includes(m.char)) return;
        me.char = m.char;
        me.ready = false;
        this.broadcast({ t: 'peers', ...this.roomInfo() });
        break;
      case 'ready':
        if (this.started || !me.char) return;
        me.ready = true;
        this.broadcast({ t: 'peers', ...this.roomInfo() });
        this.tryStart();
        break;
      // ---- réglages du chef du salon (avant la partie) ----
      case 'mode':
        if (this.started || !isHost || this.ranked || !MODES.includes(m.mode)) return;
        this.mode = m.mode;
        this.broadcast({ t: 'peers', ...this.roomInfo() });
        break;
      case 'team':
        if (this.started || !isHost || this.ranked || !(m.slot >= 0 && m.slot < this.cap) || !(m.team === 0 || m.team === 1)) return;
        this.teams[m.slot] = m.team;
        this.broadcast({ t: 'peers', ...this.roomInfo() });
        break;
      case 'tcol':
        if (this.started || !isHost || this.ranked || !(m.team === 0 || m.team === 1) || !(m.col >= 0 && m.col < NCOLS) || this.tcols[1 - m.team] === m.col) return;
        this.tcols[m.team] = m.col;
        this.broadcast({ t: 'peers', ...this.roomInfo() });
        break;
      case 'result':
        if (!this.started || this.finalized) return;
        me.reported = typeof m.winner === 'number' && m.winner >= 0 && m.winner < this.order.length ? m.winner : null;
        await this.tryFinalize();
        break;
      case 'leave': {
        // abandon volontaire (bouton QUITTER) : pas de délai de reconnexion
        const inMatch = this.started && !this.finalized;
        me.left = true;
        this.tellLeft(i, inMatch);
        if (inMatch) await this.tryFinalize();
        break;
      }
      case 'rematch':
        if (!this.finalized && this.started) return;
        this.rematch[i] = true;
        if (this.here().every((j) => this.rematch[j]) && this.here().length >= 2) this.reset();
        else this.others(i, { t: 'rematch?' });
        break;
    }
  }

  // la partie démarre quand tous les présents sont prêts (au moins 2 ; en équipes, les deux équipes ont du monde)
  tryStart() {
    const h = this.here();
    if (h.length < 2 || !h.every((j) => this.slots[j].ready)) return;
    if (this.ranked && h.length < 2) return;
    if (this.mode === 'team' && new Set(h.map((j) => this.teams[j])).size < 2) return;
    this.start();
  }

  async join(sock, m) {
    let user;
    try {
      user = await this.io.verify(m.token);
    } catch (e) {
      user = null;
    }
    if (!user) return send(sock, { t: 'error', e: 'auth' });
    if (this.expect && !this.expect.includes(user.id)) return send(sock, { t: 'error', e: 'forbidden' });
    if (this.ranked && user.anon) return send(sock, { t: 'error', e: 'forbidden' });
    // reconnexion éventuelle
    let i = this.slots.findIndex((s) => s && s.id === user.id);
    if (i < 0) {
      if (this.started && !this.finalized) return send(sock, { t: 'error', e: 'full' }); // partie en cours
      if (this.expect) i = this.expect.indexOf(user.id);
      else i = this.slots.findIndex((s) => !s || (s.left && !this.started));
      if (i < 0 || (this.slots[i] && !(this.slots[i].left && !this.started))) return send(sock, { t: 'error', e: 'full' });
      if (this.slots[i]) this.slots[i] = null; // place libérée par quelqu'un parti avant la partie
    }
    const prev = this.slots[i];
    if (!this.stage && STAGES.includes(m.stage)) this.stage = m.stage;
    if (!this.mode && !this.ranked) this.mode = MODES.includes(m.mode) ? m.mode : 'ffa';
    // retour pendant un combat (coupure franche, ou connexion morte que le serveur n'avait pas encore vue)
    const back = !!(prev && this.started && !this.finalized);
    if (prev && prev.dropTimer) this.io.cancel && this.io.cancel(prev.dropTimer);
    if (prev && !prev.left && prev.sock !== sock) {
      try {
        prev.sock.close();
      } catch (e) {}
    }
    this.slots[i] = { sock, id: user.id, name: user.name, anon: user.anon, char: prev ? prev.char : null, ready: prev ? prev.ready : false, reported: prev ? prev.reported : null, left: false, lastIn: prev ? prev.lastIn : undefined };
    send(sock, { t: 'hello', idx: i, ranked: this.ranked, stage: this.stage, started: this.started && !this.finalized, order: this.order, ...this.roomInfo() });
    if (back) this.others(i, { t: 'back', p: this.order.indexOf(i) });
    this.others(i, { t: 'peers', ...this.roomInfo() });
  }

  start() {
    this.started = true;
    this.finalized = false;
    this.desync = false;
    this.rematch = [];
    this.order = this.here();
    this.slots.forEach((s) => s && ((s.reported = null), (s.lastIn = undefined)));
    const pl = this.order.map((j) => this.slots[j]);
    this.broadcast({
      t: 'start', stage: this.stage, mode: this.mode || 'ffa', order: this.order, tcols: this.tcols,
      chars: pl.map((s) => s.char), names: pl.map((s) => s.name), teams: this.order.map((j) => this.teams[j]),
    });
  }

  reset() {
    this.started = false;
    this.finalized = false;
    this.rematch = [];
    // les places des joueurs partis se libèrent
    this.slots = this.slots.map((s) => (s && s.left ? null : s));
    this.slots.forEach((s) => {
      if (!s) return;
      s.ready = false;
      s.reported = null;
    });
    this.broadcast({ t: 'rematch', ...this.roomInfo() });
  }

  async tryFinalize() {
    if (this.finalized) return;
    const pl = this.order.map((j) => this.slots[j]);
    // partie à plusieurs (jamais classée) : le premier résultat reçu suffit
    if (pl.length > 2) {
      const r = pl.find((s) => s && s.reported !== null && s.reported !== undefined);
      const stillHere = pl.filter((s) => s && !s.left).length;
      if (!r && stillHere > 0) return;
      this.finalized = true;
      return this.broadcast({ t: 'final', winner: r ? r.reported : null, unrated: true });
    }
    const [a, b] = pl;
    const ra = a && a.reported, rb = b && b.reported;
    const aHere = a && !a.left, bHere = b && !b.left;
    let winner = null;
    if (ra !== null && ra !== undefined && rb !== null && rb !== undefined && ra === rb) winner = ra;
    else if (ra !== null && ra !== undefined && rb !== null && rb !== undefined) {
      this.finalized = true;
      if (this.ranked && this.io.dispute) {
        try {
          await this.io.dispute(a.id);
          await this.io.dispute(b.id);
        } catch (e) {}
      }
      return this.broadcast({ t: 'final', winner: null, disputed: true });
    } else if (ra !== null && ra !== undefined && !bHere) winner = ra; // l'adversaire a quitté : forfait
    else if (rb !== null && rb !== undefined && !aHere) winner = rb;
    else return;
    this.finalized = true;
    if (this.ranked && !this.desync && a && b) {
      try {
        const r = await this.io.recordMatch(a.id, b.id, winner === 0 ? a.id : b.id);
        pl.forEach((s, k) => s && !s.left && send(s.sock, { t: 'rated', winner, delta: k === 0 ? r.delta0 : r.delta1, rating: k === 0 ? r.rating0 : r.rating1 }));
        return;
      } catch (e) {}
    }
    this.broadcast({ t: 'final', winner, unrated: true });
  }

  async onClose(sock) {
    const i = this.slotOf(sock);
    if (i < 0) return;
    const me = this.slots[i];
    if (me.left) return; // déjà compté (close + error)
    me.left = true;
    const inMatch = this.started && !this.finalized;
    if (inMatch && this.io.later) {
      // coupure pendant un combat : 10 s pour revenir avant de compter un abandon
      this.others(i, { t: 'drop', p: this.order.indexOf(i) });
      me.dropTimer = this.io.later(10000, () => this.dropped(me));
      return;
    }
    this.tellLeft(i, inMatch);
    if (inMatch) await this.tryFinalize();
  }

  async dropped(me) {
    const i = this.slots.indexOf(me);
    if (i < 0 || !me.left) return; // revenu entre-temps
    this.tellLeft(i, this.started && !this.finalized);
    if (this.started && !this.finalized) await this.tryFinalize();
  }

  isEmpty() {
    return this.slots.every((s) => !s || s.left);
  }
}

export class QueueCore {
  constructor(io) {
    this.io = io;
    this.waiting = []; // { sock, id, name, rating, t }
  }
  async onMessage(sock, raw) {
    if (typeof raw !== 'string' || raw.length > MAX_MSG) return;
    let m;
    try {
      m = JSON.parse(raw);
    } catch (e) {
      return;
    }
    if (m.t === 'ping') return send(sock, { t: 'pong', ts: m.ts });
    if (m.t === 'join') {
      let user;
      try {
        user = await this.io.verify(m.token);
      } catch (e) {
        user = null;
      }
      if (!user || user.anon) return send(sock, { t: 'error', e: 'auth' });
      // au 3e litige (résultats contradictoires), le compte ne joue plus en classé
      let disputes = 0;
      try {
        disputes = this.io.disputes ? await this.io.disputes(user.id) : 0;
      } catch (e) {}
      if (disputes >= 3) return send(sock, { t: 'error', e: 'banned' });
      this.waiting = this.waiting.filter((w) => w.id !== user.id);
      let rating = 1000;
      try {
        rating = (await this.io.getProfile(user.id)).rating;
      } catch (e) {}
      this.waiting.push({ sock, id: user.id, name: user.name, rating, t: this.io.now() });
      send(sock, { t: 'queued' });
      return this.pair();
    }
    if (m.t === 'poll') return this.pair();
    if (m.t === 'leave') this.onClose(sock);
  }
  onClose(sock) {
    this.waiting = this.waiting.filter((w) => w.sock !== sock);
  }
  async pair() {
    const now = this.io.now();
    const win = (w) => 150 + Math.floor((now - w.t) / 1000) * 25; // la fourchette s'élargit avec l'attente
    const q = [...this.waiting].sort((a, b) => a.rating - b.rating);
    for (let i = 0; i < q.length - 1; i++) {
      const a = q[i], b = q[i + 1];
      if (b.rating - a.rating <= Math.max(win(a), win(b))) {
        this.waiting = this.waiting.filter((w) => w !== a && w !== b);
        const code = Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
        await this.io.createRoom(code, [a.id, b.id], true);
        send(a.sock, { t: 'match', code, vs: b.name, rating: b.rating });
        send(b.sock, { t: 'match', code, vs: a.name, rating: a.rating });
        return this.pair();
      }
    }
  }
}


