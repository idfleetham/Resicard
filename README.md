# Resicard St Andrews

A residents' card for St Andrews. Residents prove they live locally and pay a flat annual
fee. Local outlets list offers for residents and pay a flat monthly fee. Outlets can also
run a loyalty programme (points, tiers, rewards).

## How a redemption works

1. Each outlet gets a QR code (its `scanCode`) to print and put by the till.
2. A resident opens Resicard on their phone and scans it. The app shows that outlet's
   offers that are valid right now.
3. The resident picks one. The app records the redemption, awards loyalty points if the
   outlet runs a programme, and shows a green success screen with a live clock and a
   6-character code. Staff glance at it and apply the offer.

Merchants need no hardware. Redemptions are tracked without any per-redemption charge.

## Stack

React 18, TypeScript, Vite, Tailwind, shadcn/ui, wouter, TanStack Query on the client.
Express, Drizzle ORM, Postgres on the server. JWT auth with bcrypt passwords.
Stripe is optional; without it, payments are marked active directly (development mode).

## Layout

```
client/src/
  pages/           one file per route: home, login, register, resident/, merchant/, admin/
  components/      resident/, merchant/, admin/, loyalty/ and the shadcn ui/ set
  hooks/           use-auth (session + useRequireRole), use-merchant-offers
  lib/             auth helpers, query client
server/
  index.ts         app start-up
  config.ts        environment variables and defaults
  routes/          one file per API area (auth, profile, public, redemptions, merchant, loyalty, admin)
  storage/         thin database access, one file per table group
  lib/             auth middleware, offer rules (pure, tested), loyalty, QR, Stripe, uploads
  scripts/         create-admin
shared/schema.ts   database schema, zod validation, shared types
docs/API.md        the API contract the client and server are built against
parked/            old code kept for reference; not compiled
```

## Running it

```
npm install
cp .env.example .env      # fill in DATABASE_URL and JWT_SECRET at least
npm run db:push           # create or update the tables
npm run dev               # http://localhost:5000
npm test                  # unit tests for the offer rules
```

Create the first admin with `npm run admin:create -- <username> <email> <password>`.

## Environment variables

| Name | Purpose | Default |
|---|---|---|
| DATABASE_URL | Postgres connection string | required |
| JWT_SECRET | signs login tokens | required in production |
| PUBLIC_BASE_URL | used in QR codes, emails and Stripe redirects | http://localhost:5000 |
| RESIDENT_ANNUAL_FEE_GBP | individual resident membership (household is 2x) | 25 |
| MERCHANT_PREMIUM_MONTHLY_FEE_GBP | merchant Premium plan (Free is capped) | 30 |
| FREE_PLAN_LIVE_OFFER_LIMIT | live offers allowed on the Free plan | 2 |
| LOCAL_POSTCODE_PREFIXES | who counts as local at sign-up | KY16,KY15,KY10,DD6 |
| ADMIN_SETUP_SECRET | enables `POST /api/auth/register-admin`; leave unset to disable | unset |
| STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET | enable real payments | unset |

## Things not done yet

- Password reset emails only print to the server log. Wire an email provider in `server/email.ts`.
- Residency documents are stored as base64 in the users table. Move to object storage and add a retention policy before real residents upload anything.
- The postcode check is a prefix match, not a distance calculation.
- No rate limiting on login or registration.
