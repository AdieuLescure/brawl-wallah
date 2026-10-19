// ===========================================================================
// TERRAINS : « NUIT » (la ville, d'origine) et « DÉSERT » (une planète de sable : dunes, deux lunes,
// dunes irrégulières, épice qui flotte, vers géants qui surgissent au loin, ornithoptère qui passe).
// Le décor ne change rien au combat : mêmes plateformes, mêmes dimensions.
// ===========================================================================
const STAGES = ['night', 'dune'];
const STAGE_NAMES = { night: 'NUIT', dune: 'DESERT' };
// salle sans arène choisie (duel classé) : tirée du code de la salle, identique sur les deux téléphones
function stageFromCode(code) {
  let h = 0;
  for (const ch of String(code || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return STAGES[h % STAGES.length];
}

Object.assign(GameScene.prototype, {
  pickStage() {
    if (camp) return camp.ch % 2 ? 'dune' : 'night';
    const s = SETTINGS.stage === undefined ? 2 : SETTINGS.stage;
    if (s === 0) return 'night';
    if (s === 1) return 'dune';
    return Math.random() < 0.5 ? 'night' : 'dune';
  },

  // ----- écran de choix de l'arène (avant le choix du perso) -----
  // next(id) : appelé avec l'arène choisie ; back : bouton RETOUR (menu JOUER par défaut)
  showStagePick(next, back) {
    this.menuBase('CHOISIS L\'ARENE', { small: true, noBar: true });
    const D = 120;
    const port = L.portrait;
    const opts = [
      { id: 'night', name: 'NUIT', tex: 'bg', plat: 'main', soft: 'soft' },
      { id: 'dune', name: 'DESERT', tex: 'bg_dune', plat: 'main_dune', soft: 'soft_dune' },
      { id: 'rand', name: 'HASARD' },
    ];
    const cur = SETTINGS.stage === undefined ? 2 : SETTINGS.stage;
    let cw, ph;
    const top = port ? 170 : 160, lab = port ? 44 : 40;
    if (port) {
      cw = this.W - 80;
      ph = Math.min(Math.floor((this.H - top - 160) / 3) - lab - 18, Math.round(cw * 0.5));
    } else {
      cw = Math.min(420, Math.floor((this.W - 120) / 3));
      ph = Math.round(cw * 0.62);
    }
    this.uiBtns = [];
    opts.forEach((o, i) => {
      const cx = port ? this.W / 2 : this.W / 2 + (i - 1) * (cw + 30);
      const y0 = port ? top + i * (ph + lab + 18) : top + 20;
      const left = cx - cw / 2;
      const sel = cur === i;
      this.ui.push(this.add.rectangle(cx, y0 + (ph + lab) / 2, cw + 8, ph + lab + 8, 0x1a1d33, 1).setStrokeStyle(4, sel ? 0xffd166 : 0xf72585).setDepth(D));
      // aperçu : un morceau du décor autour de l'arène (half = 0/1 : seulement la moitié gauche/droite)
      const preview = (tex, plat, soft, half) => {
        const a = cw / ph;
        let wh = Math.min(this.H * 0.8, this.W / a), ww = wh * a;
        if (ww < L.mainW + 120) { ww = Math.min(this.W, L.mainW + 120); wh = ww / a; }
        const wx0 = this.W / 2 - ww / 2, wy0 = Math.max(0, Math.min(this.H - wh, L.baseY + 60 - wh * 0.78));
        const k = cw / ww;
        const img = this.add.image(0, 0, tex).setOrigin(0).setDepth(D + 1);
        const tk = img.width / this.bgImg.displayWidth; // pixels de texture par pixel d'écran
        const hx = half === 1 ? ww / 2 : 0, hw = half === undefined ? ww : ww / 2;
        img.setCrop((wx0 + hx) * tk, wy0 * tk, hw * tk, wh * tk);
        img.scale = k / tk; // échelle réelle (sans la correction automatique des textures HD)
        img.setPosition(left - wx0 * k, y0 - wy0 * k);
        this.ui.push(img);
        if (half !== undefined) return;
        const put = (key, x, y, w2, h2) => {
          const py = y0 + (y - wy0) * k;
          if (py - (h2 * k) / 2 < y0 || py + (h2 * k) / 2 > y0 + ph) return;
          this.ui.push(this.add.image(left + (x - wx0) * k, py, key).setDisplaySize(w2 * k, h2 * k).setDepth(D + 2));
        };
        const mp = this.mainPlat;
        put(plat, mp.x, mp.y, mp.displayWidth, mp.displayHeight);
        (this.softPlats || []).forEach((p) => put(soft, p.x, p.y, p.displayWidth, p.displayHeight));
      };
      if (o.tex) preview(o.tex, o.plat, o.soft);
      else {
        preview('bg', null, null, 0);
        preview('bg_dune', null, null, 1);
        this.ui.push(this.add.rectangle(cx, y0 + ph / 2, cw, ph, 0x0b0d1f, 0.45).setDepth(D + 2));
        this.ui.push(this.add.text(cx, y0 + ph / 2, '?', { fontFamily: FONT, fontSize: Math.round(ph * 0.5) + 'px', color: '#ffd166', stroke: '#000', strokeThickness: 8 }).setOrigin(0.5).setDepth(D + 3));
      }
      this.ui.push(this.add.text(cx, y0 + ph + lab / 2 + 2, o.name, { fontFamily: FONT, fontSize: port ? '22px' : '20px', color: sel ? '#ffd166' : '#ffffff', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setDepth(D + 1));
      this.uiBtns.push({
        x: cx, y: y0 + (ph + lab) / 2, w: cw + 8, h: ph + lab + 8,
        fn: () => {
          SETTINGS.stage = i;
          if (typeof saveSettings === 'function') saveSettings();
          const id = this.pickStage();
          this.applyStage(id);
          next(id);
        },
      });
    });
    const yb = port ? this.H - 90 : this.H - 70;
    const r = this.add.rectangle(this.W / 2, yb, 300, 64, 0x1a1d33, 1).setStrokeStyle(4, 0x888888).setDepth(D);
    const t = this.add.text(this.W / 2, yb, 'RETOUR', { fontFamily: FONT, fontSize: '18px', color: '#fff', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setDepth(D + 1);
    this.ui.push(r, t);
    this.uiBtns.push({ x: this.W / 2, y: yb, w: 300, h: 64, fn: () => (back ? back() : this.showPlayMenu()) });
  },

  applyStage(id) {
    this.stageId = id;
    const dune = id === 'dune';
    if (this.bgImg) this.bgImg.setTexture(dune ? 'bg_dune' : 'bg');
    if (this.mainPlat) this.mainPlat.setTexture(dune ? 'main_dune' : 'main');
    (this.softPlats || []).forEach((p) => p.setTexture(dune ? 'soft_dune' : 'soft'));
    if (this.stageFx) this.stageFx.forEach((o) => o.remove ? o.remove(false) : o.destroy());
    this.stageFx = [];
    if (dune) this.duneAmbience();
  },

  // ----- dessin du désert (en pixels d'art, agrandis x4) -----
  buildDune() {
    const w = Math.ceil(this.W / PX), h = Math.ceil(this.H / PX);
    const horizon = Math.round(L.baseY / PX) + 6;
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    mkCanvas(this, 'bg_dune', w, h, (c) => {
      // ciel de fin de journée : indigo en haut, braise, ambre à l'horizon (par bandes)
      const stops = [[22, 14, 44], [86, 30, 52], [196, 84, 42], [244, 168, 86]];
      for (let y = 0; y < h; y++) {
        const t = Math.min(y / (horizon - 4), 1);
        const q = Math.floor(t * 12) / 12;
        const seg = Math.min(2, Math.floor(q * 3));
        const u = q * 3 - seg;
        const a = stops[seg], b = stops[seg + 1];
        c.fillStyle = `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * u)).join(',')})`;
        c.fillRect(0, y, w, 1);
      }
      // quelques étoiles tout en haut
      for (let i = 0; i < w * 0.12; i++) {
        c.fillStyle = '#ffd9b0';
        c.fillRect(Math.floor(rnd() * w), Math.floor(rnd() * horizon * 0.22), 1, 1);
      }
      // deux lunes
      const disc = (cx, cy, r, col, edge) => {
        for (let y = -r; y <= r; y++)
          for (let x = -r; x <= r; x++)
            if (x * x + y * y <= r * r) {
              c.fillStyle = x * x + y * y > (r - 1.2) * (r - 1.2) ? edge : col;
              c.fillRect(cx + x, cy + y, 1, 1);
            }
      };
      const m1x = Math.round(w * 0.18), m1y = Math.round(horizon * 0.32);
      disc(m1x, m1y, 7, '#f4e6d2', '#d8c2a8');
      c.fillStyle = '#d2b89c';
      [[-2, -1, 3, 2], [2, 2, 2, 2], [-1, 3, 2, 1]].forEach(([x, y, ww, hh]) => c.fillRect(m1x + x, m1y + y, ww, hh));
      disc(Math.round(w * 0.29), Math.round(horizon * 0.24), 3, '#ead6c0', '#c8ae94');
      // grand soleil bas, voilé par la poussière
      c.globalAlpha = 0.22;
      disc(Math.round(w * 0.62), horizon - 16, 22, '#ffd8a0', '#ffd8a0');
      c.globalAlpha = 1;
      disc(Math.round(w * 0.62), horizon - 16, 14, '#ffe2a8', '#f8c070');
      // dunes irrégulières : face raide à gauche (à l'ombre), longue pente douce vers la droite,
      // tailles et écarts au hasard, petites bosses sur les crêtes
      const layer = (base, minH, maxH, minW, maxW, col, crest, shade) => {
        const top = new Array(w + 1).fill(base), lee = new Array(w + 1).fill(false);
        let x0 = -Math.floor(rnd() * maxW * 0.5);
        while (x0 < w) {
          const dw = minW + Math.floor(rnd() * (maxW - minW)), dh = minH + rnd() * (maxH - minH);
          const cr = Math.max(3, Math.round(dw * (0.22 + rnd() * 0.16))); // la crête est près du bord gauche
          const wob = rnd() * 6;
          for (let i = 0; i <= dw; i++) {
            const xx = x0 + i;
            if (xx < 0 || xx > w) continue;
            const f = i < cr ? Math.sin((Math.PI / 2) * (i / cr)) : 0.5 * (1 + Math.cos((Math.PI * (i - cr)) / (dw - cr)));
            const bump = Math.sin(i * 0.45 + wob) * 0.6 * f;
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
          } else {
            c.fillStyle = crest;
            c.fillRect(xx, t, 1, 1);
          }
        }
      };
      // très loin, dans la brume
      layer(horizon - 6, 3, 9, 30, 70, '#d48a4c', '#e8a868', '#c07a44');
      layer(horizon - 2, 3, 8, 22, 55, '#c8783e', '#f2b06a', '#a65c30');
      layer(horizon + 5, 4, 9, 26, 60, '#b4642f', '#e2a05c', '#8e4a24');
      layer(horizon + 13, 3, 8, 30, 70, '#94502a', '#c88448', '#743a1e');
      // avant-plan : dunes dans l'ombre, de plus en plus sombres vers le bas, rides de vent
      const deep = [['#6e3620', '#8a4a2a', '#5a2a18'], ['#5a2a18', '#743c22', '#48200f'], ['#46200f', '#5e301a', '#381809'], ['#36180b', '#4a2414', '#2a1207'], ['#2a1208', '#3a1c0e', '#200d05']];
      let base = horizon + 22, k = 0;
      while (base < h + 20) {
        const d = deep[Math.min(k, deep.length - 1)];
        layer(base, 2 + k, 5 + k * 2, 40 + k * 14, 90 + k * 26, d[0], d[1], d[2]);
        // rides
        for (let r = 0; r < w * 0.5; r++) {
          const rx = Math.floor(rnd() * w), ry = base + 4 + Math.floor(rnd() * (14 + k * 8));
          if (ry < h) { c.fillStyle = d[1]; c.fillRect(rx, ry, 2 + Math.floor(rnd() * 3), 1); }
        }
        base += 16 + k * 8;
        k++;
      }
    });
    // plateau principal : roche sombre (contraste avec le sable du fond), coiffée d'une couche de sable
    const tw = Math.round(L.mainW / PX);
    mkCanvas(this, 'main_dune', tw, 14, (c) => {
      for (let y = 0; y < 14; y++)
        for (let x = 0; x < tw; x++) {
          let col;
          const drift = 2 + (Math.sin(x * 0.21) > 0.6 ? 1 : 0); // le sable déborde un peu par endroits
          if (y === 0) col = (x * 5) % 9 === 0 ? '#fff0c0' : '#f8d490';
          else if (y < drift) col = (x + Math.floor(x / 6)) % 5 === 0 ? '#d09a58' : '#e4b46c';
          else if (y === drift) col = '#1c1824';
          else if (y === 13) col = '#141018';
          else {
            const band = Math.floor((y - 2 + Math.round(Math.sin(x * 0.15) * 1.2)) / 3) % 2;
            col = band ? '#3a3346' : '#463e56';
            if ((x * 13 + y * 7) % 19 === 0) col = '#262030';
            if (y > 4 && (x + y * 3) % 23 === 0) col = '#6a5e7e';
          }
          c.fillStyle = col;
          c.fillRect(x, y, 1, 1);
        }
    });
    // plateformes : dalles de pierre sombre gravées
    mkCanvas(this, 'soft_dune', 50, 5, (c) => {
      for (let y = 0; y < 5; y++)
        for (let x = 0; x < 50; x++) {
          let col = y === 0 ? '#b4a6c6' : y === 4 ? '#18141e' : '#4a4058';
          if (y === 1) col = '#6e6084';
          if (y === 2 && x % 8 === 3) col = '#2a2434';
          if (y === 2 && x % 8 === 4) col = '#8a7ca0';
          if (x === 0 || x === 49) col = '#2a2434';
          c.fillStyle = col;
          c.fillRect(x, y, 1, 1);
        }
    });
    // ver des sables : énorme corps annelé qui sort du sable, gueule ronde ouverte en trois lèvres
    mkCanvas(this, 'worm', 48, 72, (c) => {
      const px = (x, y, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), 1, 1); };
      const OUT = '#2e140a';
      const body = [];
      for (let y = 71; y >= 16; y--) {
        const t = (71 - y) / 55;
        const cx = 22 + 5 * Math.sin(t * 2.2 + 0.3), r = 11 - t * 1.5;
        body.push([y, cx, r]);
      }
      // contour
      body.forEach(([y, cx, r]) => { for (let x = -r - 1; x <= r + 1; x++) px(cx + x, y, OUT); });
      body.forEach(([y, cx, r]) => {
        for (let x = -r; x <= r; x++) {
          const u = x / r;
          let col = u > 0.45 ? '#c8935e' : u > -0.1 ? '#9a6840' : u > -0.6 ? '#7a4e30' : '#5a3420';
          // anneaux : lignes courbes (cylindre)
          const ring = (y + Math.round(Math.sqrt(Math.max(0, 1 - u * u)) * 2.2)) % 5;
          if (ring === 0) col = u > 0.45 ? '#8e5c38' : '#4a2a18';
          else if (ring === 1 && u > 0.2) col = '#dcae78';
          px(cx + x, y, col);
        }
      });
      // gueule (vue un peu de dessus) : lèvre, trois volets ouverts, couronnes de dents
      const mx = 22 + 5 * Math.sin(2.5), my = 15;
      const flap = (ax, ay, bx, by, tx, ty) => {
        for (let y = Math.min(ay, by, ty) - 1; y <= Math.max(ay, by, ty) + 1; y++)
          for (let x = Math.min(ax, bx, tx) - 1; x <= Math.max(ax, bx, tx) + 1; x++) {
            const s1 = (bx - ax) * (y - ay) - (by - ay) * (x - ax), s2 = (tx - bx) * (y - by) - (ty - by) * (x - bx), s3 = (ax - tx) * (y - ty) - (ay - ty) * (x - tx);
            if ((s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0)) px(x, y, y < (ay + ty) / 2 ? '#b07a4c' : '#8a5a36');
          }
      };
      flap(mx - 12, my + 1, mx - 4, my - 4, mx - 19, my - 12);
      flap(mx + 12, my + 1, mx + 4, my - 4, mx + 19, my - 12);
      flap(mx - 4, my - 4, mx + 4, my - 4, mx, my - 15);
      for (let y = -6; y <= 6; y++)
        for (let x = -13; x <= 13; x++) {
          const d = Math.hypot(x / 13, y / 6);
          if (d > 1) continue;
          const tooth = Math.floor(((Math.atan2(y / 6, x / 13) + Math.PI) / (Math.PI * 2)) * 18) % 2 === 0;
          let col;
          if (d > 0.86) col = OUT;
          else if (d > 0.72) col = '#a8764c';
          else if (d > 0.56) col = tooth ? '#e6d2b0' : '#3a140c';
          else if (d > 0.4) col = '#3a120c';
          else if (d > 0.3) col = tooth ? '#b89a7c' : '#24080a';
          else col = '#120404';
          px(mx + x, my + y, col);
        }
    });
    // ornithoptère : fuselage, cockpit, deux paires d'ailes battantes (2 images)
    [0, 1].forEach((f) =>
      mkCanvas(this, 'thopter' + f, 30, 14, (c) => {
        const r = (x, y, ww, hh, col) => { c.fillStyle = col; c.fillRect(x, y, ww, hh); };
        // ailes arrière (derrière le fuselage), plus pâles
        if (f) { r(6, 1, 11, 1, '#b8a894'); r(8, 2, 8, 1, '#b8a894'); r(12, 3, 2, 3, '#4a4450'); }
        else { r(6, 11, 11, 1, '#b8a894'); r(8, 10, 8, 1, '#b8a894'); r(12, 8, 2, 3, '#4a4450'); }
        // fuselage
        r(1, 6, 4, 1, '#2a2430'); r(4, 5, 16, 4, '#2a2430'); r(5, 6, 14, 1, '#6a6070'); r(20, 5, 5, 4, '#2a2430');
        r(21, 5, 3, 2, '#ffcf7a'); r(22, 5, 1, 1, '#fff2c8'); r(25, 6, 2, 2, '#2a2430');
        r(8, 9, 1, 2, '#2a2430'); r(17, 9, 1, 2, '#2a2430');
        // ailes avant
        if (f) { r(9, 0, 13, 1, '#f0e6d8'); r(11, 1, 9, 1, '#f0e6d8'); r(14, 2, 2, 3, '#4a4450'); }
        else { r(9, 13, 13, 1, '#f0e6d8'); r(11, 12, 9, 1, '#f0e6d8'); r(14, 9, 2, 3, '#4a4450'); }
      })
    );
  },
  // ----- vie du décor (purement visuel, jamais dans la simulation) -----
  duneAmbience() {
    const horizonY = L.baseY + 6 * PX;
    // épice : poussière dorée qui monte doucement
    const spice = this.time.addEvent({
      delay: 140,
      loop: true,
      callback: () => {
        const x = Math.random() * this.W, y = this.H * (0.45 + Math.random() * 0.5);
        const q = this.add.rectangle(x, y, 4, 4, Math.random() < 0.5 ? 0xffb347 : 0xffd27a, 0.8).setDepth(-5);
        this.tweens.add({ targets: q, x: x + 40 + Math.random() * 60, y: y - 60 - Math.random() * 80, alpha: 0, duration: 3200 + Math.random() * 1600, onComplete: () => q.destroy() });
      },
    });
    this.stageFx.push(spice);
    // un ver surgit au loin de temps en temps
    const worm = () => {
      if (this.stageId !== 'dune') return;
      const x = this.W / 2 + (Math.random() - 0.5) * L.mainW * 0.9;
      const k = PX * (1.15 + Math.random() * 0.3);
      const hgt = 72 * k;
      const wImg = this.add.image(x, horizonY + 8 + hgt, 'worm').setOrigin(0.5, 1).setScale(k).setDepth(-9).setAlpha(0.92).setFlipX(Math.random() < 0.5);
      // le ver sort du sable : on cache tout ce qui est sous la ligne des dunes
      const mg = this.make.graphics({ add: false });
      mg.fillRect(0, 0, this.W, horizonY + 8);
      wImg.setMask(mg.createGeometryMask());
      // gerbe de sable
      for (let i = 0; i < 26; i++) {
        const d = this.add.rectangle(x + (Math.random() - 0.5) * 120, horizonY + 6, 8, 8, i % 3 ? 0xd89a5a : 0xf0c27a).setDepth(-8);
        this.tweens.add({ targets: d, x: d.x + (Math.random() - 0.5) * 260, y: d.y - 60 - Math.random() * 180, alpha: 0, duration: 1100 + Math.random() * 600, delay: 150 + Math.random() * 500, ease: 'Quad.easeOut', onComplete: () => d.destroy() });
      }
      this.tweens.add({ targets: wImg, y: horizonY + 8 + hgt * 0.22, duration: 1400, ease: 'Sine.easeOut', yoyo: true, hold: 1300, onComplete: () => { wImg.destroy(); mg.destroy(); } });
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
      const t = this.add.image(dir > 0 ? -60 : this.W + 60, y, 'thopter0').setScale(PX).setDepth(-8).setFlipX(dir < 0);
      const flap = this.time.addEvent({ delay: 70, loop: true, callback: () => t.active && t.setTexture(t.texture.key === 'thopter0' ? 'thopter1' : 'thopter0') });
      this.tweens.add({ targets: t, x: dir > 0 ? this.W + 60 : -60, y: y + (Math.random() - 0.5) * 60, duration: 9000, onComplete: () => { flap.remove(false); t.destroy(); } });
    };
    const fEv = this.time.addEvent({ delay: 31000, loop: true, callback: fly });
    this.stageFx.push(fEv);
    this.time.delayedCall(2500, () => this.stageId === 'dune' && fly());
  },
});
