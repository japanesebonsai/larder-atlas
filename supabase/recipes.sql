create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null default 'pantry meal',
  cuisine text not null default 'Universal',
  servings integer not null default 2,
  time text not null default '25-35 min',
  pantry_used text[] not null default '{}',
  next_buy text not null default '',
  ingredients text[] not null default '{}',
  instructions text[] not null default '{}',
  image_url text,
  source text not null default 'template',
  created_at timestamptz not null default now()
);

create index if not exists recipes_created_at_idx on public.recipes (created_at desc);
create index if not exists recipes_source_idx on public.recipes (source);
