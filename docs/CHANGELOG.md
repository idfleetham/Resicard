# Changelog

Newest first, generated from the commit history with `npm run docs:changelog`.
The Replit brief in `docs/REPLIT-BRIEF.md` describes how the codebase works and
does not change between archives; this file is where the version-specific detail
lives.

## Let the home page headline stand on its own

Lose the paragraph under "Local prices for local people", and the full stop.
The explanation made the same argument twice and turned an opening statement
into a complaint; the line does not need help. No full stop because this is
a sign, not a sentence.

## Till staff without logins

Awarding points at the till needed a full user account per person, with a
username, email and password. No pub creates eight logins for eight bar
staff, so nobody had a PIN and the till tool went unused - the feature was
gated behind an onboarding cost nobody would pay.

Till staff are now a name and a four-digit PIN. They are not accounts: no
sign-in, no email, and the only thing the row does is say who was on the
till. Fully editable, because names get spelled wrong, PINs get shared and
need changing, and people leave.

/api/loyalty/earn accepts a PIN from either a till staff member or a portal
login. Deactivated staff are excluded by the query, so taking someone off
the rota stops their PIN at once without deleting the record of who awarded
what. Checked end to end: switched-off PIN 403s, a live one is accepted.

The Team section is now two panels - who works the till, and who can sign
in - because they are two different things, and the copy says plainly that
bar staff do not need a login.

Needs migration 0006. It creates one table and touches nothing existing.
The demo seeds two or three named staff per outlet on PIN 1234.

## Tier ranks, a chosen analytics period, and softer poster copy

Tier colours are now the rank - bronze, silver, gold - counted from the top
so gold always means top of the house, and merchants no longer pick them. A
resident carrying a dozen cards had no way to see where they stood anywhere;
the names stay, the colour carries the status. Programmes are capped at three
tiers, enforced on the endpoint and not just the form. The colour is derived
on every read and never stored, so no migration and nothing destroyed.

The ranks get lighter from bronze to gold so the scale reads as a scale: a
first pass had bronze and silver at the same lightness, separating at only dE
13.5. The pill also gained a hairline ring, since bronze on a rust card is
1.2:1 against it.

The analytics period is now chosen and defaults to this quarter. The
comparison window follows the honest rule for each kind: a quarter part-way
through is measured against the same elapsed days of the last one, a rolling
window against the window before it, and a calendar period against the whole
calendar period before it - which is not the same as subtracting its length,
because Q2 is 91 days and Q1 is 90.

Poster copy: "Scan for the local price" becomes "Scan here" and the "better
deal" line is gone. That poster hangs in a window visitors read too, and
announcing a two-tier price list to the street puts the outlet in an awkward
spot for no gain.

Also: the Send tab no longer shows a 44px em dash where a member count would
be, and the demo data uses all fourteen card colours.

## Give the wallet stack a seam

Two outlets that chose the same card colour merged into one tall block in
the resident's wallet - a sea card on a sea card read as a single card with
two names on it. The stack had a drop shadow, but at 18% sea it was
invisible where a dark card lay on a dark card.

Every tucked card now draws a hairline along its own top edge in that
card's own foreground, which is the one colour guaranteed to contrast with
its own background, so the seam cannot fail whatever the outlets picked.
The drop shadow splits into a tight dark one that makes the seam and a wide
soft one that lifts the card.

Not done: reordering the stack to separate matching colours. The order
means something (favourites first) and with a seam the duplicates are fine.

## Analytics colour, honest bars, and a wider card palette

Offer performance bars were drawn as a fraction of the leader, so the top
offer filled its track every time - reading as 100% while the number beside
it said 75%. They are now drawn at their actual share, and comparison bars
keep 8% headroom so nothing reads as a completed progress bar.

Sea is the brand's ink and it was the fill for every chart, which is why the
analytics page read as a wall of grey-black: sea has almost no chroma. The
data now wears a validated three-colour set - teal, buoy orange, berry -
assigned in fixed order. Worst colour-blind adjacent pair separates at dE
16.0, worst normal-vision pair at 18.6. Text keeps the ink tokens. The old
second series was sand on white, very nearly invisible.

"Median restaurants" is now "A typical restaurant". The maths is still a
median on purpose - with five outlets a mean lands where no real outlet
sits - but nobody reads the word, so the note says "the middle outlet of the
5 restaurants in the town" instead.

The loyalty tab preview was rendering the till-sized card in a 340px column,
truncating the outlet name and crowding the corner, and it never passed a
logo. It now matches the programme page.

Card colours go from six to fourteen. The original six were all deep and
desaturated - sea and ink are nearly the same card. Eight brighter ones are
added. Every pairing is held to 4.5:1 on both foregrounds, and that is now a
test rather than a comment: 36 cases that fail the build on a theme below
the floor, a duplicated background, or a theme in one list but not the
other. No migration: card_theme is a text column.

## Published your App

Replit-Commit-Author: Deployment
Replit-Commit-Deployment-Build-Id: cf3bfff2-d039-4cae-9e7e-53a1da7a616a

## Update merchant and resident portal components and documentation

Replit-Commit-Author: Agent

## Published your App

Replit-Commit-Author: Deployment
Replit-Commit-Deployment-Build-Id: 868ded17-8710-455a-be82-6970e2aad312

## Update merchant portal components and refine dashboard UI

Replit-Commit-Author: Agent

## Published your App

Replit-Commit-Author: Deployment
Replit-Commit-Deployment-Build-Id: b145cd35-1d1c-4df3-b4c4-2896960039d6

## Update branding assets and documentation

Replit-Commit-Author: Agent

## Published your App

