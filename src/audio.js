// ===========================================================================
// MUSIQUE ET BRUITAGES (tout est synthétisé dans le navigateur : aucun fichier à télécharger)
//  - MUSIC : petit séquenceur (4 voix + batterie) qui joue des morceaux originaux écrits note par note
//  - SFX.play : bruitages en couches (impact, craquement, souffle, réverbération)
// Le son ne touche jamais la simulation : rien ici n'influence le combat.
// ===========================================================================
const AUDIO = {
  ready: false,
  setup(ctx) {
    if (this.ready || !ctx) return;
    this.ready = true;
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.2;
    comp.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(comp);
    this.sfx = ctx.createGain();
    this.sfx.gain.value = 1;
    this.sfx.connect(this.master);
    this.mus = ctx.createGain();
    this.mus.gain.value = SETTINGS.music === false ? 0 : 0.42;
    this.mus.connect(this.master);
    // petite réverbération (salle) : bruit qui s'éteint
    const len = Math.floor(ctx.sampleRate * 1.4);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      let seed = 777 + ch * 31;
      for (let i = 0; i < len; i++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        d[i] = (seed / 0x3fffffff - 1) * Math.pow(1 - i / len, 3.2);
      }
    }
    this.rev = ctx.createConvolver();
    this.rev.buffer = ir;
    this.revIn = ctx.createGain();
    this.revIn.gain.value = 0.32;
    this.revIn.connect(this.rev).connect(this.master);
  },
};

