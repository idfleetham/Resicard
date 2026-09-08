# Changelog

Newest first, generated from the commit history with `npm run docs:changelog`.
The Replit brief in `docs/REPLIT-BRIEF.md` describes how the codebase works and
does not change between archives; this file is where the version-specific detail
lives.

## Postcode by sector, checked before anything else is typed

The catchment is not always a whole postal district. KY15 is Cupar and
reaches a long way into the countryside, so LOCAL_POSTCODE_PREFIXES now
takes a sector as well: KY16 is a district, KY15 4 is one sector of KY15.
The split is unambiguous because the outward code is matched greedily, so
a listed KY1 still never admits KY16. The catchment is now KY16, KY9,
KY10, KY15 4 and KY15 5.

Registration asks for the postcode first, on its own, and answers
straight away. Rejecting someone at submit, after they have filled in a
form and chosen a password, is a poor way to tell them where they live is
not covered, and it makes a fact about coverage feel like a judgement. A
postcode outside the area gets a sand panel, no red and no exclamation,
and an offer to hear if the area widens. It does not pretend a decision
is pending and it does not let them register anyway. The server check is
unchanged: the client one is a courtesy, not the control.

Verification now offers both routes side by side with their trade-offs
stated rather than putting everyone down the postcard route. In person is
free, immediate and stores nothing; the postcard costs postage and takes
days. Neither is the screen's primary action. Where and when in-person
verification happens is configuration, so it can say "get in touch" until
there is a regular time and place.

## Remove the stamps loyalty model

Programmes could be configured as points or stamps, but nothing on the
server ever awarded a stamp: awardPoints was the only earn path and it
wrote earn_points events and incremented loyalty_balances.points. A
merchant who picked stamps configured a card that could never fill.

Points is now the only model. Drops loyalty_programs.model,
loyalty_balances.stamps, loyalty_rewards.cost_stamps and
reward_claims.stamps_spent, and the earn_stamp event type. The Blue
Kettle and Harbour Fry demo outlets become points programmes. docs/API.md
records the reversal rather than pretending the feature never shipped.

## Regenerate the changelog

## Tidy the resident card page and the plan tables on a phone

The card page put the membership card and the scan button in one column
and everything else in the other, so on a laptop the left half emptied
out while the right became a tower. Verification, the referral panel and
the install prompt move left; the right column is the membership decision
and nothing else.

That panel was doing four jobs under two headings that said the same
thing. It now has one heading, and it says "Become a member" rather than
"Free membership", because selling membership is what it is for; the
resident's current plan is on the pill beside it. The two-column
comparison inside it is gone, since it repeated the pricing page and was
the heaviest thing on the panel. Joining someone else's household is a
different job and now has its own card.

The membership card showed the plan twice, once on the pill and once in
the corner. The corner now carries the member number alone unless there
is a renewal date to show.

On the pricing page both comparison tables become one card per plan below
sm. Three plans plus a feature column could only scroll sideways on a
phone, which hid which column a tick belonged to; the paid cards now read
"Everything in Free, plus" and list what they add. The admin price filter
had its outlet dropdown running off the card and now stacks.

## Regenerate the changelog

## Say plainly when the site is showing demo data

The landing page lists offers to anyone, so seeding a demo town onto a
public site puts two dozen outlets in front of passers-by that do not
exist and have not agreed to be there. A resident could join on the
strength of an offer they cannot use, and a real outlet could see a
competitor apparently signed up.

PREVIEW_MODE=true puts a plain notice on the public pages: Resicard is
not open yet, the outlets shown are examples, no business listed has
signed up. It costs nothing when demonstrating to a prospective merchant,
because what is being shown is how the card works rather than who is on
it. Remove it before the first real member joins.

## Regenerate the changelog

## Stop the brief carrying a version number

The brief's title said V20 while V27 shipped, because a find-and-replace
matched resicard-v1x and never touched v20 and up. It had already gone
stale once the same way. The Replit agent noticed before I did.

A document that needs editing every time it ships will go stale, so the
brief no longer mentions versions at all: it describes how the codebase
works and how to deploy it, which is true from one archive to the next.

Version-specific detail moves to docs/CHANGELOG.md, generated from the
commit history by npm run docs:changelog. Generated rather than written,
because a hand-maintained changelog goes stale in exactly the same way.

## Explain the pre-ledger database, and keep migrations out of the boot path

A deployment whose tables came from drizzle-kit push has the schema and
an empty ledger, so the baseline migration tried to create what was
already there and failed on "relation already exists". With the migration
wired into the deployment's run command, that became a crash loop with
the real cause buried in a repeating log.

