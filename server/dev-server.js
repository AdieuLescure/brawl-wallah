// Serveur de TEST local (même logique que Cloudflare) : node dev-server.js [port]
// Jetons de test : "dev:pseudo"
import { WebSocketServer } from 'ws';
import { RoomCore, QueueCore } from './core.js';

const port = +process.argv[2] || 8787;
const ratings = {};
const rooms = new Map();
const io = {
  verify: async (t) => (typeof t === 'string' && t.startsWith('dev:') ? { id: t.slice(4), name: t.slice(4), anon: t.startsWith('dev:guest') } : null),
  getProfile: async (id) => ({ rating: ratings[id] || 1000 }),
  recordMatch: async (a, b, w) => {
    const ra = ratings[a] || 1000, rb = ratings[b] || 1000;
    const ea = 1 / (1 + Math.pow(10, (rb - ra) / 400));
    const sa = w === a ? 1 : 0;
    const d = Math.round(32 * (sa - ea));
    ratings[a] = ra + d;
    ratings[b] = rb - d;
    return { delta0: d, delta1: -d, rating0: ratings[a], rating1: ratings[b] };
  },
  createRoom: async (code, ids, ranked) => {
    const r = new RoomCore(io);
    r.init(ids, ranked);
    rooms.set(code, r);
  },
  now: () => Date.now(),
  later: (ms, fn) => setTimeout(fn, ms),
  cancel: (t) => clearTimeout(t),
  dispute: async (id) => (disputes[id] = (disputes[id] || 0) + 1),
  disputes: async (id) => disputes[id] || 0,
};
const disputes = {};
const queue = new QueueCore(io);
const wss = new WebSocketServer({ port });
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://x');
  let target;
  if (url.pathname === '/ws/queue') target = queue;
  else if (url.pathname.startsWith('/ws/room/')) {
    const code = url.pathname.split('/').pop().toUpperCase();
    if (!rooms.has(code)) rooms.set(code, new RoomCore(io));
    target = rooms.get(code);
  } else return ws.close();
  const LAT = +process.env.LAT || 0;
  ws.on('message', (d) => { const s = d.toString(); LAT ? setTimeout(() => target.onMessage(ws, s), LAT) : target.onMessage(ws, s); });
  ws.on('close', () => target.onClose(ws));
});
console.log('dev relay on', port);
