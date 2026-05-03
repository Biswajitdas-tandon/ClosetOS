-- ClosetOS — initial schema
-- Run with: supabase db reset (locally) or apply via dashboard for hosted projects.

create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- ============================================================
-- Helpers
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ============================================================
-- profiles
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- folders (nestable)
-- ============================================================
create table public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.folders(id) on delete cascade,
  name text not null,
  icon text,
  color text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index folders_user_idx on public.folders(user_id);
create index folders_parent_idx on public.folders(parent_id);
create trigger folders_updated_at before update on public.folders
  for each row execute function public.set_updated_at();

-- ============================================================
-- tags
-- ============================================================
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null default 'custom' check (kind in ('occasion','season','custom')),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);
create index tags_user_idx on public.tags(user_id);

-- ============================================================
-- items
-- ============================================================
create table public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete set null,
  category text not null check (category in ('apparel','accessory','jewelry','silver','artwork')),

  title text,
  brand text,
  colour text,
  material text,
  price_amount numeric(12,2),
  price_currency text not null default 'INR',
  purchase_date date,
  notes text,
  status text not null default 'available' check (status in ('available','lent','given_away','sold')),

  details jsonb not null default '{}'::jsonb,

  search_text tsvector generated always as (
    to_tsvector('english',
      coalesce(title,'') || ' ' ||
      coalesce(brand,'') || ' ' ||
      coalesce(colour,'') || ' ' ||
      coalesce(material,'') || ' ' ||
      coalesce(notes,'')
    )
  ) stored,
  embedding vector(1536),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index items_user_cat_status_idx on public.items(user_id, category, status);
create index items_folder_idx on public.items(folder_id);
create index items_search_idx on public.items using gin(search_text);
create index items_embedding_idx on public.items using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create trigger items_updated_at before update on public.items
  for each row execute function public.set_updated_at();

-- ============================================================
-- item_tags
-- ============================================================
create table public.item_tags (
  item_id uuid not null references public.items(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (item_id, tag_id)
);
create index item_tags_tag_idx on public.item_tags(tag_id);

-- ============================================================
-- item_images
-- ============================================================
create table public.item_images (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  storage_path text not null,
  width int,
  height int,
  is_primary boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index item_images_item_idx on public.item_images(item_id);
create unique index item_images_one_primary on public.item_images(item_id) where is_primary;

-- ============================================================
-- outfits + calendar
-- ============================================================
create table public.outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  occasion text,
  event_date date,
  weather text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index outfits_user_date_idx on public.outfits(user_id, event_date);
create trigger outfits_updated_at before update on public.outfits
  for each row execute function public.set_updated_at();

create table public.outfit_items (
  outfit_id uuid not null references public.outfits(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  role text,
  primary key (outfit_id, item_id)
);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_date date not null,
  outfit_id uuid references public.outfits(id) on delete set null,
  title text,
  location text,
  notes text,
  created_at timestamptz not null default now()
);
create index calendar_events_user_date_idx on public.calendar_events(user_id, event_date);

-- Update items.details.last_worn_date when an apparel item is part of a logged outfit
create or replace function public.update_last_worn()
returns trigger language plpgsql as $$
declare
  ev_date date;
begin
  select event_date into ev_date from public.outfits where id = new.outfit_id;
  if ev_date is null then return new; end if;

  update public.items
     set details = jsonb_set(details, '{last_worn_date}', to_jsonb(ev_date::text), true)
   where id in (select item_id from public.outfit_items where outfit_id = new.outfit_id)
     and category in ('apparel','accessory')
     and (details->>'last_worn_date' is null or (details->>'last_worn_date')::date < ev_date);

  return new;
end $$;

create trigger calendar_event_last_worn
  after insert or update of outfit_id, event_date on public.calendar_events
  for each row when (new.outfit_id is not null)
  execute function public.update_last_worn();

-- ============================================================
-- shared_access + activity_logs
-- ============================================================
create table public.shared_access (
  id uuid primary key default gen_random_uuid(),
  resource_type text not null check (resource_type in ('folder','item','outfit')),
  resource_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  shared_with_id uuid references auth.users(id) on delete cascade,
  share_token text unique,
  permission text not null default 'view' check (permission in ('view','edit')),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index shared_access_resource_idx on public.shared_access(resource_type, resource_id);
create index shared_access_with_idx on public.shared_access(shared_with_id);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  resource_type text not null,
  resource_id uuid not null,
  action text not null,
  diff jsonb,
  created_at timestamptz not null default now()
);
create index activity_logs_resource_idx on public.activity_logs(resource_type, resource_id);
create index activity_logs_user_idx on public.activity_logs(user_id, created_at desc);

-- ============================================================
-- wishlist + packing
-- ============================================================
create table public.wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  image_url text,
  source_url text,
  category text,
  target_price numeric(12,2),
  current_price numeric(12,2),
  last_checked_at timestamptz,
  in_stock boolean,
  notes text,
  created_at timestamptz not null default now()
);
create index wishlist_user_idx on public.wishlist(user_id);

create table public.packing_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_name text not null,
  destination text,
  start_date date,
  end_date date,
  weather_summary jsonb,
  trip_type text,
  created_at timestamptz not null default now()
);
create index packing_lists_user_idx on public.packing_lists(user_id);

