# LinkUp

An AI-first free-time coordination app for SHAD participants. LinkUp helps people discover what others are doing, create spontaneous plans, and join activities without digging through group chats.

## Start locally

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

## Database and accounts

LinkUp uses Supabase because GitHub Pages is static hosting and cannot safely run a database itself.

1. Create a Supabase project.
2. Open its SQL Editor and run [`supabase/schema.sql`](supabase/schema.sql).
3. Copy `.env.example` to `.env.local` and insert the project URL and **publishable** key.
4. In Supabase Authentication settings, keep email confirmation enabled. Add these redirect URLs:
   - `http://localhost:5173/**`
   - `https://floragel.github.io/TheShadApp/**`

Never put the Supabase service-role key in this repository or in any `VITE_` variable. The browser receives only the publishable key; database access is enforced with Row Level Security.

The included schema provides:

- Auth-linked participant profiles
- House and design teams
- A maximum of one house team and one design team per account
- Policies that allow users to update only their own profile and memberships

Replace the sample team names in `supabase/schema.sql` before running it if the official SHAD team names are available.

## GitHub Pages deployment

The workflow at `.github/workflows/deploy-pages.yml` deploys every push to `main`.

1. In the repository, open **Settings → Pages** and choose **GitHub Actions** as the source.
2. Open **Settings → Secrets and variables → Actions → Variables**.
3. Add `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` as repository variables.
4. Push to `main` or manually run the deployment workflow.

## Team workflow

Start feature branches from `main` and keep each branch focused:

```bash
git switch main
git pull
git switch -c feature/activity-creation
```

Suggested feature areas:

- `feature/activity-creation` — creation form and AI prompt parsing
- `feature/matching` — recommendations and interest matching
- `feature/profiles` — participant profiles and preferences
- `feature/backend` — persistence, authentication, and realtime updates

## Project structure

- `src/components` — reusable interface components
- `src/data` — temporary mock data
- `src/types` — shared TypeScript models
- `src/App.tsx` — current prototype composition
