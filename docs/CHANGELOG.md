# Changelog

Newest first, generated from the commit history with `npm run docs:changelog`.
The Replit brief in `docs/REPLIT-BRIEF.md` describes how the codebase works and
does not change between archives; this file is where the version-specific detail
lives.

## The banded seal: the mark says its own name above 72px

The plain seal says nothing, so every application above thumbnail size
needed the wordmark bolted on beside it. Banded, the seal carries the
word struck across it the way a rubber stamp does.

This is a second state of one mark, not a second mark. Above 72px the
band is there; below it the band drops and what is left is the plain
seal, unchanged. The tile test sets that line: banded holds as a shape to
about 56px and is a grey lozenge under it, while the plain seal is still
itself at 24. So the app icon and the favicon stay plain, and nothing
about them changes.

The buoy moves to the dot on the i. It has to: the band crosses the
centre where the buoy lives, and the first four attempts all came out
flat one-colour because the accent had been covered up. That needs no new
rule, it is the buoy-once rule already - the word is present, so the
accent goes on the i rather than in the seal.

The band is a mask rather than an evenodd path. Evenodd would have been
tidier as one path, but the band crosses the knocked-out ring and would
fill that crossing back in as two ink slabs. Masked, the band takes
whatever is behind it, so one file sits on white, sand, sea and buoy.
The mark-banded-on-*.svg files fill the band instead, for a photograph,
where a knockout puts grass behind the letters.

## Regenerate the changelog

## Give the portals a ground, and replace the date boxes with periods

Two things a merchant reported from a phone in daylight.

The portal washed out. White panels with no edge on foam, which is three
per cent off white, is a screen with nothing on it: the panels stopped
reading as panels and six identical number tiles read as empty boxes.
So the portals now sit on mist, a step darker than foam, every panel
carries a hairline edge, and the one figure that moves - this month -
takes the sea ground so the eye has somewhere to land. Foam stays as it
was on the resident side, where a photograph is doing that job.

The From and To boxes on the redemptions feed failed three ways at once.
On iOS an empty date input draws nothing at all, so the merchant saw two
empty rounded boxes with no hint they were anything; on desktop the
native calendar button was sliced by the edge of a narrow column; and the
placeholder came out mm/dd/yyyy, because a date field takes its format
from the browser locale and cannot be told otherwise.

None of that is fixable while the control is a bare date input, and it
was the wrong question anyway. A merchant wants last week or last month,
not the third to the eleventh. So the period is now 7, 30, 90 days or
All, one tap, defaulting to 30 days, and a specific range lives behind
Custom - where two empty date fields are understood, because you have
just asked for them. The fields stack on a phone so the calendar button
has room, the range is restated in words underneath in UK order, and to
cannot be set before from.

## Regenerate the changelog

## Brand assets from one script; the app icon goes on sand

Every SVG in client/public/brand is now written by scripts/brand-assets.mjs
rather than hand-edited. The mark changed twice and the palette once, and
each time a lockup or a favicon was missed and shipped stale. Colours,
geometry and the buoy-once rule live in one file now.

The home screen tile is sand rather than sea. It is the one surface where
the app competes with every other icon on the phone rather than sitting
inside its own interface, and a dark tile disappears into a row of dark
tiles. The seal in sea on sand is 8.5:1 and holds at the size a phone
actually renders. The mark sits at 62% of the tile, 60% on the maskable so
Android's circular crop does not clip it.

The buoy appears exactly once in any lockup. If the seal is present the
buoy lives in the seal and the word beside it is plain; if the word stands
alone the buoy moves to the dot on the i. Two orange dots an inch apart
compete rather than compound. Hence one component with two states, and
wordmark-dotted-*.svg alongside the plain files.

In the outlined files the dotted state removes the i's tittle and draws the
disc in its place rather than laying one over the top, because an overlay
leaves a dark crescent the moment anything is scaled. In live text it has to
be an overlay, so the word is split only in that state: an inline-block
boundary either side of the i drops the kerning pairs across it.

## Adopt the seal as the Resicard mark

The mark is now an 18-point scalloped seal drawn as a single path with
fill-rule=evenodd: the ring is a real knockout, so the mark sits on the
sand panel, the card photograph and the buoy orange without a separate
file per ground.

Residency here is proved by a code posted to a door, so a stamp of
approval is honest rather than decorative. The horizon-and-buoy circle it
replaces said coastal rather than the people who live here, and it did not
survive a 56px home-screen tile.

## The seal, final: inverted centre, no town in the mark