Replit-Commit-Author: Deployment
Replit-Commit-Deployment-Build-Id: 3a28924e-b6d5-45cd-9d51-35203eda4de8

## Update brand assets and refactor merchant portal components

Replit-Commit-Author: Agent

## Published your App

Replit-Commit-Author: Deployment
Replit-Commit-Deployment-Build-Id: 1785fe4e-3db9-41ed-bcf9-7f494c877f82

## Update branding assets and icons

Replit-Commit-Author: Agent

## Published your App

Replit-Commit-Author: Deployment
Replit-Commit-Deployment-Build-Id: 3949cc1b-242d-4184-98e5-c4b486884404

## Add shared name display utilities, membership card updates, API documentation, changelog entries, and tests.

Replit-Commit-Author: Agent

## Published your App

Replit-Commit-Author: Deployment
Replit-Commit-Deployment-Build-Id: 19c2ee28-fd1c-4c8d-ad3b-1ac73302f28a

## Update documentation and project configuration files

Replit-Commit-Author: Agent

## Replace the original app with the rebuild

## Published your App

Replit-Commit-Author: Deployment
Replit-Commit-Deployment-Build-Id: f0b2aa6b-9b0a-492c-9f12-7ed96c38a920

## Update Stripe integration and demo script with documentation changes

Replit-Commit-Author: Agent

## Published your App

Replit-Commit-Author: Deployment
Replit-Commit-Deployment-Build-Id: 80d84f1f-9e1b-499b-ad48-2cb23d9304e7

## Published your App

Replit-Commit-Author: Deployment
Replit-Commit-Deployment-Build-Id: cd9548ac-a7d8-4975-b425-86035a80bacd

## Update documentation and server configuration settings

Replit-Commit-Author: Agent

## Published your App

Replit-Commit-Author: Deployment
Replit-Commit-Deployment-Build-Id: 7df5447f-e724-4c32-963a-71a5918cba41

## Published your App

Replit-Commit-Author: Deployment
Replit-Commit-Deployment-Build-Id: e273eebb-939d-4038-ab3b-40dd1f04f2aa

## Refactor resident verification components and update admin business table logic

Replit-Commit-Author: Agent

## Published your App

Replit-Commit-Author: Deployment
Replit-Commit-Deployment-Build-Id: c7c7ce6f-6d8c-4059-b42e-cadaf4220d3b

## Refactor loyalty components and update pricing table display logic

Replit-Commit-Author: Agent

## Published your App

Replit-Commit-Author: Deployment
Replit-Commit-Deployment-Build-Id: 894188fe-c1b2-482e-928f-368dde241076

## Update documentation, server configuration, and environment settings

Replit-Commit-Author: Agent

## Update merchant analytics components and map integration features

Replit-Commit-Author: Agent

## Published your App

Replit-Commit-Author: Deployment
Replit-Commit-Deployment-Build-Id: 4858946b-be0f-47f5-a207-ee0ce719bc87

## Remove deprecated demographic components and update registration forms

Replit-Commit-Author: Agent

## Published your App

Replit-Commit-Author: Deployment
Replit-Commit-Deployment-Build-Id: 63f1b44f-46c5-43da-b75f-950fe36be5f6

## Update various UI components for consistency and styling improvements

Replit-Commit-Author: Agent

## Published your App

Replit-Commit-Author: Deployment
Replit-Commit-Deployment-Build-Id: 9a821f40-969b-47b3-ad8f-8bdaae805b9b

## Update admin revenue and business management components

Replit-Commit-Author: Agent

## Published your App

Replit-Commit-Author: Deployment
Replit-Commit-Deployment-Build-Id: 0732c49b-4eaf-4f85-8cd6-965c409601a2

## Refactor admin dashboard components and remove dependency audit file

Replit-Commit-Author: Agent

## Published your App

Replit-Commit-Author: Deployment
Replit-Commit-Deployment-Build-Id: 30b0be98-a81c-4131-a2c0-316e124b482c

## Clean up home page code

Replit-Commit-Author: Agent

## Published your App

Replit-Commit-Author: Deployment
Replit-Commit-Deployment-Build-Id: 9c357fa3-a04b-45df-b77a-8627beb96889

## Published your App

Replit-Commit-Author: Deployment
Replit-Commit-Deployment-Build-Id: e9d383ca-f5bf-47bd-915f-39a2a61fe742

## Add new image asset

Replit-Commit-Author: Agent

## Update dependencies and clean up route references

Replit-Commit-Author: Agent

## Update Replit configuration settings

Replit-Commit-Author: Agent

## Add asset image 1788807162509

Replit-Commit-Author: Agent

## Published your App

Replit-Commit-Author: Deployment
Replit-Commit-Deployment-Build-Id: 46bfc623-f7dd-4a85-a4ba-34511e546b0a

## Configure Replit and add post-merge script

Replit-Commit-Author: Agent

## Remove critical and high dependency vulnerabilities

Replit-Task-Id: 0c40312e-529b-4f6e-a86b-8eccdbc5ba23
Replit-Merge-Attempt: MergeTask:0c40312e-529b-4f6e-a86b-8eccdbc5ba23:1:4394d1cf

## Remove unused loyalty components and update dashboard routes

Replit-Commit-Author: Agent

## Update edit profile page

Replit-Commit-Author: Agent

## Add new attached images

Replit-Commit-Author: Agent

## Add features to resident scan page

Replit-Commit-Author: Agent

## Update the create admin script

Replit-Commit-Author: Agent

## Refactor admin table components and update configuration files

Replit-Commit-Author: Agent

## Update project configuration and clean up attached assets

Replit-Commit-Author: Agent

## Add resicard-tidy asset archive

Replit-Commit-Author: Agent

