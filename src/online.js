// ===========================================================================
// MODE EN LIGNE : compte (Supabase), classement, duel classé, salles privées
// Config attendue (config.js) : window.BRAWL_CONFIG = { SUPABASE_URL, SUPABASE_ANON_KEY, RELAY_URL }
// ===========================================================================
const CFG = window.BRAWL_CONFIG || {};
const ONLINE_OK = !!(CFG.RELAY_URL && (CFG.DEV || (CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase)));
let onlineStage = null; // null = hors ligne ; sinon 'menu' | 'lobby' | ...
let onlinePick = null;
let pendingRoom = null; // callback de choix de personnage
const Online = { conn: null, idx: 0, peers: [null, null, null, null], code: '', ranked: false, names: [], chars: [], rematchAsked: false, mode: 'ffa', tcols: [0, 1], host: 0, cap: 4 };
const MODE_NAMES = { ffa: 'CHACUN POUR SOI', team: 'PAR ÉQUIPES' };
// infos du salon envoyées par le serveur (joueurs, mode, couleurs des équipes, chef)
Online.roomInfo = (m) => {
  Online.peers = m.peers;
  if (m.mode) Online.mode = m.mode;
  if (m.tcols) Online.tcols = m.tcols;
  if (m.host !== undefined) Online.host = m.host;
  if (m.cap) Online.cap = m.cap;
};

// ---------------------------------------------------------------------------
// Fenêtres de saisie (HTML par-dessus le jeu : clavier natif sur téléphone)
// ---------------------------------------------------------------------------
function domModal(title, fields, buttons, note) {
  return new Promise((resolve) => {
    const old = document.getElementById('dm');
    if (old) old.remove();
    const el = document.createElement('div');
    el.id = 'dm';
    el.innerHTML =
      `<form><h2>${title}</h2>${note ? `<p class="n">${note}</p>` : ''}` +
      fields.map((f) => `<label>${f.label}<input name="${f.name}" type="${f.type || 'text'}" autocapitalize="none" autocorrect="off" spellcheck="false" autocomplete="${f.ac || 'off'}" ${f.max ? `maxlength="${f.max}"` : ''} ${f.upper ? 'style="text-transform:uppercase"' : ''}></label>`).join('') +
      `<p class="e" id="dme"></p><div class="b">${buttons.map((b, i) => `<button type="button" data-i="${i}" class="${b.primary ? 'p' : ''}">${b.label}</button>`).join('')}</div></form>`;
    document.body.appendChild(el);
    const form = el.querySelector('form');
    const close = (v) => {
      el.remove();
      resolve(v);
    };
    el.querySelectorAll('button').forEach((bt) =>
      bt.addEventListener('click', () => {
        const b = buttons[+bt.dataset.i];
        const values = {};
        fields.forEach((f) => (values[f.name] = form.elements[f.name].value.trim()));
        if (b.cancel) return close(null);
        const err = (m) => (document.getElementById('dme').textContent = m || '');
        if (b.run) {
          bt.disabled = true;
          Promise.resolve(b.run(values, err))
            .then((ok) => {
              bt.disabled = false;
              if (ok) close({ button: b.label, values });
            })
            .catch((e) => {
              bt.disabled = false;
              err(String((e && e.message) || e));
            });
        } else close({ button: b.label, values });
      })
    );
    form.addEventListener('submit', (e) => e.preventDefault());
    const first = form.elements[0];
    if (first) setTimeout(() => first.focus(), 50);
  });
}

