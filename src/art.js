// ===========================================================================
// ART HD (vectoriel, dessiné en canvas) pour les cinématiques de coup final
// Style "cel" : aplats + gros contour encre, dans la même palette que les sprites pixel.
// ===========================================================================
const INK = '#14121c';

function hdSeg(x, y, a, l) {
  const r = (a * Math.PI) / 180;
  return [x + Math.sin(r) * l, y + Math.cos(r) * l];
}

function hdStroke(c, pts, w, col) {
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.strokeStyle = INK;
  c.lineWidth = w + 10;
  c.stroke();
  c.strokeStyle = col;
  c.lineWidth = w;
  c.stroke();
}

function hdPoly(c, pts, fill, lw) {
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath();
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (lw) {
    c.lineJoin = 'round';
    c.strokeStyle = INK;
    c.lineWidth = lw;
    c.stroke();
  }
}

function hdEllipse(c, x, y, rx, ry, fill, lw, rot) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2);
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (lw) {
    c.strokeStyle = INK;
    c.lineWidth = lw;
    c.stroke();
  }
}

// --- Styles de personnages HD -----------------------------------------------
const HD_LULU = {
  skin: '#e9b896', skin2: '#c98f6a', hair: '#33200f', hairHl: '#5b3a1f',
  jacket: '#8b929d', jacketDk: '#646b76', jacketLt: '#b4bac4', thigh: '#6f7683', shin: '#6f7683',
  sleeve: '#8b929d', foreSleeve: '#8b929d', shirt: '#f4f4f6', tie: '#3f5fb8', shoe: '#1b1822',
  mustache: true, hairStyle: 'messy',
};
const HD_TORO = {
  skin: '#f1c27d', skin2: '#c9955a', hair: '#15110f', hairHl: '#2f2723',
  jacket: '#e63946', jacketDk: '#9b1c2c', jacketLt: '#ff6b78', thigh: '#8c1c26', shin: '#8c1c26',
  sleeve: '#f1c27d', foreSleeve: null, backArm: '#c9955a', hand: '#ffffff', shirt: null, tie: null, shoe: '#2b2740',
  mustache: false, hairStyle: 'messy', headband: '#e63946',
};
const HD_ASTRA = {
  skin: '#e8c8a9', skin2: '#b99a7c', hair: '#1a1030', hairHl: '#2d1b55',
  jacket: '#7a5cff', jacketDk: '#3b2a8c', jacketLt: '#a58cff', thigh: '#3b2a8c', shin: '#3b2a8c',
  sleeve: '#7a5cff', foreSleeve: '#7a5cff', hand: '#7df9ff', shirt: null, tie: null, shoe: '#2b2740',
  mustache: false, hood: true, skirt: true, noStripe: true,
};
const HD_GROM = {
  skin: '#eab995', skin2: '#b9805a', hair: '#7a3b12', hairHl: '#9b5424',
  jacket: '#2a9d8f', jacketDk: '#17594f', jacketLt: '#4fc5b5', thigh: '#17594f', shin: '#17594f',
  sleeve: '#eab995', foreSleeve: null, backArm: '#b9805a', hand: '#aeb6c4', shirt: null, tie: null, shoe: '#2b2740',
  mustache: false, hairStyle: 'short', beard: '#7a3b12', pauldron: '#7d8794', noStripe: true,
};
const HD_DENO = {
  skin: '#c18a60', skin2: '#9a6a46', hair: '#15110f', hairHl: '#2d2622',
  jacket: '#262630', jacketDk: '#14141a', jacketLt: '#3d3d4c', thigh: '#14141a', shin: '#14141a',
  sleeve: '#262630', foreSleeve: '#262630', hand: '#c18a60', shirt: null, tie: null, shoe: '#0c0c10',
  mustache: false, hairStyle: 'short', beard: '#15110f', skirt: true, noStripe: true, hem: '#3d3d4c',
};
const HD_NINI = {
  skin: '#d9a077', skin2: '#b57c55', hair: '#3a2216', hairHl: '#a8642d',
  jacket: '#f4f0e8', jacketDk: '#c9c2b4', jacketLt: '#ffffff', thigh: '#6f93c9', shin: '#6f93c9',
  sleeve: '#d9a077', foreSleeve: null, backArm: '#b57c55', hand: '#d9a077', shirt: null, tie: null, shoe: '#6b7a2e',
  mustache: false, hairStyle: 'messy', noStripe: true,
};
const HD_STYLES = { nini: HD_NINI, deadlulu: HD_LULU, toro: HD_TORO, astra: HD_ASTRA, grom: HD_GROM, denodoom: HD_DENO };
const HD_FOOT = {
  skin: '#c68a62', skin2: '#a26c47', hair: '#15110f', hairHl: '#2a211c',
  jacket: '#d6293e', jacketDk: '#9b1c2c', jacketLt: '#ff5a6e', thigh: '#f5f5f5', shin: '#d6293e',
  sleeve: '#d6293e', foreSleeve: null, shirt: null, tie: null, shoe: '#101014',
  mustache: false, hairStyle: 'short', kit: true,
};

