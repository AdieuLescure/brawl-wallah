// ===========================================================================
// TERRAINS : « NUIT » (la ville, d'origine) et « DÉSERT » (une planète de sable : dunes, deux lunes,
// mesas, cité de béton, épice qui flotte, vers géants qui surgissent au loin, ornithoptère qui passe).
// Le décor ne change rien au combat : mêmes plateformes, mêmes dimensions.
// ===========================================================================
function stageFromCode(code) {
  let h = 0;
  for (const ch of String(code || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 2 ? 'dune' : 'night';
}

Object.assign(GameScene.prototype, {
  pickStage() {
    const s = SETTINGS.stage === undefined ? 2 : SETTINGS.stage;
    if (s === 0) return 'night';
    if (s === 1) return 'dune';
    return Math.random() < 0.5 ? 'night' : 'dune';
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
      // mesas lointaines
      let x = 0;
      while (x < w) {
        const bw = 10 + Math.floor(rnd() * 22), bh = 6 + Math.floor(rnd() * 14);
        c.fillStyle = '#8a3c2c';
        for (let i = 0; i < bw; i++) {
          const slope = Math.min(i, bw - 1 - i) < 3 ? 3 - Math.min(i, bw - 1 - i) : 0;
          c.fillRect(x + i, horizon - 6 - bh + slope, 1, bh + 8);
        }
        c.fillStyle = '#a24c34';
        c.fillRect(x + 3, horizon - 6 - bh, Math.max(bw - 6, 1), 1);
        x += bw + 4 + Math.floor(rnd() * 26);
      }
      // cité de béton au loin : blocs massifs à toits inclinés, quelques fenêtres chaudes
      const cx0 = Math.round(w * 0.06);
      [[0, 18, 10], [11, 26, 8], [20, 14, 12], [33, 22, 6]].forEach(([dx, bh, bw]) => {
        c.fillStyle = '#5a2626';
        for (let i = 0; i < bw; i++) c.fillRect(cx0 + dx + i, horizon - 8 - bh + Math.floor(i * 0.5), 1, bh + 10);
        c.fillStyle = '#ffb45a';
        for (let k = 0; k < 3; k++) c.fillRect(cx0 + dx + 2 + Math.floor(rnd() * (bw - 3)), horizon - 4 - Math.floor(rnd() * bh), 1, 1);
      });
      // trois rangées de dunes (crête claire, versant ombré)
      const layer = (base, amp, f1, f2, ph, col, crest, shade) => {
        const topAt = (xx) => Math.round(base - amp * (0.6 * Math.sin(xx * f1 + ph) + 0.4 * Math.sin(xx * f2 + ph * 2.3)));
        for (let xx = 0; xx < w; xx++) {
          const top = topAt(xx), next = topAt(xx + 1);
          c.fillStyle = col;
          c.fillRect(xx, top, 1, h);
          // versant à l'ombre : seulement une bande sous la crête
          if (next > top || topAt(xx + 3) > top + 1) {
            c.fillStyle = shade;
            c.fillRect(xx, top + 1, 1, 3 + Math.round(amp * 0.5));
          }
          c.fillStyle = crest;
          c.fillRect(xx, top, 1, 1);
        }
      };
      layer(horizon - 3, 5, 0.05, 0.13, 0.4, '#c8783e', '#f2b06a', '#a65c30');
      layer(horizon + 4, 6, 0.035, 0.09, 1.7, '#b4642f', '#e2a05c', '#8e4a24');
      layer(horizon + 12, 5, 0.03, 0.11, 2.9, '#94502a', '#c88448', '#743a1e');
      // avant-plan : dunes dans l'ombre, de plus en plus sombres vers le bas, rides de vent
      const deep = [['#6e3620', '#8a4a2a', '#5a2a18'], ['#5a2a18', '#743c22', '#48200f'], ['#46200f', '#5e301a', '#381809'], ['#36180b', '#4a2414', '#2a1207'], ['#2a1208', '#3a1c0e', '#200d05']];
      let base = horizon + 22, k = 0;
      while (base < h + 20) {
        const d = deep[Math.min(k, deep.length - 1)];
        layer(base, 4 + k * 2, 0.025 + k * 0.004, 0.07, 3.1 + k * 1.9, d[0], d[1], d[2]);
        // rides
        for (let r = 0; r < w * 0.5; r++) {
          const rx = Math.floor(rnd() * w), ry = base + 4 + Math.floor(rnd() * (14 + k * 8));
          if (ry < h) { c.fillStyle = d[1]; c.fillRect(rx, ry, 2 + Math.floor(rnd() * 3), 1); }
        }
        base += 16 + k * 8;
        k++;
      }
    });
    // plateau principal : sable sur le dessus, grès en strates dessous
    const tw = Math.round(L.mainW / PX);
    mkCanvas(this, 'main_dune', tw, 14, (c) => {
      for (let y = 0; y < 14; y++)
        for (let x = 0; x < tw; x++) {
          let col;
          if (y === 0) col = (x * 5) % 9 === 0 ? '#fff0b8' : '#f4c880';
          else if (y === 1) col = (x + Math.floor(x / 6)) % 5 === 0 ? '#c88a48' : '#dca460';
          else if (y === 13) col = '#3a1a10';
          else {
            const band = Math.floor((y - 2 + Math.round(Math.sin(x * 0.18) * 1.2)) / 2) % 3;
            col = ['#b8653a', '#a2532e', '#c67e48'][band];
            if ((x * 13 + y * 7) % 23 === 0) col = '#7c3a20';
            if (y > 3 && (x + y * 3) % 17 === 0) col = '#d89a62';
          }
          c.fillStyle = col;
          c.fillRect(x, y, 1, 1);
        }
    });
    // plateformes : dalles de pierre gravées
    mkCanvas(this, 'soft_dune', 50, 5, (c) => {
      for (let y = 0; y < 5; y++)
        for (let x = 0; x < 50; x++) {
          let col = y === 0 ? '#ecc08a' : y === 4 ? '#4a2412' : '#a86a40';
          if (y === 1) col = '#c88a54';
          if (y === 2 && x % 8 === 3) col = '#6e3a1e';
          if (y === 2 && x % 8 === 4) col = '#d8a06a';
          if (x === 0 || x === 49) col = '#6e3a1e';
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
      const k = PX * (1.5 + Math.random() * 0.4);
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
