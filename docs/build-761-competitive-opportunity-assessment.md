# Build #761 — Competitive opportunity assessment

**Purpose:** Rank engineering investments against hackathon competitiveness (including Colosseum-style rubrics), investor conviction, and institutional integration credibility—without adding complexity that does not change what a reviewer can independently verify.

**Judge north star (three seconds):**

1. Abraxas solves a **real institutional problem** (reusable verification, minimal disclosure, independent relying-party checks).
2. The **trust model is defensible** (issuer authority, holder binding, revocation freshness, signed decisions, fail-closed policy).
3. The team **ships** (working HTTP flows, tests, preview, partner integration path).

Winning is **not** “we deployed to mainnet.” It is **one complete, inspectable proof** that beats ten disconnected demos.

---

## How we use Colosseum-style criteria (non-exhaustive)

Hackathon rubrics vary; use these lenses when scoring candidates:

| Lens | Question for Abraxas |
| --- | --- |
| Problem / impact | Does a relying party avoid copying identity data while still enforcing policy? |
| Technical depth | Can a reviewer reproduce verification without trusting our database? |
| Solana fit | Does the chain add a guarantee signatures alone cannot, or only anchor/enforce an already-verified decision? |
| Demo quality | Is the path one continuous story with artifacts, not slide ware? |
| Execution | Do CI, docs, and staging match the claims? |

---

## Current codebase assets (honest inventory)

**Already built and test-backed (inspectable):**

