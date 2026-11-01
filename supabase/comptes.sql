-- Sundarly — comptes hôtes, vérification d'identité, annonces rattachées au compte
-- À coller une seule fois dans Supabase > SQL Editor > New query, puis "Run".
-- (schema.sql et annonces.sql doivent déjà avoir été exécutés.)

-- 1) Profil de chaque hôte (lié à son compte de connexion)
create table if not exists public.profils (
  id                    uuid primary key references auth.users(id) on delete cascade,
  created_at            timestamptz not null default now(),
  prenom                text not null check (char_length(prenom) between 1 and 80),
  nom                   text not null check (char_length(nom) between 1 and 80),
  telephone             text not null check (char_length(telephone) between 6 and 40),
  pays                  text check (char_length(pays) <= 60),
  date_naissance        date check (date_naissance <= current_date - interval '18 years'),
  type_piece            text check (type_piece in ('cni', 'passeport', 'titre_sejour', 'permis')),
  statut_verification   text not null default 'non_verifie'
                        check (statut_verification in ('non_verifie', 'en_cours', 'verifie', 'refuse')),
  piece_envoyee_le      timestamptz
);

alter table public.profils enable row level security;

-- Chaque hôte voit et modifie uniquement SON profil
drop policy if exists "profil : lecture" on public.profils;
create policy "profil : lecture" on public.profils
  for select to authenticated using (id = auth.uid());

drop policy if exists "profil : creation" on public.profils;
create policy "profil : creation" on public.profils
  for insert to authenticated
  with check (id = auth.uid() and statut_verification = 'non_verifie');

drop policy if exists "profil : modification" on public.profils;
create policy "profil : modification" on public.profils
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

grant select, insert, update on public.profils to authenticated;

-- L'hôte ne peut jamais se déclarer lui-même « vérifié » : seule l'équipe Sundarly le fait
create or replace function public.proteger_verification() returns trigger
language plpgsql as $$
begin
  if coalesce(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role', '') = 'authenticated' then
    if new.statut_verification in ('verifie', 'refuse')
       and new.statut_verification is distinct from old.statut_verification then
      raise exception 'Statut de vérification réservé à l''équipe Sundarly';
    end if;
    if old.statut_verification = 'verifie' then
      new.statut_verification := 'verifie';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists proteger_verification on public.profils;
create trigger proteger_verification before update on public.profils
  for each row execute function public.proteger_verification();

-- 2) Les annonces appartiennent désormais à un compte hôte
alter table public.annonces add column if not exists code_postal text check (char_length(code_postal) <= 12);
alter table public.annonces add column if not exists hote_id uuid references auth.users(id) on delete set null;
alter table public.coordonnees_bancaires add column if not exists hote_id uuid references auth.users(id) on delete set null;

drop policy if exists "depot public" on public.annonces;
drop policy if exists "annonce : depot" on public.annonces;
create policy "annonce : depot" on public.annonces
  for insert to authenticated
  with check (hote_id = auth.uid() and statut = 'en_attente');

drop policy if exists "annonce : lecture hote" on public.annonces;
create policy "annonce : lecture hote" on public.annonces
  for select to authenticated using (hote_id = auth.uid());

drop policy if exists "depot public" on public.coordonnees_bancaires;
drop policy if exists "banque : depot" on public.coordonnees_bancaires;
create policy "banque : depot" on public.coordonnees_bancaires
  for insert to authenticated
  with check (hote_id = auth.uid()
              and exists (select 1 from public.annonces a where a.id = annonce_id and a.hote_id = auth.uid()));

revoke insert on public.annonces from anon;
revoke insert on public.coordonnees_bancaires from anon;
grant select, insert on public.annonces to authenticated;
grant insert on public.coordonnees_bancaires to authenticated;
-- (personne ne peut relire les coordonnées bancaires depuis le site, pas même l'hôte)

-- 3) Photos des annonces : seulement les hôtes connectés, dans leur propre dossier
drop policy if exists "envoi photos annonces" on storage.objects;
create policy "envoi photos annonces" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos-annonces' and (storage.foldername(name))[1] = auth.uid()::text);

-- 4) Pièces d'identité : dossier PRIVÉ, 10 Mo max, images ou PDF
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pieces-identite', 'pieces-identite', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

drop policy if exists "piece identite : envoi" on storage.objects;
create policy "piece identite : envoi" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'pieces-identite' and (storage.foldername(name))[1] = auth.uid()::text);
-- Aucune règle de lecture : seuls vous (tableau de bord Supabase) pouvez voir les pièces.
