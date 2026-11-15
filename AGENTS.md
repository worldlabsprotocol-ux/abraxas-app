# ABRAXAS | Codex efficient execution standard

- Work on the assigned problem only. Deliver one coherent change and one reviewable PR, then wait for the founder's next instruction.
- Start with affected files and targeted searches. Reuse existing components, contracts, and tests. Do not start unrelated audits, redesigns, or speculative refactors.
- Make the smallest change that fixes the established cause. Preserve authorization, tenant isolation, policy binding, consent, expiry, replay protection, receipt validity, and independent verification.
- Run focused tests first. Run broader security, integration, TypeScript, build, and CI checks when the change or repository requirements call for them. Do not repeat unchanged suites.
- For changed visual states, capture one desktop and one mobile screenshot. Expand only to investigate a specific defect.
- Report the cause, changed files, test results, PR link, and any blocker concisely. Stop when the requested work is ready for review.

## Cursor Cloud specific instructions

- **Production apex (`https://abraxasworld.xyz`)**: After UX-critical merges, run `bash scripts/operations/assert-production-apex-sha.sh`. It reports **PRODUCTION** and **DEMO** separately (`GET /api/public/deployment` `git_commit_sha` + `/verify` copy). **DEMO PASS is not PRODUCTION PASS.** Set `VERCEL_PROTECTION_BYPASS` to verify apex when Deployment Protection blocks automation (headers only; do not disable protection).
- **Vercel ignored build step**: Production builds were canceled by dashboard command `VERCEL_ENV=production` → exit 0 (skip). `vercel.json` `ignoreCommand` now runs `scripts/operations/vercel-ignored-build-step.sh` (always build). Founder UX testing on demo: **`https://demo.abraxasworld.xyz/verify`**.

