# Build 884 — Homepage architecture final

## Scope

Interactive four-stage architecture on the homepage carousel (slide 2): one selected visual per stage, HTML panel copy aligned to institutional trust semantics, full overview on demand.

## Assets

- `public/home/abraxas-architecture-stage-01-request.png`
- `public/home/abraxas-architecture-stage-02-decision.png`
- `public/home/abraxas-architecture-stage-03-verification.png`
- `public/home/abraxas-architecture-stage-04-action.png`
- `public/home/abraxas-architecture-overview-complete.png`

## Verification

- `npm run check:homepage`
- `npm run validate:typescript`
- `npm run check:homepage-guard` (refresh baseline with `[ui-change]` when CSS changes)
- Playwright: `tests/staging/build-884-architecture-visuals.spec.ts`

## Out of scope

Wallet authorization, proof verification, Integration Studio, partner flows, receipt contracts, mandate enforcement, and security operations.