The migration now recognises that case and says what it means and what to
run, including the part that matters: a baseline is recorded per
database, so one taken against development does nothing for production.

The brief now says migrations must not run from the deploy command.
Besides turning any migration failure into a crash loop, autoscale runs
several instances, and racing them through the same migration is a way to
corrupt a schema.

## Say what is missing instead of crash-looping

Requiring PUBLIC_BASE_URL in production was right, but throwing on the
first missing variable means finding them one deployment at a time, and
what the log shows is a stack trace rather than an instruction. A
deployment that had only ever had its variables set in the workspace hit
exactly that.

Startup now checks DATABASE_URL, JWT_SECRET and PUBLIC_BASE_URL together
and prints one block: what is missing, what each is for, and the fact
that Replit's deployment secrets are separate from its workspace ones,
which is the actual cause nine times in ten.

## Read the map tile source at runtime, not at build time

VITE_ variables are compiled into the bundle, so changing the tile key
meant a rebuild, and until someone worked that out the map sat there as a
list looking broken. It has already caused that confusion once.

The tile URL, attribution and zoom ceiling now come from the server
through GET /api/map-config, so the key goes in the host's secrets and a
restart picks it up. The key is public either way: it travels to the
browser on every tile request. The VITE_ names are still read as a
fallback so an existing build keeps working.

Verified by building with no tile URL compiled in at all and then
starting the server with one set: the map draws.

## Make the demo data fully specced

Offers had no artwork and outlets no logos, so every screen fell back to
a letter on a plain ground and the product looked emptier than it is.
Both are now generated as SVG data URLs in demo-art.ts: abstract Coast
grounds for offers, with the colourway fixed per outlet so an outlet's
offers read as a set, and monogram tiles for logos. Nothing is a
photograph and nothing depicts a real place.

Offers now carry the fields that have UI behind them: tags, minimum
spend, discount caps, per-resident and global limits, dine-in and alcohol
flags, blackout weeks, working set-menu PDFs, and four restricted to a
top loyalty tier, which nothing previously demonstrated. Business hours
vary by sector and the restaurants take bookings.

The fourteen loyalty programmes are now all different from one another,
with thresholds set from the actual seeded distribution so the tier split
is a real spread rather than everyone in the base tier.

The ten outlets on the free plan still have no loyalty programme. That is
the product working: loyalty is a Standard feature, and a demo where free
outlets have it argues against the upgrade.

## Label the chart axes, and seed the trial states

A merchant reading "107" above "Sun" under a note saying "the last 90
days" reasonably asked how there could be 107 Sundays. The y axis had no
name, and the nearest number to read it against was 90. Both timing
charts and the weekly chart now name the axis, and the notes say what is
being counted rather than leaving the window as the only figure in view.

The seed now includes trials on both sides: six members and two outlets
sit inside their free period, with nil-amount ledger rows, which is what
separates a trial from a paid subscription in the revenue forecast and
what puts them in the cliffs instead. Without them the plan panels, the
trial copy on the card and the cliff screens had no state to show.

## Make the merchant redemptions readable on a phone

The date pair carried shrink-0, and an iOS date input has a wide
intrinsic width, so on a phone the two boxes refused to shrink to the
card, overflowed it and closed the gap between them. They now fill the
width on a phone and only hold their size from sm upwards.

The seven-column table was the deeper problem: offer titles wrapped to
three lines and the code fell off the edge. Below sm each redemption is
now a card carrying the offer, the time, the alias, the bill and points,
with the kind and the code on the right. Verified at 390px with the page
scroll width unchanged, so nothing overflows.

db:reset built the tables with push and left the migration ledger empty,
so a db:migrate straight afterwards tried to replay the baseline and
failed on "relation already exists". Reset now records the baseline
itself, which is what someone will do on a development database and then
wonder why migrations are broken.

## Restack the referral panel, and require PUBLIC_BASE_URL in production

The code and its two buttons would not fit on one line on a phone, so the
code now has its own row and reads as something to be copied.

Every link that leaves the building is built from PUBLIC_BASE_URL:
referral shares, password resets, campaign unsubscribes, the QR poster.
Left unset it silently pointed at the deployment host, so production now
refuses to start without it, the way it already does for JWT_SECRET.

## Correct the version and test count in the Replit brief

## Update the Replit brief for email, campaigns and referrals

## Email, offer campaigns and referrals

Password resets went to a console, which was a launch blocker, but the
commercial case here is the renewal reminder: a membership that lapses
silently is money already earned and lost. Eight transactional messages,
a Resend implementation used when a key is present and the console one
otherwise, and a daily job that is idempotent because email_log carries a
unique dedupe key naming the membership period. No tracking pixels and no
wrapped links, so a Resicard email reports nothing about the person
reading it.

