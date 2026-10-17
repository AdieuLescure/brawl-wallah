// ---------------------------------------------------------------------------
// SPR48 : moteur de sprites pixel art NATIF 48 x 40 (aucun lissage, aucun upscale)
// Source unique : utilisé par le jeu ET par le script generate_spritesheet.js
//   SPR48.draw(id, poseName) -> Uint8ClampedArray RGBA de 48*40*4
// Repères des poses : grille 24x20 (x2 ici). Personnages tournés vers la droite.
// ---------------------------------------------------------------------------
var SPR48 = (function () {
  const W = 48, H = 40;
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];
  const mixc = (a, b, t) => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t), 255];
  const OUT = hex('#14121c');
  const ramp = (h) => {
    const base = hex(h);
    return { hi: mixc(base, [255, 255, 255], 0.26), base, lo: mixc(base, [10, 6, 24], 0.4) };
  };
  const pal = (o) => {
    const r = {};
    Object.keys(o).forEach((k) => (r[k] = hex(o[k])));
    return r;
  };

  // ---------------- peintre : chaque partie du corps est posée avec son contour ----------------
  function makeGfx() {
    const buf = new Array(W * H).fill(null);
    const g = {
      buf,
      commit(map, outline) {
        if (outline !== false) {
          map.forEach((_, k) => {
            const x = k % W, y = (k / W) | 0;
            [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
              const xx = x + dx, yy = y + dy;
              if (xx < 0 || yy < 0 || xx >= W || yy >= H) return;
              const kk = yy * W + xx;
              if (!map.has(kk)) buf[kk] = OUT;
            });
          });
        }
        map.forEach((col, k) => (buf[k] = col));
      },
      // capsule ombrée (bras, jambes, doigts…)
      capsule(x1, y1, x2, y2, r, rp) {
        const m = new Map();
        const minx = Math.floor(Math.min(x1, x2) - r - 1), maxx = Math.ceil(Math.max(x1, x2) + r + 1);
        const miny = Math.floor(Math.min(y1, y2) - r - 1), maxy = Math.ceil(Math.max(y1, y2) + r + 1);
        const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1;
        for (let y = miny; y <= maxy; y++)
          for (let x = minx; x <= maxx; x++) {
            if (x < 0 || y < 0 || x >= W || y >= H) continue;
            const px = x + 0.5, py = y + 0.5;
            let t = ((px - x1) * dx + (py - y1) * dy) / l2;
            t = Math.max(0, Math.min(1, t));
            const cx = x1 + dx * t, cy = y1 + dy * t;
            if (Math.hypot(px - cx, py - cy) > r) continue;
            const s = ((px - cx) * -0.55 + (py - cy) * -0.83) / r;
            m.set(y * W + x, s > 0.42 ? rp.hi : s < -0.3 ? rp.lo : rp.base);
          }
        return m;
      },
      poly(pts, colFn) {
        const m = new Map();
        let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
        pts.forEach(([x, y]) => ((minx = Math.min(minx, x)), (maxx = Math.max(maxx, x)), (miny = Math.min(miny, y)), (maxy = Math.max(maxy, y))));
        for (let y = Math.max(0, Math.floor(miny)); y <= Math.min(H - 1, Math.ceil(maxy)); y++)
          for (let x = Math.max(0, Math.floor(minx)); x <= Math.min(W - 1, Math.ceil(maxx)); x++) {
            const px = x + 0.5, py = y + 0.5;
            let ok = false;
            for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
              const [xi, yi] = pts[i], [xj, yj] = pts[j];
              if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) ok = !ok;
            }
            if (ok) {
              const c = typeof colFn === 'function' ? colFn(x, y) : colFn;
              if (c) m.set(y * W + x, c);
            }
          }
        return m;
      },
      bmp(rows, pl, x0, y0) {
        const m = new Map();
        rows.forEach((row, j) => {
          for (let i = 0; i < row.length; i++) {
            const ch = row[i];
            if (ch === '.' || !pl[ch]) continue;
            const x = x0 + i, y = y0 + j;
            if (x < 0 || y < 0 || x >= W || y >= H) continue;
            m.set(y * W + x, pl[ch]);
          }
        });
        return m;
      },
      dot(x, y, col) {
        x = Math.round(x);
        y = Math.round(y);
        if (x >= 0 && y >= 0 && x < W && y < H) buf[y * W + x] = col;
      },
      rect(x, y, w, h, col) {
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) g.dot(x + i, y + j, col);
      },
      line(x1, y1, x2, y2, col) {
        const n = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
        for (let i = 0; i <= n; i++) g.dot(x1 + ((x2 - x1) * i) / n, y1 + ((y2 - y1) * i) / n, col);
      },
    };
    return g;
  }

  // ---------------- poses (articulations en grille 24x20) ----------------
  const POSES = {
  idle0: { oy: 0, ox: 0, bA: [11, 10, 10, 14, 2], fA: [14, 10, 15, 14, 2], bL: [11, 14, 10, 18], fL: [14, 14, 15, 18] },
  idle1: { oy: 1, ox: 0, bA: [11, 11, 10, 14, 2], fA: [14, 11, 15, 14, 2], bL: [11, 15, 10, 18], fL: [14, 15, 15, 18] },
  run0: { oy: 0, ox: 0, bA: [11, 10, 8, 12, 2], fA: [14, 10, 17, 12, 2], bL: [11, 14, 8, 17], fL: [14, 14, 18, 18] },
  run1: { oy: 1, ox: 0, bA: [11, 11, 14, 13, 2], fA: [14, 11, 11, 13, 2], bL: [11, 15, 12, 18], fL: [14, 15, 14, 18] },
  jump: { oy: 0, ox: 0, bA: [11, 10, 8, 7, 2], fA: [14, 10, 18, 7, 2], bL: [11, 14, 9, 17], fL: [14, 14, 17, 16] },
  hurt: { oy: 0, ox: -1, bA: [10, 10, 6, 7, 2], fA: [13, 10, 17, 12, 2], bL: [11, 14, 8, 18], fL: [14, 14, 16, 18] },
  jab: { oy: 0, ox: 0, bA: [11, 10, 14, 12, 2], fA: [14, 10, 20, 10, 3], bL: [11, 14, 9, 18], fL: [14, 14, 16, 18] },
  heavy: { oy: 1, ox: 1, bA: [12, 11, 9, 13, 2], fA: [15, 11, 21, 11, 4], bL: [12, 15, 7, 18], fL: [15, 15, 19, 18] },
  up: { oy: 1, ox: 0, bA: [12, 11, 10, 15, 2], fA: [15, 11, 18, 3, 3], bL: [12, 15, 9, 18], fL: [15, 15, 17, 18] },
  sweep: { oy: 4, ox: 0, bA: [11, 14, 8, 17, 2], fA: [14, 14, 15, 17, 2], bL: [11, 18, 9, 18], fL: [14, 18, 21, 18] },
  stomp: { oy: 0, ox: 0, bA: [11, 10, 9, 6, 2], fA: [14, 10, 16, 6, 2], bL: [11, 14, 10, 18], fL: [14, 14, 19, 18] },
  rkick: { oy: 0, ox: -1, bA: [10, 10, 7, 12, 2], fA: [13, 10, 11, 13, 2], bL: [11, 14, 10, 18], fL: [14, 14, 21, 13] },
  cast: { oy: 0, ox: 0, orb: 3, bA: [11, 10, 9, 12, 2], fA: [14, 10, 19, 9, 2], bL: [11, 14, 9, 18], fL: [14, 14, 16, 18] },
  castBig: { oy: 0, ox: 1, orb: 4, bA: [12, 10, 17, 10, 2], fA: [15, 10, 18, 9, 2], bL: [12, 14, 9, 18], fL: [15, 14, 17, 18] },
  castUp: { oy: 0, ox: 0, orb: 4, bA: [11, 10, 10, 6, 2], fA: [14, 10, 15, 6, 2], bL: [11, 14, 9, 18], fL: [14, 14, 16, 18] },
  castDown: { oy: 3, ox: 0, orb: 3, bA: [11, 13, 13, 18, 2], fA: [14, 13, 19, 18, 2], bL: [11, 17, 9, 18], fL: [14, 17, 17, 18] },
  grab: { oy: 1, ox: 1, bA: [12, 11, 20, 11, 3], fA: [15, 11, 21, 10, 3], bL: [12, 15, 8, 18], fL: [15, 15, 18, 18] },
  slam: { oy: 0, ox: 0, bA: [12, 10, 13, 2, 3], fA: [15, 10, 16, 2, 3], bL: [11, 14, 8, 18], fL: [14, 14, 17, 18] },
  hook: { oy: 0, ox: 0, bA: [11, 10, 9, 12, 3], fA: [14, 10, 20, 8, 3], bL: [11, 14, 9, 18], fL: [14, 14, 16, 18] },
  // DEAD LULU : guitare en main (gtr = caisse + bout du manche), coup de pied haut, plongeon
  guitar: { oy: 0, ox: 0, gtr: { bx: 21, by: 8, nx: 15, ny: 9 }, bA: [11, 10, 15, 11, 2], fA: [14, 10, 17, 9, 2], bL: [11, 14, 9, 18], fL: [14, 14, 16, 18] },
  guitarBig: { oy: 1, ox: 1, gtr: { bx: 21, by: 16, nx: 15, ny: 11 }, bA: [12, 11, 16, 13, 2], fA: [15, 11, 17, 11, 2], bL: [12, 15, 8, 18], fL: [15, 15, 19, 18] },
  kickUp: { oy: 0, ox: -1, bA: [10, 10, 8, 13, 2], fA: [13, 10, 10, 7, 2], bL: [11, 14, 10, 18], fL: [14, 14, 18, 2] },
  plunge: { oy: 0, ox: 0, bA: [11, 10, 9, 5, 2], fA: [14, 10, 16, 5, 2], bL: [11, 14, 11, 19], fL: [14, 14, 14, 19] },
  // DENODOOM : pistolets, sabre, aigle (main levée), hermine (main au sol), ballon chargé, poêle
  shoot: { oy: 0, ox: 0, guns: [[17, 11], [19, 9]], bA: [11, 10, 17, 11, 2], fA: [14, 10, 19, 9, 2], bL: [11, 14, 9, 18], fL: [14, 14, 16, 18] },
  saber: { oy: 1, ox: 1, saber: [18, 11, 23, 5], bA: [12, 11, 10, 14, 2], fA: [15, 11, 18, 11, 2], bL: [12, 15, 8, 18], fL: [15, 15, 19, 18] },
  summon: { oy: 0, ox: 0, bA: [11, 10, 10, 14, 2], fA: [14, 10, 16, 2, 2], bL: [11, 14, 9, 18], fL: [14, 14, 16, 18] },
  pointDown: { oy: 3, ox: 0, bA: [11, 13, 9, 18, 2], fA: [14, 13, 19, 18, 2], bL: [11, 17, 9, 18], fL: [14, 17, 17, 18] },
  charge: { oy: 0, ox: -1, ball: [7, 2, 4], bA: [10, 10, 8, 13, 2], fA: [13, 10, 9, 4, 2], bL: [11, 14, 7, 18], fL: [14, 14, 17, 18] },
  block: { oy: 2, ox: 0, bA: [11, 11, 14, 8, 2], fA: [14, 11, 17, 7, 2], bL: [11, 15, 9, 18], fL: [14, 15, 16, 18] },
  throwBall: { oy: 0, ox: 1, bA: [11, 10, 9, 12, 2], fA: [15, 10, 20, 8, 2], bL: [11, 14, 8, 18], fL: [14, 14, 18, 18] },
  plungePan: { oy: 0, ox: 0, pan: true, bA: [11, 10, 12, 14, 2], fA: [14, 10, 13, 13, 2], bL: [11, 14, 8, 16, 0], fL: [14, 14, 17, 16] },
};

  // poses propres à NINI (jamais de coup porté par ses bras : c'est le chat, le corgi ou la bague)
  POSES.claw = { oy: 0, ox: 0, only: 'nini', claw: 1, bA: [11, 10, 10, 14, 2], fA: [14, 10, 15, 14, 2], bL: [11, 14, 9, 18], fL: [14, 14, 16, 18] };
  POSES.call = { oy: 0, ox: 0, only: 'nini', bA: [11, 10, 10, 14, 2], fA: [14, 10, 20, 9, 2], bL: [11, 14, 9, 18], fL: [14, 14, 16, 18] };
  POSES.ringT = { oy: 0, ox: 0, only: 'nini', bA: [11, 10, 10, 14, 2], fA: [14, 10, 19, 5, 2], bL: [11, 14, 9, 18], fL: [14, 14, 16, 18] };
  POSES.purr = { oy: 1, ox: 0, only: 'nini', purr: 1, bA: [11, 11, 13, 13, 2], fA: [14, 11, 16, 13, 2], bL: [11, 15, 9, 18], fL: [14, 15, 16, 18] };
  POSES.float = { oy: 0, ox: 0, only: 'nini', bA: [11, 10, 8, 13, 2], fA: [14, 10, 16, 3, 2], bL: [11, 14, 10, 17], fL: [14, 14, 15, 17] };
  Object.keys(POSES).forEach((k) => (POSES[k].__n = k));
  const CH = {};

  // ---------------- dessin d'une frame ----------------
  function draw(id, poseName, opts) {
    const pose = POSES[poseName];
    if (pose.only && pose.only !== id) return null;
    const C = CH[id];
    const g = makeGfx();
    const ox = pose.ox * 2, oy = pose.oy * 2;
    const ctx = { g, pose, ox, oy, C, rage: !!(opts && opts.rage) };
    const th = C.th || 2;
    const armR = C.armR || 2.3, legR = C.legR || 2.5;
    const joint = (a) => [2 * (a[0] + th / 2), 2 * (a[1] + th / 2), 2 * (a[2] + th / 2), 2 * (a[3] + th / 2)];

    const arm = (a, rp, back) => {
      let [sx, sy, ex, ey] = joint(a);
      const gs = a[4] || 2;
      const hr = Math.min(3.2, gs * 0.95 + 0.4);
      let hx = 2 * (a[2] + gs / 2), hy = 2 * (a[3] + gs / 2);
      // la main (contour compris) reste dans la cellule 48 x 40
      const m = hr + 1.2;
      let f = 1;
      if (hx > W - m) f = Math.min(f, (W - m - sx) / (hx - sx));
      if (hy < m) f = Math.min(f, (sy - m) / (sy - hy));
      if (hy > H - m) f = Math.min(f, (H - m - sy) / (hy - sy));
      if (f < 1) {
        hx = sx + (hx - sx) * f; hy = sy + (hy - sy) * f;
        ex = sx + (ex - sx) * f; ey = sy + (ey - sy) * f;
      }
      g.commit(g.capsule(sx, sy, ex, ey, armR, rp));
      if (C.cap) g.commit(g.capsule(sx, sy, sx + (ex - sx) * 0.34, sy + (ey - sy) * 0.34, armR + 0.5, back ? C.capBack || C.cap : C.cap));
      g.commit(g.capsule(hx, hy, hx, hy, hr, back ? C.handBack : C.hand));
      return { sx, sy, hx, hy, dx: hx - sx, dy: hy - sy };
    };
    const leg = (a, rp) => {
      const [sx, sy] = joint(a);
      const ex = 2 * (a[2] + th / 2), by = 2 * a[3] + 1.8;
      g.commit(g.capsule(sx, sy, ex, by - 1.4, legR, rp));
      const toe = Math.max(0, Math.min(4.2, W - 3.4 - ex - 1));
      g.commit(g.capsule(ex - 1.2, by, ex + toe, by, C.bootR || 2.2, C.boot));
      return { ex, by };
    };

    C.pre && C.pre(ctx);
    const aB = arm(pose.bA, C.sleeveBack || C.sleeve, true);
    ctx.aB = aB;
    C.backHand && C.backHand(ctx, aB);
    const lB = leg(pose.bL, C.legBack || C.pants);
    C.torso && C.torso(ctx);
    C.head && C.head(ctx);
    const lF = leg(pose.fL, C.pants);
    ctx.lB = lB;
    ctx.lF = lF;
    C.post && C.post(ctx);
    const aF = arm(pose.fA, C.sleeve, false);
    ctx.aF = aF;
    C.frontHand && C.frontHand(ctx, aF);
    C.acc && C.acc(ctx);

    if (C.final) C.final(ctx);
    const out = new Uint8ClampedArray(W * H * 4);
    g.buf.forEach((c, i) => {
      if (!c) return;
      out[i * 4] = c[0]; out[i * 4 + 1] = c[1]; out[i * 4 + 2] = c[2]; out[i * 4 + 3] = c[3] === undefined ? 255 : c[3];
    });
    return out;
  }

  return { W, H, hex, mixc, ramp, pal, makeGfx, OUT, POSES, CH, draw, names: Object.keys(POSES), namesFor: (id) => Object.keys(POSES).filter((k) => !POSES[k].only || POSES[k].only === id) };
})();
if (typeof module !== 'undefined') module.exports = SPR48;
