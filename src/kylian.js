// ===========================================================================
// KYLIAN : uniforme militaire marron d'apparat (insignes inventés), crâne rasé, air sérieux. Famille POINGS, aux pieds.
// Mécaniques :
//  - JAUGE BISOU (passif) : plus il bouge (courir, sauter…), plus elle se remplit. Pleine : une demoiselle en robe de
//    soirée rouge (personnage inventé) entre sur le terrain et lui fait un bisou. Il devient AMOUREUX pendant 12 s :
//    +20 % de dégâts, +20 % de vitesse, et son TIR part en 3 ballons (recharge plus longue).
//  - TIR (SPÉCIAL avant) : il frappe un ballon ; au-dessus de sa tête : « T'ES PAS CONTENT ? ».
//  - MOIII (SPÉCIAL haut) : tête levée, main en porte-voix, « MOIIIIII » écrit à la verticale vers le haut : la
//    zone de frappe va jusqu'au bout du mot (remonter).
//  - GENOUX (SPÉCIAL bas en l'air) : de face, à genoux, bras croisés ; en touchant le sol, petite onde de choc à ses
//    côtés (un peu plus large que lui, sans plus).
//  - TROPHÉE (SPÉCIAL bas au sol) : un grand trophée doré (inventé) sort du sol un peu plus loin et envoie vers le haut.
//  - VOLÉE (SPÉCIAL) : la reprise de volée, penché en arrière, bras écartés.
// Tout l'état de jeu est en champs simples (kyLove, kyLastX/Y, loveUntil, kyKissAt, kyKissX, kyKissF, kyTalkUntil).
// Les images (demoiselle, texte MOIII, bulle, cœurs) sont seulement de l'affichage, recalculées à chaque image.
// ===========================================================================
const KY = { max: 100, perPx: 1 / 115, perJump: 1.5, loveMs: 15000, dmgUp: 1.2, spdUp: 1.2, kissMs: 1150, lockMs: 650, talkMs: 1300, moiChars: 9 };

CHARS.kylian = {
  id: 'kylian', name: 'KYLIAN', role: 'GÉNÉRAL DU BUT', roleCol: '#f0c850', cardCol: '#6e5a36',
  speed: 375, jump: 690, weight: 1.0, jumps: 3, love: true,
  pal: { main: '#5c4a2e', dark: '#3a2e1c', skin: '#7c4c34', skin2: '#5e3624', hair: '#1a1312', accent: '#e0b040', glove: '#7c4c34' },
  fx: { main: 0xc8962a, alt: 0xe04040, core: 0xffffff, cres: 'cres_ky' },
  help: [],
  moves: {},
};
ORDER.push('kylian');