// --- Tête vue de profil (tournée vers la droite) -----------------------------
function hdHoodHead(c, S, mood) {
  // pointe de capuche vers l'arrière
  hdPoly(c, [[-56, -14], [-104, 26], [-52, 40]], S.jacketDk, 6);
  // capuche
  c.beginPath();
  c.moveTo(-52, 34);
  c.quadraticCurveTo(-82, -52, -20, -80);
  c.quadraticCurveTo(44, -94, 64, -28);
  c.quadraticCurveTo(72, 12, 44, 40);
  c.quadraticCurveTo(10, 58, -52, 34);
  c.closePath();
  c.fillStyle = S.jacket;
  c.fill();
  c.lineJoin = 'round';
  c.strokeStyle = INK;
  c.lineWidth = 6;
  c.stroke();
  // visage dans l'ombre
  c.beginPath();
  c.ellipse(26, 2, 32, 40, 0, 0, Math.PI * 2);
  c.fillStyle = '#24173f';
  c.fill();
  // yeux lumineux
  hdEllipse(c, 36, -6, 10, 7, '#7df9ff', 0);
  hdEllipse(c, 39, -6, 4, 4, '#ffffff', 0);
  if (mood === 'yell') hdEllipse(c, 34, 26, 9, 6, '#0f0a22', 0);
  // liseré doré de la capuche
  c.strokeStyle = '#ffd166';
  c.lineWidth = 5;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-18, -76);
  c.quadraticCurveTo(44, -90, 62, -28);
  c.quadraticCurveTo(66, 4, 50, 28);
  c.stroke();
}

