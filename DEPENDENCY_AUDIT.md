# Dependency audit

Audit date: 2026-09-07

## Outcome

- Before: 43 findings (2 critical, 20 high, 16 moderate, 5 low).
- After: 19 findings (0 critical, 0 high, 15 moderate, 4 low).
- No unsafe `npm audit fix --force` or blanket major upgrade was used.

The critical/high direct chains were remediated by upgrading `@google-cloud/storage`,
`drizzle-orm`, `express`, `jspdf`, `multer`, `node-forge`, `postcss`, `vite`, and
`ws`. Compatible transitive patches are pinned in `package.json` overrides.

## Remaining findings

The remaining findings are moderate or low severity:

- Runtime chains: `@google-cloud/storage` (`retry-request`, `teeny-request`,
  `gaxios`, `uuid`), Express (`body-parser`, `qs`), `express-session`
  (`on-headers`), and `fflate`.
- Development/build chains: `drizzle-kit` and `tsx` (`esbuild`),
  `postcss-selector-parser`, and `yaml`.

`npm audit` only offers breaking or otherwise incompatible parent changes for
the remaining direct moderate findings, including Express 5 and incompatible
`@google-cloud/storage`/`drizzle-kit` changes. They are intentionally documented
instead of force-applied. Re-evaluate them when those parent upgrades can be
tested as dedicated migrations.

## Verification

- `npm ls --all`: valid dependency tree.
- `npm run check`: passed.
- `npm run build`: passed.
- Development workflow: starts on port 5000.
- Home page: rendered successfully with no browser-console errors.
- `npm test`: unavailable because the configured `vitest` executable is not
  installed; restoring automated checks is tracked separately.