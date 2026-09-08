# Resicard St Andrews

A residents' card for St Andrews.

St Andrews prices are set by golf tourists and students who will pay whatever is on the
board, and locals are being priced out of their own high street. Student discounts are
already everywhere, which proves outlets have the room. Resicard gives that room to
residents instead: they prove they live locally and pay a flat annual fee, outlets list
offers for them and pay a flat monthly fee.

No hardware for the merchant, and nothing charged per redemption.

## How a redemption works

1. Each outlet gets a QR code (its `scanCode`) to print and put by the till.
2. A resident opens Resicard on their phone and scans it. The app shows that outlet's
   offers that are valid right now.
3. The resident picks one. The app records the redemption, awards loyalty points if the
   outlet runs a programme, and shows a green success screen with a live clock and a
   6-character code. Staff glance at it and apply the offer.

## What is deliberate

These are the decisions a reader is most likely to mistake for bugs.

- **Merchants never see a resident's name.** They see a stable alias. The one exception is
  the outlet-verification lookup, which needs the resident's own code, works only at
  outlets an admin has enabled, and is logged.
- **There is no analytics or tracking script of any kind.** The whole proposition rests on
  residents believing they are not followed around. Nothing is to be added.
- **Town benchmarks disappear below `ANALYTICS_MIN_COHORT` outlets.** Suppression is the
  feature, not a gap in the data.
- **Savings understate.** A redemption with nothing to estimate from contributes zero
  rather than a guess, and the amount saved is frozen onto the redemption row at the time
  so a later edit to an offer cannot rewrite anyone's history.
- **Loyalty tier is rolling**, derived from the events inside a window rather than from the
  points balance, so spending points never demotes anyone.
- **`RESIDENT_ANNUAL_FEE_GBP` is 36 and the app says £3 a month.** Billing is annual, the
  quote is monthly. Both are intended.

`docs/API.md` is the written contract for every endpoint and every behaviour. It is written
before the code, appended to rather than rewritten, and it records reversals instead of
erasing them. When it and the code disagree, that is a bug worth reporting.

## Stack

React 18, TypeScript, Vite, Tailwind, shadcn/ui, wouter, TanStack Query on the client.
Express, Drizzle ORM, Postgres on the server. JWT auth with bcrypt. Leaflet for the map.
Stripe is optional: without a key, memberships activate directly (development mode).

## Layout

```
client/src/
  pages/           one file per route: home, login, register, resident/, merchant/, admin/
  components/      resident/, merchant/, admin/, loyalty/, pricing/ and the shadcn ui/ set
  hooks/           use-auth (session + useRequireRole), use-merchant-offers
  lib/             auth helpers, query client, map config
server/
  index.ts         app start-up
  config.ts        every environment variable and its default, in one place
  routes/          one file per API area; thin, no SQL and no business logic
  storage/         database access, one file per table group
  lib/             pure business rules, all unit-tested: savings, loyalty, offer-rules,
                   membership, plan, revenue, campaigns, postcode, outlet-verification,
                   trial, analytics, price-changes
  scripts/         migrate, seed-demo, create-admin, jobs-daily
shared/schema.ts   database schema, zod validation, shared types. One source of truth.
migrations/        ordered SQL, applied by hash. Never `drizzle-kit push` on real data.
docs/API.md        the contract
docs/REPLIT-BRIEF.md  how to deploy it, and what not to change
```

Business rules take arguments and return values, with no database access and no clock of
their own, which is why they can be tested exhaustively and why a rule must never be
duplicated into a route handler.

## Running it

```
npm install
cp .env.example .env      # DATABASE_URL and JWT_SECRET at minimum
npm run db:migrate        # create or update the tables
npm run dev               # http://localhost:5000
npm test                  # 239 tests
```

Create the first admin with `npm run admin:create -- <username> <email> <password>`.

### Schema changes

`npm run db:generate` writes a migration from `shared/schema.ts`; commit it alongside.
`npm run db:migrate` applies anything outstanding, each in its own transaction, recorded
by content hash in `__resicard_migrations`.

`npm run db:migrate -- --baseline` records existing migrations as applied *without* running
them. That is for one situation only: a database whose tables were created by
`drizzle-kit push` before migrations existed. Once per database, then never again.