An 18-point scallop, a ring knocked out at r=15.5 and the buoy at the
centre. Drawn as one path with fill-rule evenodd rather than a
white-filled circle, so the ring picks up whatever is behind it: the
sand panel, the card photograph, even the buoy orange. A white fill
would have pinned the mark to a white page.

No ST ANDREWS in the mark. Two reasons: it reads as a strapline, which
was asked for and then rejected twice, and the way this product scales
is licensing the platform to other towns. A logo with the town baked in
needs redrawing for every one of them.

Every asset in client/public/brand regenerated: the twelve lockup and
mark SVGs, the favicons, the app icons and the maskable pair, which sit
at 60% inside the safe zone because Android crops them to a circle.

## Regenerate changelog

## Make points actually expire, on inactivity

loyalty_programs.expiry_days has existed since the first schema and the
merchant settings form has always offered it as "Points expire after
(days)". Nothing enforced it. A merchant could set 365, believe their
liability was bounded, and it never was. Tier status already decayed on
a rolling window; the spendable balance never did.

The clock runs from the resident's last activity at that outlet, not
from when each point was earned. Per-point ageing is the obvious
reading of the field and it is the wrong rule: a regular would watch
their balance fall every month, in a scheme built to reward regulars.
Inactivity costs an active customer nothing, ever, and still clears the
balance of someone who has gone.

Clearing writes a negative adjust event carrying the reason, so the
balance and the history agree and a merchant asking where the points
went has an answer. Negative, so it cannot count towards tier status.
The warning's dedupe key carries the expiry date, so a visit that
pushes the date out earns a fresh warning later and a resident who does
nothing is not told every morning. Residents see the date on the card,
not only in an email.

Floor of 90 days, enforced in the rule and stated in the schema: a
setting below it is raised rather than honoured, because expiring
points sooner than the rules allow is the one outcome worth ruling out.

No migration; the column was already there.

Also fixes sendOnce's duplicate detection, found while testing this.
Drizzle wraps the driver error so the Postgres code sits on cause, and
the check only read the top level. Nothing was ever sent twice, but
every repeat run of the daily job reported its skipped messages as six
failures, which is how a real failure comes to be ignored.

Verified end to end against a seeded database: a lapsed balance cleared
with its audit event, a balance inside the warning window emailed and
left intact, a second run a no-op, and a visit pushing the date out
without re-warning.

## Regenerate changelog

## Stop the resident's name clipping on the card

The card gave the name whatever was left after the photo and the
renewal block, which on a phone is about 105px. "Iona Whyte" did not
fit, and that is not an unusual name.

The renewal date and the member number move to a footer strip under a
hairline, so the name gets the row from the photo to the card edge:
roughly 200px. A number on its own line is what a membership card does
anyway. Names longer than that step down a size and wrap to two lines
rather than truncate.

The step-down rule is pure and tested. It takes the stricter of overall
length and the longest single word, because a long name that breaks
cleanly needs less help than a shorter one that cannot break at all:
"Alexandra Fotheringham" is 22 characters and fits, "Ann
Featherstonehaugh" is 21 and does not.

Sizes are in cqw against the card rather than pixels. A pixel size
cannot be right when the card is a percentage of a page that is 320px
on an SE and 430px on a Pro Max, and the first attempt at this proved
it: fixed thresholds looked correct at 390 and clipped at 320, with the
wrapped name running into the town line. Checked at all three widths
with short, wrapping and long names.

## Regenerate changelog

## Repaint artwork on offers that already exist

The picture is written onto the offer row when the offer is created,
which is right for the same reason savedAmount is frozen at redemption
time, but it means new artwork never reaches offers already in the
database. The demo town on resicard.co.uk kept the old pictures, and the
only fix in the codebase was to re-run the seed, which deletes every
account and every redemption to do it.

This changes one column on rows whose current image is an SVG data URL,
and leaves everything else alone. The test being on the stored value
rather than on a list of demo merchant ids is what makes it safe against
a database with real outlets on it: a merchant's uploaded photograph is
not an SVG data URL and is never touched.

Verified against a freshly seeded database with an uploaded photograph
and a null image planted among the rows: 56 repainted byte-identical to
what a new seed produces, the photograph and the null untouched, and a
second run a no-op.

## Replace the original app with the rebuild

main has been the pre-rebuild application plus Replit's own commits,
while the rebuilt app has lived on `tidy` and been shipped to Replit as
zip archives. That left no single source of truth: changes Replit made
went to main, changes made here went to tidy, and the deployed app
matched neither branch's history.

