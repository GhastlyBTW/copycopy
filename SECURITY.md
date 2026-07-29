# Security checklist (before you have real users)

This app has no email or payment data, so the blast radius of a mistake is
smaller than most apps — but "smaller" isn't "none." Names, writing
submissions, and feedback are all still real user data. Go through this
before opening the app up publicly.

## 1. Row Level Security is on for every table

`supabase/schema.sql` enables RLS on all four tables and writes explicit
policies. Before you trust it:

- In the Supabase dashboard, go to **Database > Tables** and confirm every
  table shows RLS as **enabled** (there's a visible badge/warning if it's
  off).
- Run this in the SQL editor to double-check programmatically:
  ```sql
  select tablename, rowsecurity from pg_tables where schemaname = 'public';
  ```
  Every row should show `rowsecurity = true`.
- A table with RLS enabled but **no policies** blocks all access — that's
  the safe failure mode, but it also means "nothing works" is sometimes a
  sign you forgot a policy, not that your app is broken.

## 2. Never expose the service_role key

Supabase gives you two keys:
- **anon key** — safe to put in your frontend code / `.env`. RLS protects
  you even though this key is public.
- **service_role key** — bypasses RLS entirely. This must never appear in
  any file that ships to the browser, never get committed to git, and
  never get prefixed with `VITE_` (Vite exposes anything with that prefix
  to client-side code).

This app doesn't need the service_role key at all in normal operation —
everything the client does goes through RLS-protected requests using the
anon key. If you ever add an admin dashboard to read feedback or moderate
content, that's the one place service_role belongs, and it should run on
a server, not in the browser.

## 3. Use anonymous auth, not passwords

Since users only pick a display name (no email/password), use Supabase's
built-in anonymous sign-in. Each browser gets a real `auth.uid()` that RLS
policies can check, without you having to handle credentials at all —
there's nothing to leak because there's nothing stored. If you later want
persistent accounts across devices, Supabase can convert an anonymous user
to a permanent one without losing their data.

## 4. Validate input, don't just trust the client

The schema already includes basic guardrails (name length, feedback text
length, reaction tags restricted to a fixed list). Keep this habit as you
add features — anything a user can type should have a sane length/format
constraint at the database level, not just in the React form. Client-side
validation is a UX nicety; database constraints are the actual defense.

## 5. Don't collect data you don't need

The schema deliberately has no email, no IP address, no device
fingerprinting — just a display name and writing submissions. The
simplest way to avoid a data leak mattering much is to not hold sensitive
data in the first place.

## 6. `.env` hygiene

- `.env.local` (or whatever holds your Supabase URL + anon key) is already
  in `.gitignore` — verify it's never been committed with
  `git log --all --full-history -- .env*`.
- On Vercel/Netlify, set these as environment variables in the project
  dashboard, not hardcoded in source.

## 7. Before every public launch

- Re-read every RLS policy out loud and ask "who can read this, who can
  write this, is that actually who I meant?"
- Try hitting a few endpoints yourself using only the anon key (e.g. via
  `curl` or Supabase's auto-generated API docs) and confirm you can't read
  or write things you shouldn't be able to as an anonymous/different user.
- Turn on Supabase's built-in logs and keep an eye on them for the first
  week after launch.
