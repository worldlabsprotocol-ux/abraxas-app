# Build #517 — Screen inventory and clarity pass

## Product story (all surfaces)

Verify once · Keep personal information private · Share only the authorized answer · Reuse qualifying verification when appropriate.

Central copy: `lib/product/productStoryCopy.ts`.

## Screens changed (implementation)

| Area | Route / component | Change |
|------|-------------------|--------|
| Passport | `/passport` · `ProductStoryStrip` | Verify-once story strip on default tab |
| Passport copy | `passportCustomerCopy.ts` | Clearer subhead |
| Partner consent | `HolderRequestHeader`, `PrivacyBoundary`, `HolderVerificationRequest` | Four-question framing + continue explainer |
| Receipts | `DecisionReceiptCard` | Plain-language confirmation block; chain proof only when confirmed |
| Judge tour | `/experience/tour` · `JudgeProductTour` | Shorter narrative, step labels, Cielo/GT limits, consent checklist |
| Cielo | `cieloHolderCopy.ts` | Not-a-booking lead |
| Good Trouble | `goodTroubleHolderBrief.ts` | No self-attest substitute for verified IDV |
| Integration Studio | `/integrations` | Title + subhead for operators |
| Partner onboarding | `partnerOnboardingPositioning.ts` | Operator headline/supporting copy |
| Launchpad | `PartnerLaunchpadClient` | Subtitle clarity |

## Screens reviewed, not structurally changed

- Homepage cinematic hero (protected — no copy changes; see proposals below)
- `/verify` developer hub (already labeled developer-only)
- Admin / operator consoles (out of holder scope)

## Protected homepage proposals (founder approval required)

None submitted in this PR — visual design and **Explore the demo** CTA unchanged per Build #513.

Optional future copy-only tweaks (non-visual): add one line under hero subhead mirroring `PRODUCT_STORY_TAGLINE` — **not implemented**.

## Persona comprehension checks (automated)

| Persona | Test | Status |
|---------|------|--------|
| New holder | `product-clarity.spec.ts` Passport story | Automated |
| Judge | `judge-tour.spec.ts` + tour welcome | Automated |
| Partner operator | `product-clarity.spec.ts` Integration Studio | Automated |
| Investor | Judge tour narrative | Manual via tour |
| Returning holder | `passportHolderJourneyStatus` copy (existing) | Unit tests |

Not claimed: live human usability sessions.

## Remaining confusing areas

- Solana-native wallet path vs legacy Google Passport (Cielo copy still notes dual path)
- Developer `/verify` vs holder Passport verify tab naming
- Launchpad advanced panels still dense for first-time operators (future progressive disclosure)