Object.assign(GameScene.prototype, {
  kyInLove(pl, now) {
    return now < (pl.loveUntil || 0);
  },

  // à chaque image (après le reste de step)
  kyStep(pl, now) {
    if (!pl.def.love) return;
    const s = pl.sprite, b = s.body;
    if (pl.kyLove === undefined) { pl.kyLove = 0; pl.kyLastX = s.x; pl.kyLastY = s.y; pl.kyJumpT = pl.lastJump || 0; }
    const love = this.kyInLove(pl, now);
    // la jauge se remplit en bougeant (pas en étant projeté, ni pendant l'amour)
    const dx = Math.abs(s.x - pl.kyLastX), dy = Math.abs(s.y - pl.kyLastY);
    const moved = dx < 40 && dy < 40 ? dx + dy * 0.5 : 0; // (réapparition, téléport : ignorés)
    if (!love && now >= pl.stunUntil && pl.stocks > 0) {
      pl.kyLove = Math.min(KY.max, pl.kyLove + moved * KY.perPx);
      if ((pl.lastJump || 0) !== pl.kyJumpT) pl.kyLove = Math.min(KY.max, pl.kyLove + KY.perJump); // un saut de plus
    }
    pl.kyJumpT = pl.lastJump || 0;
    pl.kyLastX = s.x;
    pl.kyLastY = s.y;
    // jauge pleine : le bisou dès qu'il est au sol et libre
    const grounded = !pl.ledgeSide && (b.blocked.down || b.touching.down);
    if (pl.kyLove >= KY.max && !love && grounded && !pl.atk && !pl.grab && now >= pl.stunUntil && now >= pl.cdUntil && pl.stocks > 0 && !this.over) {
      pl.kyLove = 0;
      pl.loveUntil = now + KY.loveMs;
      pl.kyKissAt = now;
      pl.kyKissX = Math.round(s.x);
      pl.kyKissF = pl.facing;
      s.setVelocityX(0);
      pl.atk = { id: ++this.atkSeq, m: { type: 'kiss', pose: 'kissed', total: KY.lockMs }, key: 'kiss', pose: 'kissed', start: now, hitAt: 1e15, end: now + KY.lockMs, moveLock: now + KY.lockMs, done: true };
      pl.cdUntil = now + KY.lockMs;
      this.sfx('charm', 0.8);
    }
    pl.spdMul = this.kyInLove(pl, now) ? KY.spdUp : 1;
    // GENOUX : en touchant le sol, petite onde de choc à ses côtés
    const a = pl.atk;
    if (a && a.m.knee && !a.kyLanded && now >= a.hitAt && grounded) {
      a.kyLanded = true;
      a.done = true;
      a.end = a.moveLock = pl.cdUntil = Math.min(a.end, now + 230);
      s.setVelocityX(0);
      const sh = a.m.shock;
      const box = new Phaser.Geom.Rectangle(b.center.x - sh.w / 2, b.bottom - sh.h, sh.w, sh.h + 6);
      for (const v of this.pls.length > 2 ? this.enemiesOf(pl) : [this.foeOf(pl)]) {
        if (!v || a.landed || now < v.invulnUntil || v.stocks <= 0 || v.grab) continue;
        const vb = v.sprite.body;
        if (Phaser.Geom.Intersects.RectangleToRectangle(box, new Phaser.Geom.Rectangle(vb.x, vb.y, vb.width, vb.height))) {
          this.applyHit(pl, v, sh, now, Math.sign(v.sprite.x - s.x) || pl.facing, null);
        }
      }
      if (!this.resim) {
        this.shockwave(b.center.x, b.bottom - 4, { main: 0xf0c850, alt: 0xffffff });
        this.dust(b.center.x, b.bottom, -1, 5, pl.def.fx);
        this.dust(b.center.x, b.bottom, 1, 5, pl.def.fx);
        this.cameras.main.shake(110, 0.006);
      }
    }
    this.kyShow(pl, now);
  },

  // ---------------------------------------------------------------------------- affichage seulement
  kyShow(pl, now) {
    const s = pl.sprite, b = s.body;
    const alive = pl.stocks > 0 && s.active;
    // MOIIIIII : le mot écrit à la verticale au-dessus de sa tête, il s'allonge jusqu'au bout de la zone de frappe
    const a = pl.atk;
    if (alive && a && a.m.moi && now >= a.hitAt - 40 && now < a.hitAt + a.m.active + 80) {
      const n = Math.min(a.m.moiN || KY.moiChars, 3 + Math.floor((now - a.hitAt + 40) / 30));
      const txt = 'MOI' + 'I'.repeat(Math.max(0, n - 3));
      if (!pl.moiTxt && !this.resim)
        pl.moiTxt = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '19px', color: '#fff3a0', stroke: '#5a1a10', strokeThickness: 6 }).setOrigin(0, 0.5).setAngle(-90).setDepth(29);
      if (pl.moiTxt) pl.moiTxt.setText(txt).setPosition(b.center.x + pl.facing * 6, b.y - 4).setColor(Math.floor(now / 70) % 2 ? '#fff3a0' : '#ffffff');
    } else if (pl.moiTxt) {
      pl.moiTxt.destroy();
      pl.moiTxt = null;
    }
    // « T'ES PAS CONTENT ? » au-dessus de sa tête après un tir
    if (alive && now < (pl.kyTalkUntil || 0)) {
      if (!pl.talkTxt && !this.resim)
        pl.talkTxt = this.add.text(0, 0, 'T\'ES PAS CONTENT ?', { fontFamily: FONT, fontSize: '14px', color: '#ffb3cc', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5, 1).setDepth(41);
      if (pl.talkTxt) pl.talkTxt.setPosition(s.x, b.y - 30).setVisible(!(now < (pl.invisUntil || 0)));
    } else if (pl.talkTxt) {
      pl.talkTxt.destroy();
      pl.talkTxt = null;
    }
    // la demoiselle : elle arrive, fait le bisou, repart
    const t = now - (pl.kyKissAt || -1e9);
    if (alive && t >= 0 && t < KY.kissMs) {
      const f = pl.kyKissF || 1;
      if (!pl.girlImg && !this.resim) {
        pl.girlImg = this.add.image(0, 0, 'kylian_girl0').setOrigin(0.5, 58 / 64).setScale(PX).setDepth(9); // (échelle corrigée par TEXSCALE, comme les persos)
        pl.girlFx = 0;
      }
      const g = pl.girlImg;
      if (g) {
        // elle arrive du côté où il regarde, s'arrête juste devant lui (face à lui), puis repart du même côté
        const far = f * 170, near = f * 46;
        let x, tex, al = 1, face = -f;
        const walk = Math.floor(t / 95) % 2 ? 'kylian_girl1' : 'kylian_girl0';
        if (t < 380) { const u = t / 380; x = far + (near - far) * u; tex = walk; al = Math.min(1, t / 140); }
        else if (t < 780) { x = near; tex = 'kylian_girlKiss'; }
        else { const u = (t - 780) / (KY.kissMs - 780); x = near + f * 150 * u; tex = walk; al = 1 - u; face = f; }
        g.setTexture(tex).setPosition(pl.kyKissX + x, b.bottom + 1).setFlipX(face < 0).setAlpha(al);
        if (t >= 520 && !pl.girlFx) {
          pl.girlFx = 1;
          this.popup(pl.kyKissX + f * 24, b.y - 50, 'SMACK !', '#ff7eb6');
          for (let i = 0; i < 5; i++) this.heartFx(pl.kyKissX + f * 24 + (Math.random() - 0.5) * 30, b.y - 14 - Math.random() * 16, 1.1);
        }
      }
    } else if (pl.girlImg) {
      pl.girlImg.destroy();
      pl.girlImg = null;
    }
    // amoureux : des petits cœurs ; jauge pleine (en attente du bisou) : un cœur qui clignote
    if (!this.resim && alive && this.kyInLove(pl, now) && now - (pl.heartAt || 0) > 160 && !(now < (pl.invisUntil || 0))) {
      pl.heartAt = now;
      this.heartFx(s.x + (Math.random() - 0.5) * 50, s.y - 10 - Math.random() * 30, 1.2);
    }
  },

  // TIR : 3 ballons quand il est amoureux ; la bulle « T'ES PAS CONTENT ? »
  kyPick(pl, m, now) {
    if (pl.def.love && m.kyShot && this.kyInLove(pl, now) && pl.def.moves.sSL) return pl.def.moves.sSL;
    return m;
  },

  makeKyTextures() {
    crescentTex(this, 'cres_ky', ['#ffffff', '#fff0a0', '#c8962a']);
    // ballon de foot
    iconTex(this, 'kyball', ['..kkkkk..', '.kWWkWWk.', 'kWWkkkWWk', 'kWWWkWWWk', 'kkWWWWWkk', 'kWkWWWkWk', 'kWWkkkWWk', '.kWWkWWk.', '..kkkkk..'], '#000',
      { k: '#16121a', W: '#f4f4f0' });
    // TROPHÉE (dessin à nous, demande de Noah : « une boule dorée, stylée ») : ballon d'or gravé, collerette à griffes,
    // colonne cannelée, socle noir à liseré d'or et plaque (dessiné par tools/art/ky_cup.py)
    iconTex(this, 'kyCup', [
      "........kkkkkk.........", "......kkYYYGYYkk.......", "....kkYYyyyGyYYYkk.....", "...kYYyyyyyGYYYYYgk....",
      "...kYyWWyyYGYYYYYgk....", "..kYyWWyyYYGYYYYYogk...", ".kYyyWyyYYYGYYYYooogk..", ".kYyyyYYYYGGYYooooogk..",
      ".kGGGYYYYGGGGooooGGGk..", "kYYyGGGGGooooGGGGGoggk.", "kYYYYYYGooooooGooogggk.", "kYYYYYYYGooooGoooggggk.",
      ".kYYYYYYGooooGooggggk..", ".kYYYYooGooooGggggggk..", ".kgYYoooGGGGGGggggggk..", "..kgoooGooooggGggggk...",
      "...kgoGGooggggGGggk....", "...kggGooggggggGggk....", "....kYggggggggggkYk....", ".....kYkYgggggYkYk.....",
      "......kGGGGGGGGGk......", "......kgooooooogk......", ".......kGGGGGGGk.......", "........kYyYogk........",
      "........kYyYogk........", "........kgggggk........", "........kYyYogk........", "........kYyYogk........",
      "........kYyYogk........", ".....kkkGGGGGGGkkk.....", "....kGGGGGGGGGGGGGk....", "....kbBBBBBBBBBBBBk....",
      "...kbBBBBBBBBBBBBBBk...", "...kbBBBYYYyYYYBBBBk...", "..kbBBBBgggggggBBBBBk..", "..kbBBBBBBBBBBBBBBBBk..",
      "..kGGGGGGGGGGGGGGGGGk..", "...kkkkkkkkkkkkkkkkk...",
    ], '#000', { k: '#140e04', Y: '#f0c850', y: '#fff0a0', o: '#d4a034', g: '#9a6a18', G: '#7a5010', W: '#ffffff', B: '#18161e', b: '#34303e' });
  },
});