// ---------------------------------------------------------------------------
// Compte
// ---------------------------------------------------------------------------
const Auth = {
  sb: null,
  session: null,
  profile: null,
  init() {
    if (CFG.DEV) {
      const qs = new URLSearchParams(location.search);
      const n = qs.get('dev') || localStorage.getItem('dev_name') || 'joueur' + Math.floor(Math.random() * 900 + 100);
      this.session = { access_token: 'dev:' + n, user: { id: n, is_anonymous: n.startsWith('guest') } };
      this.profile = { username: n, rating: 1000, wins: 0, losses: 0 };
      return Promise.resolve();
    }
    if (!window.supabase || !CFG.SUPABASE_URL) return Promise.resolve();
    this.sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
    return this.sb.auth.getSession().then(async ({ data }) => {
      this.session = data.session;
      if (this.session) await this.loadProfile();
    });
  },
  get anon() {
    return !!(this.session && this.session.user && this.session.user.is_anonymous);
  },
  async token() {
    if (CFG.DEV) return this.session.access_token;
    const { data } = await this.sb.auth.getSession();
    this.session = data.session;
    return data.session ? data.session.access_token : null;
  },
  async loadProfile() {
    if (CFG.DEV || !this.session) return (this.profile = null);
    const { data } = await this.sb.from('profiles').select('username,rating,wins,losses').eq('id', this.session.user.id).maybeSingle();
    this.profile = data;
    return data;
  },
  async signOut() {
    if (this.sb) await this.sb.auth.signOut();
    this.session = null;
    this.profile = null;
    this.setGuest('');
  },
  apiUrl(path) {
    return CFG.RELAY_URL.replace(/^ws/, 'http').replace(/\/$/, '') + path;
  },
  async call(path, body) {
    let r;
    try {
      r = await fetch(this.apiUrl(path), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    } catch (e) {
      throw new Error('Serveur injoignable');
    }
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.msg || 'Erreur ' + r.status);
    return d;
  },
  emailOf(pseudo) {
    return pseudo.toLowerCase() + '@brawl-players.app';
  },
  async setUsername(name) {
    if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) throw new Error('3 à 16 caractères : lettres, chiffres, _');
    await this.call('/api/rename', { token: await this.token(), pseudo: name });
    await this.loadProfile();
    if (!this.profile) this.profile = { username: name, rating: 1000, wins: 0, losses: 0 };
    else this.profile.username = name;
  },
  async login(pseudo, pw) {
    // le serveur retrouve le compte par son pseudo (même renommé, sans tenir compte des majuscules)
    let tok = null;
    try {
      tok = await this.call('/api/login', { pseudo, password: pw });
    } catch (e) {
      if (!/injoignable|Erreur 404/.test(e.message)) throw e;
    }
    if (tok && tok.access_token) {
      const { error } = await this.sb.auth.setSession({ access_token: tok.access_token, refresh_token: tok.refresh_token });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await this.sb.auth.signInWithPassword({ email: this.emailOf(pseudo), password: pw });
      if (error) throw new Error(/invalid|credentials/i.test(error.message) ? 'Pseudo ou mot de passe incorrect' : error.message);
    }
    const { data } = await this.sb.auth.getSession();
    this.session = data.session;
    await this.loadProfile();
    // profil absent (compte créé avant la base) : on le recrée avec le pseudo saisi
    if (!this.profile || !this.profile.username) await this.setUsername(pseudo);
  },
  // ----- invité (pseudo local, pas de compte) -----
  guestName: (() => {
    try {
      return localStorage.getItem('brawl_guest') || '';
    } catch (e) {
      return '';
    }
  })(),
  setGuest(n) {
    this.guestName = n;
    try {
      n ? localStorage.setItem('brawl_guest', n) : localStorage.removeItem('brawl_guest');
    } catch (e) {}
  },
  get isGuest() {
    return !this.session && !!this.guestName;
  },
  get name() {
    if (this.session) return (this.profile && this.profile.username) || 'JOUEUR';
    return this.guestName || '';
  },
  async loginModal(allowGuest, note) {
    const check = (v, err) => {
      if (!/^[A-Za-z0-9_]{3,16}$/.test(v.pseudo)) return err('Pseudo : 3 à 16 caractères (lettres, chiffres, _)'), false;
      if (v.pw.length < 6) return err('Mot de passe : 6 caractères minimum'), false;
      return true;
    };
    for (;;) {
      const r = await domModal(
        allowGuest ? 'BIENVENUE' : 'CONNEXION',
        [
          { name: 'pseudo', label: 'Pseudo', max: 16, ac: 'username' },
          { name: 'pw', label: 'Mot de passe (6 caractères min.)', type: 'password', ac: 'current-password' },
        ],
        [
          {
            label: 'Se connecter',
            primary: true,
            run: async (v, err) => {
              if (!check(v, err)) return false;
              await this.login(v.pseudo, v.pw);
              return true;
            },
          },
          {
            label: 'Créer mon compte',
            run: async (v, err) => {
              if (!check(v, err)) return false;
              await this.call('/api/signup', { pseudo: v.pseudo, password: v.pw });
              await this.login(v.pseudo, v.pw);
              return true;
            },
          },
          ...(allowGuest ? [{ label: 'Jouer en invité', guest: true, run: async () => true }] : [{ label: 'Annuler', cancel: true }]),
        ],
        note || "Pas besoin d'e-mail : choisis un pseudo et un mot de passe."
      );
      if (!r) return false;
      if (r.button === 'Jouer en invité') {
        const g = await domModal(
          'MODE INVITÉ',
          [{ name: 'pseudo', label: 'Ton pseudo (3 à 16 : lettres, chiffres, _)', max: 16 }],
          [
            {
              label: 'Jouer',
              primary: true,
              run: async (v, err) => (/^[A-Za-z0-9_]{3,16}$/.test(v.pseudo) ? (this.setGuest(v.pseudo), true) : (err('Pseudo : 3 à 16 caractères (lettres, chiffres, _)'), false)),
            },
            { label: 'Retour', cancel: true },
          ],
          "L'invité joue contre le bot. Pour jouer en ligne, il faut un compte."
        );
        if (!g) continue;
        return true;
      }
      if (this.session) {
        this.setGuest('');
        return true;
      }
    }
  },
  // à l'arrivée sur le jeu : session gardée, invité mémorisé, sinon on demande
  async gate() {
    if (CFG.DEV || this.session || this.guestName) return true;
    return this.loginModal(true);
  },
  // action en ligne : un vrai compte est nécessaire
  async ensure() {
    if (CFG.DEV || this.session) return true;
    return this.loginModal(false, this.guestName ? 'Il faut un compte pour jouer en ligne.' : '');
  },
  async leaderboard(n) {
    if (CFG.DEV) return [];
    const { data } = await this.sb.from('profiles').select('username,rating,wins,losses').not('username', 'is', null).order('rating', { ascending: false }).limit(n || 20);
    return data || [];
  },
};

