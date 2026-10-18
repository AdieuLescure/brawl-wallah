// ===========================================================================
// Logique serveur (salles + file d'attente), indépendante de la plateforme.
// Utilisée par Cloudflare (relay.js) ET par le serveur de test local (dev-server.js).
// ===========================================================================
export const CHARS = ['toro', 'astra', 'grom', 'deadlulu', 'denodoom', 'nini', 'adieulescure'];
export const STAGES = ['night', 'dune'];
const MAX_MSG = 4000;

const send = (sock, o) => {
  try {
    sock.send(typeof o === 'string' ? o : JSON.stringify(o));
  } catch (e) {}
};

export class RoomCore {
  constructor(io) {
    this.io = io;
    this.slots = [null, null]; // { sock, id, name, anon, char, ready, reported, left }
    this.expect = null; // ids attendus (salle classée)
    this.ranked = false;
    this.started = false;
    this.finalized = false;
    this.desync = false;
    this.rematch = [false, false];
    this.stage = null; // arène choisie par le créateur du salon
  }

  init(ids, ranked) {
    this.expect = ids;
    this.ranked = !!ranked;
  }

  peersInfo() {
    return this.slots.map((s) => (s ? { name: s.name, char: s.char || null, ready: !!s.ready, here: !s.left } : null));
  }
  broadcast(o) {
    this.slots.forEach((s) => s && !s.left && send(s.sock, o));
  }
  slotOf(sock) {
    return this.slots.findIndex((s) => s && s.sock === sock);
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
    const other = this.slots[1 - i];

    switch (m.t) {
      case 'in':
      case 'hash':
        if (this.started && other && !other.left) send(other.sock, raw);
        break;
      case 'desync':
        this.desync = true;
        if (other && !other.left) send(other.sock, { t: 'desync', f: m.f });
        break;
      case 'pick':
        if (this.started || !CHARS.includes(m.char)) return;
        me.char = m.char;
        me.ready = false;
        this.broadcast({ t: 'peers', peers: this.peersInfo() });
        break;
      case 'ready':
        if (this.started || !me.char) return;
        me.ready = true;
        this.broadcast({ t: 'peers', peers: this.peersInfo() });
        if (this.slots.every((s) => s && s.ready && !s.left)) this.start();
        break;
      case 'result':
        if (!this.started || this.finalized) return;
        me.reported = m.winner === 0 || m.winner === 1 ? m.winner : null;
        await this.tryFinalize();
        break;
      case 'leave': {
        // abandon volontaire (bouton QUITTER) : pas de délai de reconnexion
        const inMatch = this.started && !this.finalized;
        me.left = true;
        if (other && !other.left) {
          send(other.sock, { t: 'left', started: inMatch });
          send(other.sock, { t: 'peers', peers: this.peersInfo() });
        }
        if (inMatch && other && other.reported !== null) await this.tryFinalize();
        break;
      }
      case 'rematch':
        if (!this.finalized && this.started) return;
        this.rematch[i] = true;
        if (this.rematch.every(Boolean) && this.slots.every((s) => s && !s.left)) this.reset();
        else if (other && !other.left) send(other.sock, { t: 'rematch?' });
        break;
    }
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
      if (this.expect) i = this.expect.indexOf(user.id);
      else i = this.slots.findIndex((s) => !s);
      if (i < 0 || this.slots[i]) return send(sock, { t: 'error', e: 'full' });
    }
    const prev = this.slots[i];
    if (!this.stage && STAGES.includes(m.stage)) this.stage = m.stage;
    // retour pendant un combat (coupure franche, ou connexion morte que le serveur n'avait pas encore vue)
    const back = !!(prev && this.started && !this.finalized);
    if (prev && prev.dropTimer) this.io.cancel && this.io.cancel(prev.dropTimer);
    if (prev && !prev.left && prev.sock !== sock) {
      try {
        prev.sock.close();
      } catch (e) {}
    }
    this.slots[i] = { sock, id: user.id, name: user.name, anon: user.anon, char: prev ? prev.char : null, ready: prev ? prev.ready : false, reported: prev ? prev.reported : null, left: false };
    send(sock, { t: 'hello', idx: i, ranked: this.ranked, stage: this.stage, started: this.started && !this.finalized, peers: this.peersInfo() });
    const other = this.slots[1 - i];
    if (other && !other.left) {
      if (back) send(other.sock, { t: 'back' });
      send(other.sock, { t: 'peers', peers: this.peersInfo() });
    }
  }

  start() {
    this.started = true;
    this.finalized = false;
    this.desync = false;
    this.rematch = [false, false];
    this.slots.forEach((s) => (s.reported = null));
    this.broadcast({ t: 'start', stage: this.stage, chars: this.slots.map((s) => s.char), names: this.slots.map((s) => s.name) });
  }

  reset() {
    this.started = false;
    this.finalized = false;
    this.rematch = [false, false];
    this.slots.forEach((s) => {
      s.ready = false;
      s.reported = null;
    });
    this.broadcast({ t: 'rematch', peers: this.peersInfo() });
  }

  async tryFinalize() {
    const [a, b] = this.slots;
    const ra = a && a.reported, rb = b && b.reported;
    const aHere = a && !a.left, bHere = b && !b.left;
    let winner = null;
    if (ra !== null && rb !== null && ra === rb) winner = ra;
    else if (ra !== null && rb !== null) {
      this.finalized = true;
      if (this.ranked && this.io.dispute) {
        try {
          await this.io.dispute(a.id);
          await this.io.dispute(b.id);
        } catch (e) {}
      }
      return this.broadcast({ t: 'final', winner: null, disputed: true });
    } else if (ra !== null && !bHere) winner = ra; // l'adversaire a quitté : forfait
    else if (rb !== null && !aHere) winner = rb;
    else return;
    this.finalized = true;
    if (this.ranked && !this.desync && a && b) {
      try {
        const r = await this.io.recordMatch(a.id, b.id, winner === 0 ? a.id : b.id);
        this.slots.forEach((s, i) => !s.left && send(s.sock, { t: 'rated', winner, delta: i === 0 ? r.delta0 : r.delta1, rating: i === 0 ? r.rating0 : r.rating1 }));
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
    const other = this.slots[1 - i];
    const inMatch = this.started && !this.finalized;
    if (inMatch && this.io.later) {
      // coupure pendant un combat : 10 s pour revenir avant de compter un abandon
      if (other && !other.left) send(other.sock, { t: 'drop' });
      me.dropTimer = this.io.later(10000, () => this.dropped(me));
      return;
    }
    if (other && !other.left) {
      send(other.sock, { t: 'left', started: inMatch });
      send(other.sock, { t: 'peers', peers: this.peersInfo() });
    }
    if (inMatch && other && other.reported !== null) await this.tryFinalize();
  }

  async dropped(me) {
    const i = this.slots.indexOf(me);
    if (i < 0 || !me.left) return; // revenu entre-temps
    const other = this.slots[1 - i];
    if (other && !other.left) {
      send(other.sock, { t: 'left', started: this.started && !this.finalized });
      send(other.sock, { t: 'peers', peers: this.peersInfo() });
    }
    if (this.started && !this.finalized && other && other.reported !== null) await this.tryFinalize();
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