function hdHeadSide(c, S, mood) {
  if (S.hood) {
    hdHoodHead(c, S, mood);
    return;
  }
  // oreille
  hdEllipse(c, -12, 8, 10, 15, S.skin2, 5);
  // crâne
  hdEllipse(c, 0, 0, 40, 47, S.skin, 6);
  // nez
  hdPoly(c, [[36, 4], [56, 24], [38, 28]], S.skin, 5);
  // menton / ombre
  c.beginPath();
  c.ellipse(0, 0, 36, 43, 0, 0.15 * Math.PI, 0.85 * Math.PI);
  c.strokeStyle = S.skin2;
  c.lineWidth = 6;
  c.stroke();
  // cheveux
  c.beginPath();
  if (S.hairStyle === 'messy') {
    c.moveTo(-42, 10);
    c.quadraticCurveTo(-60, -42, -22, -60);
    c.lineTo(-30, -80);
    c.lineTo(-8, -64);
    c.lineTo(-4, -88);
    c.lineTo(14, -66);
    c.lineTo(26, -84);
    c.lineTo(36, -58);
    c.lineTo(56, -48);
    c.quadraticCurveTo(44, -34, 32, -32);
    c.lineTo(36, -22);
    c.quadraticCurveTo(8, -42, -12, -26);
    c.quadraticCurveTo(-24, -10, -30, 10);
  } else {
    c.moveTo(-42, 8);
    c.quadraticCurveTo(-56, -46, -10, -58);
    c.quadraticCurveTo(30, -66, 44, -30);
    c.lineTo(38, -24);
    c.quadraticCurveTo(10, -38, -16, -24);
    c.quadraticCurveTo(-26, -8, -30, 8);
  }
  c.closePath();
  c.fillStyle = S.hair;
  c.fill();
  c.strokeStyle = INK;
  c.lineWidth = 6;
  c.lineJoin = 'round';
  c.stroke();
  c.strokeStyle = S.hairHl;
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(-18, -50);
  c.quadraticCurveTo(4, -64, 24, -56);
  c.stroke();
  // oeil
  hdEllipse(c, 18, -2, 10, 8, '#ffffff', 4);
  hdEllipse(c, 22, -2, 5, 5, INK, 0);
  c.fillStyle = '#fff';
  c.fillRect(21, -5, 3, 3);
  // sourcil
  c.strokeStyle = S.hair;
  c.lineWidth = 9;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(6, mood === 'yell' ? -18 : -16);
  c.lineTo(32, -8);
  c.stroke();
  // moustache fine
  if (S.mustache) {
    c.strokeStyle = S.hair;
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(14, 20);
    c.quadraticCurveTo(30, 16, 46, 22);
    c.stroke();
  }
  // serre-tête
  if (S.headband) {
    hdPoly(c, [[-40, -42], [-104, -34], [-76, -16], [-108, 6], [-42, -6]], S.headband, 5);
    hdPoly(c, [[-42, -26], [40, -40], [44, -22], [-42, -6]], S.headband, 5);
  }
  // barbe
  if (S.beard) {
    hdPoly(c, [[-14, 6], [26, 2], [60, 12], [56, 40], [28, 66], [-4, 52]], S.beard, 6);
    c.strokeStyle = S.hairHl;
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(6, 26);
    c.quadraticCurveTo(26, 40, 46, 30);
    c.stroke();
  }
  // bouche
  c.strokeStyle = INK;
  c.lineWidth = 5;
  c.beginPath();
  if (S.beard) {
    // bouche cachée dans la barbe
    c.moveTo(28, 28);
  } else if (mood === 'yell') {
    c.ellipse(26, 33, 10, 8, 0, 0, Math.PI * 2);
    c.fillStyle = '#7a1f2b';
    c.fill();
    c.stroke();
  } else {
    c.moveTo(16, 33);
    c.lineTo(38, 31);
    c.stroke();
  }
}

