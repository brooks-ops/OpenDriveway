# OpenDriveway Launch Checklist

Use this checklist before opening OpenDriveway to real drivers or hosts. Do not enable production traffic while local/demo mode is enabled.

## Required Production Environment

Backend:

```text
APP_ENV=production
LOCAL_DEMO_MODE=false
API_CORS_ORIGINS=https://YOUR_FRONTEND_DOMAIN
FRONTEND_URL=https://YOUR_FRONTEND_DOMAIN
DATABASE_URL=postgresql+asyncpg://...
SUPABASE_URL=https://odciideyuiltpqdsqenk.supabase.co
SUPABASE_JWT_AUDIENCE=authenticated
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_REFRESH_URL=https://YOUR_FRONTEND_DOMAIN/dashboard/host
STRIPE_CONNECT_RETURN_URL=https://YOUR_FRONTEND_DOMAIN/dashboard/host
STRIPE_PLATFORM_FEE_BPS=1000
GOOGLE_MAPS_API_KEY=...
```

Frontend:

```text
VITE_API_URL=https://YOUR_API_DOMAIN
VITE_LOCAL_DEMO_MODE=false
VITE_SUPABASE_URL=https://odciideyuiltpqdsqenk.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

## Supabase

- Confirm the account/host migration has been applied.
- Enable Email/Password auth.
- Enable Google OAuth and add production callback URLs.
- Enable Apple Sign In and add production callback URLs.
- Add production site URL and redirect URLs:
  - `https://YOUR_FRONTEND_DOMAIN`
  - `https://YOUR_FRONTEND_DOMAIN/login`
  - `https://YOUR_FRONTEND_DOMAIN/dashboard`
- Create a fresh signup and confirm a `public.users` row is created.
- Run Become Host and confirm the user becomes `host` and has a `public.host_profiles` row.

## Stripe

- Activate Stripe account and complete platform settings.
- Use test mode first, then switch to live keys.
- Create a webhook endpoint:
  - URL: `https://YOUR_API_DOMAIN/api/payments/stripe/webhook`
  - Events: `checkout.session.completed`, `payment_intent.payment_failed`, `account.updated`
- Put the webhook signing secret in `STRIPE_WEBHOOK_SECRET`.
- Run a host onboarding test and confirm `charges_enabled=true`.
- Run a driver booking test and confirm payment redirects to Stripe Checkout.
- Confirm successful Checkout changes the booking status to `confirmed`.

## Backend Deployment

- Run `npm run backend:migrate` against the production database.
- Do not seed demo data into production.
- Confirm `/healthz` returns `{ "status": "ok" }`.
- Confirm CORS allows only the production frontend.
- Confirm the app refuses to start if production secrets are missing.

## Frontend Deployment

- Build with `npm run build`.
- Configure SPA fallback routing to `index.html`.
- Confirm landing, search, listing detail, login, dashboard, terms, and privacy routes load on refresh.
- Confirm local/demo labels do not appear in production.

## Legal And Support

- Replace starter Terms and Privacy pages with attorney-reviewed launch language.
- Add a monitored support email.
- Publish cancellation/refund handling rules.
- Publish host payout and listing responsibility rules.

## Final Smoke Test

1. Create a new account with email/password.
2. Create a new account with Google.
3. Create a new account with Apple.
4. Upgrade one account to host.
5. Complete Stripe Connect onboarding for that host.
6. Create an active listing.
7. Search for the listing.
8. View the listing.
9. Book the listing as a different driver.
10. Pay through Stripe Checkout.
11. Confirm the booking becomes `confirmed`.
