-- Daily Brief — Supabase schema + Row Level Security policies
-- ------------------------------------------------------------
-- Run this in the Supabase SQL editor (or as a migration).
--
-- Written to be idempotent: tables use `if not exists`, and every policy is
-- dropped before it is recreated. Postgres has no `create policy if not
-- exists`, so without those drops a second run would fail with 42710.
--
-- Auth approach: Supabase anonymous auth (Authentication > Providers >
-- Anonymous sign-ins). Each visitor gets a stable auth.uid() without needing
-- an email/password, which matches the "just pick a name" UX. You can later
-- convert an anonymous user to a permanent one without losing their data.

-- ============================================================
-- TABLES
-- ============================================================

-- One row per user. Display name + streak stats only — deliberately no
-- email or other PII, so there's less to leak.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  streak int not null default 0,
  best_streak int not null default 0,
  last_date date,
  theme text not null default 'light' check (theme in ('light', 'dark')),
  created_at timestamptz not null default now()
);

-- One row per user per brief day — this is the "room".
--
-- `name` is copied from the author's profile rather than joined at read
-- time: profiles is select-own-only, so the room could not otherwise
-- display who wrote what. Denormalizing keeps profiles private and freezes
-- the byline to the name used on the day of submission.
create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  brief_date date not null,
  brief_id text not null,
  answers jsonb not null, -- keyed by deliverable, e.g. {"tagline": "...", "ig": "..."}
  seconds int not null check (seconds >= 0),
  backfilled boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, brief_date) -- one submission per person per day
);

-- One row per (submission, reactor, tag) so the same person can't inflate
-- a reaction count by tapping repeatedly. The client treats this as a toggle.
create table if not exists reactions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  tag text not null check (tag in ('Nailed the tone', 'Bold choice', 'Loved the twist')),
  created_at timestamptz not null default now(),
  unique (submission_id, user_id, tag)
);

-- Bug reports / suggestions. Insert-only for users (see policies below).
create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('bug', 'suggestion')),
  text text not null check (char_length(text) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists submissions_brief_date_idx on submissions (brief_date);
create index if not exists reactions_submission_id_idx on reactions (submission_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles    enable row level security;
alter table submissions enable row level security;
alter table reactions   enable row level security;
alter table feedback    enable row level security;

drop policy if exists "profiles: select own"    on profiles;
drop policy if exists "profiles: insert own"    on profiles;
drop policy if exists "profiles: update own"    on profiles;
drop policy if exists "submissions: read all"   on submissions;
drop policy if exists "submissions: insert own" on submissions;
drop policy if exists "submissions: update own" on submissions;
drop policy if exists "reactions: read all"     on reactions;
drop policy if exists "reactions: insert own"   on reactions;
drop policy if exists "reactions: delete own"   on reactions;
drop policy if exists "feedback: insert own"    on feedback;

-- Users can only ever see/edit their own profile row. No delete policy:
-- add one deliberately if you want a "delete my account" feature.
create policy "profiles: select own" on profiles for select
  using (auth.uid() = id);
create policy "profiles: insert own" on profiles for insert
  with check (auth.uid() = id);
create policy "profiles: update own" on profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- Anyone signed in can read submissions — this is the public room feed.
-- For a stricter "only see the day once you've played" rule, replace the
-- read policy with:
--
--   using (exists (
--     select 1 from submissions s2
--     where s2.brief_date = submissions.brief_date and s2.user_id = auth.uid()
--   ))
--
-- No delete policy — submissions are permanent once posted.
create policy "submissions: read all" on submissions for select
  to authenticated using (true);
create policy "submissions: insert own" on submissions for insert
  to authenticated with check (auth.uid() = user_id);
create policy "submissions: update own" on submissions for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "reactions: read all" on reactions for select
  to authenticated using (true);
create policy "reactions: insert own" on reactions for insert
  to authenticated with check (auth.uid() = user_id);
create policy "reactions: delete own" on reactions for delete
  to authenticated using (auth.uid() = user_id);

-- Intentionally no select/update/delete policies: users can submit feedback
-- but can't read each other's. View it in the Supabase dashboard's Table
-- Editor, which runs as owner and bypasses RLS.
create policy "feedback: insert own" on feedback for insert
  to authenticated with check (auth.uid() = user_id);