Campaigns let an outlet on Standard reach residents about a live offer.
This is the most valuable thing here and the fastest way to lose the
trust the business depends on, so the limits are the feature, not a
setting: one send a week, four a month, nothing outside 08:00 to 20:00
London, no free text, 140 characters. Push consent is the browser prompt;
email is explicit opt-in and default off, because that is direct
marketing. The merchant sees an audience count, never who is in it, and
the count is suppressed below the cohort minimum.

Referrals credit a month to both sides, but only when the referred member
actually pays. Crediting at sign-up would let one person with ten
addresses farm free membership in an afternoon.

## Note the demo seed in the Replit brief

## Point the Replit brief at v19

## A demo dataset, and no more demographics

seed:demo builds a believable town: 24 invented outlets across all nine
categories at real St Andrews street addresses, 60 residents, six months
of redemptions shaped like real trade with evening and weekend peaks and
a long tail of usage. Every business name is invented and every address
is @<slug>.test, which RFC 2606 reserves, so no account can ever send
mail to a real person and no real outlet is shown as a member it has not
agreed to be. The script refuses to run in production, refuses without
--yes, and refuses over any user whose email is not a .test address.

Five outlets each in the three biggest categories, because the town
benchmarks stay hidden below five and a demo that cannot show the feature
is not much of a demo.

Age band and sex are removed. Self-reported demographics are unreliable
at this scale, cohort suppression would hide most bands until there were
thousands of members, they are friction in a sign-up whose whole pitch is
trust, and not holding them removes a data protection obligation
altogether. The contract records the reversal rather than pretending the
fields were never there.

## Ship migrations, delete parked code, pin the transitive advisories

The Replit agent listed the work it repeats after every upload. Most of it
should not have been its job.

parked/ is deleted. It was the original MVP kept for reference, imported
by nothing, and it carried the two lines that logged the authorization
header and failed a security scan on every upload. Git history keeps it.

Migrations replace drizzle-kit push. A baseline migration is generated and
committed, npm run db:migrate applies anything outstanding in its own
transaction, and --baseline records migrations as applied without running
them, which is what a database whose tables were created by push needs
exactly once. push cannot tell a rename from a drop and a create, and
answering its prompts wrongly loses a column.

drizzle-orm and multer upgraded. The transitive advisories that were being
overridden by hand every time are pinned in package.json, so
npm audit --omit=dev now reports no high or critical findings in
production dependencies.

vite and vitest are deliberately held. They are build tooling, they never
run in production, and a major jump risks a working build for no gain to
the deployed application.

## Add the deployment brief for the Replit agent

## Three mobile fixes in the merchant portal

The tab strip scrolled but a pill sliced off by the screen edge read as a
broken layout, so it now fades at the edge and scrolls the active tab into
view on load. The redemption date filters overflowed side by side on a
phone and are now two equal halves with a real gap. "Over the 90 days"
read as a typo and is now "over the last 90 days".

## Member, not Premium; Ordnance Survey tiles; a smaller dependency surface

The paid resident tier is called Member. The brand rules forbid "premium"
as an adjective and the plan being named Premium read as a contradiction,
but the better argument is that the product already speaks of membership
throughout, and a residents' card whose paid tier is Member is simply the
right name. Database columns, API fields and types are unchanged; only the
words a person reads have moved.

The map no longer falls back to OpenStreetMap's public tiles, whose usage
policy is not meant for a commercial product. With nothing configured the
map is off and the list fallback takes over, so the wrong tiles cannot
ship by accident. Ordnance Survey is documented as the intended provider.
Pin framing tightened, and the map is shorter on a phone.

The pricing page shows a signed-in person only their own side of the
scheme. A resident has no use for what an outlet pays, and showing a
merchant the resident fee invites the wrong conversation about where the
money comes from.

The loyalty card no longer prints the resident's alias. The alias exists
so merchants never see a person in their data; printing it on the card
only tells the resident we keep one, and their name is enough for staff
who are standing in front of them.

Removed 36 dependencies left over from the original MVP, none of them
imported anywhere: Google Cloud Storage, Uppy, passport, jspdf, jszip,
node-forge, openid-client and others. That clears both critical
advisories and several high ones without changing a line of behaviour.

## Price change audit and a map of what is on now

Offer price edits are recorded: one row per changed field, written in the
same transaction as the update, with a flag on the moves that make an
offer look better without the resident getting more. An outlet can put a
menu up and then discount it, and competition only punishes that once
there are enough outlets and enough members for anyone to notice. The old
values vanish the moment they are overwritten, so this had to be built
before it was needed rather than after. The admin view states what
changed and never what it means.

