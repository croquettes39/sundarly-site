-- Sundarly — annonces de logements, photos et coordonnées bancaires
-- À coller une seule fois dans Supabase > SQL Editor > New query, puis "Run".
-- (Le premier fichier schema.sql doit déjà avoir été exécuté.)

-- 1) Les annonces publiées par les propriétaires
create table if not exists public.annonces (
  id              uuid primary key,
  created_at      timestamptz not null default now(),
  statut          text not null default 'en_attente'
                  check (statut in ('en_attente', 'validee', 'refusee', 'en_ligne', 'archivee')),
  type_logement   text not null check (char_length(type_logement) <= 40),
  type_espace     text not null check (type_espace in ('logement_entier', 'chambre_privee', 'chambre_partagee')),
  pays            text not null check (char_length(pays) <= 60),
  ville           text not null check (char_length(ville) between 1 and 120),
  adresse         text not null check (char_length(adresse) between 3 and 250),
  latitude        double precision not null check (latitude between -90 and 90),
  longitude       double precision not null check (longitude between -180 and 180),
  voyageurs       integer not null check (voyageurs between 1 and 50),
  chambres        integer not null check (chambres between 0 and 50),
  lits            integer not null check (lits between 1 and 100),
  salles_de_bain  integer not null check (salles_de_bain between 0 and 50),
  equipements     text[] not null default '{}' check (coalesce(array_length(equipements, 1), 0) <= 60),
  photos          text[] not null check (array_length(photos, 1) between 5 and 20),
  titre           text not null check (char_length(titre) between 10 and 80 and titre !~* '(https?://|www\.|@)'),
  description     text not null check (char_length(description) between 50 and 3000 and description !~* '(https?://|www\.|@)'),
  devise          text not null default 'EUR' check (devise in ('EUR', 'MAD', 'CHF')),
  prix_nuit       numeric(10,2) not null check (prix_nuit > 0 and prix_nuit <= 100000),
  frais_menage    numeric(10,2) check (frais_menage >= 0 and frais_menage <= 100000),
  annulation      text not null check (annulation in ('souple', 'moderee', 'stricte')),
  caution         numeric(10,2) check (caution >= 0 and caution <= 100000),
  heure_arrivee   text check (heure_arrivee ~ '^[0-2][0-9]:[0-5][0-9]$'),
  heure_depart    text check (heure_depart ~ '^[0-2][0-9]:[0-5][0-9]$'),
  animaux         boolean not null default false,
  fumeurs         boolean not null default false,
  fetes           boolean not null default false,
  nom             text not null check (char_length(nom) between 1 and 120),
  email           text not null check (char_length(email) <= 200 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  telephone       text check (char_length(telephone) <= 40),
  consentement    boolean not null check (consentement = true)
);

-- 2) Coordonnées bancaires pour les versements (table séparée, plus protégée)
create table if not exists public.coordonnees_bancaires (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  annonce_id   uuid not null references public.annonces(id) on delete cascade,
  titulaire    text not null check (char_length(titulaire) between 2 and 120),
  pays_banque  text not null check (char_length(pays_banque) <= 60),
  numero       text not null check (numero ~ '^[A-Z0-9]{10,34}$'),
  bic          text check (bic ~ '^[A-Z0-9]{8}([A-Z0-9]{3})?$'),
  nom_banque   text check (char_length(nom_banque) <= 120)
);

-- 3) Sécurité : le public peut seulement AJOUTER. Personne ne peut lire,
--    modifier ou supprimer depuis le site : vous seule, dans Supabase.
alter table public.annonces              enable row level security;
alter table public.coordonnees_bancaires enable row level security;

drop policy if exists "depot public" on public.annonces;
create policy "depot public" on public.annonces
  for insert to anon with check (statut = 'en_attente');

drop policy if exists "depot public" on public.coordonnees_bancaires;
create policy "depot public" on public.coordonnees_bancaires
  for insert to anon with check (true);

grant insert on public.annonces              to anon;
grant insert on public.coordonnees_bancaires to anon;

-- 4) Stockage des photos (dossier public "photos-annonces", 10 Mo max, images seulement)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos-annonces', 'photos-annonces', true, 10485760,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "envoi photos annonces" on storage.objects;
create policy "envoi photos annonces" on storage.objects
  for insert to anon with check (bucket_id = 'photos-annonces');
