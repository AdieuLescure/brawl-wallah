// ===========================================================================
// ARÈNE « CÉRÉMONIE » : la montée des marches d'un palais du cinéma, un soir de remise de prix (les LUCAS D'OR).
// Tout le décor est en pixel art à la résolution des persos (1 pixel d'art = GPX = 2 pixels du jeu), dessiné ici par
// code ; le logo et le sigle sont redessinés en pixels (gala_art.js, généré par tools/art/gala_export.py) et peints
// DANS le décor (bannières, plaque du parvis, écussons des plateformes, écran) — parfois en perspective (bannière de
// l'aile gauche, médaillons tissés dans le tapis rouge).
//
// Plateformes propres à l'arène (GALA.plats) : toutes se traversent par dessous et se quittent par BAS tenu ;
// leur face tournée vers le vide (wall) est un mur ; on s'accroche à leurs coins (ledgeBlocks) en tombant le long
// du bloc, joystick poussé vers lui. Le PUPITRE est posé sur la SCÈNE DES PRÉSENTATEURS (son côté droit fait mur).
// Pas de plafond ni de mur côté centre : un perso éjecté ne doit pas être « sauvé » par le décor. Plateformes dans
// les bords du parvis, pupitre bas (60 px) : sinon on s'y réfugie et les KO chutent (simulations de bots).
// Le parvis (terrain principal) est plus épais qu'ailleurs (GALA.mainH) ; bords et rebords au même endroit.
// Tout ce qui bouge (flashs, projecteurs, ampoules, écran) est purement visuel : jamais dans la simulation.
// ===========================================================================
const GPX = 2; // taille d'un pixel d'art de cette arène, en pixels du jeu
const GALA = {
  mainH: 104,
  // x en fraction de la demi-largeur du terrain, top = hauteur du dessus au-dessus du sol (px), h = épaisseur (px),
  // wall = face qui fait mur (-1 gauche, 1 droite, 0 aucune)
  plats: [
    { id: 'loge', a: -0.94, b: -0.46, top: 190, h: 40, wall: -1, shield: true },
    { id: 'ecran', a: -0.42, b: 0.06, top: 320, h: 32, wall: 0, shield: true },
    { id: 'balcon', a: 0.46, b: 0.94, top: 330, h: 40, wall: 1, shield: true },
    { id: 'scene', a: 0.44, b: 0.94, top: 128, h: 36, wall: 0, shield: false }, // (pas 110 : les bots y restaient bloqués à égalité ; pas de mur : il gênait le saut depuis le rebord droit)
    { id: 'pupitre', a: 0.44, b: 0.62, top: 188, h: 60, wall: 1, pupitre: true },
  ],
};

// palette
const GC = {
  k: '#0b0812', navy0: '#120e20', navy1: '#1d1830', navy2: '#2a2442', navy3: '#3a3358',
  gold0: '#5e3d16', gold1: '#9c6a2a', gold2: '#d9a441', gold3: '#ffe08a', gold4: '#fff4c8',
  red0: '#4a0c18', red1: '#7e1224', red2: '#b01c32', red3: '#e0475a',
  st0: '#2a221f', st1: '#43372f', st2: '#6b5848', st3: '#9c8466', st4: '#c4a97e',
  warm0: '#b86a2a', warm1: '#f0a848', warm2: '#ffd27a', warm3: '#fff0c0',
  crowd0: '#0e0a16', crowd1: '#1a1424', crowd2: '#271e33', crowd3: '#5a4038',
  grey: { g: '#7c7a8a', h: '#b3b1bf', i: '#e6e4ee' },
};
const PAL_GOLD = { k: GC.k, a: GC.gold1, b: GC.gold2, c: GC.gold3, g: GC.grey.g, h: GC.grey.h, i: GC.grey.i };
// version dans l'ombre (au fond) : un peu plus sombre
const PAL_DIM = { k: '#07050c', a: '#7a5222', b: '#b08436', c: '#e0bc6e', g: '#5e5c6c', h: '#8e8c9c', i: '#bdbbc8', r: '#4a0c18', y: '#9c7430' };

// dessine un dessin de GALA_PIX (ou une liste de lignes) dans un contexte 2D, en pixels d'art
function galaSpr(c, spr, x, y, pal) {
  const rows = typeof spr === 'string' ? GALA_PIX[spr] : spr;
  if (!rows) return;
  x = Math.round(x);
  y = Math.round(y);
  for (let j = 0; j < rows.length; j++) {
    const r = rows[j];
    for (let i = 0; i < r.length; i++) {
      const ch = r[i];
      if (ch === '.') continue;
      c.fillStyle = pal[ch] || '#f0f';
      c.fillRect(x + i, y + j, 1, 1);
    }
  }
}
// même chose en PERSPECTIVE : le dessin est plaqué dans un quadrilatère (coins haut-g, haut-d, bas-d, bas-g),
// pixel par pixel (au plus proche) : il garde la grille de pixels du décor
function galaWarp(c, spr, q, pal) {
  const rows = typeof spr === 'string' ? GALA_PIX[spr] : spr;
  if (!rows) return;
  const sw = rows[0].length, sh = rows.length;
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  let a, b, cc, d, e, f, g, h;
  if (Math.abs(dx3) < 1e-9 && Math.abs(dy3) < 1e-9) {
    a = x1 - x0; b = x3 - x0; cc = x0; d = y1 - y0; e = y3 - y0; f = y0; g = 0; h = 0;
  } else {
    const den = dx1 * dy2 - dx2 * dy1;
    g = (dx3 * dy2 - dx2 * dy3) / den;
    h = (dx1 * dy3 - dx3 * dy1) / den;
    a = x1 - x0 + g * x1; b = x3 - x0 + h * x3; cc = x0; d = y1 - y0 + g * y1; e = y3 - y0 + h * y3; f = y0;
  }
  // inverse de [[a,b,cc],[d,e,f],[g,h,1]]
  const A = e - f * h, B = cc * h - b, C = b * f - cc * e, D = f * g - d, E = a - cc * g, F = cc * d - a * f;
  const Gq = d * h - e * g, Hq = b * g - a * h, I = a * e - b * d;
  const xs = [x0, x1, x2, x3], ys = [y0, y1, y2, y3];
  for (let py = Math.floor(Math.min(...ys)); py <= Math.ceil(Math.max(...ys)); py++)
    for (let px = Math.floor(Math.min(...xs)); px <= Math.ceil(Math.max(...xs)); px++) {
      const X = px + 0.5, Y = py + 0.5;
      const w = Gq * X + Hq * Y + I;
      const u = (A * X + B * Y + C) / w, v = (D * X + E * Y + F) / w;
      if (u < 0 || u >= 1 || v < 0 || v >= 1) continue;
      const ch = rows[Math.floor(v * sh)][Math.floor(u * sw)];
      if (ch === '.') continue;
      c.fillStyle = pal[ch] || '#f0f';
      c.fillRect(px, py, 1, 1);
    }
}

