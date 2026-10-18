// FICHIER GÉNÉRÉ par tools/build.py depuis server/core.js + server/worker.js : ne pas modifier à la main
import { DurableObject } from 'cloudflare:workers';
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




// --- Comptes : pseudo + mot de passe, sans e-mail ni vérification ---------------------
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', ...CORS } });
const emailOf = (pseudo) => pseudo.toLowerCase() + '@brawl-players.app';
const PSEUDO_RE = /^[A-Za-z0-9_]{3,16}$/;

async function apiSafe(request, env, path) {
  try {
    return await api(request, env, path);
  } catch (e) {
    return json({ e: 'crash', msg: 'Erreur serveur : ' + String((e && e.message) || e).slice(0, 160) }, 500);
  }
}

async function api(request, env, path) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (path === '/api/rooms') {
    const r = await env.LOBBY.get(env.LOBBY.idFromName('main')).fetch('https://lobby/list');
    return new Response(await r.text(), { headers: { 'content-type': 'application/json', ...CORS } });
  }
  if (path === '/api/health') {
    const need = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_KEY'];
    const out = { secrets: {} };
    need.forEach((n) => (out.secrets[n] = sKey(env, n).length > 0));
    if (need.every((n) => out.secrets[n])) {
      const h = { apikey: sKey(env, 'SUPABASE_SERVICE_KEY'), Authorization: 'Bearer ' + sKey(env, 'SUPABASE_SERVICE_KEY') };
      const t = async (u) => {
        try {
          const r = await fetch(sbUrl(env) + u, { headers: h });
          return r.status + (r.ok ? ' ok' : ' ' + (await r.text()).slice(0, 80));
        } catch (e) {
          return 'injoignable : ' + String(e.message || e).slice(0, 60);
        }
      };
      out.table_profiles = await t('/rest/v1/profiles?select=id&limit=1');
      out.comptes = await t('/auth/v1/admin/users?per_page=1');
    }
    return json(out);
  }
  if (request.method !== 'POST') return json({ e: 'method' }, 405);
  const missing = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_KEY'].filter((n) => !sKey(env, n));
  if (missing.length) return json({ e: 'secret', msg: 'Secret manquant sur Cloudflare : ' + missing.join(', ') }, 500);
  let b;
  try {
    b = await request.json();
  } catch (e) {
    return json({ e: 'bad' }, 400);
  }
  const svc = { apikey: sKey(env,'SUPABASE_SERVICE_KEY'), Authorization: 'Bearer ' + sKey(env,'SUPABASE_SERVICE_KEY'), 'Content-Type': 'application/json' };
  const upsertProfile = (id, username) =>
    fetch(sbUrl(env) + '/rest/v1/profiles?on_conflict=id', {
      method: 'POST',
      headers: { ...svc, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ id, username }),
    });

  if (path === '/api/signup') {
    const pseudo = String(b.pseudo || '').trim();
    const pw = String(b.password || '');
    if (!PSEUDO_RE.test(pseudo)) return json({ e: 'pseudo', msg: 'Pseudo : 3 à 16 caractères (lettres, chiffres, _)' }, 400);
    if (pw.length < 6) return json({ e: 'pw', msg: 'Mot de passe : 6 caractères minimum' }, 400);
    const r = await fetch(sbUrl(env) + '/auth/v1/admin/users', {
      method: 'POST',
      headers: svc,
      body: JSON.stringify({ email: emailOf(pseudo), password: pw, email_confirm: true }),
    });
    const u = await r.json().catch(() => ({}));
    if (!r.ok) {
      if (r.status === 422 || /already|registered|exists/i.test(JSON.stringify(u))) return json({ e: 'taken', msg: 'Ce pseudo est déjà pris' }, 409);
      return json({ e: 'auth', msg: 'Création impossible : ' + (u.msg || u.message || u.error_description || r.status) }, 500);
    }
    const p = await upsertProfile(u.id, pseudo);
    if (!p.ok) {
      const t = await p.text();
      await fetch(sbUrl(env) + '/auth/v1/admin/users/' + u.id, { method: 'DELETE', headers: svc });
      if (p.status === 409) return json({ e: 'taken', msg: 'Ce pseudo est déjà pris' }, 409);
      if (/profiles/.test(t) && /(schema cache|does not exist)/.test(t)) return json({ e: 'schema', msg: "La base n'est pas prête (script schema.sql à lancer dans Supabase)" }, 500);
      return json({ e: 'profile', msg: 'Profil impossible : ' + t.slice(0, 120) }, 500);
    }
    return json({ ok: true });
  }

  if (path === '/api/rename') {
    const pseudo = String(b.pseudo || '').trim();
    if (!PSEUDO_RE.test(pseudo)) return json({ e: 'pseudo', msg: 'Pseudo : 3 à 16 caractères (lettres, chiffres, _)' }, 400);
    const ur = await fetch(sbUrl(env) + '/auth/v1/user', { headers: { apikey: sKey(env,'SUPABASE_ANON_KEY'), Authorization: 'Bearer ' + String(b.token || '') } });
    if (!ur.ok) return json({ e: 'auth', msg: 'Session expirée, reconnecte-toi' }, 401);
    const u = await ur.json();
    const p = await upsertProfile(u.id, pseudo);
    if (!p.ok) {
      if (p.status === 409) return json({ e: 'taken', msg: 'Ce pseudo est déjà pris' }, 409);
      const t = await p.text().catch(() => '');
      if (/profiles/.test(t) && /(schema cache|does not exist)/.test(t)) return json({ e: 'schema', msg: "La base n'est pas prête (script schema.sql à lancer dans Supabase)" }, 500);
      return json({ e: 'profile', msg: 'Pseudo refusé : ' + t.slice(0, 100) }, 500);
    }
    return json({ ok: true });
  }
  return json({ e: 'not found' }, 404);
}

