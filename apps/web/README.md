# Dueable Web

Next.js 16 web app for Dueable.

## Local development

From the repo root:

```bash
npm install
npm run dev:web
```

The app runs at `http://localhost:3000`.

## Environment variables

Copy [apps/web/.env.example](./.env.example) into your local env file and fill in real values.

Required for production:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
DUEABLE_PLANNER_PROVIDER=gemini
```

Notes:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are used by browser, server, and middleware auth flows.
- `SUPABASE_SERVICE_ROLE_KEY` is required by the assignment import and planner persistence routes.
- `GEMINI_API_KEY` is required if `DUEABLE_PLANNER_PROVIDER=gemini`.

## Deploy to Vercel

Create the Vercel project from this monorepo and set the project root directory to `apps/web`.

Recommended Vercel settings:

- Framework preset: `Next.js`
- Root directory: `apps/web`
- Install command: leave default
- Build command: leave default
- Output directory: leave default

Add these environment variables in Vercel for Production and Preview:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `DUEABLE_PLANNER_PROVIDER`

## Supabase settings required for production

In Supabase Auth settings, add your deployed URLs so login and signup callbacks can return to the app:

- Site URL: your production app URL, for example `https://dueable.vercel.app`
- Redirect URL: `https://your-domain/auth/callback`
- If you use preview deploys, also allow `https://*.vercel.app/auth/callback`

## Before first production test

1. Run the latest Supabase migrations against your hosted database.
2. Deploy the web app to Vercel.
3. Confirm login works on the deployed domain.
4. Update the extension build to use the deployed app origin with `VITE_DUEABLE_WEB_ORIGIN`.
5. Add the deployed app URL to the extension host permissions before shipping the extension build publicly.

## Verification

The current app builds successfully with:

```bash
npm run build --workspace @dueable/web
```
