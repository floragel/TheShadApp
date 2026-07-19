# LinkUp

An AI-first free-time coordination app for SHAD participants. LinkUp helps people discover what others are doing, create spontaneous plans, and join activities without digging through group chats.

## Start locally

```bash
pnpm install
pnpm dev
```

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
