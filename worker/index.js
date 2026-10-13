// ===========================================================================
// Worker Cloudflare : relais temps réel des combats + file d'attente classée
// Secrets à définir (voir le guide) : SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY
// ===========================================================================
import { DurableObject } from 'cloudflare:workers';
import { RoomCore, QueueCore } from './core.js';

function makeIo(env, createRoom) {
  const sb = (path, init = {}) =>
    fetch(env.SUPABASE_URL + path, {
      ...init,
      headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json', ...(init.headers || {}) },
    });
  return {
    // Vérifie le jeton de connexion Supabase : le serveur ne fait jamais confiance au pseudo envoyé par le client
    verify: async (token) => {
      if (typeof token !== 'string' || token.length < 20) return null;
      const r = await fetch(env.SUPABASE_URL + '/auth/v1/user', { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token } });
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
  };
}

// --- Une salle = un Durable Object -------------------------------------------------
export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.core = new RoomCore(makeIo(env, null));
  }
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/init') {
      const { ids, ranked } = await request.json();
      this.core.init(ids, ranked);
      return new Response('ok');
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    server.addEventListener('message', (e) => this.core.onMessage(server, typeof e.data === 'string' ? e.data : ''));
    server.addEventListener('close', () => this.core.onClose(server));
    server.addEventListener('error', () => this.core.onClose(server));
    return new Response(null, { status: 101, webSocket: client });
  }
}

// --- La file d'attente classée = un Durable Object unique ------------------------------
export class Queue extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.core = new QueueCore(
      makeIo(env, async (code, ids, ranked) => {
        const stub = env.ROOM.get(env.ROOM.idFromName('R' + code));
        await stub.fetch('https://room/init', { method: 'POST', body: JSON.stringify({ ids, ranked }) });
      })
    );
  }
  async fetch() {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    server.addEventListener('message', (e) => this.core.onMessage(server, typeof e.data === 'string' ? e.data : ''));
    server.addEventListener('close', () => this.core.onClose(server));
    return new Response(null, { status: 101, webSocket: client });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
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
