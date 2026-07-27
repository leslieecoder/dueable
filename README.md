# Dueable

Monorepo scaffold for Dueable.

## Workspace

- `apps/web`: Next.js 15 dashboard
- `apps/extension`: Chrome extension for Canvas import flows
- `packages/types`: shared domain contracts
- `packages/lib`: shared business logic and service layer
- `packages/ui`: shared presentational primitives
- `supabase`: local Supabase config, migrations, and seed assets

## Included setup

- npm workspaces monorepo
- Next.js 15 app with Tailwind CSS
- React + Vite Chrome extension shell
- shadcn/ui configuration for the web app
- Supabase client scaffolding and local config folder
- Zustand store scaffolding
- ESLint and Prettier

## Commands

- `npm install`
- `npm run dev:web`
- `npm run dev:extension`
- `npm run typecheck`
- `npm run lint`
- `npm run format`

## Notes

This scaffold intentionally stops at structure and configuration. Feature code, authentication flows, data syncing, and UI screens can be generated one slice at a time afterward.