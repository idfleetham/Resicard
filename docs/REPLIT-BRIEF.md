# Brief for the Replit agent

Paste this whole document to the agent before it touches anything.

---

## What this is

The attached archive is the current Resicard codebase. It is **not** an increment
on what is in the Replit project today. The application was rebuilt from scratch
and the archive replaces the working tree entirely.

**This document is version-agnostic on purpose.** It describes how the codebase
works and how to deploy it, and it stays true from one archive to the next. For
what changed since the last one, read `docs/CHANGELOG.md`, which is generated
from the commit history and is the only place with version-specific detail.

Read `docs/API.md` before writing any code. It is the written contract for every
endpoint and every behaviour, written before the code and kept in step with it. If
something in the code and something in `docs/API.md` disagree, that is a bug worth
reporting, not a licence to pick one.

## Work you no longer have to repeat

You listed the things you redo after every archive. Most of it should not have
been yours to do, and it is handled in the codebase now:

- **`parked/` is deleted.** That was the original MVP kept for reference. It was
  imported by nothing, and it contained the two lines that logged
  `req.headers.authorization` and failed your security scan every time. It is in
  git history if it is ever wanted. The zip is smaller too.
- **The dependencies you kept upgrading are gone or upgraded.** Google Cloud
  Storage, jsPDF, node-forge, the WebSocket library, Uppy, passport, jszip and
  thirty others were removed outright in an earlier version because nothing
  imported them. `drizzle-orm` and `multer` are now on current versions.
- **The transitive advisories you kept overriding are pinned in `package.json`.**
  `uuid`, `fflate`, `fast-xml-parser`, `lodash`, `minimatch`, `brace-expansion`,
  `picomatch`, `nanoid`, `path-to-regexp`, `on-headers`, `body-parser`, `glob`,
  `tar-fs`, `ws`, and `postcss` bumped as a direct dependency. `npm audit --omit=dev`
  now reports **no high or critical findings in production dependencies**. Please
  do not remove the `overrides` block; it exists so this stops being your job.
- **Migrations now ship with the code.** See the install steps below. You should
  not have to write DDL by hand again.
- **Email, offer campaigns and referrals.** See the environment
  block for the keys they need. All three degrade safely: with no `RESEND_API_KEY`
  email prints to the log, and with no VAPID keys campaigns fall back to email
  only and the composer says so rather than pretending to send.
- **A demo dataset ships too.** `npm run seed:demo -- --yes` fills a development
  database with 24 invented outlets at real St Andrews addresses, 60 residents and
  six months of realistic trade, including members and outlets inside their free
  trial so every plan state has something to show. **Existing admin accounts are
  kept**; every other account and all outlet data is replaced. It refuses to run
  in production, refuses without `--yes`, and refuses over any user whose email is
  not a `.test` address unless `--force` is given as well. Never run it against a
  database with real members.

Deliberately **not** done: vite and vitest are held at their current majors. They
are build tooling and never run in production, so their advisories do not reach
the deployed application, and a jump from vite 5 to vite 8 risks breaking a
working build for no security gain. If your scanner insists, say so and it can be
looked at properly rather than rushed.

## How to install it

**Preserve these; the zip must not overwrite or delete them:** `.replit`,
`replit.nix`, `.git`, `.agents`, `.local`, `node_modules`, `scripts/post-merge.sh`,
any Replit runtime or cache directories, and the secrets configuration. Everything
else in the working tree is replaced.

0. Read `docs/CHANGELOG.md` first. It says what changed since the last archive,
   and it is generated from the commit history rather than written by hand, so it
   does not go stale.
1. Take a copy of the current project first, and export the database.
2. Unpack the zip over the working tree, preserving the list above.
3. `npm install`
4. Set the environment variables in the "Environment" section below.
5. **Database.** Which of these applies depends on the database, and it matters:

   **The existing development database, whose tables were created by
   `drizzle-kit push`:** run `npm run db:migrate -- --baseline` **once**. That
   records the baseline migration as applied without executing it, because the
   tables already exist. Every future migration then applies normally with
   `npm run db:migrate`. Never run `--baseline` on that database again.

   **A fresh or empty database:** run `npm run db:migrate`. It creates everything.

   `npm run db:reset -- --yes` still exists and still drops every table. It is for
   throwaway databases only. Do not point it at anything with real data.

