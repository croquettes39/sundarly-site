-- =========================================================
-- Marrakech Sunrise Balloon — base de données de l'espace gestion
-- À coller une seule fois dans Supabase > SQL Editor > Run
-- =========================================================

create table if not exists offers (
  id text primary key,
  sort int default 1,
  visible boolean default true,
  time text,
  price int,
  image text,
  name jsonb default '{}'::jsonb,
  items jsonb default '{}'::jsonb,
  badge jsonb default '{}'::jsonb,
  discount int default 0,
  featured boolean default false,
  category text default 'balloon',
  duration text,
  child_price int default 0,
  "desc" jsonb default '{}'::jsonb,
  promo_until date,
  updated_at timestamptz default now()
);

create table if not exists settings (
  key text primary key,
  value text
);

create table if not exists visits (
  id bigserial primary key,
  ts timestamptz default now(),
  lang text,
  device text,
  ref text,
  path text,
  sid text
);

create table if not exists presence (
  sid text primary key,
  path text,
  last_seen timestamptz default now()
);

create table if not exists requests (
  id bigserial primary key,
  ts timestamptz default now(),
  offer text, date text, adults int, kids int,
  name text, email text, phone text, hotel text, notes text,
  total int, lang text,
  status text default 'new'
);

alter table offers   enable row level security;
alter table settings enable row level security;
alter table visits   enable row level security;
alter table requests enable row level security;
alter table presence enable row level security;

-- Le public (le site) : lit les offres visibles et les réglages, enregistre les visites et les demandes
create policy "site lit offres visibles" on offers   for select to anon using (visible = true);
create policy "site lit reglages"        on settings for select to anon using (true);
create policy "site compte visites"      on visits   for insert to anon with check (true);
create policy "site envoie demandes"     on requests for insert to anon with check (true);
create policy "site signale presence"    on presence for insert to anon with check (true);
create policy "site met a jour presence" on presence for update to anon using (true) with check (true);
create policy "site lit presence"        on presence for select to anon using (true);

-- Le gérant connecté : accès complet
create policy "gerant offres"    on offers   for all to authenticated using (true) with check (true);
create policy "gerant reglages"  on settings for all to authenticated using (true) with check (true);
create policy "gerant visites"   on visits   for select to authenticated using (true);
create policy "gerant demandes"  on requests for all to authenticated using (true) with check (true);
create policy "gerant presence"  on presence for select to authenticated using (true);

-- Offres et réglages de départ (modifiables ensuite dans l'espace gestion)
insert into settings (key, value) values
  ('whatsapp', '212773836323'),
  ('phoneDisplay', '+212 773 836 323'),
  ('googleReviewsUrl', 'https://maps.app.goo.gl/zVmYZpGz7va5PCF47'),
  ('eurRate', '10.8')
on conflict (key) do nothing;

-- Si la base existe déjà (installée avant l'ajout des réductions), exécuter seulement ces 2 lignes :
alter table offers add column if not exists discount int default 0;
alter table offers add column if not exists promo_until date;

-- Mise à jour (si la base existait déjà avant les excursions et le suivi en direct), exécuter ce bloc :
alter table offers add column if not exists category text default 'balloon';
alter table offers add column if not exists duration text;
alter table offers add column if not exists child_price int default 0;
alter table offers add column if not exists "desc" jsonb default '{}'::jsonb;
alter table visits add column if not exists sid text;
create table if not exists presence (sid text primary key, path text, last_seen timestamptz default now());
alter table presence enable row level security;
create policy "site signale presence"    on presence for insert to anon with check (true);
create policy "site met a jour presence" on presence for update to anon using (true) with check (true);
create policy "site lit presence"        on presence for select to anon using (true);
create policy "gerant presence"          on presence for select to authenticated using (true);
alter table offers add column if not exists featured boolean default false;
