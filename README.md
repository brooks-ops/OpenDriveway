# OpenDriveway

OpenDriveway is a marketplace scaffold where homeowners can rent unused driveway parking spaces for events, airports, downtown areas, and other destinations.

This repository is built for production-oriented architecture, with a clearly labeled local/demo mode for development. Demo mode is not a production authentication or payment system.

## Stack

- React + Vite + TypeScript
- Tailwind CSS
- FastAPI
- PostgreSQL
- Supabase Authentication
- Stripe Connect
- Google Maps Platform

## Project Structure

```text
frontend/   React app, routing, auth client, API client, Playwright smoke tests
backend/    FastAPI app, SQLAlchemy models, Alembic migrations, pytest API tests
infra/      Local Docker Compose services
scripts/    Local operational scripts, including demo seeding
```

## Local/Demo Mode

Local/demo mode is enabled by:

```text
LOCAL_DEMO_MODE=true
VITE_LOCAL_DEMO_MODE=true
```

In this mode:

- Browser sign-up/login stores a demo session in local storage.
- API requests include explicit `X-Demo-Email` and `X-Demo-Name` headers.
- The backend accepts those demo headers only when `LOCAL_DEMO_MODE=true`.
- Stripe Connect returns the configured local return URL if no Stripe key is present.
- Google geocoding returns a fixed local/demo response if no Google key is present.

Do not enable demo mode in production.

## Exact Local Setup

From the repository root:

### 1. Create environment files

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

The example files are configured for local/demo mode and local Docker Postgres.

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Install backend dependencies

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

### 4. Start Postgres with Docker

```bash
docker compose -f infra/docker-compose.yml up -d postgres
```

If Docker is not available on macOS, use Homebrew Postgres instead:

```bash
brew install postgresql@16
brew services start postgresql@16
/opt/homebrew/opt/postgresql@16/bin/psql -h localhost -d postgres -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'opendriveway') THEN
    CREATE ROLE opendriveway LOGIN PASSWORD 'opendriveway';
  ELSE
    ALTER ROLE opendriveway LOGIN PASSWORD 'opendriveway';
  END IF;
END
$$;
SELECT 'CREATE DATABASE opendriveway OWNER opendriveway'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'opendriveway')\gexec
GRANT ALL PRIVILEGES ON DATABASE opendriveway TO opendriveway;
SQL
```

### 5. Run Alembic migrations

```bash
source .venv/bin/activate
npm run backend:migrate
```

### 6. Seed local/demo driveway listings

```bash
source .venv/bin/activate
npm run backend:seed
```

The seed script creates one local/demo host and five active, real-looking driveway listings around Chicago's Museum Campus event area.

### 7. Start FastAPI

```bash
source .venv/bin/activate
npm run backend:dev
```

FastAPI runs at `http://localhost:8000`.

### 8. Start Vite

In another terminal:

```bash
npm run dev
```

The web app runs at `http://localhost:5173`. Vite is configured with strict port behavior so it fails visibly if another app is already using that port.

## Local Flow Checklist

With both servers running and demo mode enabled, you can verify:

1. Open `http://localhost:5173/login`.
2. Use Sign up with any email and any password of at least 8 characters.
3. Go to Dashboard and click Become a Host.
4. Click New and create a listing.
5. Use Search to find seeded listings or your created listing.
6. Open a listing detail page.
7. Pick a start and end time and create a reservation.

## Validation Commands

Run these after Postgres is running and migrations are applied:

```bash
npm run lint
npm run build
npm audit --audit-level=moderate
source .venv/bin/activate
npm run backend:test
```

For frontend smoke tests, keep FastAPI and Vite running with seeded data, then run:

```bash
npx playwright install chromium
npm run dev:e2e --workspace frontend
npm run test:e2e
```

The smoke-test Vite server uses `http://localhost:5174` to avoid collisions with an existing local app on 5173.

## Production Launch

Use [LAUNCH_CHECKLIST.md](/Users/brooksjeanette/Documents/Codex/2026-07-07/build-a-production-quality-web-application/LAUNCH_CHECKLIST.md) before public traffic. Production mode requires real Supabase, database, CORS, and map/geocoding settings; the backend refuses to start with `APP_ENV=production` if required live settings are missing or demo mode is still enabled. Stripe can stay disabled with `STRIPE_ENABLED=false` until paid bookings are ready.

When enabled, payments use Stripe Checkout with Stripe Connect destination charges. Successful payments are confirmed by the `/api/payments/stripe/webhook` endpoint, not by client-side redirects.

## Environment Variables

See [backend/.env.example](/Users/brooksjeanette/Documents/Codex/2026-07-07/build-a-production-quality-web-application/backend/.env.example) and [frontend/.env.example](/Users/brooksjeanette/Documents/Codex/2026-07-07/build-a-production-quality-web-application/frontend/.env.example). Every required local variable is documented inline.

## Supabase Account Tables

Supabase Auth stores identities in `auth.users`. OpenDriveway also needs public app profile tables for roles and host onboarding state. The migration is here:

```text
supabase/migrations/20260708000000_accounts_and_hosts.sql
```

Apply it with either:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Or open the Supabase dashboard, go to SQL Editor, paste the migration SQL, and run it.

The migration creates:

- `public.users`, synced from `auth.users`
- `public.host_profiles`
- `public.user_role` enum: `driver`, `host`, `admin`
- `public.handle_new_auth_user()` trigger for new signups
- `public.become_host()` helper function
- Row Level Security policies for authenticated users and hosts

This migration covers Supabase Auth profile and host metadata. The marketplace tables for listings, reservations, and payments are still managed by the FastAPI/Alembic backend migrations.
