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
| GET | /api/loyalty/members | | `[{ userId, customerAlias, points, tierName, lastActivity }]` |
| POST | /api/loyalty/members/:userId/adjust | `{ amount, reason }` | balance |
| GET | /api/loyalty/events | `?limit=` | recent events with customerAlias |
| GET | /api/loyalty/analytics | | `{ members, activeMembers30d, pointsIssued30d, rewardsRedeemed30d, redemptions30d, byWeek: [{ weekStart, redemptions, pointsIssued }] }` |
| POST | /api/loyalty/earn | `{ staffPin, userId or redemptionCode, basketAmount }` | staff awards points for a purchase; validates the staff PIN belongs to a user of this merchant |

Resident side:

| Method | Path | Response |
|---|---|---|
| GET | /api/loyalty/mine | `[{ merchant: {id,name,logoUrl}, points, tier: {name,color,discountPercent} \| null, nextTier: {name, thresholdPoints} \| null, rewards: LoyaltyReward[] }]` |
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
| `claimable` | `LoyaltyReward[]`: active rewards the resident can afford now (`costPoints <= points`) |
| `nextReward` | `{ id, name, costPoints, pointsToGo } \| null`: the cheapest active points reward not yet affordable |

`GET /api/activity/mine` (resident, `server/routes/activity.ts`): one merged feed, newest first, at most 100 items.

| `kind` | Shape |
|---|---|
| `redemption` | `{ kind, id, at, merchant: {id,name,logoUrl}, title: offer title, code, pointsAwarded }` |
| `points` | `{ kind, id, at, merchant, title: "+15 points", amount }` from `earn_points` events |
| `reward` | `{ kind, id, at, merchant, title: "Claimed <reward name>", amount }` from `redeem_reward` events (amount is negative points) |
| `tier` | `{ kind, id, at, merchant, title: "Now Gold", amount: null }` from `tier_change` events |

`earn_points` events written by an offer redemption (`metadata.source === "redemption"`, or `metadata.redemptionId` set) are skipped, since the redemption row already carries `pointsAwarded`. `adjust` events are not shown.

## Reward claims and tier benefits (added Sept 2026)

Tiers: `loyaltyTiers.benefits` is a list of short lines the merchant writes; `discountPercent` is optional (null = none) and only means a flat discount staff apply for that tier. Any other discount is an offer with `eligibleTiers`.

