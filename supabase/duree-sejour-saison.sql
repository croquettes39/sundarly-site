-- Durée de séjour selon la saison (10 nov. 2026)
-- Colonnes nuits_min_ete / nuits_max_ete : si renseignées, elles remplacent nuits_min / nuits_max
-- pour une arrivée en juin, juillet ou août. Vérifié en base par devis_sejour (donc creer_reservation)
-- et affiché sur la fiche (fiche_logement renvoie les deux colonnes).
-- Exemple : appartement Asilah Beralmar = 2 à 15 nuits hors été, 6 à 21 nuits en été.
alter table public.annonces add column if not exists nuits_min_ete integer, add column if not exists nuits_max_ete integer;
