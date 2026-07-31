-- supabase-schema.sql
-- À exécuter dans Supabase > SQL Editor.
-- Si vous aviez déjà créé la table clicks (ancienne version), n'exécutez que le bloc "links".

-- ===== links : vos liens, gérés depuis /admin =====
create table public.links (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  slug text not null unique,      -- ex: "instagram" -> https://votresite.vercel.app/go/instagram
  label text not null,            -- texte du bouton
  web_url text not null,          -- URL web du profil (les deep-links sont dérivés automatiquement)
  sort_order int not null default 0
);
alter table public.links enable row level security;
-- Aucune policy : seule la service_role key (serveur) peut lire/écrire.

-- ===== clicks : tracking =====
create table public.clicks (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  slug text not null,
  platform text,          -- android | ios | desktop
  user_agent text,
  referrer text
);
alter table public.clicks enable row level security;

create index clicks_slug_idx on public.clicks (slug, created_at desc);
