---
name: Archive replacement policy
description: Durable safety rules for installing full Resicard project archives.
---

When installing a full project ZIP, preserve Git history, Replit configuration, agent and local tooling directories, installed modules, and the post-merge setup script. Replace the application source, then remove the uploaded archive.

The existing development database was baselined against all migrations shipped through V28. From now on, apply outstanding schema changes with the normal migration command. Never run `--baseline` again, never use `drizzle-kit push` on data that must be retained, and do not write replacement DDL when a reviewed migration is available.

Autoscale deployment startup must run the application only; do not run migrations in the deployment boot command. Apply production migrations deliberately before publishing, against the production database, after confirming its migration ledger state.

Retain older verification and demographic fields unless a reviewed migration deliberately removes them for a confirmed product reason.

**Why:** Uploaded versions may contain older runtime configuration, dependencies, and schemas. Blind replacement or forced schema pushes can remove working platform setup and production-like development data. Startup migrations previously put production into a crash loop because its database had schema objects but no migration ledger, and autoscale can start concurrent instances.

**How to apply:** Extract each archive to a temporary directory, inspect it, sync with explicit exclusions, preserve safe dependency constraints, run the normal migration command, then run checks, tests, build, security scans, workflow restart, and a live screenshot.