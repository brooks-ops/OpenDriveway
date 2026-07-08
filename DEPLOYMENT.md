# OpenDriveway Non-Stripe MVP Deployment

This deploys the MVP with real accounts, host onboarding inside OpenDriveway, listing creation, search, location services, listing detail pages, and reservations. Stripe stays disabled until paid bookings are ready.

## 1. Supabase

Project URL:

```text
https://odciideyuiltpqdsqenk.supabase.co
```

Required dashboard setup:

- Authentication > Providers: enable Email/Password.
- Authentication > Providers: configure Google.
- Authentication > Providers: configure Apple.
- Authentication > URL Configuration:
  - Site URL: `https://YOUR_FRONTEND_DOMAIN`
  - Redirect URLs:
    - `https://YOUR_FRONTEND_DOMAIN`
    - `https://YOUR_FRONTEND_DOMAIN/login`
    - `https://YOUR_FRONTEND_DOMAIN/dashboard`
- Confirm the Supabase account/host migration has already been applied.

## 2. Backend Host

Render is preconfigured with `render.yaml`. Create a Render Blueprint from the GitHub repo, then set the synced environment values:

```text
API_CORS_ORIGINS=https://YOUR_FRONTEND_DOMAIN
FRONTEND_URL=https://YOUR_FRONTEND_DOMAIN
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST:5432/DATABASE
GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
```

The backend service uses:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT --app-dir backend
```

Run migrations against production:

```bash
PYTHONPATH=backend alembic -c backend/alembic.ini upgrade head
```

On Render, the `opendriveway-migrate` worker in `render.yaml` runs that migration command. After it succeeds, you can stop/suspend that worker so it is not a permanent paid service.

Health check:

```text
https://YOUR_API_DOMAIN/healthz
```

Expected:

```json
{"status":"ok"}
```

## 3. Frontend Host

Vercel is preconfigured with `frontend/vercel.json`.

Recommended Vercel project settings:

```text
Root Directory: frontend
Build Command: npm install && npm run build
Output Directory: dist
```

Environment variables:

```text
VITE_API_URL=https://YOUR_API_DOMAIN
VITE_LOCAL_DEMO_MODE=false
VITE_SUPABASE_URL=https://odciideyuiltpqdsqenk.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_GOOGLE_MAPS_API_KEY=
```

The Vercel rewrite sends all app routes back to `index.html`, so refresh works on `/search`, `/login`, `/dashboard`, `/terms`, and `/privacy`.

## 4. Production Smoke Test

After both deployments are live:

```bash
PRODUCTION_API_URL=https://YOUR_API_DOMAIN \
PRODUCTION_FRONTEND_URL=https://YOUR_FRONTEND_DOMAIN \
python3 scripts/production_smoke.py
```

Then manually verify:

1. Create an account.
2. Log in.
3. Become a host.
4. Create a listing.
5. Search for the listing.
6. View the listing.
7. Create a reservation.
8. Confirm the reservation appears in the dashboard as pending payment.

## 5. Stripe Later

Keep this in production until paid bookings are ready:

```text
STRIPE_ENABLED=false
```

When Stripe is ready, add live Stripe keys, configure the webhook endpoint, then set `STRIPE_ENABLED=true`.