Object.assign(GameScene.prototype, {
  // géométrie des plateformes (identique sur les deux téléphones : ne dépend que de L), en pixels du jeu
  galaGeom() {
    const cx = this.W / 2, H2 = L.mainW / 2, by = L.baseY;
    return GALA.plats.map((p) => {
      const x0 = Math.round((cx + p.a * H2) / GPX) * GPX;
      const tw = Math.round(((p.b - p.a) * H2) / GPX);
      return Object.assign({}, p, { key: 'gala_' + p.id, x0, x1: x0 + tw * GPX, tw, th: p.h / GPX, top: by - p.top });
    });
  },

  // départ d'un perso à l'abscisse x : jamais dans le pupitre, et posé sur une plateforme basse s'il y en a une
  galaSpawn(x) {
    const gs = this.galaGeom();
    for (const g of gs) if (g.pupitre && x + 16 > g.x0 && x - 16 < g.x1) x = g.x1 + 20;
    let y = L.baseY - 110;
    for (const g of gs) if (!g.pupitre && g.top >= L.baseY - 240 && x > g.x0 + 4 && x < g.x1 - 4) y = Math.min(y, g.top - 45);
    return { x, y };
  },

  // repères du décor, en pixels d'art
  galaArt() {
    const w = Math.ceil(this.W / GPX), h = Math.ceil(this.H / GPX);
    const cx = Math.round(this.W / 2 / GPX), by = Math.round(L.baseY / GPX);
    const FW = Math.min(165, cx - 12); // demi-largeur de la façade centrale
    const H2a = Math.round(L.mainW / 2 / GPX);
    const scr = { x0: cx - 82, x1: cx + 82, y0: by - 222, y1: by - 136 };
    const ban = [cx - 152, cx + 92]; // bord gauche des deux bannières (60 de large)
    const mainB = by + GALA.mainH / GPX; // bas du parvis
    return { w, h, cx, by, FW, H2a, scr, ban, mainB, F0: cx - FW, F1: cx + FW, roof: by - 262 };
  },

  // ----- dessin (une fois) -----
  buildGala() {
    if (typeof GALA_PIX === 'undefined') return;
    const A = this.galaArt();
    const { w, h, cx, by, F0, F1, FW, scr } = A;
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const geo = this.galaGeom();
    mkCanvas(this, 'bg_gala', w, h, (c) => {
      const R = (x, y, ww, hh, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(ww), Math.round(hh)); };
      const P = (x, y, col) => R(x, y, 1, 1, col);
      // lueur chaude autour d'une lampe : anneaux de pixels de plus en plus transparents
      const glow = (x, y, r, col, a) => {
        for (let yy = -r; yy <= r; yy++)
          for (let xx = -r; xx <= r; xx++) {
            const d = Math.hypot(xx, yy) / r;
            if (d > 1) continue;
            const band = Math.ceil((1 - d) * 4) / 4;
            c.fillStyle = col.replace('A', (a * band).toFixed(3));
            c.fillRect(x + xx, y + yy, 1, 1);
          }
      };
      // ---- ciel de nuit (bandes), étoiles ----
      const sky = [[10, 11, 38], [22, 22, 70], [40, 36, 104], [58, 46, 120]];
      for (let y = 0; y < h; y++) {
        const t = Math.min(1, Math.max(0, y / Math.max(1, by - 40)));
        const q = Math.floor(t * 12) / 12;
        const seg = Math.min(2, Math.floor(q * 3)), u = q * 3 - seg;
        const a = sky[seg], b = sky[seg + 1];
        R(0, y, w, 1, `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * u)).join(',')})`);
      }
      for (let i = 0; i < w * 0.35; i++) {
        const x = Math.floor(rnd() * w), y = Math.floor(rnd() * (by - 60));
        P(x, y, rnd() > 0.85 ? '#fff4c8' : rnd() > 0.5 ? '#a8a0e0' : '#6c66b0');
        if (rnd() > 0.93) { P(x - 1, y, '#5a5498'); P(x + 1, y, '#5a5498'); P(x, y - 1, '#5a5498'); P(x, y + 1, '#5a5498'); }
      }
      // ---- la colline et son château, au loin à droite ----
      const right = w - F1 > 90;
      const hx = right ? F1 + (w - F1) * 0.55 : w * 0.78, hy = Math.max(by - 300, 34);
      for (let x = 0; x < w; x++) {
        const dxh = (x - hx) / 90;
        const top = hy + 22 + Math.round(dxh * dxh * 50 + Math.sin(x * 0.17) * 2);
        if (top < by) R(x, top, 1, by - top, '#1a1840');
        if (top < by && (x * 7) % 11 === 0) P(x, top, '#2a2858');
      }
      // château : tours, remparts, fenêtres éclairées
      [[-26, 12, 8], [-16, 22, 7], [-6, 34, 9], [6, 26, 8], [16, 18, 7], [26, 10, 6]].forEach(([dx, hh, ww]) => {
        R(hx + dx - ww / 2, hy + 22 - hh, ww, hh, '#221f4c');
        R(hx + dx - ww / 2, hy + 22 - hh, 1, hh, '#2e2b62');
        for (let k = 0; k < ww; k += 2) P(hx + dx - ww / 2 + k, hy + 21 - hh, '#221f4c');
        if (hh > 20) { R(hx + dx - 1, hy + 22 - hh - 8, 2, 8, '#221f4c'); P(hx + dx, hy + 22 - hh - 10, '#221f4c'); }
        for (let k = 0; k < hh - 4; k += 4) if (rnd() > 0.4) P(hx + dx - ww / 2 + 2 + Math.floor(rnd() * (ww - 3)), hy + 22 - hh + 3 + k, rnd() > 0.5 ? GC.warm2 : GC.warm1);
      });
      // lumières de la ville au pied de la colline
      for (let i = 0; i < w * 0.6; i++) {
        const x = Math.floor(rnd() * w), y = by - 70 + Math.floor(rnd() * 40);
        P(x, y, rnd() > 0.5 ? GC.warm2 : rnd() > 0.5 ? '#9fb8ff' : GC.warm1);
      }
      // ---- à droite : immeuble moderne aux fenêtres bleutées ----
      if (right) {
        const bx0 = F1 + 4, bx1 = w;
        R(bx0, by - 128, bx1 - bx0, 128, '#1c2244');
        R(bx0, by - 128, bx1 - bx0, 2, '#2c3466');
        for (let y = by - 120; y < by - 20; y += 9)
          for (let x = bx0 + 4; x < bx1 - 6; x += 9) {
            const lit = rnd();
            R(x, y, 6, 6, lit > 0.45 ? '#7fa0e8' : lit > 0.2 ? '#3a4a88' : '#141a36');
            if (lit > 0.45) { R(x, y, 6, 1, '#b8ccff'); R(x, y + 5, 6, 1, '#5a74c0'); }
          }
        R(bx0, by - 22, bx1 - bx0, 22, '#151a34');
      }
      // ---- à gauche : vieille aile du palais avec son balcon et ses invités ----
      if (F0 > 20) {
        const lx1 = F0 + 4;
        R(0, by - 168, lx1, 168, GC.st1);
        R(0, by - 168, lx1, 3, GC.st3);
        R(0, by - 165, lx1, 1, GC.gold1);
        // fenêtres en arcade éclairées
        for (let x = 8; x < lx1 - 14; x += 26)
          for (const y0 of [by - 156, by - 96]) {
            R(x - 1, y0 - 1, 14, 30, GC.st0);
            for (let y = y0; y < y0 + 28; y++) R(x, y, 12, 1, y < y0 + 10 ? GC.warm2 : y < y0 + 20 ? GC.warm1 : GC.warm0);
            R(x + 5, y0, 2, 28, GC.st0);
            R(x, y0 + 12, 12, 1, GC.st0);
            R(x + 1, y0 - 2, 10, 1, GC.st2);
            R(x + 3, y0 - 3, 6, 1, GC.st2);
          }
        // balcon et silhouettes
        R(0, by - 122, lx1, 4, GC.st3);
        R(0, by - 118, lx1, 2, GC.st0);
        for (let x = 2; x < lx1; x += 4) R(x, by - 128, 1, 6, GC.st3);
        R(0, by - 129, lx1, 1, GC.st4);
        for (let x = 14; x < lx1 - 8; x += 19 + Math.floor(rnd() * 8)) {
          R(x, by - 136, 4, 8, GC.crowd1);
          R(x + 1, by - 140, 3, 4, GC.crowd1);
          P(x + 1, by - 140, GC.warm0);
        }
        // la grande bannière de l'aile, vue de biais (en perspective)
        // bannière sur potence, perpendiculaire au mur : vue de biais, son bord libre (à gauche, plus près de nous)
        // est plus haut que le bord accroché au mur
        const qx0 = Math.max(6, F0 - 100), qx1 = qx0 + 46;
        R(qx0 - 2, by - 176, qx1 - qx0 + 8, 2, GC.gold1);
        R(qx1 + 4, by - 178, 2, 6, GC.gold0);
        galaWarp(c, galaBanner('short'), [[qx0, by - 174], [qx1, by - 168], [qx1, by - 84], [qx0, by - 72]], PAL_DIM);
      }
      // ---- la façade centrale ----
      R(F0, A.roof, FW * 2, by - A.roof, GC.st2);
      // étage du haut : fenêtres
      R(F0, A.roof, FW * 2, 3, GC.st4);
      R(F0, A.roof + 3, FW * 2, 1, GC.gold1);
      for (let x = F0 + 8; x < F1 - 10; x += 16) {
        R(x, A.roof + 10, 9, 18, GC.st0);
        for (let y = A.roof + 11; y < A.roof + 27; y++) R(x + 1, y, 7, 1, rnd() > 0.15 ? (y < A.roof + 18 ? GC.warm2 : GC.warm1) : GC.st1);
        R(x + 4, A.roof + 11, 1, 16, GC.st0);
        R(x - 1, A.roof + 28, 11, 2, GC.st3);
      }
      // grande corniche dorée
      R(F0 - 4, by - 240, FW * 2 + 8, 2, GC.gold3);
      R(F0 - 4, by - 238, FW * 2 + 8, 3, GC.gold1);
      R(F0 - 4, by - 235, FW * 2 + 8, 3, GC.st1);
      for (let x = F0 - 2; x < F1 + 2; x += 4) R(x, by - 235, 2, 2, GC.st3);
      // hautes fenêtres de part et d'autre de l'écran
      for (const [x0, x1] of [[F0 + 14, scr.x0 - 18], [scr.x1 + 18, F1 - 14]]) {
        for (let x = x0; x + 14 <= x1; x += 22) {
          R(x, by - 222, 14, 84, GC.st0);
          for (let y = by - 220; y < by - 140; y++) R(x + 2, y, 10, 1, y < by - 190 ? GC.warm2 : y < by - 160 ? GC.warm1 : GC.warm0);
          for (let y = by - 212; y < by - 140; y += 10) R(x + 2, y, 10, 1, GC.st1);
          R(x + 6, by - 220, 2, 80, GC.st1);
        }
      }
      // pilastres
      const pil = (x, y0, y1) => {
        R(x, y0, 10, y1 - y0, GC.st3);
        R(x, y0, 2, y1 - y0, GC.st4);
        R(x + 8, y0, 2, y1 - y0, GC.st1);
        R(x - 1, y0, 12, 3, GC.gold2);
        R(x - 1, y0 + 3, 12, 1, GC.gold0);
        R(x - 1, y1 - 3, 12, 3, GC.st1);
      };
      [F0 + 2, scr.x0 - 16, scr.x1 + 6, F1 - 12].forEach((x) => pil(x, by - 232, by - 40));
      // l'écran géant : cadre doré (l'image est posée par dessus, voir galaAmbience)
      R(scr.x0 - 5, scr.y0 - 5, scr.x1 - scr.x0 + 10, scr.y1 - scr.y0 + 10, GC.st0);
      R(scr.x0 - 4, scr.y0 - 4, scr.x1 - scr.x0 + 8, scr.y1 - scr.y0 + 8, GC.gold2);
      R(scr.x0 - 4, scr.y0 - 4, scr.x1 - scr.x0 + 8, 1, GC.gold3);
      R(scr.x0 - 2, scr.y0 - 2, scr.x1 - scr.x0 + 4, scr.y1 - scr.y0 + 4, GC.gold0);
      R(scr.x0, scr.y0, scr.x1 - scr.x0, scr.y1 - scr.y0, '#06040f');
      // bannières (le logo complet, en pixels)
      A.ban.forEach((bx) => {
        R(bx - 3, by - 236, 66, 2, GC.gold2);
        R(bx - 4, by - 237, 2, 4, GC.gold3);
        R(bx + 62, by - 237, 2, 4, GC.gold3);
        galaSpr(c, galaBanner(), bx, by - 234, Object.assign({}, PAL_GOLD, { k: '#0d0a16', r: GC.red0, y: GC.gold2 }));
      });
      // lampes de part et d'autre de l'écran
      [scr.x0 - 11, scr.x1 + 11].forEach((x) => {
        glow(x, by - 150, 14, 'rgba(255,200,120,A)', 0.22);
        R(x - 2, by - 154, 5, 6, GC.warm2);
        R(x - 1, by - 155, 3, 1, GC.gold3);
        R(x - 3, by - 148, 7, 2, GC.gold1);
        R(x, by - 146, 1, 8, GC.gold1);
      });
      // rez-de-chaussée : colonnes, portes éclairées, lanternes
      R(F0, by - 134, FW * 2, 2, GC.gold1);
      R(F0, by - 132, FW * 2, 3, GC.st3);
      [cx - 60, cx - 42, cx + 32, cx + 50].forEach((x) => {
        R(x, by - 128, 10, 98, GC.st4);
        R(x + 2, by - 128, 6, 98, GC.st3);
        R(x + 8, by - 128, 2, 98, GC.st1);
        R(x - 2, by - 128, 14, 4, GC.gold2);
        R(x - 2, by - 34, 14, 4, GC.st1);
      });
      R(cx - 30, by - 96, 60, 66, GC.st0);
      // (lumière tamisée : les combattants passent juste devant)
      for (let y = by - 94; y < by - 30; y++) R(cx - 28, y, 56, 1, y < by - 74 ? GC.warm1 : y < by - 52 ? '#c88438' : GC.warm0);
      for (let k = 0; k < 14; k++) R(cx - 28 + k, by - 108 + k, 56 - 2 * k, 1, GC.st1); // fronton de la porte
      R(cx - 30, by - 109, 60, 1, GC.gold2);
      R(cx - 1, by - 94, 2, 64, GC.gold1);
      R(cx - 15, by - 94, 1, 64, GC.gold0);
      R(cx + 14, by - 94, 1, 64, GC.gold0);
      R(cx - 28, by - 70, 56, 1, GC.gold1);
      [cx - 36, cx + 35].forEach((x) => { glow(x, by - 80, 12, 'rgba(255,200,120,A)', 0.25); R(x - 2, by - 84, 5, 7, GC.warm2); R(x - 2, by - 85, 5, 1, GC.gold3); R(x, by - 77, 1, 4, GC.gold1); });
      // ---- la montée des marches (derrière le parvis) : tapis rouge, cordons, foule ----
      const stTop = by - 30;
      for (let y = stTop, i = 0; y < by; y += 4, i++) {
        const hw = 34 + i * 6, cw = 12 + i * 2;
        R(cx - hw, y, hw * 2, 1, GC.st4);
        R(cx - hw, y + 1, hw * 2, 3, GC.st2);
        R(cx - hw, y + 3, hw * 2, 1, GC.st1);
        R(cx - cw, y, cw * 2, 1, GC.red3);
        R(cx - cw, y + 1, cw * 2, 2, GC.red2);
        R(cx - cw, y + 3, cw * 2, 1, GC.red1);
        // poteaux dorés et cordons de velours
        [-1, 1].forEach((s) => {
          const px = cx + s * (cw + 5);
          R(px, y - 6, 1, 7, GC.gold2);
          R(px - 1, y - 7, 3, 2, GC.gold3);
          if (y + 4 < by) for (let k = 0; k <= 6; k++) P(px + s * (k * 0.6 + 1), y - 5 + k * 0.7 + Math.round(Math.sin((k / 6) * Math.PI) * 1.5), GC.red2);
        });
      }
      // médaillon tissé dans le tapis, sur le palier devant les portes (vu en perspective, très aplati)
      R(cx - 20, stTop - 4, 40, 4, GC.red2);
      R(cx - 20, stTop - 4, 40, 1, GC.red3);
      galaWarp(c, 'sig13', [[cx - 7, stTop - 4], [cx + 7, stTop - 4], [cx + 9, stTop], [cx - 9, stTop]], { k: GC.red1, a: GC.gold1, b: GC.gold2, c: GC.gold3 });
      // foule massée derrière les cordons, des deux côtés des marches
      for (let row = 0; row < 7; row++) {
        const yy = stTop - 10 + row * 6;
        for (const s of [-1, 1]) {
          const edge = 34 + Math.max(0, (yy - stTop) / 4) * 6 + 4;
          for (let x = cx + s * edge; s < 0 ? x > F0 - 30 : x < F1 + 30; x += s * (4 + Math.floor(rnd() * 3))) {
            const hy = yy - Math.floor(rnd() * 3);
            const col = rnd() > 0.5 ? GC.crowd1 : GC.crowd2;
            R(x - 2, hy + 3, 5, 7, col);
            R(x - 1, hy, 3, 3, col);
            P(x, hy, row < 3 ? GC.crowd3 : '#6a4a3a'); // reflet de la lumière de la façade
            if (rnd() > 0.82) { R(x - 2 - s, hy + 1, 3, 2, '#2c2c38'); P(x - 1 - s, hy + 1, '#9aa4c8'); } // appareil photo
            if (rnd() > 0.9) R(x - 2 + s * 2, hy - 3, 1, 4, col); // bras levé
          }
        }
      }
      // ---- la limousine, garée à droite ----
      if (right) {
        const lx = F1 + 6, ly = by - 4;
        R(lx + 6, ly - 14, 60, 6, '#111018');
        R(lx, ly - 9, 76, 9, '#0c0b12');
        R(lx + 8, ly - 13, 56, 1, '#4a4a60');
        for (let x = lx + 10; x < lx + 62; x += 13) R(x, ly - 13, 10, 4, '#2a3050');
        R(lx, ly - 9, 76, 1, '#5a5a74');
        [lx + 12, lx + 60].forEach((x) => { R(x - 4, ly - 3, 8, 5, '#05040a'); R(x - 1, ly - 1, 2, 2, '#4a4a60'); });
        R(lx + 74, ly - 7, 2, 2, GC.warm3);
      }
      // ---- bannière sur un mât, tout à droite ----
      if (w - F1 > 150) {
        const mx = w - 70;
        R(mx - 2, by - 156, 2, 156, '#3a3448');
        R(mx - 3, by - 158, 4, 2, GC.gold3);
        R(mx, by - 154, 62, 1, '#3a3448');
        galaSpr(c, galaBanner(), mx, by - 152, PAL_DIM);
      }
      // ---- sol de la place, au pied du parvis ----
      R(0, by - 2, w, 2, GC.st1);
      R(0, by, w, A.mainB - by, '#16111f');
      for (let y = by + 2, k = 0; y < A.mainB; k++, y += 3 + k) R(0, y, w, 1, '#1d1729');
      // ---- premier plan (sous le parvis) : la place, le tapis qui arrive vers nous, les photographes ----
      const fy = A.mainB;
      R(0, fy, w, h - fy, '#16111f');
      for (let y = fy, k = 0; y < h; k++, y += 2 + Math.floor(k * 0.6)) R(0, y, w, 1, '#1d1729');
      const cwAt = (i) => 24 + Math.round(Math.min(i, 60) * 0.35); // le tapis s'élargit vers nous, puis file droit
      for (let y = fy, i = 0; y < h; y++, i++) {
        const cw = cwAt(i);
        R(cx - cw, y, cw * 2, 1, i % 6 === 0 ? GC.red2 : GC.red1);
        P(cx - cw - 1, y, GC.gold1);
        P(cx + cw, y, GC.gold1);
      }
      // médaillon tissé dans le tapis, vu en perspective
      if (h - fy > 24) galaWarp(c, 'sig23', [[cx - 12, fy + 6], [cx + 12, fy + 6], [cx + 16, fy + 18], [cx - 16, fy + 18]], { k: GC.red0, a: GC.gold0, b: GC.gold1, c: GC.gold2 });
      // photographes au pied du parvis, derrière une barrière dorée (éclairés par les lampes du parvis)
      for (let row = 0, yy = fy + 10; (row < 3 || yy < h - 40) && yy < h + 6; row++, yy += row < 3 ? 14 : 22) {
        for (const s of [-1, 1]) {
          const edge = cwAt(yy - fy) + 10;
          if (row === 0) {
            R(s < 0 ? 0 : cx + edge - 4, yy - 3, s < 0 ? cx - edge + 4 : w - cx - edge + 4, 1, GC.gold2);
            for (let x = cx + s * (edge - 3); s < 0 ? x > 0 : x < w; x += s * 12) R(x, yy - 3, 1, 6, GC.gold1);
          }
          for (let x = cx + s * (edge + 2); s < 0 ? x > -6 : x < w + 6; x += s * (8 + Math.floor(rnd() * 4))) {
            const hy = yy - Math.floor(rnd() * 3);
            const col = row >= 2 ? GC.crowd0 : GC.crowd1;
            R(x - 3, hy + 4, 7, 12, col);
            R(x - 2, hy, 5, 5, col);
            R(x - 2, hy, 5, 1, row === 0 ? '#8a5a3a' : '#4a3438'); // la lumière des lampes sur les têtes
            if (rnd() > 0.5) { R(x - (s > 0 ? 6 : -2), hy + 1, 5, 3, '#24242e'); P(x - (s > 0 ? 5 : -3), hy + 2, '#9aa4c8'); }
            if (rnd() > 0.85) R(x + s, hy - 4, 1, 5, col);
          }
        }
      }
      // plus bas (écran en hauteur) : la place s'assombrit, lampadaires
      const deep = fy + 52;
      if (h > deep + 10) {
        for (let y = deep; y < h; y++) {
          const t = Math.min(1, (y - deep) / 120);
          if (y % 3 === 0) R(0, y, cx - cwAt(y - fy) - 2, 1, t > 0.6 ? '#0e0a14' : '#120d1a');
          if (y % 3 === 0) R(cx + cwAt(y - fy) + 2, y, w, 1, t > 0.6 ? '#0e0a14' : '#120d1a');
        }
        for (const s of [-1, 1]) {
          const lx = cx + s * Math.min(cx - 20, 120), ly = Math.min(h - 10, deep + 90);
          glow(lx, ly - 64, 16, 'rgba(255,200,120,A)', 0.2);
          R(lx - 1, ly - 60, 3, 60, '#2a2236');
          R(lx - 4, ly - 68, 9, 7, GC.warm2);
          R(lx - 5, ly - 69, 11, 1, GC.gold2);
          R(lx - 3, ly - 2, 7, 3, '#2a2236');
        }
      }
      // palmiers, buissons aux coins
      const palm = (px, py, k) => {
        // tronc annelé, légèrement courbé
        const n = Math.round(66 * k);
        for (let i = 0; i < n; i++) {
          const x = px + Math.round(Math.sin((i / n) * 1.6) * 6 * k), tw = Math.max(3, Math.round((4 - i / n) * k));
          R(x, py - i, tw, 1, i % 3 === 0 ? '#1c140e' : '#3a2a1c');
          P(x, py - i, '#4a3826');
        }
        const tx = px + Math.round(Math.sin(1.6) * 6 * k) + 1, ty = py - n;
        // palmes : une nervure courbe et des folioles qui retombent
        [[-1, 0.9], [1, 0.9], [-1, 0.45], [1, 0.45], [-0.6, 1.25], [0.6, 1.25], [-1, 0.1], [1, 0.1]].forEach(([dir, lift]) => {
          const len = Math.round(26 * k * (lift > 1 ? 0.7 : 1));
          for (let i = 0; i < len; i++) {
            const t = i / len;
            const x = Math.round(tx + dir * i), y = Math.round(ty - lift * 10 * k * Math.sin(t * Math.PI * 0.75) + t * t * 14 * k);
            R(x, y, 2, 1, t < 0.3 ? '#3f7a48' : '#2c5e3a');
            if (i % 2 === 0 && t > 0.1) for (let l = 1; l <= 4 - Math.round(t * 2); l++) P(x + dir * Math.round(l * 0.5), y + l, l === 1 ? '#2c5e3a' : '#1c4028');
          }
        });
        R(tx - 2, ty - 1, 5, 3, '#4a3826');
      };
      if (F0 > 40) { palm(F0 - 30, by + 2, 1.2); palm(F0 - 70, by + 2, 1.0); }
      if (right) palm(F1 + 100, by + 2, 1.1);
      // écran en hauteur : grands palmiers au premier plan, en bas
      if (h - A.mainB > 200) { palm(18, h + 4, 2.2); palm(w - 26, h + 4, 2.0); }
      for (const s of [-1, 1])
        for (let i = 0; i < 14; i++) {
          const x = s < 0 ? Math.floor(rnd() * 70) : w - Math.floor(rnd() * 70), y = h - Math.floor(rnd() * 30);
          const r = 6 + Math.floor(rnd() * 8);
          for (let yy = -r; yy <= r; yy++) {
            const hw = Math.round(Math.sqrt(r * r - yy * yy));
            R(x - hw, y + yy, hw * 2, 1, yy < -r / 2 ? '#14261c' : '#0c1812');
          }
        }
    }, 'raw');

    // ---- le parvis : tapis rouge sur le dessus, rideaux drapés, plaque du logo, lampes ----
    const tw = Math.round(L.mainW / GPX), th = GALA.mainH / GPX;
    mkCanvas(this, 'main_gala', tw, th, (c) => galaDrape(c, tw, th, { carpet: true, plaque: 'logo', lamps: true }), 'raw');
    geo.forEach((g) => mkCanvas(this, g.key, g.tw, g.th, (c) => (g.pupitre ? galaPupitre(c, g.tw, g.th) : galaDrape(c, g.tw, g.th, { shield: g.shield })), 'raw'));
    // étincelle de flash (pixels)
    mkCanvas(this, 'gala_spark', 9, 9, (c) => {
      const S = ['....#....', '....#....', '...###...', '..#####..', '#########', '..#####..', '...###...', '....#....', '....#....'];
      S.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '#') { c.fillStyle = Math.abs(x - 4) + Math.abs(y - 4) < 2 ? '#ffffff' : '#fff0c0'; c.fillRect(x, y, 1, 1); } }));
    }, 'raw');
    // écran : le logo, et un plan de film (arbre sous la lune)
    const sw = scr.x1 - scr.x0, sh = scr.y1 - scr.y0;
    mkCanvas(this, 'gala_scr_logo', sw, sh, (c) => {
      c.fillStyle = '#06040f';
      c.fillRect(0, 0, sw, sh);
      const L0 = GALA_PIX.logoEd;
      galaSpr(c, L0, (sw - L0[0].length) / 2, 2, PAL_GOLD);
    }, 'raw');
    mkCanvas(this, 'gala_scr_film', sw, sh, (c) => {
      for (let y = 0; y < sh; y++) {
        const t = Math.floor((y / sh) * 6) / 6;
        c.fillStyle = `rgb(${Math.round(20 + 30 * t)},${Math.round(40 + 60 * t)},${Math.round(90 + 70 * t)})`;
        c.fillRect(0, y, sw, 1);
      }
      c.fillStyle = '#e8f0ff';
      c.fillRect(Math.round(sw * 0.75), 8, 8, 8);
      c.fillStyle = '#16284a';
      for (let x = 0; x < sw; x++) c.fillRect(x, Math.round(sh * 0.62 + Math.sin(x * 0.08) * 3), 1, sh);
      // le grand arbre
      const tx = Math.round(sw * 0.42), ty = Math.round(sh * 0.62);
      c.fillStyle = '#0e1a34';
      c.fillRect(tx - 2, ty - 22, 5, 24);
      [[0, -30, 26, 12], [-14, -24, 16, 9], [14, -25, 16, 9], [0, -38, 18, 8]].forEach(([dx, dy, rx, ry]) => {
        for (let yy = -ry; yy <= ry; yy++) {
          const ww = Math.round(rx * Math.sqrt(1 - (yy * yy) / (ry * ry)));
          c.fillRect(tx + dx - ww, ty + dy + yy, ww * 2, 1);
        }
      });
    }, 'raw');
    // faisceau de projecteur (dans le ciel)
    if (!this.textures.exists('gala_beam')) {
      const bt = this.textures.createCanvas('gala_beam', 48, 256);
      const c = bt.getContext();
      for (let y = 0; y < 256; y++) {
        const u = 1 - y / 255;
        const half = 2 + u * 22;
        const a = Math.round(((1 - u) * 0.9 + 0.08) * 6) / 6;
        c.fillStyle = `rgba(200,210,255,${(a * 0.6).toFixed(3)})`;
        c.fillRect(24 - half, y, half * 2, 1);
        c.fillStyle = `rgba(230,236,255,${a.toFixed(3)})`;
        c.fillRect(24 - half * 0.4, y, half * 0.8, 1);
      }
      bt.refresh();
    }
  },

  // plateformes de la CÉRÉMONIE : créées / retirées quand on change d'arène ; le parvis change d'épaisseur
  setGalaGeom(on) {
    (this.galaPlats || []).forEach((p) => p.destroy());
    this.galaPlats = [];
    this.ledgeBlocks = [];
    const ok = on && this.textures.exists('gala_loge');
    this.mainH = ok ? GALA.mainH : 56;
    if (this.mainPlat) {
      this.mainPlat.setY(L.baseY + this.mainH / 2);
      this.mainPlat.refreshBody();
    }
    (this.softPlats || []).forEach((p) => {
      p.stageOff = ok;
      p.setVisible(!ok);
      p.body.enable = !ok;
    });
    if (!ok) return;
    this.galaGeom().forEach((g) => {
      const p = this.platforms.create((g.x0 + g.x1) / 2, g.top + g.h / 2, g.key).setScale(GPX).refreshBody();
      p.setDepth(5);
      p.soft = true; // se traverse par dessous, se quitte par BAS tenu
      p.body.checkCollision.down = false;
      p.body.checkCollision.left = g.wall < 0;
      p.body.checkCollision.right = g.wall > 0;
      this.ledgeBlocks.push({ x0: g.x0, x1: g.x1, top: g.top });
      this.galaPlats.push(p);
    });
  },

  // debout sur une plateforme de la cérémonie ? (tests)
  solidUnder(pl) {
    if (!this.ledgeBlocks || !this.ledgeBlocks.length) return null;
    const b = pl.sprite.body;
    return this.ledgeBlocks.find((bl) => Math.abs(b.bottom - bl.top) < 4 && b.center.x > bl.x0 - 4 && b.center.x < bl.x1 + 4) || null;
  },

  // ----- vie du décor (purement visuel, jamais dans la simulation) -----
  galaAmbience() {
    const A = this.galaArt(), fx = this.stageFx;
    const keep = (o) => (fx.push(o), o);
    // faisceaux de projecteurs dans le ciel
    [[A.F1 + 30, -1, 0], [A.F1 + 60, 1, 1], [A.F0 - 20, 1, 2]].forEach(([xa, s, k]) => {
      const bx = Math.min(A.w - 4, Math.max(4, xa)) * GPX, by = (A.by - 120) * GPX;
      const beam = keep(this.add.image(bx, by, 'gala_beam').setOrigin(0.5, 1).setDepth(-9.8).setAlpha(0.16).setBlendMode(Phaser.BlendModes.ADD));
      beam.setDisplaySize(96, Math.max(520, by + 60));
      beam.angle = s * (14 + k * 6);
      keep(this.tweens.add({ targets: beam, angle: -s * 16, duration: 6000 + k * 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
    });
    // l'écran : le logo, un plan de film, puis « EN DIRECT » avec chaque combattant…
    const s = A.scr;
    const scrImg = keep(this.add.image(s.x0 * GPX, s.y0 * GPX, 'gala_scr_logo').setOrigin(0).setScale(GPX).setDepth(-9));
    const live = this.add.container(0, 0).setDepth(-8.9).setVisible(false);
    keep({ remove: () => live.destroy() }); // (un Container a déjà une méthode remove : on l'enveloppe)
    const scrX = ((s.x0 + s.x1) / 2) * GPX, top = s.y0 * GPX;
    let slot = 0;
    const showScreen = () => {
      if (!scrImg.active) return;
      live.removeAll(true);
      const pls = this.state === 'play' ? (this.pls || []).filter((p) => p && p.char) : [];
      const seq = ['logo', 'film', 'logo'].concat(pls.map((p, i) => i));
      const it = seq[slot++ % seq.length];
      if (typeof it === 'string') {
        scrImg.setTexture(it === 'film' ? 'gala_scr_film' : 'gala_scr_logo').setVisible(true);
        live.setVisible(false);
        return;
      }
      const pl = pls[it];
      scrImg.setVisible(false);
      live.setVisible(true);
      live.add(this.add.rectangle(s.x0 * GPX, top, (s.x1 - s.x0) * GPX, (s.y1 - s.y0) * GPX, 0x06040f).setOrigin(0));
      const key = `${pl.char}_idle0`;
      if (this.textures.exists(key)) live.add(this.add.image(scrX, top + 70, key).setScale(1.6));
      live.add(this.add.text(scrX, top + 6, '● EN DIRECT', { fontFamily: FONT, fontSize: '16px', color: '#ff5a6e' }).setOrigin(0.5, 0));
      live.add(this.add.text(scrX, top + 112, 'NOMINÉ : ' + (pl.def && pl.def.name ? pl.def.name : pl.char).toUpperCase(), { fontFamily: FONT, fontSize: '16px', color: '#e0c27a' }).setOrigin(0.5, 1));
    };
    keep(this.time.addEvent({ delay: 4000, loop: true, callback: showScreen }));
    // ampoules autour de l'écran : chenillard (3 images toutes faites qu'on alterne)
    const pts = [];
    for (let x = s.x0 - 3; x <= s.x1 + 2; x += 3) pts.push([x, s.y0 - 4], [x, s.y1 + 3]);
    for (let y = s.y0 - 1; y <= s.y1; y += 3) pts.push([s.x0 - 4, y], [s.x1 + 3, y]);
    const bx0 = s.x0 - 4, by0 = s.y0 - 4, bw = s.x1 - s.x0 + 8, bh = s.y1 - s.y0 + 8;
    for (let ph = 0; ph < 3; ph++)
      mkCanvas(this, 'gala_bulbs' + ph, bw, bh, (c) => pts.forEach(([x, y], i) => {
        c.fillStyle = (i + ph) % 3 ? GC.warm3 : GC.gold0;
        c.fillRect(x - bx0, y - by0, 1, 1);
      }), 'raw');
    const bulbs = keep(this.add.image(bx0 * GPX, by0 * GPX, 'gala_bulbs0').setOrigin(0).setScale(GPX).setDepth(-8.8));
    let phase = 0;
    keep(this.time.addEvent({ delay: 200, loop: true, callback: () => bulbs.active && bulbs.setTexture('gala_bulbs' + (++phase % 3)) }));
    // flashs des photographes : dans la foule des marches et au premier plan
    keep(this.time.addEvent({
      delay: 140, loop: true,
      callback: () => {
        if (Math.random() > 0.5) return;
        let xA, yA;
        const side = Math.random() < 0.5 ? -1 : 1;
        if (Math.random() < 0.55) {
          yA = A.by - 36 + Math.random() * 34;
          xA = A.cx + side * (44 + Math.random() * (A.FW - 30));
        } else {
          if (A.h - A.mainB < 12) return;
          yA = A.mainB + 10 + Math.random() * (A.h - A.mainB - 10);
          xA = A.cx + side * (40 + Math.random() * (A.w / 2 - 40));
        }
        const g = this.add.image(Math.round(xA) * GPX, Math.round(yA) * GPX, 'gala_spark').setScale(GPX).setDepth(-6).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() });
      },
    }));
  },
});

