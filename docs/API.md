# Resicard API contract

All JSON. Authenticated routes take `Authorization: Bearer <jwt>`. The JWT payload is `{ id, username, role, merchantId? }`.
Errors: `{ message: string }` with a sensible status (400 validation, 401 no token, 403 wrong role/not allowed, 404, 409 conflict).
Validation uses the zod schemas in `shared/schema.ts`.

"Public user" means a `users` row with `password` and `documentFile` removed.

Merchant-facing routes resolve the merchant from `req.user.merchantId` (never from the body or URL).

## Auth `server/routes/auth.ts`

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | /api/auth/register | none | `registerSchema` | `{ user: PublicUser, token }`. Merchant registration also creates a `merchants` row (status pending, scanCode generated) and sets `users.merchantId`. Resident postcode must pass `isLocalPostcode()` in `server/lib/postcode.ts`. |
| POST | /api/auth/login | none | `loginSchema` | `{ user: PublicUser, token }` |
| GET | /api/auth/me | any | | `PublicUser` plus, for merchants, `merchant: Merchant` |
| POST | /api/auth/forgot-password | none | `{ email }` | `{ message }` always 200 |
| POST | /api/auth/reset-password | none | `{ token, password }` | `{ message }` |
| POST | /api/auth/register-admin | none | `{ username, email, password, firstName, surname, setupSecret }` | 403 unless `setupSecret === process.env.ADMIN_SETUP_SECRET` and that env var is set. |

## Profile and residency `server/routes/profile.ts`

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| PUT | /api/profile | any | `updateProfileSchema` | `PublicUser` |
| POST | /api/profile/document | resident | `submitDocumentSchema` | `PublicUser` (documentStatus pending) |
| GET | /api/membership | resident | | `{ status, expiry, annualFee, currency: "GBP", canRedeem: boolean, reasons: string[] }` where canRedeem requires residency approved and membership active |
| POST | /api/membership/checkout | resident | | If Stripe configured: `{ url }` Stripe Checkout session URL for the annual fee. If not configured (dev): activates membership for 12 months and returns `{ activated: true }`. |
| POST | /api/membership/cancel | resident | | `{ status }` |

## Public `server/routes/public.ts`

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | /api/merchants | none | approved merchants: `{ id, name, category, address, logoUrl, reservationProvider, reservationUrl, offerCount }[]` |
| GET | /api/offers | none | active, non-archived offers of approved merchants, each with `merchant: { id, name, category, logoUrl, address }`. Query: `?category=&merchantId=` |
| GET | /api/offers/:id | none | one offer with merchant |
| GET | /api/offers/:id/menu-pdf | none | the PDF bytes |
| GET | /api/stats | none | `{ activeOffers, merchants, redemptions, members }` |
| GET | /api/placeholder/:w/:h | none | SVG placeholder |

## Scan and redeem `server/routes/redemptions.ts`

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| GET | /api/scan/:scanCode | resident | | `{ merchant: { id, name, category, logoUrl, address }, offers: Offer[] (valid right now for this resident, see rules), loyalty: { program, balance, tier } \| null, canRedeem, reasons }` |
| POST | /api/redemptions | resident | `scanRedeemSchema` | `{ redemption: { id, code, redeemedAt, pointsAwarded }, offer: { id, title, type, percentOff, fixedPrice, shortPromo, terms }, merchant: { id, name, logoUrl }, resident: { firstName, surname, profilePhoto }, loyalty: { points, tierName } \| null }` |
| GET | /api/redemptions/mine | resident | | resident's redemptions newest first, each with offer title and merchant name |
| GET | /api/redemptions/:id | resident (own) | | same shape as the POST response, used to re-show the success screen |
| GET | /api/merchant/redemptions | merchant | `?from=&to=` | merchant's redemptions newest first, with offer title and `customerAlias` (use `generateCustomerAlias`), never the resident's name or email |
| GET | /api/merchant/redemptions/summary | merchant | | `{ today, thisWeek, thisMonth, allTime, byOffer: [{ offerId, title, count }] }` |

