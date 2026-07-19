# ShadLoop 🔁

ShadLoop is a premium, AI-first social planning and scheduling platform designed exclusively for SHAD program participants and staff (PAs & Leadership Team). It allows cohorts to coordinate free blocks, create spontaneous activities, run surveys, track absences, and confirm presence via QR codes.

![ShadLoop Logo](./public/logo.png)

## Key Features

### 👤 Participant Portal
- **Discover Activities**: Drag and reorder upcoming plans. Filter by categories (Active, Chill, Food, Creative).
- **Personal Check-in QR**: Instantly display your attendance QR code from your Profile panel.
- **My Plans**: Stay on top of your joined activities and follow the official program agenda.
- **Waiting Lists**: Sign up on a waiting list for popular activities. When a spot opens up, waitlisted members are promoted automatically in order!
- **Absence Reporting**: File excuses for absences or late arrivals directly to the coordinators.
- **Surveys (Polls)**: Vote on group decisions (e.g., dining choices, evening movies) and view real-time results.
- **Interactive Campus Map**: Click on campus hot-spots (Quad, Residences, Dining Hall, Science Building, Library, Athletic Centre) to see scheduled activities there.

### 🛡️ Coordinator Dashboard (PA & LT Privileges)
- **Live QR Scanner**: Point your camera or select a student from the dropdown to scan their personal QR code and confirm activity attendance.
- **Absences Manager**: Review, filter, approve, or reject student absence and lateness reports.
- **Surveys Creator**: Draft and publish cohort surveys with customizable durations and options.
- **Waiting Lists Panel**: View active waiting lists for all activities and manually promote or reorder members.
- **Roster & Role Assignment (LT only)**: Elevate standard accounts to PA or LT roles, and assign PAs to coordinate house/design teams.

---

## Getting Started

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment
Copy `.env.example` to `.env.local` and insert your Supabase project parameters:
```bash
cp .env.example .env.local
```
Add the following credentials to `.env.local`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

### 3. Deploy Database Migrations
1. Run `supabase/schema.sql` in the Supabase SQL editor.
2. Run migrations under `supabase/migrations/` sequentially to set up fixed teams, role permissions, live activities, and ShadLoop features (waiting lists, polls, absences, and check-in confirmation).
3. To set up the initial test accounts (`pa.test@example.com` and `lt.test@example.com`), create these users in your Supabase Auth console under **Authentication > Users** (suggested password: `ShadPassword2026!`), then run `supabase/demo_roles.sql` to elevate their role privileges.

### 4. Run Locally
```bash
pnpm dev
```

---

## Technology Stack
- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Custom CSS (Vanilla CSS modern tokens & variables)
- **Icons**: Lucide React
- **Database & Authentication**: Supabase (PostgreSQL with RLS policy enforcement)
- **AI Engine**: Llama-3.1 via Groq Edge Functions for activity matchmaking
