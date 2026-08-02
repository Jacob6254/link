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

-- ===== v3 : pages bio (type Linktree) et leurs boutons =====
create table if not exists public.pages (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  slug text not null unique,       -- allmysocials.us/<slug>
  owner text,                      -- username du profil propriétaire
  title text not null,
  tagline text,
  avatar text,                     -- emoji, initiales ou URL d'image
  theme jsonb not null default '{}'::jsonb
);
alter table public.pages enable row level security;
-- Aucune policy : seule la service_role key (serveur) peut lire/écrire.

create table if not exists public.page_buttons (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  page_id bigint not null references public.pages(id) on delete cascade,
  label text not null,
  url text not null,
  sort_order int not null default 0
);
alter table public.page_buttons enable row level security;

alter table public.clicks add column if not exists button_id bigint; -- clic venant d'un bouton de page

-- ===== v4 : boutons enrichis (image de fond, animation) =====
-- Le bucket de stockage "media" (avatars, fonds, images de boutons) est créé
-- automatiquement par le serveur au premier upload — rien à faire côté Storage.
alter table public.page_buttons add column if not exists image text;      -- URL d'image (bouton bannière)
alter table public.page_buttons add column if not exists animation text;  -- none | bounce | pulse | wiggle

-- ===== v5 : les pages bio rejoignent les groupes (Link Manager unifié) =====
alter table public.pages add column if not exists group_id bigint references public.groups(id) on delete set null;