- **Wallet-native protocol** — purpose-bound Solana `signMessage` envelopes, session vs action separation (`docs/connect/WALLET_NATIVE_TRUST_PROTOCOL.md`).
- **Holder presentation** — Passport challenge + possession + commit + policy execution in Developer Workspace (Build #760; sandbox test issuer only).
- **Signed decision receipts** — canonical payload, independent POST validate without wallet.
- **Portable revocation** — checkpoint semantics; fail-closed when stale.
- **Partner integration** — Hosted handoff, PartnerKit source (`docs/VERIFY_WITH_ABRAXAS_QUICKSTART.md`), Integration Studio.
- **Third-party verification** — institutional bundle CLI (`npm run build-569:verify-bundle`, `docs/partner-handoff/passport-independent-verifier/`).
- **Certification scripts** — Build #546–#549 `certify:*` and live-partner test suites.
- **Reference Solana programs** — eligibility gate / protocol access (`solana/abraxas-eligibility-gate/`); **Abraxas does not deploy these to devnet/mainnet as product infrastructure**; partners deploy their own copies.

**Explicitly not claimed without evidence:**

- Production real-world age eligibility (sandbox test issuer ≠ operational issuer).
- Published npm PartnerKit package (source in repo only).
- Manufactured partner logos, usage metrics, or “live on mainnet” unless deployment records exist.

---

## Ranked opportunities

Scores: **Impact** (judge/investor/partner), **Differentiation**, **Inspectable evidence**, **Delivery cost** (relative: S/M/L), **Security risk** (Low/Med/High).

### Rank 1 — One institutional transaction, independently verifiable (Priority 1)

| Field | Assessment |
| --- | --- |
| Resolves | “Is this another isolated UI demo?” (judges, investors, design partners) |
| Demonstrates | End-to-end: partner request → holder authorization → credential evidence → policy decision → **third party validates receipt/bundle without Abraxas session** |
| Differentiation | Relying party verification **without** Abraxas identity DB or live callback trust |
| Evidence | Single runbook + video: HTTP trace, receipt JSON, `build-569:verify-bundle` exit 0, Vitest certification JSON under `reports/` |
| Cost | **M** — mostly orchestration, docs, one reference partner sandbox app (existing Good Trouble / institutional staging paths) |
| Security | **Low** if labels sandbox vs production stay strict |
| On-chain? | **Optional epilogue** only (see Rank 3) |

**Recommendation:** Make this the **primary Build #761 deliverable**. Do not start new protocol surfaces until this lane has a judge-facing artifact index.

---

### Rank 2 — Judge-ready evidence package (meta-deliverable)

| Field | Assessment |
| --- | --- |
| Resolves | Reviewers cannot find proof; engineers bury capability in repo history |
| Demonstrates | Reproducible commands, artifact paths, status matrix (Implemented / Cryptographically tested / Issuer operational / Production authorized) |
| Differentiation | Professional institutional handoff vs hackathon vapor |
| Evidence | `docs/build-761-judge-evidence-package.md` (index), links to CI jobs, preview URL, CLI outputs |
| Cost | **S** |
| Security | **Low** |

Ship alongside Rank 1; no new crypto required.

---

### Rank 3 — Solana integration with **defensible** value (Priority 2)

| Field | Assessment |
| --- | --- |
| Resolves | “Why Solana?” skepticism |
| Demonstrates | What **native wallet authorization** already proves (control of key for scoped resource) vs what **programs** add |

**What wallet signatures already establish (today):**

- Holder intent for a **specific operation, resource, policy, domain, expiry** (action envelopes).
- Non-repudiation of that intent within the envelope semantics (Ed25519 via Phantom).

**What issuer-backed evidence + server verification establish:**

- Issuer trust, credential integrity, revocation freshness, policy predicate satisfaction, signed Abraxas decision.

**When additional Solana program deployment is worth it:**

- Partner needs **composable on-chain enforcement** (e.g. DeFi/RWA contract must read a **gate PDA** updated only after verified attestation in the **same transaction** as wallet approval).
- Reference gate already models trusted signer rotation and `authorize` with instruction introspection (`solana/abraxas-eligibility-gate/`).

**When it is *not* worth it (deprioritize):**

- Abraxas-operated mainnet deploy **only** to display a program id.
- CPI that re-verifies the same JSON a partner could verify off-chain with **no** stronger atomicity story.
- Replacing signed receipts that already support independent verification.

| Cost | **M–L** for polished devnet partner-owned deploy + scripted tx; **L+** for mainnet + audit narrative |
| Security | **Med–High** if keys, PDAs, or signer rotation are operated without clear trust boundary |
| Recommendation | **Document first**, then one **partner-scoped devnet gate demo** as part of Rank 1 video—not a parallel product line |

---

### Rank 4 — One credible partner integration story (Priority 3)

| Field | Assessment |
| --- | --- |
| Resolves | “Can we integrate?” (partners, investors) |
| Demonstrates | Create request → callback → server verify → failure modes (`api_key_required`, replay, policy mismatch) |
| Differentiation | Policy-agnostic PartnerKit + hosted handoff vs bespoke OAuth age gates |
| Evidence | `VERIFY_WITH_ABRAXAS_QUICKSTART.md` exercised on Preview; one minimal reference app or documented Good Trouble / institutional sandbox milestone |
| Cost | **M** |
| Security | **Low** if API keys and callback verification stay server-side |

Prefer **depth on one integration** over Integration Studio feature sprawl.

---

### Rank 5 — Evidence of demand (Priority 4)

| Field | Assessment |
| --- | --- |
| Resolves | Investor “is anyone using it?” |
| Demonstrates | **Only real artifacts:** design-partner docs, staging certifications, demo completions, signed pilot scopes—**no invented metrics** |
| Cost | **S** (collection and presentation, not engineering) |
| Recommendation | Add a **“Demonstration progress (verified)”** section to the evidence package; leave traction empty if empty |

---

### Deprioritize / reject

| Candidate | Why |
| --- | --- |
| New evaluate-only API adapters | Does not complete holder journey; judges already saw sandbox evaluation |
| Deterministic or wallet-derived “possession secrets” for real issuers | Publicly reproducible; simulation only (addressed in #760) |
| Mandatory Veriff / new identity stack | Contradicts product thesis |
| More trust-stage animations without execution events | Weak signal vs one CLI verify |
| Abraxas-operated mainnet program without partner enforcement story | Appearance risk; high ops/security cost |

---

## Recommended Build #761 scope (engineering)

1. **Institutional transaction lane (Rank 1)** — single scripted path combining hosted partner **or** institutional presentation bundle export + `build-569:verify-bundle`.
2. **Evidence index (Rank 2)** — `build-761-judge-evidence-package.md`.
3. **Solana chapter (Rank 3)** — short doc + optional devnet gate clip **only if** it shows atomic enforceability partners cannot get from HTTP alone.
4. **Integration appendix (Rank 4)** — point to quickstart + one live callback trace.
5. **Demand appendix (Rank 5)** — factual list only.

**Out of scope for #761 unless Rank 1 is complete:** new issuer adapters, production trust config changes, mainnet deploy.

---

## Success criteria for hackathon / investor review

A skeptical judge can, in one sitting:

1. Run or watch **one** end-to-end flow with labeled artifacts.
2. Run **independent verification** (receipt validate or bundle CLI) without Abraxas credentials.
3. Read **one page** explaining wallet vs issuer vs Abraxas vs optional on-chain gate roles.
4. See **CI green** on ephemeral wallet + institutional certification tests relevant to the demo path.

That is a stronger position than “more features on mainnet.”
