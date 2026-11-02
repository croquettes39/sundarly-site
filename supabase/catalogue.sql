-- Sundarly — côté voyageurs : catalogue des logements et fiche d'un logement
-- Tant que le site n'est pas ouvert, SEULS les administrateurs voient les annonces (aperçu).
-- Le jour de l'ouverture, l'admin clique « Ouvrir le site » dans le panneau d'administration.
-- Jamais exposés aux voyageurs : adresse, code postal, nom, e-mail, téléphone, position exacte.

-- 1) Réglage « site ouvert » (non par défaut)
create table if not exists public.reglages (
  cle    text primary key,
  valeur text not null
);
alter table public.reglages enable row level security;
insert into public.reglages (cle, valeur) values ('site_ouvert', 'non') on conflict (cle) do nothing;

create or replace function public.site_ouvert() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select valeur = 'oui' from public.reglages where cle = 'site_ouvert'), false);
$$;
grant execute on function public.site_ouvert() to anon, authenticated;

create or replace function public.admin_ouvrir_site(ouvrir boolean) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.est_admin() then raise exception 'Accès réservé'; end if;
  update public.reglages set valeur = case when ouvrir then 'oui' else 'non' end where cle = 'site_ouvert';
  return ouvrir;
end $$;
revoke execute on function public.admin_ouvrir_site(boolean) from public, anon;
grant execute on function public.admin_ouvrir_site(boolean) to authenticated;

-- 2) Catalogue (liste des logements) — position arrondie (~1 km)
create or replace function public.catalogue()
returns table (
  id uuid, statut text, titre text, type_logement text, type_espace text, ville text, pays text,
  latitude double precision, longitude double precision,
  voyageurs integer, chambres integer, lits integer, salles_de_bain integer,
  photos text[], devise text, prix_nuit numeric, frais_menage numeric, equipements text[],
  created_at timestamptz, hote_prenom text, hote_verifie boolean
)
language plpgsql stable security definer set search_path = public as $$
declare admin boolean := public.est_admin();
begin
  if not admin and not public.site_ouvert() then return; end if;
  return query
    select a.id, a.statut, a.titre, a.type_logement, a.type_espace, a.ville, a.pays,
           round(a.latitude::numeric, 2)::double precision, round(a.longitude::numeric, 2)::double precision,
           a.voyageurs, a.chambres, a.lits, a.salles_de_bain,
           a.photos, a.devise, a.prix_nuit, a.frais_menage, a.equipements,
           a.created_at, initcap(p.prenom), coalesce(p.statut_verification = 'verifie', false)
    from public.annonces a left join public.profils p on p.id = a.hote_id
    where case when admin then a.statut in ('en_attente', 'validee', 'en_ligne')
               else a.statut = 'en_ligne' end
    order by a.created_at desc;
end $$;
grant execute on function public.catalogue() to anon, authenticated;

-- 3) Fiche d'un logement (tout ce que le voyageur peut voir, rien de privé)
create or replace function public.fiche_logement(annonce uuid) returns json
language plpgsql stable security definer set search_path = public as $$
declare admin boolean := public.est_admin(); r json;
begin
  if not admin and not public.site_ouvert() then return null; end if;
  select json_build_object(
    'id', a.id, 'statut', a.statut, 'titre', a.titre, 'type_logement', a.type_logement, 'type_espace', a.type_espace,
    'ville', a.ville, 'pays', a.pays,
    'latitude', round(a.latitude::numeric, 2), 'longitude', round(a.longitude::numeric, 2),
    'voyageurs', a.voyageurs, 'chambres', a.chambres, 'lits', a.lits, 'salles_de_bain', a.salles_de_bain,
    'photos', a.photos, 'description', a.description, 'mon_logement', a.mon_logement,
    'acces_voyageurs', a.acces_voyageurs, 'echanges_voyageurs', a.echanges_voyageurs, 'autres_infos', a.autres_infos,
    'equipements', a.equipements, 'accessibilite', a.accessibilite, 'securite', a.securite,
    'devise', a.devise, 'prix_nuit', a.prix_nuit, 'frais_menage', a.frais_menage, 'caution', a.caution,
    'reduction_semaine', a.reduction_semaine, 'reduction_mois', a.reduction_mois,
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
end $$;
grant execute on function public.fiche_logement(uuid) to anon, authenticated;
