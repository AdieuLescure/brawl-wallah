import { DurableObject } from 'cloudflare:workers';
import { RoomCore, QueueCore } from './core.js';

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

  // Connexion : on retrouve le compte par son PSEUDO (sans tenir compte des majuscules), même s'il a été renommé
  // depuis sa création ; le mot de passe est vérifié par Supabase (jamais stocké en clair, jamais dans le code).
  if (path === '/api/login') {
    const pseudo = String(b.pseudo || '').trim();
    const pw = String(b.password || '');
    if (!PSEUDO_RE.test(pseudo) || !pw) return json({ e: 'bad', msg: 'Pseudo ou mot de passe incorrect' }, 400);
    let email = emailOf(pseudo);
    let found = false;
    const pr = await fetch(sbUrl(env) + '/rest/v1/profiles?select=id,username&username=ilike.' + encodeURIComponent(pseudo) + '&limit=20', { headers: svc });
    if (pr.ok) {
      const rows = await pr.json().catch(() => []);
      const row = (rows || []).find((r) => String(r.username || '').toLowerCase() === pseudo.toLowerCase());
      if (row) {
        found = true;
        const ur = await fetch(sbUrl(env) + '/auth/v1/admin/users/' + row.id, { headers: svc });
        if (ur.ok) {
          const u = await ur.json().catch(() => ({}));
          if (u && u.email) email = u.email;
        }
      }
    }
    const tr = await fetch(sbUrl(env) + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { apikey: sKey(env, 'SUPABASE_ANON_KEY'), 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pw }),
    });
    const t = await tr.json().catch(() => ({}));
    if (!tr.ok || !t.access_token) return json({ e: found ? 'pw' : 'pseudo', msg: found ? 'Mot de passe incorrect' : "Ce pseudo n'existe pas" }, 401);
    return json({ access_token: t.access_token, refresh_token: t.refresh_token });
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
    // l'adresse de connexion suit le nouveau pseudo (si elle est libre ; sinon /api/login retrouve le compte quand même)
    await fetch(sbUrl(env) + '/auth/v1/admin/users/' + u.id, { method: 'PUT', headers: svc, body: JSON.stringify({ email: emailOf(pseudo), email_confirm: true }) }).catch(() => {});
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
    const k = JSON.stringify({ code: this.code, n: here.length, cap: this.core.cap, mode: this.core.mode || 'ffa', host: here[0] ? here[0].name : '', started: this.core.started });
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
      else if (r.n >= 1 && r.n < (r.cap || 2) && !r.started) list.push({ code: r.code, host: r.host, n: r.n, cap: r.cap || 2, mode: r.mode || 'ffa' });
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