6. `npm run build` then `npm start`.
7. Create the first admin account, then unset `ADMIN_SETUP_SECRET` and redeploy.
8. Delete the uploaded zip from the project so it is not deployed.

## Do not run migrations from the deploy command

`npm run db:migrate` belongs in a one-off shell command, not in the deployment's
run command. Two reasons, and the first has already bitten this project:

- If the migration fails, the process exits, the healthcheck fails, and the
  platform restarts it, which fails identically. That is a crash loop with the
  real error buried in a repeating log, and the app never serves a page even
  though the failure has nothing to do with serving pages.
- Autoscale runs more than one instance. Several of them racing to apply the same
  migration is a good way to corrupt a schema.

The deployment run command should be **`npm start`** and nothing else. Apply
migrations deliberately, from the shell, against the database the deployment
actually uses, before deploying the version that needs them.

**A baseline is recorded per database.** Running `--baseline` against the
development database does nothing for the deployment's. If they are separate
databases, each needs it once.

## Schema changes from here on

`npm run db:generate` writes a new SQL migration from `shared/schema.ts` into
`migrations/`. Commit it with the schema change. `npm run db:migrate` applies
anything outstanding, each migration in its own transaction, recorded in
`__resicard_migrations` by content hash.

**Do not run `drizzle-kit push` against any database with real data**, and do not
answer its rename prompts. You were right to refuse those: push cannot tell a
rename from a drop and a create, and picking wrong loses a column.

## Rules for working in this codebase

These are not stylistic preferences. Breaking them will break things that are load
bearing.

**Do not restructure anything.** No renaming files, no moving modules, no
"improving" the folder layout, no swapping libraries. The structure is deliberate.

**`shared/schema.ts` is the single source of truth for data.** Both the server and
the client import from it. Change it only when a feature genuinely needs a new
column, and never rename an existing column casually: `drizzle-kit push` reads a
rename as a drop plus a create, and on real data that loses it.

**Business rules live in `server/lib/` and are pure and unit-tested.** `savings.ts`,
`loyalty.ts`, `offer-rules.ts`, `membership.ts`, `plan.ts`, `revenue.ts`,
`price-changes.ts`, `trial.ts`, `analytics.ts`. They take arguments and return
values, with no database access and no clock of their own. If you need to change a
rule, change it there and update its test. **Do not duplicate a rule into a route
handler.** There are 217 tests; they all pass; keep it that way.

**Routes are thin.** `server/routes/` validates input, calls `server/storage/` for
data and `server/lib/` for decisions, and returns JSON. No SQL in a route, no
business logic in a route.

**Components stay under about 300 lines.** If one is growing past that, split it,
the way `client/src/components/merchant/analytics/` is already split.

**Every file has a short comment at the top saying why it exists.** Match that.
Comments explain reasoning, not mechanics. Do not write `// loop over offers`.

## Things that look wrong but are deliberate

Do not "fix" any of these.

- **Points expire on inactivity, not per point.** The clock runs from the
  resident's last event at that outlet, so an active customer never loses
  anything. Do not "fix" this into per-point ageing. `MIN_EXPIRY_DAYS` is 90 and a
  lower setting is raised to it rather than honoured.
- **An offer's picture is stored on the row, not computed on read.** Changing how
  artwork is drawn does not reach offers that already exist. `npm run art:repaint`
  updates them in place, and touches only images this codebase drew, never an
  uploaded photograph. Do not "fix" this by generating the image on read.
- **Checkout Sessions pass `managed_payments: { enabled: false }`, and line items
  still carry a `tax_code`.** Managed Payments covers digital products only, and a
  membership that buys a discount in a pub is not one, so it is turned off per
  session rather than left to an account setting. The tax codes are correct in
  their own right and are what Stripe Tax would use. Do not remove either, and do
  not swap the tax codes for a digital-goods code to make Managed Payments accept
  them: that would misdescribe what is being sold.
- **The service worker deliberately does not cache.** A stale cached bundle after a
  deploy is a far worse problem than a slightly slower load.
- **Merchants never see a resident's name.** They see an alias from
  `generateCustomerAlias`. This is a hard rule, not a placeholder.
- **Analytics suppress anything below `ANALYTICS_MIN_COHORT` (5).** Town benchmarks
  disappear below that. That is the point.
- **`savedAmount` is frozen onto the redemption row at redemption time** rather
  than computed on read, so a merchant editing an offer later cannot rewrite
  anyone's savings history.