This merge makes main the rebuilt app. The tree is `tidy`'s in full,
with two exceptions taken from main because they belong to Replit
rather than to the application:

  .replit                 the deployment config, including the userenv
                          block and the postMerge hook that tidy's older
                          copy does not have
  scripts/post-merge.sh   the hook that config points at

Both parents are recorded, so nothing is lost: the original app and
every Replit commit remain reachable in the history.

What the merge removes from main, and why:

  parked/                 the original MVP, kept for reference and
                          imported by nothing. It contains the two lines
                          that log req.headers.authorization and fail
                          the security scan on every upload.
  attached_assets/        a Replit image upload; the directory is now
                          gitignored
  DEPENDENCY_AUDIT.md     superseded by the overrides block in
                          package.json and docs/REPLIT-BRIEF.md
  residency-checks.tsx    components of the original app, with no
  document-verification.tsx  counterpart in the rebuild

## Bring the README up to the rebuilt app, and unstale .env.example

The README is what GitHub shows first and it was several versions
behind: it described drizzle-kit push rather than migrations, a parked/
directory that has been deleted, a resident fee of 25 and a merchant
Premium tier that is now two tiers. It said nothing about the decisions
most likely to be mistaken for bugs, which is the thing a reader coming
to this cold actually needs.

.env.example carried the same two stale values. Also added attached_assets/
and release archives to .gitignore, since Replit drops uploads into the
former and neither belongs in the tree.

## Regenerate changelog

## Draw the offer, not a pattern

The demo offer images were abstract: horizons, arcs, a bar chart. Fine
as a ground for a title, and correctly not photographs of businesses
that do not exist, but nothing tied the picture to the card, so a list
of them read as random. They now draw what the offer is - a pint for a
pint, a book for the bookshop, scissors for the barber.

The subject comes from the offer's own words, read against an ordered
keyword list so the specific beats the general, and falls back to a
three-deep rota per category so eight restaurant offers with no keyword
between them do not all draw a plate.

Everything is dark ink on a light body sitting on a disc, which is what
makes one ink safe on all five grounds, and the disc sits right of
centre to stay clear of the discount badge.

Three subjects were drawn twice. A fried egg centred on a round plate
reads as an eye, two sandwich triangles side by side read as mountains,
and a navy pint reads as cola. None of that is visible in the code; all
of it is obvious in a contact sheet of all 58 cards, which is how each
was caught.

## Regenerate changelog

## Set product tax codes on Stripe checkout line items

New Stripe accounts have Managed Payments on by default, and such an
account rejects a Checkout Session whose line item creates its product
inline without a tax_code. Checkout never opens; the resident sees
"Payment could not start" and it reads as an application bug.

Both codes are configurable, because which code applies is an
accounting question rather than a code one, and an accountant may
disagree with these defaults. The two alternatives - passing
managed_payments: { enabled: false } per session, or switching the
setting off in the dashboard - were rejected: the line items should
have carried a tax code anyway, and neither leaves the application
depending on an account default Stripe could flip back.

Applied at all three sites that build a product inline, including
changeMerchantSubscriptionPrice, which is easy to miss because it
creates a Price rather than a Checkout Session.

## Regenerate the changelog

## Verify at an outlet, and let the postcard code be typed

The postcard panel said a card was being prepared and gave no way to
enter anything, so the route could not be shown to anyone until a card
physically arrived, and a resident whose card came early had nowhere to
type it. The field appears as soon as a card is requested; an early code
fails exactly as a wrong one does, and costs no attempt because there is
no card to spend it against.

Verifying in person meant meeting an admin, which does not scale past the
first few dozen residents and puts every sign-up through one diary. Five
outlets now verify instead: the resident shows a code and something with
their address on it, the outlet looks the code up, checks the letter and
confirms. It reuses the shape merchants already know from redemptions, so
it needs no hardware and almost no explaining.

This hands a trust decision to merchants, so it is fenced. The right to
verify is off by default and only an admin can grant it: the merchant
settings schema deliberately does not list the field, so an outlet cannot
switch it on for itself. Every verification records the outlet and the
staff member, an admin can see the trail and revoke, and the code is
cleared the moment it is used, so a second attempt finds nobody.

The lookup returns a resident's name and address, which is the single
exception to merchants never seeing a resident. It is narrow on purpose:
it needs the resident's own code, works only for an outlet that has been
switched on, returns nothing beyond what is needed to read a letter, and
there is no way to browse or search.

## Regenerate the changelog

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

