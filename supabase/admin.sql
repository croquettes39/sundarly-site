-- Sundarly — panneau d'administration (page admin.html)
-- À coller une seule fois dans Supabase > SQL Editor > New query, puis "Run".
-- IMPORTANT : à la toute fin, remplacez VOTRE-EMAIL par l'e-mail du compte
-- que vous avez créé sur le site (www.sundarly.com/compte).

-- 1) Liste des administrateurs (personne ne peut la lire ni la modifier depuis le site)
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ajoute_le timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function public.est_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke execute on function public.est_admin() from public, anon;
grant execute on function public.est_admin() to authenticated;

-- 2) L'admin peut lire et gérer les inscriptions, profils et annonces
drop policy if exists "admin : lecture" on public.liste_attente;
create policy "admin : lecture" on public.liste_attente for select to authenticated using (public.est_admin());
drop policy if exists "admin : lecture" on public.hotes;
create policy "admin : lecture" on public.hotes for select to authenticated using (public.est_admin());
drop policy if exists "admin : modification" on public.hotes;
create policy "admin : modification" on public.hotes for update to authenticated using (public.est_admin()) with check (public.est_admin());
grant select on public.liste_attente to authenticated;
grant select, update on public.hotes to authenticated;

drop policy if exists "admin : lecture" on public.profils;
create policy "admin : lecture" on public.profils for select to authenticated using (public.est_admin());
drop policy if exists "admin : modification" on public.profils;
create policy "admin : modification" on public.profils for update to authenticated using (public.est_admin()) with check (public.est_admin());

drop policy if exists "admin : lecture" on public.annonces;
create policy "admin : lecture" on public.annonces for select to authenticated using (public.est_admin());
drop policy if exists "admin : modification" on public.annonces;
create policy "admin : modification" on public.annonces for update to authenticated using (public.est_admin()) with check (public.est_admin());

-- Les garde-fous des hôtes ne s'appliquent pas à l'admin
create or replace function public.proteger_verification() returns trigger
language plpgsql as $$
begin
  if coalesce(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role', '') = 'authenticated'
     and not public.est_admin() then
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

create or replace function public.proteger_annonce() returns trigger
language plpgsql as $$
begin
  if coalesce(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role', '') = 'authenticated'
     and not public.est_admin() then
    new.id := old.id;
    new.hote_id := old.hote_id;
    new.created_at := old.created_at;
    new.modifiee_le := now();
    if new.statut is distinct from old.statut then
      if not ((old.statut in ('validee', 'en_ligne') and new.statut = 'archivee')
           or (old.statut = 'archivee' and new.statut = 'en_attente')) then
        raise exception 'Changement de statut réservé à l''équipe Sundarly';
      end if;
    end if;
    if old.statut = 'refusee' then
      new.statut := 'en_attente';
    end if;
  end if;
  return new;
end $$;

alter function public.proteger_verification() set search_path = public;
alter function public.proteger_annonce() set search_path = public;

-- 3) Pièces d'identité : l'admin peut les consulter (liens temporaires)
drop policy if exists "piece identite : lecture admin" on storage.objects;
create policy "piece identite : lecture admin" on storage.objects
  for select to authenticated
  using (bucket_id = 'pieces-identite' and public.est_admin());

-- 4) Chiffres du tableau de bord
create or replace function public.admin_stats() returns json
language plpgsql stable security definer set search_path = public as $$
declare r json;
begin
  if not public.est_admin() then raise exception 'Accès réservé'; end if;
  select json_build_object(
    'voyageurs',            (select count(*) from public.liste_attente),
    'anciens_proprietaires',(select count(*) from public.hotes),
    'comptes',              (select count(*) from auth.users),
    'comptes_confirmes',    (select count(*) from auth.users where email_confirmed_at is not null),
    'identites_a_verifier', (select count(*) from public.profils where statut_verification = 'en_cours'),
    'hotes_verifies',       (select count(*) from public.profils where statut_verification = 'verifie'),
    'annonces',             (select count(*) from public.annonces),
    'annonces_a_valider',   (select count(*) from public.annonces where statut = 'en_attente'),
    'annonces_en_ligne',    (select count(*) from public.annonces where statut in ('validee', 'en_ligne')),
    'par_jour', (
      select json_agg(json_build_object('jour', j::date, 'comptes', c, 'voyageurs', v) order by j)
      from (
        select j,
          (select count(*) from auth.users u where u.created_at::date = j::date) as c,
          (select count(*) from public.liste_attente l where l.created_at::date = j::date) as v
        from generate_series(current_date - 29, current_date, interval '1 day') j
      ) t
    )
  ) into r;
  return r;
end $$;
revoke execute on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;

-- 5) Liste des comptes hôtes avec leur e-mail
create or replace function public.admin_comptes()
returns table (id uuid, email text, inscrit_le timestamptz, email_confirme boolean,
               prenom text, nom text, telephone text, pays text,
               type_piece text, statut_verification text, piece_envoyee_le timestamptz, nb_annonces bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.est_admin() then raise exception 'Accès réservé'; end if;
  return query
    select u.id, u.email::text, u.created_at, (u.email_confirmed_at is not null),
           p.prenom, p.nom, p.telephone, p.pays, p.type_piece, p.statut_verification, p.piece_envoyee_le,
           (select count(*) from public.annonces a where a.hote_id = u.id)
    from auth.users u left join public.profils p on p.id = u.id
    order by u.created_at desc;
end $$;
revoke execute on function public.admin_comptes() from public, anon;
grant execute on function public.admin_comptes() to authenticated;

-- 6) VOUS : remplacez VOTRE-EMAIL par l'e-mail de votre compte sur le site
insert into public.admins (user_id)
select id from auth.users where lower(email) = lower('VOTRE-EMAIL')
on conflict do nothing;

-- Vérification : doit afficher votre e-mail
select u.email as administrateur from public.admins a join auth.users u on u.id = a.user_id;