// ---------------------------------------------------------------------------
// Bruitages
// ---------------------------------------------------------------------------
Object.assign(SFX, {
  out(rev) {
    AUDIO.setup(this.ctx);
    if (!rev) return AUDIO.sfx;
    const g = this.ctx.createGain();
    g.connect(AUDIO.sfx);
    g.connect(AUDIO.revIn);
    return g;
  },
  // oscillateur avec chute de hauteur et enveloppe percussive
  tone(type, f0, f1, dur, vol, t0, rev) {
    const c = this.ctx, t = c.currentTime + (t0 || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.out(rev));
    o.start(t);
    o.stop(t + dur + 0.03);
  },
  hiss(filter, freq, dur, vol, sweep, t0, rev, q) {
    const c = this.ctx, t = c.currentTime + (t0 || 0);
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.noise;
    src.loop = true;
    f.type = filter;
    if (q) f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.out(rev));
    src.start(t, Math.random() * 0.3);
    src.stop(t + dur + 0.03);
  },
  // nappe qui monte puis redescend (foule, grondement)
  swell(filter, freq, dur, vol, t0, rev, q) {
    const c = this.ctx, t = c.currentTime + (t0 || 0);
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.noise;
    src.loop = true;
    f.type = filter;
    f.frequency.value = freq;
    if (q) f.Q.value = q;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.out(rev));
    src.start(t, Math.random() * 0.3);
    src.stop(t + dur + 0.05);
  },
  play(name, k) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = performance.now();
    if (now - (this.last[name] || 0) < 40) return;
    this.last[name] = now;
    k = k === undefined ? 0.5 : Math.max(0, Math.min(1, k));
    try {
      switch (name) {
        case 'hit': {
          // coup reçu : claque (bruit filtré) + corps (sinus qui tombe) + petit clic
          this.hiss('bandpass', 1300 + k * 1200, 0.07 + k * 0.05, 0.35 + k * 0.25, 500, 0, false, 1.4);
          this.tone('sine', 190 + k * 60, 45, 0.16 + k * 0.12, 0.55 + k * 0.3, 0, k > 0.5);
          this.tone('square', 1800, 600, 0.03, 0.06);
          if (k > 0.6) this.hiss('lowpass', 900, 0.4, 0.25 * k, 120, 0.01, true);
          break;
        }
        case 'ko':
          // éjection : gros boum + souffle + clameur de la foule
          this.tone('sine', 120, 28, 0.9, 0.8, 0, true);
          this.hiss('lowpass', 2400, 0.7, 0.45, 80, 0, true);
          this.tone('sawtooth', 300, 60, 0.35, 0.12, 0.02, true);
          this.swell('bandpass', 900, 1.8, 0.16, 0.12, true, 0.8);
          this.swell('bandpass', 1500, 1.5, 0.08, 0.2, true, 1.2);
          break;
        case 'jump':
          this.hiss('bandpass', 700, 0.12, 0.08, 2600, 0, false, 1.2);
          this.tone('triangle', 260, 520, 0.08, 0.05);
          break;
        case 'land':
          this.tone('sine', 110, 50, 0.1, 0.18 + k * 0.2);
          this.hiss('lowpass', 900, 0.08, 0.1 + k * 0.1, 200);
          break;
        case 'dodge':
          this.hiss('bandpass', 1400, 0.16, 0.14, 5200, 0, false, 2);
          break;
        case 'swing':
          // fouetté : souffle qui balaie, plus grave et plus long pour un gros coup
          this.hiss('bandpass', 900 + (1 - k) * 900, 0.08 + k * 0.1, 0.07 + k * 0.08, 3200 - k * 1400, 0, false, 1.6);
          break;
        case 'parry':
          this.tone('triangle', 1200, 1900, 0.09, 0.14, 0, true);
          this.tone('sine', 2400, 2300, 0.18, 0.06, 0.03, true);
          break;
        case 'armor':
          this.tone('square', 220, 150, 0.1, 0.1);
          this.tone('triangle', 660, 640, 0.18, 0.08, 0, true);
          break;
        case 'charm':
          [880, 1109, 1319].forEach((f, i) => this.tone('sine', f, f * 1.01, 0.22, 0.08, i * 0.05, true));
          break;
        case 'count':
          this.tone('square', 660, 660, 0.12, 0.09, 0, true);
          break;
        case 'go':
          this.tone('square', 990, 990, 0.3, 0.1, 0, true);
          this.tone('square', 1320, 1320, 0.3, 0.06, 0.03, true);
          this.swell('bandpass', 1100, 1.2, 0.1, 0.05, true, 0.8);
          break;
        case 'ui':
          this.tone('triangle', 620, 760, 0.05, 0.08);
          break;
        case 'ledge':
          this.tone('square', 520, 380, 0.04, 0.06);
          this.hiss('highpass', 3000, 0.04, 0.05);
          break;
        case 'shoot':
          this.hiss('highpass', 2000, 0.07, 0.28, 900);
          this.tone('square', 900, 120, 0.06, 0.1);
          break;
        case 'magic':
          this.tone('sine', 500 + k * 400, 1400 + k * 600, 0.18, 0.1, 0, true);
          this.tone('triangle', 1000, 1600, 0.12, 0.05, 0.04, true);
          break;
        case 'throw':
          this.hiss('bandpass', 800, 0.14, 0.12, 2400, 0, false, 1.5);
          break;
        case 'glass':
          // bouteille qui éclate
          [2900, 3600, 4400, 5200].forEach((f, i) => this.tone('sine', f, f * 0.97, 0.12 + i * 0.03, 0.05, i * 0.012, true));
          this.hiss('highpass', 5000, 0.12, 0.2);
          break;
        case 'splat':
          this.hiss('lowpass', 700, 0.16, 0.3, 160);
          this.tone('sine', 160, 70, 0.1, 0.2);
          break;
        case 'boom':
          this.tone('sine', 90, 30, 0.6, 0.7, 0, true);
          this.hiss('lowpass', 1500, 0.5, 0.4, 90, 0, true);
          break;
        case 'grab':
          this.tone('sine', 180, 90, 0.12, 0.3);
          this.hiss('bandpass', 600, 0.1, 0.15, 300);
          break;
        case 'rewind':
          // CTRL+Z : bande qu'on rembobine (montée rapide puis « clic »)
          this.tone('sawtooth', 200, 1600, 0.28, 0.07, 0, true);
          this.tone('sine', 1600, 400, 0.18, 0.06, 0.28, true);
          this.tone('square', 1200, 1200, 0.03, 0.05, 0.46);
          break;
        case 'catch':
          this.tone('sine', 140, 70, 0.14, 0.35);
          this.tone('triangle', 880, 1320, 0.12, 0.08, 0.05, true);
          break;
        case 'bike':
          [0, 0.07, 0.14].forEach((t) => this.tone('square', 1800, 1700, 0.03, 0.04, t));
          this.hiss('bandpass', 500, 0.35, 0.12, 1400, 0, false, 1.2);
          break;
        case 'rooster':
          this.tone('square', 700, 1100, 0.1, 0.06, 0, true);
          this.tone('square', 1100, 1300, 0.25, 0.06, 0.1, true);
          this.tone('square', 1300, 700, 0.18, 0.05, 0.35, true);
          break;
        case 'note':
          [659, 784, 988].forEach((f, i) => this.tone('triangle', f, f, 0.14, 0.06, i * 0.06, true));
          break;
        case 'rumble':
          this.tone('sine', 55, 38, 1.4, 0.3);
          this.hiss('lowpass', 260, 1.6, 0.22, 120);
          break;
        case 'crowd':
          this.swell('bandpass', 1000, 1.6, 0.12, 0, true, 0.7);
          break;
      }
    } catch (e) {}
  },
});