// ---------------------------------------------------------------------------
// Connexion temps réel
// ---------------------------------------------------------------------------
function netOpen(path, onMsg, onClose) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(CFG.RELAY_URL.replace(/\/$/, '') + path);
    const c = { ws, rtt: 0, last: Date.now(), send: (o) => ws.readyState === 1 && ws.send(JSON.stringify(o)), close: () => ws.close() };
    let ended = false;
    const end = () => {
      if (ended) return;
      ended = true;
      clearInterval(c.timer);
      onClose && onClose(c);
    };
    ws.onopen = () => {
      c.last = Date.now();
      c.timer = setInterval(() => {
        // plus rien reçu depuis 7 s (pas même la réponse au ping) : connexion morte, on n'attend pas le navigateur
        if (Date.now() - c.last > 7000) {
          try {
            ws.close();
          } catch (e) {}
          return end();
        }
        c.send({ t: 'ping', ts: Date.now() });
      }, 2000);
      resolve(c);
    };
    ws.onerror = () => reject(new Error('Serveur injoignable'));
    ws.onclose = end;
    ws.onmessage = (e) => {
      c.last = Date.now();
      let m;
      try {
        m = JSON.parse(e.data);
      } catch (x) {
        return;
      }
      if (m.t === 'pong') c.rtt = Date.now() - m.ts;
      else onMsg(m);
    };
  });
}

function goOnline() {
  trainingMode = false;
  canonLayout = true;
  onlineStage = 'menu';
  boot();
  rotateCheck();
}
function leaveOnline() {
  Online.leaving = true;
  if (Online.conn) {
    try { Online.conn.close(); } catch (e) {}
  }
  Online.conn = null;
  canonLayout = false;
  onlineStage = null;
  onlinePick = null;
  boot();
  rotateCheck();
}
// (rotateCheck : dans game.js, pour tout le jeu)