Redeem rules (`server/lib/offer-rules.ts`, pure functions, unit-testable):
1. Resident must have `isResidencyVerified` and `membershipStatus === "active"` with `membershipExpiry` in the future.
2. Merchant must be approved and `planStatus` in (trial, active).
3. Offer must be active, not archived, belong to that merchant, be within validFrom/validTo, match daysOfWeek and timeSlots for the current Europe/London time, and not fall in a blackout range.
4. Per-resident limits maxPerDay / maxPerWeek / maxLifetime and globalUsageLimit are counted from `redemptions`.
5. If `eligibleTiers` is non-empty the resident's current tier at that merchant must be in it.
6. On success: insert redemption with a 6-character uppercase code (no 0/O/1/I), increment `offers.usageCount`, and if the merchant has an active loyalty programme award points: `basketAmount * pointsPerCurrency` when basketAmount given, otherwise `pointsPerRedemption`; apply tier multiplier; write a `loyalty_events` row; upsert `loyalty_balances`; recalculate tier.

## Merchant `server/routes/merchant.ts`

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| GET | /api/merchant | merchant | | `Merchant` |
| PUT | /api/merchant | merchant | `updateMerchantSchema` | `Merchant` |
| POST | /api/merchant/logo | merchant | multipart `logo` | `{ logoUrl }` (store as base64 data URL in logoUrl) |
| GET | /api/merchant/scan-code | merchant | | `{ scanCode, url, qrDataUrl }` where url = `${PUBLIC_BASE_URL}/scan/${scanCode}` and qrDataUrl is a PNG data URL from the `qrcode` package |
| GET | /api/merchant/poster | merchant | | HTML page (A4, print-ready): merchant name, QR, "Scan with your Resicard to redeem local offers" |
| POST | /api/merchant/scan-code/rotate | merchant | | new `{ scanCode, url, qrDataUrl }` |
| GET | /api/merchant/offers | merchant | | own offers incl. archived, newest first |
| POST | /api/merchant/offers | merchant | `insertOfferSchema` | `Offer` |
| GET | /api/merchant/offers/:id | merchant | | `Offer` |
| PUT | /api/merchant/offers/:id | merchant | `updateOfferSchema` | `Offer` |
| POST | /api/merchant/offers/:id/toggle | merchant | | `Offer` (active flipped) |
| POST | /api/merchant/offers/:id/archive | merchant | | `Offer` |
| POST | /api/merchant/offers/:id/image | merchant | multipart `image` | `{ imageUrl }` |
| GET | /api/merchant/plan | merchant | | `{ planStatus, planStartedAt, planRenewsAt, monthlyFee, currency: "GBP", trialDays }` |
| POST | /api/merchant/plan/checkout | merchant | | Stripe Checkout `{ url }`, or in dev `{ activated: true }` |
| GET | /api/merchant/team | merchant | | staff users for this merchant `{ id, username, firstName, surname, hasPin }[]` |
| POST | /api/merchant/team | merchant | `{ username, email, password, firstName, surname, staffPin }` | creates a merchant-role user with same merchantId |
| DELETE | /api/merchant/team/:userId | merchant | | `{ ok: true }` (cannot remove owner) |

## Loyalty `server/routes/loyalty.ts`

Merchant side (merchant resolved from token):

| Method | Path | Body | Response |
|---|---|---|---|
| GET | /api/loyalty/program | | `{ program, tiers, rewards } \| null` |
| PUT | /api/loyalty/program | `insertLoyaltyProgramSchema` (partial) | creates or updates; `{ program, tiers, rewards }` |
| POST | /api/loyalty/tiers | `insertLoyaltyTierSchema` | tier |
| PUT | /api/loyalty/tiers/:tierId | partial | tier |
| DELETE | /api/loyalty/tiers/:tierId | | `{ ok }` |
| POST | /api/loyalty/rewards | `insertLoyaltyRewardSchema` | reward |
| PUT | /api/loyalty/rewards/:rewardId | partial | reward |
| DELETE | /api/loyalty/rewards/:rewardId | | `{ ok }` |
| GET | /api/loyalty/members | | `[{ userId, customerAlias, points, stamps, tierName, lastActivity }]` |
| POST | /api/loyalty/members/:userId/adjust | `{ amount, reason }` | balance |
| GET | /api/loyalty/events | `?limit=` | recent events with customerAlias |
| GET | /api/loyalty/analytics | | `{ members, activeMembers30d, pointsIssued30d, rewardsRedeemed30d, redemptions30d, byWeek: [{ weekStart, redemptions, pointsIssued }] }` |
| POST | /api/loyalty/earn | `{ staffPin, userId or redemptionCode, basketAmount }` | staff awards points for a purchase; validates the staff PIN belongs to a user of this merchant |

