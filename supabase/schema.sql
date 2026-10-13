-- ===========================================================================
-- BRAWL : base de données (à coller UNE fois dans Supabase > SQL Editor > Run)
-- ===========================================================================

-- Profils des joueurs (un par compte)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique check (username is null or username ~ '^[A-Za-z0-9_]{3,16}$'),
  rating int not null default 1000,
  wins int not null default 0,
  losses int not null default 0,
  created_at timestamptz not null default now()
);

-- Historique des combats classés (écrit uniquement par le serveur)
create table if not exists public.matches (
  id bigserial primary key,
  p0 uuid not null references public.profiles(id) on delete cascade,
  p1 uuid not null references public.profiles(id) on delete cascade,
  winner uuid not null,
  delta0 int not null,
  delta1 int not null,
  played_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.matches enable row level security;

-- Tout le monde peut lire le classement ; chacun ne peut modifier QUE son pseudo
drop policy if exists "profils lisibles" on public.profiles;
create policy "profils lisibles" on public.profiles for select using (true);
drop policy if exists "pseudo modifiable" on public.profiles;
create policy "pseudo modifiable" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
revoke update on public.profiles from anon, authenticated;
grant update (username) on public.profiles to authenticated;

drop policy if exists "historique lisible" on public.matches;
create policy "historique lisible" on public.matches for select using (auth.uid() in (p0, p1));

-- Création automatique du profil à l'inscription (les invités anonymes n'en ont pas)
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.is_anonymous, false) = false then
    insert into public.profiles (id) values (new.id) on conflict do nothing;
  end if;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Calcul Elo (K = 32) : appelable UNIQUEMENT par le serveur (clé service), jamais par un joueur
create or replace function public.record_match(p0 uuid, p1 uuid, w uuid) returns json language plpgsql security definer set search_path = public as $$
declare r0 int; r1 int; e0 float; s0 float; d int;
begin
  if w is distinct from p0 and w is distinct from p1 then raise exception 'winner invalid'; end if;
  select rating into r0 from profiles where id = p0 for update;
  select rating into r1 from profiles where id = p1 for update;
  if r0 is null or r1 is null then raise exception 'profile missing'; end if;
  e0 := 1.0 / (1.0 + power(10.0, (r1 - r0) / 400.0));
  s0 := case when w = p0 then 1.0 else 0.0 end;
  d := round(32 * (s0 - e0));
  update profiles set rating = rating + d, wins = wins + (case when w = p0 then 1 else 0 end), losses = losses + (case when w = p0 then 0 else 1 end) where id = p0;
  update profiles set rating = rating - d, wins = wins + (case when w = p1 then 1 else 0 end), losses = losses + (case when w = p1 then 0 else 1 end) where id = p1;
  insert into matches (p0, p1, winner, delta0, delta1) values (p0, p1, w, d, -d);
  return json_build_object('delta0', d, 'delta1', -d, 'rating0', r0 + d, 'rating1', r1 - d);
end $$;
revoke execute on function public.record_match(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.record_match(uuid, uuid, uuid) to service_role;
