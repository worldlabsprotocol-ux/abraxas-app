# Build #516 — Demo recovery verification

## Status: BLOCKED (agent run)

Supabase MCP exposes project health (`ACTIVE_HEALTHY`) and Postgres version for `ocntwbxarpjeixdnzide`, but **does not** expose backup timestamps, PITR window, or non-destructive restore rehearsal.

Per founder Build #516 conditions, remote migration apply is **not authorized** until recovery is verified.

## Operator procedure (required before apply)

1. Open Supabase Dashboard → project **abraxas-partner-demo** (`ocntwbxarpjeixdnzide`).
2. Confirm **Database Backups** / **Point in Time Recovery** is enabled and note the **latest recovery timestamp**.
3. Record that timestamp in your operator log (do not commit secrets).
4. Export optional logical schema snapshot if your runbook requires it.
5. Set environment for apply tooling:
   - `BUILD516_DEMO_RECOVERY_VERIFIED=ocntwbxarpjeixdnzide`
   - `BUILD516_DISPOSABLE_REHEARSAL_VERDICT=PASS`
   - `DEMO_SUPABASE_DATABASE_URL=<Demo direct or pooler URL>`
   - Demo guard vars from Build #515

6. Run `npm run gate:build516-pre-apply` — must exit 0.
7. Run `npm run apply:build516-demo -- --confirm=ocntwbxarpjeixdnzide`

**Do not** call `restore_project` on the live Demo project as a test.

## If a migration fails mid-apply

Stop immediately. Do not apply subsequent files. Use Supabase PITR/backups to restore to the recorded timestamp, then reconcile ledger state with engineering.