// ===========================================================================
// Worker Cloudflare : relais temps réel des combats + file d'attente classée
// Secrets à définir (voir le guide) : SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY
// ===========================================================================

const sKey = (env, n) => String(env[n] || '').trim();
const sbUrl = (env) => sKey(env, 'SUPABASE_URL').replace(/\/+$/, '');

function makeIo(env, createRoom) {
  const sb = (path, init = {}) =>
    fetch(sbUrl(env) + path, {
      ...init,
      headers: { apikey: sKey(env,'SUPABASE_SERVICE_KEY'), Authorization: 'Bearer ' + sKey(env,'SUPABASE_SERVICE_KEY'), 'Content-Type': 'application/json', ...(init.headers || {}) },
    });
  return {
    // Vérifie le jeton de connexion Supabase : le serveur ne fait jamais confiance au pseudo envoyé par le client
    verify: async (token) => {
      if (typeof token !== 'string' || token.length < 20) return null;
      const r = await fetch(sbUrl(env) + '/auth/v1/user', { headers: { apikey: sKey(env,'SUPABASE_ANON_KEY'), Authorization: 'Bearer ' + token } });
      if (!r.ok) return null;
      const u = await r.json();
      let name = 'Invité';
      if (!u.is_anonymous) {
        const p = await sb(`/rest/v1/profiles?id=eq.${u.id}&select=username`).then((x) => x.json()).catch(() => []);
        name = (p[0] && p[0].username) || 'Joueur';
      }
      return { id: u.id, name, anon: !!u.is_anonymous };
    },
    getProfile: async (id) => {
      const p = await sb(`/rest/v1/profiles?id=eq.${id}&select=rating`).then((x) => x.json());
      return { rating: (p[0] && p[0].rating) || 1000 };
    },
    recordMatch: async (a, b, winner) => {
      const r = await sb('/rest/v1/rpc/record_match', { method: 'POST', body: JSON.stringify({ p0: a, p1: b, w: winner }) });
      if (!r.ok) throw new Error('record_match');
      const d = await r.json();
      return { delta0: d.delta0, delta1: d.delta1, rating0: d.rating0, rating1: d.rating1 };
    },
    createRoom,
    now: () => Date.now(),
    later: (ms, fn) => setTimeout(fn, ms),
    cancel: (t) => clearTimeout(t),
    dispute: (id) => env.QUEUE.get(env.QUEUE.idFromName('main')).fetch('https://queue/dispute', { method: 'POST', body: JSON.stringify({ id }) }),
  };
}