Resident side:

| Method | Path | Response |
|---|---|---|
| GET | /api/loyalty/mine | `[{ merchant: {id,name,logoUrl}, points, stamps, tier: {name,color,discountPercent} \| null, nextTier: {name, thresholdPoints} \| null, rewards: LoyaltyReward[] }]` |
| POST | /api/loyalty/redeem-reward | `{ merchantId, rewardId }` → deducts points, writes event, returns `{ balance, code }` |

## Admin `server/routes/admin.ts` (role admin)

| Method | Path | Response |
|---|---|---|
| GET | /api/admin/stats | `{ residents, verifiedResidents, activeMembers, merchants, pendingMerchants, pendingDocuments, offers, redemptionsThisMonth }` |
| GET | /api/admin/documents/pending | residents with documentStatus pending, including documentFile |
| POST | /api/admin/documents/:userId/approve | `PublicUser` |
| POST | /api/admin/documents/:userId/reject | body `{ reason }` → `PublicUser` |
| GET | /api/admin/merchants | all merchants with owner `{ id, email, firstName, surname }` and offerCount, `?status=` |
| POST | /api/admin/merchants/:id/approve | `Merchant` |
| POST | /api/admin/merchants/:id/reject | `Merchant` |
| GET | /api/admin/users | public users, `?role=` |
| GET | /api/admin/redemptions | newest 200 with merchant name, offer title, customerAlias |

## Server config `server/config.ts`

Reads env with defaults: `JWT_SECRET` (required in production, else throw), `DATABASE_URL`, `PUBLIC_BASE_URL`, `RESIDENT_ANNUAL_FEE_GBP` (default 25), `MERCHANT_MONTHLY_FEE_GBP` (default 30), `MERCHANT_TRIAL_DAYS` (default 90), `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ADMIN_SETUP_SECRET`, `LOCAL_POSTCODE_PREFIXES` (default `KY16,KY15,KY10,DD6`).

## Plans (added Sept 2026)

### Merchant plans: Free and Premium

`merchants.planStatus` is `free` or `premium`. New merchants start on Free. Config: `MERCHANT_PREMIUM_MONTHLY_FEE_GBP` (default 30), `FREE_PLAN_LIVE_OFFER_LIMIT` (default 2). The old `MERCHANT_MONTHLY_FEE_GBP` and `MERCHANT_TRIAL_DAYS` are removed.

Free includes: listing, up to `FREE_PLAN_LIVE_OFFER_LIMIT` live (active, non-archived) offers at once, day/time scheduling, the QR poster, redemption feed and counts.
Premium adds: unlimited live offers, the loyalty programme, analytics.

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | /api/merchant/plan | merchant | `{ planStatus, planStartedAt, planRenewsAt, premiumMonthlyFee, currency: "GBP", freeLiveOfferLimit, liveOfferCount, features: { unlimitedOffers, loyalty, analytics } }` where features are booleans for the current plan |
| POST | /api/merchant/plan/checkout | merchant | as before: Stripe `{ url }` or dev `{ activated: true }`; activation sets planStatus premium |
| POST | /api/merchant/plan/cancel | merchant | sets planStatus free (cancels Stripe sub if any); if the merchant then has more live offers than the free limit, the newest extras are set `active: false`; returns `{ planStatus, pausedOffers: number }` |

