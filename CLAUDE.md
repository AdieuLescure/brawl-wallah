# Brawl Proto — notes pour reprendre le projet

Jeu de combat de plateforme 1v1 (style Smash / Brawlhalla) pour téléphone, en pixel art, joué dans le navigateur.
Le propriétaire (Noah) ne code pas : réponses en français, courtes, sans jargon. Il travaille surtout depuis son téléphone.

## Ce qui est en ligne

- Le site et le serveur sont **un seul Worker Cloudflare** `brawl-wallah` (adresse `brawl-wallah.noahmurador.workers.dev`),
  déployé automatiquement à chaque push sur `main` (Workers Builds, `wrangler deploy` à la racine).
- `wrangler.toml` : sert les fichiers de la racine comme site (`[assets]`, filtrés par `.assetsignore`), et `relay.js`
  gère `/ws/*` (combats, file d'attente) et `/api/*` (inscription, pseudo, salons publics, diagnostic).
- Secret Cloudflare obligatoire : `SUPABASE_SERVICE_KEY` (l'URL et la clé anon sont dans `wrangler.toml`).
  Diagnostic : `/api/health` doit montrer les 3 secrets à `true`.
- Supabase (`vtwmiavajwotunrowlou`) : table `profiles` (pseudo, points Elo, victoires/défaites) et `matches`,
  fonction `record_match` (Elo K=32) appelable seulement avec la clé service. Comptes = pseudo + mot de passe,
  l'e-mail est fabriqué (`pseudo@brawl-players.app`) et créé confirmé par le Worker (`/api/signup`).
  CONNEXION par le Worker (`/api/login`) : il retrouve le compte par son pseudo dans `profiles` (sans tenir compte des
  majuscules, même renommé), lit son adresse avec la clé service, puis vérifie le mot de passe chez Supabase et renvoie
  la session (le jeu fait `setSession`). `/api/rename` remet aussi l'adresse au nouveau pseudo. Mots de passe : jamais
  stockés ni affichés par le jeu (Supabase ne garde qu'une empreinte). Champs de saisie sans correction automatique.

## Organisation

- `src/` : le jeu (Phaser 3.80.1, un seul fichier HTML une fois assemblé)
  - `sprites48.js`, `chars48.js`, `art.js` : pixel art généré par code
  - `game.js` : moteur de combat, données des persos (`CHARS`), règles (`KB_BASE`, `STUN_*`, `DI_MAX`…), HUD, contrôles
  - `campaign.js` : menus, campagne solo (histoire, 6 chapitres)
  - `netcode.js` : rollback type GGPO (instantanés génériques des joueurs, rejeu silencieux, recalage du rythme)
  - `online.js` : comptes Supabase, salons publics/privés, duel classé, reconnexion
  - `bots.js` : bots par niveau (temps de réaction, précision), mannequin d'entraînement
  - `stages.js` : terrains (décor seulement, mêmes plateformes) : « NUIT » (ville) et « DÉSERT » (dunes, deux lunes,
    ver géant qui surgit au loin, ornithoptère, épice ; plateformes en roche sombre pour le contraste). L'arène se choisit
    sur un écran avant le choix du perso (`showStagePick`, mémorisé dans `SETTINGS.stage`). Campagne : alterne selon le
    chapitre. En ligne : le créateur du salon la choisit (envoyée au serveur avec `join`, renvoyée dans `hello` et `start`) ;
    duel classé : tirée du code de la salle (`stageFromCode`).
  - `adieu.js` : le perso AdieuLescure (données, textures de ses objets, mécaniques uniques) + le PASTIS de Deadlulu.
    CTRL+Z (`type: 'rewind'`) : retour à la position d'il y a 1 s et dégâts reçus annulés, recharge 11 s (trace dans
    les champs `zx0..9`, `zy0..9`, `zd0..9` du joueur, donc sauvegardée par le netcode). CONTRÔLE (`type: 'catch'`) :
    projectile attrapé et renvoyé de volée, ou attaquant attrapé et projeté (réutilise `startGrab`).
  - `bigzinzin.js` : le perso BIGZINZIN (données de base, textures feuille/key frame/billet, mécaniques). JACKPOT
    (`money`, `goldUntil`, réglages dans `BZ`) : argent gagné en touchant, perdu en étant touché, à 100 € version dorée
    8 s (postures `_g` de la planche, choisies dans `step`/`anim.js`). DOUBLURE (`type: 'vanish'`) : téléport vers le
    haut, invisible (`invisUntil`), silhouette de billets = projectile `decoy` qui encaisse un coup (`bzDecoyHit`,
    `bzProj`). KEY FRAME : projectile `keyframe`, `freeze` = image figée (`freezeUntil`). FEUILLE A4 : projectile `paper`.
  - `ln4.js` : le perso LN4 (pilote de F1 et joueur de badminton, combinaison noire et orange SANS logo de marque).
    VOLANT (`shuttle` : part vite puis freine, `LN.drag`), CHAMPAGNE (spéciale haut, `rise`), ARRÊT AU STAND
    (`type: 'pit'`, au sol : immobile 0,5 s puis PNEUS NEUFS `tyreUntil` 6 s = `spdMul` 1,25 et FEUX ÉTEINTS +30 %),
    FEUX ÉTEINTS (lourd avant, `dashV`, 5 feux rouges). Branché sur `bzStep`/`bzProj`/`extraFx` (enveloppés).
  - `natanax.js` : le perso NATANAX (cape verte, veste beige, casquette « Peaky Blinders » à lames À LA MAIN, sans écusson).
    CASQUETTE (spéciale avant, projectile `cap`) : boomerang (`decel`, `fallAt`), touche à l'aller et au retour (`p.back`,
    `p.hits`), RATTRAPÉE au retour = recharge immédiate, ratée = posée au sol (`p.spent`) à ramasser, revient seule après
    `life` ; tant qu'elle est partie (`nxCapOut`) : postures « _n » sans casquette et LÉGERS à 75 %. TABLEAU E = MC² :
    SPÉCIAL + BAS TENU au sol (bit d'entrée 22 `shold`, champ `pl.sHold`) = il écrit (`eqMs`, 0,5 s par morceau, 1,5 s
    en tout), attaquable ; interrompu, ce qui est écrit reste ; effacé quand il perd une vie. FISSION (appui court,
    type `fission`, 2 `neutron`) ; formule complète = RÉACTION EN CHAÎNE (`dSX`, `nuke`, préparation 0,42 s, consomme la
    formule au moment où elle part). ALLEY-OOP (spéciale haut, `dunk` : ballon `bball` lancé vers le bas).
    Branché sur `nxPick`/`nxStart`/`nxTimer` (`game.js`) et `bzStep`/`bzProj`/`bzHit`/`die`/`botInput` (enveloppés).
  - `kits.js` : MOVESETS des 9 persos (grammaire commune, voir le doc « Brawl Proto — refonte du combat »).
    Boutons LÉGER / LOURD / SPÉCIAL + direction (neutre, avant, haut, bas ; haut/bas seulement si on pousse franchement).
    Clés : `nL` (neutre : enchaînement de 3 coups, `chain`), `sL` `uL` `dL` au sol ; `sA` `uA` `dA` en l'air ;
    lourds `sH` `uH` `dH` (se chargent : `chargeMax`, LOURD tenu) ; en l'air `uAH` (retour) et `dAH` (plongeon) ;
    spéciales `nS` `uS` `dS` (recharges `cd`, `onceAir` = une fois par saut). Chaque coup a un identifiant `mid` (usure).
    Mécaniques signature : CHAUFFE + ÉRUPTION (Toro, `heat`, type `burst`), ÉTOILE PIÈGE + TÉLÉPORT (Astra, type
    `blink`), PEAU DE PIERRE + MUR DE PRISON (MÉNÈS, id `grom`, `armor` sur ses lourds sauf la prise, projectile `wall`
    texture `prisonwall` qui arrête les tirs `blockable` ; MICRO au bout d'un long fil = l'ancien grappin, texture `mic` ;
    VENTRE AU CIEL = spéciale haut, posture `bellyUp` ; la prise affiche toujours « SUPLEX ! »), COUPABLE ! (Deadlulu, `mark` sur le livre, lourd renforcé), l'aigle (Denodoom), colère de Scarlett
    (Nini), CTRL+Z (AdieuLescure). Vitesse, saut, poids et textes d'aide de chaque perso sont aussi ici.
  - `anim.js` : animation d'affichage + CAMÉRA qui suit et zoome (2e caméra fixe pour l'interface : profondeur >= 50). `pl.sprite` = corps physique INVISIBLE ; `pl.view` = l'image affichée, recopiée à
    chaque image avec écrasement/étirement, préparation et détente des coups, tremblement, vrille, balancement. Choisit
    aussi les postures dessinées en plus si elles existent : `<pose>Pre` (préparation), `fall`, `crouch`, course en 4
    temps (`run0, run2, run1, run3`). Ne touche jamais la simulation.
  - `extras.js` : vibration, indicateurs hors écran, réglages, entraînement, bouton quitter
  - `music_dune.js` : la musique du désert, convertie depuis le MIDI de Noah (`DUNE_MIDI`, 4 pistes : lead, arp,
    basse, batterie). Intro (mesures 1-11) une fois, puis boucle des mesures 12-43 (`loopStart`/`loopEnd`).
  - `audio.js` : son 100 % synthétisé (aucun fichier ; le désert joue `DUNE_MIDI` via `tickMidi`). `SFX.play(nom)` = bruitages en couches + réverbération ;
    `MUSIC` = séquenceur avec 3 morceaux originaux (`menu`, `night`, `desert`, notes écrites dans `SONGS`), jingles
    victoire/défaite, tempo accéléré en mort subite. Réglages : BRUITAGES et MUSIQUE séparés.
  - `head.html` : en-tête HTML (le bloc `<!--ONLINE-->` est retiré pour la version hors ligne)