create table public.packing_list_items (
  list_id uuid not null references public.packing_lists(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  packed boolean not null default false,
  primary key (list_id, item_id)
);

-- ============================================================
-- Storage buckets
-- ============================================================
insert into storage.buckets (id, name, public)
values ('items-private', 'items-private', false),
       ('items-public', 'items-public', true)
on conflict (id) do nothing;

-- ============================================================
-- RLS
-- ============================================================
alter table public.profiles         enable row level security;
alter table public.folders          enable row level security;
alter table public.tags             enable row level security;
alter table public.items            enable row level security;
alter table public.item_tags        enable row level security;
alter table public.item_images      enable row level security;
alter table public.outfits          enable row level security;
alter table public.outfit_items     enable row level security;
alter table public.calendar_events  enable row level security;
alter table public.shared_access    enable row level security;
alter table public.activity_logs    enable row level security;
alter table public.wishlist         enable row level security;
alter table public.packing_lists    enable row level security;
alter table public.packing_list_items enable row level security;

-- profiles: users see/update only their own row
create policy profiles_select_self on public.profiles for select using (auth.uid() = id);
create policy profiles_update_self on public.profiles for update using (auth.uid() = id);

-- generic owner policies
create policy folders_owner on public.folders for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy tags_owner on public.tags for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy items_owner on public.items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy outfits_owner on public.outfits for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy calendar_events_owner on public.calendar_events for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy wishlist_owner on public.wishlist for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy packing_lists_owner on public.packing_lists for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy activity_logs_select_self on public.activity_logs for select using (auth.uid() = user_id);

-- join tables: derive ownership from parent
create policy item_tags_via_item on public.item_tags for all
  using (exists (select 1 from public.items i where i.id = item_id and i.user_id = auth.uid()))
  with check (exists (select 1 from public.items i where i.id = item_id and i.user_id = auth.uid()));

create policy item_images_via_item on public.item_images for all
  using (exists (select 1 from public.items i where i.id = item_id and i.user_id = auth.uid()))
  with check (exists (select 1 from public.items i where i.id = item_id and i.user_id = auth.uid()));

create policy outfit_items_via_outfit on public.outfit_items for all
  using (exists (select 1 from public.outfits o where o.id = outfit_id and o.user_id = auth.uid()))
  with check (exists (select 1 from public.outfits o where o.id = outfit_id and o.user_id = auth.uid()));

create policy packing_list_items_via_list on public.packing_list_items for all
  using (exists (select 1 from public.packing_lists p where p.id = list_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.packing_lists p where p.id = list_id and p.user_id = auth.uid()));

-- shared_access: owner or shared-with user
create policy shared_access_owner_select on public.shared_access for select
  using (auth.uid() = owner_id or auth.uid() = shared_with_id);
create policy shared_access_owner_write on public.shared_access for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Storage policies: items-private bucket
create policy "items-private read own"
  on storage.objects for select
  using (bucket_id = 'items-private' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "items-private write own"
  on storage.objects for insert
  with check (bucket_id = 'items-private' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "items-private update own"
  on storage.objects for update
  using (bucket_id = 'items-private' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "items-private delete own"
  on storage.objects for delete
  using (bucket_id = 'items-private' and auth.uid()::text = (storage.foldername(name))[1]);

-- items-public is world-readable; only owner can write
create policy "items-public read all"
  on storage.objects for select using (bucket_id = 'items-public');

create policy "items-public write own"
  on storage.objects for insert
  with check (bucket_id = 'items-public' and auth.uid()::text = (storage.foldername(name))[1]);