// --- Silhouette complète en squelette (angles en degres depuis "vers le bas", + = vers l'avant) ---
// P = { lean, tilt, mood, armF:[a1,a2], armB:[a1,a2], legF:[a1,a2], legB:[a1,a2], flap }
function hdHuman(c, ox, oy, S, P) {
  c.save();
  c.translate(ox, oy);
  const lean = (P.lean * Math.PI) / 180;
  const up = [Math.sin(lean), -Math.cos(lean)];
  const nrm = [Math.cos(lean), Math.sin(lean)];
  const sh = [up[0] * 128, up[1] * 128];
  const limb = (st, a1, a2, l1, l2) => {
    const m = hdSeg(st[0], st[1], a1, l1);
    return [st, m, hdSeg(m[0], m[1], a2, l2)];
  };
  const aB = limb(sh, P.armB[0], P.armB[1], 92, 86);
  const aF = limb(sh, P.armF[0], P.armF[1], 92, 86);
  const lB = limb([0, 0], P.legB[0], P.legB[1], 118, 116);
  const lF = limb([0, 0], P.legF[0], P.legF[1], 118, 116);

  const hand = (p) => hdEllipse(c, p[0], p[1], 18, 17, S.hand || S.skin, 5);
  const shoe = (l, a2) => {
    const e = l[2];
    const r = (a2 * Math.PI) / 180;
    const f = [Math.cos(r), -Math.sin(r)];
    const sx = e[0] + f[0] * 16 - Math.sin(r) * 2;
    const sy = e[1] + f[1] * 16 - Math.cos(r) * 2;
    hdEllipse(c, sx, sy, 34, 15, S.shoe, 5, Math.atan2(f[1], f[0]));
  };
  const arm = (a, dark) => {
    const sl = dark ? S.backArm || S.jacketDk : S.sleeve;
    if (S.foreSleeve === null) {
      hdStroke(c, [a[1], a[2]], 28, dark ? S.backArm || S.skin : S.skin);
      hdStroke(c, [a[0], a[1]], 34, sl);
    } else hdStroke(c, a, 32, sl);
    hand(a[2]);
  };
  const leg = (l, a2, dark) => {
    if (S.thigh === S.shin) hdStroke(c, l, 44, dark ? S.jacketDk : S.thigh);
    else {
      hdStroke(c, [l[1], l[2]], 36, S.shin);
      hdStroke(c, [l[0], l[1]], 50, S.thigh);
    }
    shoe(l, a2);
  };

  arm(aB, true);
  leg(lB, P.legB[1], true);
  // torse
  hdStroke(c, [[0, 0], sh], 84, S.jacket);
  // détails veste / chemise / cravate
  const pt = (k, n) => [sh[0] - up[0] * k + nrm[0] * n, sh[1] - up[1] * k + nrm[1] * n];
  if (S.shirt) {
    hdPoly(c, [pt(-16, 10), pt(-16, 30), pt(70, 22)], S.shirt, 5);
    hdPoly(c, [pt(-16, 10), pt(30, 12), pt(-16, 34)], S.shirt, 0);
    // revers
    hdPoly(c, [pt(-18, 36), pt(80, 24), pt(40, 40)], S.jacketLt, 5);
  } else if (!S.noStripe) {
    // maillot : bande + manche
    hdPoly(c, [pt(-10, -34), pt(-10, 36), pt(130, 36), pt(130, -34)], null, 0);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 10;
    c.beginPath();
    c.moveTo(pt(30, 40)[0], pt(30, 40)[1]);
    c.lineTo(pt(100, 40)[0], pt(100, 40)[1]);
    c.stroke();
  }
  c.strokeStyle = INK;
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(pt(80, 40)[0], pt(80, 40)[1]);
  c.lineTo(pt(80, 44)[0] - 2, pt(80, 44)[1] + 2);
  c.stroke();
  if (S.tie) {
    const t0 = pt(-4, 24), t1 = pt(80, 30);
    const fl = P.flap || 0;
    hdPoly(c, [t0, [t0[0] - 8, t0[1] + 6], [t1[0] - fl - 8, t1[1] + 6], [t1[0] - fl + 8, t1[1] - 6]], S.tie, 4);
  }
  if (S.skirt) {
    // robe (ASTRA)
    hdPoly(c, [[-46, -6], [54, -6], [74, 150], [-68, 158]], S.jacket, 6);
    c.strokeStyle = S.hem || '#ffd166';
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(-66, 150);
    c.lineTo(72, 144);
    c.stroke();
  }
  leg(lF, P.legF[1], false);
  if (S.pauldron) hdEllipse(c, sh[0] + 4, sh[1] + 10, 40, 30, S.pauldron, 6);
  // cou + tête
  const hc = [sh[0] + up[0] * 56 + nrm[0] * 6, sh[1] + up[1] * 56 + nrm[1] * 6];
  hdStroke(c, [sh, hc], 36, S.skin2);
  c.save();
  c.translate(hc[0], hc[1]);
  c.rotate(lean * 0.6 + ((P.tilt || 0) * Math.PI) / 180);
  hdHeadSide(c, S, P.mood);
  c.restore();
  arm(aF, false);
  c.restore();
  return { hip: [ox, oy], hand: [ox + aF[2][0], oy + aF[2][1]], foot: [ox + lF[2][0], oy + lF[2][1]], head: hc };
}