- `src/pngs.js` : persos redessinés en pixel art (planches PNG intégrées), générés par `tools/art/export.py`
  (`flat.py` = moteur à aplats, `toro_set.py`, `lulu_set.py`, `deno_set.py`, `adieu_set.py`, `bz_set.py`, `menes_set.py`, `ln4_set.py`, `natanax_set.py` = postures de Toro,
  Deadlulu, Denodoom, AdieuLescure, BIGZINZIN, MÉNÈS (gros ventre, t-shirt blanc trop court, claquettes), LN4 (raquette `rq`, casque `hm`, champagne `bt`, volant `sc`) et NATANAX (casquette `cap`, ballon `bb`, craie, atome, `armBehind` = bras levé derrière la tête, version sans casquette `_n` avec `NOCAP_SKIN`) — case de 80 x 72 pour l'antenne, version dorée avec `GOLD_SKIN`) ; `extra_poses.py` ajoute à tous la course en 4 temps, la réception, la chute et les
  préparations des gros coups. Style : celui de la référence de Noah
  (aplats anguleux, 3 tons, contour noir, gros poings et pieds), ~62 px de haut, affichés à l'échelle 1,25.
  Les persos pas encore redessinés utilisent l'ancien dessin par code (`sprites48.js`, `chars48.js`).
- `server/` : `core.js` (logique des salles, partagée), `worker.js` (Cloudflare), `dev-server.js` (test local)
- `tools/build.py` : assemble `index.html` et `relay.js` — **toujours relancer après une modification**, puis committer
  les fichiers générés (Cloudflare ne lance pas de build).

## Nouveaux persos et familles d'armes (demande de Noah, à appliquer à chaque nouveau perso)

- Passage prévu à 2 boutons d'attaque façon Brawlhalla : COUP (les coups de la FAMILLE D'ARME, partagés) + SPÉCIAL
  (sol : neutre, avant, bas ; haut = remonter au sol et en l'air ; air bas = plongeon). Plan détaillé dans le document
  « Brawl Proto — armes, spéciales et combos » (à valider par Noah avant de coder). L'ancienne mécanique
  LÉGER / LOURD / SPÉCIAL est gardée sur la branche `trois-boutons` (ne pas la supprimer).
- Familles : POINGS (Toro, Ménès, AdieuLescure aux pieds), OBJET EN MAIN (BIGZINZIN, NATANAX), ALLONGE (Deadlulu, LN4),
  TIR (Denodoom au fusil à pompe ; pensée aussi pour pistolets, arc, magie). Nouvelle famille si aucune ne colle.
- Pour chaque nouveau perso : 1) déterminer sa famille d'arme, ou PROPOSER plusieurs familles à Noah quand l'objet s'y
  prête ; 2) ses spéciales (3 au sol + remonter + plongeon, au moins une « relance » qui permet de repartir sur des
  COUPS) ; 3) ses combos à lui (simples, moyens, durs) qui mêlent les COUPS de sa famille et ses spéciales, en plus des
  combos partagés par la famille.

