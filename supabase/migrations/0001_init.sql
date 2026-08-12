-- Éloquence — schéma initial + Row Level Security
-- Convention RLS : chaque table de données utilisateur reçoit exactement
-- 4 policies (select/insert/update/delete) filtrées sur auth.uid() = user_id,
-- ou via jointure vers la ligne parente pour les tables sans user_id direct.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- user_profiles
-- ---------------------------------------------------------------------------
create table if not exists user_profiles (
  user_id uuid references auth.users on delete cascade primary key,
  pseudo text,
  style_conflit text,
  preference_ecrit_oral text,
  style_naturel text,
  objectif_hebdo text,
  vad_silence_seuil_ms int default 2500,
  heure_pratique_habituelle time,
  created_at timestamptz default now()
);

alter table user_profiles enable row level security;

create policy "user_profiles_select_own" on user_profiles
  for select using (auth.uid() = user_id);
create policy "user_profiles_insert_own" on user_profiles
  for insert with check (auth.uid() = user_id);
create policy "user_profiles_update_own" on user_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_profiles_delete_own" on user_profiles
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- themes (référentiel — lecture seule pour les utilisateurs authentifiés)
-- ---------------------------------------------------------------------------
create table if not exists themes (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  description text
);

alter table themes enable row level security;

create policy "themes_select_authenticated" on themes
  for select using (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- user_theme_preferences
-- ---------------------------------------------------------------------------
create table if not exists user_theme_preferences (
  user_id uuid references auth.users on delete cascade,
  theme_id uuid references themes on delete cascade,
  primary key (user_id, theme_id)
);

alter table user_theme_preferences enable row level security;

create policy "user_theme_preferences_select_own" on user_theme_preferences
  for select using (auth.uid() = user_id);
create policy "user_theme_preferences_insert_own" on user_theme_preferences
  for insert with check (auth.uid() = user_id);
create policy "user_theme_preferences_update_own" on user_theme_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_theme_preferences_delete_own" on user_theme_preferences
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- scenarios (référentiel — lecture seule pour les utilisateurs authentifiés)
-- ---------------------------------------------------------------------------
create table if not exists scenarios (
  id uuid primary key default gen_random_uuid(),
  theme_id uuid references themes,
  titre text not null,
  role_ia text not null,
  sujet text not null default '',
  criteres_evalues jsonb not null,
  niveau_min int default 1
);

alter table scenarios enable row level security;

create policy "scenarios_select_authenticated" on scenarios
  for select using (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- diagnostic_tests
-- ---------------------------------------------------------------------------
create table if not exists diagnostic_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  date timestamptz default now(),
  scores_initiaux jsonb,
  points_forts jsonb,
  points_faibles jsonb
);

alter table diagnostic_tests enable row level security;

create policy "diagnostic_tests_select_own" on diagnostic_tests
  for select using (auth.uid() = user_id);
create policy "diagnostic_tests_insert_own" on diagnostic_tests
  for insert with check (auth.uid() = user_id);
create policy "diagnostic_tests_update_own" on diagnostic_tests
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "diagnostic_tests_delete_own" on diagnostic_tests
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- programmes_personnalises
-- ---------------------------------------------------------------------------
create table if not exists programmes_personnalises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  semaine int,
  sessions_suggerees jsonb,
  justification text,
  created_at timestamptz default now()
);

alter table programmes_personnalises enable row level security;

create policy "programmes_personnalises_select_own" on programmes_personnalises
  for select using (auth.uid() = user_id);
create policy "programmes_personnalises_insert_own" on programmes_personnalises
  for insert with check (auth.uid() = user_id);
create policy "programmes_personnalises_update_own" on programmes_personnalises
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "programmes_personnalises_delete_own" on programmes_personnalises
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- sessions
-- ---------------------------------------------------------------------------
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  scenario_id uuid references scenarios,
  type text check (type in ('lecture', 'improvisation', 'conversation')),
  date timestamptz default now(),
  audio_url text,
  transcription text,
  messages jsonb,
  duree_secondes int
);

alter table sessions enable row level security;

create policy "sessions_select_own" on sessions
  for select using (auth.uid() = user_id);
create policy "sessions_insert_own" on sessions
  for insert with check (auth.uid() = user_id);
create policy "sessions_update_own" on sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sessions_delete_own" on sessions
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- feedback (pas de user_id direct — filtrage via la session parente)
-- ---------------------------------------------------------------------------
create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions on delete cascade,
  score_global numeric,
  scores_par_critere jsonb,
  points_forts jsonb,
  points_faibles jsonb,
  conseils_actionnables jsonb,
  corrections jsonb,
  auto_evaluation_utilisateur numeric,
  created_at timestamptz default now()
);

alter table feedback enable row level security;

create policy "feedback_select_own" on feedback
  for select using (
    exists (select 1 from sessions s where s.id = feedback.session_id and s.user_id = auth.uid())
  );
create policy "feedback_insert_own" on feedback
  for insert with check (
    exists (select 1 from sessions s where s.id = feedback.session_id and s.user_id = auth.uid())
  );
create policy "feedback_update_own" on feedback
  for update using (
    exists (select 1 from sessions s where s.id = feedback.session_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from sessions s where s.id = feedback.session_id and s.user_id = auth.uid())
  );
create policy "feedback_delete_own" on feedback
  for delete using (
    exists (select 1 from sessions s where s.id = feedback.session_id and s.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- user_scenario_progress
-- ---------------------------------------------------------------------------
create table if not exists user_scenario_progress (
  user_id uuid references auth.users on delete cascade,
  scenario_id uuid references scenarios on delete cascade,
  niveau_actuel int default 1,
  score_moyen_recent numeric,
  nb_sessions int default 0,
  primary key (user_id, scenario_id)
);

alter table user_scenario_progress enable row level security;

create policy "user_scenario_progress_select_own" on user_scenario_progress
  for select using (auth.uid() = user_id);
create policy "user_scenario_progress_insert_own" on user_scenario_progress
  for insert with check (auth.uid() = user_id);
create policy "user_scenario_progress_update_own" on user_scenario_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_scenario_progress_delete_own" on user_scenario_progress
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- vocabulaire_a_reviser
-- ---------------------------------------------------------------------------
create table if not exists vocabulaire_a_reviser (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  mot text,
  date_suggestion timestamptz default now(),
  reutilise boolean default false
);

alter table vocabulaire_a_reviser enable row level security;

create policy "vocabulaire_a_reviser_select_own" on vocabulaire_a_reviser
  for select using (auth.uid() = user_id);
create policy "vocabulaire_a_reviser_insert_own" on vocabulaire_a_reviser
  for insert with check (auth.uid() = user_id);
create policy "vocabulaire_a_reviser_update_own" on vocabulaire_a_reviser
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "vocabulaire_a_reviser_delete_own" on vocabulaire_a_reviser
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage — bucket des enregistrements audio (privé, un dossier par user_id)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', false)
on conflict (id) do nothing;

create policy "recordings_select_own" on storage.objects
  for select using (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "recordings_insert_own" on storage.objects
  for insert with check (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "recordings_update_own" on storage.objects
  for update using (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "recordings_delete_own" on storage.objects
  for delete using (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);
