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
- 11 fixed house teams and 11 fixed design teams
- A maximum of one house team and one design team per account
- `SHAD`, `PA`, and `LT` account roles
- Policies that allow SHAD participants to access only their own private account data
- Roster-reading privileges for PA and LT accounts
- Role-management privileges for LT accounts, without allowing self-promotion
- No browser permission to create, rename, or delete teams

For a database where the original schema was already installed, run `supabase/migrations/20260719_roles_and_teams.sql` once instead of rerunning the full schema. This replaces the prototype teams and resets existing team selections.

All new accounts start as `SHAD`. To establish the first LT securely, use the Supabase SQL Editor with the account email:

```sql
update public.user_roles
set role = 'lt'
where user_id = (select id from auth.users where email = 'your-email@example.com');
```

## Live platform and AI

Run `supabase/migrations/20260719_live_platform.sql` once to enable database-backed activities, joins, schedules, announcements, PA assignments, and the daily AI quota. No fake activities are shown when the database is empty.

Deploy the protected AI Edge Function and set its server-only key:

```bash
supabase secrets set OPENAI_API_KEY=your-openai-api-key
supabase functions deploy activity-match
```

The OpenAI key is never included in GitHub Pages. Each signed-in participant is limited to 10 AI requests per day; prompts are limited to 300 characters and recommendations may only reference real upcoming database activities.

## GitHub Pages deployment

The workflow at `.github/workflows/deploy-pages.yml` deploys every push to `main`.

1. In the repository, open **Settings → Pages** and choose **GitHub Actions** as the source.
2. The deployment workflow already contains this project's public Supabase URL and publishable key. Never add a `service_role` key to the workflow or frontend.
3. Push to `main` or manually run the deployment workflow.

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
