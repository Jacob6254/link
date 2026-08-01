-- supabase-schema.sql
-- À exécuter dans Supabase > SQL Editor.
-- Le script est idempotent : le relancer en entier ne casse rien et ne perd
-- aucune donnée (tout est en "if not exists").

-- ===== links : vos liens, gérés depuis /dashboard/links =====
create table if not exists public.links (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  slug text not null unique,      -- ex: "instagram" -> https://votresite.us/instagram
  label text not null,            -- texte du bouton
  web_url text not null,          -- URL web du profil (les deep-links sont dérivés automatiquement)
  sort_order int not null default 0
);
alter table public.links enable row level security;
-- Aucune policy : seule la service_role key (serveur) peut lire/écrire.

-- ===== clicks : tracking =====
create table if not exists public.clicks (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  slug text not null,
  platform text,          -- android | ios | desktop
  user_agent text,
  referrer text
);
alter table public.clicks enable row level security;

create index if not exists clicks_slug_idx on public.clicks (slug, created_at desc);

-- ===== users : profils de connexion, gérés depuis /dashboard/profiles =====
create table if not exists public.users (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  username text not null unique,
  password_hash text not null,   -- scrypt "sel:hash", jamais le mot de passe en clair
  role text not null default 'viewer' check (role in ('admin', 'viewer'))
);
alter table public.users enable row level security;
-- Aucune policy : seule la service_role key (serveur) peut lire/écrire.

-- ===== v2 : groupes de liens, propriétaire des liens, pays des clics =====
create table if not exists public.groups (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null,
  sort_order int not null default 0
);
alter table public.groups enable row level security;
-- Aucune policy : seule la service_role key (serveur) peut lire/écrire.

alter table public.links  add column if not exists group_id bigint references public.groups(id) on delete set null;
alter table public.links  add column if not exists owner text;      -- username du profil qui a créé le lien
alter table public.clicks add column if not exists country text;    -- code pays (header Vercel)

-- ===== settings : réglages du site (clé/valeur) =====
-- root_redirect : slug du lien vers lequel la racine du domaine redirige.
create table if not exists public.settings (
  key text primary key,
  value text
);
alter table public.settings enable row level security;
-- Aucune policy : seule la service_role key (serveur) peut lire/écrire.
