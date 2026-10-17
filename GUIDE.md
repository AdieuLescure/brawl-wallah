# Brawl Proto — guide rapide

Le jeu est en ligne sur **https://brawl-wallah.noahmurador.workers.dev**. Sur téléphone : menu du navigateur →
« Ajouter à l'écran d'accueil ».

## Comment ça marche

- Ce dépôt GitHub contient tout : le jeu, le serveur des combats en ligne et les outils.
- À chaque modification envoyée sur GitHub, Cloudflare remet le site à jour tout seul (1 à 2 minutes).
- Les comptes et le classement sont stockés chez Supabase.

## Si quelque chose ne marche plus

1. Ouvre **https://brawl-wallah.noahmurador.workers.dev/api/health**.
   - Les 3 lignes de `secrets` doivent être à `true`. Sinon : Cloudflare → Workers & Pages → `brawl-wallah` →
     Settings → Variables and Secrets → ajouter `SUPABASE_SERVICE_KEY` (type **Secret**, clé `service_role` de Supabase).
   - `table_profiles` doit afficher `200 ok`. Sinon : le projet Supabase est peut-être en pause (Supabase met en pause
     un projet gratuit inactif 7 jours) → ouvre Supabase et clique sur « Restore ».
2. Dans Cloudflare, onglet **Deployments** du Worker : le dernier déploiement doit être « Success ».

## Ne jamais partager

La clé `service_role` de Supabase : elle va uniquement dans les secrets Cloudflare.
