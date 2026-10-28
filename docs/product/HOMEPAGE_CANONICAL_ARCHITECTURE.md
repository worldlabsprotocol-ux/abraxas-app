# Homepage canonical architecture visuals

This document is the single source of truth for public Abraxas architecture storytelling on the homepage and aligned surfaces.

## Three explanation levels

| Level | Audience | Surface | Model |
| --- | --- | --- | --- |
| Public | First time visitor | Homepage hero + architecture slide | Trust is continuous — request → signed decision → verify → enforce |
| Technical | Institutional engineer | Homepage architecture visual | Four engines: Evidence, Proof, Authority, Continuity |
| Developer | Integrating team | Protocol page + Integration Studio | Policy → signed decision → independent verify → permit / deny / indeterminate |

Institutional copy source: `lib/home/institutionalTrustPositioning.ts` and `docs/product/INSTITUTIONAL_TRUST_POSITIONING.md`.

## Canonical system diagram

The four stage trust architecture diagram (Inputs → Abraxas decision layer → Portable verification → Partner enforcement) is the authoritative system visual. Older Passport first or asset only pipeline illustrations must not contradict this model on the public homepage.

## Accuracy limits

Diagrams illustrate protocol behavior. They are not live network status or production certification.

- Cryptographic authenticity is not the same as current acceptability. Signed status evidence is required for freshness and revocation.
- Signed receipt schema 1.0.0 limits are unchanged by homepage copy.
- Isolated sovereign PostgreSQL acceptance is not depicted as completed Production cutover.

## Implementation map

- Marquee: `components/home/HomeProtocolSignalMarquee.tsx`
- Protocol diagram (marquee → diagram → sandbox): `components/home/HomeAbraxasProtocolDiagram.tsx`
- Mobile stack diagram: `components/home/HomeAbraxasSystemArchitectureDiagram.tsx`
- Desktop artwork: `public/home/abraxas-protocol-architecture.png`
- Copy: `lib/home/protocolPositioningCopy.ts`