// --- Une salle = un Durable Object -------------------------------------------------
export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.env = env;
    this.core = new RoomCore(makeIo(env, null));
    this.pub = undefined;
    this.code = '';
    this.lastRep = '';
  }
  // annonce l'état du salon public à l'annuaire
  async report() {
    if (!this.pub || this.core.ranked || !this.env.LOBBY) return;
    const here = this.core.slots.filter((x) => x && !x.left);
    const k = JSON.stringify({ code: this.code, n: here.length, host: here[0] ? here[0].name : '', started: this.core.started });
    if (k === this.lastRep) return;
    this.lastRep = k;
    try {
      await this.env.LOBBY.get(this.env.LOBBY.idFromName('main')).fetch('https://lobby/upd', { method: 'POST', body: k });
    } catch (e) {}
  }
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/init') {
      const { ids, ranked } = await request.json();
      this.core.init(ids, ranked);
      return new Response('ok');
    }
    this.code = url.pathname.split('/').pop().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    if (this.pub === undefined) this.pub = url.searchParams.get('pub') === '1';
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    server.addEventListener('message', async (e) => {
      await this.core.onMessage(server, typeof e.data === 'string' ? e.data : '');
      this.report();
    });
    const gone = async () => {
      // répondre à la fermeture, sinon le téléphone attend jusqu'à 60 s avant de se reconnecter
      try {
        server.close(1000, 'bye');
      } catch (e) {}
      await this.core.onClose(server);
      this.report();
    };
    server.addEventListener('close', gone);
    server.addEventListener('error', gone);
    return new Response(null, { status: 101, webSocket: client });
  }
}

// --- Annuaire des salons publics (un seul Durable Object) --------------------------------
export class Lobby extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.rooms = null;
  }
  async load() {
    if (this.rooms) return;
    const saved = await this.ctx.storage.get('rooms');
    this.rooms = new Map(saved ? Object.entries(saved) : []);
  }
  async save() {
    await this.ctx.storage.put('rooms', Object.fromEntries(this.rooms));
  }
  async fetch(request) {
    const url = new URL(request.url);
    await this.load();
    if (url.pathname === '/upd') {
      const r = await request.json();
      if (r.n > 0) this.rooms.set(r.code, { ...r, t: Date.now() });
      else this.rooms.delete(r.code);
      await this.save();
      return new Response('ok');
    }
    const now = Date.now();
    const list = [];
    for (const [c, r] of this.rooms) {
      if (now - r.t > 20 * 60000) this.rooms.delete(c);
      else if (r.n === 1 && !r.started) list.push({ code: r.code, host: r.host });
    }
    return new Response(JSON.stringify(list.slice(0, 12)), { headers: { 'content-type': 'application/json' } });
  }
}

// --- La file d'attente classée = un Durable Object unique ------------------------------
export class Queue extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    const io = makeIo(env, async (code, ids, ranked) => {
      const stub = env.ROOM.get(env.ROOM.idFromName('R' + code));
      await stub.fetch('https://room/init', { method: 'POST', body: JSON.stringify({ ids, ranked }) });
    });
    // compteur de litiges par compte (gardé dans la mémoire durable de la file d'attente)
    io.disputes = async (id) => (await this.ctx.storage.get('d:' + id)) || 0;
    this.core = new QueueCore(io);
  }
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/dispute') {
      const { id } = await request.json();
      const k = 'd:' + id;
      await this.ctx.storage.put(k, ((await this.ctx.storage.get(k)) || 0) + 1);
      return new Response('ok');
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    server.addEventListener('message', (e) => this.core.onMessage(server, typeof e.data === 'string' ? e.data : ''));
    const gone = () => {
      try {
        server.close(1000, 'bye');
      } catch (e) {}
      this.core.onClose(server);
    };
    server.addEventListener('close', gone);
    server.addEventListener('error', gone);
    return new Response(null, { status: 101, webSocket: client });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return apiSafe(request, env, url.pathname);
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Brawl relay OK', { headers: { 'Access-Control-Allow-Origin': '*' } });
    if (url.pathname === '/ws/queue') return env.QUEUE.get(env.QUEUE.idFromName('main')).fetch(request);
    if (url.pathname.startsWith('/ws/room/')) {
      const code = url.pathname.split('/').pop().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
      if (!code) return new Response('bad code', { status: 400 });
      return env.ROOM.get(env.ROOM.idFromName('R' + code)).fetch(request);
    }
    return new Response('not found', { status: 404 });
  },
};