- **Savings deliberately understate.** A redemption with nothing to estimate from
  contributes zero rather than a guess. Do not add a fallback estimate.
- **Tier status is rolling**, derived from `loyalty_events` inside a window, not
  from the points balance. Writing a balance without an event is wrong.
- **`plan_status` on merchants may still read `premium` on old rows.** It is
  normalised to `standard` by `normalisePlan`. Do not "clean it up" without writing
  a migration.
- **The resident-facing name of the paid plan is "Member".** The database column is
  still `membershipStatus` and the wire value is still `premium`. Only the words a
  person reads changed. Do not rename the column to match the label.
- **The map falls back to a list when no tile provider is configured.** That is
  correct behaviour, not a bug. It stays a list until `VITE_MAP_TILE_URL` is set
  to an Ordnance Survey key, and because it is a `VITE_` variable it is baked in
  at build time: setting it requires a rebuild, not just a restart.
- **`residentAnnualFeeGbp` is 36 but the app quotes £3 a month.** Billing is annual,
  the quote is monthly. Both are intentional.
- **Campaign limits are the feature, not a setting.** One send per merchant per 7
  days, 4 a calendar month, nothing outside 08:00 to 20:00 London, no free text,
  140 characters. A merchant cannot change any of them and neither should you. The
  quickest way to lose every resident is a scheme that spams them.
- **Campaign email is opt-in and default off**, separately from push. Push consent
  is the browser permission prompt; email is direct marketing under PECR and needs
  its own explicit tick. Do not merge the two into one switch.
- **Referrals credit only when the referred member actually pays**, not on sign-up
  and not during the trial. Crediting earlier would let one person with ten email
  addresses farm free membership in an afternoon.
- **`email_log` has a unique dedupe key** so the daily job can be run as often as
  you like without sending anything twice. Do not remove the constraint.

## Environment

**Replit keeps workspace secrets and deployment secrets separately.** A variable
set only in the workspace does not reach a deployed app. The three marked required
below must exist on the **deployment**, or it will crash-loop on start with a
message naming exactly what is missing.

Must be set before this works properly:

```
JWT_SECRET=                 # REQUIRED. Production refuses to start without it
DATABASE_URL=               # REQUIRED
PUBLIC_BASE_URL=https://resicard.co.uk   # REQUIRED. NOT the .replit.app host
ADMIN_SETUP_SECRET=         # set once to create the admin, then remove
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=      # webhook must send invoice.paid,
                            # checkout.session.completed,
                            # customer.subscription.deleted
STRIPE_TAX_CODE_MEMBERSHIP=      # optional; defaults to txcd_20030000
STRIPE_TAX_CODE_MERCHANT_PLAN=   # optional; defaults to txcd_10103001
MAP_TILE_URL=               # Ordnance Survey, see below
MAP_TILE_ATTRIBUTION=
RESEND_API_KEY=             # email; without it messages print to the log
EMAIL_FROM=                 # e.g. Resicard <hello@resicard.co.uk>
EMAIL_REPLY_TO=
JOBS_SECRET=                # bearer token for POST /api/jobs/daily
PREVIEW_MODE=true           # while the site carries demo data; remove before real members
VAPID_PUBLIC_KEY=           # web push; without these, campaigns email only
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=              # mailto:hello@resicard.co.uk
```

**The VAPID keys must never be rotated after launch.** New keys silently
invalidate every push subscription residents have already granted, and there is
no way to ask for permission again without them noticing. Generate them once,
store them, and treat them like the JWT secret.

**`npm run jobs:daily` needs to run once a day** for renewal reminders to go out.
Either schedule the script, or have a scheduled deployment call
`POST /api/jobs/daily` with the `JOBS_SECRET` as a bearer token. It is idempotent,
so running it more often is harmless and missing a day loses nothing.

Ordnance Survey OS Maps API is the chosen tile provider:

```
MAP_TILE_URL=https://api.os.uk/maps/raster/v1/zxy/Light_3857/{z}/{x}/{y}.png?key=YOUR_KEY
MAP_TILE_ATTRIBUTION=Contains OS data © Crown copyright and database right 2026
```

The key is public in the browser bundle, so it must be restricted by referrer in
the OS Data Hub console.