## Règles à respecter

- La simulation doit rester **déterministe** (en ligne, les deux téléphones rejouent la même partie) :
  pas de `Math.random()` ni de temps réel dans la logique, seulement pour les effets visuels et les bots hors ligne.
  Tout état de jeu d'un joueur doit être un champ simple (nombre, booléen, texte) pour être sauvegardé par `snapshot()`.
- Défense façon Brawlhalla : pas de garde. Esquive au sol sur place (recharge 1 s), ESQUIVE + côté au sol = SPRINT (1,9 × la vitesse,
  sans invincibilité, coupé par un saut ou une attaque), esquive aérienne une fois par saut, ESQUIVE DE POURSUITE juste
  après un coup qui touche (2 au sol, 1 en l'air).
- 3 sauts (sol + 2 en l'air). Coup de retour = LOURD (+ haut) en l'air, une fois par saut, SANS chute impuissante ;
  LOURD + bas en l'air = coup de pied plongeant. Rebord automatique. Être touché rend un saut (et les capacités de
  retour). On regarde du côté où l'on pousse le joystick.
- Combos (`step` dans `game.js`) : un LÉGER qui touche peut être annulé par un autre coup (léger différent, lourd,
  spéciale) ou par l'esquive de poursuite, 3 annulations au plus. USURE : un coup déjà dans les 5 derniers qui ont
  touché (`st0..4`) perd 10 % par répétition (40 % au plus) et ne garantit plus l'enchaînement à partir de 2 répétitions.
- GRAVITY CANCEL : esquive aérienne sur place puis attaque dans les 0,3 s (`gcUntil`) = coup du sol en l'air.
- 5 boutons : LÉGER, LOURD, SPÉCIAL (3 points autour = spéciales prêtes), SAUT, ESQUIVE. En ligne, SPÉCIAL = bit 21,
  SPÉCIAL tenu = bit 22 (`shold`, le TABLEAU de NATANAX). Variantes de postures : suffixes `VARIANTS` (`_g` doré, `_n` sans casquette).
- CLAVIER (ordinateur, `KEYMAP`/`KB` dans `game.js`, touches physiques donc AZERTY = QWERTY) : ZQSD ou flèches, Espace
  saut, J/X léger, K/C lourd (tenu = charge), I/V spéciale, L/Maj esquive, Échap quitter. `localInput()` mélange
  écran tactile et clavier (hors ligne et en ligne) ; au clavier les boutons tactiles se cachent.
- Le bloc du terrain (herbe + terre) est entièrement solide. Le rebord s'attrape aussi en montant sous le niveau du bord
  et en se cognant sous le terrain près du coin. Pour déplacer un perso d'un coup, toujours passer par `putAt()`
  (sinon le corps physique garde un décalage d'une image).
- Nini ne frappe jamais elle-même : Scarlett (le chat), le corgi, l'amour, la pivoine, le voyage (valise) et le vent
  (Autant en emporte le vent). Le corgi est sur SPÉCIAL + BAS avec une recharge, pas sur un coup de base.
- Les coups « signature » (tirs, invocations, contres, CTRL+Z…) vont en LOURD ou en SPÉCIAL, jamais en LÉGER
  (demande de Noah) : les légers sont des coups simples faits pour enchaîner.
- ZONES DE KO (`BLAST_X` 740, `BLAST_TOP` 640, `BLAST_BOTTOM` 420 dans `game.js`, comme à l'origine) : côtés et haut,
  on n'y meurt QUE projeté par l'adversaire (encore étourdi + `KO_GRACE`, ou tenu par une prise) ; seul (saut, retour,
  élan d'un coup), on bute sur un mur invisible `WALL_IN` px avant. En bas on meurt toujours (retour raté).
  GROS POURCENTAGES : `tumble` (champ du joueur, `tumbleFor(%)`, de 50 % à 155 %, jusqu'à -70 %) réduit la dérive en
  l'air et l'élan horizontal des coups de retour jusqu'à se reposer (sol ou rebord) : revenir devient dur.
  La caméra peut dézoomer jusqu'à `CAM_MIN_Z` (`anim.js`) ; le fond (profondeur <= -5) est rendu par une 3e caméra
  `bgCam` qui ne dézoome pas.
- Effets d'un coup (traînée, croissant, flammes…) : lancés par `whenAtk` au moment où le coup PART (`atk.hitAt`), donc
  après le relâchement d'un lourd chargé — jamais avec un délai fixe.
- Écran de choix : 3 colonnes jusqu'à 6 persos, 4 au-delà. Chaque perso jouable doit avoir ses répliques de campagne
  (`STORY.intro` et `STORY.outro` dans `campaign.js`), sinon la campagne plante quand il est l'adversaire.
- Persos en réserve : `BENCH` (`game.js`, Astra et Nini) : code et dessins gardés, mais absents du choix, de la
  campagne, des bots et de l'entraînement (`playable()` = la liste proposée).
- POLICE : `BrawlPixel` = Press Start 2P retouchée (`tools/art/patch_font.py`) avec de vraies majuscules accentuées
  (l'original écrase É en « é »), intégrée en base64 dans `head.html`. Écrire les textes AVEC les accents (LÉGER, DÉFAITE…).
- Écran de choix du perso (`showSelect` dans `game.js`) : grille de cartes en parallélogramme avec le buste
  (`cardTex`, dessinées en pixels depuis `idle0`), grand perso en pied à droite (en haut en portrait), nom, VALIDER.
  Toucher une carte la sélectionne ; clavier : flèches + Entrée.
- BOUTONS TACTILES PLACÉS PAR LE JOUEUR : réglages > PLACER LES BOUTONS (`showButtonEditor` / `startButtonEditor` dans
  `extras.js`, état `editor`, fausse partie immobile derrière avec `this.editing`). Glisser = déplacer (`editorFit` : les
  commandes se contournent, 10 px d'écart minimum, restent dans l'écran sous la barre d'outils), toucher puis - / + =
  taille 70 à 140 %. Gardé dans `SETTINGS.layout.L` (téléphone en largeur) et `.P` (en hauteur), en fraction de l'écran ;
  `ctrlLayout()` / `defaultLayout()` dans `game.js`. Changer MAINS ou BOUTONS remet la disposition d'origine. Le joystick
  apparaît où l'on touche, dans la moitié d'écran où il est placé.
- Chrono de 8 min (`MATCH_MS`), PAS de mort subite : à la fin, plus de vies gagne, puis le moins de % ; sinon ÉGALITÉ. 3 vies.
- SALONS À 4 (en ligne, hors duel classé) : `RoomCore` (`server/core.js`) a 4 places (`cap`), un mode choisi à la création
  (`mode` : 'ffa' chacun pour soi / 'team' par équipes, envoyé avec `join`), et le CHEF (`host()` = 1re place occupée)
  change le mode, l'équipe de chaque joueur (`team`) et la couleur des deux équipes (`tcol`, indices de `TEAM_COLS`
  dans `game.js`). Départ quand tous les présents (2 à 4) sont prêts ; `start` envoie `order` (places en jeu = index des
  joueurs), `teams`, `tcols`. Moteur : `this.pls` (2 à 4 joueurs ; `p1`/`p2` = alias des deux premiers), `enemiesOf`,
  `foeOf` (ennemi le plus proche), `projVictim`, pas de coups entre coéquipiers, `eliminate` (éliminé = spectateur,
  corps désactivé ; fin quand il reste un camp), `timeWinner`. Netcode : entrées de N joueurs (`netIn`, message `in`
  avec `p`), un joueur parti en pleine partie est éliminé à la même image partout : le serveur envoie `left` avec sa
  dernière image (`lastIn`) et `LEFT_IN` remplace ensuite ses entrées. À 2 joueurs, tout reste comme avant.
  Couleurs d'équipe : chaque `*_set.py` déclare `CLOTH` (matériaux des vêtements), exportés dans `PNG_CHARS[id].cloth` ;
  `teamTex` recolore la planche à la volée (textures `id~couleur_pose`, `pl.tex`, utilisées par `anim.js`).
- Un nouveau perso doit aussi être ajouté à `CHARS` dans `server/core.js` (sinon le serveur refuse son choix en ligne).
- Effets visuels : jamais d'état visuel remis à zéro par une minuterie (`this.time`, `tweens`) — pendant un rejeu en
  ligne elles sont désactivées (le perso restait tout blanc, l'aigle restait figé). La teinte est décidée à chaque image
  dans `step` d'après `flashUntil` ; un objet à effacer pendant un rejeu est détruit tout de suite.
- Bouton X en haut pendant un combat : quitter (hors ligne) ou abandonner (en ligne, message `leave` au serveur).
- Tester avec Playwright (Chromium déjà installé) en pilotant `game.step()` image par image.
