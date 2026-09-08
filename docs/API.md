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

## Reward claims and tier benefits (added Sept 2026)

Tiers: `loyaltyTiers.benefits` is a list of short lines the merchant writes; `discountPercent` is optional (null = none) and only means a flat discount staff apply for that tier. Any other discount is an offer with `eligibleTiers`.

Claiming a reward now creates a `reward_claims` row and is shown to staff on the same green screen as a redemption.

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | /api/loyalty/redeem-reward | resident | `{ merchantId, rewardId }` | `{ claim: { id, code, claimedAt, pointsSpent, stampsSpent }, reward: { id, name, terms }, merchant: { id, name, logoUrl }, resident: { firstName, surname, profilePhoto }, loyalty: { points, tierName, tierBenefits: string[], tierDiscountPercent: number \| null } }` (deducts points/stamps, writes a `redeem_reward` event with `metadata.claimId`) |
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