// --- Poses ------------------------------------------------------------------
const HD_POSES = {
  run0: { lean: 20, mood: 'yell', armF: [62, 118], armB: [-50, -15], legF: [42, 14], legB: [-40, -98], flap: 50, tilt: -4 },
  run1: { lean: 20, mood: 'yell', armF: [-46, -12], armB: [66, 122], legF: [-34, -92], legB: [46, 18], flap: 56, tilt: -4 },
  kick: { lean: -12, mood: 'yell', armF: [-62, -34], armB: [58, 84], legF: [88, 84], legB: [-4, 8], flap: 40, tilt: 4 },
  push: { lean: 30, mood: 'yell', armF: [92, 92], armB: [76, 84], legF: [62, 10], legB: [-42, -50], flap: 0, tilt: 6 },
  guard: { lean: 2, mood: 'none', armF: [58, 128], armB: [42, 118], legF: [16, 6], legB: [-18, -12], flap: 0, tilt: 0 },
  hurt: { lean: -30, mood: 'yell', armF: [-104, -150], armB: [-76, -126], legF: [34, 46], legB: [-26, -58], flap: 0, tilt: -10 },
  punch: { lean: 26, mood: 'yell', armF: [94, 94], armB: [-44, -18], legF: [60, 8], legB: [-46, -52], flap: 0, tilt: 4 },
  cast: { lean: 8, mood: 'yell', armF: [92, 94], armB: [104, 102], legF: [22, 6], legB: [-22, -12], flap: 0, tilt: 2 },
  grab: { lean: 22, mood: 'yell', armF: [100, 98], armB: [112, 102], legF: [44, 10], legB: [-38, -24], flap: 0, tilt: 4 },
};

function drawHumanTex(c, S, poseName, w, h, hipX, hipY) {
  c.clearRect(0, 0, w, h);
  return hdHuman(c, hipX, hipY, S, HD_POSES[poseName]);
}

