-- Prix par saison (21 nov. 2026) : une annonce peut avoir des prix différents selon les dates.
-- prix_saisons = liste [{"debut":"2026-12-01","fin":"2026-12-20","prix":330}, …] (fin = dernière nuit, incluse).
-- Les nuits hors saison gardent prix_nuit.
alter table public.annonces add column if not exists prix_saisons jsonb not null default '[]'::jsonb;
alter table public.annonces drop constraint if exists annonces_prix_saisons_check;
alter table public.annonces add constraint annonces_prix_saisons_check check (jsonb_typeof(prix_saisons) = 'array');

-- Prix d'une nuit précise
create or replace function public.prix_de_la_nuit(p_annonce uuid, p_jour date)
returns numeric language sql stable security definer set search_path to 'public' as $$
  select coalesce(
    (select (s->>'prix')::numeric from annonces a2, jsonb_array_elements(a2.prix_saisons) s
      where a2.id = p_annonce and p_jour between (s->>'debut')::date and (s->>'fin')::date
      order by (s->>'debut')::date desc limit 1),
    (select prix_nuit from annonces where id = p_annonce));
$$;

-- Montant des nuits d'un séjour (somme nuit par nuit)
create or replace function public.montant_nuits(p_annonce uuid, p_arrivee date, p_depart date)
returns numeric language sql stable security definer set search_path to 'public' as $$
  select coalesce(sum(public.prix_de_la_nuit(p_annonce, d::date)), 0)
  from generate_series(p_arrivee, p_depart - 1, interval '1 day') d;
$$;

-- devis_sejour : base := public.montant_nuits(a.id, p_arrivee, p_depart) (au lieu de prix_nuit × nuits)
-- fiche_logement : renvoie aussi 'prix_saisons'
do $m$ begin
  execute replace(pg_get_functiondef('public.devis_sejour'::regproc), 'base := a.prix_nuit * n;', 'base := public.montant_nuits(a.id, p_arrivee, p_depart);');
  execute replace(pg_get_functiondef('public.fiche_logement'::regproc), '''prix_nuit'', a.prix_nuit,', '''prix_nuit'', a.prix_nuit, ''prix_saisons'', a.prix_saisons,');
end $m$;