Claiming a reward now creates a `reward_claims` row and is shown to staff on the same green screen as a redemption.

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | /api/loyalty/redeem-reward | resident | `{ merchantId, rewardId }` | `{ claim: { id, code, claimedAt, pointsSpent }, reward: { id, name, terms }, merchant: { id, name, logoUrl }, resident: { firstName, surname, profilePhoto }, loyalty: { points, tierName, tierBenefits: string[], tierDiscountPercent: number \| null } }` (deducts points, writes a `redeem_reward` event with `metadata.claimId`) |
| GET | /api/reward-claims/:id | resident (own) | | same shape, for re-showing the screen |
| GET | /api/redemptions/:id | resident (own) | | now also includes `loyalty.tierBenefits` and `loyalty.tierDiscountPercent` (both from the resident's current tier at that merchant, empty/null if none) |
| POST | /api/redemptions | resident | | response `loyalty` gains the same two fields |
| GET | /api/merchant/redemptions | merchant | | items gain `kind: "redemption" \| "reward"`; reward items have `offerTitle` = reward name, `offerId` = null, `rewardId`, `pointsSpent`. Both kinds interleaved newest first |
| GET | /api/merchant/redemptions/summary | merchant | | gains `rewardsAllTime` and `rewardsThisMonth` |
| GET | /api/activity/mine | resident | | reward items now carry `claimId` and link target `/reward-claims/:id` |

## Tier benefits as rewards, loyalty card, rolling tiers (added Sept 2026, supersedes "tier benefits" above)

- `loyaltyTiers.benefits` is removed. A tier benefit is a `loyaltyRewards` row with `tierId` set and `costPoints` 0 or null, plus a `claimRule`: `once` (one claim ever), `weekly` (one per calendar week, Mon to Sun, Europe/London), `monthly` (one per calendar month), `unlimited`. `claimRule` also applies to points rewards. A reward with `tierId` can be claimed by members of that tier or any higher tier (by sortOrder/threshold).
- Tier status is rolling: `statusPoints` = sum of positive `earn_points` (and `adjust` with positive amount) event amounts in the last `program.tierWindowDays` days. The resident's tier is the highest tier with `thresholdPoints <= statusPoints`, computed on read (`server/lib/loyalty.ts` `resolveStatus`), and `loyalty_balances.tierId` is refreshed whenever it is computed. `balance.points` stays the spendable balance and is unaffected by tier calculation.
- Everywhere a tier is reported (`/api/loyalty/mine`, `/api/scan`, redemption and claim responses, merchant members list) include `statusPoints`, `tierWindowDays`, and `nextTier` computed from statusPoints.

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | /api/loyalty/mine | resident | each item gains `statusPoints`, `tierWindowDays`, `tierDiscountPercent`, and `benefits: Reward[]` (tier rewards the resident is entitled to, each with `claimable: boolean` and `nextClaimAt: string \| null` per claimRule); `claimable` (points rewards) unchanged; `rewards` lists points rewards only |
| GET | /api/loyalty/card/:merchantId | resident | `{ merchant: { id, name, logoUrl }, resident: { firstName, surname, profilePhoto }, points, statusPoints, tierWindowDays, tier: { name, color, discountPercent } \| null, nextTier, memberSince }` — the outlet loyalty card, shown to staff for a flat tier discount |
| POST | /api/loyalty/redeem-reward | resident | as before; for tier benefits deducts nothing; enforces `claimRule` (400 "Already claimed this week/month", "Already claimed") and tier entitlement (403) |
| PUT | /api/loyalty/program | merchant | accepts `tierWindowDays` |
| POST/PUT | /api/loyalty/rewards | merchant | accept `tierId`, `claimRule`, `costPoints` 0/null |

Resident-side pages: `/loyalty/:merchantId` renders the outlet loyalty card (sea card like the membership card, live clock, tier and discount line, benefits list with Claim buttons).

## Revenue (admin) (added Sept 2026)

Every membership activation, renewal, cancellation and merchant plan change writes a `subscription_events` row (`server/lib/ledger.ts`: `recordSubscriptionEvent`). Called from the dev activation paths, the Stripe webhook, and cancel routes. `npm run ledger:backfill` inserts `started` rows (source backfill) for currently active memberships and premium merchants that have none.

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | /api/admin/revenue | admin | see below |
| GET | /api/admin/revenue/events | admin | `?limit=200` newest ledger rows with subjectName |
| GET | /api/admin/revenue/export.csv | admin | the same as CSV |

`GET /api/admin/revenue` returns:
```
{
  fees: { individual, household, merchantPremiumMonthly },
  now: {
    residents: { active, individual, household, cancelled, expiringIn30Days },
    merchants: { premium, free, approved },
    runRate: { monthly, annual }   // merchants premium x monthly fee + active resident annual fees / 12
  },
  history: [{ month: "2026-09", residents: number, merchants: number, total: number, newResidents: number, renewedResidents: number, cancelledResidents: number, newMerchants: number, cancelledMerchants: number }]  // last 12 months from the ledger (amounts collected)
  cliffs: {
    residents: [{ month, count, individual, household, amount }],   // memberships expiring in each of the next 12 months, amount = renewal value at current fees
    merchants: [{ month, count, amount }],                           // premium plans due to renew in each month (planRenewsAt, or monthly anniversary of planStartedAt)
    next30Days: [{ kind, subjectId, name, plan, expiresAt, amount }]  // sorted soonest first
  },
  schedule: {
    residentExpiries: [{ month, individual, household }],   // next 24 months
    premiumMerchants: number,
    activeIndividual: number, activeHousehold: number
  }
}
```
The client builds the forecast from `schedule` with adjustable assumptions (resident renewal rate, merchant monthly churn, new residents and new premium merchants per month), so no forecast logic lives on the server beyond the schedule.

## Residency verification by postcard or in person (added Sept 2026, replaces document upload)

`users.documentType/documentFile/documentStatus/...` are removed. Residents have `addressLine1`, `addressLine2`, `town`, `postcode`. Verification sets `isResidencyVerified`, `verifiedAt`, `verificationMethod` (`postcard` | `in_person`) and, for in person, `verifiedBy`. Nothing about documents is stored anywhere.

Postcard flow: resident requests a postcard → admin sees it in a queue, prints the batch (A6 cards, address and code), marks them posted → resident enters the code from the card → verified. Config: `POSTCARD_CODE_DAYS` (default 60), `POSTCARD_MAX_ATTEMPTS` (default 5). Codes use HUMAN_ALPHABET, 6 characters, stored as sha256; the plain code exists only in the print sheet at posting time, so the print sheet must be generated when the admin marks the batch as posted (the code is generated then and returned once). Address changes after a postcard is requested cancel any open postcard.

Resident:

| Method | Path | Body | Response |
|---|---|---|---|
| GET | /api/verification | | `{ verified, verifiedAt, method, address: { addressLine1, addressLine2, town, postcode }, postcard: { status, requestedAt, postedAt, expiresAt, attemptsLeft } \| null, canRequestPostcard: boolean, reason?: string }` (a resident can request when not verified and no postcard is requested/posted and address is complete) |
| POST | /api/verification/postcard | | requests a postcard; 400 if address incomplete or one is already open; returns the GET shape |
| POST | /api/verification/postcard/code | `postcardCodeSchema` | checks the code against the open posted postcard (case-insensitive); success sets verified (method postcard), marks the postcard used; wrong code increments attempts, 400 "Wrong code, N attempts left"; after max attempts the postcard is cancelled and the resident can request another; expired → 400 with a message and canRequestPostcard true |
| PUT | /api/profile | `updateProfileSchema` | address fields accepted; changing address on a verified resident clears verification (they must verify again) and cancels open postcards |

Registration (`registerResidentSchema`) now takes `addressLine1`, `addressLine2`, `town`; postcode still checked by prefix.

Admin:

| Method | Path | Body | Response |
|---|---|---|---|
| GET | /api/admin/postcards | `?status=requested\|posted\|used\|expired\|cancelled` (default requested) | list with resident name, address snapshot, requestedAt, postedAt, expiresAt |
| POST | /api/admin/postcards/post | `{ ids: string[] }` | generates codes for those requested postcards, sets status posted, expiresAt = now + POSTCARD_CODE_DAYS; returns `{ posted: [{ id, name, address, code }] }` — the ONLY time codes are returned in plain text |
| GET | /api/admin/postcards/print?ids=a,b,c | | HTML print sheet (must be fetched right after `post`, with the codes passed back in from the client, OR simpler: `post` returns the HTML print sheet directly as `{ posted, printHtml }`; implement the latter) |
| POST | /api/admin/postcards/:id/cancel | | cancels |
| POST | /api/admin/residents/:userId/verify | `{ note?: string }` | in-person verification: sets verified, method in_person, verifiedBy = admin; cancels open postcards |
| POST | /api/admin/residents/:userId/unverify | | clears verification |
| GET | /api/admin/residents | `?q=&verified=` | residents list with name, email, address, verified, method, membership status; for the in-person desk |

Remove: `POST /api/profile/document`, `GET /api/admin/documents/pending`, `/approve`, `/reject`. `GET /api/admin/stats` replaces `pendingDocuments` with `postcardsToPost`.

`residentRedeemReasons` unchanged ("Residency not yet verified").

## Resident Free and Premium (added Sept 2026)

Every verified resident has a card. `users.membershipStatus` active = Premium; anything else = Free. There is no separate column: "Free" is the name of the state where a resident has no active paid membership.

- Free: verified card, browse offers, earn loyalty points and tier status at Premium outlets, claim tier benefits and points rewards, show the outlet loyalty card. Cannot redeem resident offers.
- Premium (annual, individual or household): everything in Free plus redeeming offers.
- Downgrade = stop the membership at the end of the paid period (`membershipStatus` stays active until `membershipExpiry`, then becomes `inactive`; Stripe subscription cancelled at period end). Points, tiers, claims and history are untouched. Cancel = the same thing; the UI offers "Move to Free at renewal" first and only then "Cancel now" which ends access immediately (no refund; sets status cancelled).

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| GET | /api/membership | resident | | gains `tier: "free" \| "premium"`, `renews: boolean` (false once a downgrade is scheduled), `endsAt` (the expiry when a downgrade is scheduled), and `pointsKept: true` |
| POST | /api/membership/downgrade | resident (primary or individual) | | schedules the downgrade: sets `users.membershipRenews = false` (new boolean column, default true); cancels the Stripe subscription at period end if one exists; ledger event `cancelled` with periodEnd = expiry; returns the GET shape |
| POST | /api/membership/resume | resident | | undoes a scheduled downgrade before expiry: `membershipRenews = true`; returns GET shape |
| POST | /api/membership/cancel | resident | | unchanged (immediate) |

`residentRedeemReasons`: for a Free resident the reason is "Premium membership needed to redeem offers" (replaces "Membership not active"). `GET /api/scan` still returns loyalty for Free residents at Premium outlets; the offers list is still returned but `canRedeem` false with that reason. Loyalty routes never check membership.

Admin revenue: a scheduled downgrade counts in the cliffs as an expiry that will not renew (`residents[].notRenewing` count added to each cliff month, and `now.residents.notRenewing`).

## Free trial and Stripe renewals (added Sept 2026)

The first three months are free for both residents and merchants. Card details are taken at
sign-up, so the trial converts on its own; no one has to come back and pay.

Config: `FREE_TRIAL_DAYS` (default 90, `server/config.ts` as `config.freeTrialDays`). Set it to
0 to switch trials off everywhere - checkouts then charge immediately and every `trialDays*`
field below reports 0.

### Who gets a trial

A trial is only for a subject who has **never paid**. `hasEverPaid(kind, subjectId)`
(`server/lib/ledger.ts`, backed by `hasPaidAmount` in `server/storage/ledger.ts`) is true when
any `subscription_events` row for that subject has `amountGbp > 0`. Trial activations are
written to the ledger with amount 0, so a trial never counts as revenue and never blocks
itself. A returning member - anyone who has paid before, including someone who cancelled and
came back - pays straight away.

`trialDaysFor(kind, subjectId)` (`server/lib/stripe.ts`) returns `config.freeTrialDays` when
`hasEverPaid` is false and the config is above 0, otherwise 0. The pure part of that decision
is `trialDaysFrom(hasPaidBefore, freeTrialDays)` in `server/lib/trial.ts`.

### Checkout

Both `createMembershipCheckout` and `createMerchantPlanCheckout` pass
`subscription_data.trial_period_days` when the subject is due a trial, and set
`payment_method_collection: "always"` so the card is collected during the trial.

Without a Stripe key (development), the checkout routes activate directly through
`activateMembershipForCheckout` / `activateMerchantPlanForCheckout`: a first-time subject gets
expiry = now + `FREE_TRIAL_DAYS` and a ledger row of 0; a returning subject gets the normal
full period at the full fee.

`activateMembership` and `activateMerchantPlan` both take an optional last argument
`opts?: { periodEnd?: Date; amountGbp?: number }`. `periodEnd` replaces the computed +12 months
(resident) or +1 month (merchant); `amountGbp` replaces the fee on the ledger row. Existing
callers that pass neither behave exactly as before.

### Webhook: `invoice.paid`

New handler alongside `checkout.session.completed` and `customer.subscription.deleted`. It
extends the membership or plan to the period the invoice paid for and writes a `renewed` ledger
event with the real amount from the invoice. This is what makes a trial convert into a paid
membership, and it is also the fix for year-two renewals, which previously never extended
`membershipExpiry` in our database.

The rules live in `renewalFromInvoice` (`server/lib/trial.ts`, pure and unit tested). An invoice
is acted on only when all of these hold:

- `billing_reason === "subscription_cycle"`. Anything else (notably `subscription_create`) is a
  sign-up invoice that `checkout.session.completed` has already recorded - acting on both would
  double-count the sale. Trial conversion and later renewals are both cycles, so one rule covers
  both.
- `amount_paid > 0`. The £0 invoice Stripe raises when a trial starts is ignored, so a trial
  sign-up shows no revenue.
- The subscription metadata carries our `kind` (`membership` or `merchant_plan`) and the
  matching `userId` / `merchantId`.

The new period end is read from the invoice's first line item `period.end` (falling back to
`invoice.period_end`). Note it is **not** read from `subscription.current_period_end`: on the
Basil API version that field lives on subscription items, not on the subscription.

