-- =====================================================================
-- PULSO · Supabase schema
-- Run once in: Supabase Dashboard → SQL Editor.
-- Every table has Row Level Security ON with strict `auth.uid() = user_id`
-- policies (select / insert / update / delete), so no user can ever read or
-- modify another user's data. The anon role has no table access at all.
--
-- Records are created on the client with their own ids (works offline /
-- guest mode first), hence the composite primary key (user_id, id).
-- =====================================================================

-- ---------------------------------------------------------------------
-- profiles (one row per user)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  user_id          uuid primary key references auth.users (id) on delete cascade,
  sex              text not null check (sex in ('male', 'female')),
  age              int  not null check (age between 10 and 120),
  height_cm        numeric not null check (height_cm between 80 and 260),
  weight_kg        numeric not null check (weight_kg between 20 and 400),
  target_weight_kg numeric not null check (target_weight_kg between 20 and 400),
  activity_level   text not null check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  goal             text not null check (goal in ('lose', 'recomp', 'maintain', 'gain')),
  -- derived targets (cached for convenience / other clients)
  kcal_target      int,
  protein_target   int,
  carbs_target     int,
  fat_target       int,
  water_target_ml  int,
  updated_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- food_logs
-- ---------------------------------------------------------------------
create table if not exists public.food_logs (
  user_id    uuid not null references auth.users (id) on delete cascade,
  id         text not null,
  date       date not null,
  meal       text not null check (meal in ('desayuno', 'comida', 'cena', 'snack')),
  name       text not null,
  brand      text,
  grams      numeric not null default 0,
  kcal       numeric not null default 0,
  protein    numeric not null default 0,
  carbs      numeric not null default 0,
  fat        numeric not null default 0,
  source     text not null default 'search' check (source in ('barcode', 'ai', 'search', 'custom')),
  image      text,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists food_logs_user_date_idx on public.food_logs (user_id, date);

-- ---------------------------------------------------------------------
-- water_logs (negative ml = correction)
-- ---------------------------------------------------------------------
create table if not exists public.water_logs (
  user_id    uuid not null references auth.users (id) on delete cascade,
  id         text not null,
  date       date not null,
  ml         int  not null check (ml <> 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists water_logs_user_date_idx on public.water_logs (user_id, date);

-- ---------------------------------------------------------------------
-- activity_logs (steps + cardio)
-- ---------------------------------------------------------------------
create table if not exists public.activity_logs (
  user_id    uuid not null references auth.users (id) on delete cascade,
  id         text not null,
  date       date not null,
  type       text not null check (type in ('steps', 'cardio')),
  steps      int,
  cardio     text check (cardio in ('walk_easy', 'walk_fast', 'run_easy', 'run_hard', 'bike', 'elliptical', 'swim', 'sport')),
  minutes    int,
  kcal       numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists activity_logs_user_date_idx on public.activity_logs (user_id, date);

-- ---------------------------------------------------------------------
-- weight_logs (body weight history)
-- ---------------------------------------------------------------------
create table if not exists public.weight_logs (
  user_id    uuid not null references auth.users (id) on delete cascade,
  id         text not null,
  date       date not null,
  kg         numeric not null check (kg between 20 and 400),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists weight_logs_user_date_idx on public.weight_logs (user_id, date);

-- ---------------------------------------------------------------------
-- saved_foods (custom quick foods, values per 100 g)
-- ---------------------------------------------------------------------
create table if not exists public.saved_foods (
  user_id    uuid not null references auth.users (id) on delete cascade,
  id         text not null,
  name       text not null,
  brand      text,
  kcal100    numeric not null default 0,
  protein100 numeric not null default 0,
  carbs100   numeric not null default 0,
  fat100     numeric not null default 0,
  serving_g  numeric not null default 100,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- ---------------------------------------------------------------------
-- workout_routines (unlimited; exercises = [{exerciseId, sets, reps, restSec}])
-- ---------------------------------------------------------------------
create table if not exists public.workout_routines (
  user_id    uuid not null references auth.users (id) on delete cascade,
  id         text not null,
  name       text not null,
  program    text not null default '',
  exercises  jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- ---------------------------------------------------------------------
-- workout_sessions (finished workouts; exercises = [{exerciseId, sets:[{kg,reps,done,pr}]}])
-- ---------------------------------------------------------------------
create table if not exists public.workout_sessions (
  user_id      uuid not null references auth.users (id) on delete cascade,
  id           text not null,
  date         date not null,
  routine_name text not null,
  started_at   bigint not null,
  duration_sec int  not null default 0,
  intensity    text not null default 'moderate' check (intensity in ('light', 'moderate', 'high')),
  kcal         numeric not null default 0,
  volume       numeric not null default 0,
  pr_count     int not null default 0,
  exercises    jsonb not null default '[]'::jsonb,
  updated_at   timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists workout_sessions_user_date_idx on public.workout_sessions (user_id, date);

-- ---------------------------------------------------------------------
-- ai_scan_usage: daily counter for the (only) metered feature – AI photo scans.
-- Users can READ their counter but never write it directly; increments go
-- through consume_ai_scan(), a SECURITY DEFINER function, so the limit cannot
-- be reset from the browser with the anon key.
-- ---------------------------------------------------------------------
create table if not exists public.ai_scan_usage (
  user_id    uuid not null references auth.users (id) on delete cascade,
  day        date not null default current_date,
  count      int  not null default 0 check (count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles         enable row level security;
alter table public.food_logs        enable row level security;
alter table public.water_logs       enable row level security;
alter table public.activity_logs    enable row level security;
alter table public.weight_logs      enable row level security;
alter table public.saved_foods      enable row level security;
alter table public.workout_routines enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.ai_scan_usage    enable row level security;

-- Full owner-only CRUD on every user-data table
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'food_logs', 'water_logs', 'activity_logs', 'weight_logs',
    'saved_foods', 'workout_routines', 'workout_sessions'
  ]
  loop
    execute format('drop policy if exists "%1$s_select_own" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_insert_own" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_update_own" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_delete_own" on public.%1$I', t);

    execute format('create policy "%1$s_select_own" on public.%1$I for select to authenticated using (auth.uid() = user_id)', t);
    execute format('create policy "%1$s_insert_own" on public.%1$I for insert to authenticated with check (auth.uid() = user_id)', t);
    execute format('create policy "%1$s_update_own" on public.%1$I for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
    execute format('create policy "%1$s_delete_own" on public.%1$I for delete to authenticated using (auth.uid() = user_id)', t);
  end loop;
end $$;

-- ai_scan_usage: read-only for the owner (no insert/update/delete policy = denied)
drop policy if exists "ai_scan_usage_select_own" on public.ai_scan_usage;
create policy "ai_scan_usage_select_own" on public.ai_scan_usage
  for select to authenticated using (auth.uid() = user_id);

-- Belt and braces: the anonymous role gets no table privileges at all.
revoke all on public.profiles, public.food_logs, public.water_logs, public.activity_logs,
              public.weight_logs, public.saved_foods, public.workout_routines,
              public.workout_sessions, public.ai_scan_usage from anon;
revoke insert, update, delete on public.ai_scan_usage from authenticated;

-- =====================================================================
-- consume_ai_scan: atomically reserve one AI scan for today.
-- Returns the new count, or -1 when the daily limit (max 3) is reached.
-- Called by /api/analyze-food with the user's own JWT (auth.uid() applies).
-- =====================================================================
create or replace function public.consume_ai_scan(p_limit int default 3)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_limit int  := least(greatest(coalesce(p_limit, 3), 1), 3); -- clients can never raise it
  v_count int;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  insert into public.ai_scan_usage (user_id, day, count)
  values (v_uid, current_date, 0)
  on conflict (user_id, day) do nothing;

  update public.ai_scan_usage
     set count = count + 1, updated_at = now()
   where user_id = v_uid and day = current_date and count < v_limit
  returning count into v_count;

  return coalesce(v_count, -1);
end;
$$;

revoke all on function public.consume_ai_scan(int) from public, anon;
grant execute on function public.consume_ai_scan(int) to authenticated;
