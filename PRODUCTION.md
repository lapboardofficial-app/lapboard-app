# LapBoard Production Setup

LapBoard can run publicly without Render.

Use:

- Vercel for the website
- Supabase for real accounts and Postgres shared data

The old `server.js` file can still be used for local fallback/testing, but it is not required for the public Vercel + Supabase setup.

## 1. Push Latest Code To GitHub

In GitHub Desktop:

1. Commit all current changes.
2. Click **Push origin**.

## 2. Create Supabase Project

1. Go to `https://supabase.com`.
2. Create a new project.
3. Save your database password somewhere safe.
4. Wait for the project to finish provisioning.

## 3. Create The Database Tables

1. Open your Supabase project.
2. Go to **SQL Editor**.
3. Open this local file:

```txt
supabase/migrations/001_lapboard_public_schema.sql
```

4. Copy the full SQL file.
5. Paste it into Supabase SQL Editor.
6. Click **Run**.

This creates:

- `profiles`
- `laps`
- `media_entries`
- `teams`
- `team_members`
- `league_memberships`

It also turns on Row Level Security so users can only edit their own protected rows.

## 4. Copy Supabase Keys

In Supabase:

1. Go to **Project Settings**.
2. Go to **API**.
3. Copy:
   - Project URL
   - anon public key

Do not use the service role key in the website.

## 5. Deploy To Vercel

1. Go to `https://vercel.com`.
2. Import your GitHub repo.
3. Use these settings:

```txt
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
```

4. Add environment variables:

```txt
VITE_SUPABASE_URL=your Supabase Project URL
VITE_SUPABASE_ANON_KEY=your Supabase anon public key
```

5. Deploy.

## 6. Test The Public Site

Open your Vercel URL and test:

1. Create an account with email/password.
2. Add a lap.
3. Open the site in another browser.
4. Confirm the public lap appears on the leaderboard.
5. Try joining a league/team.

## Notes

- Render is not needed for the public site.
- The JSON file backend is only a fallback for local testing.
- Video links are public, but direct uploaded video files still only live in the current browser session.
- Profile pictures are currently stored in profile data. For a larger public launch, move images/videos to Supabase Storage.