**Do not run migrations from a deployment's start command.** A failure there is a crash
loop with the real error buried in a repeating log, and more than one instance racing to
apply the same migration is a good way to corrupt a schema.

### A town to look at

```
npm run seed:demo -- --yes
```

24 invented outlets at real St Andrews addresses, 60 invented residents, six months of
redemption history, and enough variety that every plan state and trial state has something
to show. Every login is on the reserved `.test` domain; the password is `demo1234`.

The outlets are invented on purpose. Attaching a real photograph, or a real business name,
to an offer that business never agreed to would misrepresent them, so the artwork is drawn
in code and the names are made up. Addresses are real so the map is honest.

It refuses to run in production, refuses without `--yes`, and refuses over a database
holding any non-`.test` account unless `--force` is given as well. It deletes every
non-admin account. Never point it at a database with real members.

## Environment variables

Only the first three are required. Everything else has a working default, and features
whose keys are missing turn themselves off rather than failing: with no `RESEND_API_KEY`
email prints to the log, with no VAPID keys campaigns fall back to email and say so, with
no Stripe key memberships activate directly.

| Name | Purpose | Default |
|---|---|---|
| `DATABASE_URL` | Postgres connection string (`NEON_DATABASE_URL`, `POSTGRES_URL` also read) | required |
| `JWT_SECRET` | signs login tokens | required in production |
| `PUBLIC_BASE_URL` | every outgoing link is built from it | required in production |
| `RESIDENT_ANNUAL_FEE_GBP` | individual membership; household is 2x | 36 |
| `MERCHANT_STANDARD_MONTHLY_FEE_GBP` | Standard tier | 30 |
| `MERCHANT_INSIGHT_MONTHLY_FEE_GBP` | Insight tier, which adds analytics | 75 |
| `FREE_PLAN_LIVE_OFFER_LIMIT` | live offers allowed on Free | 2 |
| `FREE_TRIAL_DAYS` | trial for a first-time resident or outlet; 0 turns trials off | 90 |
| `ANALYTICS_MIN_COHORT` | town benchmarks hidden below this many outlets | 5 |
| `PUBLIC_COUNTER_MIN` | the public member counter stays hidden below this | 40 |
| `TOWN_NAME` | the town this instance serves | St Andrews |
| `LOCAL_POSTCODE_PREFIXES` | who counts as local. `KY16` is a whole district, `KY15 4` one sector | KY16,KY9,KY10,KY15 4,KY15 5 |
| `POSTCARD_CODE_DAYS` | how long a posted verification code stays valid | 60 |
| `POSTCARD_MAX_ATTEMPTS` | wrong-code attempts before a postcard is cancelled | 5 |
| `VERIFY_IN_PERSON_DETAILS` | where and when a resident can be verified in person | ask us |
| `MAP_TILE_URL`, `MAP_TILE_ATTRIBUTION` | tile provider. Served at runtime, so no rebuild to change it | unset, map falls back to a list |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | real payments | unset |
| `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` | outgoing email | unset |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | web push. Generate once and never rotate: new keys silently disconnect every resident who allowed notifications | unset |
| `JOBS_SECRET` | bearer token for `POST /api/jobs/daily`; empty closes the route | unset |
| `PREVIEW_MODE` | puts a notice on every public page saying the outlets shown are examples | false |
| `ADMIN_SETUP_SECRET` | enables `POST /api/auth/register-admin`. Unset it once the admin exists | unset |

Something has to run `npm run jobs:daily` once a day or renewal reminders never go out.

## Not done yet

Known and deliberate, in rough order of when it will matter:

- No rate limiting anywhere. Registration posts a physical card, so abuse costs real money.
- No security headers, and the JSON body limit is the same on every route.
- An address is kept after the postcard has been posted and the code accepted. It should be
  cleared at that point; only the postcode is needed afterwards.
- No way to anonymise a member on request. Deleting the row would rewrite merchants'
  historic figures, so it has to blank the person and leave the history.
- Admin accounts have no second factor, and JWTs last seven days and cannot be revoked.
- The postcode check is a prefix match, not a distance calculation.
