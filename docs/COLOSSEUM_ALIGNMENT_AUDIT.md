# Colosseum Crypto World’s Fair — Product and Technical Alignment Audit

**Audit date:** 2026-09-18  
**Submission target:** 2026-10-12  
**Codebase audited:** `origin/main` @ `e550f62def220889bc903f555553ca5411d529c1`  
**Production:** `https://abraxasworld.xyz`  
**Production GitHub deployment SHA:** `e550f62d` (created 2026-09-18T03:48:08Z) — **matches `origin/main`**  
**This document does not invent users, GMV, security certifications, or legal approvals.**

Evidence labels used below: **VERIFIED**, **PARTIAL**, **SIMULATED**, **STALE**, **MISSING**.

---

# Executive Assessment

Abraxas **today** is reusable private eligibility infrastructure with a working Partner Flow, signed public receipts, Passport (Google zkLogin → Sui subject), and an external relying-partner story (Good Trouble). Homepage copy already states the intended product: verify once, share only the policy result.

The submission is **not blocked by missing architecture**. It is blocked by **narrative leakage** (RWA marketplace / tokenomics / SEO still present), **honest labeling of the live demo** (Good Trouble browse is L0 self-attestation on sandbox-class policy, not government-ID retail), and **operational demo risk** (Google sign-in + Passport register must succeed on Production in one browser session).

`main` and Production SHA **match**. That is a strength. Do not enlarge the product before October 12. Make one loop undeniable:

**One user → Passport (account) → Good Trouble browse eligibility → signed result → partner callback / public receipt check → reuse without repeating the attestation.**

---

# Current Product Architecture

```
Holder browser (abraxasworld.xyz)
  Google OIDC (openid email) → zkLogin → Sui address (subject)
  Abraxas Passport / claims / optional self-attestation
        │
        ▼
Partner redirect  /partner/verify?partner_id&policy_id&return_url
        │
        ▼
POST /api/v1/partner-flow/evaluate | complete | refresh
  policy snapshot + claims → decision → Ed25519 decision receipt
        │
        ▼
Callback to allowlisted return_url (no raw PII in query)
Partner server GET /api/receipts/{id}/public  (authoritative)
Optional webhooks = notification only
```

| Layer | Location | Role |
|-------|----------|------|
| User Passport | `app/passport/`, `lib/sui/zklogin/` | Account + reusable subject |
| Partner entry | `app/partner/verify/page.tsx`, `components/partner/PartnerVerifyClient.tsx` | Real orchestration, not a mock |
| Policy | `lib/policy/evaluateSubjectPolicy.ts`, `lib/policy/evaluatePolicy.ts` | Partner-owned rules + version pin |
| Decision receipts | `lib/decisionReceipts/` | Signed, expiring, revocable artifacts |
| Public verify | `app/api/receipts/[receiptId]/public/route.ts` | Independent partner check |
| Partner ops | `lib/partner/webhooks/`, `lib/partner/partnerMetering.ts`, `lib/partner/partnerAuth.ts` | Keys, webhooks, metering |
| Launchpad | `app/developers/launchpad/`, `lib/partner/launchpad/` | Self-serve sandbox/production gates (code on `main`) |

Historical RWA/vault/token surfaces remain as **routes**, not as primary nav.

---

# What Is Actually Working

## VERIFIED (code + live Production probes)