// --- Visage de face (gros plan) ------------------------------------------------
function drawLuluFace(c, W, H) {
  const S = HD_LULU;
  c.clearRect(0, 0, W, H);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  // veste
  hdPoly(c, [[0, H], [20, 640], [120, 560], [230, 520], [410, 520], [520, 560], [620, 640], [640, H]], S.jacket, 8);
  hdPoly(c, [[250, 520], [390, 520], [320, 700]], S.shirt, 6);
  // revers
  hdPoly(c, [[230, 520], [262, 520], [320, 700], [196, 640]], S.jacketLt, 6);
  hdPoly(c, [[410, 520], [378, 520], [320, 700], [444, 640]], S.jacketDk, 6);
  // cravate
  hdPoly(c, [[300, 560], [340, 560], [356, 740], [320, 760], [284, 740]], S.tie, 6);
  hdPoly(c, [[294, 540], [346, 540], [338, 572], [302, 572]], '#3a4d86', 6);
  // cou
  hdPoly(c, [[266, 410], [374, 410], [380, 540], [320, 580], [260, 540]], S.skin2, 6);
  // oreilles
  hdEllipse(c, 170, 322, 24, 44, S.skin2, 6);
  hdEllipse(c, 470, 322, 24, 44, S.skin2, 6);
  // visage
  hdEllipse(c, 320, 300, 150, 176, S.skin, 8);
  // ombre côté gauche
  c.save();
  c.beginPath();
  c.ellipse(320, 300, 146, 172, 0, 0, Math.PI * 2);
  c.clip();
  c.fillStyle = 'rgba(160,100,70,0.35)';
  c.beginPath();
  c.moveTo(170, 150);
  c.quadraticCurveTo(230, 300, 210, 470);
  c.lineTo(150, 480);
  c.lineTo(150, 150);
  c.fill();
  c.restore();
  // cheveux : masse ébouriffée
  c.beginPath();
  c.moveTo(166, 270);
  c.quadraticCurveTo(120, 120, 214, 70);
  c.lineTo(190, 20);
  c.lineTo(250, 56);
  c.lineTo(268, -2);
  c.lineTo(318, 50);
  c.lineTo(364, -6);
  c.lineTo(386, 56);
  c.lineTo(450, 22);
  c.lineTo(428, 80);
  c.quadraticCurveTo(520, 120, 474, 270);
  c.lineTo(452, 230);
  c.quadraticCurveTo(440, 170, 400, 158);
  c.lineTo(360, 196);
  c.lineTo(318, 150);
  c.lineTo(274, 200);
  c.lineTo(236, 164);
  c.quadraticCurveTo(190, 190, 186, 250);
  c.closePath();
  c.fillStyle = S.hair;
  c.fill();
  c.strokeStyle = INK;
  c.lineWidth = 8;
  c.stroke();
  c.strokeStyle = S.hairHl;
  c.lineWidth = 7;
  [[[230, 110], [300, 70]], [[340, 70], [410, 100]], [[250, 150], [300, 118]]].forEach(([a, b]) => {
    c.beginPath();
    c.moveTo(a[0], a[1]);
    c.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 24, b[0], b[1]);
    c.stroke();
  });
  // sourcils (fâchés)
  c.strokeStyle = S.hair;
  c.lineWidth = 20;
  c.beginPath();
  c.moveTo(216, 254);
  c.lineTo(298, 286);
  c.moveTo(424, 254);
  c.lineTo(342, 286);
  c.stroke();
  // yeux
  [[262, 318], [378, 318]].forEach(([x, y], i) => {
    hdEllipse(c, x, y, 38, 23, '#ffffff', 6);
    hdEllipse(c, x + (i ? -3 : 3), y + 1, 18, 19, '#4a2c16', 0);
    hdEllipse(c, x + (i ? -3 : 3), y + 1, 9, 10, INK, 0);
    hdEllipse(c, x + (i ? -9 : -3), y - 7, 6, 6, '#ffffff', 0);
    c.strokeStyle = INK;
    c.lineWidth = 10;
    c.beginPath();
    c.moveTo(x - 40, y - 4);
    c.quadraticCurveTo(x, y - 34, x + 40, y - 4);
    c.stroke();
  });
  // nez
  c.strokeStyle = S.skin2;
  c.lineWidth = 9;
  c.beginPath();
  c.moveTo(322, 330);
  c.quadraticCurveTo(310, 372, 296, 384);
  c.quadraticCurveTo(320, 394, 346, 384);
  c.stroke();
  // moustache fine
  c.strokeStyle = S.hair;
  c.lineWidth = 12;
  c.beginPath();
  c.moveTo(262, 412);
  c.quadraticCurveTo(300, 392, 320, 400);
  c.quadraticCurveTo(340, 392, 378, 412);
  c.stroke();
  // bouche serrée avec dents
  hdEllipse(c, 320, 440, 46, 18, '#ffffff', 6);
  c.strokeStyle = INK;
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(274, 440);
  c.lineTo(366, 440);
  c.moveTo(300, 424);
  c.lineTo(300, 456);
  c.moveTo(320, 422);
  c.lineTo(320, 458);
  c.moveTo(340, 424);
  c.lineTo(340, 456);
  c.stroke();
}

// --- Ballon ------------------------------------------------------------------
function drawBall(c, n) {
  c.clearRect(0, 0, n, n);
  const r = n / 2 - 5;
  const cx = n / 2, cy = n / 2;
  c.save();
  c.beginPath();
  c.arc(cx, cy, r, 0, Math.PI * 2);
  c.fillStyle = '#ffffff';
  c.fill();
  c.clip();
  const pent = (x, y, R, rot) => {
    c.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = rot + (i * 2 * Math.PI) / 5;
      c.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R);
    }
    c.closePath();
    c.fillStyle = '#1b1822';
    c.fill();
  };
  pent(cx, cy, r * 0.34, -Math.PI / 2);
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5 + Math.PI / 5;
    pent(cx + Math.cos(a) * r * 0.95, cy + Math.sin(a) * r * 0.95, r * 0.3, a + Math.PI);
    c.strokeStyle = '#1b1822';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(cx + Math.cos(a - Math.PI / 5) * r * 0.31, cy + Math.sin(a - Math.PI / 5) * r * 0.31);
    c.lineTo(cx + Math.cos(a - Math.PI / 5) * r * 0.66, cy + Math.sin(a - Math.PI / 5) * r * 0.66);
    c.stroke();
  }
  // ombrage
  const g = c.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(60,60,110,0.38)');
  c.fillStyle = g;
  c.fillRect(0, 0, n, n);
  c.restore();
  c.beginPath();
  c.arc(cx, cy, r, 0, Math.PI * 2);
  c.strokeStyle = INK;
  c.lineWidth = 7;
  c.stroke();
}

