-- M4 — journal de l'admin et réglages privés (avant les tests de la phase 5)

create table if not exists public.admin_log (
  id         bigserial primary key,
  admin_id   uuid references public.profiles(id) on delete set null,
  action     text not null,
  detail     jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_log_recent on public.admin_log (created_at desc);
alter table public.admin_log enable row level security;
revoke all on public.admin_log from anon, authenticated;
grant all on public.admin_log to service_role;
grant usage, select on sequence public.admin_log_id_seq to service_role;

create table if not exists public.site_prive (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);
alter table public.site_prive enable row level security;
revoke all on public.site_prive from anon, authenticated;
grant all on public.site_prive to service_role;
