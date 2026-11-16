-- 16 nov. 2026 — Ouverture de Sundarly à l'Amérique (Nord, centrale, Sud, Caraïbes).
-- Les hôtes peuvent fixer leur prix en dollar US, dollar canadien, peso mexicain ou real brésilien,
-- en plus de l'euro, du dirham et du franc suisse. Le paiement Stripe se fait dans la devise de l'annonce.
alter table public.annonces drop constraint if exists annonces_devise_check;
alter table public.annonces add constraint annonces_devise_check
  check (devise = any (array['EUR','MAD','CHF','USD','CAD','MXN','BRL']));
