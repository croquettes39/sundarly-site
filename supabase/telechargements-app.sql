-- Sundarly — comptage des téléchargements de l'application Android (adresse /app)
-- Aucune adresse IP n'est conservée : seulement la date, le pays, la ville, l'appareil et d'où vient le clic.
create table if not exists public.telechargements_app (
  id bigint generated always as identity primary key,
  cree_le timestamptz not null default now(),
  source text,       -- 'Bouton du site' ou 'QR code / lien direct'
  provenance text,   -- page ou site d'où vient le clic
  pays text,
  ville text,
  appareil text
);
alter table public.telechargements_app enable row level security; -- aucune lecture ni écriture directe
create index if not exists telechargements_app_cree_le on public.telechargements_app (cree_le);

create or replace function public.enregistrer_telechargement(p_source text, p_provenance text, p_pays text, p_ville text, p_appareil text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.telechargements_app (source, provenance, pays, ville, appareil)
  values (left(coalesce(nullif(p_source, ''), 'QR code / lien direct'), 40), left(coalesce(nullif(p_provenance, ''), 'Direct'), 60),
          case when p_pays ~ '^[A-Z]{2}$' then p_pays end, left(nullif(p_ville, ''), 80),
          case when p_appareil in ('Mobile', 'Tablette', 'Ordinateur') then p_appareil end);
end $$;
revoke all on function public.enregistrer_telechargement(text, text, text, text, text) from public;
grant execute on function public.enregistrer_telechargement(text, text, text, text, text) to anon, authenticated;

create or replace function public.admin_telechargements(p_jours integer default 30)
returns json language plpgsql stable security definer set search_path = public as $$
declare debut timestamptz := date_trunc('day', now()) - make_interval(days => greatest(1, least(p_jours, 365)) - 1);
begin
  if not public.est_admin() then raise exception 'acces refuse'; end if;
  return json_build_object(
    'periode', (select count(*) from telechargements_app where cree_le >= debut),
    'aujourdhui', (select count(*) from telechargements_app where cree_le >= date_trunc('day', now())),
    'total', (select count(*) from telechargements_app),
    'premier', (select min(cree_le) from telechargements_app),
    'sources', (select json_agg(x) from (select source cle, count(*) n from telechargements_app where cree_le >= debut group by 1 order by 2 desc) x),
    'pays', (select json_agg(x) from (select coalesce(pays, '??') cle, count(*) n from telechargements_app where cree_le >= debut group by 1 order by 2 desc limit 10) x)
  );
end $$;
revoke all on function public.admin_telechargements(integer) from public, anon;
grant execute on function public.admin_telechargements(integer) to authenticated;