Everything else has a sensible default and does not need setting:
`RESIDENT_ANNUAL_FEE_GBP` (36), `MERCHANT_STANDARD_MONTHLY_FEE_GBP` (30),
`MERCHANT_INSIGHT_MONTHLY_FEE_GBP` (75), `FREE_PLAN_LIVE_OFFER_LIMIT` (2),
`FREE_TRIAL_DAYS` (90), `POSTCARD_CODE_DAYS` (60), `POSTCARD_MAX_ATTEMPTS` (5),
`ANALYTICS_MIN_COHORT` (5), `PUBLIC_COUNTER_MIN` (40), `TOWN_NAME`,
`LOCAL_POSTCODE_PREFIXES`, `MAP_CENTRE_LAT`, `MAP_CENTRE_LNG`.

## What to do first, in this order

Do these one at a time. After each, run `npx tsc --noEmit`, `npx vitest run` and
`npx vite build`, and report back before starting the next. Do not batch them.

### 1. Rate limiting

There is none anywhere. Add `express-rate-limit` and apply strict limits to:

- `POST /api/auth/login` — credential stuffing
- `POST /api/auth/register` — this endpoint causes postcards to be posted, so
  abuse costs real money
- the postcard code confirmation endpoint — five attempts per postcard is not the
  same as five attempts across a thousand accounts
- the household join endpoint — the code grants free membership

Key on IP and on account where there is one, with a longer lockout after repeated
failures. Do not rate limit the redemption endpoint; a busy Friday at a pub is
legitimate traffic.

### 2. Security headers and body size

Add `helmet` with a Content Security Policy allowing only this origin, the Stripe
domains and `api.os.uk`. Then lower the JSON body limit, currently 10 MB on every
route, to something small like 256 KB, and raise it only on the two routes that
accept a profile photo and a menu PDF.

### 3. Delete the address after verification

In the postcard confirmation handler, once a code is accepted, clear
`addressLine1` and `addressLine2` on the user. The address exists to post a card;
after that only the postcode is needed. Keeping it is data held with no ongoing
purpose.

### 4. An anonymise function for erasure requests

A resident can ask to be deleted and there is a one-month deadline. Deleting the
row will fail, because redemptions reference it, and cascading would silently
rewrite merchants' historic figures. Write a function that clears name, email,
address, photo and Stripe ids, marks the row anonymised, and leaves
the redemptions attached to a subject who is no longer a person. Add an admin
action that calls it.

### 5. Point the deploy at migrations

Change the deployment step so it runs `npm run db:migrate` before `npm start`,
and make sure `drizzle-kit push` appears nowhere in any workflow.

## What NOT to do

- Do not add authentication libraries, an ORM, a state manager, a component
  library or a CSS framework. Everything needed is present.
- Do not add analytics or tracking scripts of any kind. Not Google Analytics, not
  a session recorder, not a heatmap tool. The entire proposition rests on
  residents believing they are not being tracked.
- Do not change the brand colours, fonts or spacing. They are in
  `client/src/index.css` and they are settled.
- Do not hand-edit anything in `client/public/brand`. Every SVG there is written
  by `npm run brand:assets` from `scripts/brand-assets.mjs`, which holds the
  geometry, the colours and the buoy-once rule. Edit the script and re-run it, or
  the next run silently reverts you. The PNG icons are rasterised from those SVGs
  and committed; the script prints what it wrote.
- Do not add features that were not asked for. If you think something is missing,
  say so and wait.
- Do not "improve" copy. The wording is deliberate, it is UK English, it is
  sentence case, and it avoids a specific list of words. If a string reads oddly to
  you, flag it rather than rewriting it.
- Do not commit secrets, and do not put a real API key in `.env.example`.
- Do not restore anything from the deleted `parked/` directory.
- Do not remove the `overrides` block from `package.json`.

## Known issues you may pick up

These are real and worth fixing when convenient, but they are not urgent:

- The merchant redemptions table is cramped on a phone; offer titles wrap to three
  lines and the code column falls off the right. It wants a card layout on small
  screens rather than a table.
- Password reset emails are written to the console. An email provider is needed.
- The admin account has no second factor.
- JWTs last seven days and cannot be revoked. A `tokenVersion` integer on the user
  row, included in the token and checked per request, is the cheap fix.

## How to verify anything you change

```
npx tsc --noEmit     # must be clean
npx vitest run       # 217 tests, all must pass
npx vite build       # must succeed
```

If you change anything a person looks at, take a screenshot at 390px wide and
check it before saying you are done. Several bugs in this codebase were found that
way and would not have been found any other way.
