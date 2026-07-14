# Abraxas Messaging Bible

Approved core lines, proof points, and do-not-use language. Import programmatically from `lib/messaging/bible.ts` for pages.

## Category

**Trust Infrastructure Layer** — not identity protocol, not tokenization headline.

## Primary positioning

> Abraxas is the reusable verification infrastructure for real-world assets.

## Tagline (secondary to headline)

> Verify once. Transact everywhere.

## Headline (consumer / homepage)

> Stop proving the same thing over and over.

## Problem thesis

> Tokenization alone is not enough. Repeated verification is the hidden tax killing institutional adoption of RWAs.

## One-liner

> We eliminate repeated verification so assets, people, and businesses can move faster.

## Approved proof points (real today)

- Public registry browsable without login — Cielo Sunrise, Smyrna Townhome, Naj Tulum
- Cielo Sunrise: $1.1M independent appraisal (May 2025), live STR, 5.0 ★ Superhost (Airbnb cross-check), USDC-on-Sui settlement (pilot)
- Passport: Google zkLogin, W3C credentials, consent receipts, Access tab
- Live first-party surfaces: AIL API, Cielo checkout rail, public /verify
- Design partners in final onboarding — count via `lib/partnerStatus.ts`; names when approved

## Do not use

- "Live" for partner integrations not in production
- Placeholder partner names in public copy (`[REAL PARTNER NAME]`)
- Invented TVL, user counts, transaction volume
- Leading with tokenization or "decentralized identity"
- Guaranteed yield or investment returns
- Superhost / rating claims without confirming current Airbnb status

## CTAs (priority order)

1. Browse registry → `/#registry`
2. Cielo case study → `/case-studies/cielo`
3. Get verified once → `/passport`
4. Integrations → `/integrations`
5. Talk to the team → `/design-partner`
6. Developer docs → `/docs`

## Partner status language

| Bucket | Approved phrasing |
|--------|-------------------|
| `closed` | In production · live on Abraxas |
| `final_execution` | Final onboarding · onboarding in final stages |
| `pipeline` | In discussion · not named publicly |

## Page alignment checklist

- [ ] Homepage hero matches headline + subhead
- [ ] /about lists only verifiable live facts
- [ ] /design-partner uses partner status buckets
- [ ] /integrations distinguishes live first-party vs partner onboarding
- [ ] /docs overview mentions reusable verification, not KYC theater
- [ ] /case-studies/cielo includes "What this proves" + conflicts
- [ ] Blog articles drive to registry, Cielo, docs, or design-partner
