# ABRAXAS | Codex efficient execution standard

- Work on the assigned problem only. Deliver one coherent change and one reviewable PR, then wait for the founder's next instruction.
- Start with affected files and targeted searches. Reuse existing components, contracts, and tests. Do not start unrelated audits, redesigns, or speculative refactors.
- Make the smallest change that fixes the established cause. Preserve authorization, tenant isolation, policy binding, consent, expiry, replay protection, receipt validity, and independent verification.
- Run focused tests first. Run broader security, integration, TypeScript, build, and CI checks when the change or repository requirements call for them. Do not repeat unchanged suites.
- For changed visual states, capture one desktop and one mobile screenshot. Expand only to investigate a specific defect.
- Report the cause, changed files, test results, PR link, and any blocker concisely. Stop when the requested work is ready for review.

## Cursor Cloud specific instructions

- **Production apex (`https://abraxasworld.xyz`)**: A green merge to `main` does not guarantee the apex alias moves forward. Recent `main` builds may land on the `demo` custom environment (`demo.abraxasworld.xyz`) while production-target deploys can be **CANCELED** (Vercel ignored build step). After UX-critical merges, run `bash scripts/operations/assert-production-apex-sha.sh` — it compares `origin/main` to the live `GET /api/public/deployment` `git_commit_sha` (Vercel-injected), then sanity-checks `/verify` entry copy. The script tries apex first, then falls back to `demo.abraxasworld.xyz` when apex returns non-JSON (common when the apex alias points at a preview deployment behind Vercel Deployment Protection). Set `VERCEL_PROTECTION_BYPASS` to force-check apex. If SHAs diverge, **re-point the `abraxasworld.xyz` alias** to the READY deployment whose `githubCommitSha` matches the merged commit. For founder live UX review while prod builds are canceled, **`https://demo.abraxasworld.xyz`** is the public surface at the same commit.

