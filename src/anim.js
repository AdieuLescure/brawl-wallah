// ===========================================================================
// ANIMATION D'AFFICHAGE : chaque perso a deux objets
//  - pl.sprite : le corps physique (invisible), seul à compter pour le combat
//  - pl.view   : l'image qu'on voit, qui suit le corps et ajoute la souplesse : écrasement à l'atterrissage,
//    étirement au saut, préparation et détente des coups, tremblement quand on est touché, vrille quand on est
//    éjecté fort, petit balancement en courant, respiration à l'arrêt.
// Rien ici ne touche la simulation : en ligne, les deux téléphones restent identiques.
// Postures en plus (si le dessin existe) : '<coup>Pre' pendant la préparation, 'fall' en chute, 'crouch' à
// l'atterrissage, course en 4 temps (run0, run2, run1, run3).
// ===========================================================================
(() => {
  const P = GameScene.prototype;
  const baseMake = P.makePlayer;
  P.makePlayer = function (charId, x, y, isHuman) {
    const pl = baseMake.call(this, charId, x, y, isHuman);
    const s = pl.sprite;
    pl.view = this.add.image(s.x, s.y, s.texture.key).setDepth(s.depth);
    s.setVisible(false);
    pl.anim = { sx: 1, sy: 1, ang: 0, spin: 0, ox: 0, oy: 0, wasGround: true, prevVy: 0, stunSeen: 0, shake: 0, land: 0, t: 0, key: '' };
    return pl;
  };
  const baseUpdate = P.update;
  P.update = function (time, delta) {
    baseUpdate.call(this, time, delta);
    const dt = Math.min(delta, 50) / 1000;
    if (this.pls && this.p1 && this.p1.view) this.pls.forEach((pl) => this.syncView(pl, dt));
    this.updateCamera(dt);
  };

  const lerp = (a, b, k) => a + (b - a) * k;
  // la posture existe-t-elle vraiment dans la planche dessinée ? (sinon la texture n'est qu'une copie de la garde)
  const PNG_HAS = (ch, n) => !(typeof PNG_CHARS !== 'undefined' && PNG_CHARS[ch]) || PNG_CHARS[ch].names.includes(n);

  const CAM_MIN_Z = 0.72; // dézoom maximal quand les persos sont très loin (plus de place sur les côtés et en haut)
  Object.assign(P, {
    // --- CAMÉRA À LA BRAWLHALLA : elle suit les deux persos et zoome quand ils sont proches.
    // Une deuxième caméra, fixe, affiche l'interface (profondeur >= 50 : barre de vie, boutons, menus).
    updateCamera(dt) {
      const cam = this.cameras.main;
      if (!this.uiCam || !this.cameras.cameras.includes(this.uiCam)) {
        this.uiCam = this.cameras.add(0, 0, this.W, this.H);
        this.uiCam.transparent = true;
        cam.setBounds(0, 0, this.W, this.H);
        this.camZ = 1;
        this.camX = this.W / 2;
        this.camY = this.H / 2;
      }
      const ui = this.uiCam;
      // 3e caméra, dessinée en premier : le décor du fond (profondeur <= -5). Quand la caméra du combat
      // dézoome (persos très loin), le fond, lui, ne rapetisse pas : il couvre toujours tout l'écran.
      if (!this.bgCam || !this.cameras.cameras.includes(this.bgCam)) {
        this.bgCam = this.cameras.add(0, 0, this.W, this.H);
        const arr = this.cameras.cameras;
        arr.splice(arr.indexOf(this.bgCam), 1);
        arr.unshift(this.bgCam);
      }
      const bgc = this.bgCam;
      const list = this.children.list;
      for (let i = 0; i < list.length; i++) {
        const o = list[i];
        o.cameraFilter = o.depth >= 50 ? cam.id | bgc.id : o.depth <= -5 ? cam.id | ui.id : ui.id | bgc.id;
      }
      // cible : les deux persos (vivants) avec de la marge
      let tz = 1, tx = this.W / 2, ty = this.H / 2;
      const inMatch = this.p1 && this.p2 && this.p1.view && (this.state === 'play' || this.state === 'countdown') && !this.over;
      if (inMatch && SETTINGS.zoom !== false) {
        // un perso invisible (DOUBLURE) : la caméra suit sa silhouette de billets, pas lui
        const pts = this.pls.filter((p) => p.stocks > 0 || this.training).map((p) => {
          const d = (this.nowT || 0) < (p.invisUntil || 0) && this.projs.find((q) => !q.dead && q.id === p.decoyId);
          return d ? { x: d.x, y: d.y } : p.sprite;
        });
        if (pts.length) {
          const x0 = Math.min(...pts.map((p) => p.x)), x1 = Math.max(...pts.map((p) => p.x));
          const y0 = Math.min(...pts.map((p) => p.y)), y1 = Math.max(...pts.map((p) => p.y));
          const w = x1 - x0 + 520, h = y1 - y0 + 380;
          tz = Math.max(CAM_MIN_Z, Math.min(L.portrait ? 1.9 : 1.75, this.W / w, this.H / h));
          tx = (x0 + x1) / 2;
          ty = (y0 + y1) / 2 - 30;
        }
      }
      // coup final (show.js) : la caméra zoome sur la victime et la suit
      const cf = this.camForce;
      if (cf) { tz = cf.z; tx = cf.x; ty = cf.y; }
      const k = Math.min(1, dt * (cf ? 7 : 4));
      this.camZ += (tz - this.camZ) * k;
      this.camX += (tx - this.camX) * Math.min(1, dt * (cf ? 10 : 6));
      this.camY += (ty - this.camY) * Math.min(1, dt * (cf ? 10 : 6));
      cam.setZoom(this.camZ);
      // dézoomé (< 1) : on peut voir un peu au-delà de l'écran de base (zone de jeu plus grande)
      const zo = Math.min(this.camZ, 1);
      const vw = this.W / zo, vh = this.H / zo;
      cam.setBounds(this.W / 2 - vw / 2, L.baseY - L.baseY / zo, vw, vh);
      cam.centerOn(this.camX, this.camY);
      // PARALLAXE : chaque plan du décor suit la caméra d'une fraction f (le lointain bouge et grossit peu),
      // sans jamais laisser voir ses bords ; la 3e caméra, elle, reste fixe
      if (this.planes && this.planes.length) {
        bgc.setZoom(1);
        bgc.centerOn(this.W / 2, this.H / 2);
        // centre RÉEL de la caméra (après les limites ; midPoint n'est recalculé qu'au rendu)
        const sxc = cam.useBounds ? cam.clampX(cam.scrollX) : cam.scrollX, syc = cam.useBounds ? cam.clampY(cam.scrollY) : cam.scrollY;
        const mx = sxc + this.W / 2, my = syc + this.H / 2;
        for (const p of this.planes) {
          const zl = Math.max(1, 1 + (this.camZ - 1) * p.f);
          const hw = this.W / (2 * zl), hh = this.H / (2 * zl);
          const px = Math.min(this.W - hw, Math.max(hw, this.W / 2 + (mx - this.W / 2) * p.f));
          // en hauteur, chaque plan (sauf le ciel) reste calé sur la ligne du sol : le pied du décor ne « décolle »
          // jamais du terrain quand la caméra monte ou descend (sinon on voyait un grand vide brumeux sous les persos)
          const by = L.baseY;
          const py0 = p.id === 'sky' ? this.H / 2 + (my - this.H / 2) * p.f : by - ((by - my) * this.camZ) / zl;
          // (le haut de ces plans est transparent, et leur bas est prolongé par une « jupe » de leur couleur : setPlanes)
          const py = p.id === 'sky' ? Math.min(this.H - hh, Math.max(hh, py0)) : py0;
          p.c.setScale(zl);
          p.c.setPosition(this.W / 2 - px * zl, this.H / 2 - py * zl);
        }
      } else if (this.camZ >= 1) {
        bgc.setZoom(this.camZ);
        bgc.setBounds(0, 0, this.W, this.H);
        bgc.centerOn(cam.midPoint.x, cam.midPoint.y);
      } else {
        bgc.setZoom(1);
        bgc.centerOn(this.W / 2, this.H / 2);
      }
    },

    hasTex(key) {
      if (!this._texOk) this._texOk = new Map();
      let v = this._texOk.get(key);
      if (v === undefined) {
        v = this.textures.exists(key);
        this._texOk.set(key, v);
      }
      return v;
    },

    syncView(pl, dt) {
      const s = pl.sprite, v = pl.view, a = pl.anim, b = s.body;
      if (!v || !v.active) return;
      const now = this.nowT || 0;
      const frozen = this.freezeLeft > 0 || this.over || this.state !== 'play';
      a.t += dt;
      const grounded = !pl.ledgeSide && (b.blocked.down || b.touching.down);
      const vx = b.velocity.x, vy = b.velocity.y;
      const stunned = now < pl.stunUntil;
      let tsx = 1, tsy = 1, tang = 0, tox = 0;
      // --- événements
      if (!frozen) {
        if (a.wasGround && !grounded && vy < -150 && !stunned) { a.sx = 0.84; a.sy = 1.18; }
        if (!a.wasGround && grounded && a.prevVy > 220) {
          const k = Math.min(a.prevVy / 1300, 1);
          a.sx = 1.12 + 0.12 * k;
          a.sy = 0.86 - 0.1 * k;
          a.land = 0.09;
          this.sfx('land', k);
          if (k > 0.3) this.dust(s.x, b.bottom, 0, 3, pl.def.fx);
        }
        a.wasGround = grounded;
        a.prevVy = vy;
      }
      // coup reçu : petit écrasement et tremblement
      if (pl.stunStart && pl.stunStart !== a.stunSeen && stunned) {
        a.stunSeen = pl.stunStart;
        a.shake = 0.18;
        a.sx = 0.86;
        a.sy = 1.12;
      }
      a.land = Math.max(0, a.land - dt);
      // --- cibles selon l'état
      const atk = pl.atk;
      if (atk && !stunned) {
        const m = atk.m;
        const hitAt = atk.hitAt, act = m.active || 120;
        if (atk.charging) { tsx = 1.05; tsy = 0.96; tang = -pl.facing * 4; }
        else if (atk.chg && now < hitAt) {
          // lourd en charge : ramassé, et il tremble de plus en plus
          tsx = 1.1; tsy = 0.9; tang = -pl.facing * 8; tox = -pl.facing * 4;
          a.shake = Math.max(a.shake, 0.03 * Math.min(atk.chg / (m.chargeMax || 500), 1) + 0.01);
        }
        else if (now < hitAt) {
          // préparation : on se ramasse et on recule le buste
          const k = Math.min((now - atk.start) / Math.max(hitAt - atk.start, 1), 1);
          tsx = 1 + 0.07 * k; tsy = 1 - 0.06 * k; tang = -pl.facing * 6 * k; tox = -pl.facing * 3 * k;
        } else if (now < hitAt + act) {
          // détente : on s'étire dans le sens du coup
          tsx = 1.1; tsy = 0.94; tang = pl.facing * 5; tox = pl.facing * 5;
          if ((m.oy || 0) < -40) { tsx = 0.94; tsy = 1.1; tang = 0; tox = 0; } // coups vers le haut
        } else { tang = pl.facing * 2; }
      } else if (stunned) {
        const sp = Math.hypot(vx, vy);
        if (sp > 950 && !grounded) a.spin += (vx >= 0 ? 1 : -1) * dt * Math.min(sp, 2200) * 0.9;
        tang = Math.max(-20, Math.min(20, vx / 60));
      } else if (!grounded) {
        tsy = 1 + Math.min(Math.abs(vy) / 9000, 0.07);
        tsx = 1 - Math.min(Math.abs(vy) / 12000, 0.05);
        tang = Math.max(-6, Math.min(6, vx / 120));
      } else if (Math.abs(vx) > 60) {
        tang = Math.max(-5, Math.min(5, vx / 70));
      } else {
        tsy = 1 + 0.012 * Math.sin(a.t * 3.2);
      }
      if (!stunned) a.spin = lerp(a.spin, Math.round(a.spin / 360) * 360, Math.min(1, dt * 10));
      // --- lissage (ressort amorti)
      if (!frozen) {
        const k = Math.min(1, dt * 16);
        a.sx = lerp(a.sx, tsx, k);
        a.sy = lerp(a.sy, tsy, k);
        a.ang = lerp(a.ang, tang, Math.min(1, dt * 12));
        a.ox = lerp(a.ox, tox, Math.min(1, dt * 14));
      }
      let jx = 0, jy = 0;
      if (a.shake > 0) {
        a.shake -= dt;
        jx = (Math.random() - 0.5) * 7;
        jy = (Math.random() - 0.5) * 4;
      }
      // course : petit rebond
      const running = grounded && Math.abs(vx) > 60 && !atk && !stunned;
      const bob = running ? -Math.abs(Math.sin(a.t * 11)) * 2.5 : 0;

      // --- posture affichée (variantes dessinées si elles existent)
      let key = s.texture.key;
      const ch = pl.char;
      // version dorée (BIGZINZIN en JACKPOT) : même posture, suffixe « _g »
      const gs = VARIANTS.find((v) => key.endsWith(v)) || '';
      const name = key.slice(ch.length + 1, key.length - gs.length);
      if (atk && !stunned && now < atk.hitAt && !atk.m.prePose && !atk.charging) {
        const pre = `${ch}_${atk.pose || atk.m.pose}Pre${gs}`;
        if (this.hasTex(pre) && PNG_HAS(ch, `${atk.pose || atk.m.pose}Pre`)) key = pre;
      } else if (name === 'jump' && vy > 140 && this.hasTex(`${ch}_fall${gs}`)) key = `${ch}_fall${gs}`;
      else if ((name === 'idle0' || name === 'idle1') && a.land > 0 && this.hasTex(`${ch}_crouch${gs}`)) key = `${ch}_crouch${gs}`;
      else if ((name === 'run0' || name === 'run1') && this.hasTex(`${ch}_run2${gs}`)) {
        key = `${ch}_${['run0', 'run2', 'run1', 'run3'][Math.floor(now / 85) % 4]}${gs}`;
      }
      // couleur d'équipe : même posture, planche recolorée (« toro~2_run0 »)
      if (pl.tex && key.startsWith(ch + '_')) key = pl.tex + key.slice(ch.length);
      if (key !== a.key) {
        v.setTexture(key);
        a.key = key;
      }
      // --- recopie de l'apparence du corps
      const h = s.displayHeight;
      v.scaleX = s.scaleX * a.sx;
      v.scaleY = s.scaleY * a.sy;
      v.setFlipX(s.flipX);
      v.angle = s.angle + a.ang + a.spin;
      v.x = s.x + a.ox + jx;
      v.y = s.y + (h / 2) * (1 - a.sy) + bob + jy;
      v.alpha = s.alpha;
      v.visible = pl.stocks > 0 || this.training;
      v.depth = s.depth;
      if (s.tintFill) v.setTintFill(s.tintTopLeft);
      else if (s.isTinted) v.setTint(s.tintTopLeft);
      else if (v.isTinted) v.clearTint();
    },
  });
})();
