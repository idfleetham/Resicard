---
name: Archive replacement policy
description: Durable safety rules for installing full Resicard project archives.
---

When installing a full project ZIP, preserve Git history, Replit configuration, agent and local tooling directories, installed modules, and the post-merge setup script. Replace the application source, then remove the uploaded archive.

Apply schema changes additively. Retain older verification fields and existing records rather than accepting destructive rename/drop prompts or forcing schema synchronization.

**Why:** Uploaded versions may contain older runtime configuration, dependencies, and schemas. Blind replacement or forced schema pushes can remove working platform setup and production-like development data.

**How to apply:** Extract each archive to a temporary directory, inspect it, sync with explicit exclusions, patch blocked dependencies and unsafe reference logs, add new database structures with guarded SQL, then run checks, tests, build, security scans, workflow restart, and a live screenshot.