`setCancelAtPeriodEnd`, `cancelSubscription` and the `customer.subscription.deleted` handler are
unchanged.

### Reporting the trial

| Method | Path | Auth | Response additions |
|---|---|---|---|
| GET | /api/membership | resident | `inTrial: boolean` (membership current and `hasEverPaid` false), `trialEndsAt: string \| null` (the expiry while in trial), `trialDaysAvailable: number` (what this resident would get if they joined now; 0 once they have paid) |
| GET | /api/merchant/plan | merchant | the same three fields, where `inTrial` is Premium plus never charged and `trialEndsAt` is `planRenewsAt` |

For a household member the paying subject is the primary, so `inTrial` and `trialDaysAvailable`
are read against the primary's id.

### Client

- `membership-status.tsx`: with `trialDaysAvailable > 0` the plan chooser's button reads "Start
  3 months free" and a line under the price cards reads "Free until your first payment in 3
  months. Cancel any time before then." While `inTrial` the sand block keeps the heading
  "Premium membership", shows a sand "Free trial" pill, and reads "Free until DD Mon YYYY, then
  £X a year." above the usual downgrade and cancel actions.
- `digital-membership-card.tsx`: the date block reads "FREE UNTIL" with the trial end date
  instead of "RENEWS".
- `merchant/plan-tab.tsx`: the Premium button reads "Start 3 months free" with "Card details
  taken now, first payment in 3 months." underneath; while in trial the card shows a sand "Free
  trial" pill and "Free until DD Mon YYYY, then £X a month."
- The wording "3 months" is derived from the day count by `trialLengthLabel` in
  `client/src/components/resident/format.ts`: whole 30-day multiples read as months, anything
  else as "N days". Fees are always read from the API, never hardcoded.

### Deploying against real Stripe

`invoice.paid` must be enabled on the webhook endpoint in the Stripe dashboard; without it
trials never convert in our database and second-year payments are taken by Stripe but never
extend the membership. Keep `checkout.session.completed` and `customer.subscription.deleted`
enabled too.

## Outlets and favourites (added Sept 2026)

