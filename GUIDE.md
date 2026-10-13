# Mettre Brawl en ligne — 100 % gratuit, depuis le téléphone

Tu crées 3 comptes gratuits (GitHub, Supabase, Cloudflare). Tu n'écris aucun code.

## 1. GitHub (stocker le jeu)
1. github.com → crée un compte → **New repository** → nom `brawl`, **Private**.
2. **Add file → Upload files** : envoie TOUT le contenu de ce dossier (index.html, config.js, manifest, icônes, dossiers `worker` et `supabase`). Sur téléphone : dézippe d'abord, ou utilise le site en « version ordinateur ».
3. **Commit changes**.

## 2. Supabase (comptes + classement)
1. supabase.com → New project (région Europe), choisis un mot de passe, attends 2 min.
2. **SQL Editor → New query** → colle tout le fichier `supabase/schema.sql` → **Run**.
3. **Authentication → Sign In / Providers** : Email = activé. Active aussi **Allow anonymous sign-ins** (mode invité).
   (Pour tester vite : Authentication → Providers → Email → désactive « Confirm email ».)
4. **Project Settings → API** : note **Project URL** et la clé **anon public** (publique, tu peux me l'envoyer).
   ⚠️ La clé **service_role** est SECRÈTE : ne me l'envoie jamais, elle va seulement dans Cloudflare (étape 3).

## 3. Cloudflare — le serveur temps réel (Worker)
1. cloudflare.com → compte gratuit → **Workers & Pages → Create → Import a repository** (Workers) → choisis `brawl`.
2. **Root directory : `worker`**, laisse le reste par défaut → Deploy. Nom : `brawl-relay`.
3. Une fois créé : **Settings → Variables and Secrets → Add** (type *Secret*), trois fois :
   - `SUPABASE_URL` = Project URL
   - `SUPABASE_ANON_KEY` = clé anon
   - `SUPABASE_SERVICE_KEY` = clé service_role
4. Note l'adresse du Worker : `https://brawl-relay.TON-COMPTE.workers.dev` (le jeu l'utilisera en `wss://…`).

## 4. Cloudflare Pages — le jeu
1. **Workers & Pages → Create → Pages → Connect to Git** → `brawl`.
2. Build command : *(vide)* — Output directory : `/` → Deploy.
3. Tu obtiens `https://brawl.pages.dev` : c'est ton jeu. Sur téléphone : menu du navigateur → **Ajouter à l'écran d'accueil**.

## 5. Me donner les 3 infos
Envoie-moi : Project URL Supabase, clé **anon**, adresse du Worker. Je remplis `config.js` et je te renvoie le fichier à remplacer sur GitHub (ou tu le modifies toi-même : 3 lignes).

## Jouer avec un ami
EN LIGNE → CREER UNE SALLE → COPIER LE LIEN → l'envoyer. Ton ami ouvre le lien, choisit son perso, tout le monde touche PRET. Téléphone en **paysage**.

## Limites gratuites (à connaître)
- Cloudflare : environ 270 combats/jour sur l'offre gratuite avec le réseau actuel (envoi 30 fois/s).
- Supabase gratuit : un projet inactif 7 jours est mis en pause (un clic pour le réveiller).
- Équilibrage des persos non testé sur de vrais téléphones ; en ligne = paysage uniquement.
