# Holder verification interaction audit

## Standard (from Launchpad #784)

**One workspace. One active step. One clear next action.**

Applies to `/partner/verify`, `/partner/continue`, wallet-control handoff, and partner return — not to static docs.

## Surfaces

| Surface | Entry | Primary orchestration |
|---------|--------|------------------------|
| Partner verify | `/partner/verify` | `PartnerVerifyClient` → `PartnerVerifyShell` |
| Partner continue | `/partner/continue` | `PartnerContinueClient` |
| Wallet control handoff | Continue + `wallet_control` policy | `PartnerWalletControlContinueFlow` |
| Legacy / specialty | Good Trouble browse, purchase, provenance | Separate flows (do not force into one machine) |

## Findings (pre–focused holder nav)

| Issue | Where | Severity |
|-------|--------|----------|
| Second progress rail | `VerificationPath` (REQUEST→CONSENT→VERIFY→READY) stacked above consent/capture on continue | Medium — competes with wallet-control stages |
| Repeated status + intro + brief | `PartnerJourneyLayout` header + `HolderRequestBriefCard` + `statusMessage` in shell | Medium — duplicate request description |
| Wallet + consent + outcome visible together | `PartnerWalletControlContinueFlow` renders wallet panel, qualification copy, consent, and completion in one scroll column | High — violates single active task |
| Google sign-in prominence | `PartnerVerifyShell` legacy Google button when wallet path available | Low — wallet panel is primary when passed; Google is optional/legacy copy |
| Signature vs qualification gap | Qualification polling after wallet success is easy to miss | Medium — addressed by explicit authorization stage |
| Consent below wallet chrome | Consent card follows full wallet panel without stage separation | High |
| Recovery scattered | `VerificationFailure`, `HolderRecoveryCard`, inline errors | Low — keep but stage-scoped |

## Safe boundaries

- Do not merge verify API steps with presentation stages.
- Do not auto-approve on wallet signature or method qualification.
- Preserve `WalletControlPartnerConsent`, handoff POST, and partner return allowlisting.
- Good Trouble and provenance paths keep their specialized `VerificationPath` variants until separately audited.

## Implementation scope (this pass)

1. `HolderVerificationStepNav` + presentation stage resolver for **wallet_control** continue flow.
2. Stage-scoped rendering in `PartnerWalletControlContinueFlow` only.
3. Optional compact nav on `PartnerVerifyShell` when wallet sign-in is primary (phases `sign_in` / `signing_in`).

## Ranked follow-ups

1. Align non–wallet-control continue flows to one nav model (retire duplicate `VerificationPath` where redundant).
2. Developer Workspace consistency.
3. Partner callback / return failure copy unification.