// --- Vague d'énergie (poussée) ----------------------------------------------------
function drawWave(c, W, H) {
  c.clearRect(0, 0, W, H);
  const cy = H / 2;
  const layers = [
    [1.0, 'rgba(30,170,255,0.45)'],
    [0.76, 'rgba(110,225,255,0.8)'],
    [0.48, '#e2fcff'],
    [0.22, '#ffffff'],
  ];
  layers.forEach(([k, col]) => {
    c.beginPath();
    for (let x = 0; x <= W; x += 6) {
      const taper = Math.min(1, x / 90);
      const hh = (H / 2) * k * taper * (0.78 + 0.22 * Math.sin(x / 31 + k * 4));
      if (x === 0) c.moveTo(x, cy - hh);
      else c.lineTo(x, cy - hh);
    }
    for (let x = W; x >= 0; x -= 6) {
      const taper = Math.min(1, x / 90);
      const hh = (H / 2) * k * taper * (0.78 + 0.22 * Math.sin(x / 27 + k * 3));
      c.lineTo(x, cy + hh);
    }
    c.closePath();
    c.fillStyle = col;
    c.fill();
  });
  // arcs d'énergie
  c.strokeStyle = 'rgba(255,255,255,0.85)';
  c.lineWidth = 4;
  for (let i = 0; i < 9; i++) {
    const x = 90 + i * 90;
    c.beginPath();
    c.ellipse(x, cy, 22, (H / 2) * 0.8, 0, -1.2, 1.2);
    c.stroke();
  }
}

// --- Code pénal (livre) -------------------------------------------------------------
function drawBook(c, W, H) {
  c.clearRect(0, 0, W, H);
  // tranche des pages
  hdPoly(c, [[14, H - 14], [W - 10, H - 14], [W - 10, H - 34], [14, H - 34]], '#f6efdc', 5);
  c.strokeStyle = '#c9bb96';
  c.lineWidth = 2;
  for (let i = 1; i < 4; i++) {
    c.beginPath();
    c.moveTo(18, H - 14 - i * 5);
    c.lineTo(W - 14, H - 14 - i * 5);
    c.stroke();
  }
  // couverture
  hdPoly(c, [[8, 10], [W - 16, 10], [W - 16, H - 34], [8, H - 34]], '#7a1f2b', 6);
  // dos
  hdPoly(c, [[8, 10], [30, 10], [30, H - 34], [8, H - 34]], '#541520', 6);
  // cadre doré
  c.strokeStyle = '#f2c14e';
  c.lineWidth = 3;
  c.strokeRect(42, 20, W - 70, H - 64);
  // titre
  c.fillStyle = '#f2c14e';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = 'bold 26px Georgia, "Times New Roman", serif';
  c.fillText('CODE', 42 + (W - 70) / 2, 42);
  c.fillText('PÉNAL', 42 + (W - 70) / 2, 74);
  // balance de la justice (simple)
  c.strokeStyle = '#f2c14e';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(W / 2 + 6, 88);
  c.lineTo(W / 2 + 6, 98);
  c.moveTo(W / 2 - 16, 92);
  c.lineTo(W / 2 + 28, 92);
  c.stroke();
}

// --- Fonds ------------------------------------------------------------------------
function drawGradBg(c, W, H, stops) {
  const g = c.createLinearGradient(0, 0, 0, H);
  stops.forEach(([p, col]) => g.addColorStop(p, col));
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
}

function drawHalftone(c, n) {
  c.clearRect(0, 0, n, n);
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.arc(n / 2, n / 2, n * 0.26, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(0, 0, n * 0.26, 0, Math.PI * 2);
  c.arc(n, 0, n * 0.26, 0, Math.PI * 2);
  c.arc(0, n, n * 0.26, 0, Math.PI * 2);
  c.arc(n, n, n * 0.26, 0, Math.PI * 2);
  c.fill();
}
