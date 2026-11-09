-- Sundarly — adresses lisibles des logements (9 nov. 2026)
-- /logement/villa-luxe-piscine-9-suites-marrakech au lieu de /logement?id=<uuid>
-- Les anciens liens ?id= continuent de fonctionner.

alter table public.annonces add column if not exists slug text;

create or replace function public.slugifier(t text) returns text
language sql immutable set search_path to 'public' as $$
  select trim(both '-' from regexp_replace(
    translate(lower(coalesce(t, '')),
      'àáâãäåāçćčèéêëēėęìíîïīñńòóôõöøōœùúûüūýÿžśšłğı',
      'aaaaaaaccceeeeeeeiiiiinnoooooooouuuuuyyzsslgi'),
    '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.slug_unique(p_titre text, p_ville text, p_id uuid) returns text
language plpgsql set search_path to 'public' as $$
declare base text; v text; s text; n int := 1;
begin
  base := public.slugifier(p_titre);
  v := public.slugifier(split_part(split_part(coalesce(p_ville, ''), '–', 1), ',', 1));
  if v <> '' and position(v in base) = 0 then base := base || '-' || v; end if;
  if length(base) > 80 then base := regexp_replace(left(base, 80), '-[^-]*$', ''); end if;
  if base = '' then base := 'logement'; end if;
  s := base;
  while exists (select 1 from public.annonces where slug = s and id <> p_id) loop
    n := n + 1; s := base || '-' || n;
  end loop;
  return s;
end $$;

create or replace function public.annonce_slug_auto() returns trigger
language plpgsql set search_path to 'public' as $$
begin
  -- un hôte ne peut pas choisir ni changer l'adresse lui-même (l'adresse reste stable pour Google)
  if tg_op = 'UPDATE' and old.slug is not null
     and coalesce(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role', '') = 'authenticated'
     and not public.est_admin() then
    new.slug := old.slug;
  end if;
  if tg_op = 'INSERT' and coalesce(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role', '') = 'authenticated'
     and not public.est_admin() then
    new.slug := null;
  end if;
  if new.slug is null or new.slug = '' then
    new.slug := public.slug_unique(new.titre, new.ville, new.id);
  end if;
  return new;
end $$;

drop trigger if exists annonce_slug_auto on public.annonces;
create trigger annonce_slug_auto before insert or update on public.annonces
  for each row execute function public.annonce_slug_auto();

-- remplissage des annonces existantes (dans l'ordre de création)
do $$ declare r record; begin
  for r in select id, titre, ville from public.annonces where slug is null order by created_at loop
    update public.annonces set slug = public.slug_unique(r.titre, r.ville, r.id) where id = r.id;
  end loop;
end $$;

create unique index if not exists annonces_slug_unique on public.annonces (slug);

-- retrouver un logement par son adresse lisible (mêmes règles de visibilité que la fiche)
create or replace function public.annonce_par_slug(p_slug text) returns uuid
language sql stable security definer set search_path to 'public' as $$
  select a.id from public.annonces a
  where a.slug = lower(p_slug)
    and (public.site_ouvert() or public.est_admin())
    and case when public.est_admin() then a.statut in ('en_attente', 'validee', 'en_ligne') else a.statut = 'en_ligne' end
  limit 1;
$$;
grant execute on function public.annonce_par_slug(text) to anon, authenticated;

-- catalogue : ajout de la colonne slug
drop function if exists public.catalogue();
create function public.catalogue()
 returns table(id uuid, statut text, titre text, type_logement text, type_espace text, ville text, pays text, latitude double precision, longitude double precision, voyageurs integer, chambres integer, lits integer, salles_de_bain integer, photos text[], devise text, prix_nuit numeric, frais_menage numeric, equipements text[], created_at timestamp with time zone, hote_prenom text, hote_verifie boolean, promo_nouvelle_active boolean, reduction_semaine integer, reduction_mois integer, reduction_anticipee integer, reduction_derniere_minute integer, note_moyenne numeric, nb_avis integer, slug text)
 language plpgsql stable security definer set search_path to 'public'
as $function$
declare admin boolean := public.est_admin();
begin
  if not admin and not public.site_ouvert() then return; end if;
  return query
    select a.id, a.statut, a.titre, a.type_logement, a.type_espace, a.ville, a.pays,
           round(a.latitude::numeric, 2)::double precision, round(a.longitude::numeric, 2)::double precision,
           a.voyageurs, a.chambres, a.lits, a.salles_de_bain,
           a.photos, a.devise, a.prix_nuit, a.frais_menage, a.equipements,
           a.created_at, initcap(p.prenom), coalesce(p.statut_verification = 'verifie', false),
           public.promo_nouvelle_active(a.id), a.reduction_semaine, a.reduction_mois,
           a.reduction_anticipee, a.reduction_derniere_minute,
           (select round(avg(av.note)::numeric, 2) from avis av where av.annonce_id = a.id and av.role_auteur = 'voyageur' and public.avis_visible(av)),
           (select count(*)::int from avis av where av.annonce_id = a.id and av.role_auteur = 'voyageur' and public.avis_visible(av)),
           a.slug
    from public.annonces a left join public.profils p on p.id = a.hote_id
    where case when admin then a.statut in ('en_attente', 'validee', 'en_ligne')
               else a.statut = 'en_ligne' end
    order by a.created_at desc;
end $function$;
grant execute on function public.catalogue() to anon, authenticated;

-- fiche : ajout du slug
create or replace function public.fiche_logement(annonce uuid)
 returns json language plpgsql stable security definer set search_path to 'public'
as $function$
declare admin boolean := public.est_admin(); r json;
begin
  if not admin and not public.site_ouvert() then return null; end if;
  select json_build_object(
    'id', a.id, 'slug', a.slug, 'statut', a.statut, 'titre', a.titre, 'type_logement', a.type_logement, 'type_espace', a.type_espace,
    'ville', a.ville, 'pays', a.pays,
    'latitude', round(a.latitude::numeric, 2), 'longitude', round(a.longitude::numeric, 2),
    'voyageurs', a.voyageurs, 'chambres', a.chambres, 'lits', a.lits, 'salles_de_bain', a.salles_de_bain,
    'photos', a.photos, 'description', a.description, 'mon_logement', a.mon_logement,
    'acces_voyageurs', a.acces_voyageurs, 'echanges_voyageurs', a.echanges_voyageurs, 'autres_infos', a.autres_infos,
    'equipements', a.equipements, 'accessibilite', a.accessibilite, 'securite', a.securite,
    'devise', a.devise, 'prix_nuit', a.prix_nuit, 'frais_menage', a.frais_menage, 'caution', a.caution,
    'frais_animaux', a.frais_animaux,
    'reduction_semaine', a.reduction_semaine, 'reduction_mois', a.reduction_mois,
    'promo_nouvelle_active', public.promo_nouvelle_active(a.id),
    'reduction_anticipee', a.reduction_anticipee, 'anticipee_jours', a.anticipee_jours,
    'reduction_derniere_minute', a.reduction_derniere_minute, 'derniere_minute_jours', a.derniere_minute_jours,
    'nuits_min', a.nuits_min, 'nuits_max', a.nuits_max,
    'annulation', a.annulation, 'heure_arrivee', a.heure_arrivee, 'heure_depart', a.heure_depart,
    'animaux', a.animaux, 'fumeurs', a.fumeurs, 'fetes', a.fetes, 'reglement', a.reglement,
    'hote_prenom', initcap(p.prenom), 'hote_verifie', coalesce(p.statut_verification = 'verifie', false),
    'hote_depuis', p.created_at
  ) into r
  from public.annonces a left join public.profils p on p.id = a.hote_id
  where a.id = annonce
    and case when admin then a.statut in ('en_attente', 'validee', 'en_ligne') else a.statut = 'en_ligne' end;
  return r;
end $function$;
