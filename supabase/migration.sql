-- ============================================================
-- PerroSOS MTB — Supabase Migration
-- Ejecutar en Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Tabla profiles (se llena con trigger al hacer login)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "profiles_public_read" on profiles for select using (true);
create policy "profiles_own_update" on profiles for update using (auth.uid() = id);

-- Trigger: crear profile automáticamente al registrarse
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 2. Tabla eventos
create table eventos (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references profiles(id) on delete set null,
  date date not null,
  type text not null check (type in ('comunidad', 'equipo')),
  title text not null,
  place text,
  place_lat numeric,
  place_lng numeric,
  time text,
  image_url text,
  source_url text,
  distance text,
  elevation text,
  difficulty text check (difficulty in ('Facil', 'Moderada', 'Dificil')),
  created_at timestamptz default now()
);

alter table eventos enable row level security;
create policy "eventos_public_read" on eventos for select using (true);
create policy "eventos_auth_insert" on eventos for insert
  with check (auth.uid() = created_by);
create policy "eventos_own_update" on eventos for update
  using (auth.uid() = created_by);
create policy "eventos_own_delete" on eventos for delete
  using (auth.uid() = created_by);

-- 3. Tabla event_attendees (muchos a muchos)
create table event_attendees (
  event_id uuid references eventos(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (event_id, user_id)
);

alter table event_attendees enable row level security;
create policy "attendees_public_read" on event_attendees for select using (true);
create policy "attendees_own_insert" on event_attendees for insert
  with check (auth.uid() = user_id);
create policy "attendees_own_delete" on event_attendees for delete
  using (auth.uid() = user_id);

-- 4. Storage bucket para imágenes
insert into storage.buckets (id, name, public) values ('event-images', 'event-images', true);

create policy "Anyone can read images" on storage.objects
  for select using (bucket_id = 'event-images');

create policy "Authenticated users can upload images" on storage.objects
  for insert with check (bucket_id = 'event-images' and auth.role() = 'authenticated');

create policy "Owners can delete images" on storage.objects
  for delete using (bucket_id = 'event-images' and auth.uid() = owner);

-- 5. Habilitar real-time en la tabla eventos
alter publication supabase_realtime add table eventos;