// ---------------------------------------------------------------------------
// Musique
// Morceaux : tempo, accords (un par mesure), basse/arpège en degrés de l'accord, mélodie écrite note par note,
// batterie en motifs de 16 pas. Notation : « A4 » = note, « - » = tenue, « . » = silence.
// ---------------------------------------------------------------------------
const NOTE_I = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const midiOf = (n) => {
  const m = /^([A-G][#b]?)(-?\d)$/.exec(n);
  return m ? 12 * (+m[2] + 1) + NOTE_I[m[1]] : null;
};
const hzOf = (m) => 440 * Math.pow(2, (m - 69) / 12);
function chordOf(name) {
  const m = /^([A-G][#b]?)(m?)(7?)$/.exec(name);
  const root = NOTE_I[m[1]];
  return { root, third: m[2] ? 3 : 4, seventh: m[3] ? 10 : null };
}
const DEG = (ch, d) => (d === '1' ? 0 : d === '3' ? ch.third : d === '5' ? 7 : d === '8' ? 12 : d === '7' ? 10 : d === '2' ? 2 : d === '4' ? 5 : d === '6' ? 9 : d === 'b2' ? 1 : d === 'b6' ? 8 : 0);
const toks = (s) => s.trim().split(/\s+/);

const SONGS = {
  // MENU : thème héroïque, do majeur
  menu: {
    bpm: 128, bassOct: 2, arpOct: 4, padOct: 3, lead: 'square', leadVol: 0.11,
    chords: ['C', 'G', 'Am', 'F', 'C', 'G', 'Am', 'G'],
    bass: '1 . 1 . 8 . 1 . 1 . 1 . 8 . 5 .',
    arp: '1 3 5 8 5 3 1 3 5 8 5 3 1 3 5 3',
    melody: [
      'C5 - E5 - G5 - - . A5 - G5 - E5 - - .',
      'D5 - - . G5 - - . B5 - A5 - G5 - - .',
      'A5 - - . G5 . E5 . C5 - - . E5 . A5 .',
      'G5 - - - F5 - E5 - D5 - - - - - . .',
      'C5 - E5 - G5 - - . C6 - B5 - G5 - - .',
      'D5 - - . G5 - B5 . D6 - C6 - B5 - - .',
      'C6 - - . B5 . A5 . E5 - - . A5 . C6 .',
      'B5 - - - - - - - G5 . A5 . B5 . D6 .',
    ],
    drums: { k: 'x.......x.x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
    form: [{ bars: 8, lead: false, drums: 'half' }, { bars: 8 }, { bars: 8 }],
  },
  // NUIT : synthwave en la mineur
  night: {
    bpm: 132, bassOct: 2, arpOct: 4, padOct: 3, lead: 'square', leadVol: 0.1,
    chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G'],
    bass: '1 . 1 8 1 . 1 8 1 . 1 8 1 . 5 8',
    arp: '1 5 8 5 3 5 8 5 1 5 8 5 3 5 8 5',
    melody: [
      'E5 - - . E5 . D5 . C5 - - . B4 . C5 .',
      'A4 - - - - - . . C5 . A4 . G4 . F4 .',
      'G4 - - . E5 - - . D5 . C5 . D5 . E5 .',
      'D5 - - - - - . . B4 - - - G4 - - -',
      'A5 - - . G5 . E5 . G5 - - . A5 . B5 .',
      'C6 - - - A5 - - . F5 . G5 . A5 . C6 .',
      'G5 - - . E5 . C5 . E5 . G5 . C6 . B5 .',
      'B5 - - - - - - - D5 . G5 . B5 . D6 .',
    ],
    drums: { k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...x.' },
    form: [{ bars: 4, lead: false, drums: 'half' }, { bars: 8 }, { bars: 4, lead: false, drums: 'none' }, { bars: 8 }],
  },
  // CÉRÉMONIE : marche de gala en fa majeur (cuivres carrés, caisse claire de défilé)
  gala: {
    bpm: 112, bassOct: 2, arpOct: 4, padOct: 3, lead: 'square', leadVol: 0.1,
    chords: ['F', 'Dm', 'Bb', 'C', 'F', 'Am', 'Bb', 'C'],
    bass: '1 . . . 5 . . . 1 . 5 . 8 . 5 .',
    arp: '1 3 5 3 8 5 3 5 1 3 5 3 8 5 3 5',
    melody: [
      'F5 - - . C5 . F5 . A5 - - - G5 . F5 .',
      'D5 - - - - - . . F5 . E5 . D5 . C5 .',
      'Bb4 - - . D5 . F5 . Bb5 - - - A5 . G5 .',
      'G5 - - - - - . . E5 . F5 . G5 . C6 .',
      'A5 - - . G5 . F5 . C6 - - - A5 . F5 .',
      'E5 - - . C5 . E5 . A5 - G5 - E5 - . .',
      'D5 - - . F5 . Bb5 . D6 - - - C6 . Bb5 .',
      'C6 - - - - - - - G5 . A5 . Bb5 . C6 .',
    ],
    drums: { k: 'x.......x.......', s: '....x.......x.xx', h: 'x.x.x.x.x.x.x.x.' },
    form: [{ bars: 4, lead: false, drums: 'half' }, { bars: 8 }, { bars: 8 }],
  },
  // ancien morceau du désert (remplacé par le MIDI de Noah, gardé en secours)
  desertOld: {
    bpm: 108, bassOct: 2, arpOct: 4, padOct: 3, lead: 'triangle', leadVol: 0.2, drone: true,
    chords: ['D', 'D', 'Eb', 'D', 'Cm', 'Cm', 'Eb', 'D'],
    bass: '1 . . . 1 . 8 . 1 . . . 5 . 8 .',
    arp: '1 . b2 . 3 . 5 . b6 . 5 . 3 . b2 .',
    melody: [
      'A4 - - - Bb4 A4 G4 . F#4 - - - . . . .',
      'G4 . A4 . Bb4 - A4 . G4 . F#4 . Eb4 - D4 -',
      'Eb4 - - - G4 - Bb4 - A4 - G4 - F#4 - G4 -',
      'A4 - - - - - - - . . D5 . C5 . Bb4 .',
      'C5 - - . Bb4 . A4 . G4 - - . A4 . Bb4 .',
      'C5 . D5 . Eb5 - D5 . C5 . Bb4 . A4 - - .',
      'Bb4 - - . A4 . G4 . A4 . Bb4 . C5 . D5 .',
      'D5 - - - - - - - - - - - . . . .',
    ],
    drums: { d: 'x..x..x...x..x..', t: '...x...x.x...x.x', h: 'x.x.x.x.x.x.x.x.' },
    form: [{ bars: 4, lead: false, drums: 'half' }, { bars: 8 }, { bars: 4, lead: false }, { bars: 8 }],
  },
};
if (typeof DUNE_MIDI !== 'undefined') SONGS.desert = { midi: DUNE_MIDI };
else SONGS.desert = SONGS.desertOld;
const JINGLES = {
  win: { bpm: 150, notes: 'C5 E5 G5 C6 - - E6 - - - - - - - - -', chord: [60, 64, 67, 72] },
  lose: { bpm: 90, notes: 'G4 - F4 - D4 - - - C4 - - - - - - -', chord: [48, 55, 58] },
};

const MUSIC = {
  cur: null, want: null, tempoMul: 1,
  play(id) {
    this.want = id;
    if (this.cur && this.cur.id === id) return;
    this.start();
  },
  stop() {
    this.want = null;
    this.fadeOut();
  },
  setTempo(m) {
    this.tempoMul = m;
  },
  fadeOut() {
    const c = this.cur;
    this.cur = null;
    if (!c) return;
    const ctx = SFX.ctx;
    if (ctx && c.bus) {
      c.bus.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
      setTimeout(() => c.bus.disconnect(), 1500);
    }
  },
  start() {
    const ctx = SFX.ctx;
    if (!ctx || ctx.state !== 'running' || !this.want) return;
    AUDIO.setup(ctx);
    this.fadeOut();
    const song = SONGS[this.want];
    if (!song) return;
    const bus = ctx.createGain();
    bus.gain.value = 0;
    bus.gain.setTargetAtTime(1, ctx.currentTime, 0.4);
    bus.connect(AUDIO.mus);
    const send = ctx.createGain();
    send.gain.value = 0.35;
    bus.connect(send).connect(AUDIO.revIn);
    if (song.midi) {
      const M = song.midi;
      this.cur = { id: this.want, song, bus, midi: M, t0: ctx.currentTime + 0.1, spt: 60 / M.bpm / M.tpb, ptr: M.tracks.map(() => 0) };
      this.tempoMul = 1;
      return;
    }
    // section, mesure dans la section, pas
    const plan = [];
    song.form.forEach((f) => { for (let i = 0; i < f.bars; i++) plan.push(f); });
    this.cur = { id: this.want, song, bus, plan, bar: 0, step: 0, t: ctx.currentTime + 0.1, melBar: 0 };
    this.tempoMul = 1;
  },
  // appelé souvent : programme les notes des 120 prochaines millisecondes
  tick() {
    const ctx = SFX.ctx;
    if (!ctx || ctx.state !== 'running') return;
    if (this.want && !this.cur) this.start();
    const c = this.cur;
    if (!c) return;
    if (c.midi) return this.tickMidi(c, ctx);
    const song = c.song;
    const stepDur = 60 / (song.bpm * this.tempoMul) / 4;
    if (c.t < ctx.currentTime - 0.3) c.t = ctx.currentTime + 0.05; // l'onglet était en pause
    while (c.t < ctx.currentTime + 0.12) {
      this.stepAt(c, c.t, stepDur);
      c.t += stepDur;
      c.step++;
      if (c.step >= 16) {
        c.step = 0;
        c.bar = (c.bar + 1) % c.plan.length;
      }
    }
  },
  // lecture d'un MIDI : on programme les notes qui commencent dans les 150 ms à venir, puis on reboucle
  tickMidi(c, ctx) {
    const M = c.midi;
    const spt = 60 / (M.bpm * this.tempoMul) / M.tpb;
    if (spt !== c.spt) {
      // changement de tempo (mort subite) : on garde la position actuelle dans le morceau
      const tick = (ctx.currentTime - c.t0) / c.spt;
      c.t0 = ctx.currentTime - tick * spt;
      c.spt = spt;
    }
    if (ctx.currentTime - c.t0 > M.loop * spt + 1) c.t0 = ctx.currentTime + 0.05; // l'onglet était en pause
    const horizon = ctx.currentTime + 0.15;
    const end = M.loopEnd || M.loop, start = M.loopStart || 0;
    for (;;) {
      let any = false;
      M.tracks.forEach((tr, ti) => {
        while (c.ptr[ti] < tr.length && tr[c.ptr[ti]] < end) {
          const i = c.ptr[ti];
          const t = c.t0 + tr[i] * spt;
          if (t > horizon) break;
          if (t >= ctx.currentTime - 0.05) this.midiNote(M.names[ti], tr[i + 2], t, Math.min(tr[i + 1], end - tr[i]) * spt, tr[i + 3] / 127, c.bus);
          c.ptr[ti] += 4;
          any = true;
        }
      });
      // fin de la boucle : on repart au début du thème (l'intro ne se joue qu'une fois)
      if (c.t0 + end * spt <= horizon) {
        c.t0 += (end - start) * spt;
        c.ptr = M.tracks.map((tr) => {
          let i = 0;
          while (i < tr.length && tr[i] < start) i += 4;
          return i;
        });
        continue;
      }
      if (!any) break;
    }
  },
  midiNote(kind, note, t, dur, v, bus) {
    if (kind === 'drums') {
      if (note === 36) this.drum('kick', t, bus);
      else if (note === 38 || note === 40) this.drum('snare', t, bus);
      else if (note === 42 || note === 44) this.drum('hat', t, bus, 0.5 + v);
      else if (note === 46) this.drum('ohat', t, bus);
      else if (note === 49 || note === 57) this.drum('crash', t, bus);
      else this.drum('tek', t, bus);
      return;
    }
    const hz = hzOf(note);
    if (kind === 'lead') this.voice('lead', hz, t, Math.max(dur, 0.05), bus, 1, { lead: 'square', leadVol: 0.05 + 0.07 * v });
    else if (kind === 'arp') this.voice('arp', hz, t, Math.max(dur, 0.04), bus, 0.6 + 1.6 * v);
    else this.voice('bass', hz, t, Math.max(dur, 0.06), bus);
  },
  stepAt(c, t, sd) {
    const song = c.song, sec = c.plan[c.bar], s = c.step;
    const ch = chordOf(song.chords[c.bar % song.chords.length]);
    const root = 12 * (song.bassOct + 1) + ch.root;
    const drums = sec.drums || 'full';
    // basse
    const bt = toks(song.bass)[s];
    if (bt && bt !== '.' && bt !== '-') this.voice('bass', hzOf(root + DEG(ch, bt)), t, sd * 1.7, c.bus);
    // arpège (léger, sauf en coupure de batterie où il passe devant)
    const at = toks(song.arp)[s];
    if (at && at !== '.' && at !== '-') this.voice('arp', hzOf(root + 24 + DEG(ch, at)), t, sd * 0.9, c.bus, drums === 'none' ? 1.6 : 1);
    // nappe : l'accord tenu toute la mesure
    if (s === 0) [0, ch.third, 7].forEach((iv) => this.voice('pad', hzOf(root + 12 + iv), t, sd * 16, c.bus));
    if (song.drone && s === 0) this.voice('drone', hzOf(12 * (song.bassOct + 1) + 2), t, sd * 16, c.bus);
    // mélodie
    if (sec.lead !== false) {
      const mel = toks(song.melody[c.bar % song.melody.length]);
      const n = mel[s];
      if (n && n !== '.' && n !== '-') {
        let len = 1;
        while (s + len < 16 && mel[s + len] === '-') len++;
        this.voice('lead', hzOf(midiOf(n)), t, sd * len, c.bus, 1, song);
      }
    }
    // batterie
    if (drums !== 'none') {
      const D = song.drums;
      const on = (p) => p && p[s] === 'x';
      if (on(D.k) && (drums === 'full' || s % 8 === 0)) this.drum('kick', t, c.bus);
      if (on(D.s) && drums === 'full') this.drum('snare', t, c.bus);
      if (on(D.h)) this.drum('hat', t, c.bus, s % 4 === 2 ? 1 : 0.6);
      if (on(D.d)) this.drum('dum', t, c.bus);
      if (on(D.t) && drums === 'full') this.drum('tek', t, c.bus);
    }
  },
  voice(kind, hz, t, dur, bus, k, song) {
    const ctx = SFX.ctx;
    const o = ctx.createOscillator(), g = ctx.createGain();
    let node = o, vol = 0.1, a = 0.005, rel = 0.06;
    if (kind === 'bass') { o.type = 'triangle'; vol = 0.32; rel = 0.05; }
    else if (kind === 'arp') { o.type = 'square'; vol = 0.022 * (k || 1); }
    else if (kind === 'pad') {
      o.type = 'sawtooth'; vol = 0.018; a = 0.25; rel = 0.4;
      o.detune.value = (Math.random() - 0.5) * 14;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1100;
      o.connect(f); node = f;
    } else if (kind === 'drone') {
      o.type = 'sawtooth'; vol = 0.03; a = 0.6; rel = 0.6;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
      o.connect(f); node = f;
    } else if (kind === 'lead') {
      o.type = (song && song.lead) || 'square'; vol = (song && song.leadVol) || 0.1;
      // vibrato sur les notes longues
      if (dur > 0.3) {
        const l = ctx.createOscillator(), lg = ctx.createGain();
        l.frequency.value = 5.5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(hz * 0.012, t + 0.25);
        l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + dur + rel);
      }
    }
    o.frequency.setValueAtTime(hz, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.setValueAtTime(vol, t + Math.max(a, dur - rel));
    g.gain.linearRampToValueAtTime(0.0001, t + dur + rel);
    if (node === o) o.connect(g); else node.connect(g);
    g.connect(bus);
    o.start(t);
    o.stop(t + dur + rel + 0.02);
  },
  drum(kind, t, bus, k) {
    const ctx = SFX.ctx;
    const g = ctx.createGain();
    g.connect(bus);
    if (kind === 'kick' || kind === 'dum') {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(kind === 'kick' ? 150 : 210, t);
      o.frequency.exponentialRampToValueAtTime(kind === 'kick' ? 42 : 95, t + 0.16);
      g.gain.setValueAtTime(kind === 'kick' ? 0.55 : 0.4, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'kick' ? 0.28 : 0.22));
      o.connect(g); o.start(t); o.stop(t + 0.3);
      return;
    }
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter();
    src.buffer = SFX.noise;
    src.loop = true;
    let dur = 0.04, vol = 0.05;
    if (kind === 'snare') { f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.7; dur = 0.16; vol = 0.2; }
    else if (kind === 'hat') { f.type = 'highpass'; f.frequency.value = 7500; dur = 0.035; vol = 0.05 * (k || 1); }
    else if (kind === 'tek') { f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = 3; dur = 0.05; vol = 0.16; }
    else if (kind === 'ohat') { f.type = 'highpass'; f.frequency.value = 6500; dur = 0.22; vol = 0.06; }
    else if (kind === 'crash') { f.type = 'highpass'; f.frequency.value = 4000; dur = 1.1; vol = 0.09; }
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g);
    src.start(t, Math.random() * 0.3);
    src.stop(t + dur + 0.02);
  },
  jingle(id) {
    const ctx = SFX.ctx;
    this.stop();
    if (!ctx || ctx.state !== 'running' || SETTINGS.music === false) return;
    AUDIO.setup(ctx);
    const j = JINGLES[id];
    const sd = 60 / j.bpm / 4;
    const bus = ctx.createGain();
    bus.gain.value = 1;
    bus.connect(AUDIO.mus);
    bus.connect(AUDIO.revIn);
    const t0 = ctx.currentTime + 0.05;
    const nt = toks(j.notes);
    nt.forEach((n, i) => {
      if (n === '.' || n === '-') return;
      let len = 1;
      while (i + len < nt.length && nt[i + len] === '-') len++;
      this.voice('lead', hzOf(midiOf(n)), t0 + i * sd, sd * len, bus, 1, { lead: 'square', leadVol: 0.12 });
    });
    j.chord.forEach((m) => this.voice('pad', hzOf(m), t0 + 4 * sd, sd * 12, bus));
    this.drum(id === 'win' ? 'kick' : 'dum', t0 + 4 * sd, bus);
  },
  setVolume() {
    if (AUDIO.mus) AUDIO.mus.gain.setTargetAtTime(SETTINGS.music === false ? 0 : 0.42, SFX.ctx.currentTime, 0.1);
  },
};
setInterval(() => {
  try {
    MUSIC.tick();
  } catch (e) {}
}, 40);
// téléphone mis en veille / autre onglet : on coupe le son, on le relance au retour
document.addEventListener('visibilitychange', () => {
  const c = SFX.ctx;
  if (!c) return;
  if (document.hidden) c.suspend().catch(() => {});
  else c.resume().catch(() => {});
});