- Homepage positioning as private reusable verification: `lib/home/simplifiedHomeCopy.ts`, rendered by `components/home/HomeSharpHero.tsx` via `components/redesign/RedesignHome.tsx`. Live title: `Abraxas | Reusable verification for regulated apps`.
- Primary nav is Home / Passport / For businesses: `lib/design/publicSurface.ts` `PUBLIC_NAV_LINKS`. Footer: Passport, businesses, Partner Flow docs, receipt verify (`lib/design/footerLinks.ts`).
- Partner Flow evaluate requires a **browser session** (Production `POST /api/v1/partner-flow/evaluate` → 401 `Sign in required in this browser`). GET evaluate → 405.
- Protocol compatibility live: `GET /api/protocol/compatibility` HTTP 200, `canonical_origin` `https://abraxasworld.xyz`.
- Receipt verification key published: `GET /api/credentials/public-key` HTTP 200, Ed25519 JWK (public material only).
- Launchpad staging identity **correctly hidden** on Production: `GET /api/launchpad/staging/environment` → 404 `not_found` (`lib/partner/launchpad/stagingEnvironment.ts` blocks `VERCEL_ENV=production`).
- Public receipts CORS `*` and `assertNoPiiInPublicView` (`app/api/receipts/[receiptId]/public/route.ts`, `lib/decisionReceipts/views.ts`).
- Webhook stack exists with signing, leases, retries, dead-letter, IP SSRF guards: `lib/partner/webhooks/*`.
- Metering ledger: `lib/partner/partnerMetering.ts`, `app/api/partner/metering/route.ts`.
- Good Trouble constants and browse vs retail split: `lib/goodTrouble/constants.ts`. Homepage demo section: `lib/home/goodTroubleIntegrationDemo.ts`.
- Browse reuse without repeating DOB: `lib/assurance/selfAttestation/reuseBrowseSelfAttestation.ts`.
- Partner result shape has `over_21` boolean, not DOB: `lib/partner/partnerVerificationResult.ts`.
- Merchant-forbidden credential fields: `lib/assurance/reusableCredential.ts` `assertMerchantSafeCredentialView`.
- Callback wildcards/private IPs rejected in Launchpad readiness (on this `main`): `lib/partner/launchpad/productionCallbackReadiness.ts` (tests pass).
- Focused tests (this audit): 10 files / 67 tests PASS (`decisionReceipts`, partner-flow routes, home clarity, Launchpad callback readiness).

## PARTIAL

