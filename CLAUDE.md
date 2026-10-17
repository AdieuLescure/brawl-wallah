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
  - `extras.js` : sons synthétisés, vibration, indicateurs hors écran, réglages, entraînement
  - `head.html` : en-tête HTML (le bloc `<!--ONLINE-->` est retiré pour la version hors ligne)
- `src/pngs.js` : persos redessinés en pixel art (planches PNG intégrées), générés par `tools/art/export.py`
  (`flat.py` = moteur à aplats, `toro_set.py` = postures de Toro). Style : celui de la référence de Noah
  (aplats anguleux, 3 tons, contour noir, gros poings et pieds), ~62 px de haut, affichés à l'échelle 1,25.
  Les persos pas encore redessinés utilisent l'ancien dessin par code (`sprites48.js`, `chars48.js`).
- `server/` : `core.js` (logique des salles, partagée), `worker.js` (Cloudflare), `dev-server.js` (test local)
- `tools/build.py` : assemble `index.html` et `relay.js` — **toujours relancer après une modification**, puis committer
  les fichiers générés (Cloudflare ne lance pas de build).

## Règles à respecter

- La simulation doit rester **déterministe** (en ligne, les deux téléphones rejouent la même partie) :
  pas de `Math.random()` ni de temps réel dans la logique, seulement pour les effets visuels et les bots hors ligne.
  Tout état de jeu d'un joueur doit être un champ simple (nombre, booléen, texte) pour être sauvegardé par `snapshot()`.
- Défense façon Brawlhalla : pas de garde, esquives (sur place, roulade, aérienne une fois par saut, recharge 1 s au sol).
- Coup de retour = HAUT en l'air, une fois, puis chute impuissante. Rebord automatique. Être touché rend un saut.
- Le bloc du terrain (herbe + terre) est entièrement solide. Le rebord s'attrape aussi en montant sous le niveau du bord
  et en se cognant sous le terrain près du coin. Pour déplacer un perso d'un coup, toujours passer par `putAt()`
  (sinon le corps physique garde un décalage d'une image).
- Nini ne frappe jamais elle-même : Scarlett (le chat), le corgi, l'amour, la pivoine, le voyage (valise) et le vent
  (Autant en emporte le vent). Le corgi est sur BAS avec une recharge, pas sur un coup de base.
- Chrono de 3 min puis mort subite (premier coup gagne). 3 vies.
- Tester avec Playwright (Chromium déjà installé) en pilotant `game.step()` image par image.
