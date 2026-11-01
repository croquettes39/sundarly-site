-- Sundarly — tables du site de lancement
-- À coller une seule fois dans Supabase > SQL Editor > New query, puis "Run".

-- 1) Liste d'attente des voyageurs
create table if not exists public.liste_attente (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  email       text not null
              check (char_length(email) <= 200 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  destination text check (char_length(destination) <= 120)
);
create unique index if not exists liste_attente_email_unique
  on public.liste_attente (lower(email));

-- 2) Inscriptions des propriétaires
create table if not exists public.hotes (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  nom           text not null check (char_length(nom) between 1 and 120),
  email         text not null
                check (char_length(email) <= 200 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  telephone     text check (char_length(telephone) <= 40),
  pays          text not null check (char_length(pays) <= 60),
  ville         text not null check (char_length(ville) <= 120),
  type_logement text not null check (char_length(type_logement) <= 60),
  nb_logements  integer not null default 1 check (nb_logements between 1 and 500),
  lien_annonce  text check (char_length(lien_annonce) <= 500),
  message       text check (char_length(message) <= 2000),
  consentement  boolean not null check (consentement = true),
  statut        text not null default 'nouveau'  -- à mettre à jour vous-même : nouveau, contacté, annonce prête…
);
create unique index if not exists hotes_email_unique
  on public.hotes (lower(email));

-- 3) Sécurité : le public peut AJOUTER une inscription, mais jamais LIRE,
--    modifier ou supprimer. Vous consultez les inscriptions dans Supabase
--    (Table Editor), connectée à votre compte.
alter table public.liste_attente enable row level security;
alter table public.hotes        enable row level security;

drop policy if exists "inscription publique" on public.liste_attente;
create policy "inscription publique" on public.liste_attente
  for insert to anon with check (true);

drop policy if exists "inscription publique" on public.hotes;
create policy "inscription publique" on public.hotes
  for insert to anon with check (statut = 'nouveau');

grant insert on public.liste_attente to anon;
grant insert on public.hotes        to anon;