(() => {
  const P = GameScene.prototype;
  const baseTex = P.makeExtraTextures;
  P.makeExtraTextures = function () {
    if (baseTex) baseTex.call(this);
    this.makeKyTextures();
  };
  const baseStep = P.bzStep;
  P.bzStep = function (pl, other, now) {
    if (baseStep) baseStep.call(this, pl, other, now);
    this.kyStep(pl, now);
  };
  // amoureux : +20 % de dégâts
  const baseHit = P.bzHit;
  P.bzHit = function (att, vic, spec, now) {
    if (baseHit) spec = baseHit.call(this, att, vic, spec, now);
    if (att.def.love && att !== vic && this.kyInLove(att, now)) spec = Object.assign({}, spec, { dmg: spec.dmg * KY.dmgUp });
    return spec;
  };
  const basePick = P.nxPick;
  P.nxPick = function (pl, m, now) {
    if (basePick) m = basePick.call(this, pl, m, now);
    return m ? this.kyPick(pl, m, now) : m;
  };
  const baseStart = P.nxStart;
  P.nxStart = function (pl, m, now, grounded) {
    if (baseStart) baseStart.call(this, pl, m, now, grounded);
    if (pl.def.love && m.kyShot && m.spread) pl.kyTalkUntil = now + KY.talkMs; // seulement le tir amoureux (3 ballons)
  };
  // perdre une vie : fini l'amour (la jauge, elle, reste)
  const baseDie = P.die;
  P.die = function (pl, now) {
    if (pl.def.love) { pl.loveUntil = 0; pl.kyTalkUntil = 0; pl.kyKissAt = -1e9; }
    return baseDie.call(this, pl, now);
  };
})();
