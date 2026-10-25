// ===========================================================================
// TERRAINS : « NUIT » (la ville, d'origine), « DÉSERT » (une planète de sable : dunes, deux lunes,
// dunes irrégulières, épice qui flotte, vers géants qui surgissent au loin, ornithoptère qui passe)
// et « CÉRÉMONIE » (gala.js : palais du cinéma, plateformes à elle).
// Nuit et désert : même terrain, mêmes plateformes ; seul le décor change.
// ===========================================================================
const STAGES = ['night', 'dune', 'gala'];
const STAGE_NAMES = { night: 'NUIT', dune: 'DÉSERT', gala: 'CÉRÉMONIE' };
// salle sans arène choisie (duel classé) : tirée du code de la salle, identique sur les deux téléphones
function stageFromCode(code) {
  let h = 0;
  for (const ch of String(code || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return STAGES[h % STAGES.length];
}

// PARALLAXE : chaque décor est dessiné en PLANS (du plus loin au plus près). Pendant le combat, quand la caméra suit
// et zoome, chaque plan ne bouge et ne grossit qu'une fraction f de la caméra (0 = infiniment loin, 1 = comme le
// terrain) : voir updateCamera (anim.js). Le dessin complet (tous les plans) reste dans 'key' pour les aperçus.
const PLANES = {
  night: { key: 'bg', scale: PX2, list: [{ id: 'sky', f: 0.06 }, { id: 'hills', f: 0.25 }, { id: 'city', f: 0.5 }] },
  dune: { key: 'bg_dune', scale: PX2, list: [{ id: 'sky', f: 0.05 }, { id: 'far', f: 0.22 }, { id: 'mid', f: 0.42 }, { id: 'near', f: 0.7 }] },
};
const PLANES_BUILT = {};

Object.assign(GameScene.prototype, {
  // dessine un décor en plans : draw(c, sec) dessine tout, sec('plan') annonce le plan des dessins qui suivent.
  // Une texture par plan (transparente ailleurs) + 'key' = tout. Gardé d'un combat à l'autre (sig = même écran).
  makePlanes(key, w, h, ids, draw, mode, sig) {
    if (sig && PLANES_BUILT[key] === sig && this.textures.exists(key) && ids.every((id) => this.textures.exists(key + '_' + id))) return;
    mkCanvas(this, key, w, h, (c) => draw(c, () => {}), mode);
    ids.forEach((id) =>
      mkCanvas(this, key + '_' + id, w, h, (c) => {
        const orig = c.fillRect.bind(c);
        let cur = null;
        c.fillRect = (x, y, ww, hh) => { if (cur === id) orig(x, y, ww, hh); };
        draw(c, (s) => { cur = s; });
      }, mode)
    );
    PLANES_BUILT[key] = sig;
  },

  // pose les plans d'un décor (un groupe d'images par plan) ; sans plans : l'image unique d'avant
  setPlanes(def) {
    (this.planes || []).forEach((p) => p.c.destroy());
    this.planes = [];
    const ok = def && def.list.every((p) => this.textures.exists(def.key + '_' + p.id));
    if (this.bgImg) this.bgImg.setVisible(!ok);
    if (!ok) return;
    def.list.forEach((p, i) => {
      const c = this.add.container(0, 0).setDepth(-10 + i * 0.2);
      const key = def.key + '_' + p.id;
      // « jupe » : le plan est prolongé vers le bas par la couleur de sa dernière ligne (au milieu), pour qu'il puisse
      // suivre la caméra en hauteur sans jamais laisser voir son bord du bas
      if (p.id !== 'sky') {
        const src = this.textures.get(key).getSourceImage();
        try {
          const d = src.getContext('2d').getImageData(Math.floor(src.width / 2), src.height - 1, 1, 1).data;
          if (d[3] > 0) c.add(this.add.rectangle(0, this.H - 2, this.W, this.H * 2, (d[0] << 16) | (d[1] << 8) | d[2]).setOrigin(0));
        } catch (e) {}
      }
      c.add(this.add.image(0, 0, key).setOrigin(0).setScale(def.scale));
      this.planes.push({ id: p.id, f: p.f, c });
    });
  },
  // met un objet du décor dans un plan (back : derrière le dessin de ce plan) ; sans plans il reste où il est
  toPlane(id, o, back) {
    const p = (this.planes || []).find((q) => q.id === id);
    if (p) {
      if (back) p.c.addAt(o, 0);
      else p.c.add(o);
    }
    return o;
  },

  pickStage() {
    // campagne : nuit, désert, cérémonie, nuit, désert, cérémonie (la finale a lieu à la cérémonie)
    if (camp) return STAGES[camp.ch % STAGES.length];
    // réglage : 0 nuit, 1 désert, 2 hasard (valeur par défaut, gardée pour les anciens réglages), 3 cérémonie
    const s = SETTINGS.stage === undefined ? 2 : SETTINGS.stage;
    if (s === 0) return 'night';
    if (s === 1) return 'dune';
    if (s === 3) return 'gala';
    return STAGES[Math.floor(Math.random() * STAGES.length)];
  },

  // ----- écran de choix de l'arène (avant le choix du perso) -----
  // next(id) : appelé avec l'arène choisie ; back : bouton RETOUR (menu JOUER par défaut)
  showStagePick(next, back) {
    this.menuBase('CHOISIS L\'ARÈNE', { small: true, noBar: true });
    const D = 120;
    const port = L.portrait;
    // v = valeur gardée dans SETTINGS.stage (2 = hasard, valeur historique par défaut)
    const opts = [
      { id: 'night', v: 0, name: 'NUIT', tex: 'bg' },
      { id: 'dune', v: 1, name: 'DÉSERT', tex: 'bg_dune' },
      { id: 'gala', v: 3, name: 'CÉRÉMONIE', tex: 'bg_gala' },
      { id: 'rand', v: 2, name: 'HASARD' },
    ].filter((o) => !o.tex || this.textures.exists(o.tex));
    const N = opts.length;
    const cur = SETTINGS.stage === undefined ? 2 : SETTINGS.stage;
    // cartes : une rangée en largeur ; en hauteur, une colonne (3 arènes) ou une grille 2 x 2 (4 cartes)
    const cols = port ? (N > 3 ? 2 : 1) : N, rows = Math.ceil(N / cols);
    const top = 160, lab = 40, gap = port ? 20 : 24;
    const cw = Math.min(420, Math.floor((this.W - (port ? 80 : 60) - gap * (cols - 1)) / cols));
    const ph = Math.min(Math.round(cw * (port && cols === 1 ? 0.5 : 0.62)), Math.floor((this.H - top - 150) / rows) - lab - 16);
    this.uiBtns = [];
    opts.forEach((o, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const cx = this.W / 2 + (col - (cols - 1) / 2) * (cw + gap);
      const y0 = top + (port ? 0 : 20) + row * (ph + lab + 16);
      const left = cx - cw / 2;
      const sel = cur === o.v;
      this.ui.push(this.add.rectangle(cx, y0 + (ph + lab) / 2, cw + 8, ph + lab + 8, 0x1a1d33, 1).setStrokeStyle(4, sel ? 0xffd166 : 0xf72585).setDepth(D));
      // aperçu : un morceau du décor autour de l'arène (part = [i, n] : seulement la i-ème tranche sur n)
      const preview = (id, tex, part) => {
        const a = cw / ph;
        let wh = Math.min(this.H * 0.8, this.W / a), ww = wh * a;
        if (ww < L.mainW + 120) { ww = Math.min(this.W, L.mainW + 120); wh = ww / a; }
        // la CÉRÉMONIE se joue plus en hauteur (passerelle, écran géant) : on cadre un peu plus haut
        const wx0 = this.W / 2 - ww / 2, wy0 = Math.max(0, Math.min(this.H - wh, L.baseY + 60 - wh * (id === 'gala' ? 0.9 : 0.78)));
        const k = cw / ww;
        const img = this.add.image(0, 0, tex).setOrigin(0).setDepth(D + 1);
        const tk = img.width / this.bgImg.displayWidth; // pixels de texture par pixel d'écran
        const hx = part ? (ww / part[1]) * part[0] : 0, hw = part ? ww / part[1] : ww;
        img.setCrop((wx0 + hx) * tk, wy0 * tk, hw * tk, wh * tk);
        img.scale = k / tk; // échelle réelle (sans la correction automatique des textures HD)
        img.setPosition(left - wx0 * k, y0 - wy0 * k);
        this.ui.push(img);
        if (part) return;
        this.stageShapes(id).forEach((q) => {
          const py = y0 + (q.y - wy0) * k;
          if (py - (q.h * k) / 2 < y0 || py + (q.h * k) / 2 > y0 + ph) return;
          this.ui.push(this.add.image(left + (q.x - wx0) * k, py, q.key).setDisplaySize(q.w * k, q.h * k).setDepth(D + 2));
        });
      };
      if (o.tex) preview(o.id, o.tex);
      else {
        const texs = opts.filter((q) => q.tex);
        texs.forEach((q, j) => preview(q.id, q.tex, [j, texs.length]));
        this.ui.push(this.add.rectangle(cx, y0 + ph / 2, cw, ph, 0x0b0d1f, 0.45).setDepth(D + 2));
        this.ui.push(this.add.text(cx, y0 + ph / 2, '?', { fontFamily: FONT, fontSize: Math.round(ph * 0.5) + 'px', color: '#ffd166', stroke: '#000', strokeThickness: 8 }).setOrigin(0.5).setDepth(D + 3));
      }
      this.ui.push(this.add.text(cx, y0 + ph + lab / 2 + 2, o.name, { fontFamily: FONT, fontSize: cols > 1 && N > 3 ? '17px' : '20px', color: sel ? '#ffd166' : '#ffffff', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setDepth(D + 1));
      this.uiBtns.push({
        x: cx, y: y0 + (ph + lab) / 2, w: cw + 8, h: ph + lab + 8,
        fn: () => {
          SETTINGS.stage = o.v;
          if (typeof saveSettings === 'function') saveSettings();
          const id = this.pickStage();
          this.applyStage(id);
          next(id);
        },
      });
    });
    const yb = port ? this.H - 80 : this.H - 70;
    const r = this.add.rectangle(this.W / 2, yb, 300, 64, 0x1a1d33, 1).setStrokeStyle(4, 0x888888).setDepth(D);
    const t = this.add.text(this.W / 2, yb, 'RETOUR', { fontFamily: FONT, fontSize: '18px', color: '#fff', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setDepth(D + 1);
    this.ui.push(r, t);
    this.uiBtns.push({ x: this.W / 2, y: yb, w: 300, h: 64, fn: () => (back ? back() : this.showPlayMenu()) });
  },

  // formes posées sur l'aperçu d'une arène (terrain, plateformes, logos) : { key, x, y, w, h } en pixels du monde
  stageShapes(id) {
    const out = [];
    const mp = this.mainPlat;
    if (!mp) return out;
    const main = id === 'gala' ? 'main_gala' : id === 'dune' ? 'main_dune' : 'main';
    const mh = id === 'gala' && typeof GALA !== 'undefined' ? GALA.mainH : 56; // le parvis de la cérémonie est plus épais
    out.push({ key: main, x: mp.x, y: L.baseY + mh / 2, w: mp.displayWidth, h: mh });
    if (id === 'gala' && this.galaGeom) {
      const s = this.galaArt().scr;
      out.push({ key: 'gala_scr_logo', x: ((s.x0 + s.x1) / 2) * GPX, y: ((s.y0 + s.y1) / 2) * GPX, w: (s.x1 - s.x0) * GPX, h: (s.y1 - s.y0) * GPX });
      this.galaGeom().forEach((g) => out.push({ key: g.key, x: (g.x0 + g.x1) / 2, y: g.top + g.h / 2, w: g.x1 - g.x0, h: g.h }));
    } else (this.softPlats || []).forEach((p) => out.push({ key: id === 'dune' ? 'soft_dune' : 'soft', x: p.x, y: p.y, w: p.displayWidth, h: p.displayHeight }));
    return out;
  },

  applyStage(id) {
    if (id === 'gala' && !this.textures.exists('bg_gala')) id = 'night';
    this.stageId = id;
    const dune = id === 'dune', gala = id === 'gala';
    if (this.bgImg) this.bgImg.setTexture(gala ? 'bg_gala' : dune ? 'bg_dune' : 'bg');
    if (this.mainPlat) this.mainPlat.setTexture(gala ? 'main_gala' : dune ? 'main_dune' : 'main');
    (this.softPlats || []).forEach((p) => p.setTexture(dune ? 'soft_dune' : 'soft'));
    if (this.stageFx) this.stageFx.forEach((o) => o.remove ? o.remove(false) : o.destroy());
    this.stageFx = [];
    this.setPlanes(gala ? (typeof GALA_PLANES !== 'undefined' ? GALA_PLANES : null) : PLANES[dune ? 'dune' : 'night']);
    // plateformes propres à la CÉRÉMONIE (les autres arènes gardent les 3 plateformes d'origine)
    if (this.setGalaGeom) this.setGalaGeom(gala);
    if (dune) this.duneAmbience();
    if (gala) this.galaAmbience();
  },

  // ----- dessin du désert (pixel art fin : 1 pixel d'art = PX2 = 2 pixels du jeu) -----
  buildDune() {
    const w = Math.ceil(this.W / PX2), h = Math.ceil(this.H / PX2);
    const horizon = Math.round(L.baseY / PX2) + 12;
    // en plans pour la parallaxe : ciel (lunes, soleil), dunes lointaines, dunes du milieu, avant-plan
    this.makePlanes('bg_dune', w, h, ['sky', 'far', 'mid', 'near'], (c, sec) => {
      let seed = 11; // (remis à zéro à chaque passage : tous les plans tirent les mêmes hasards)
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      sec('sky');
      // ciel de fin de journée : indigo en haut, braise, ambre à l'horizon (par bandes)
      const stops = [[22, 14, 44], [86, 30, 52], [196, 84, 42], [244, 168, 86]];
      for (let y = 0; y < h; y++) {
        const t = Math.min(y / (horizon - 8), 1);
        const q = Math.floor(t * 24) / 24;
        const seg = Math.min(2, Math.floor(q * 3));
        const u = q * 3 - seg;
        const a = stops[seg], b = stops[seg + 1];
        c.fillStyle = `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * u)).join(',')})`;
        c.fillRect(0, y, w, 1);
      }
      // quelques étoiles tout en haut
      for (let i = 0; i < w * 0.16; i++) {
        c.fillStyle = rnd() > 0.5 ? '#ffd9b0' : '#c8a0a0';
        c.fillRect(Math.floor(rnd() * w), Math.floor(rnd() * horizon * 0.22), 1, 1);
      }
      // deux lunes
      const disc = (cx, cy, r, col, edge, ew) => {
        for (let y = -r; y <= r; y++)
          for (let x = -r; x <= r; x++)
            if (x * x + y * y <= r * r) {
              c.fillStyle = x * x + y * y > (r - (ew || 2.2)) * (r - (ew || 2.2)) ? edge : col;
              c.fillRect(cx + x, cy + y, 1, 1);
            }
      };
      const m1x = Math.round(w * 0.18), m1y = Math.round(horizon * 0.32);
      disc(m1x, m1y, 14, '#f4e6d2', '#d8c2a8');
      [[-4, -2, 3, '#d2b89c'], [5, 5, 3, '#d8bea2'], [-2, 7, 2, '#d2b89c'], [6, -6, 2, '#dcc4a8'], [-8, 4, 1, '#d2b89c']].forEach(([x, y, r, col]) => disc(m1x + x, m1y + y, r, col, '#c4a88c', 0.8));
      disc(Math.round(w * 0.29), Math.round(horizon * 0.24), 6, '#ead6c0', '#c8ae94', 1.5);
      // grand soleil bas, voilé par la poussière
      c.globalAlpha = 0.14;
      disc(Math.round(w * 0.62), horizon - 32, 54, '#ffd8a0', '#ffd8a0');
      c.globalAlpha = 0.22;
      disc(Math.round(w * 0.62), horizon - 32, 42, '#ffd8a0', '#ffd8a0');
      c.globalAlpha = 1;
      disc(Math.round(w * 0.62), horizon - 32, 28, '#ffe2a8', '#f8c070', 3);
      for (let k = 0; k < 4; k++) { c.fillStyle = 'rgba(232,150,90,0.35)'; c.fillRect(Math.round(w * 0.62) - 26 + k * 3, horizon - 32 + 8 + k * 5, 52 - k * 6, 1); } // voiles de poussière
      // dunes irrégulières : face raide à gauche (à l'ombre), longue pente douce vers la droite,
      // tailles et écarts au hasard, petites bosses et crête éclairée sur 2 pixels
      const layer = (base, minH, maxH, minW, maxW, col, crest, shade) => {
        const top = new Array(w + 1).fill(base), lee = new Array(w + 1).fill(false);
        let x0 = -Math.floor(rnd() * maxW * 0.5);
        while (x0 < w) {
          const dw = minW + Math.floor(rnd() * (maxW - minW)), dh = minH + rnd() * (maxH - minH);
          const cr = Math.max(6, Math.round(dw * (0.22 + rnd() * 0.16))); // la crête est près du bord gauche
          const wob = rnd() * 6;
          for (let i = 0; i <= dw; i++) {
            const xx = x0 + i;
            if (xx < 0 || xx > w) continue;
            const f = i < cr ? Math.sin((Math.PI / 2) * (i / cr)) : 0.5 * (1 + Math.cos((Math.PI * (i - cr)) / (dw - cr)));
            const bump = Math.sin(i * 0.225 + wob) * 1.2 * f;
            const y = Math.round(base - dh * f - bump);
            if (y < top[xx]) { top[xx] = y; lee[xx] = i < cr; }
          }
          x0 += Math.round(dw * (0.55 + rnd() * 0.4));
        }
        for (let xx = 0; xx < w; xx++) {
          const t = top[xx];
          c.fillStyle = col;
          c.fillRect(xx, t, 1, h);
          if (lee[xx]) {
            c.fillStyle = shade;
            c.fillRect(xx, t, 1, Math.max(1, Math.round((base - t) * 0.65)));
            if (xx % 2 === 0) c.fillRect(xx, t + Math.max(1, Math.round((base - t) * 0.65)), 1, 1); // bord tramé de l'ombre
          } else {
            c.fillStyle = crest;
            c.fillRect(xx, t, 1, 1);
            if (xx % 2 === 0) c.fillRect(xx, t + 1, 1, 1);
          }
        }
      };
      // très loin, dans la brume
      sec('far');
      layer(horizon - 12, 6, 18, 60, 140, '#d48a4c', '#e8a868', '#c07a44');
      layer(horizon - 4, 6, 16, 44, 110, '#c8783e', '#f2b06a', '#a65c30');
      sec('mid');
      layer(horizon + 10, 8, 18, 52, 120, '#b4642f', '#e2a05c', '#8e4a24');
      layer(horizon + 26, 6, 16, 60, 140, '#94502a', '#c88448', '#743a1e');
      // avant-plan : dunes dans l'ombre, de plus en plus sombres vers le bas, rides de vent
      sec('near');
      const deep = [['#6e3620', '#8a4a2a', '#5a2a18'], ['#5a2a18', '#743c22', '#48200f'], ['#46200f', '#5e301a', '#381809'], ['#36180b', '#4a2414', '#2a1207'], ['#2a1208', '#3a1c0e', '#200d05']];
      let base = horizon + 44, k = 0;
      while (base < h + 40) {
        const d = deep[Math.min(k, deep.length - 1)];
        layer(base, 4 + 2 * k, 10 + k * 4, 80 + k * 28, 180 + k * 52, d[0], d[1], d[2]);
        // rides de vent : traits fins, un peu courbés
        for (let r = 0; r < w * 0.7; r++) {
          const rx = Math.floor(rnd() * w), ry = base + 8 + Math.floor(rnd() * (28 + k * 16));
          if (ry < h) {
            const len = 4 + Math.floor(rnd() * 8);
            c.fillStyle = d[1];
            c.fillRect(rx, ry, len, 1);
            c.fillStyle = d[2];
            c.fillRect(rx + 1, ry + 1, len - 2, 1);
          }
        }
        base += 32 + k * 16;
        k++;
      }
    }, 'raw', 'dune2:' + w + 'x' + h);
    // plateau principal : roche sombre (contraste avec le sable du fond), coiffée d'une couche de sable
    const tw = Math.round(L.mainW / PX2);
    mkCanvas(this, 'main_dune', tw, 28, (c) => {
      for (let y = 0; y < 28; y++)
        for (let x = 0; x < tw; x++) {
          let col;
          const drift = 4 + (Math.sin(x * 0.105) > 0.6 ? 2 : 0) + (Math.sin(x * 0.37) > 0.8 ? 1 : 0); // le sable déborde un peu
          if (y === 0) col = (x * 5) % 9 === 0 ? '#fff0c0' : '#f8d490';
          else if (y === 1) col = '#f0c47e';
          else if (y < drift) col = (x * 7 + y * 3) % 11 === 0 ? '#d09a58' : (x + y) % 7 === 0 ? '#f2c27a' : '#e4b46c';
          else if (y === drift) col = '#1c1824';
          else if (y === 27) col = '#141018';
          else if (y === 26) col = '#1e1a26';
          else {
            const band = Math.floor((y - 4 + Math.round(Math.sin(x * 0.075) * 2.4)) / 6) % 2;
            col = band ? '#3a3346' : '#463e56';
            if ((x - y * 2 + 1000) % 37 === 0 || (x + y * 3) % 53 === 0) col = '#262030'; // fissures
            if (y > 8 && (x * 13 + y * 7) % 31 === 0) col = '#6a5e7e';
            if (y === drift + 1) col = '#2a2434';
          }
          c.fillStyle = col;
          c.fillRect(x, y, 1, 1);
        }
    }, 'raw');
    // plateformes : dalles de pierre sombre gravées
    mkCanvas(this, 'soft_dune', 100, 10, (c) => {
      for (let y = 0; y < 10; y++)
        for (let x = 0; x < 100; x++) {
          let col = y === 0 ? '#d0c4e0' : y === 1 ? '#b4a6c6' : y === 2 ? '#6e6084' : y === 8 ? '#2a2434' : y === 9 ? '#18141e' : '#4a4058';
          if (y >= 4 && y <= 6 && x % 16 === 6) col = '#2a2434';
          if (y >= 4 && y <= 6 && x % 16 === 7) col = '#8a7ca0';
          if (y === 5 && x % 16 > 8 && x % 16 < 13) col = '#3a3248';
          if ((x * 7 + y * 11) % 29 === 0 && y > 2 && y < 8) col = '#5a4e6c';
          if (x === 0 || x === 99) col = '#2a2434';
          c.fillStyle = col;
          c.fillRect(x, y, 1, 1);
        }
    }, 'raw');
    // ver des sables : énorme corps annelé qui sort du sable, gueule ronde ouverte en trois lèvres (2 x plus fin)
    const S = 2;
    mkCanvas(this, 'worm', 48 * S, 72 * S, (c) => {
      const px = (x, y, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), 1, 1); };
      const OUT = '#2e140a';
      const body = [];
      for (let y = 72 * S - 1; y >= 16 * S; y--) {
        const t = (72 * S - 1 - y) / (55 * S);
        body.push([y, (22 + 5 * Math.sin(t * 2.2 + 0.3)) * S, (11 - t * 1.5) * S]);
      }
      body.forEach(([y, cx, r]) => { for (let x = -r - 1; x <= r + 1; x++) px(cx + x, y, OUT); });
      body.forEach(([y, cx, r]) => {
        for (let x = -r; x <= r; x++) {
          const u = x / r;
          let col = u > 0.6 ? '#d8a670' : u > 0.3 ? '#c8935e' : u > -0.1 ? '#9a6840' : u > -0.6 ? '#7a4e30' : '#5a3420';
          // anneaux : lignes courbes (cylindre), un trait sombre et un reflet
          const ring = Math.round(y + Math.sqrt(Math.max(0, 1 - u * u)) * 2.2 * S) % (5 * S);
          if (ring === 0) col = u > 0.45 ? '#8e5c38' : '#4a2a18';
          else if (ring === 1) col = u > 0.45 ? '#a87048' : '#5a3420';
          else if (ring === 2 && u > 0.2) col = '#ecc08a';
          if ((x * 7 + y * 3) % 23 === 0 && ring > 3) col = u > 0 ? '#b0804e' : '#6a4028'; // grain de la peau
          px(cx + x, y, col);
        }
      });
      // gueule (vue un peu de dessus) : lèvre, trois volets ouverts, couronnes de dents
      const mx = (22 + 5 * Math.sin(2.5)) * S, my = 15 * S;
      const flap = (ax, ay, bx, by, tx, ty) => {
        for (let y = Math.min(ay, by, ty) - 1; y <= Math.max(ay, by, ty) + 1; y++)
          for (let x = Math.min(ax, bx, tx) - 1; x <= Math.max(ax, bx, tx) + 1; x++) {
            const s1 = (bx - ax) * (y - ay) - (by - ay) * (x - ax), s2 = (tx - bx) * (y - by) - (ty - by) * (x - bx), s3 = (ax - tx) * (y - ty) - (ay - ty) * (x - tx);
            if ((s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0)) px(x, y, y < (ay + ty) / 2 ? ((x + y) % 5 === 0 ? '#c08a58' : '#b07a4c') : '#8a5a36');
          }
      };
      flap(mx - 12 * S, my + S, mx - 4 * S, my - 4 * S, mx - 19 * S, my - 12 * S);
      flap(mx + 12 * S, my + S, mx + 4 * S, my - 4 * S, mx + 19 * S, my - 12 * S);
      flap(mx - 4 * S, my - 4 * S, mx + 4 * S, my - 4 * S, mx, my - 15 * S);
      for (let y = -6 * S; y <= 6 * S; y++)
        for (let x = -13 * S; x <= 13 * S; x++) {
          const d = Math.hypot(x / (13 * S), y / (6 * S));
          if (d > 1) continue;
          const tooth = Math.floor(((Math.atan2(y / 6, x / 13) + Math.PI) / (Math.PI * 2)) * 36) % 2 === 0;
          let col;
          if (d > 0.92) col = OUT;
          else if (d > 0.76) col = d > 0.84 ? '#c08a5a' : '#a8764c';
          else if (d > 0.58) col = tooth ? (d > 0.66 ? '#f2e2c4' : '#e6d2b0') : '#3a140c';
          else if (d > 0.42) col = '#3a120c';
          else if (d > 0.3) col = tooth ? '#b89a7c' : '#24080a';
          else col = '#120404';
          px(mx + x, my + y, col);
        }
    }, 'raw');
    // ornithoptère : fuselage, cockpit, deux paires d'ailes battantes (2 images, 2 x plus fin)
    [0, 1].forEach((f) =>
      mkCanvas(this, 'thopter' + f, 60, 28, (c) => {
        const r = (x, y, ww, hh, col) => { c.fillStyle = col; c.fillRect(x * 2, y * 2, ww * 2, hh * 2); };
        const p = (x, y, ww, hh, col) => { c.fillStyle = col; c.fillRect(x, y, ww, hh); };
        // ailes arrière (derrière le fuselage), plus pâles, nervurées
        if (f) { r(6, 1, 11, 1, '#b8a894'); r(8, 2, 8, 1, '#b8a894'); r(12, 3, 2, 3, '#4a4450'); for (let x = 14; x < 34; x += 4) p(x, 2, 1, 4, '#968876'); }
        else { r(6, 11, 11, 1, '#b8a894'); r(8, 10, 8, 1, '#b8a894'); r(12, 8, 2, 3, '#4a4450'); for (let x = 14; x < 34; x += 4) p(x, 20, 1, 4, '#968876'); }
        // fuselage
        r(1, 6, 4, 1, '#2a2430'); r(4, 5, 16, 4, '#2a2430'); r(5, 6, 14, 1, '#6a6070'); r(20, 5, 5, 4, '#2a2430');
        p(10, 11, 28, 1, '#8a8090'); p(10, 16, 28, 1, '#1a1620'); for (let x = 12; x < 38; x += 6) p(x, 12, 1, 4, '#3a3440');
        r(21, 5, 3, 2, '#ffcf7a'); p(43, 10, 3, 1, '#fff2c8'); p(42, 12, 1, 1, '#fff2c8'); r(25, 6, 2, 2, '#2a2430');
        r(8, 9, 1, 2, '#2a2430'); r(17, 9, 1, 2, '#2a2430');
        // ailes avant
        if (f) { r(9, 0, 13, 1, '#f0e6d8'); r(11, 1, 9, 1, '#f0e6d8'); r(14, 2, 2, 3, '#4a4450'); for (let x = 20; x < 44; x += 4) p(x, 0, 1, 4, '#c8bca8'); }
        else { r(9, 13, 13, 1, '#f0e6d8'); r(11, 12, 9, 1, '#f0e6d8'); r(14, 9, 2, 3, '#4a4450'); for (let x = 20; x < 44; x += 4) p(x, 24, 1, 4, '#c8bca8'); }
      }, 'raw')
    );
  },
  // ----- vie du décor (purement visuel, jamais dans la simulation) -----
  duneAmbience() {
    const horizonY = L.baseY + 12 * PX2;
    // épice : poussière dorée qui monte doucement
    const spice = this.time.addEvent({
      delay: 140,
      loop: true,
      callback: () => {
        const x = Math.random() * this.W, y = this.H * (0.45 + Math.random() * 0.5);
        const q = this.toPlane('near', this.add.rectangle(x, y, 4, 4, Math.random() < 0.5 ? 0xffb347 : 0xffd27a, 0.8).setDepth(-5));
        this.tweens.add({ targets: q, x: x + 40 + Math.random() * 60, y: y - 60 - Math.random() * 80, alpha: 0, duration: 3200 + Math.random() * 1600, onComplete: () => q.destroy() });
      },
    });
    this.stageFx.push(spice);
    // un ver surgit au loin de temps en temps
    const worm = () => {
      if (this.stageId !== 'dune') return;
      const x = this.W / 2 + (Math.random() - 0.5) * L.mainW * 0.9;
      const k = PX * (1.15 + Math.random() * 0.3); // (taille à l'écran ; l'image du ver est 2 x plus fine)
      const hgt = 72 * k;
      const wImg = this.add.image(x, horizonY + 8 + hgt, 'worm').setOrigin(0.5, 1).setScale(k / 2).setDepth(-9).setAlpha(0.92).setFlipX(Math.random() < 0.5);
      // le ver sort du sable : posé DERRIÈRE les dunes du milieu, qui cachent ce qui est sous leur crête
      // (sans plans : un masque, comme avant)
      let mg = null;
      if (this.planes && this.planes.length) this.toPlane('mid', wImg, true);
      else {
        mg = this.make.graphics({ add: false });
        mg.fillRect(0, 0, this.W, horizonY + 8);
        wImg.setMask(mg.createGeometryMask());
      }
      // gerbe de sable
      for (let i = 0; i < 26; i++) {
        const d = this.toPlane('mid', this.add.rectangle(x + (Math.random() - 0.5) * 120, horizonY + 6, 8, 8, i % 3 ? 0xd89a5a : 0xf0c27a).setDepth(-8));
        this.tweens.add({ targets: d, x: d.x + (Math.random() - 0.5) * 260, y: d.y - 60 - Math.random() * 180, alpha: 0, duration: 1100 + Math.random() * 600, delay: 150 + Math.random() * 500, ease: 'Quad.easeOut', onComplete: () => d.destroy() });
      }
      this.tweens.add({ targets: wImg, y: horizonY + 8 + hgt * 0.22, duration: 1400, ease: 'Sine.easeOut', yoyo: true, hold: 1300, onComplete: () => { wImg.destroy(); if (mg) mg.destroy(); } });
      this.cameras.main.shake(500, 0.003);
      if (this.sfx) this.sfx('rumble');
    };
    const wEv = this.time.addEvent({ delay: 22000, loop: true, callback: worm });
    this.stageFx.push(wEv);
    this.time.delayedCall(6000, worm);
    // ornithoptère qui traverse le ciel
    const fly = () => {
      const dir = Math.random() < 0.5 ? 1 : -1;
      const y = this.H * (0.12 + Math.random() * 0.15);
      const t = this.toPlane('far', this.add.image(dir > 0 ? -60 : this.W + 60, y, 'thopter0').setScale(PX2).setDepth(-8).setFlipX(dir < 0));
      const flap = this.time.addEvent({ delay: 70, loop: true, callback: () => t.active && t.setTexture(t.texture.key === 'thopter0' ? 'thopter1' : 'thopter0') });
      this.tweens.add({ targets: t, x: dir > 0 ? this.W + 60 : -60, y: y + (Math.random() - 0.5) * 60, duration: 9000, onComplete: () => { flap.remove(false); t.destroy(); } });
    };
    const fEv = this.time.addEvent({ delay: 31000, loop: true, callback: fly });
    this.stageFx.push(fEv);
    this.time.delayedCall(2500, () => this.stageId === 'dune' && fly());
  },
});