// bannière de façade : tissu noir, bord doré, logo complet, pointe en bas (r = ombre du pli, y = bord)
function galaBanner(variant) {
  galaBanner.cache = galaBanner.cache || {};
  const ck = variant || 'full';
  if (galaBanner.cache[ck]) return galaBanner.cache[ck];
  const L0 = variant === 'short' ? galaShort() : GALA_PIX.banner, W = 60, H = 70, PT = 8;
  const rows = [];
  for (let y = 0; y < H + PT; y++) {
    let r = '';
    for (let x = 0; x < W; x++) {
      const dx = Math.abs(x - W / 2 + 0.5), lim = y >= H ? (W / 2) * (1 - (y - H) / PT) : W;
      if (dx > lim) { r += '.'; continue; }
      if (x < 2 || x >= W - 2 || y < 2 || (y >= H && lim - dx < 1.6)) r += 'y';
      else r += x === 2 || x === W - 3 ? 'r' : 'k';
    }
    rows.push(r);
  }
  const ox = Math.floor((W - L0[0].length) / 2), oy = variant === 'short' ? 10 : 6;
  L0.forEach((lr, j) => {
    const r = rows[oy + j].split('');
    [...lr].forEach((ch, i) => { if (ch !== '.') r[ox + i] = ch; });
    rows[oy + j] = r.join('');
  });
  galaBanner.cache[ck] = rows;
  return rows;
}
// sigle + « LUCAS D'OR » empilés (pour ce qui est vu de biais ou de loin)
function galaShort() {
  const sg = GALA_PIX.sig23, t = GALA_PIX.title, W = t[0].length;
  const pad = (r) => '.'.repeat(Math.floor((W - r.length) / 2)) + r + '.'.repeat(W - r.length - Math.floor((W - r.length) / 2));
  return sg.map(pad).concat(['.'.repeat(W), '.'.repeat(W), '.'.repeat(W), '.'.repeat(W)], t);
}

