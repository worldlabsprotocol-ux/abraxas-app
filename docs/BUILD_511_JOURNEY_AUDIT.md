# Build #511 — Journey audit & UX delivery

## Screen-by-screen map (holder + partner)

| Step | Route / surface | Purpose | Primary action | Recovery |
|------|-----------------|---------|----------------|----------|
| 1 | `/` (homepage) | Value prop | Start Passport / Partners | **Protected** — proposed copy in BUILD_511; use `/experience/tour` for judges |
| 2 | `/passport` | Holder hub | Sign in / verify / reuse | `PassportHolderNextStep` + status banners |
| 3 | `/passport?view=verify` | Abraxas Verify capture | Submit evidence | Refresh + session probe panels |
| 4 | IDV pending | Passport status | Wait | Under-review copy; safe to leave |
| 5 | `/partner/verify` | Partner entry | Wallet sign-in (if needed) | Solana auto-evaluate when session ready (#511) |
| 6 | Partner brief + consent | Disclosure | Continue / consent | Privacy comparison (Cielo / GT) |
| 7 | `/partner/continue` | Hosted continuation | Resume flow | `savePartnerVerifyResume` + resume CTA |
| 8 | Receipt / return | Narrow result | Return to partner | `LiveDecisionReceiptCard` + return URL |
| 9 | `/integrations` | Partner dev hub | Docs / tour / apply | Guided tour link |
| 10 | `/experience/tour` | **Simulated** judge walkthrough | Continue steps | No wallet / no IDV |

## Click-count estimates (happy path)

| Journey | Before (typical) | After #511 | Notes |
|---------|------------------|------------|-------|
| Judge understands product | N/A (no tour) | **~8 clicks** in &lt;60s simulated tour | No auth |
| Returning verified holder → partner | 4–6 (sign-in repeats) | **3–4** when Phantom session valid | Auto-evaluate skips redundant sign-in screen |
| First-time holder → verify | 5+ | Unchanged (IDV required) | No bypass |

## Shipped UX changes

- `PassportHolderNextStep` — canonical next action on Passport home
- `PassportHolderJourneyStatus` — single step model aligned with `identityUiState`
- `PrivacyComparisonPanel` — traditional vs Abraxas + Cielo/GT disclosure lists
- Partner verify shell — privacy panel for Cielo / Good Trouble policies
- Solana partner flow — one auto-evaluate when wallet session already valid (reduces sign-in loop)
- `GET /api/credentials/me` — Solana subject alignment (#510 carry)
- **`/experience/tour`** — isolated simulated judge/investor tour
- Playwright: `tests/ux/judge-tour.spec.ts`

## Homepage (Phase 2)

**Blocked without `[ui-change]` approval** — protected baseline unchanged.

**Proposed hero (for founder approval):**

- Headline: *Verify once. Prove only what's needed.*
- Sub: *Abraxas verifies eligibility privately so applications get trusted answers without collecting identity documents.*
- Primary CTA: `/passport` · Secondary: `/integrations` or `/experience/tour`

## Data collection audit (summary)

| Field / step | Required? | Reuse? | Action #511 |
|--------------|-----------|--------|-------------|
| Phantom sign-in | Yes (holder auth) | Session cookie | No duplicate when session valid |
| Google sign-in (legacy) | If non-Solana | — | Unchanged |
| IDV documents | Yes for L2 policies | Reuse when qualified | Reuse matrix + tour step 7 |
| Partner consent | Yes per request | Not IDV again | Consent-only outcome in matrix |
| DOB prequal (GT browse) | Policy-specific | — | Unchanged; privacy panel clarifies no DOB to partner |

## Rollback

- Remove `/experience/tour` route and integrations link
- Revert `PartnerVerifyClient` auto-evaluate effect if loop reports in production
- Passport next-step card is additive — safe to hide via feature flag if needed

## Quality gate (agent VM)

| Check | Result |
|-------|--------|
| `check:homepage` | Pass |
| `check:homepage-guard` | Pass |
| `vitest` (passport journey + reuse matrix) | Pass |
| `npm run test:ux-judge-tour` | Pass (2/2; unset `ABRAXAS_RUNTIME_ENV` for local dev — see `playwright.ux.config.ts`) |
| `npm run build` (placeholder Supabase) | Pass with known static export warnings on privileged API routes |

## Remaining blockers

- Live Cielo / GT browser E2E on Demo (operator)
- Homepage hero update (guard approval)
- Real Phantom + IDV acceptance (not simulated)
- Core Web Vitals baseline on production Demo URL
