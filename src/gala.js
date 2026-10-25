// ===========================================================================
// ARÈNE « CÉRÉMONIE » : la montée des marches d'un palais du cinéma, un soir de remise de prix
// (les LUCAS D'OR). Le terrain principal ne change pas (mêmes bords, mêmes rebords, mêmes zones de KO) ;
// les plateformes, elles, sont propres à l'arène :
//   - LA LOGE (à gauche, plus basse) : un balcon de théâtre, épais. On le traverse par dessous et on en descend
//     (BAS tenu) comme une plateforme, mais sa face EXTÉRIEURE (côté vide) est un mur, et on s'accroche à ses
//     coins en tombant le long du bloc, joystick poussé vers lui (mêmes règles que le rebord du terrain) ;
//   - LA CORNICHE (à droite, plus haute, plus étroite) : une avancée de pierre de l'aile droite, mêmes règles ;
//   (pas de plafond plein ni de mur côté centre : un perso éjecté ne doit pas être « sauvé » par le décor)
//   - LA PASSERELLE (en haut à gauche, au-dessus de la loge) : la rampe de projecteurs, ajourée = on la traverse
//     par dessous et on en descend (bas), comme les plateformes des autres arènes.
// Tout ce qui bouge (flashs, projecteurs, ampoules, écran) est purement visuel : jamais dans la simulation.
// ===========================================================================
const GALA = {
  // x en fraction de la demi-largeur du terrain, top = hauteur du dessus au-dessus du sol (px), h = épaisseur (px)
  loge: { a: -0.95, b: -0.5, top: 210, h: 56 },
  corn: { a: 0.53, b: 0.92, top: 250, h: 48 },
  pass: { a: -0.74, b: -0.27, top: 335, h: 24 }, // à gauche de l'écran : ne cache pas le logo
};

