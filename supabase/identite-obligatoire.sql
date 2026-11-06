-- Sundarly — identité obligatoire (déjà appliqué sur la base le 6 nov. 2026)
-- Déposer une annonce : pièce d'identité envoyée (en_cours) ou validée. Mise en ligne : identité validée.
-- Les comptes administrateurs ne sont pas concernés.
create or replace function public.identite_ok(uid uuid, accepte_en_cours boolean) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = uid)
      or exists (select 1 from public.profils p where p.id = uid
                 and (p.statut_verification = 'verifie'
                      or (accepte_en_cours and p.statut_verification = 'en_cours')));
$$;
revoke all on function public.identite_ok(uuid, boolean) from public, anon;
grant execute on function public.identite_ok(uuid, boolean) to authenticated;

create or replace function public.controle_identite_annonce() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.hote_id is not null
     and coalesce(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role', '') = 'authenticated'
     and not public.identite_ok(new.hote_id, true) then
    raise exception 'IDENTITE_REQUISE: vérifiez votre identité avant de publier une annonce';
  end if;
  if new.statut in ('validee', 'en_ligne') and new.hote_id is not null
     and (tg_op = 'INSERT' or old.statut is distinct from new.statut)
     and not public.identite_ok(new.hote_id, false) then
    raise exception 'IDENTITE_NON_VERIFIEE: l''identité de cet hôte doit être validée avant la mise en ligne';
  end if;
  return new;
end $$;

drop trigger if exists controle_identite_annonce on public.annonces;
create trigger controle_identite_annonce before insert or update on public.annonces
  for each row execute function public.controle_identite_annonce();