Enforcement:
- `POST /api/merchant/offers` with `active: true` and `POST /api/merchant/offers/:id/toggle` (turning on) return 403 `{ message: "Free plan allows N live offers. Upgrade to Premium for more.", code: "plan_limit" }` when the live count would exceed the limit on Free. Creating an offer with `active: false` is always allowed.
- Every merchant-side `/api/loyalty/*` route and `GET /api/loyalty/analytics` return 403 `{ message: "The loyalty programme is part of Premium.", code: "plan_required" }` on Free. Resident-side loyalty routes and `POST /api/redemptions` keep working, but no points are awarded and `GET /api/scan` returns `loyalty: null` when the merchant is on Free.
- `merchantRedeemReasons` no longer blocks on plan (Free merchants can be redeemed at); it still blocks unapproved merchants.

### Resident plans: individual and household

`users.membershipPlan` is `individual` or `household`. Household = two adults, children free (no card needed). Fee: `RESIDENT_ANNUAL_FEE_GBP` for individual, exactly 2x for household. Config unchanged.

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| GET | /api/membership | resident | | `{ plan, status, expiry, fees: { individual, household }, currency, canRedeem, reasons, household: { role: "primary" \| "member" \| null, code: string \| null (primary only), members: [{ id, firstName, surname, isResidencyVerified }] , primary: { firstName, surname } \| null (member only) } }`. For a household member, `status` and `expiry` are the primary's. |
| POST | /api/membership/checkout | resident | `membershipCheckoutSchema` | as before, using the plan's fee; activation sets membershipPlan and, for household, generates `householdCode` (8 chars, same alphabet as scan codes) if missing. A household member (has householdPrimaryId) gets 400 "You are covered by another household" |
| POST | /api/membership/cancel | resident | | as before; household members are left with householdPrimaryId intact but their derived status becomes inactive |
| POST | /api/household/join | resident | `householdJoinSchema` | joins the household whose primary has this code: 404 unknown code, 400 if the primary's plan is not household or already has a second adult, or the caller has an active individual membership or is a primary themselves. Sets `householdPrimaryId`. Returns the new `/api/membership` shape |
| POST | /api/household/leave | resident | | clears householdPrimaryId; returns `/api/membership` shape |
| DELETE | /api/household/members/:userId | resident (primary) | | removes the second adult; returns `/api/membership` shape |
| POST | /api/household/code/rotate | resident (primary) | | new code |

Effective membership (`server/lib/membership.ts`, pure): a user with `householdPrimaryId` inherits the primary's `membershipStatus` and `membershipExpiry` when the primary's plan is household; otherwise their own. `residentRedeemReasons` and `GET /api/scan` use the effective membership. Each adult still needs their own residency verification.

## Activity (added Sept 2026)

The resident "Activity" tab (`client/src/components/resident/activity-tab.tsx`) is built on two calls. No schema changes.

`GET /api/loyalty/mine` (resident) keeps every field it had and adds, per item:

| Field | Meaning |
|---|---|
| `lastActivityAt` | latest of `balance.updatedAt` and the newest loyalty event for that merchant and resident; the list is sorted by it, newest first |
| `tiers` | `[{ id, name, thresholdPoints, color }]`, threshold ascending |
| `claimable` | `LoyaltyReward[]`: active rewards the resident can afford now (`costPoints <= points`; on a stamps programme also `costStamps <= stamps`) |
| `nextReward` | `{ id, name, costPoints, pointsToGo } \| null`: the cheapest active points reward not yet affordable |

`GET /api/activity/mine` (resident, `server/routes/activity.ts`): one merged feed, newest first, at most 100 items.

| `kind` | Shape |
|---|---|
| `redemption` | `{ kind, id, at, merchant: {id,name,logoUrl}, title: offer title, code, pointsAwarded }` |
| `points` | `{ kind, id, at, merchant, title: "+15 points" or "+1 stamp", amount }` from `earn_points` / `earn_stamp` events |
| `reward` | `{ kind, id, at, merchant, title: "Claimed <reward name>", amount }` from `redeem_reward` events (amount is negative points) |
| `tier` | `{ kind, id, at, merchant, title: "Now Gold", amount: null }` from `tier_change` events |

`earn_points` events written by an offer redemption (`metadata.source === "redemption"`, or `metadata.redemptionId` set) are skipped, since the redemption row already carries `pointsAwarded`. `adjust` events are not shown.
