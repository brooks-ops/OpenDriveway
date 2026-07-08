# OpenDriveway Launch Checklist

Use this checklist before opening OpenDriveway to real drivers or hosts. Do not enable production traffic while local/demo mode is enabled. Stripe can stay off for an initial non-payment launch; turn it on only when paid bookings and payouts are ready.

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
STRIPE_ENABLED=false
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
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

## Stripe Later: Paid Bookings Gate

- Leave `STRIPE_ENABLED=false` until these items are complete.
- Activate Stripe account and complete platform settings.
- Use test mode first, then switch to live keys.
- Create a webhook endpoint:
  - URL: `https://YOUR_API_DOMAIN/api/payments/stripe/webhook`
  - Events: `checkout.session.completed`, `payment_intent.payment_failed`, `account.updated`
- Put the webhook signing secret in `STRIPE_WEBHOOK_SECRET`.
- Run a host onboarding test and confirm `charges_enabled=true`.
- Run a driver booking test and confirm payment redirects to Stripe Checkout.
- Confirm successful Checkout changes the booking status to `confirmed`.
- Set `STRIPE_ENABLED=true` only after live keys and the webhook secret are configured.

## Backend Deployment

- Run `npm run backend:migrate` against the production database.
- Do not seed demo data into production.
- Confirm `/healthz` returns `{ "status": "ok" }`.
- Confirm CORS allows only the production frontend.
- Confirm the app refuses to start if required production settings are missing.

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
5. Create an active listing.
6. Search for the listing.
7. View the listing.
8. Book the listing as a different driver.
9. Confirm the booking appears in the dashboard as pending payment.
