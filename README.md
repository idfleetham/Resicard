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

For a populated town to demo or develop against, run `npm run seed:demo -- --yes`. It creates
24 invented outlets at real St Andrews addresses, 60 invented residents and six months of
redemption history. Every login is on the reserved `.test` domain and the password is
`demo1234`. It never runs in production, and refuses a database holding any non-`.test`
account unless `--force` is given. The header of `server/scripts/seed-demo.ts` is the
documentation; the town itself lives in `server/scripts/demo-data.ts`.

## Environment variables

| Name | Purpose | Default |
|---|---|---|
| DATABASE_URL | Postgres connection string | required |
| JWT_SECRET | signs login tokens | required in production |
| PUBLIC_BASE_URL | used in QR codes, emails and Stripe redirects | http://localhost:5000 |
| RESIDENT_ANNUAL_FEE_GBP | individual resident membership (household is 2x) | 25 |
| MERCHANT_PREMIUM_MONTHLY_FEE_GBP | merchant Premium plan (Free is capped) | 30 |
| FREE_PLAN_LIVE_OFFER_LIMIT | live offers allowed on the Free plan | 2 |
| FREE_TRIAL_DAYS | free trial for a first-time resident or merchant; 0 turns trials off | 90 |
| TOWN_NAME | the town this instance serves, shown on the card | St Andrews |
| LOCAL_POSTCODE_PREFIXES | who counts as local at sign-up | KY16,KY15,KY10,DD6 |
| POSTCARD_CODE_DAYS | how long a posted verification code stays valid | 60 |
| POSTCARD_MAX_ATTEMPTS | wrong-code attempts before a postcard is cancelled | 5 |
| ADMIN_SETUP_SECRET | enables `POST /api/auth/register-admin`; leave unset to disable | unset |
| STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET | enable real payments | unset |

## Things not done yet

- Password reset emails only print to the server log. Wire an email provider in `server/email.ts`.
- Residency is verified by a postcard with a code posted to the address, or in person at a Resicard event. No documents are uploaded or stored.
- The postcode check is a prefix match, not a distance calculation.
- No rate limiting on login or registration.
