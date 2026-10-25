// ===========================================================================
// ARÈNE « CÉRÉMONIE » : un palais du cinéma, la nuit, dans la brume, un soir de remise de prix (les LUCAS D'OR).
// Tout le décor est en pixel art à la résolution des persos (1 pixel d'art = GPX = 2 pixels du jeu), dessiné ici par
// code, en 5 PLANS pour la parallaxe (GALA_PLANES : ciel, colline et château, ville, palais, public). Au-dessus du
// parvis : le palais, bas, avec sa petite tour et le SIGLE qui s'illumine tout en haut ; en dessous : le public, vu à
// l'horizontale (plan devant le terrain, f > 1). Brume (nappes 'gala_fog') et halos ('gala_glow') posés par
// galaAmbience. Logo et sigle redessinés en pixels (gala_art.js, tools/art/gala_export.py) et peints DANS le décor :
// l'écran géant, la plaque du parvis, la bannière en perspective de l'aile gauche, deux écussons (plateforme de
// gauche en haut) et la tour.
//
// Plateformes propres à l'arène (GALA.plats) : toutes se traversent par dessous et se quittent par BAS tenu ;
// leur face tournée vers le vide (wall) est un mur ; on s'accroche à leurs coins (ledgeBlocks) en tombant le long
// du bloc, joystick poussé vers lui. (Le pupitre posé sur la scène de droite a été retiré, demande de Noah.)
// Pas de plafond ni de mur côté centre : un perso éjecté ne doit pas être « sauvé » par le décor. Plateformes dans
// les bords du parvis, pas de bloc haut sur la scène : sinon on s'y réfugie et les KO chutent (simulations de bots).
// Le parvis (terrain principal) est plus épais qu'ailleurs (GALA.mainH) ; bords et rebords au même endroit.
// Tout ce qui bouge (flashs, projecteurs, ampoules, écran) est purement visuel : jamais dans la simulation.
// ===========================================================================
const GPX = PX2; // taille d'un pixel d'art des décors (2 pixels du jeu), comme la nuit et le désert
// les plans du décor, du plus loin au plus près (f = part du mouvement de la caméra ; > 1 : devant le terrain)
const GALA_PLANES = { key: 'bg_gala', scale: GPX, list: [{ id: 'sky', f: 0.04 }, { id: 'hill', f: 0.14 }, { id: 'town', f: 0.3 }, { id: 'palace', f: 0.5 }, { id: 'crowd', f: 1.15 }] };
const GALA = {
  mainH: 104,
  // x en fraction de la demi-largeur du terrain, top = hauteur du dessus au-dessus du sol (px), h = épaisseur (px),
  // wall = face qui fait mur (-1 gauche, 1 droite, 0 aucune)
  plats: [
    { id: 'loge', a: -0.94, b: -0.46, top: 190, h: 40, wall: -1, shield: false },
    { id: 'ecran', a: -0.6, b: -0.12, top: 320, h: 32, wall: 0, shield: true }, // (à gauche de la tour : ne cache pas le sigle)
    { id: 'balcon', a: 0.46, b: 0.94, top: 330, h: 40, wall: 1, shield: false },
    { id: 'scene', a: 0.44, b: 0.94, top: 128, h: 36, wall: 0, shield: false }, // (pas 110 : les bots y restaient bloqués à égalité ; pas de mur : il gênait le saut depuis le rebord droit)
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
    const FW = Math.min(150, cx - 12); // demi-largeur du palais
    const roof = by - 118; // le palais est bas : au-dessus du parvis, rien que lui ; sa petite tour porte le sigle
    const scr = { x0: cx - 58, x1: cx + 58, y0: by - 108, y1: by - 56 }; // écran géant
    const sig = { x: cx, y: by - 160, r: 13 }; // le sigle illuminé en haut de la tour
    const mainB = by + GALA.mainH / GPX; // bas du parvis
    return { w, h, cx, by, FW, F0: cx - FW, F1: cx + FW, roof, scr, sig, mainB };
  },

  // ----- dessin (une fois par taille d'écran) : 5 plans pour la parallaxe -----
  buildGala() {
    if (typeof GALA_PIX === 'undefined') return;
    const A = this.galaArt();
    const { w, h, cx, by, F0, F1, FW, scr, roof } = A;
    const geo = this.galaGeom();
    const sig = this.W + 'x' + h + ':' + w + JSON.stringify(GALA.plats);
    // palette sombre (nuit + brume) : pierre presque noire, lumières chaudes
    const S0 = '#0e0b11', S1 = '#18131a', S2 = '#231c24', S3 = '#33292f', S4 = '#4a3c3e';
    const D0 = '#4a3416', D1 = '#7a5a24', D2 = '#b88a3a', D3 = '#e8c070'; // or terni
    const W0 = '#7a4a22', W1 = '#b8743a', W2 = '#e8a65a', W3 = '#ffd890'; // fenêtres éclairées
    this.makePlanes('bg_gala', w, h, ['sky', 'hill', 'town', 'palace', 'crowd'], (c, sec) => {
      let seed = 11;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      const R = (x, y, ww, hh, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(ww), Math.round(hh)); };
      const P = (x, y, col) => R(x, y, 1, 1, col);
      const disc = (x, y, r, col) => { for (let yy = -r; yy <= r; yy++) { const hw = Math.round(Math.sqrt(r * r - yy * yy)); R(x - hw, y + yy, hw * 2 + 1, 1, col); } };
      // ================= CIEL =================
      sec('sky');
      const sky = [[4, 5, 12], [10, 10, 26], [22, 20, 44], [34, 28, 58]];
      for (let y = 0; y < h; y++) {
        const t = Math.min(1, Math.max(0, y / Math.max(1, by - 20)));
        const q = Math.floor(t * 12) / 12;
        const seg = Math.min(2, Math.floor(q * 3)), u = q * 3 - seg;
        const a = sky[seg], b = sky[seg + 1];
        R(0, y, w, 1, `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * u)).join(',')})`);
      }
      for (let i = 0; i < w * 0.25; i++) {
        const x = Math.floor(rnd() * w), y = Math.floor(rnd() * (by - 120));
        P(x, y, rnd() > 0.85 ? '#c8c0e0' : '#4a4680');
      }
      // ================= COLLINE ET CHÂTEAU (loin, dans la brume) =================
      sec('hill');
      const right = w - F1 > 90;
      const hx = right ? F1 + (w - F1) * 0.55 : w * 0.8, hy = by - 196;
      for (let x = 0; x < w; x++) {
        const dxh = (x - hx) / 95;
        const top = hy + 22 + Math.round(dxh * dxh * 46 + Math.sin(x * 0.17) * 2);
        if (top < h) R(x, top, 1, h - top, '#100f24');
      }
      [[-26, 12, 8], [-16, 22, 7], [-6, 34, 9], [6, 26, 8], [16, 18, 7], [26, 10, 6]].forEach(([dx, hh, ww]) => {
        R(hx + dx - ww / 2, hy + 22 - hh, ww, hh, '#151332');
        if (hh > 20) { R(hx + dx - 1, hy + 22 - hh - 8, 2, 8, '#151332'); P(hx + dx, hy + 22 - hh - 10, '#151332'); }
        for (let k = 0; k < hh - 4; k += 4) if (rnd() > 0.5) P(hx + dx - ww / 2 + 2 + Math.floor(rnd() * (ww - 3)), hy + 25 - hh + k, rnd() > 0.5 ? W2 : W1);
      });
      for (let i = 0; i < w * 0.5; i++) {
        const x = Math.floor(rnd() * w), y = by - 64 + Math.floor(rnd() * 34);
        P(x, y, rnd() > 0.6 ? W1 : rnd() > 0.5 ? '#5a6aa8' : W0);
      }
      // ================= LA VILLE : aile gauche (balcon, bannière en biais), immeuble bleu =================
      sec('town');
      if (F0 > 20) {
        const lx1 = F0 + 2, top = by - 96;
        R(0, top, lx1, h - top, '#151018');
        R(0, top, lx1, 2, '#2c2228');
        R(0, top + 2, lx1, 1, D0);
        for (let x = 8; x < lx1 - 14; x += 26)
          for (const y0 of [by - 86, by - 46]) {
            const lit = rnd() > 0.35;
            R(x - 1, y0 - 1, 14, 26, '#0a080c');
            for (let y = y0; y < y0 + 24; y++) R(x, y, 12, 1, lit ? (y < y0 + 8 ? W2 : y < y0 + 16 ? W1 : W0) : '#2a2026');
            R(x + 5, y0, 2, 24, '#0a080c');
            R(x + 1, y0 - 2, 10, 1, '#2c2228');
          }
        R(0, by - 56, lx1, 3, '#2c2228');
        for (let x = 2; x < lx1; x += 4) R(x, by - 62, 1, 6, '#2c2228');
        R(0, by - 63, lx1, 1, '#3a3036');
        for (let x = 14; x < lx1 - 8; x += 19 + Math.floor(rnd() * 8)) { R(x, by - 70, 4, 8, '#08060a'); R(x + 1, by - 74, 3, 4, '#08060a'); }
        // la bannière sur potence, perpendiculaire au mur : vue de biais (le bord libre, plus près, est plus grand)
        if (F0 > 70) {
        const qx0 = Math.max(6, F0 - 104), qx1 = qx0 + 46;
        R(qx0 - 2, by - 96, qx1 - qx0 + 8, 2, D1);
        R(qx1 + 4, by - 98, 2, 6, D0);
        galaWarp(c, galaBanner('short'), [[qx0, by - 94], [qx1, by - 88], [qx1, by - 12], [qx0, by]], { k: '#0a0810', a: '#6a4a1e', b: '#9c7430', c: '#d0aa60', g: '#5e5c6c', h: '#8e8c9c', i: '#bdbbc8', r: '#3a0a14', y: '#8a6428' });
        }
      }
      if (right) {
        const bx0 = F1 - 2, top = by - 84;
        R(bx0, top, w - bx0, h - top, '#0d1128');
        R(bx0, top, w - bx0, 2, '#1a2248');
        for (let y = top + 8; y < by - 6; y += 9)
          for (let x = bx0 + 6; x < w - 6; x += 9) {
            const lit = rnd();
            R(x, y, 6, 6, lit > 0.6 ? '#5a74c0' : lit > 0.3 ? '#1e2a58' : '#0a0e22');
            if (lit > 0.6) R(x, y, 6, 1, '#8aa4e8');
          }
      }
      // ================= LE PALAIS (bas), sa tour et son sigle =================
      sec('palace');
      R(F0, roof, FW * 2, h - roof, S2);
      // balustrade du toit
      R(F0 - 2, roof - 7, FW * 2 + 4, 1, S4);
      R(F0 - 2, roof - 6, FW * 2 + 4, 1, S3);
      for (let x = F0; x < F1; x += 4) R(x, roof - 5, 2, 5, S3);
      // corniche
      R(F0 - 4, roof, FW * 2 + 8, 1, D2);
      R(F0 - 4, roof + 1, FW * 2 + 8, 2, D0);
      R(F0 - 4, roof + 3, FW * 2 + 8, 3, S1);
      for (let x = F0 - 2; x < F1 + 2; x += 4) R(x, roof + 3, 2, 2, S3);
      // la tour : socle, tambour, le sigle tout en haut (son éclat est ajouté par dessus, voir galaAmbience)
      const tx = cx;
      R(tx - 22, roof - 20, 44, 20, S2);
      R(tx - 22, roof - 20, 44, 1, S4);
      R(tx - 22, roof - 19, 2, 19, S3);
      R(tx + 20, roof - 19, 2, 19, S1);
      for (let x = tx - 16; x < tx + 16; x += 8) { R(x, roof - 15, 4, 10, '#0a080c'); R(x, roof - 15, 4, 4, W1); R(x, roof - 11, 4, 6, W0); }
      R(tx - 24, roof - 22, 48, 2, D1);
      R(tx - 14, roof - 30, 28, 8, S3);
      R(tx - 14, roof - 30, 28, 1, D2);
      R(tx - 16, roof - 22, 32, 1, S1);
      R(tx - 3, roof - 33, 6, 3, D1);
      const s = A.sig;
      disc(s.x, s.y, s.r + 1, '#08060a');
      disc(s.x, s.y, s.r, D1);
      disc(s.x, s.y, s.r - 1, '#0a0810');
      galaSpr(c, 'sig23', s.x - 11, s.y - 11, { k: '#0a0810', a: '#c08a30', b: '#ffcf60', c: '#fff4c8' });
      R(s.x - 1, s.y - s.r - 5, 2, 4, D2);
      P(s.x, s.y - s.r - 7, D3);
      // pilastres
      const pil = (x) => {
        R(x, roof + 6, 10, by - roof - 6, S3);
        R(x, roof + 6, 2, by - roof - 6, S4);
        R(x + 8, roof + 6, 2, by - roof - 6, S1);
        R(x - 1, roof + 6, 12, 3, D1);
      };
      // hautes fenêtres de part et d'autre de l'écran (certaines éteintes)
      for (const [x0, x1] of [[F0 + 16, scr.x0 - 20], [scr.x1 + 20, F1 - 14]])
        for (let x = x0; x + 12 <= x1; x += 20) {
          const lit = rnd() > 0.3;
          R(x, by - 104, 12, 46, '#0a080c');
          for (let y = by - 102; y < by - 60; y++) R(x + 2, y, 8, 1, lit ? (y < by - 88 ? W2 : y < by - 74 ? W1 : W0) : '#251c22');
          for (let y = by - 94; y < by - 60; y += 9) R(x + 2, y, 8, 1, S1);
          R(x + 5, by - 102, 2, 42, S1);
          // et en dessous, au rez-de-chaussée
          R(x, by - 38, 12, 30, '#0a080c');
          for (let y = by - 36; y < by - 10; y++) R(x + 2, y, 8, 1, lit && rnd() > 0.4 ? W0 : '#1e171c');
        }
      [F0 + 2, scr.x0 - 16, scr.x1 + 6, F1 - 12].forEach(pil);
      // l'écran géant (l'image est posée par dessus) et son cadre
      R(scr.x0 - 5, scr.y0 - 5, scr.x1 - scr.x0 + 10, scr.y1 - scr.y0 + 10, S0);
      R(scr.x0 - 4, scr.y0 - 4, scr.x1 - scr.x0 + 8, scr.y1 - scr.y0 + 8, D1);
      R(scr.x0 - 4, scr.y0 - 4, scr.x1 - scr.x0 + 8, 1, D2);
      R(scr.x0 - 2, scr.y0 - 2, scr.x1 - scr.x0 + 4, scr.y1 - scr.y0 + 4, D0);
      R(scr.x0, scr.y0, scr.x1 - scr.x0, scr.y1 - scr.y0, '#06040f');
      // linteau, portes éclairées (tamisées : les combattants passent devant), colonnes, lanternes
      R(F0, by - 50, FW * 2, 3, D0);
      R(F0, by - 47, FW * 2, 2, S3);
      [cx - 46, cx - 36, cx + 26, cx + 36].forEach((x) => { R(x, by - 45, 10, 45, S3); R(x + 2, by - 45, 4, 45, S4); R(x + 8, by - 45, 2, 45, S1); R(x - 1, by - 45, 12, 2, D1); });
      R(cx - 26, by - 42, 52, 42, '#0a080c');
      for (let y = by - 40; y < by; y++) R(cx - 24, y, 48, 1, y < by - 30 ? W2 : y < by - 16 ? W1 : W0);
      R(cx - 1, by - 40, 2, 40, '#3a2414');
      R(cx - 13, by - 40, 1, 40, '#5a3a1c');
      R(cx + 12, by - 40, 1, 40, '#5a3a1c');
      R(cx - 24, by - 26, 48, 1, '#5a3a1c');
      [cx - 54, cx + 53].forEach((x) => { R(x - 2, by - 34, 5, 6, W3); R(x - 2, by - 35, 5, 1, D2); R(x, by - 28, 1, 5, D1); });
      // petites marches et tapis rouge jusqu'aux portes
      for (let i = 0; i < 3; i++) { R(cx - 30 - i * 4, by - 6 + i * 2, 60 + i * 8, 2, i % 2 ? S3 : S4); }
      R(cx - 12, by - 6, 24, 6, GC.red1);
      R(cx - 12, by - 6, 24, 1, GC.red2);
      // limousine garée à droite, palmiers
      if (right) {
        const lx = F1 + 6, ly = by - 2;
        R(lx + 6, ly - 14, 60, 6, '#0a0910');
        R(lx, ly - 9, 76, 9, '#07060b');
        R(lx + 8, ly - 13, 56, 1, '#34344a');
        for (let x = lx + 10; x < lx + 62; x += 13) R(x, ly - 13, 10, 4, '#1a2040');
        R(lx, ly - 9, 76, 1, '#3a3a50');
        [lx + 12, lx + 60].forEach((x) => R(x - 4, ly - 3, 8, 5, '#030206'));
        R(lx + 74, ly - 7, 2, 2, W3);
      }
      const palm = (px, py, k) => {
        const n = Math.round(60 * k);
        for (let i = 0; i < n; i++) {
          const x = px + Math.round(Math.sin((i / n) * 1.6) * 6 * k), tw = Math.max(3, Math.round((4 - i / n) * k));
          R(x, py - i, tw, 1, i % 3 === 0 ? '#0a0806' : '#1c140e');
        }
        const ttx = px + Math.round(Math.sin(1.6) * 6 * k) + 1, tty = py - n;
        [[-1, 0.9], [1, 0.9], [-1, 0.45], [1, 0.45], [-0.6, 1.25], [0.6, 1.25], [-1, 0.1], [1, 0.1]].forEach(([dir, lift]) => {
          const len = Math.round(26 * k * (lift > 1 ? 0.7 : 1));
          for (let i = 0; i < len; i++) {
            const t = i / len;
            const x = Math.round(ttx + dir * i), y = Math.round(tty - lift * 10 * k * Math.sin(t * Math.PI * 0.75) + t * t * 14 * k);
            R(x, y, 2, 1, t < 0.3 ? '#1e3a26' : '#14281c');
            if (i % 2 === 0 && t > 0.1) for (let l = 1; l <= 4 - Math.round(t * 2); l++) P(x + dir * Math.round(l * 0.5), y + l, '#0e1c14');
          }
        });
      };
      if (F0 > 40) palm(F0 - 28, by + 4, 1.15);
      if (right) palm(F1 + 92, by + 4, 1.05);
      // ================= LE PUBLIC, à l'horizontale sous le parvis =================
      sec('crowd');
      const y0 = by + 4;
      R(0, y0, w, h - y0, '#0a0810');
      for (let y = y0 + 3, row = 0; y < h + 12; row++) {
        const d = y - y0;
        const r = 3 + Math.floor(d / 45); // les têtes grossissent vers nous
        const far = Math.max(0, 1 - d / 150); // les rangs du fond sont pris dans la brume
        const body = far > 0.6 ? '#2e2440' : far > 0.3 ? '#211a2e' : '#130f1a';
        const shade = far > 0.6 ? '#251d34' : far > 0.3 ? '#191424' : '#0c0a12';
        const rim = d < 70 ? (row % 2 ? '#d08a5a' : '#b0704a') : far > 0 ? '#6a5070' : '#3a2e44';
        for (let x = (row % 2) * (r + 2) - r; x < w + r; x += 2 * r + 3 + Math.floor(rnd() * 3)) {
          const hy = y - Math.floor(rnd() * 3);
          R(x - r - 2, hy + r, 2 * r + 5, r * 3, body); // épaules
          R(x - r - 2, hy + r + 2, 2 * r + 5, r * 3, shade);
          if (rnd() > 0.7) R(x - 1, hy + r + 1, 3, r * 2, rnd() > 0.5 ? '#3a2a3a' : '#2a2a44'); // chemise, cravate…
          disc(x, hy, r, body); // tête
          R(x - r + 1, hy - r, 2 * r - 1, 1, rim); // la lumière du parvis sur les têtes
          P(x - r, hy - r + 1, rim);
          P(x + r, hy - r + 1, rim);
          if (rnd() > 0.93) R(x + r + 1, hy - 2 * r - 2, 2, 2 * r + 3, body); // un bras levé
        }
        y += 2 * r + 2 + Math.floor(r * 0.6);
      }
    }, 'raw', sig);

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
      const L0 = GALA_PIX.logo;
      galaSpr(c, L0, (sw - L0[0].length) / 2, (sh - L0.length) / 2, PAL_GOLD);
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
    // halo doux (lumières dans la brume) et nappe de brume
    if (!this.textures.exists('gala_glow')) {
      const t = this.textures.createCanvas('gala_glow', 128, 128);
      const c = t.getContext();
      const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
      g.addColorStop(0.6, 'rgba(255,255,255,0.15)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, 128, 128);
      t.refresh();
      t.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
    if (!this.textures.exists('gala_fog')) {
      const t = this.textures.createCanvas('gala_fog', 256, 64);
      const c = t.getContext();
      for (let x = 0; x < 256; x++) {
        const k = 0.65 + 0.2 * Math.sin(x * 0.05) + 0.15 * Math.sin(x * 0.13 + 1);
        for (let y = 0; y < 64; y++) {
          const v = Math.sin((y / 63) * Math.PI);
          c.fillStyle = `rgba(255,255,255,${(Math.pow(v, 1.6) * k).toFixed(3)})`;
          c.fillRect(x, y, 1, 1);
        }
      }
      t.refresh();
      t.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
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

  // ----- vie du décor (purement visuel, jamais dans la simulation) : brume, halos, écran, sigle qui s'illumine -----
  galaAmbience() {
    const A = this.galaArt(), fx = this.stageFx, W = this.W;
    const keep = (o) => (fx.push(o), o);
    const P = (id, o) => keep(this.toPlane(id, o));
    const ADD = Phaser.BlendModes.ADD;
    // halo lumineux (doux, il « bave » dans la brume)
    const glow = (id, x, y, ww, hh, tint, a) => P(id, this.add.image(x, y, 'gala_glow').setDisplaySize(ww, hh).setTint(tint).setAlpha(a).setBlendMode(ADD).setDepth(-7));
    // nappe de brume
    const fog = (id, y, hh, tint, a, ww) => P(id, this.add.image(W / 2, y, 'gala_fog').setDisplaySize(ww || W * 1.4, hh).setTint(tint).setAlpha(a).setDepth(-7));
    const pulse = (o, a1, ms) => keep(this.tweens.add({ targets: o, alpha: a1, duration: ms, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
    const by = A.by * GPX, cx = A.cx * GPX;
    // ciel : projecteurs qui balaient, très voilés
    [[A.F0 + 30, 1, 0], [A.F1 - 30, -1, 1]].forEach(([xa, s, k]) => {
      const beam = P('sky', this.add.image(xa * GPX, (A.roof - 4) * GPX, 'gala_beam').setOrigin(0.5, 1).setAlpha(0.09).setBlendMode(ADD));
      beam.setDisplaySize(110, Math.max(560, (A.roof - 4) * GPX + 80));
      beam.angle = s * 18;
      keep(this.tweens.add({ targets: beam, angle: -s * 14, duration: 7000 + k * 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
    });
    // brume lointaine sur la colline et la ville
    fog('hill', by - 120, 260, 0x6a6898, 0.45);
    fog('town', by - 40, 240, 0x7a72a2, 0.35);
    // le palais : halos des portes, des lanternes, de l'écran ; le sigle de la tour qui s'illumine
    glow('palace', cx, by - 40, 300, 170, 0xff9a48, 0.28);
    [A.cx - 54, A.cx + 53].forEach((x) => pulse(glow('palace', x * GPX + 1, by - 62, 70, 70, 0xffb060, 0.45), 0.3, 1800 + x));
    glow('palace', cx, ((A.scr.y0 + A.scr.y1) / 2) * GPX, (A.scr.x1 - A.scr.x0) * GPX + 160, (A.scr.y1 - A.scr.y0) * GPX + 120, 0x8aa0ff, 0.14);
    const sx = A.sig.x * GPX, sy = A.sig.y * GPX;
    const halo = glow('palace', sx, sy, 150, 150, 0xffc860, 0.5);
    const core = glow('palace', sx, sy, 64, 64, 0xfff0c0, 0.55);
    pulse(halo, 0.95, 2200);
    pulse(core, 0.9, 2200);
    // un rayon de lumière monte du sigle dans la brume
    const ray = P('palace', this.add.image(sx, sy - 6, 'gala_beam').setOrigin(0.5, 1).setDisplaySize(70, sy + 40).setTint(0xffd890).setAlpha(0.1).setBlendMode(ADD));
    pulse(ray, 0.2, 2200);
    // l'écran : le logo, un plan de film, puis « EN DIRECT » avec chaque combattant…
    const s = A.scr;
    const scrImg = P('palace', this.add.image(s.x0 * GPX, s.y0 * GPX, 'gala_scr_logo').setOrigin(0).setScale(GPX));
    const live = this.toPlane('palace', this.add.container(0, 0).setVisible(false));
    keep({ remove: () => live.destroy() }); // (un Container a déjà une méthode remove : on l'enveloppe)
    const scrX = ((s.x0 + s.x1) / 2) * GPX, top = s.y0 * GPX, sh = (s.y1 - s.y0) * GPX;
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
      live.add(this.add.rectangle(s.x0 * GPX, top, (s.x1 - s.x0) * GPX, sh, 0x06040f).setOrigin(0));
      const key = `${pl.char}_idle0`;
      if (this.textures.exists(key)) live.add(this.add.image(scrX, top + sh / 2 + 2, key).setScale(0.8));
      live.add(this.add.text(scrX, top + 4, '● EN DIRECT', { fontFamily: FONT, fontSize: '16px', color: '#ff5a6e' }).setOrigin(0.5, 0));
      live.add(this.add.text(scrX, top + sh - 3, (pl.def && pl.def.name ? pl.def.name : pl.char).toUpperCase(), { fontFamily: FONT, fontSize: '16px', color: '#e0c27a' }).setOrigin(0.5, 1));
    };
    keep(this.time.addEvent({ delay: 4000, loop: true, callback: showScreen }));
    // ampoules autour de l'écran : chenillard (3 images toutes faites qu'on alterne)
    const pts = [];
    for (let x = s.x0 - 3; x <= s.x1 + 2; x += 3) pts.push([x, s.y0 - 4], [x, s.y1 + 3]);
    for (let y = s.y0 - 1; y <= s.y1; y += 3) pts.push([s.x0 - 4, y], [s.x1 + 3, y]);
    const bx0 = s.x0 - 4, by0 = s.y0 - 4, bw = s.x1 - s.x0 + 8, bh = s.y1 - s.y0 + 8;
    for (let ph = 0; ph < 3; ph++)
      mkCanvas(this, 'gala_bulbs' + ph, bw, bh, (c) => pts.forEach(([x, y], i) => {
        c.fillStyle = (i + ph) % 3 ? GC.warm2 : '#4a3416';
        c.fillRect(x - bx0, y - by0, 1, 1);
      }), 'raw');
    const bulbs = P('palace', this.add.image(bx0 * GPX, by0 * GPX, 'gala_bulbs0').setOrigin(0).setScale(GPX));
    let phase = 0;
    keep(this.time.addEvent({ delay: 220, loop: true, callback: () => bulbs.active && bulbs.setTexture('gala_bulbs' + (++phase % 3)) }));
    // brume au pied du palais, et quelques nappes qui dérivent lentement devant lui
    fog('palace', by - 10, 150, 0x8a82b0, 0.4);
    fog('palace', by - 150, 160, 0x6e6896, 0.14);
    for (let i = 0; i < 4; i++) {
      const wisp = P('palace', this.add.image(W * (0.15 + 0.25 * i), by - 120 + i * 34, 'gala_fog').setDisplaySize(W * 0.55, 80).setTint(0x9a92c0).setAlpha(0.12));
      keep(this.tweens.add({ targets: wisp, x: wisp.x + (i % 2 ? -120 : 120), duration: 16000 + i * 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
    }
    // le public : brume derrière lui, lumière des lampes du parvis sur les premiers rangs, téléphones, flashs
    fog('crowd', by + 30, 130, 0x7a70a0, 0.38);
    fog('crowd', by + 200, 240, 0x4a4468, 0.3);
    glow('crowd', cx, A.mainB * GPX + 20, L.mainW + 200, 120, 0xffa860, 0.16);
    const crowdY = (y) => Math.min(this.H - 6, y);
    const phones = [];
    for (let i = 0; i < 14; i++) {
      const x = Math.round((Math.random() * this.W) / GPX) * GPX, y = crowdY(Math.round((by + 16 + Math.random() * (this.H - by - 20)) / GPX) * GPX);
      const ph = P('crowd', this.add.rectangle(x, y, 4, 6, 0xcfe0ff).setAlpha(0));
      const g = glow('crowd', x, y, 34, 34, 0x9ab8ff, 0);
      phones.push([ph, g]);
    }
    keep(this.time.addEvent({
      delay: 300, loop: true,
      callback: () => phones.forEach(([ph, g]) => {
        if (!ph.active || Math.random() > 0.12) return;
        const on = ph.alpha < 0.5;
        ph.setAlpha(on ? 1 : 0);
        g.setAlpha(on ? 0.5 : 0);
      }),
    }));
    keep(this.time.addEvent({
      delay: 150, loop: true,
      callback: () => {
        if (Math.random() > 0.45) return;
        const x = Math.round((Math.random() * this.W) / GPX) * GPX;
        const yMin = by + 12, y = Math.round((yMin + Math.random() * Math.max(10, Math.min(this.H, by + 420) - yMin)) / GPX) * GPX;
        const sp = this.toPlane('crowd', this.add.image(x, y, 'gala_spark').setScale(GPX).setBlendMode(ADD));
        const gl = this.toPlane('crowd', this.add.image(x, y, 'gala_glow').setDisplaySize(90, 90).setTint(0xe8eeff).setAlpha(0.6).setBlendMode(ADD));
        this.tweens.add({ targets: [sp, gl], alpha: 0, duration: 220, onComplete: () => { sp.destroy(); gl.destroy(); } });
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