// plateforme drapée (et le parvis) : dessus doré, valance rouge, rideaux en festons, glands dorés, écusson
function galaDrape(c, w, h, o) {
  const R = (x, y, ww, hh, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(ww), Math.round(hh)); };
  let y0 = 0;
  if (o.carpet) {
    // dessus du parvis : le tapis rouge (on marche dessus)
    R(0, 0, w, 1, GC.red3);
    R(0, 1, w, 3, GC.red2);
    for (let x = 3; x < w; x += 7) R(x, 2, 2, 1, GC.red1);
    R(0, 0, 3, 4, GC.st4);
    R(w - 3, 0, 3, 4, GC.st4);
    y0 = 4;
  }
  // rebord doré (bien net : c'est là qu'on pose les pieds)
  R(0, y0, w, 1, GC.gold4);
  R(0, y0 + 1, w, 1, GC.gold3);
  R(0, y0 + 2, w, 1, GC.gold2);
  R(0, y0 + 3, w, 1, GC.gold0);
  for (let x = 2; x < w; x += 6) R(x, y0 + 2, 2, 1, GC.gold1);
  const f0 = y0 + 4;
  // fond du panneau
  R(0, f0, w, h - f0, GC.navy1);
  for (let x = 4; x < w; x += 8) R(x, f0, 1, h - f0, GC.navy0);
  // valance rouge
  const vh = Math.max(2, Math.round((h - f0) * 0.16));
  R(0, f0, w, vh, GC.red2);
  R(0, f0, w, 1, GC.red3);
  R(0, f0 + vh, w, 1, GC.red0);
  // festons entre les glands
  const n = Math.max(1, Math.round(w / (o.carpet ? 64 : 40))), sp = w / n;
  const depth = Math.round((h - f0 - vh) * (o.carpet ? 0.42 : 0.62));
  for (let k = 0; k < n; k++) {
    const xa = k * sp, xb = (k + 1) * sp;
    for (let x = Math.floor(xa); x < Math.ceil(xb); x++) {
      const t = (x - xa) / sp;
      const bot = f0 + vh + Math.round(Math.sin(t * Math.PI) * depth);
      for (let y = f0 + vh; y <= bot; y++) {
        const fold = Math.round((y - f0 - vh) * 0.9 + Math.abs(t - 0.5) * 6) % 4;
        R(x, y, 1, 1, y === bot ? GC.red0 : fold === 0 ? GC.red1 : y < f0 + vh + 2 ? GC.red3 : GC.red2);
      }
    }
  }
  // glands dorés aux points d'accroche
  for (let k = 0; k <= n; k++) {
    const x = Math.round(Math.min(w - 3, Math.max(1, k * sp - 1)));
    const len = Math.min(h - f0 - 4, Math.round((h - f0) * (o.carpet ? 0.4 : 0.6)));
    R(x, f0, 2, len, GC.gold2);
    R(x, f0, 1, len, GC.gold3);
    R(x - 1, f0 + len, 4, 3, GC.gold2);
    R(x - 1, f0 + len + 2, 4, 1, GC.gold0);
  }
  // bas du panneau
  R(0, h - 2, w, 1, GC.gold1);
  R(0, h - 1, w, 1, GC.navy0);
  // montants dorés aux deux bouts (on voit bien où s'arrête la plateforme)
  R(0, y0, 2, h - y0, GC.gold2);
  R(0, y0, 1, h - y0, GC.gold3);
  R(w - 2, y0, 2, h - y0, GC.gold1);
  // lampes au pied du parvis
  if (o.lamps) {
    for (const f of [0.1, 0.3, 0.7, 0.9]) {
      const x = Math.round(w * f);
      for (let r = 5; r >= 1; r--) { c.fillStyle = `rgba(255,210,130,${(0.06 * (6 - r)).toFixed(2)})`; c.fillRect(x - r * 2, h - 8 - r * 2, r * 4 + 1, r * 4); }
      R(x - 2, h - 9, 5, 5, GC.warm2);
      R(x - 1, h - 8, 3, 3, GC.warm3);
      R(x - 3, h - 4, 7, 2, GC.gold1);
      R(x - 2, h - 10, 5, 1, GC.gold3);
    }
  }
  // plaque du logo (parvis) ou écusson au sigle (plateformes)
  if (o.plaque) {
    const Lg = GALA_PIX[o.plaque], pw = Lg[0].length + 8, ph = h - y0 - 1;
    const px = Math.round((w - pw) / 2), py = y0 + 1;
    R(px - 1, py - 1, pw + 2, ph + 1, GC.gold0);
    R(px, py, pw, ph, GC.gold2);
    R(px, py, pw, 1, GC.gold3);
    R(px + 1, py + 1, pw - 2, ph - 2, '#0d0a16');
    R(px + 2, py + 2, pw - 4, 1, '#1a1426');
    galaSpr(c, Lg, px + 4, py + 1 + Math.floor((ph - 2 - Lg.length) / 2), PAL_GOLD);
  } else if (o.shield) {
    const sw = 17, sh = Math.min(h - f0 + 2, 18);
    const sx = Math.round((w - sw) / 2), sy = f0 - 2;
    for (let y = 0; y < sh; y++) {
      const narrow = y > sh - 7 ? (y - (sh - 7)) * 1.2 : 0;
      const x0 = Math.round(narrow), x1 = sw - Math.round(narrow);
      if (x1 <= x0) continue;
      R(sx + x0, sy + y, x1 - x0, 1, GC.gold2);
      if (y > 0 && x1 - x0 > 2 && y < sh - 1) R(sx + x0 + 1, sy + y, x1 - x0 - 2, 1, '#0d0a16');
    }
    R(sx, sy, sw, 1, GC.gold3);
    galaSpr(c, 'sig11', sx + 3, sy + 2, PAL_GOLD);
  }
}

