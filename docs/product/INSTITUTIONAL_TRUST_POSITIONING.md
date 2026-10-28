# Institutional trust positioning (Build 881)

This document records the public positioning hierarchy for Abraxas as **continuous, independently verifiable institutional trust**—not wallet verification alone.

## Primary thesis

**Trust is continuous.**

Institutional lead:

> Abraxas enables applications to make policy-bound trust decisions backed by authoritative evidence, independently verifiable proof, and current authorization.

Supporting distinction:

> A valid signature proves authenticity. It does not, by itself, establish that an actor remains authorized to perform an action.

## Positioning hierarchy

1. **Thesis** — Trust is continuous (authorization remains checkable over time).
2. **Role** — External trust layer; does not replace custody, vault RBAC, or signing engines.
3. **Engines** — Evidence, Proof, Authority, Continuity (see `lib/home/institutionalTrustPositioning.ts`).
4. **Outcomes** — Permit, deny, indeterminate (indeterminate never silently authorizes).
5. **Enforcement** — Integrator application after independent verification.

## What we do not claim

- No custody-vendor partnerships or certified co-signer connectors unless explicitly shipped and documented.
- No inference of institutional mandate from wallet possession alone.
- No replacement of vault Admin / Signer / Viewer role systems.

## Implementation map

| Surface | Module |
| --- | --- |
| Homepage hero | `lib/home/protocolPositioningCopy.ts`, `lib/home/cinematicHomeCopy.ts` |
| Architecture caption | `components/home/HomeTrustContinuousArchitectureImage.tsx` |
| Protocol page | `app/protocol/page.tsx` |
| For businesses | `lib/integrate/businessPageCopy.ts` |
| Invariants | `lib/home/institutionalTrustPositioning.test.ts`, `npm run check:homepage` |

Architecture **PNG** updates (Authority / Continuity emphasis, mobile stage cues) are a separate follow-up from this copy pass.
