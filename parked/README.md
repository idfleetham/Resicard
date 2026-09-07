# Parked code

Nothing in this folder is compiled or shipped. It is kept so that ideas built in the
first version are not lost. Delete anything here once you are sure it is not coming back.

- `client/pages/wallet-add.tsx`, `wallet-error.tsx`, `server/passkit.ts`: Apple Wallet
  pass generation. Needs an Apple Developer account and signing certificates.
- `client/pages/tier-memberships.tsx`: residents buying loyalty tiers for money.
  Dropped when the model moved to flat fees.
- `client/components/family-member-form.tsx`, `subscription-management.tsx`,
  `merchant-subscription-management.tsx`, `billing-preview.tsx`: monthly/annual
  and family plans for residents, and per-redemption billing for merchants.
- `reference/`: the old monolithic server (`routes.ts`, `storage.ts`), the old schema,
  and the voucher-based redemption flow where the merchant scanned the resident.
  Kept only for reading. The new server does not import any of it.