// le pupitre des présentateurs : colonne sombre, dessus doré, écusson, socle
function galaPupitre(c, w, h) {
  const R = (x, y, ww, hh, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(ww), Math.round(hh)); };
  R(0, 0, w, 1, GC.gold4);
  R(0, 1, w, 1, GC.gold3);
  R(0, 2, w, 1, GC.gold2);
  R(0, 3, w, 1, GC.gold0);
  R(2, 4, w - 4, h - 4, GC.navy1);
  R(2, 4, 2, h - 4, GC.navy3);
  R(w - 4, 4, 2, h - 4, GC.navy0);
  R(0, 4, 2, h - 4, GC.gold2);
  R(0, 4, 1, h - 4, GC.gold3);
  R(w - 2, 4, 2, h - 4, GC.gold1);
  R(5, 5, w - 10, 1, GC.gold1);
  if (h - 52 > 2) for (let x = 6; x < w - 6; x += 4) R(x, 40, 2, h - 52, GC.navy2);
  R(5, h - 12, w - 10, 1, GC.gold1);
  R(0, h - 6, w, 6, GC.gold1);
  R(0, h - 6, w, 1, GC.gold3);
  R(0, h - 1, w, 1, GC.gold0);
  // écusson au sigle
  const sw = 19, sh = Math.min(24, h - 13), sx = Math.round((w - sw) / 2), sy = 6;
  for (let y = 0; y < sh; y++) {
    const narrow = y > sh - 8 ? (y - (sh - 8)) * 1.2 : 0;
    const x0 = Math.round(narrow), x1 = sw - Math.round(narrow);
    if (x1 <= x0) continue;
    R(sx + x0, sy + y, x1 - x0, 1, GC.gold2);
    if (y > 0 && x1 - x0 > 2 && y < sh - 1) R(sx + x0 + 1, sy + y, x1 - x0 - 2, 1, '#0d0a16');
  }
  R(sx, sy, sw, 1, GC.gold3);
  galaSpr(c, 'sig13', sx + 3, sy + 2, PAL_GOLD);
}