A map view on the Offers tab, showing what is redeemable right now.
St Andrews is walkable, so "what can I get near here" has a spatial
answer. Outlets carry optional coordinates, set by a dragged pin rather
than typed; anything unplaced is listed under the map instead of
vanishing, and the whole view falls back to the list when tiles are
unavailable, so no offer is ever reachable only through the map.

Tiles default to OpenStreetMap for development. A keyed provider must be
set through VITE_MAP_TILE_URL before launch.

## Price the membership at £3 a month, billed yearly

£36 a year rather than £25, but quoted monthly everywhere it is offered:
the pricing page, the membership panel, the landing page and the printed
poster. £3 a month is the figure people judge it by, and a small monthly
number sits below the threshold at which anyone audits a statement.

The landing page now reads the price from /api/pricing rather than
carrying its own copy of it, and its verification step describes the
postcard rather than the proof of address that was dropped months ago.
The membership panel no longer claims Free includes points and tiers.

## Savings tracker, three merchant tiers, anonymity and the loyalty wallet

Resident savings. Offers carry two indicative figures (typicalSpend,
itemValue); redemptions freeze savedAmount at redemption time so a later
edit to an offer cannot rewrite anyone's history. The total is a floor:
where there is nothing to estimate from, the redemption contributes
nothing and is reported as uncounted. Shown on the Activity tab against
what the membership has cost.

Merchant plans become Free, Standard and Insight. Analytics is the only
feature whose value comes from the network rather than the outlet, so it
sits alone at the top. isPremium is retired for hasLoyalty/hasAnalytics;
legacy "premium" rows read as Standard.

Resident plans stop promising what Free never had: points and tiers only
ever came from redeeming, which was always paid for.

Residents no longer choose a username. A chosen handle undoes the alias
that keeps them anonymous to merchants, so the server generates one.
Optional age band and sex, never exposed per resident, aggregated only
above the cohort minimum with small bands folded away.

Loyalty cards get six themes and three patterns, and residents get a
wallet: a Cards tab holding every card they carry, and a presentation
view that leads with the tier and the flat discount rather than an
instruction.

Public counter, hidden until the numbers argue for joining.

## Pricing page and plan reminders

A public /pricing page sets out Free against Premium for both residents
and businesses, with fees read from the API rather than hardcoded, and
carries the worked analytics example so a merchant can see what they
would be buying. Compact reminders on the resident card tab and the
merchant plan tab link to it.

## Merchant analytics with a worked example for Free merchants

## Contract: pricing page and merchant analytics

## Outlets list and favourites

Residents can star an outlet. The Offers tab gains an Outlets view listing
starred places first, and a new outlet page shows one outlet's offers,
directions, booking link and the resident's points there. Offers from
starred outlets sort first. Merchants see how many residents have starred
them; admin sees it per business.

## Contract and schema: outlets list and favourites

## Three months free on both sides, and home-screen install

Stripe checkout now takes card details with a 90-day trial for anyone who
has never paid, and an invoice.paid handler converts the trial and handles
year-two renewals (previously missing). Trial sign-ups record a zero-amount
ledger row so they do not show as revenue.

Adds a web app manifest, icons and a non-caching service worker so Resicard
installs to the home screen, with an install prompt on the resident card tab.

## Town name on the card, configurable via TOWN_NAME

## Activity tab: summary strip, points blocks, progress bars, coloured feed icons

## Resident Free/Premium with downgrade before cancel

## Contract and schema: resident Free/Premium with downgrade

## Residency verification by postcard or in person; document upload removed

## Schema and contract: postcard and in-person residency verification

## Admin revenue: subscription ledger, run rate, cliffs, forecast

## Schema and contract: subscription ledger and admin revenue

## Rolling tiers, claimable tier benefits, outlet loyalty card, reward claims on the green screen

## Schema and contract: tier benefits as rewards, rolling tiers, loyalty card

## Schema and contract: reward claims, tier benefits

## Resident Activity tab: ready to claim, points list, merged feed

## Add db:reset script

## Add db:reset script

## Normalise household code input

## Client: plans UI; readable household codes

## Server: Free/Premium merchant plans and household membership

## Contract and schema for Free/Premium merchant plans and household membership

## Apply the Coast brand across the app and the till poster

## Brand foundation: fonts, tokens, logo component, favicons

## Light theme only, README, env example, parked notes

## Rebuild client against the new API

## Rebuild server against the new schema and API contract

## Start tidy: remove dead files, park unused features, new schema and API contract

## Clean up .replit configuration

Replit-Commit-Author: Agent

