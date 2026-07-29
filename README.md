# Daily Brief

A daily copywriting challenge app — everyone gets the same brief each day,
writes to a tight timer, and can browse (and react to) what everyone else
wrote.

## Status

Working prototype backed by Supabase. Submissions, reactions, streaks and
the daily room are shared between real users.

## Getting started

You need a Supabase project first — the app will show a setup screen until
it has one.

1. Create a free project at [supabase.com](https://supabase.com)
2. In the SQL editor, run the contents of `supabase/schema.sql`
3. Under **Authentication > Providers**, enable **Anonymous sign-ins**
4. Under **Project Settings > API**, copy the project URL and the `anon`
   public key into a `.env` file (see `.env.example`):

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

The `anon` key is safe to ship in a browser bundle — it's designed to be
public, and Row Level Security is what actually protects the data. Never
put the `service_role` key in this file.

Then:

```bash
npm install
npm run dev
```

That starts a local dev server (Vite will print the URL, usually
`http://localhost:5173`). Open it in your browser.

To build a production bundle:

```bash
npm run build
npm run preview   # serves the built files locally so you can sanity-check them
```

## Project structure

```
src/
  App.jsx        — the whole app (brief data, timer, form, community feed, menu)
  api.js          — Supabase data layer (auth, profiles, submissions, reactions)
  main.jsx        — React entry point
  index.css       — Tailwind imports
supabase/
  schema.sql      — tables + Row Level Security policies
```

## How the data model works

Visitors are signed in **anonymously**, so each one gets a stable
`auth.uid()` without an email. Every RLS policy keys off that id.

- `profiles` — name, streak, theme. Select-own-only, so nobody can
  enumerate the user list.
- `submissions` — one row per person per day, unique on
  `(user_id, brief_date)`. Readable by anyone signed in: this is the room.
  The author's `name` is **copied onto the row** rather than joined from
  `profiles`, since profiles are private.
- `reactions` — one row per `(submission, reactor, tag)`, so tapping a
  reaction twice removes it instead of inflating the count.
- `feedback` — insert-only. There is deliberately no select policy, so
  users can't read each other's bug reports; view them in the Supabase
  dashboard's table editor.

## Deploying

Once you're ready to put this on a real URL:
1. Push this repo to GitHub
2. Connect the repo to Vercel or Netlify (both have generous free tiers
   and auto-deploy on push)
3. Build command: `npm run build`, output directory: `dist`
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment
   variables in the host's dashboard — `.env` is gitignored, so the build
   will otherwise ship the setup screen.
