-- Sundarly — modification des annonces par l'hôte (outil type Airbnb) + guide d'arrivée
-- À coller une seule fois dans Supabase > SQL Editor > New query, puis "Run".
-- (schema.sql, annonces.sql et comptes.sql doivent déjà avoir été exécutés.)

-- 1) Nouvelles rubriques de l'annonce (visibles par les voyageurs une fois en ligne)
--    Interdit : liens, e-mails, numéros de téléphone.
alter table public.annonces
  add column if not exists mon_logement       text check (char_length(mon_logement) <= 2000 and mon_logement !~* '(https?://|www\.|@|[0-9]([ .-]?[0-9]){7,})'),
  add column if not exists acces_voyageurs    text check (char_length(acces_voyageurs) <= 1500 and acces_voyageurs !~* '(https?://|www\.|@|[0-9]([ .-]?[0-9]){7,})'),
  add column if not exists echanges_voyageurs text check (char_length(echanges_voyageurs) <= 1500 and echanges_voyageurs !~* '(https?://|www\.|@|[0-9]([ .-]?[0-9]){7,})'),
  add column if not exists autres_infos       text check (char_length(autres_infos) <= 1500 and autres_infos !~* '(https?://|www\.|@|[0-9]([ .-]?[0-9]){7,})'),
  add column if not exists reglement          text check (char_length(reglement) <= 1500 and reglement !~* '(https?://|www\.|@|[0-9]([ .-]?[0-9]){7,})'),
  add column if not exists accessibilite      text[] not null default '{}' check (coalesce(array_length(accessibilite, 1), 0) <= 30),
  add column if not exists securite           text[] not null default '{}' check (coalesce(array_length(securite, 1), 0) <= 20),
  add column if not exists nuits_min          integer not null default 1 check (nuits_min between 1 and 365),
  add column if not exists nuits_max          integer check (nuits_max between 1 and 365),
  add column if not exists reduction_semaine  integer not null default 0 check (reduction_semaine between 0 and 90),
  add column if not exists reduction_mois     integer not null default 0 check (reduction_mois between 0 and 90),
  add column if not exists modifiee_le        timestamptz;

-- 2) L'hôte peut modifier SES annonces
drop policy if exists "annonce : modification hote" on public.annonces;
create policy "annonce : modification hote" on public.annonces
  for update to authenticated
  using (hote_id = auth.uid())
  with check (hote_id = auth.uid());
grant update on public.annonces to authenticated;

-- Garde-fous : l'hôte ne peut pas se mettre lui-même « en ligne » ni changer de propriétaire
create or replace function public.proteger_annonce() returns trigger
language plpgsql as $$
begin
  if coalesce(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role', '') = 'authenticated' then
    new.id := old.id;
    new.hote_id := old.hote_id;
    new.created_at := old.created_at;
    new.modifiee_le := now();
    if new.statut is distinct from old.statut then
      -- autorisé : masquer une annonce validée / en ligne, ou demander sa remise en ligne
      if not ((old.statut in ('validee', 'en_ligne') and new.statut = 'archivee')
           or (old.statut = 'archivee' and new.statut = 'en_attente')) then
        raise exception 'Changement de statut réservé à l''équipe Sundarly';
      end if;
    end if;
    -- une annonce refusée que l'hôte corrige repart en vérification
    if old.statut = 'refusee' then
      new.statut := 'en_attente';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists proteger_annonce on public.annonces;
create trigger proteger_annonce before update on public.annonces
  for each row execute function public.proteger_annonce();

-- 3) Photos : l'hôte peut supprimer les photos de SON dossier
--    (Supabase exige aussi le droit de « voir » le fichier pour le supprimer)
drop policy if exists "lecture photos annonces hote" on storage.objects;
create policy "lecture photos annonces hote" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos-annonces' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "suppression photos annonces" on storage.objects;
create policy "suppression photos annonces" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos-annonces' and (storage.foldername(name))[1] = auth.uid()::text);

-- 4) Guide d'arrivée : PRIVÉ (code wifi, instructions…). Table séparée :
--    seul l'hôte le voit ; plus tard il sera envoyé au voyageur après une réservation payée.
create table if not exists public.guides_arrivee (
  annonce_id            uuid primary key references public.annonces(id) on delete cascade,
  hote_id               uuid not null references auth.users(id) on delete cascade,
  modifie_le            timestamptz not null default now(),
  mode_arrivee          text check (mode_arrivee in ('accueil', 'boite_cles', 'serrure_code', 'gardien', 'autre')),
  instructions_arrivee  text check (char_length(instructions_arrivee) <= 3000),
  wifi_nom              text check (char_length(wifi_nom) <= 100),
  wifi_mdp              text check (char_length(wifi_mdp) <= 100),
  itineraire            text check (char_length(itineraire) <= 3000),
  manuel_maison         text check (char_length(manuel_maison) <= 3000),
  instructions_depart   text check (char_length(instructions_depart) <= 2000)
);

alter table public.guides_arrivee enable row level security;

drop policy if exists "guide : lecture" on public.guides_arrivee;
create policy "guide : lecture" on public.guides_arrivee
  for select to authenticated using (hote_id = auth.uid());

drop policy if exists "guide : creation" on public.guides_arrivee;
create policy "guide : creation" on public.guides_arrivee
  for insert to authenticated
  with check (hote_id = auth.uid()
              and exists (select 1 from public.annonces a where a.id = annonce_id and a.hote_id = auth.uid()));

drop policy if exists "guide : modification" on public.guides_arrivee;
create policy "guide : modification" on public.guides_arrivee
  for update to authenticated
  using (hote_id = auth.uid())
  with check (hote_id = auth.uid()
              and exists (select 1 from public.annonces a where a.id = annonce_id and a.hote_id = auth.uid()));

grant select, insert, update on public.guides_arrivee to authenticated;
