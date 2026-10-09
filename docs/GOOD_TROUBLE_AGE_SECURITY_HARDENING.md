# Good Trouble — age gate, assurance, and adversarial hardening (2026-10)

**Status:** Repository changes ready for Wix publish + physical Solana Seeker retest.  
**Do not claim live Wix is fixed until the founder publishes Velo + Master Page and completes on-device verification.**

## Part A — Popup root cause

| Finding | Detail |
|---------|--------|
| **Root cause** | Wix Studio **automatic age lightbox** opens on site load **before** Velo `AgeVerificationPopup.js` runs async `popupController.onReady()` skip logic → yes/no flash after Abraxas return. |
| **Secondary** | Skip logic previously ignored purchase verified state; fixed in `ageGateAccessState.js` (local + session mirror). |
| **Fix (repo)** | 1) **Synchronous** `shouldSkipAgeGate` + `lightbox.close()` at top of `AgeVerificationPopup.js`. 2) **`GoodTroubleMasterPage.js`** + **`siteAgeGatePolicy.js`** close automatic lightbox when verified or on callback/entry paths. |
| **Not fixable in repo** | Disabling Wix Editor “show popup on load” triggers — **manual Studio steps below**. |

### Wix Studio manual configuration (required)

1. Open the Good Trouble site in **Wix Studio** → **Pages & Menu**.
2. Select the **Age Verification** lightbox / popup.
3. Open **Settings** / **Triggers** (wording varies by Studio version):
   - **Turn off** “Open automatically on site load” / “Show on every visit” if Abraxas purchase path is primary for the demo.
   - Prefer **Velo-only** open for unverified visitors (e.g. homepage button) OR rely on Master Page close when `shouldSuppressAutomaticAgeLightbox` is true.
4. Ensure **Purchase Verification Entry** slug matches production (`/purchase-verification` recommended).
5. Paste **`GoodTroubleMasterPage.js`** into **Site → Custom Code → Master Page** (or site-wide Velo master).
6. Publish site; retest Seeker: Return → `/goods` → **no** redundant yes/no popup while purchase UI state is valid.

## Part B — DOB decision (server-authoritative)

Implementation: `lib/assurance/selfAttestation/calculateAgeBand.ts` + `submitSelfAttestation.ts`.  
Regression: `lib/assurance/selfAttestation/calculateAgeBand.test.ts`.

- Ages 17 / 18 / 20 → **Deny** (`under_21`).
- Exactly 21 whole UTC years on as-of day → **eligible** (`over_21`) at L0 minimum 21.
- Day before 21st birthday → **Deny**.
- Leap-day DOB uses UTC calendar rules (see tests).
- Malformed / missing / future / implausible DOB → validation failure (no permit).
- **No client `eligible` boolean** in server API; browser flags cannot override age band.

## Part C — Assurance integrity

- L0 purchase/browse paths remain **self-attested** (`assurance_level: "L0"`, `self_attested_age_band`).
- Self-attested DOB is **not** independently verified identity; lying cannot be detected from self-attestation alone.
- Policies requiring verified real-world age must require **higher-assurance evidence** or **fail closed** (`policy_not_self_attest_eligible` / checkout authorization rejects L0).

## Part D — Security (summary)

Existing Wix backend coverage: `tieredLifecycleSecurity.test.js`, `checkoutAuthorization.test.js`, `abraxasVerification.test.js`, PKCE + nonce lifecycle, sandbox vs production receipt validators.

| Area | Severity if broken | Mitigation (verified in repo tests) |
|------|-------------------|-------------------------------------|
| Forged / tampered receipt | Critical | Server receipt fetch + strict validator |
| Replay / double callback | High | Nonce consumption, single-use flows |
| Missing PKCE verifier | High | Fail closed; no `verified: true` |
| Browse receipt at checkout | Critical | `rejectBrowseReceiptForCheckout`, L0 not checkout authority |
| localStorage/sessionStorage UI flags | Medium (UI only) | Never read by checkout web methods |
| Direct `/goods` navigation | Medium | UI may render; **regulated checkout** still requires server authorization |
| Open redirect on return URL | High | `purchaseReturnDestination.js` allowlist |

**Remaining risks:** Traditional yes/no self-attestation on Wix (no Abraxas) is still operator-controlled UX; L0 dishonesty; rate limiting limited to flow capacity (documented in sandbox doc).

## Part G — Validation commands

```bash
npx vitest run examples/good-trouble-wix lib/goodTrouble lib/assurance/selfAttestation
npm run build
```

Install links: `docs/GOOD_TROUBLE_WIX_INSTALL_LINKS.md` (branch `cursor/good-trouble-age-security-hardening-5ffe` after push).
