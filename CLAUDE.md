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
  - `kits.js` : commandes À LA BRAWLHALLA. Deux boutons d'attaque : LÉGER (`nLight`/`sLight`/`dLight` au sol,
    `nAir`/`sAir`/`dAir` en l'air) et LOURD (`nSig`/`sSig`/`dSig` au sol ; en l'air `rec` = coup de retour, `gp` = LOURD+bas).
    Haut = neutre, plus de coup arrière (on se tourne du côté poussé). Coups légers : `combo` (avantage garanti en ms) et
    `pop` (petit envol) pour les vrais combos (léger bas -> saut -> léger en l'air). Ce fichier remappe les anciens coups.
  - `anim.js` : animation d'affichage + CAMÉRA qui suit et zoome (2e caméra fixe pour l'interface : profondeur >= 50). `pl.sprite` = corps physique INVISIBLE ; `pl.view` = l'image affichée, recopiée à
    chaque image avec écrasement/étirement, préparation et détente des coups, tremblement, vrille, balancement. Choisit
    aussi les postures dessinées en plus si elles existent : `<pose>Pre` (préparation), `fall`, `crouch`, course en 4
    temps (`run0, run2, run1, run3`). Ne touche jamais la simulation.
  - `extras.js` : vibration, indicateurs hors écran, réglages, entraînement, bouton quitter
  - `audio.js` : son 100 % synthétisé (aucun fichier). `SFX.play(nom)` = bruitages en couches + réverbération ;
    `MUSIC` = séquenceur avec 3 morceaux originaux (`menu`, `night`, `desert`, notes écrites dans `SONGS`), jingles
    victoire/défaite, tempo accéléré en mort subite. Réglages : BRUITAGES et MUSIQUE séparés.
  - `head.html` : en-tête HTML (le bloc `<!--ONLINE-->` est retiré pour la version hors ligne)
- `src/pngs.js` : persos redessinés en pixel art (planches PNG intégrées), générés par `tools/art/export.py`
  (`flat.py` = moteur à aplats, `toro_set.py`, `lulu_set.py`, `deno_set.py`, `adieu_set.py` = postures de Toro, Deadlulu,
  Denodoom et AdieuLescure) ; `extra_poses.py` ajoute à tous la course en 4 temps, la réception, la chute et les
  préparations des gros coups. Style : celui de la référence de Noah
  (aplats anguleux, 3 tons, contour noir, gros poings et pieds), ~62 px de haut, affichés à l'échelle 1,25.
  Les persos pas encore redessinés utilisent l'ancien dessin par code (`sprites48.js`, `chars48.js`).
- `server/` : `core.js` (logique des salles, partagée), `worker.js` (Cloudflare), `dev-server.js` (test local)
- `tools/build.py` : assemble `index.html` et `relay.js` — **toujours relancer après une modification**, puis committer
  les fichiers générés (Cloudflare ne lance pas de build).

## Règles à respecter

- La simulation doit rester **déterministe** (en ligne, les deux téléphones rejouent la même partie) :
  pas de `Math.random()` ni de temps réel dans la logique, seulement pour les effets visuels et les bots hors ligne.
  Tout état de jeu d'un joueur doit être un champ simple (nombre, booléen, texte) pour être sauvegardé par `snapshot()`.
- Défense façon Brawlhalla : pas de garde. Esquive au sol sur place (recharge 1 s), ESQUIVE + côté au sol = SPRINT
  (sans invincibilité, coupé par un saut ou une attaque), esquive aérienne une fois par saut, ESQUIVE DE POURSUITE juste
  après un coup qui touche (2 au sol, 1 en l'air).
- 3 sauts (sol + 2 en l'air). Coup de retour = LOURD en l'air, une fois par saut, SANS chute impuissante.
  Rebord automatique. Être touché rend un saut. On regarde du côté où l'on pousse le joystick.
- Le bloc du terrain (herbe + terre) est entièrement solide. Le rebord s'attrape aussi en montant sous le niveau du bord
  et en se cognant sous le terrain près du coin. Pour déplacer un perso d'un coup, toujours passer par `putAt()`
  (sinon le corps physique garde un décalage d'une image).
- Nini ne frappe jamais elle-même : Scarlett (le chat), le corgi, l'amour, la pivoine, le voyage (valise) et le vent
  (Autant en emporte le vent). Le corgi est sur BAS avec une recharge, pas sur un coup de base.
- Chrono de 3 min puis mort subite (premier coup gagne). 3 vies.
- Un nouveau perso doit aussi être ajouté à `CHARS` dans `server/core.js` (sinon le serveur refuse son choix en ligne).
- Effets visuels : jamais d'état visuel remis à zéro par une minuterie (`this.time`, `tweens`) — pendant un rejeu en
  ligne elles sont désactivées (le perso restait tout blanc, l'aigle restait figé). La teinte est décidée à chaque image
  dans `step` d'après `flashUntil` ; un objet à effacer pendant un rejeu est détruit tout de suite.
- Bouton X en haut pendant un combat : quitter (hors ligne) ou abandonner (en ligne, message `leave` au serveur).
- Tester avec Playwright (Chromium déjà installé) en pilotant `game.step()` image par image.
