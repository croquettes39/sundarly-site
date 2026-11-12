-- Sundarly (12 nov. 2026) — les annonces des comptes de l'administration affichent « Hôte : Sundarly »
-- (jamais le prénom de la propriétaire du site). Les autres hôtes gardent leur prénom.
-- prenom_public(id) : 'Sundarly' si le compte est dans public.admins, sinon initcap(prenom).
-- Appliqué (remplacement de initcap(p.prenom) par public.prenom_public(p.id)) dans :
-- catalogue(), fiche_logement(uuid), mes_reservations(), mes_avis(), avis_voyageur(uuid), avis_logement(uuid).
-- Le contrat de séjour (contrat_reservation) garde le nom légal du propriétaire.
create or replace function public.prenom_public(p_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select case when exists (select 1 from public.admins where user_id = p_id) then 'Sundarly'
              else (select initcap(prenom) from public.profils where id = p_id) end;
$$;
