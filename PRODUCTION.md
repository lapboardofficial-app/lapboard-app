# LapBoard Production Setup

LapBoard can be hosted as one public service or as a split frontend/API setup.

## Recommended Simple Setup: One Render Web Service

This repo now supports serving the built React app and the API from the same Node server.

1. Push the repo to GitHub.
2. Create a new Render Blueprint from `render.yaml`, or create a Render Web Service manually.
   - Blueprint name: `lapboard`
   - Blueprint path: `render.yaml`
3. Use these settings:
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - Health check path: `/api/health`
4. Add a persistent disk:
   - Mount path: `/var/data`
   - Environment variable: `LAPBOARD_DB_PATH=/var/data/lapboard-db.json`
5. Open the Render URL. The website should load at `/`, and the API should answer at `/api/health`.

Because the frontend and API are on the same domain in this setup, you do not need `VITE_LAPBOARD_API_URL`.

## Supabase Accounts and Postgres

Supabase support is optional, but it is the production path for real email/password accounts and Postgres-backed shared data.

1. Create a Supabase project at `https://supabase.com`.
2. In Supabase, open SQL Editor.
3. Paste and run:

```txt
supabase/migrations/001_lapboard_public_schema.sql
```

You can open that file in this repo and copy the full SQL into the Supabase SQL Editor.

4. In Supabase Project Settings > API, copy:
   - Project URL
   - anon public key
5. Add these environment variables to Render or Vercel:

```txt
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

6. Redeploy the site.

When those variables are present:

- Profiles uses Supabase email/password sign-in and sign-up.
- Public laps are stored in the `laps` Postgres table.
- Media links are stored in `media_entries`.
- Teams are stored in `teams` and `team_members`.
- League joins are stored in `league_memberships`.
- Row Level Security keeps users from editing other users' private rows.

Do not expose your Supabase service-role key in the frontend. Only use the anon public key with `VITE_SUPABASE_ANON_KEY`.

## Split Setup: Vercel Frontend + Render API

Use this if you want the website on Vercel and the API on Render.

### Render API

Use:

```txt
Build command: npm install
Start command: npm start
```

Set environment variables:

```txt
NODE_ENV=production
HOST=0.0.0.0
LAPBOARD_SERVE_STATIC=false
LAPBOARD_DB_PATH=/var/data/lapboard-db.json
LAPBOARD_ALLOWED_ORIGINS=https://your-vercel-site.vercel.app
```

Add a persistent disk mounted at `/var/data`.

### Vercel Frontend

Use:

```txt
Build command: npm run build
Output directory: dist
```

Set:

```txt
VITE_LAPBOARD_API_URL=https://your-render-api.onrender.com
```

Then redeploy the frontend after adding the environment variable.

## Production Notes

- The API now binds to `0.0.0.0` by default so hosted platforms can reach it.
- `/api/health` no longer exposes the database path in production.
- `LAPBOARD_ALLOWED_ORIGINS` can restrict which public website may call the API.
- The server has a basic per-IP write rate limit.
- Without Supabase env vars, the app still uses the JSON-file API/local fallback.
- With Supabase env vars, shared public data and accounts use Supabase Auth plus Postgres.
- Profile pictures are still stored as browser data URLs in the profile row. For a bigger launch, move profile photos and footage uploads to Supabase Storage.