Object.assign(GameScene.prototype, {
  // géométrie des plateformes de la CÉRÉMONIE (identique sur les deux téléphones : ne dépend que de L)
  galaGeom() {
    const cx = this.W / 2, H2 = L.mainW / 2, by = L.baseY;
    return [['loge', 'gala_loge'], ['corn', 'gala_corn'], ['pass', 'gala_pass']].map(([k, key]) => {
      const g = GALA[k];
      const x0 = Math.round((cx + g.a * H2) / PX) * PX;
      const tw = Math.round(((g.b - g.a) * H2) / PX);
      return { id: k, key, x0, x1: x0 + tw * PX, tw, top: by - g.top, h: g.h, soft: k === 'pass' };
    });
  },

  // logo / sigle des LUCAS D'OR réduits proprement (par moitiés successives, lissés) à px de haut à l'écran.
  // Texture deux fois plus fine que l'affichage : reste net quand la caméra zoome. Jamais déformé (même rapport).
  galaDecal(src, px) {
    const key = `lucas_${src}_${px}`;
    if (this.textures.exists(key)) return key;
    const im = typeof GALA_IMG !== 'undefined' && GALA_IMG[src];
    if (!im) return null;
    const hh = px * 2, ww = Math.max(1, Math.round((im.width * hh) / im.height));
    let cur = im, cw = im.width, ch = im.height;
    while (cw / 2 >= ww && ch / 2 >= hh) {
      const t = document.createElement('canvas');
      t.width = Math.round(cw / 2);
      t.height = Math.round(ch / 2);
      const c = t.getContext('2d');
      c.imageSmoothingEnabled = true;
      c.imageSmoothingQuality = 'high';
      c.drawImage(cur, 0, 0, t.width, t.height);
      cur = t;
      cw = t.width;
      ch = t.height;
    }
    const tex = this.textures.createCanvas(key, ww, hh);
    const c = tex.getContext();
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
    c.drawImage(cur, 0, 0, ww, hh);
    tex.refresh();
    tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
    return key;
  },

  // repères du décor (en pixels d'art) partagés entre le dessin du fond et les images posées dessus
  galaArt() {
    const w = Math.ceil(this.W / PX), h = Math.ceil(this.H / PX);
    const cx = Math.round(this.W / 2 / PX), by = Math.round(L.baseY / PX);
    const PW = Math.min(130, Math.floor(w / 2) - 2); // demi-largeur du palais
    const yR = by - 112; // haut de la corniche du toit
    const scr = { x0: cx - 46, x1: cx + 46, y0: by - 98, y1: by - 44 }; // écran géant
    const ban = [cx - 58, cx + 58]; // bannières
    const stairTop = by + 14;
    // demi-largeur de la i-ème marche (s'évase vers le bas, mais laisse toujours de la place à la foule)
    const H2a = Math.round(L.mainW / 2 / PX);
    const stairHW = (i) => Math.min(H2a + 2 + i * 3, Math.max(H2a + 2, Math.floor(w / 2) - 16));
    // chevalet de l'affiche, au bord gauche des marches, en bas
    // 12 marches au plus, puis une esplanade (écran en hauteur) : la foule y borde le tapis
    const NSTEP = 12, plazaY = stairTop + NSTEP * 5;
    const edgeAt = (y) => (y < plazaY ? stairHW(Math.floor((y - stairTop) / 5)) + 3 : 32);
    const ey = h - 14, ex = Math.max(7, cx - edgeAt(ey) - 9);
    return { w, h, cx, by, PW, yR, scr, ban, stairTop, stairHW, NSTEP, plazaY, edgeAt, easel: { ex, ey } };
  },

  // images posées sur le décor : { key, x, y, s (hauteur à l'écran), depth } en pixels du monde
  galaDecals() {
    const A = this.galaArt(), out = [];
    const add = (src, px, x, y, depth, role) => {
      const key = this.galaDecal(src, px);
      if (key) out.push({ key, x, y, px, depth, role });
    };
    // l'écran géant : le logo complet (le plus visible)
    add('logo', Math.round((A.scr.y1 - A.scr.y0) * PX * 0.86), A.cx * PX, ((A.scr.y0 + A.scr.y1) / 2) * PX, -9, 'screen');
    // fronton : le sigle en or
    add('sigle', 40, A.cx * PX, (A.yR - 3) * PX, -9);
    // bannières rouges de la façade
    A.ban.forEach((bx) => add('sigle', 22, (bx + 0.5) * PX, (A.yR + 24) * PX, -9));
    // affiche sur un chevalet en bas des marches, côté gauche (pour les curieux)
    const { ex, ey } = A.easel;
    if (ey > A.stairTop + 10) add('logo', 30, ex * PX, ey * PX, -9);
    return out;
  },

  // décor posé sur les plateformes (au premier plan)
  galaFrontDecals() {
    const out = [], cx = this.W / 2, H2 = L.mainW / 2, by = L.baseY;
    const add = (src, px, x, y) => {
      const key = this.galaDecal(src, px);
      if (key) out.push({ key, x, y, px, depth: 6 });
    };
    // la contremarche du parvis : sigles en rangée, comme un mur de photocall
    [-0.72, -0.24, 0.24, 0.72].forEach((f) => add('sigle', 22, cx + f * H2, by + 36));
    // médaillon de la loge
    const lo = this.galaGeom()[0];
    add('sigle', 24, (lo.x0 + lo.x1) / 2, lo.top + 28);
    return out;
  },

  // ----- dessin (une fois, en pixels d'art agrandis x4) -----
  buildGala() {
    const A = this.galaArt();
    const { w, h, cx, by, PW, yR, scr } = A;
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const G = this.galaGeom();
    const toA = (v) => Math.round(v / PX);
    mkCanvas(this, 'bg_gala', w, h, (c) => {
      const R = (x, y, ww, hh, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(ww), Math.round(hh)); };
      // ciel de nuit : bleu nuit en haut, violet sourd près des toits (par bandes)
      const stops = [[6, 5, 22], [20, 14, 52], [44, 24, 70]];
      for (let y = 0; y < h; y++) {
        const t = Math.min(y / Math.max(1, by), 1);
        const q = Math.floor(t * 10) / 10;
        const seg = Math.min(1, Math.floor(q * 2)), u = q * 2 - seg;
        const a = stops[seg], b = stops[seg + 1];
        R(0, y, w, 1, `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * u)).join(',')})`);
      }
      for (let i = 0; i < w * 0.25; i++) R(Math.floor(rnd() * w), Math.floor(rnd() * yR * 1.2), 1, 1, rnd() > 0.8 ? '#fff4c8' : '#8f86b8');
      // au loin, sur les côtés : collines et palmiers en ombres
      for (let x = 0; x < w; x++) {
        const hy = by - 16 - Math.round(6 * Math.sin(x * 0.05) + 3 * Math.sin(x * 0.13));
        R(x, hy, 1, h - hy, '#140f26');
      }
      const palm = (px, py, k) => {
        for (let i = 0; i < 26 * k; i++) R(px + Math.round(Math.sin(i * 0.12) * 2), py - i, 2, 1, '#0c0918');
        const tx = px + Math.round(Math.sin(26 * k * 0.12) * 2), ty = py - Math.round(26 * k);
        [[-1, -0.2], [1, -0.2], [-1, 0.4], [1, 0.4], [-0.5, -0.8], [0.5, -0.8]].forEach(([dx, dy]) => {
          for (let i = 0; i < 9 * k; i++) R(tx + dx * i, ty + dy * i + (i * i) / (10 * k), 2, 1, '#0c0918');
        });
      };
      for (let x = 6; x < cx - PW - 4; x += 22) palm(x + Math.floor(rnd() * 6), by + 2, 0.9 + rnd() * 0.4);
      for (let x = w - 8; x > cx + PW + 4; x -= 22) palm(x - Math.floor(rnd() * 6), by + 2, 0.9 + rnd() * 0.4);
      // ---- le palais ----
      const L0 = cx - PW, L1 = cx + PW;
      R(L0, yR + 10, PW * 2, by - yR - 8, '#2b2238');
      // attique + fronton
      R(L0 + 6, yR + 4, PW * 2 - 12, 6, '#352a45');
      R(L0 + 6, yR + 4, PW * 2 - 12, 1, '#4c3e60');
      for (let i = 0; i <= 10; i++) R(cx - 34 + i * 3.4, yR + 4 - i, 68 - i * 6.8, 1, i === 10 ? '#c9a24e' : '#3d3050');
      for (let i = 0; i <= 10; i++) { R(cx - 34 + i * 3.4, yR + 4 - i, 1, 1, '#c9a24e'); R(cx + 33 - i * 3.4, yR + 4 - i, 1, 1, '#c9a24e'); }
      R(L0 + 2, yR + 10, PW * 2 - 4, 1, '#e0b85a');
      R(L0 + 2, yR + 11, PW * 2 - 4, 2, '#4a3d5c');
      R(L0 + 2, yR + 13, PW * 2 - 4, 1, '#8a6a2a');
      // colonnade et hautes fenêtres de part et d'autre de l'écran
      const colTop = yR + 15, colBot = by - 34;
      const cols = [];
      for (let x = L0 + 6; x + 5 <= scr.x0 - 4; x += 14) cols.push(x);
      for (let x = L1 - 11; x >= scr.x1 + 4; x -= 14) cols.push(x);
      cols.forEach((x) => {
        // fenêtre à droite de chaque colonne (côté gauche) ou à gauche (côté droit)
        const wx = x < cx ? x + 7 : x - 9;
        if (wx > L0 + 2 && wx + 7 < L1 - 2 && (wx + 7 < scr.x0 - 1 || wx > scr.x1 + 1)) {
          const lit = rnd();
          for (let y = colTop + 5; y < colBot - 2; y++) {
            const t = (y - colTop) / (colBot - colTop);
            R(wx, y, 7, 1, lit > 0.25 ? (t < 0.5 ? '#f4c06a' : '#c47e34') : t < 0.5 ? '#6a4a5a' : '#45304a');
          }
          for (let y = colTop + 9; y < colBot - 2; y += 5) R(wx, y, 7, 1, '#2b2238');
          R(wx + 3, colTop + 5, 1, colBot - colTop - 7, '#2b2238');
          R(wx - 1, colTop + 3, 9, 2, '#c9a24e');
        }
        R(x, colTop, 5, colBot - colTop, '#7d6f92');
        R(x, colTop, 1, colBot - colTop, '#a99cc0');
        R(x + 4, colTop, 1, colBot - colTop, '#544868');
        R(x - 1, colTop, 7, 2, '#e0b85a');
        R(x - 1, colBot - 2, 7, 2, '#544868');
      });
      // bannières rouges suspendues sous la corniche (le sigle y est posé par dessus)
      A.ban.forEach((bx) => {
        R(bx - 4, yR + 13, 9, 1, '#e0b85a');
        for (let y = yR + 14; y < yR + 38; y++) R(bx - 3, y, 7, 1, (y % 4) < 2 ? '#a3182f' : '#8c1228');
        R(bx - 3, yR + 14, 1, 24, '#6e0e20');
        R(bx + 3, yR + 14, 1, 24, '#6e0e20');
        for (let x = bx - 3; x <= bx + 3; x++) R(x, yR + 38 + (x % 2), 1, 1, '#e0b85a');
      });
      // l'écran géant (le logo y est posé par dessus) avec son cadre doré
      R(scr.x0 - 3, scr.y0 - 3, scr.x1 - scr.x0 + 6, scr.y1 - scr.y0 + 6, '#120e18');
      R(scr.x0 - 2, scr.y0 - 2, scr.x1 - scr.x0 + 4, scr.y1 - scr.y0 + 4, '#c9a24e');
      R(scr.x0 - 1, scr.y0 - 1, scr.x1 - scr.x0 + 2, scr.y1 - scr.y0 + 2, '#7a5a22');
      R(scr.x0, scr.y0, scr.x1 - scr.x0, scr.y1 - scr.y0, '#06040f'); // le noir du logo
      R(cx - 6, scr.y1 + 3, 12, by - 40 - scr.y1 - 3, '#211a2c');
      // entrée : marquise dorée et portes vitrées éclairées
      R(cx - 38, by - 41, 76, 1, '#ffe08a');
      R(cx - 38, by - 40, 76, 3, '#c9a24e');
      R(cx - 36, by - 37, 72, 1, '#5a4520');
      for (let d = -1; d <= 1; d++) {
        const dx = cx + d * 22 - 9;
        R(dx - 1, by - 34, 20, 36, '#161020');
        for (let y = by - 33; y < by + 2; y++) R(dx, y, 18, 1, y < by - 18 ? '#ffd98a' : '#d9963e');
        R(dx + 8, by - 33, 2, 35, '#161020');
        R(dx, by - 25, 18, 1, '#b07a30');
      }
      // derrière la LOGE : une niche à rideaux rouges percée dans la façade
      const lo = G[0], co = G[1];
      const lx0 = toA(lo.x0), lx1 = toA(lo.x1), ly = toA(lo.top);
      R(lx0 + 2, ly - 24, lx1 - lx0 - 4, 26, '#120c18');
      for (let y = ly - 22; y < ly + 2; y++) {
        const k = Math.max(0, Math.round((ly - 16 - y) * 1.6));
        for (let x = lx0 + 4; x < lx1 - 4; x++) R(x, y, 1, 1, x < lx0 + 4 + k || x >= lx1 - 4 - k ? ((x >> 1) % 2 ? '#7a1a30' : '#5a1020') : '#2a1828');
      }
      R(lx0 + 2, ly - 25, lx1 - lx0 - 4, 1, '#c9a24e');
      for (let x = lx0 + 6; x < lx1 - 6; x += 5) R(x, ly - 18 + ((x >> 2) % 2), 2, 2, '#ffe9a8');
      // derrière la CORNICHE : une porte-fenêtre éclairée
      const kx0 = toA(co.x0), kx1 = toA(co.x1), ky = toA(co.top);
      R(kx0 + 6, ky - 26, kx1 - kx0 - 12, 26, '#120c18');
      for (let y = ky - 24; y < ky; y++) R(kx0 + 8, y, kx1 - kx0 - 16, 1, y < ky - 14 ? '#ffd98a' : '#c98a3a');
      R(Math.round((kx0 + kx1) / 2) - 1, ky - 24, 2, 24, '#120c18');
      R(kx0 + 5, ky - 27, kx1 - kx0 - 10, 1, '#c9a24e');
      // ---- la montée des marches, sous le parvis ----
      const H2a = Math.round(L.mainW / 2 / PX);
      let y = A.stairTop, i = 0;
      R(0, by + 2, w, h - by - 2, '#120d1c');
      while (y < h && i < A.NSTEP) {
        const hw = A.stairHW(i), cw = Math.min(12 + i * 2, 24);
        R(cx - hw, y, hw * 2, 2, '#5a4c6c'); // marche
        R(cx - hw, y, hw * 2, 1, '#9c7a3a');
        R(cx - hw, y + 2, hw * 2, 3, '#2e2540'); // contremarche
        R(cx - cw, y, cw * 2, 2, '#c0283c'); // tapis rouge
        R(cx - cw, y, cw * 2, 1, '#e0475a');
        R(cx - cw, y + 2, cw * 2, 3, '#8a1426');
        R(cx - cw - 1, y, 1, 5, '#e0b85a');
        R(cx + cw, y, 1, 5, '#e0b85a');
        // poteaux dorés et cordons de velours, de chaque côté du tapis
        if (i % 2 === 0) [-1, 1].forEach((s) => {
          const px = cx + s * (cw + 5);
          R(px, y - 4, 1, 5, '#e0b85a');
          R(px - 1, y - 5, 3, 1, '#ffe08a');
        });
        if (i % 2 === 0 && y + 10 < h) [-1, 1].forEach((s) => {
          const px = cx + s * (cw + 5);
          for (let k = 0; k <= 10; k++) R(px + s * (k * 0.3), y - 3 + k + Math.round(Math.sin((k / 10) * Math.PI) * 1.5), 1, 1, '#a3182f');
        });
        y += 5;
        i++;
      }
      // esplanade (seulement si l'écran est assez haut) : le tapis continue tout droit
      if (y < h) {
        R(0, y, w, h - y, '#1d1628');
        for (let yy = y; yy < h; yy += 6) R(0, yy, w, 1, '#241c30');
        R(cx - 24, y, 48, h - y, '#b0203a');
        R(cx - 24, y, 48, 1, '#e0475a');
        R(cx - 25, y, 1, h - y, '#e0b85a');
        R(cx + 24, y, 1, h - y, '#e0b85a');
        for (let yy = y + 6; yy < h; yy += 10) [-1, 1].forEach((s) => { R(cx + s * 29, yy - 4, 1, 5, '#e0b85a'); R(cx + s * 29 - 1, yy - 5, 3, 1, '#ffe08a'); });
      }
      // foule et photographes, derrière une barrière dorée, de chaque côté des marches
      [-1, 1].forEach((s) => {
        let rowY = A.stairTop + 6;
        while (rowY < h + 6) {
          const edge = A.edgeAt(rowY);
          R(s < 0 ? 0 : cx + edge, rowY - 3, s < 0 ? cx - edge : w - cx - edge, 1, '#9c7a3a');
          for (let x = cx + s * (edge + 3); s < 0 ? x > -4 : x < w + 4; x += s * (5 + Math.floor(rnd() * 3))) {
            const hy = rowY - 2 - Math.floor(rnd() * 2);
            const col = rnd() > 0.5 ? '#0f0b18' : '#1b1527';
            R(x - 2, hy + 2, 5, 6, col); // épaules
            R(x - 1, hy - 1, 3, 3, col); // tête
            if (rnd() > 0.72) { R(x - 2 - s, hy - 1, 3, 2, '#2c2c38'); R(x - 2 - s + (s > 0 ? 0 : 2), hy - 1, 1, 1, '#7d86a8'); }
          }
          rowY += 9;
        }
      });
      // le chevalet de l'affiche (le logo y est posé par dessus)
      const { ex, ey } = A.easel;
      if (ey > A.stairTop + 10) {
        R(ex - 6, ey - 9, 12, 18, '#c9a24e');
        R(ex - 5, ey - 8, 10, 16, '#06040f');
        R(ex - 5, ey + 9, 1, 6, '#5a4520');
        R(ex + 4, ey + 9, 1, 6, '#5a4520');
      }
    });

    // ---- le parvis (terrain principal) : tapis rouge sur marbre, nez de marche doré ----
    const tw = Math.round(L.mainW / PX);
    mkCanvas(this, 'main_gala', tw, 14, (c) => {
      for (let y = 0; y < 14; y++)
        for (let x = 0; x < tw; x++) {
          const end = x < 3 || x >= tw - 3;
          let col;
          if (y <= 2) {
            if (end) col = y === 0 ? '#f2ecf8' : '#b8acc8';
            else if (x === 3 || x === tw - 4) col = '#e0b85a';
            else col = y === 0 ? '#ef5b6e' : (x + y) % 9 === 0 ? '#9c1830' : '#c0283c';
          } else if (y === 3) col = '#ffd27a';
          else if (y === 4) col = '#8a6a2a';
          else if (y === 13) col = '#120d18';
          else {
            col = '#3a2f4a';
            if ((x + y * 2) % 17 === 0 || (x - y * 3 + 400) % 23 === 0) col = '#54466a';
            if (x % 24 === 0 && y > 5 && y < 12) col = '#2a2236';
            if (y === 12) col = '#2a2236';
          }
          if ((x === 0 || x === tw - 1) && y >= 3) col = '#1a1424';
          c.fillStyle = col;
          c.fillRect(x, y, 1, 1);
        }
    });

    // ---- la LOGE : balcon de théâtre, velours rouge, bois sombre et moulures dorées ----
    const [lo, co, pa] = G;
    mkCanvas(this, 'gala_loge', lo.tw, lo.h / PX, (c) => {
      const tw2 = lo.tw, th = lo.h / PX;
      for (let y = 0; y < th; y++)
        for (let x = 0; x < tw2; x++) {
          let col;
          const corner = x < 2 || x >= tw2 - 2;
          if (y === 0) col = corner ? '#ffe9a8' : '#ef5b6e';
          else if (y === 1) col = corner ? '#ffd27a' : '#a81c34';
          else if (y === 2) col = '#e0b85a';
          else if (y === 3) col = '#2a1420';
          else if (y <= th - 4) {
            col = '#4a1e2c';
            // panneaux moulurés (le panneau du milieu, plus large, porte le médaillon)
            const mid = Math.floor(tw2 / 2), pw = 7;
            const inMid = Math.abs(x - mid) <= 4;
            const px = inMid ? -1 : (x - (x < mid ? 2 : mid + 6)) % (pw + 2);
            const frameY = y === 5 || y === th - 5;
            if (inMid) { if (Math.abs(x - mid) === 4 && y >= 5 && y <= th - 5) col = '#b8913e'; else if (frameY && Math.abs(x - mid) <= 4) col = '#b8913e'; }
            else if (px === 0 || px === pw) { if (y >= 5 && y <= th - 5) col = '#b8913e'; }
            else if (frameY && px > 0 && px < pw) col = '#b8913e';
            if (col === '#4a1e2c' && (x * 3 + y * 5) % 13 === 0) col = '#55243a';
          } else if (y === th - 3) col = '#c9a24e';
          else if (y === th - 2) col = '#2a1420';
          else col = x % 8 === 4 ? '#ffe9a8' : '#170b12';
          if ((x === 0 || x === tw2 - 1) && y >= 3) col = '#1a0a12';
          c.fillStyle = col;
          c.fillRect(x, y, 1, 1);
        }
    });
    // ---- la CORNICHE : pierre claire, denticules, filet doré ----
    mkCanvas(this, 'gala_corn', co.tw, co.h / PX, (c) => {
      const tw2 = co.tw, th = co.h / PX;
      for (let y = 0; y < th; y++)
        for (let x = 0; x < tw2; x++) {
          const corner = x < 2 || x >= tw2 - 2;
          let col;
          if (y === 0) col = corner ? '#ffe9a8' : '#efe6f4';
          else if (y <= 2) col = corner && y === 1 ? '#ffd27a' : '#b9aec8';
          else if (y === 3) col = '#6e6284';
          else if (y <= 6) col = x % 3 === 2 ? '#3a3348' : '#9488a8';
          else if (y === 7) col = '#5a4f6e';
          else if (y === 8) col = '#c9a24e';
          else if (y === th - 1) col = '#221c2c';
          else col = (x * 5 + y) % 11 === 0 ? '#5a4f6e' : '#4a4058';
          if ((x === 0 || x === tw2 - 1) && y >= 3) col = '#1a1424';
          c.fillStyle = col;
          c.fillRect(x, y, 1, 1);
        }
    });
    // ---- la PASSERELLE : grille de marche + poutre triangulée ajourée (on voit au travers) ----
    mkCanvas(this, 'gala_pass', pa.tw, pa.h / PX, (c) => {
      const tw2 = pa.tw;
      for (let x = 0; x < tw2; x++) {
        c.fillStyle = '#e4e8f2'; c.fillRect(x, 0, 1, 1);
        c.fillStyle = x % 3 === 0 ? '#4a5068' : '#7a8098'; c.fillRect(x, 1, 1, 1);
        c.fillStyle = '#4a5068'; c.fillRect(x, 5, 1, 1);
        const m = x % 8;
        c.fillStyle = '#5e6680';
        if (m === 0) c.fillRect(x, 2, 1, 3);
        const dy = m <= 4 ? Math.round(m * 0.5) : Math.round((8 - m) * 0.5);
        c.fillRect(x, 2 + dy, 1, 1);
      }
      c.fillStyle = '#2a2e40';
      c.fillRect(0, 0, 1, 6);
      c.fillRect(tw2 - 1, 0, 1, 6);
    });
    // projecteur suspendu (décor)
    mkCanvas(this, 'gala_spot', 5, 5, (c) => {
      const r = (x, y, ww, hh, col) => { c.fillStyle = col; c.fillRect(x, y, ww, hh); };
      r(2, 0, 1, 1, '#5e6680');
      r(0, 1, 5, 3, '#22242e');
      r(1, 1, 3, 1, '#3a3e50');
      r(1, 4, 3, 1, '#ffe9a8');
    });
    // flash d'appareil photo (étoile blanche)
    if (!this.textures.exists('gala_flash')) {
      const ft = this.textures.createCanvas('gala_flash', 44, 44);
      const c = ft.getContext();
      c.fillStyle = 'rgba(255,244,208,0.7)';
      c.fillRect(0, 20, 44, 4);
      c.fillRect(20, 0, 4, 44);
      c.fillStyle = '#ffffff';
      c.fillRect(16, 16, 12, 12);
      ft.refresh();
    }
    // faisceau de projecteur (fond) : triangle lumineux qui s'efface vers le haut
    if (!this.textures.exists('gala_beam')) {
      const bt = this.textures.createCanvas('gala_beam', 96, 512);
      const c = bt.getContext();
      for (let y = 0; y < 512; y++) {
        const u = 1 - y / 511; // 1 en haut
        const half = 3 + u * 45;
        const g = c.createLinearGradient(48 - half, 0, 48 + half, 0);
        const a = (1 - u) * 0.9 + 0.05;
        g.addColorStop(0, 'rgba(255,240,200,0)');
        g.addColorStop(0.5, `rgba(255,240,200,${a.toFixed(3)})`);
        g.addColorStop(1, 'rgba(255,240,200,0)');
        c.fillStyle = g;
        c.fillRect(48 - half, y, half * 2, 1);
      }
      bt.refresh();
      bt.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
  },

  // plateformes de la CÉRÉMONIE : créées / retirées quand on change d'arène
  setGalaGeom(on) {
    (this.galaPlats || []).forEach((p) => p.destroy());
    (this.galaDeco || []).forEach((o) => o.destroy());
    this.galaPlats = [];
    this.galaDeco = [];
    this.ledgeBlocks = [];
    (this.softPlats || []).forEach((p) => {
      p.stageOff = on;
      p.setVisible(!on);
      p.body.enable = !on;
    });
    if (!on || !this.textures.exists('gala_loge')) return;
    this.galaGeom().forEach((g) => {
      const p = this.platforms.create((g.x0 + g.x1) / 2, g.top + g.h / 2, g.key).setScale(PX).refreshBody();
      p.setDepth(5);
      // tout se traverse par dessous et se quitte par BAS tenu, comme les plateformes des autres arènes ;
      // les deux balcons (loge, corniche) ont en plus un mur (face extérieure) et des coins où s'accrocher
      p.soft = true;
      p.body.checkCollision.down = false;
      if (g.soft || GALA.walls === false) {
        p.body.checkCollision.left = false;
        p.body.checkCollision.right = false;
      } else {
        // seule la face EXTÉRIEURE (côté vide) est un mur : on s'y cogne en revenant de dehors, puis on attrape
        // le coin. La face intérieure se traverse : un perso éjecté depuis le centre n'est pas « sauvé » par un mur.
        const outer = Math.sign((g.x0 + g.x1) / 2 - this.W / 2);
        if (GALA.walls !== 'both') {
          p.body.checkCollision.left = outer < 0;
          p.body.checkCollision.right = outer > 0;
        }
        this.ledgeBlocks.push({ x0: g.x0, x1: g.x1, top: g.top });
      }
      this.galaPlats.push(p);
      if (g.soft) {
        // câbles qui tiennent la passerelle et projecteurs accrochés dessous (décor, ne bloque rien)
        const gfx = this.add.graphics().setDepth(4);
        gfx.lineStyle(2, 0x8a90a8, 0.75);
        [g.x0 + 8, g.x1 - 8].forEach((x) => gfx.lineBetween(x, g.top, x, g.top - 900));
        this.galaDeco.push(gfx);
        for (let x = g.x0 + 28; x < g.x1 - 16; x += 64) this.galaDeco.push(this.add.image(x, g.top + g.h + 8, 'gala_spot').setScale(PX).setDepth(4));
      }
    });
    this.galaFrontDecals().forEach((d) => this.galaDeco.push(this.add.image(d.x, d.y, d.key).setScale(0.5).setDepth(d.depth).setAlpha(0.92)));
  },

  // debout sur un balcon (loge, corniche) ? (tests)
  solidUnder(pl) {
    if (!this.ledgeBlocks || !this.ledgeBlocks.length) return null;
    const b = pl.sprite.body;
    return this.ledgeBlocks.find((bl) => Math.abs(b.bottom - bl.top) < 4 && b.center.x > bl.x0 - 4 && b.center.x < bl.x1 + 4) || null;
  },

  // ----- vie du décor (purement visuel, jamais dans la simulation) -----
  galaAmbience() {
    const A = this.galaArt(), fx = this.stageFx;
    const keep = (o) => (fx.push(o), o);
    // faisceaux de projecteurs derrière le palais
    [-1, 1].forEach((s) => {
      const bx = (A.cx + s * (A.PW - 14)) * PX, by = (A.yR + 12) * PX;
      const beam = keep(this.add.image(bx, by, 'gala_beam').setOrigin(0.5, 1).setDepth(-9.8).setAlpha(0.22).setBlendMode(Phaser.BlendModes.ADD));
      beam.setDisplaySize(130, Math.max(560, by + 120));
      beam.angle = s * 24;
      keep(this.tweens.add({ targets: beam, angle: -s * 18, duration: 5200 + (s > 0 ? 900 : 0), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
    });
    // logo, sigles, affiche
    let screenLogo = null;
    this.galaDecals().forEach((d) => {
      const im = keep(this.add.image(d.x, d.y, d.key).setScale(0.5).setDepth(d.depth));
      if (d.role === 'screen') screenLogo = im;
    });
    // ampoules autour de l'écran et sous la marquise : chenillard (3 images toutes faites qu'on alterne : léger)
    const pts = [];
    const s = A.scr;
    for (let x = s.x0 - 2; x <= s.x1 + 2; x += 3) pts.push([x, s.y0 - 4], [x, s.y1 + 3]);
    for (let y = s.y0 - 1; y <= s.y1; y += 3) pts.push([s.x0 - 4, y], [s.x1 + 3, y]);
    for (let x = A.cx - 37; x <= A.cx + 37; x += 3) pts.push([x, A.by - 37]);
    const bx0 = Math.min(s.x0 - 4, A.cx - 37), by0 = s.y0 - 4;
    const bw = Math.max(s.x1 + 4, A.cx + 38) - bx0, bh = A.by - 36 - by0;
    for (let ph = 0; ph < 3; ph++) {
      const key = 'gala_bulbs' + ph;
      if (this.textures.exists(key)) this.textures.remove(key);
      const t = this.textures.createCanvas(key, bw * PX, bh * PX);
      const c = t.getContext();
      pts.forEach(([x, y], i) => {
        c.fillStyle = (i + ph) % 3 !== 0 ? '#ffe9a8' : '#6a4a1e';
        c.fillRect((x - bx0) * PX, (y - by0) * PX, PX, PX);
      });
      t.refresh();
    }
    const bulbs = keep(this.add.image(bx0 * PX, by0 * PX, 'gala_bulbs0').setOrigin(0).setDepth(-8.9));
    let phase = 0;
    keep(this.time.addEvent({ delay: 180, loop: true, callback: () => bulbs.active && bulbs.setTexture('gala_bulbs' + (++phase % 3)) }));
    // l'écran : le logo, puis « EN DIRECT » avec chaque combattant nommé, puis le logo…
    const scrX = A.cx * PX, scrY = ((s.y0 + s.y1) / 2) * PX, scrH = (s.y1 - s.y0) * PX;
    const live = this.add.container(0, 0).setDepth(-9).setVisible(false);
    keep({ remove: () => live.destroy() }); // (un Container a déjà une méthode remove : on l'enveloppe)
    let slot = 0;
    const showScreen = () => {
      live.removeAll(true);
      const pls = (this.pls || []).filter((p) => p && p.char);
      const n = this.state === 'play' ? pls.length : 0;
      const idx = slot % (n + 1);
      slot++;
      if (idx === 0 || !screenLogo) {
        if (screenLogo) screenLogo.setVisible(true);
        live.setVisible(false);
        return;
      }
      const pl = pls[idx - 1];
      screenLogo.setVisible(false);
      live.setVisible(true);
      const key = `${pl.char}_idle0`;
      if (this.textures.exists(key)) {
        const im = this.add.image(scrX, scrY + scrH * 0.04, key).setScale(PX * 1.7);
        live.add(im);
      }
      live.add(this.add.text(scrX, s.y0 * PX + 14, '● EN DIRECT', { fontFamily: FONT, fontSize: '12px', color: '#ff5a6e' }).setOrigin(0.5, 0));
      live.add(this.add.text(scrX, s.y1 * PX - 14, 'NOMINÉ : ' + (pl.def && pl.def.name ? pl.def.name : pl.char).toUpperCase(), { fontFamily: FONT, fontSize: '12px', color: '#e0c27a' }).setOrigin(0.5, 1));
    };
    keep(this.time.addEvent({ delay: 4200, loop: true, callback: showScreen }));
    // flashs des photographes, en bas, de chaque côté des marches
    const H2a = L.mainW / 2 / PX;
    keep(this.time.addEvent({
      delay: 160, loop: true,
      callback: () => {
        if (Math.random() > 0.55) return;
        const side = Math.random() < 0.5 ? -1 : 1;
        const yA = A.stairTop + 4 + Math.random() * Math.max(6, A.h - A.stairTop - 6);
        const edge = A.edgeAt(yA) + 3;
        const xA = A.cx + side * (edge + 4 + Math.random() * Math.max(4, A.w / 2 - edge - 6));
        const x = xA * PX, y = yA * PX;
        const g = this.add.image(x, y, 'gala_flash').setDepth(-6).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.destroy() });
      },
    }));
    // la lumière des portes respire doucement
    const glow = keep(this.add.rectangle(A.cx * PX, (A.by - 16) * PX, 70 * PX, 36 * PX, 0xffc870, 0.08).setDepth(-9.5).setBlendMode(Phaser.BlendModes.ADD));
    keep(this.tweens.add({ targets: glow, alpha: 0.18, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
  },
});
