-- =====================================================================
-- APEX · Supabase schema
-- Run once in a DEDICATED Supabase project: Dashboard → SQL Editor.
--
-- ⚠ Use a fresh project. If the project already has tables named profiles, food_logs,
--   water_logs or workout_sessions from another app (e.g. PULSO), `create table if not exists`
--   would silently keep the OLD columns and APEX would fail at runtime.
--
-- Every table has Row Level Security ON with strict `auth.uid() = user_id` policies
-- (select / insert / update / delete) so no user can read or modify another user's data,
-- and the anon role has no table access at all.
--
-- Records are created on the client with their own ids (guest mode works offline first),
-- hence the composite primary key (user_id, id).
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
  source     text not null default 'search' check (source in ('barcode', 'ai', 'search', 'custom', 'text')),
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
-- daily_steps (one row per day; source = where the number came from)
-- ---------------------------------------------------------------------
create table if not exists public.daily_steps (
  user_id    uuid not null references auth.users (id) on delete cascade,
  id         text not null,
  date       date not null,
  steps      int  not null check (steps >= 0),
  source     text not null default 'manual' check (source in ('manual', 'health')),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists daily_steps_user_date_idx on public.daily_steps (user_id, date);

-- ---------------------------------------------------------------------
-- cardio_logs
-- ---------------------------------------------------------------------
create table if not exists public.cardio_logs (
  user_id    uuid not null references auth.users (id) on delete cascade,
  id         text not null,
  date       date not null,
  cardio     text not null check (cardio in ('walk', 'run', 'bike', 'elliptical', 'swim', 'sport', 'treadmill')),
  minutes    int  not null check (minutes > 0),
  kcal       numeric not null default 0,
  incline_pct numeric check (incline_pct between 0 and 40),
  speed_kmh   numeric check (speed_kmh between 0 and 30),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists cardio_logs_user_date_idx on public.cardio_logs (user_id, date);

-- ---------------------------------------------------------------------
-- weight_logs, saved_foods, custom_exercises, workout_routines (extras)
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

create table if not exists public.custom_exercises (
  user_id    uuid not null references auth.users (id) on delete cascade,
  id         text not null,
  name       text not null,
  muscle     text not null check (muscle in ('Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Cuádriceps', 'Isquios', 'Glúteos', 'Gemelos', 'Core')),
  equipment  text not null default 'Personalizado',
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.workout_routines (
  user_id    uuid not null references auth.users (id) on delete cascade,
  id         text not null,
  name       text not null,
  program    text not null default '',
  exercises  jsonb not null default '[]'::jsonb,   -- [{exerciseId, sets, reps, restSec}]
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- ---------------------------------------------------------------------
-- workout_sessions + workout_sets (sets live in their own table, with user_id for a direct RLS check)
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
  updated_at   timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists workout_sessions_user_date_idx on public.workout_sessions (user_id, date);

create table if not exists public.workout_sets (
  user_id        uuid not null references auth.users (id) on delete cascade,
  id             text not null,                 -- `${session_id}:${exercise_order}:${set_order}`
  session_id     text not null,
  exercise_id    text not null,
  exercise_order int  not null,
  set_order      int  not null,
  kg             numeric not null default 0 check (kg >= 0),
  reps           int  not null default 0 check (reps >= 0),
  done           boolean not null default false,
  pr             boolean not null default false,
  rest_sec       int,
  primary key (user_id, id),
  foreign key (user_id, session_id) references public.workout_sessions (user_id, id) on delete cascade
);
create index if not exists workout_sets_session_idx on public.workout_sets (user_id, session_id);

-- ---------------------------------------------------------------------
-- ai_usage: daily counters for the metered AI features (photo scans, text parsing).
-- Users can READ their counters but never write them; increments go through consume_ai(),
-- a SECURITY DEFINER function, so the limit cannot be reset from the browser with the anon key.
-- ---------------------------------------------------------------------
create table if not exists public.ai_usage (
  user_id    uuid not null references auth.users (id) on delete cascade,
  day        date not null default current_date,
  kind       text not null check (kind in ('photo', 'text')),
  count      int  not null default 0 check (count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, day, kind)
);

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles         enable row level security;
alter table public.food_logs        enable row level security;
alter table public.water_logs       enable row level security;
alter table public.daily_steps      enable row level security;
alter table public.cardio_logs      enable row level security;
alter table public.weight_logs      enable row level security;
alter table public.saved_foods      enable row level security;
alter table public.custom_exercises enable row level security;
alter table public.workout_routines enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_sets     enable row level security;
alter table public.ai_usage         enable row level security;

-- Full owner-only CRUD on every user-data table
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'food_logs', 'water_logs', 'daily_steps', 'cardio_logs', 'weight_logs',
    'saved_foods', 'custom_exercises', 'workout_routines', 'workout_sessions', 'workout_sets'
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

-- ai_usage: read-only for the owner (no insert/update/delete policy = denied)
drop policy if exists "ai_usage_select_own" on public.ai_usage;
create policy "ai_usage_select_own" on public.ai_usage
  for select to authenticated using (auth.uid() = user_id);

-- Belt and braces: the anonymous role gets no table privileges at all.
revoke all on public.profiles, public.food_logs, public.water_logs, public.daily_steps, public.cardio_logs,
              public.weight_logs, public.saved_foods, public.custom_exercises, public.workout_routines,
              public.workout_sessions, public.workout_sets, public.ai_usage from anon;
revoke insert, update, delete on public.ai_usage from authenticated;

-- =====================================================================
-- consume_ai(kind): atomically reserve one AI call for today.
-- Hard caps live HERE (photo 3/day, text 20/day) so clients can never raise them.
-- Returns the new count, or -1 when the daily limit is reached.
-- Called by /api/analyze-food and /api/quick-parse with the user's own JWT (auth.uid() applies).
-- There is deliberately no refund function: a client could call it to reset its own quota.
-- =====================================================================
create or replace function public.consume_ai(p_kind text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_limit int;
  v_count int;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  v_limit := case p_kind when 'photo' then 3 when 'text' then 20 else null end;
  if v_limit is null then
    raise exception 'unknown kind' using errcode = '22023';
  end if;

  insert into public.ai_usage (user_id, day, kind, count)
  values (v_uid, current_date, p_kind, 0)
  on conflict (user_id, day, kind) do nothing;

  update public.ai_usage
     set count = count + 1, updated_at = now()
   where user_id = v_uid and day = current_date and kind = p_kind and count < v_limit
  returning count into v_count;

  return coalesce(v_count, -1);
end;
$$;

revoke all on function public.consume_ai(text) from public, anon;
grant execute on function public.consume_ai(text) to authenticated;