- **Good Trouble** is a real partner integration in code and marketing, with an explicit sandbox/pilot disclaimer (`GOOD_TROUBLE_PILOT_DISCLAIMER` in `lib/goodTrouble/constants.ts`). Browse policy is **L0 self-attestation**, not a POS-legal 21+ ID check (`GOOD_TROUBLE_BROWSE_POLICY_ID`).
- **Launchpad** is merged to `main` (PR #296) and the route `/developers/launchpad` returns 200 on Production. README still describes it as unmerged draft — **STALE**. Production must not be used as Launchpad DEMO; DEMO ref is `ocntwbxarpjeixdnzide`.
- **Receipt `anchor_reference`** exists on the record (`lib/decisionReceipts/service.ts`) but is typically unused in the Partner Flow demo (off-chain Ed25519 is the proof).
- **zkLogin prover** defaults to Mysten `prover-dev` (`lib/sui/zklogin/config.ts` `DEFAULT_PROVING_SERVICE_URL`) unless overridden — production UX depends on that env.
- **IAT / beta tag** not signed (`docs/RELEASE_DECISION.md`, `docs/PRODUCTION_WALKTHROUGH_RESULTS.md` — last recorded IAT companion 2026-08-06; human Scenarios A–D not signed).
- **Typecheck** (`npx tsc --noEmit`) reports errors in tests (`NODE_ENV` assign, Launchpad staging test types, Playwright module). CI historically continues on `tsc`. Not a live-page P0.

## SIMULATED / illustrative (must not be sold as live gates)

- Homepage Good Trouble **YouTube** (`GOOD_TROUBLE_INTEGRATION_VIDEO_ID`) is a **video**, not the live protocol. Live path is “Try the live experience” → `/good-trouble`.
- `app/marketplace/page.tsx` vault TVL list from `lib/appData.ts` — **investment-marketplace UI**, not Partner Flow.
- `app/tokenomics/page.tsx` token utility page — **not** required for eligibility demo.
- Partner Flow **test routes** mock evaluate in unit tests; Production evaluate is real but session-gated.
- Creditcoin `creditcoin/` — separate hackathon prototype, **not** the Production Partner Flow.

## STALE

- `README.md` lines claiming Launchpad “not merged” / self-service “not live on main” — contradicted by `origin/main` including Launchpad pages and Production SHA `e550f62d`.
- Passport metadata still RWA (`app/passport/layout.tsx`) while homepage is eligibility infrastructure.
- Site-wide SEO defaults (`lib/seo/keywords.ts`) still “RWA verification app / asset tokenization platform”.
- `docs/hackathon/DORAHACKS_SUBMISSION.md` still frames Abraxas as RWA-first.
- IAT production SHA recorded as `5207736b` (2026-08-03) — **superseded** by current Production `e550f62d`.

## MISSING (for a judge story, not for a rewrite)

- Independent external security review report (`docs/RELEASE_DECISION.md`).
- Second named relying-party pilot in production (`docs/SECOND_PARTNER_PILOT_RUNBOOK.md` still pending).
- Full human IAT sign-off.
- On-chain anchoring of decision receipts as a **required** demo step (optional/unused).

---

# Primary Demo Path

**Recommended live path (Production):**

1. **Enter Abraxas** — `https://abraxasworld.xyz/`  
   **VERIFIED** hero: “Tired of verifying yourself over and over?” / “Verify once… prove only what a service needs” (`simplifiedHomeCopy.ts`).
2. **Establish account / Passport** — Google zkLogin (`lib/sui/zklogin/config.ts`, Passport CTA). Google proves **Google account control**, not age. **VERIFIED** disclaimer in `ASSURANCE_NETWORK_DISCLAIMER` (`lib/home/assuranceNetworkCopy.ts`).
3. **Relying partner request** — Good Trouble live experience `/good-trouble` → Partner Flow `/partner/verify` with `partner_id=good-trouble-cannabis` and browse or retail `policy_id` (`lib/goodTrouble/constants.ts`, `PartnerVerifyClient.tsx`).
4. **Evaluate** — `POST /api/v1/partner-flow/evaluate` → `evaluatePartnerFlow` (`lib/partner/relyingPartyFlow.ts`) → `evaluatePolicyForSubject` (`lib/policy/evaluateSubjectPolicy.ts`).
5. **Browse eligibility** — L0 self-attestation ledger + signed browse receipt (`reuseBrowseSelfAttestation.ts`, `isBrowseAccessPolicy`). Retail policy requires stronger claims; do **not** demo retail as “ID-free legal 21+” .
6. **Partner receives narrow result** — callback query without documents; `PartnerVerificationResult` (`over_21`, `decision`, `receipt_id`, `reason_codes`). Authoritative: `GET /api/receipts/{id}/public`.
7. **Independent verify** — `/verify?mode=receipt` (footer) + public receipt `signature_valid`.
8. **Reuse** — second browse evaluate reuses unexpired attestation (`no_reusable_browse_proof` if none). **VERIFIED** in code; live reuse **PARTIAL** until a human completes two sessions on Production.

Every UI control on Partner Verify maps to real APIs (`evaluate` / `complete` / `refresh`). Preview-only partner-verify controls exist (`lib/partner/partnerVerifyPreview.ts`) and must not be used on Production judge demos.

---

# Product Positioning Conflicts

| Surface | Conflict | Status |
|---------|----------|--------|
| `/` homepage | Aligns with eligibility infrastructure | VERIFIED |
| Primary nav | Aligns | VERIFIED |
| `/passport` `<title>` | “Reusable Verification for Real World Assets” | STALE / P1 |
| Default SEO (`lib/seo/keywords.ts`) | RWA tokenization keywords + default description | STALE / P1 |
| `/marketplace`, `/vault/[id]` | Vault AUM marketplace | Historical; **do not feature** |
| `/tokenomics`, `/token`, `/swap`, `/tokenize` | Token / DeFi surfaces | Historical; **do not feature** |
| `/docs/litepaper`, protocol RWA copy | Older RWA thesis | STALE if linked in a pitch |
| Footer “Not investment advice.” | Implies investment product | P2 copy |
| DoraHacks hackathon doc | Sector “RWA / Verification” | STALE for Colosseum |

**Do not delete** marketplace/token routes before October 12 unless they appear in the submission URL list. Unlink them from any pitch deck. Primary nav already avoids them.

---

# Privacy Claim Verification

| Claim | What the code actually does | Status |
|-------|-----------------------------|--------|
| “Prove what matters, reveal nothing else” | Partner result + public receipt omit DOB, images, email, `sui_address` as JSON keys (`partnerVerificationResult.ts`, `assertNoPiiInPublicView`). Google OAuth scope is `openid email` (`getGoogleOAuthConfig`) — **email is collected for account**, not sent to the relying partner in the public receipt. | PARTIAL (account vs partner boundary) |
| “Proofs, not profiles” | Decision receipts carry policy/decision/pseudonym, not a partner-visible profile document. Passport itself is still an account surface. | PARTIAL |
| “Verify once” | Browse reuse path exists. Retail/high-assurance policies can demand new evidence (`ASSURANCE_NETWORK_TRANSACTION_*`). | PARTIAL (policy-dependent) |
| “Reusable verification” | Claims + self-attestation ledger + Passport subject. Each partner transaction still issues a **new receipt**. | VERIFIED as designed |
| “Partners never receive DOB” | `over_21` derived; `FORBIDDEN_KEYS` strip `date_of_birth`. Browse attestation stores an age **band**, not a partner-facing DOB. Holder **does** enter DOB in the Abraxas UI for browse. | VERIFIED for partner; holder still types DOB on Abraxas |
| “zkLogin verifies age” | Explicitly forbidden in homepage tests/copy (`ASSURANCE_NETWORK_FORBIDDEN_CLAIMS`). | VERIFIED not claimed on home |

Do **not** tell judges Abraxas is zero-knowledge age proof. It is **policy-minimized signed eligibility**, with holder data on Abraxas systems as needed for the assurance level.

---

# Partner Infrastructure Audit

| Capability | Implementation | Status |
|------------|----------------|--------|
| Partner registration / config | Operator portal `/developers/partner`; Launchpad `/developers/launchpad` on `main` | PARTIAL (Launchpad vs MAIN/DEMO split) |
| Policy definition | DB partner policies + Launchpad constrained custom sandbox (`lib/partner/launchpad/customPolicy.ts`) | VERIFIED (sandbox custom is declarative, not code) |
| Narrow eligibility request | `/partner/verify` + evaluate | VERIFIED |
| Signed result / receipt | `issueReceiptForDecision`, Ed25519 | VERIFIED |
| Independent verification | Public receipt + `/verify?mode=receipt` | VERIFIED |
| Expiration | `expires_at`, `resolveReceiptStatus` | VERIFIED |
| Replay / idempotency | `partnerFlowIdempotency.ts`, receipt `idempotency_key` | VERIFIED in code |
| Revocation | `revocationControlPlane`, `checkPartnerFlowRevocationGate` | VERIFIED in tests/code |
| Auditability | Partner flow telemetry + `appendAuditEvent` | VERIFIED |
| Scoped API keys | `generatePartnerKey` `abx_test_` / `abx_live_`, hashed, scopes | VERIFIED |
| Rate limiting | Partner Flow + Launchpad limiters | VERIFIED |
| Metering | `partner_metering_events` | VERIFIED (code) |
| Encrypted webhook secrets | `webhookSecretStorage.ts` | VERIFIED (code) |
| Durable webhooks / retries / DLQ | `webhookOutbox.ts`, `webhookDeadLetter.ts` | VERIFIED (code) |
| Non-PII lifecycle events | webhook payload contract tests | VERIFIED (code) |
| Production vs sandbox receipts | `production_usable`, sandbox policy IDs | VERIFIED |

**Do not claim** Launchpad automatic production activation against **MAIN** as the Colosseum demo. Use the already-provisioned Good Trouble sandbox partner.

---

# Cryptographic / Onchain Architecture

| Component | What | Why Abraxas needs it | Where | User/partner gain | Decorative? |
|-----------|------|----------------------|-------|-------------------|-------------|
| Google OIDC `id_token` | Account authentication | Bind a human-operated account | `lib/sui/zklogin/` | Sign-in without a seed phrase | No |
| Sui zkLogin / address | Stable cryptographic subject | Policy evaluation key; wallet binding | `lib/sui/zklogin/config.ts`, wallet authority | Portable subject ID | No — subject, not a trading wallet pitch |
| Ed25519 receipt signatures | Detached signature over canonical receipt | Partner can verify without trusting callback query | `lib/decisionReceipts/signing.ts` | Independent verify | No |
| Credential JWTs | Holder credentials | Passport claims | `lib/credentials/` | Reuse across policies | No |
| Browse receipt JWT | L0 browse proof | Partner browse gate | `lib/assurance/selfAttestation/browseReceipt.ts` | Reuse browse | No |
| Mysten zkLogin prover | ZK proof for zkLogin | Sui account from OIDC | `DEFAULT_PROVING_SERVICE_URL` | Account creation | Operational dependency |
| Sui Move (`sui/`) | On-chain passport experiments | Optional anchoring / chain story | `sui/` | Not required for Partner Flow demo | **Do not demo unless rehearsed** |
| Creditcoin USC (`creditcoin/`) | Cross-chain eligibility prototype | Other hackathon | `creditcoin/` | Not Production Partner Flow | **Out of Colosseum demo** |
| Solana marketplace links | Vault explorer URLs | Historical RWA | `app/marketplace/page.tsx` | None for eligibility | **Yes for this submission** |

Do **not** add new chains before October 12.

---

# Production Readiness

| Item | Evidence |
|------|----------|
| Repo SHA (`origin/main`) | `e550f62def220889bc903f555553ca5411d529c1` |
| Deployed Production SHA | Same (`GitHub environment=Production`) |
| App origin | `https://abraxasworld.xyz` (compatibility manifest) |
| MAIN Supabase | `bztwutzprwsdrtqdpymf` (documented; values not printed) |
| DEMO Supabase | `ocntwbxarpjeixdnzide` (Launchpad staging / demos) |
| Required env (names only) | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ABRAXAS_SIGNING_KEY`, `ABRAXAS_PUBLIC_KEY`, `NEXT_PUBLIC_APP_URL` / `ABRAXAS_ISSUER_URL`, Google zkLogin client IDs, `ABRAXAS_BROWSER_SESSION_SECRET` |
| Client-side secrets | OAuth **client id** is public by design. Service role and signing **private** JWK must remain server-only. |
| Staging endpoint on Production | 404 — VERIFIED fail-closed |
| Public receipt CORS | `Access-Control-Allow-Origin: *` — intentional for partner fetch; no cookies |
| Broken RPC | Not observed on public probes. zkLogin prover URL must be confirmed in Vercel **without printing it in this doc** |

---

# Demo Failure Risks

| Risk | Why it kills a live judge demo | Severity |
|------|-------------------------------|----------|
| Google OAuth / zkLogin register fails | Flow never leaves “sign in” | P0 |
| Completing OAuth in a **different origin** (preview vs production) | Identity saved on wrong backend | P0 (seen on Preview audits historically) |
| Demo retail policy as legal 21+ | Overclaim; retail may pending_review / deny | P1 |
| Sandbox receipt used as “production_usable” | Partner story collapses under questions | P1 |
| Judge lands on `/marketplace` or `/tokenomics` | Looks like a token farm | P1 |
| Homepage video mistaken for the protocol | “Just a YouTube” | P2 |
| Mysten prover-dev latency/outage | zkLogin wallet creation stalls | P1 |
| Mobile OAuth / popup | Session cookie not on return | P1 |
| 30-minute idle / tab mix-up | Agent/operator watching wrong Chrome | P1 |

---

# P0 Issues

None identified that are **code-absent** on Production SHA `e550f62d` for the **browse** Partner Flow itself.

**Operational P0 (must be rehearsed, not redesigned):**

1. Complete a **Production** Google → Passport → Good Trouble **browse** → callback → `GET /api/receipts/.../public` loop in one browser, once, before recording. If register fails, the submission demo is dead regardless of architecture.

---

# P1 Issues

1. **Passport page title/description still RWA** — `app/passport/layout.tsx` vs homepage eligibility copy.  
2. **SEO default description still “RWA verification app and asset tokenization platform”** — `lib/seo/keywords.ts`. Judges who View Source / share links see the old product.  
3. **README Launchpad status is wrong** — claims unmerged; `main` includes Launchpad.  
4. **Good Trouble page subtitle mixes “retail gate + batch provenance”** (`app/good-trouble/page.tsx`) while the safest live demo is **browse L0**. Over-broad labeling.  
5. **Hackathon DoraHacks copy is RWA-primary** — do not reuse as Colosseum blurb.  
6. **`tsc --noEmit` failures in tests** — credibility if a judge clones and typechecks; not a runtime homepage break.

---

# P2 Improvements

- Footer “Not investment advice” → eligibility-specific disclaimer.  
- Hide or `noindex` `/marketplace`, `/tokenomics`, `/swap` if cheap (robots only — do not delete systems).  
- Home video caption: “Walkthrough video — live protocol is the button below.”  
- Confirm `NEXT_PUBLIC_ZKLOGIN_PROVER_URL` is production-grade.  
- Refresh IAT SHA in `docs/PRODUCTION_WALKTHROUGH_RESULTS.md` or mark archived.

---

# What NOT To Build Before October 12

- New chains, tokens, or USC/Creditcoin as the main story.  
- New KYC vendors or “full identity graph.”  
- Generic Launchpad production activation against MAIN.  
- Marketplace/tokenomics redesign (or deletion marathon).  
- Progressive-proof / extra assurance catalogs as the pitch.  
- Architecture theater (new receipt formats, new VMs).

---

# Recommended Submission Demo

**Script (≈90 seconds):**

1. Home: read the three lines — problem, verify once, partner gets the result not documents.  
2. Click through to Good Trouble **browse** (not retail purchase). State: “This partner asked: is this person in the 21+ browse band? They will not get a birth date.”  
3. Google sign-in on **abraxasworld.xyz only**.  
4. Complete browse attestation if first time; skip if reuse.  
5. Land on partner callback / show public receipt JSON: `decision_result`, `signature_valid`, **no DOB**.  
6. Repeat evaluate: “No second ID upload — reuse.”  
7. One sentence: “Retail purchase can require a stronger policy; we did not skip the law.”

**Do not** open `/marketplace`, `/tokenomics`, or Creditcoin.

---

# Final Pre-Submission Checklist

- [ ] Production SHA still equals the SHA in the GitHub repo you submit.  
- [ ] One recorded Production browse loop with public receipt screenshot (redact tokens).  
- [ ] Passport `<title>` matches eligibility positioning.  
- [ ] Colosseum text does **not** copy DoraHacks RWA-first blurb.  
- [ ] Good Trouble labeled sandbox/pilot + browse vs retail.  
- [ ] Google OAuth on Production rehearsed on phone + desktop.  
- [ ] `/developers/launchpad` not used as the judge path unless DEMO-bound and rehearsed.  
- [ ] No secret values in deck, README, or this audit.  
- [ ] README Launchpad/main status corrected.  
- [ ] Submission URL list: `/`, `/passport`, `/good-trouble`, `/docs/partner-flow`, `/verify?mode=receipt` only.

---

## TOP 5 ACTIONS BEFORE SUBMISSION

1. **Rehearse and record the Production Good Trouble browse loop** (Google → Passport → signed public receipt → reuse). If this fails, nothing else matters. Evidence: Partner Flow is session-gated on live Production (`401` without sign-in); zkLogin register is the historical break point.

2. **Fix judge-facing copy that still says RWA/tokenization** on Passport metadata (`app/passport/layout.tsx`) and stop using `lib/seo/keywords.ts` defaults in the submission blurb. Evidence: live `/passport` title vs live `/` title mismatch (probed 2026-09-18).

3. **Label the demo honestly: L0 browse, sandbox/pilot, Google ≠ age.** Evidence: `GOOD_TROUBLE_BROWSE_POLICY_ID`, `GOOD_TROUBLE_PILOT_DISCLAIMER`, `ASSURANCE_NETWORK_DISCLAIMER`.

4. **Align README with deployed `main` (Launchpad merged; DEMO vs MAIN).** Evidence: Production SHA = `e550f62d` includes Launchpad; README still says not merged; staging identity 404s on Production by design.

5. **Keep the submission surface tiny** — do not pitch marketplace, tokenomics, Creditcoin, or Launchpad production activation. Evidence: those routes still 200 on Production but are off the primary nav; they confuse “proofs not profiles.”
