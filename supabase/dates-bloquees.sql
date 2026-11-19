-- Dates bloquées par l'hôte ou l'admin (réservées ailleurs : Airbnb, téléphone…), 19 nov. 2026
-- fin = jour de départ (exclu), comme pour les réservations. Vérifiées par devis_sejour (donc creer_reservation).
create table if not exists public.dates_bloquees (
  id uuid primary key default gen_random_uuid(),
  annonce_id uuid not null references public.annonces(id) on delete cascade,
  debut date not null,
  fin date not null,
  note text,
  cree_le timestamptz not null default now(),
  check (fin > debut)
);
create index if not exists dates_bloquees_annonce on public.dates_bloquees (annonce_id, debut);
alter table public.dates_bloquees enable row level security;
drop policy if exists "dates bloquees admin" on public.dates_bloquees;
create policy "dates bloquees admin" on public.dates_bloquees for all using (public.est_admin()) with check (public.est_admin());

-- devis_sejour : ajout du contrôle des dates bloquées (le reste est inchangé)
CREATE OR REPLACE FUNCTION public.devis_sejour(p_annonce uuid, p_arrivee date, p_depart date, p_voyageurs integer, p_animal boolean)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare a annonces; n int; jours int; base numeric; pct numeric := 0; lib text := null; red numeric; menage numeric; anim numeric; total numeric;
  ete boolean; nmin int; nmax int;
begin
  select * into a from annonces where id = p_annonce and statut = 'en_ligne';
  if a.id is null then raise exception 'Ce logement n''est pas disponible'; end if;
  if p_arrivee is null or p_depart is null or p_depart <= p_arrivee then raise exception 'Dates invalides'; end if;
  if p_arrivee < current_date then raise exception 'La date d''arrivée est passée'; end if;
  n := p_depart - p_arrivee; jours := p_arrivee - current_date;
  -- durée de séjour : règles d'été (arrivée de juin à août) si l'hôte en a fixé
  ete := extract(month from p_arrivee) in (6, 7, 8) and (a.nuits_min_ete is not null or a.nuits_max_ete is not null);
  nmin := case when ete then coalesce(a.nuits_min_ete, a.nuits_min, 1) else coalesce(a.nuits_min, 1) end;
  nmax := case when ete then coalesce(a.nuits_max_ete, a.nuits_max) else a.nuits_max end;
  if n < nmin then raise exception 'Séjour minimum : % nuit(s)%', nmin, case when ete then ' en été' else '' end; end if;
  if nmax is not null and n > nmax then raise exception 'Séjour maximum : % nuit(s)%', nmax, case when ete then ' en été' else '' end; end if;
  if coalesce(p_voyageurs, 1) < 1 or p_voyageurs > a.voyageurs then raise exception 'Ce logement accueille % voyageur(s) maximum', a.voyageurs; end if;
  if p_animal and not a.animaux then raise exception 'Les animaux ne sont pas acceptés dans ce logement'; end if;
  if exists (select 1 from reservations r where r.annonce_id = a.id and r.arrivee < p_depart and r.depart > p_arrivee
             and (r.statut in ('confirmee','terminee') or (r.statut = 'en_attente' and r.cree_le > now() - interval '30 minutes')))
     or exists (select 1 from dates_bloquees b where b.annonce_id = a.id and b.debut < p_depart and b.fin > p_arrivee) then
    raise exception 'Ces dates ne sont plus disponibles';
  end if;
  base := a.prix_nuit * n;
  if public.promo_nouvelle_active(a.id) and 20 > pct then pct := 20; lib := 'Promotion nouvelle annonce (-20 %)'; end if;
  if n >= 28 and a.reduction_mois > pct then pct := a.reduction_mois; lib := 'Réduction au mois (-' || a.reduction_mois || ' %)'; end if;
  if n >= 7 and a.reduction_semaine > pct then pct := a.reduction_semaine; lib := 'Réduction à la semaine (-' || a.reduction_semaine || ' %)'; end if;
  if a.reduction_anticipee > pct and jours >= a.anticipee_jours then pct := a.reduction_anticipee; lib := 'Réservation anticipée (-' || a.reduction_anticipee || ' %)'; end if;
  if a.reduction_derniere_minute > pct and jours <= a.derniere_minute_jours then pct := a.reduction_derniere_minute; lib := 'Dernière minute (-' || a.reduction_derniere_minute || ' %)'; end if;
  red := round(base * pct / 100, 2);
  menage := coalesce(a.frais_menage, 0);
  anim := case when p_animal then coalesce(a.frais_animaux, 0) else 0 end;
  total := base - red + menage + anim;
  return json_build_object('annonce', a.id, 'titre', a.titre, 'devise', a.devise, 'nuits', n, 'montant_nuits', base,
    'reduction', red, 'reduction_libelle', lib, 'frais_menage', menage, 'frais_animaux', anim, 'total', total, 'hote_id', a.hote_id);
end $function$;