A resident can star an outlet. Favourites are stored server-side (`favourites`, one row per resident and merchant) so they follow the resident between devices, and the count is a useful thing to show a merchant.

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | /api/outlets | resident | every approved merchant: `{ id, name, category, address, logoUrl, reservationProvider, reservationUrl, isFavourite, liveOfferCount, bestOffer: { id, title, headline } \| null, loyalty: { points, tierName } \| null }`. Sorted favourites first, then by name. `bestOffer` is the featured offer if there is one, else the first live one; `headline` is a short label the client can print as-is ("20% off", "£15", "Free"). |
| GET | /api/outlets/:id | resident | one outlet in the same shape plus `offers: Offer[]` (live now, same rules as /api/scan but without the resident's per-day limits applied, so they can see what is normally on), `allOffers: Offer[]` (active, whether or not live at this moment), `loyalty: { points, statusPoints, tier, nextTier, benefits, rewards } \| null` |
| PUT | /api/favourites/:merchantId | resident | adds; `{ isFavourite: true }`. Idempotent. 404 for an unknown or unapproved merchant |
| DELETE | /api/favourites/:merchantId | resident | removes; `{ isFavourite: false }` |
| GET | /api/merchant/redemptions/summary | merchant | gains `favourites: number` (how many residents have starred this outlet) |
| GET | /api/admin/merchants | admin | each row gains `favouriteCount` |

Client: the Offers tab gets a segmented control, "Offers" and "Outlets" (`?tab=offers&view=outlets`). The Outlets view lists starred outlets under "Your places" then the rest under "All outlets". A new page `/outlets/:id` shows one outlet: name, category, address with a maps link, booking link when set, the star, its offers, and the resident's points and tier there with a link to the loyalty card. Offer cards link to their outlet.

## Pricing page and merchant analytics (added Sept 2026)

### Public pricing

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | /api/pricing | none | `{ townName, currency: "GBP", freeTrialDays, resident: { individual, household }, merchant: { premiumMonthly, freeLiveOfferLimit } }` |

A public page at `/pricing` (linked from the landing page nav, the footer, and the "Run a bar, cafe or shop?" panel) sets out both sides. Two comparison tables, Residents and Businesses, each Free against Premium, with a tick or a dash per line and no invented claims. It also carries the analytics preview described below, and a short note that the three months free applies to both.

### Merchant analytics

`GET /api/merchant/analytics` (merchant, Premium only; 403 `plan_required` on Free). Window: the last 90 days, comparing with the 90 before. All from existing tables, no new schema.

```
{
  range: { from, to },
  headline: {
    redemptions, redemptionsPrevious,
    residents,            // distinct residents who redeemed in the window
    newResidents,         // whose first redemption here fell in the window
    returningShare,       // 0..1 of redemptions from residents seen before
    favourites,
    averageBasket | null  // where staff entered a bill total
  },
  byWeek:  [{ weekStart, redemptions, newResidents }],      // 13 weeks
  byDay:   [{ day: "mon".."sun", redemptions }],
  byHour:  [{ hour: 0..23, redemptions }],
  byOffer: [{ offerId, title, headline, redemptions, share }],
  loyalty: { members, activeMembers30d, pointsIssued30d, rewardsClaimed30d, tiers: [{ name, color, members }] } | null,
  town: {
    categoryLabel,          // "Pubs", "Cafes"
    outletsInCategory,
    yourRedemptions30d,
    medianRedemptions30d,   // across approved outlets in that category
    busiestDays: [{ day, share }],   // town-wide, all outlets
    memberGrowth: [{ month, members }]  // town-wide active members by month, 12 months
  } | null
}
```

Privacy: `town` is null when fewer than `ANALYTICS_MIN_COHORT` (default 5) approved outlets share the category, because a median across three outlets identifies them. Nothing in `town` ever names another outlet, and nothing anywhere names a resident.

### Analytics preview with example data

`client/src/components/merchant/analytics/` holds one `<AnalyticsDashboard data={...} example={boolean} />` used for both the real thing and the preview, so the preview cannot drift from the product. `example-data.ts` holds a fixed dataset in the same shape.

The example data is INVENTED and must stay that way. The outlet is "The Salted Oar" and offers are like "20% off food, Sunday to Thursday". Do not use the name of any real business, in St Andrews or anywhere else. Every screen showing it carries a visible "Example data" label.

Shown in two places: the `/pricing` page, and the merchant Analytics view when the merchant is on Free (in place of the plain upgrade card), so a merchant can see exactly what they would be buying.

## Resident savings (added Sept 2026)

The point of Resicard is that it saves a household money. Until now nothing told
the resident how much, so nothing argued for the renewal. This adds an estimate.

### Honesty rules

The figure is a **floor, not a best guess**, and everything about it is built to
keep it that way:

- Where the till entered a real bill, the saving is exact.
- Where only an indicative figure exists, the saving is marked estimated.
- Where neither exists, the redemption contributes **nothing**. It is counted in
  `uncounted` so the resident can see the total is understated, never inflated.
- Every screen showing a total says the word "about" or "estimated".

A resident who works out that the headline is padded stops trusting the rest of
the app, so understating is the only safe error.

### Schema

`offers` gains two nullable numerics, set by the merchant and never shown as a price:

| Column | Meaning | Asked for when the offer type is |
|---|---|---|
| `typical_spend` | the bill this offer is normally used on | `percentage_discount`, `off_peak` |
| `item_value` | the usual price of the free / second / reward item | `free_item_with_purchase`, `bogo`, `loyalty_reward` |

`fixed_price` and `set_menu` need nothing new: the merchant already gives a price
and a usual price. `fixed_amount_discount` needs nothing: the amount off is the saving.

`redemptions` gains:

| Column | Meaning |
|---|---|
| `saved_amount` | pounds saved, **frozen at redemption time**, or null |
| `saved_estimated` | true when it rested on an indicative figure rather than a real bill |

Freezing it at redemption time is deliberate: a merchant editing an offer next
March must not silently rewrite anyone's history.

### Estimation (`server/lib/savings.ts`, pure and tested)

`estimateSaving(offer, basketAmount)` → `{ amount: number | null, estimated: boolean }`

| Offer type | Saving | Estimated? |
|---|---|---|
| percentage / off-peak | `(basket ?? typicalSpend) × percent / 100` | only when there was no basket |
| money off | the amount off | no |
| fixed price / set menu | usual price − price | no |
| two for one | `itemValue` | yes |
| free item / loyalty reward | `itemValue` | yes |
| anything without the figures above | null | — |

Capped by `maxDiscount` where set, and never larger than the bill.

`summariseSavings(rows, now)` rolls the rows into a total, an unbroken month
series (quiet months are zero, not skipped) and a mean per month.

### API

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | /api/savings/mine | resident | see below |

```
{
  currency: "GBP",
  total,                // pounds, a floor
  counted,              // redemptions behind the total
  uncounted,            // redemptions with nothing to estimate from
  estimatedPortion,     // how much of the total rests on indicative figures
  months: [{ month: "2026-03", amount, count }],   // oldest first, no gaps
  averageMonthly,
  firstAt,              // ISO date of the first counted redemption, or null
  membershipPaid,       // what this resident has actually been charged (trials are £0)
  aheadBy,              // total − membershipPaid
  top: [{ id, amount, at, offerTitle, merchantId, merchantName }]   // best three
}
```

`GET /api/activity/mine` redemption items gain `saved: number | null` and
`savedEstimated: boolean`. The redemption success payload gains the same two fields.

### Client

- A savings panel at the top of the resident **Activity** tab: the cumulative £
  figure, average per month, a small monthly bar chart, and the line that argues
  for the renewal — savings set against what they have paid.
- The chart is not shown until there is more than one month of history; before
  that it is a single figure and a note.
- Each redemption row in the activity feed shows its saving where there is one.
- The merchant offer form asks for the indicative figure its offer type needs,
  labelled as an approximation used only to estimate resident savings, with a
  note that leaving it blank means the offer never shows up in anyone's total.

## Plans re-cut: three merchant tiers, honest resident tiers (added Sept 2026)

### Why

Two problems with the old two-by-two.

The **resident** Free column promised "loyalty points and tier status", but points
are only ever awarded on a redemption and redeeming was Premium. A Free resident
would earn nothing, sit at no tier forever and have nothing to claim. Five ticks
that did nothing, against one that mattered.

The **merchant** side put analytics in the same tier as the loyalty programme.
Analytics is the only feature whose value comes from the network rather than the
outlet: it is worth nothing at forty members and a great deal at four thousand.
It belongs on its own at the top.

### Merchant plans

`merchants.plan_status` becomes `"free" | "standard" | "insight"`. Existing rows
holding the legacy value `"premium"` are read as `standard` (see `normalisePlan`)
so nothing breaks before a migration runs.

| | Free | Standard | Insight |
|---|---|---|---|
| Monthly fee | £0 | `merchantStandardMonthlyFeeGbp` (30) | `merchantInsightMonthlyFeeGbp` (75) |
| Listing, QR poster, scheduling | yes | yes | yes |
| Live offers | `freePlanLiveOfferLimit` (2) | unlimited | unlimited |
| Redemption feed, counts, favourites | yes | yes | yes |
| Loyalty programme, tiers, rewards, till tool | no | yes | yes |
| Branded loyalty card, tier-only offers | no | yes | yes |
| `GET /api/merchant/analytics` | no | no | yes |
| Town benchmarks | no | no | yes |

`server/lib/plan.ts` keeps the gate in one place and gains a rank:

```
export type PlanStatus = "free" | "standard" | "insight";
normalisePlan(value)   // "premium" -> "standard"; anything unknown -> "free"
planRank(value)        // free 0, standard 1, insight 2
hasLoyalty(value)      // rank >= 1
hasAnalytics(value)    // rank >= 2
canGoLive / liveOffersOverLimit  // unchanged behaviour, now rank-based
```

`isPremium` is retired. Every call site becomes `hasLoyalty` or `hasAnalytics`
according to what it is actually gating. `GET /api/merchant/analytics` returns
403 `plan_required` below Insight; the loyalty routes return 403 `plan_required`
below Standard.

`GET /api/merchant/plan` returns `{ planStatus, plans: [...], features, ... }`
where `features` is `{ unlimitedOffers, loyalty, analytics }`. Upgrade and
downgrade take a target plan rather than assuming one: `POST /api/merchant/plan/checkout`
accepts `{ plan: "standard" | "insight" }`, and downgrading from Insight to
Standard keeps the loyalty programme running.

### Resident plans

Behaviour is unchanged; the presentation stops promising things Free never had.

| | Free | Premium |
|---|---|---|
| Browse every offer and see what it is worth | yes | yes |
| Find and favourite outlets | yes | yes |
| See each outlet's loyalty card and what its tiers are worth | yes | yes |
| The verified Resicard | no | yes |
| Redeem offers | no | yes |
| Earn points and tier status | no | yes |
| Claim tier benefits and rewards | no | yes |
| Flat tier discounts on the loyalty card | no | yes |
| The savings tracker | no | yes |
| Household cover | no | yes |

`client/src/components/pricing/plan-features.ts` stays the single source of truth
for both tables, shared by `/pricing`, the merchant plan tab and the resident
reminder, so the page and the app cannot drift apart.

### Pricing endpoint

`GET /api/pricing` gains the merchant tiers:

```
merchant: {
  freeLiveOfferLimit,
  standardMonthly,
  insightMonthly
}
```

`premiumMonthly` is kept as an alias of `standardMonthly` for one release.

## Anonymity, demographics and the public counter (added Sept 2026)

### Residents no longer choose a username

Merchants never see a resident's name — they see the alias from
`generateCustomerAlias`, which falls back to `users.username`. A username the
resident chose themselves undoes that: "fiona_mcleod_standrews" identifies a
person as surely as her name does. So residents no longer pick one.

- `registerResidentSchema` drops `username`. The resident registration form
  drops the field.
- The server generates it: `randomHandle()` in `server/lib/codes.ts` produces
  `member_` plus 8 characters of the human alphabet (no vowels to make, no 0/O/1/I
  confusion), retried on collision. It carries no personal information and is not
  guessable from anything the resident typed.
- Merchants still choose theirs: a merchant is a business trading publicly, and
  their name is on the poster anyway.
- Login is by email, so nothing about signing in changes.
- Existing rows keep their usernames. A follow-up script can rotate them; that is
  a decision for the owner, not something to do automatically.

### Optional demographics: built, then removed (Sept 2026)

Two nullable columns on `users` — `age_band` (`18-24` … `65+`) and `sex` —
were built here, offered as optional questions at registration and in the
profile, and reported only as suppressed aggregates in the Insight analytics.
They were removed before launch, along with the analytics block that read them.
The reasons, recorded so the idea is not simply rediscovered:

- Self-reported age and sex at this scale are unreliable, and a figure a merchant
  cannot trust is worse than no figure.
- The cohort minimum (`ANALYTICS_MIN_COHORT`) meant most bands would have shown as
  "not shown" until membership ran into the thousands, so the block would have been
  mostly empty for years.
- They were friction in a sign-up flow whose whole pitch is trust, and two extra
  questions cost more sign-ups than the data was worth.
- Holding them created a category of data protection obligation with no
  corresponding benefit. Not collecting is cheaper than protecting.

The columns are dropped by a migration in `migrations/`. Nothing else in this
section changed: generated usernames, the merchant alias, `ANALYTICS_MIN_COHORT`
and the town-benchmark suppression all still stand.

### Public counter

`GET /api/stats` (no auth):

```
{ town, residents, merchants, visible: boolean }
```

`residents` counts residents with a current membership; `merchants` counts
approved outlets. `visible` is false until both pass `publicCounterMinimum`
(config `PUBLIC_COUNTER_MIN`, default 40) — "34 residents and 6 outlets" on the
landing page argues against joining, and there is no way to spin it. The client
renders nothing when `visible` is false.

Shown on the landing page and on the pricing page, as one quiet line of two large
figures, not a hero element.

## Merchant loyalty card design and the resident wallet (added Sept 2026)

### Why

The loyalty card is the thing a resident actually shows across a bar, and a flat
tier discount is redeemed by showing it. Buried in a tab it is a points balance;
given a wallet of its own it is the reason the programme feels real. And a card
that looks like the outlet, rather than like Resicard, is worth more to the
merchant than any feature we could add to the dashboard.

### Merchant design, within limits

Free rein produces unreadable cards and an app that looks like six different
apps. So: a fixed layout, and a small set of choices inside it. `loyalty_programs`
gains:

| Column | Values | Default |
|---|---|---|
| `card_theme` | `sea`, `ink`, `moss`, `rust`, `plum`, `sand` | `sea` |
| `card_pattern` | `plain`, `wave`, `stripe` | `plain` |

Each theme is a background colour and a legible foreground, defined once in
`client/src/components/loyalty/card-themes.ts` and used by every surface that
draws a card. The merchant's existing `logoUrl` supplies the mark; tier colour
supplies the accent. Nothing else is configurable — no fonts, no free-text
colours, no uploaded backgrounds. Every theme is checked for contrast against its
foreground, because this card gets read across a dark bar.

Set from the merchant loyalty tab, with a live preview of the resident's card.
Included from Standard upwards (it is part of the loyalty programme).

`GET /api/merchant/loyalty` and `PUT /api/merchant/loyalty/program` gain the two
fields. `GET /api/loyalty/mine` and `GET /api/loyalty/:merchantId` return them
alongside the existing programme data.

### The resident wallet

A fourth section on the resident dashboard. Tabs become **Resicard**, **Offers**,
**Cards**, **Activity** (`?tab=cards`), so "Card" the membership card and "Cards"
the loyalty cards are not the same word doing two jobs.

The Cards view is a wallet: every outlet whose programme the resident is in, drawn
as its own themed card, overlapping in a stack the way a wallet of passes does,
favourites first. Each card shows the outlet name and logo, the resident's tier,
their points, and any flat tier discount, which is the number that matters when
they are standing at the bar.

Tapping one opens the existing `/loyalty/:merchantId` page, which becomes a
full-bleed presentation of that card: the outlet's theme edge to edge, the tier
and any flat discount large enough to read at arm's length, the resident's name
and alias, and the points and next tier below the fold. It should look like
something you hold up, not a dashboard.

Empty state: a sand card explaining that loyalty cards appear here once they have
redeemed at an outlet that runs a programme.

## Price change audit (added Sept 2026)

### Why

An outlet can put its menu up 20% and then advertise 20% off. In a town with six
pubs on the scheme, competition eventually punishes that. At launch it does not:
some categories will have one or two outlets, the member base is too small for a
merchant to feel the loss, and nobody remembers what a pint cost in March. The
rise is invisible; only the poster is visible.

The merchant is already typing these figures into the offer form, so the edits
are observable. Nothing records them today, and the old values are gone the moment
they are overwritten, so this cannot be reconstructed later. That is the whole
argument for building it now rather than when it is needed.

This is a record, not an accusation. Prices go up for ordinary reasons.

### Schema

```
offer_price_changes
  id uuid pk
  offer_id uuid -> offers(id) on delete cascade
  merchant_id uuid -> merchants(id) on delete cascade
  changed_by integer -> users(id)          // the merchant user who saved the edit
  field text                                // percentOff | fixedPrice | originalValue
                                            // | typicalSpend | itemValue | minBasket | maxDiscount
  old_value numeric(10,2) null              // percentOff is stored here as a plain number
  new_value numeric(10,2) null
  direction text                            // "up" | "down" | "set" | "cleared"
  inflates_saving boolean                   // see below
  changed_at timestamp default now()
```

One row per changed field, written inside the same transaction as the offer
update, so a partial record is impossible.

`inflates_saving` is true when the change makes the offer look better than it did
without the resident getting anything more: a rise in `originalValue`,
`typicalSpend` or `itemValue`, or a rise in `fixedPrice` on a `fixed_amount_discount`.
It is the single flag the admin view sorts on. A fall in `percentOff` makes the
offer worse and is recorded but not flagged, since it is honest.

### API

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | /api/admin/price-changes | admin | see below |

Query: `?flaggedOnly=true`, `?merchantId=`, `?days=` (default 180), `?limit=` (default 200).

```
{
  items: [{
    id, changedAt, field, oldValue, newValue, direction, inflatesSaving,
    percentMove,                       // (new - old) / old, null when old was null or zero
    offer: { id, title, type },
    merchant: { id, name },
    changedBy: { id, username } | null
  }],
  summary: { merchants: [{ merchantId, name, flaggedChanges, largestMovePercent }] }
}
```

Sorted newest first. The summary lists only merchants with at least one flagged
change in the window, so a quiet town shows an empty table rather than noise.

### Admin view

A "Prices" tab: a "flagged only" toggle on by default, a merchant filter, and a
table of old value, new value, the move as a percentage, the offer and who made
the change. Above it, one line per merchant with flagged changes.

The copy must stay neutral. It says what changed, never what it means. Wording
like "suspicious" or "gaming" does not appear anywhere in the interface: the admin
looking at it is the one who decides, and a merchant who sees a screenshot of it
should not find an accusation in it.

## Map of what is on now (added Sept 2026)

### Why

St Andrews is a few hundred metres across and entirely walkable, so "what can I
get right now, near here" is a real question with a spatial answer. In a city a
map of offers is decoration; in this town it is the fastest route to a decision.

### Schema

`merchants` gains `latitude` and `longitude` (`numeric(9,6)`, nullable). Nullable
matters: an outlet with no coordinates keeps working everywhere else and is simply
absent from the map, listed underneath it instead.

Coordinates are set by the merchant in their settings and by an admin on the
merchants table, by typing them or by dragging a pin. There is no automatic
geocoding: for a town with a few dozen outlets, placing a pin by hand is more
accurate than a geocoder and avoids a paid dependency on day one.

### API

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | /api/outlets/map | resident | outlets with coordinates and what is live right now |

```
{
  centre: { lat, lng },              // config mapCentreLat / mapCentreLng
  outlets: [{
    id, name, category, latitude, longitude, isFavourite,
    liveOffers: [{ id, title, headline, endsAt | null }],   // live at this moment only
    loyalty: { tierName, discountPercent } | null
  }],
  withoutCoordinates: [{ id, name, category, liveOfferCount }]
}
```

"Live right now" uses the same `isOfferLiveNow` rules as `/api/scan`, evaluated
against the request time, so an off-peak offer that starts at five does not appear
at three. Outlets with no live offer are still returned, drawn quietly, because a
resident wanting to know where the scheme is accepted is a fair question too.

`GET /api/merchant/settings` and its update accept the two fields; the admin
merchant update does too.

### Client

A third view on the Offers tab, beside Offers and Outlets:
`?tab=offers&view=map`. Leaflet with a configurable tile source
(`VITE_MAP_TILE_URL`, `VITE_MAP_TILE_ATTRIBUTION`). Category filter chips reuse
`CATEGORY_LABELS`. A pin carries the outlet's category; favourites are marked.
Tapping a pin opens a card with the outlet name, what is on now and a link to
`/outlets/:id`.

Outlets without coordinates are listed under the map so they are never invisible,
with a line saying they have not been placed yet.

The map is an alternative route to an offer, never the only one. Every offer must
stay reachable from the list view for anyone on a slow connection, with tiles
blocked, or using a screen reader.

**Tiles cost money at scale and this is a decision for the owner.** The default is
OpenStreetMap's public tiles, which are fine for development but whose usage policy
is not intended for a commercial product. Before launch a provider with a key
(MapTiler and Mapbox both have free tiers around 100k loads a month) should be set
through the two environment variables. The map must degrade to the list view, with
a short note, when no tile source is configured or tiles fail to load.

## Email, campaigns and referrals (added Sept 2026)

Three features that earn money, in the order they matter.

### 1. Email

Password resets currently print to a console, which is a launch blocker. But the
commercial case is the renewal reminder: a membership that lapses silently is
money already earned and then lost.

**Provider.** `EmailService` in `server/email.ts` stays the interface;
`ConsoleEmailService` stays the default so nothing breaks without keys. Add
`ResendEmailService`, used when `RESEND_API_KEY` is set. Resend is chosen for a
simple HTTP API, a free tier around 3,000 messages a month, and an EU region, so
there is no international transfer question to answer in the privacy notice.
Config: `RESEND_API_KEY`, `EMAIL_FROM` (e.g. `Resicard <hello@resicard.co.uk>`),
`EMAIL_REPLY_TO`.

**Messages.** Every one plain, short and in the brand voice. HTML with a plain
text alternative, no images beyond the wordmark, no tracking pixels of any kind.

| Message | When |
|---|---|
| Password reset | as now |
| Welcome | on registration |
| Postcard on its way | when an admin marks a postcard posted |
| Verified | when a code is accepted |
| Trial ending | 7 days before the first charge |
| Renewal coming | 30 and 7 days before `membershipExpiry` |
| Membership lapsed | the day after expiry |
| Merchant approved | when an admin approves an outlet |

**`email_log`.** One row per message actually sent: `userId`, `kind`, `sentAt`,
and a `dedupeKey` unique index. Nothing is sent twice. This table is what makes
the scheduled reminders safe to re-run.

**Scheduled sending.** `npm run jobs:daily`, idempotent, safe to run repeatedly.
It finds memberships at the reminder thresholds and sends what has not been sent.
Also exposed as `POST /api/jobs/daily`, guarded by a `JOBS_SECRET` bearer token,
so a Replit scheduled deployment or any cron service can call it. It returns a
summary of what it sent.

### 2. Push an offer to residents

The most commercially valuable thing on this list. A publican looking at an empty
Tuesday who can reach eight hundred locals has bought something no other scheme in
the town sells. It is the argument for Standard over Free.

It is also the feature most likely to destroy the thing the business depends on,
so the limits are part of the feature and not a setting.

**Limits, enforced server-side and not configurable by the merchant:**

- One campaign per merchant per **7 days**, and at most **4 per calendar month**.
- Nothing sends outside **08:00 to 20:00** Europe/London. A campaign created
  outside those hours is queued for the next window.
- A campaign must reference a live offer. A merchant cannot send free text.
- Body copy is capped at 140 characters and the merchant sees the count.

**Consent, which differs by channel:**

- **Web push**: the browser permission prompt *is* the consent. Once granted,
  push is on, and the resident can turn it off per outlet or entirely.
- **Email**: this is direct marketing under PECR, so it is **explicit opt-in,
  default off**, offered in the profile and never pre-ticked. Every campaign email
  carries an unsubscribe link that works in one click without signing in.

**Audience.** Residents with a current membership who have not opted out, and
either have a push subscription or have opted in to email. A merchant may target
everyone, or only residents who have that outlet in their favourites, or only
residents who have redeemed there before. The merchant never sees who is in the
audience, only the count, and the count is suppressed below `ANALYTICS_MIN_COHORT`.

**Schema.**

```
push_subscriptions   id, userId, endpoint (unique), p256dh, auth, createdAt, lastSeenAt
campaigns            id, merchantId, offerId, body, audience ('all'|'favourites'|'past'),
                     status ('queued'|'sending'|'sent'|'failed'), scheduledFor,
                     sentAt, recipients, createdBy, createdAt
campaign_optouts     userId + merchantId composite pk, createdAt   -- null merchantId = all outlets
users                gains marketingEmailOptIn boolean default false
```

**API.**

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | /api/push/subscribe | resident | stores the browser subscription |
| DELETE | /api/push/subscribe | resident | removes it |
| GET | /api/push/key | resident | the VAPID public key |
| POST | /api/merchant/campaigns | merchant, Standard+ | `{ offerId, body, audience }`; 403 `plan_required` on Free, 429 `campaign_limit` with the next allowed date |
| GET | /api/merchant/campaigns | merchant | history with recipient counts and the next allowed send date |
| GET | /api/campaign-preferences | resident | per-outlet and global opt-outs, email opt-in |
| PUT | /api/campaign-preferences | resident | update them |
| GET | /api/unsubscribe/:token | none | one-click email unsubscribe |

Web push uses VAPID: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
The service worker gains `push` and `notificationclick` handlers. It still caches
nothing.

### 3. Referrals

In a town where everyone knows everyone, a member bringing a friend is the
cheapest acquisition there is.

Each member has a code (`users.referralCode`, generated on first use, from
`HUMAN_ALPHABET`). A new member enters it at registration. When the referred
member's **first payment succeeds** — not when they sign up, and not during the
trial — both get one month added to their `membershipExpiry`.

Paying first is the whole anti-fraud design. Without it, a person with ten email
addresses farms free membership in an afternoon.

Further limits: a referrer earns at most **6 months in any 12**; a member cannot
refer themselves or anyone in their own household; a code can only be entered at
registration, never added later.

```
referrals   id, referrerId, referredId (unique), code, status ('pending'|'credited'),
            createdAt, creditedAt
users       gains referralCode (unique, nullable)
```

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | /api/referrals/mine | resident | the code, a share link, how many are pending and credited, months earned and the cap |
| POST | /api/auth/register | none | accepts an optional `referralCode`; an unknown code is ignored silently rather than blocking a sign-up |

Crediting happens in the Stripe `invoice.paid` handler alongside the existing
membership extension, in the same transaction, so a duplicate webhook cannot
credit twice.

The resident card tab gains a quiet panel: the code, a share button using the
Web Share API where available, and what it is worth. Not a hero element.

### Joining the two halves

`server/lib/campaign-email.ts` discovers the campaign sender structurally: it
looks for a `sendCampaign` method on the shared `emailService` singleton and
falls back to logging when there is none. `TemplatedEmailService` now has that
method, so campaign email sends through the same provider and the same templates
as everything else. Campaign sends are deliberately **not** written to
`email_log`: that table exists to stop a deduped reminder going twice, and a
campaign is a fan-out with its own `campaigns` row.

## Stamps model removed (8 September 2026)

A loyalty programme used to carry a `model` column, `"points"` or `"stamps"`,
and the stamps half of that choice has been removed. This section records the
reversal rather than pretending the feature never shipped: the columns were in
the schema, the merchant settings form offered the choice, and the API returned
the fields, so anyone reading an older client or an older row needs to know what
happened to them.

Why it went: nothing on the server ever awarded a stamp. `awardPoints` in
`server/lib/loyalty.ts` was the only earn path, and it wrote `earn_points`
events and incremented `loyalty_balances.points` and nothing else. A merchant
who picked stamps configured a card that could never fill — their residents'
balances would sit at zero for ever, and only the rewards priced in points would
ever be claimable. Building the earn path was the alternative; the owner decided
one earn model is enough and dropped it.

What went, in the migration that drops them:

- `loyalty_programs.model` — the whole column, since points is now the only
  model and a column with one possible value is noise
- `loyalty_balances.stamps`
- `loyalty_rewards.cost_stamps`
- `reward_claims.stamps_spent`
- the `earn_stamp` value of the `loyalty_events.type` union (no rows ever used
  it)

Everything above that mentions points is unchanged. Points is the only model:
residents earn on `pointsPerCurrency` per pound or `pointsPerRedemption` on a
scan with no bill, rewards cost points, and a tier benefit is a reward with a
`tierId` and no points cost.

## Postcode check at sign-up, and choosing how to verify (added Sept 2026)

### The catchment, now by sector as well as district

`LOCAL_POSTCODE_PREFIXES` accepts a whole district (`KY16`) or a single sector
(`KY15 4`, or written without the space, `KY154`). Eligibility is not always a
whole postal district: KY15 is Cupar and reaches a long way into the countryside,
so only the sectors nearest the town belong in the catchment.

The split is unambiguous because the outward code is matched greedily. `KY154`
takes `KY15` as the district and `4` as the sector; `KY16` is a district with no
sector. A district must match in full, so a listed `KY1` never admits `KY16`.

Default: `KY16,KY9,KY10,KY15 4,KY15 5`.

### Check the postcode before anything else is typed

Today the postcode is rejected at submit, after someone has filled in a whole
form. That is a poor way to tell a person they cannot join, and worse, it makes
the check feel like a rejection rather than a fact about where they live.

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | /api/postcode-check?postcode= | none | `{ valid, eligible, normalised, town }` |

`valid` is false when the string cannot be a postcode at all; `eligible` says
whether it is in the catchment. Both false is "that does not look like a
postcode"; valid and not eligible is "we are not in your area yet".

Registration asks for the postcode **first**, on its own, and answers
immediately: a green tick and the normalised postcode, or a plain explanation.
The rest of the form appears only once it passes. Nobody types a password to be
told no.

Being turned down is not a dead end. An ineligible postcode gets a short, honest
note that Resicard covers a defined area around the town, and an invitation to
leave an email address so they hear if it widens. **Do not** pretend a decision
is pending, and do not let them register anyway.

### Choosing how to prove residency

After registering, a resident picks between the two routes rather than being put
down one. Both are offered together with what each involves:

**A card in the post.** We post a card with a six-character code to the address
given. It arrives in a few days and the code is entered in the app. The code
lasts `postcardCodeDays` (60) and allows `postcardMaxAttempts` (5) tries.

**In person.** Meet an admin, show something with the address on it, and they
verify on the spot. Nothing is scanned, copied or kept: a person looks and marks
the account verified. Where and when this can be done comes from
`VERIFY_IN_PERSON_DETAILS`, so it is configuration rather than a hard-coded
address, and it can say "get in touch and we will arrange it" before there is a
regular time and place.

The in-person route is the honest advantage: it is free, immediate, and stores
nothing. The postcard costs real postage and takes days. Present them as equals
with their trade-offs stated, rather than pushing the cheaper one.

## Verification at an outlet, and entering the postcard code (added Sept 2026)

### The code box is always there

After requesting a postcard the panel said the card was being prepared and gave
no way to enter anything, so the whole route was undemonstrable until a card
physically arrived, and someone whose card came early had nowhere to type it.

The code field is now shown as soon as a postcard has been requested, alongside
the note about how long it takes. Entering a code before the card arrives simply
fails the same way a wrong code does, which is the honest behaviour and costs
nothing.

### Verifying at a participating outlet

Meeting an admin does not scale past the first few dozen residents and puts
every sign-up through one person's diary. Instead, a small number of outlets
verify on the operator's behalf.

**How it works.** The resident's app shows a short verification code. They take
it, with something showing their name and address, to any outlet on the list. The
outlet enters the code in their portal, confirms they have seen the address, and
the account is verified on the spot. Nothing is scanned, copied or kept: a person
looks at a letter and presses a button.

This reuses the shape the merchant already knows from redemptions, so it needs no
new hardware and almost no explanation.

**What it delegates, and how that is controlled.** A verifying outlet can grant
residency, which is a real trust decision, so:

- Verifying is off by default and switched on per outlet by an admin. It is not
  something a merchant can enable for themselves.
- Every verification records which outlet and which staff account did it. An
  admin can see the trail and revoke a verification.
- The downside of a bad verification is bounded: one person getting local prices
  they are not entitled to. It is not access to anyone's data.

Worth stating plainly rather than discovering later: this is a deliberate trade
of some control for reach, made because a verification queue of one person is a
worse risk to the business than an occasional wrong verification.

### Schema

```
merchants   verifies_residents boolean default false   -- admin-controlled
users       verified_by_merchant_id uuid null          -- which outlet, when verified there
            verification_method gains "outlet"
```

`verified_by` keeps its existing meaning: the admin or staff user who did it.

### API

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | /api/verification | resident | gains `code` (the resident's verification code) and `outlets: [{ id, name, address }]`, the outlets that verify |
| POST | /api/merchant/verify | merchant, any plan | `{ code, confirmed: true }`. 403 unless the outlet has `verifiesResidents`. 404 on an unknown or already-used code. Marks the resident verified, records the outlet and staff user |
| GET | /api/merchant/verify/:code | merchant | looks the code up without acting: returns `{ firstName, surname, addressLine1, town, postcode }` so staff can check the letter against it. 403 unless the outlet verifies |
| PATCH | /api/admin/merchants/:id | admin | gains `verifiesResidents` |

The resident's verification code is generated on first request and is stable
until used, so they can come back another day with the same code.

The lookup deliberately returns the address: staff cannot check a letter against
an account without seeing what the account says. That is the one place a merchant
sees a resident's name, it happens only when the resident hands them a code, and
it is recorded.

### Client

- Resident verification panel: the postcard code box, and the outlet route
  showing the code in the same style as a redemption code, with the list of
  outlets and their addresses.
- Merchant portal: a "Verify a resident" action. Enter the code, see the name and
  address, confirm the letter matches, done. One screen, no menus.
- Admin businesses table: a toggle for whether an outlet verifies.
- Seed: five of the twenty-four outlets verify, spread across the town.

---

## Product tax codes on checkout (8 September 2026)

Stripe now enables **Managed Payments** by default on new accounts, and a Managed
Payments account rejects a Checkout Session whose line item builds a product
inline (`price_data.product_data`) without a `tax_code`. The failure is total —
checkout never opens — and it reads as an application bug rather than an account
setting.

Every inline product now carries a tax code, from `server/config.ts`:

| Setting | Default | What it covers |
|---|---|---|
| `STRIPE_TAX_CODE_MEMBERSHIP` | `txcd_20030000` (General - Services) | the resident membership, individual and household |
| `STRIPE_TAX_CODE_MERCHANT_PLAN` | `txcd_10103001` (SaaS, business use) | Standard and Insight, in checkout and in a mid-term tier change |

Three call sites in `server/lib/stripe.ts`: `createMembershipCheckout`,
`createMerchantPlanCheckout`, and `changeMerchantSubscriptionPrice`, which builds
a Price the same way when repricing an existing subscription.

The alternative was passing `managed_payments: { enabled: false }` on each
session, or switching Managed Payments off in the Stripe dashboard. Both were
rejected: a tax code is what the line item should have carried anyway, and it
does not leave the application depending on an account setting that a future
Stripe default could flip back.

Setting a tax code does not on its own charge tax. That needs Stripe Tax turned
on, and it is a decision to take with an accountant — which is why both codes are
environment variables rather than constants.

### Correction, same day: Managed Payments is turned off instead

The tax codes above were necessary but not sufficient. Stripe accepted
`txcd_20030000` as a tax code and then refused it as *ineligible for Managed
Payments*, which is the more useful error, because it says what Managed Payments
actually is.

Managed Payments makes Stripe the seller of record and takes on the indirect tax
that follows. It covers **digital products only**: software, digital media,
online courses, electronically supplied services. Stripe's eligibility page
excludes physical goods, professional services and live in-person events by name.

A Resicard membership buys a discount at a pub in St Andrews. It is not a digital
product, and every tax code that would have passed the check describes one. Using
one to get past a validation would misdescribe what is being sold to the party
that computes the tax on it, and Stripe says plainly that an ineligible product
leaves the seller carrying the indirect tax liability.

So both Checkout Sessions now pass `managed_payments: { enabled: false }`, via
`withoutManagedPayments()` in `server/lib/stripe.ts`. The tax codes stay: they are
correct, they cost nothing, and they are what Stripe Tax would use if it is ever
switched on. `managed_payments` is not in the Node types at v18.5.0, so the
helper casts; it is a documented API field.

Turning it off in the dashboard would also work today and was again rejected for
the same reason as before: it fails silently and remotely the day someone toggles
it back, and the failure lands on a resident trying to pay.

**If Resicard is ever VAT registered**, the tax question comes back and the answer
is Stripe Tax, not Managed Payments.

---

## Offer artwork now illustrates the offer (8 September 2026)

The demo seed's offer images were abstract compositions: a horizon, some arcs, a
bar chart. They were a decent ground for a title and they were, correctly, not
photographs of businesses that do not exist. But nothing connected the picture to
the card it sat on, so a list of them read as random.

`server/scripts/demo-art.ts` now draws a flat cartoon subject on a disc: a pint
for a pint, an open book for the bookshop, scissors for the barber, a kayak for
the sea trips.

**How the subject is chosen.** `motifFor()` reads the offer's title, short promo
and tags against an ordered keyword list, specific first, so "breakfast roll" is
a breakfast rather than a bread roll and "two-course menu" is a set menu rather
than a plate. When nothing matches, the outlet's category picks from a rota of
three, stepped by the offer's index, so eight restaurant offers with no keyword
between them do not draw eight identical plates.

**Why the disc.** Everything is dark ink on a light body. The disc is what makes
that safe on all five grounds without checking contrast case by case, and sitting
it right of centre keeps the subject clear of the discount badge in the top-left
corner of the card.

Three things were drawn twice because the first attempt read as something else at
card size, which is only visible in a contact sheet: a fried egg centred on a
round plate reads as an eye, two sandwich triangles side by side read as
mountains, and a navy pint reads as a glass of cola. The accent is now always the
buoy orange for that last reason.

Nothing else changed. The outlet logos are still monograms, the set menus are
still real PDFs, and no image depicts a real place.