Object.assign(GameScene.prototype, {
  onlineEnter() {
    this.setControls(false);
    if (pendingRoom) {
      const code = pendingRoom;
      pendingRoom = null;
      this.showOnlineMenu();
      Auth.ready.then(async () => {
        if (await Auth.ensure()) this.joinRoom(code, false);
      });
      return;
    }
    if (onlineStage === 'menu') this.showOnlineMenu();
    else if (onlineStage === 'lobby') this.showLobby();
    else this.showOnlineMenu();
  },

  onlineMsg(text, sub) {
    this.menuBase(text);
    if (sub)
      this.ui.push(this.add.text(this.W / 2, this.H * 0.45, sub, { fontFamily: FONT, fontSize: '18px', color: '#cfd3ff', align: 'center', lineSpacing: 10 }).setOrigin(0.5).setDepth(101));
  },

  // ----- Page EN LIGNE : salons publics + code + duel classé -----
  showOnlineMenu() {
    this.menuBase('EN LIGNE', { small: true });
    this.uiBtns = [];
    const D = 120;
    // panneau des salons publics
    this.ui.push(this.add.rectangle(400, 380, 680, 440, 0x14172b, 1).setStrokeStyle(4, 0x4cc9f0).setDepth(D));
    this.ui.push(this.add.text(400, 180, 'SALONS PUBLICS', { fontFamily: FONT, fontSize: '18px', color: '#4cc9f0', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(D + 1));
    this.roomObjs = [];
    this.roomMsgTxt = this.add.text(400, 380, 'CHARGEMENT...', { fontFamily: FONT, fontSize: '16px', color: '#9aa0d0', align: 'center', lineSpacing: 10 }).setOrigin(0.5).setDepth(D + 1);
    this.ui.push(this.roomMsgTxt);
    // colonne de droite
    const list = [
      { label: 'DUEL CLASSÉ', col: 0xf72585, fn: () => this.goRanked() },
      { label: 'CRÉER UN SALON', col: 0x4cc9f0, fn: () => this.goCreate(true) },
      { label: 'SALON PRIVÉ', col: 0x6ee7b7, fn: () => this.goCreate(false) },
      { label: 'ENTRER UN CODE', col: 0xffb703, fn: () => this.goJoinPrompt() },
      { label: 'RETOUR', col: 0x888888, fn: () => leaveOnline() },
    ];
    const bw = 400, bh = 66;
    list.forEach((b, i) => {
      const x = 1010, y = 215 + i * (bh + 16);
      this.ui.push(this.add.rectangle(x, y, bw, bh, 0x1a1d33, 1).setStrokeStyle(4, b.col).setDepth(D));
      this.ui.push(this.add.text(x, y, b.label, { fontFamily: FONT, fontSize: '17px', color: '#fff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(D + 1));
      this.uiBtns.push({ x, y, w: bw, h: bh, fn: b.fn });
    });
    this.baseBtns = this.uiBtns.slice();
    this.refreshRooms();
    if (this.roomPoll) this.roomPoll.remove();
    this.roomPoll = this.time.addEvent({ delay: 4000, loop: true, callback: () => this.refreshRooms() });
  },

  async refreshRooms() {
    let rooms = null;
    try {
      const r = await fetch(Auth.apiUrl('/api/rooms'));
      if (r.ok) rooms = await r.json();
    } catch (e) {}
    if (!this.roomMsgTxt || !this.roomMsgTxt.active || this.state !== 'menu') return;
    this.roomObjs.forEach((o) => o.destroy());
    this.roomObjs = [];
    this.uiBtns = this.baseBtns.slice();
    if (rooms === null) return this.roomMsgTxt.setText('SALONS INDISPONIBLES\nUTILISE UN CODE').setVisible(true);
    if (!rooms.length) return this.roomMsgTxt.setText('AUCUN SALON PUBLIC\nCRÉES-EN UN !').setVisible(true);
    this.roomMsgTxt.setVisible(false);
    const D = 121;
    rooms.slice(0, 5).forEach((r, i) => {
      const y = 232 + i * 76;
      const bg = this.add.rectangle(400, y, 640, 64, 0x1a1d33, 1).setStrokeStyle(3, 0x6ee7b7).setDepth(D);
      const t1 = this.add.text(100, y, String(r.host || '?').toUpperCase().slice(0, 14), { fontFamily: FONT, fontSize: '17px', color: '#ffe9a8', stroke: '#000', strokeThickness: 4 }).setOrigin(0, 0.5).setDepth(D + 1);
      const t2 = this.add.text(560, y, `${r.n || 1}/${r.cap || 2}` + (r.mode === 'team' ? '\nÉQUIPES' : r.cap > 2 ? '\nFFA' : ''), { fontFamily: FONT, fontSize: '12px', color: '#9aa0d0', align: 'center', lineSpacing: 4 }).setOrigin(0.5).setDepth(D + 1);
      const t3 = this.add.text(690, y, 'JOUER', { fontFamily: FONT, fontSize: '15px', color: '#6ee7b7', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(D + 1);
      this.roomObjs.push(bg, t1, t2, t3);
      this.uiBtns.push({ x: 400, y, w: 640, h: 64, fn: () => this.joinPublic(r.code) });
    });
  },

  async joinPublic(code) {
    if (!(await Auth.ensure())) return;
    this.joinRoom(code, false);
  },

  // ----- Profil (encart pseudo) -----
  async showProfile() {
    await Auth.loadProfile().catch(() => {});
    this.menuBase('PROFIL', { noBar: true });
    const p = Auth.profile;
    const lines = Auth.session
      ? [Auth.name.toUpperCase(), p ? `${p.rating} POINTS` : '', p ? `${p.wins || 0} VICTOIRES - ${p.losses || 0} DÉFAITES` : '']
      : [Auth.name.toUpperCase(), 'INVITÉ (SANS COMPTE)', 'JOUE CONTRE LE BOT'];
    this.ui.push(
      this.add.text(this.W / 2, this.H * (L.portrait ? 0.3 : 0.36), lines.join('\n'), { fontFamily: FONT, fontSize: L.portrait ? '20px' : '18px', color: '#ffe9a8', stroke: '#000', strokeThickness: 5, align: 'center', lineSpacing: 12 }).setOrigin(0.5).setDepth(101)
    );
    const list = [];
    list.push({ label: 'CHANGER DE PSEUDO', col: 0x4cc9f0, fn: () => this.renameFlow() });
    list.push({ label: 'CLASSEMENT', col: 0xffb703, fn: () => this.showLeaderboard() });
    list.push(Auth.session ? { label: 'DÉCONNEXION', col: 0xf72585, fn: () => this.logoutFlow() } : { label: 'CRÉER UN COMPTE', col: 0x6ee7b7, fn: () => this.logoutFlow() });
    list.push({ label: 'RETOUR', col: 0x888888, fn: () => (onlineStage ? this.showOnlineMenu() : this.showMenu()) });
    this.menuButtons(list, this.H * (L.portrait ? 0.4 : 0.5));
  },

  async renameFlow() {
    const r = await domModal(
      'NOUVEAU PSEUDO',
      [{ name: 'u', label: 'Pseudo (3 à 16 : lettres, chiffres, _)', max: 16 }],
      [
        {
          label: 'Valider',
          primary: true,
          run: async (v, err) => {
            if (!/^[A-Za-z0-9_]{3,16}$/.test(v.u)) return err('Pseudo : 3 à 16 caractères (lettres, chiffres, _)'), false;
            if (Auth.session) await Auth.setUsername(v.u);
            else Auth.setGuest(v.u);
            return true;
          },
        },
        { label: 'Annuler', cancel: true },
      ]
    );
    this.showProfile();
  },

  async logoutFlow() {
    await Auth.signOut();
    sessionReady = false;
    if (onlineStage) leaveOnline();
    else this.scene.restart();
  },

  async showLeaderboard() {
    this.menuBase('CLASSEMENT', { noBar: true });
    const t = this.add.text(this.W / 2, this.H * 0.47, 'CHARGEMENT...', { fontFamily: FONT, fontSize: '18px', color: '#cfd3ff', align: 'center' }).setOrigin(0.5).setDepth(101);
    this.ui.push(t);
    this.menuButtons([{ label: 'RETOUR', col: 0x888888, fn: () => this.showProfile() }], this.H - 60);
    let rows = [];
    try {
      rows = await Auth.leaderboard(10);
    } catch (e) {}
    if (!t.active) return;
    const me = Auth.profile && Auth.profile.username;
    t.setText(rows.length ? rows.map((r, i) => `${String(i + 1).padStart(2)}. ${r.username.padEnd(16)} ${String(r.rating).padStart(4)}  ${r.wins}V/${r.losses}D${r.username === me ? '  <' : ''}`).join('\n') : "PERSONNE POUR L'INSTANT")
      .setFontSize('15px').setLineSpacing(10).setAlign('left').setOrigin(0.5, 0.5).setPosition(this.W / 2, this.H * 0.47);
  },

  // ----- Duel classé -----------------------------------------------------------
  async goRanked() {
    if (!(await Auth.ensure())) return this.showOnlineMenu();
    this.onlineMsg('RECHERCHE...', "ADVERSAIRE DE TON NIVEAU");
    let q;
    let done = false;
    const cancel = () => {
      done = true;
      if (q) q.close();
      this.showOnlineMenu();
    };
    this.menuButtons([{ label: 'ANNULER', col: 0x888888, fn: cancel }], this.H - 80);
    try {
      q = await netOpen(
        '/ws/queue',
        (m) => {
          if (m.t === 'queued') return;
          if (m.t === 'error') {
            done = true;
            q.close();
            return this.onlineMsg('ERREUR', m.e === 'banned' ? 'TROP DE RÉSULTATS CONTESTÉS :\nDUEL CLASSÉ BLOQUÉ' : 'CONNEXION REFUSÉE');
          }
          if (m.t === 'match') {
            done = true;
            clearInterval(poll);
            q.close();
            this.joinRoom(m.code, true, `${m.vs} (${m.rating})`);
          }
        },
        () => {
          clearInterval(poll);
          if (!done && this.sys.isActive()) this.onlineMsg('ERREUR', 'CONNEXION PERDUE');
        }
      );
    } catch (e) {
      return this.onlineMsg('ERREUR', 'SERVEUR INJOIGNABLE');
    }
    q.send({ t: 'join', token: await Auth.token() });
    var poll = setInterval(() => q.send({ t: 'poll' }), 2000);
  },

  // ----- Salles privées ---------------------------------------------------------
  async goCreate(pub) {
    if (!(await Auth.ensure())) return this.showOnlineMenu();
    const code = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)]).join('');
    // le créateur du salon choisit l'arène (envoyée au serveur, qui la donne aux deux joueurs)
    if (this.roomPoll) { this.roomPoll.remove(); this.roomPoll = null; }
    this.showStagePick((stage) => this.pickMode((mode) => this.joinRoom(code, false, '', !!pub, stage, mode), () => this.goCreate(pub)), () => this.showOnlineMenu());
  },

  // mode du salon : chacun pour soi ou par équipes (jusqu'à 4 joueurs)
  pickMode(next, back) {
    this.menuBase('MODE DU SALON', { small: true });
    this.ui.push(this.add.text(this.W / 2, 150, "JUSQU'À 4 JOUEURS", { fontFamily: FONT, fontSize: '16px', color: '#ffd166', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(101));
    this.menuButtons(
      [
        { label: 'CHACUN POUR SOI\n(FREE FOR ALL)', col: 0xf72585, fn: () => next('ffa') },
        { label: 'PAR ÉQUIPES\n(TEAM)', col: 0x4cc9f0, fn: () => next('team') },
        { label: 'RETOUR', col: 0x888888, fn: back },
      ],
      260
    );
  },
  async goJoinPrompt() {
    if (!(await Auth.ensure())) return this.showOnlineMenu();
    const r = await domModal('REJOINDRE', [{ name: 'c', label: 'Code de la salle', max: 8, upper: true }], [
      { label: 'Rejoindre', primary: true, run: async (v, err) => (v.c.length >= 3 ? true : (err('Code trop court'), false)) },
      { label: 'Annuler', cancel: true },
    ]);
    if (r) this.joinRoom(r.values.c.toUpperCase().replace(/[^A-Z0-9]/g, ''), false);
    else this.showOnlineMenu();
  },

  async joinRoom(code, ranked, vs, pub, stage, mode) {
    this.onlineMsg('CONNEXION...', 'SALLE ' + code);
    Online.code = code;
    Online.ranked = ranked;
    Online.vs = vs || '';
    Online.rematchAsked = false;
    Online.picked = null;
    Online.leaving = false;
    Online.stage = stage || null;
    Online.wantMode = mode || null;
    try {
      Online.conn = await netOpen('/ws/room/' + code + (pub ? '?pub=1' : ''), (m) => this.roomMsg(m), (x) => this.roomClosed(x));
    } catch (e) {
      return this.onlineMsg('ERREUR', 'SERVEUR INJOIGNABLE');
    }
    Online.conn.send({ t: 'join', token: await Auth.token(), stage: Online.stage, mode: Online.wantMode });
  },

  roomClosed(c) {
    if (!this.scene || !this.sys || !this.sys.isActive() || Online.leaving) return;
    if (c && Online.conn && c !== Online.conn) return; // ancienne connexion, déjà remplacée
    if (this.net && !this.over) this.netReconnect();
    else if (this.state !== 'play' && !this.over) this.onlineMsg('DÉCONNECTÉ', 'LA CONNEXION A ÉTÉ PERDUE');
  },

  // coupure pendant un combat : on retente pendant 10 s (le serveur garde la place)
  netReconnect() {
    if (this.reco) return;
    this.reco = { until: Date.now() + 10000 };
    this.recoTxt = this.add.text(this.W / 2, this.H * 0.3, 'RECONNEXION...', { fontFamily: FONT, fontSize: '22px', color: '#ffe9a8', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setDepth(90);
    const attempt = async () => {
      if (!this.reco || this.over || !this.sys.isActive()) return;
      if (Date.now() > this.reco.until) {
        this.reco = null;
        if (this.recoTxt) this.recoTxt.destroy();
        return this.onlineEndNoResult('CONNEXION PERDUE');
      }
      try {
        const c = await netOpen('/ws/room/' + Online.code, (m) => this.roomMsg(m), (x) => this.roomClosed(x));
        Online.conn = c;
        c.send({ t: 'join', token: await Auth.token() });
      } catch (e) {
        setTimeout(attempt, 1500);
      }
    };
    attempt();
  },

  roomMsg(m) {
    const n = this.net;
    if (m.t === 'error') {
      Online.conn && Online.conn.close();
      Online.conn = null;
      return this.onlineMsg('IMPOSSIBLE', m.e === 'full' ? 'SALLE PLEINE' : m.e === 'forbidden' ? 'ACCÈS REFUSÉ' : 'CONNEXION REFUSÉE');
    }
    if (m.peers) Online.roomInfo(m);
    if (m.t === 'hello' && this.net && !this.over) {
      // reconnecté pendant le combat : on continue
      Online.idx = m.idx;
      if (this.reco) {
        this.reco = null;
        if (this.recoTxt) this.recoTxt.destroy();
        this.popup(this.W / 2, this.H * 0.3, 'RECONNECTÉ', '#6ee7b7');
      }
      this.netResend(NET_KEEP - 2);
      return;
    }
    if (m.t === 'drop') {
      if (n && !this.over && !this.dropTxt) this.dropTxt = this.add.text(this.W / 2, this.H * 0.3, this.pls && this.pls.length > 2 ? 'UN JOUEUR SE RECONNECTE...' : "L'ADVERSAIRE SE RECONNECTE...", { fontFamily: FONT, fontSize: '18px', color: '#ffe9a8', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setDepth(90);
      return;
    }
    if (m.t === 'back') {
      if (this.dropTxt) this.dropTxt.destroy();
      this.dropTxt = null;
      if (n) this.netResend(NET_KEEP - 2);
      return;
    }
    if (m.t === 'hello') {
      Online.idx = m.idx;
      if (m.stage) Online.stage = m.stage;
      onlineStage = 'lobby';
      return this.showLobby();
    }
    if (m.t === 'peers' || m.t === 'rematch') {
      if (m.t === 'rematch') {
        onlineStage = 'lobby';
        Online.picked = null;
        this.scene.restart();
        return;
      }
      if (this.state === 'lobby') this.showLobby();
      return;
    }
    if (m.t === 'start') return this.onlineStart(m);
    if (m.t === 'in' || m.t === 'hash' || m.t === 'sync') return n && this.netReceive(m);
    // écart : on resynchronise (seul un écart « fatal », ou un vieux client, arrête la partie)
    if (m.t === 'desync') return n && !m.fatal && m.e !== undefined ? this.netReceive(m) : this.onDesync(m.f);
    if (m.t === 'left') {
      if (this.dropTxt) this.dropTxt.destroy();
      this.dropTxt = null;
      if (n && !this.over && m.started && this.pls.length > 2) {
        // à plusieurs : le joueur parti est éliminé (à la même image chez tout le monde) et la partie continue
        if (m.p >= 0) this.netGone(m.p, m.last);
        const who = m.p >= 0 && this.pls[m.p] ? this.pls[m.p].name : '';
        this.popup(this.W / 2, this.H * 0.3, (who ? who + ' ' : 'UN JOUEUR ') + 'EST PARTI', '#ff8fa3');
      } else if (n && !this.over) this.onlineForfeit("L'ADVERSAIRE EST PARTI");
      return;
    }
    if (m.t === 'rated') {
      const mine = m.winner === (this.net ? this.net.me : Online.idx);
      this.sub && this.sub.setText(`${m.delta >= 0 ? '+' : ''}${m.delta} POINTS  (${m.rating})`).setColor(m.delta >= 0 ? '#6ee7b7' : '#ff8fa3');
      if (Auth.profile) Auth.profile.rating = m.rating;
      return;
    }
    if (m.t === 'rematch?') return this.sub && !Online.rematchAsked && this.sub.setText("L'ADVERSAIRE VEUT UNE REVANCHE");
    if (m.t === 'final') return m.disputed && this.sub && this.sub.setText('RÉSULTAT CONTESTÉ : SANS EFFET');
  },

  // ----- Salon : joueurs (jusqu'à 4), mode, équipes, choix du personnage ----------------
  showLobby() {
    this.clearUi();
    if (typeof MUSIC !== 'undefined') MUSIC.play('menu');
    this.state = 'lobby';
    this.uiBtns = [];
    this.barBtn = null;
    const peers = Online.peers || [];
    const me = peers[Online.idx];
    const cap = Online.ranked ? 2 : Online.cap || 4;
    const isHost = !Online.ranked && Online.host === Online.idx;
    const team = !Online.ranked && Online.mode === 'team';
    const D = 100, W = this.W;
    const txt = (x, y, s, size, col, ox) => {
      const t = this.add.text(x, y, s, { fontFamily: FONT, fontSize: size + 'px', color: col || '#fff', stroke: '#000', strokeThickness: 4, align: 'center' }).setOrigin(ox === undefined ? 0.5 : ox, 0.5).setDepth(D + 2);
      this.ui.push(t);
      return t;
    };
    const btn = (x, y, w, h, label, col, fn, size, fill) => {
      this.ui.push(this.add.rectangle(x, y, w, h, fill === undefined ? 0x1a1d33 : fill, 1).setStrokeStyle(4, col).setDepth(D + 1));
      txt(x, y, label, size || 15);
      this.uiBtns.push({ x, y, w, h, fn });
    };
    this.ui.push(this.add.rectangle(W / 2, this.H / 2, W, this.H, 0x0b0d1f, 0.94).setDepth(D));
    txt(W / 2, 48, Online.ranked ? 'DUEL CLASSÉ' : 'SALLE  ' + Online.code, 34, '#fff');
    const info = [];
    if (!Online.ranked) info.push(MODE_NAMES[Online.mode] || MODE_NAMES.ffa);
    if (!Online.ranked && Online.stage) info.push('ARÈNE : ' + (STAGE_NAMES[Online.stage] || '?'));
    if (info.length) txt(W / 2, 92, info.join('   ·   '), 15, '#ffd166');
    // les places
    const y0 = 146, rh = 64;
    const here = peers.filter((p) => p && p.here !== false);
    for (let j = 0; j < cap; j++) {
      const p = peers[j] && peers[j].here !== false ? peers[j] : null;
      const y = y0 + j * rh;
      const mine = j === Online.idx;
      this.ui.push(this.add.rectangle(W / 2, y, 940, rh - 10, mine ? 0x232846 : 0x161a30, 1).setStrokeStyle(3, mine ? 0xffe9a8 : 0x3a3f5c).setDepth(D + 1));
      txt(W / 2 - 450, y, `J${j + 1}`, 15, '#9aa0d0', 0);
      if (!p) {
        txt(W / 2 - 390, y, 'PLACE LIBRE', 15, '#5a6080', 0);
        continue;
      }
      txt(W / 2 - 390, y, (p.name || '?').toUpperCase().slice(0, 12) + (mine ? ' (TOI)' : ''), 16, mine ? '#ffe9a8' : '#fff', 0);
      if (!Online.ranked && j === Online.host) txt(W / 2 - 390, y + 19, 'CHEF', 10, '#ffd166', 0);
      txt(W / 2 + 20, y, p.char ? CHARS[p.char].name : '...', 15, '#cfd3ff');
      txt(W / 2 + 190, y, p.ready ? 'PRÊT' : '', 15, '#6ee7b7');
      if (team) {
        const t = p.team === 1 ? 1 : 0;
        const tc = TEAM_COLS[Online.tcols[t]] || TEAM_COLS[t];
        const col = Phaser.Display.Color.HexStringToColor(tc.css).color;
        const x = W / 2 + 360;
        this.ui.push(this.add.rectangle(x, y, 190, 40, col, 1).setStrokeStyle(3, 0x000000).setDepth(D + 1));
        txt(x, y, 'ÉQUIPE ' + tc.name, 12, '#fff');
        // le chef du salon place chaque joueur dans une équipe (toucher pour changer)
        if (isHost) this.uiBtns.push({ x, y, w: 190, h: 40, fn: () => Online.conn.send({ t: 'team', slot: j, team: 1 - t }) });
      }
    }
    // réglages du chef : mode, couleurs des équipes
    let yh = y0 + cap * rh + 6;
    if (isHost) {
      const other = Online.mode === 'team' ? 'ffa' : 'team';
      btn(W / 2 - (team ? 320 : 0), yh, 300, 50, 'MODE : ' + (team ? 'ÉQUIPES' : 'CHACUN POUR SOI'), 0xf72585, () => Online.conn.send({ t: 'mode', mode: other }), 12);
      if (team)
        [0, 1].forEach((t) => {
          const tc = TEAM_COLS[Online.tcols[t]];
          const next = () => {
            let c = Online.tcols[t];
            do c = (c + 1) % TEAM_COLS.length;
            while (c === Online.tcols[1 - t]);
            Online.conn.send({ t: 'tcol', team: t, col: c });
          };
          btn(W / 2 + (t === 0 ? 0 : 320), yh, 300, 50, `ÉQUIPE ${t + 1} : ${tc.name}`, Phaser.Display.Color.HexStringToColor(tc.css).color, next, 12);
        });
      yh += 44;
    }
    // pourquoi la partie ne démarre pas encore
    let hint = '';
    if (here.length < 2) hint = Online.ranked ? "EN ATTENTE DE L'ADVERSAIRE..." : 'EN ATTENTE DE JOUEURS (2 À 4)...';
    else if (team && new Set(here.map((p) => (p.team === 1 ? 1 : 0))).size < 2) hint = isHost ? 'TOUCHE LES ÉQUIPES POUR RÉPARTIR LES JOUEURS' : 'LE CHEF RÉPARTIT LES ÉQUIPES';
    else if (me && me.char && !me.ready) hint = 'TOUCHE PRÊT QUAND TU ES BON';
    else if (me && me.ready) hint = 'LA PARTIE DÉMARRE QUAND TOUT LE MONDE EST PRÊT';
    if (team && isHost && !hint) hint = 'TOUCHE UNE ÉQUIPE POUR CHANGER UN JOUEUR DE CAMP';
    if (hint) txt(W / 2, yh + 22, hint, 12, '#9aa0d0');
    // actions
    const acts = [];
    if (!me || !me.char || !me.ready) acts.push({ label: me && me.char ? 'CHANGER DE PERSO' : 'CHOISIR MON PERSO', col: 0xf72585, fn: () => this.lobbyPick() });
    if (me && me.char && !me.ready) acts.push({ label: 'PRÊT !', col: 0x6ee7b7, fn: () => Online.conn.send({ t: 'ready' }) });
    if (!Online.ranked) acts.push({ label: 'COPIER LE LIEN', col: 0x4cc9f0, fn: () => this.copyInvite() });
    acts.push({ label: 'QUITTER', col: 0x888888, fn: () => leaveOnline() });
    const bw = 280, gap = 20, by = this.H - 52;
    acts.forEach((a, k) => btn(W / 2 + (k - (acts.length - 1) / 2) * (bw + gap), by, bw, 62, a.label, a.col, a.fn, 14));
    if (!Online.picked && (!me || !me.char)) this.lobbyPick();
  },

  lobbyPick() {
    onlinePick = (id) => {
      onlinePick = null;
      Online.picked = id;
      Online.conn.send({ t: 'pick', char: id });
      this.showLobby();
    };
    this.showSelect();
  },

  copyInvite() {
    const url = location.origin + location.pathname + '?room=' + Online.code;
    const done = () => this.popup(this.W / 2, 240, 'LIEN COPIÉ', '#6ee7b7');
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, () => prompt('Copie ce lien', url));
    else prompt('Copie ce lien', url);
  },

  // ----- Match ------------------------------------------------------------------------
  onlineStart(m) {
    this.clearUi();
    onlinePick = null;
    this.over = false;
    // même terrain sur les deux téléphones : tiré du code de la salle
    const stage = STAGES.includes(m.stage) ? m.stage : STAGES.includes(Online.stage) ? Online.stage : stageFromCode(Online.code);
    if (this.applyStage) this.applyStage(stage);
    if (typeof MUSIC !== 'undefined') MUSIC.play(stage === 'dune' ? 'desert' : stage === 'gala' ? 'gala' : 'night');
    Online.mode = m.mode || 'ffa';
    if (m.tcols) Online.tcols = m.tcols;
    const meIdx = m.order ? m.order.indexOf(Online.idx) : Online.idx;
    this.beginNetMatch({ me: meIdx, chars: m.chars, names: m.names, mode: Online.mode, teams: m.teams, tcols: Online.tcols, send: (o) => Online.conn && Online.conn.send(o), rtt: () => (Online.conn ? Online.conn.rtt : 0) });
    this.state = 'countdown';
    this.setControls(true);
    this.onDesync = (f) => this.onlineEndNoResult('DÉSYNCHRONISATION');
    const D = 120;
    const t = this.add.text(this.W / 2, this.H * 0.35, '3', { fontFamily: FONT, fontSize: '96px', color: '#fff', stroke: '#f72585', strokeThickness: 14 }).setOrigin(0.5).setDepth(D);
    const names = this.add.text(this.W / 2, this.H * 0.2, m.names.join('  VS  '), { fontFamily: FONT, fontSize: '22px', color: '#ffe9a8', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setDepth(D);
    let c = 3;
    const ev = this.time.addEvent({
      delay: 800,
      repeat: 3,
      callback: () => {
        c--;
        if (c > 0) {
          t.setText(String(c));
          this.sfx('count');
        } else if (c === 0) {
          t.setText('GO !');
          this.sfx('go');
          this.state = 'play';
          this.acc = 0;
        } else {
          t.destroy();
          names.destroy();
        }
      },
    });
    this.netHud = this.add.text(this.W - 20, this.H - 20, '', { fontFamily: FONT, fontSize: '11px', color: '#9aa0d0' }).setOrigin(1, 1).setDepth(50);
  },

  onlineForfeit(msg) {
    if (this.over) return;
    this.over = true;
    this.net = this.net; // gardé pour le rapport
    const mine = this.net ? this.net.me : Online.idx;
    this.banner.setText('VICTOIRE !');
    this.sub.setText(msg);
    Online.conn && Online.conn.send({ t: 'result', winner: mine });
    this.onlineOverButtons();
  },

  onlineEndNoResult(msg) {
    if (this.over) return;
    this.over = true;
    this.banner.setText('MATCH ANNULÉ').setFontSize('36px');
    this.sub.setText(msg);
    this.onlineOverButtons();
  },

  onlineFinish(winnerPlayer) {
    const widx = winnerPlayer.i;
    const me = this.pl(this.net ? this.net.me : 0);
    const multi = this.pls.length > 2;
    const won = winnerPlayer === me || (multi && winnerPlayer.team === me.team);
    this.banner.setText(won ? 'VICTOIRE !' : 'DÉFAITE...');
    if (multi) this.sub.setText(Online.mode === 'team' ? `ÉQUIPE ${TEAM_COLS[Online.tcols[winnerPlayer.team]].name} GAGNE` : `${winnerPlayer.name || winnerPlayer.def.name} GAGNE`);
    else this.sub.setText(Online.ranked ? 'CALCUL DU CLASSEMENT...' : '');
    Online.conn && Online.conn.send({ t: 'result', winner: widx });
    this.onlineOverButtons();
  },

  onlineOverButtons() {
    this.setControls(false);
    this.time.delayedCall(1400, () => {
      this.state = 'menu';
      this.menuButtons(
        [
          ...(Online.ranked ? [] : [{ label: 'REVANCHE', fn: () => { Online.rematchAsked = true; Online.conn && Online.conn.send({ t: 'rematch' }); this.sub.setText("EN ATTENTE DE L'ADVERSAIRE..."); } }]),
          { label: 'QUITTER', col: 0x888888, fn: () => leaveOnline() },
        ],
        this.H * 0.62
      );
    });
  },
});

// petit affichage réseau pendant le combat (ping + corrections)
GameScene.prototype.updateNetHud = function () {
  if (this.netHud && Online.conn && this.net) this.netHud.setText(`PING ${Online.conn.rtt}ms  RB ${this.net.rollbacks}`);
};

if (ONLINE_OK) {
  Auth.ready = Auth.init().catch(() => {});
  const rc = new URLSearchParams(location.search).get('room');
  if (rc) {
    pendingRoom = rc.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    canonLayout = true;
    onlineStage = 'menu';
    setTimeout(rotateCheck, 500);
  }
}
