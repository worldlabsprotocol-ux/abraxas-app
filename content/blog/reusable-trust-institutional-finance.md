---
title: How Reusable Trust Changes Institutional Finance
description: One verification traveling across lenders, marketplaces, and protocols — W3C credentials, zkLogin, policy engine, and selective disclosure explained for operators.
category: product
date: 2026-07-12
slug: reusable-trust-institutional-finance
author: World Labs Protocol
readingTime: 8 min
republishNote: Originally published on abraxas-app.vercel.app — republish on Medium with canonical link.
---

## The primitive is not the token

Institutional finance runs on **attestations** — credit decisions, accreditation, title clearance, insurance binders. Today those attestations live in silos: email PDFs, vendor dashboards, and platform-specific "verified" badges that do not export.

Reusable trust means: **issue once, rely everywhere** — with consent, audit trails, and minimum disclosure.

## Architecture in plain language

### Passport (UX)

Users sign in with Google. zkLogin creates a Sui wallet — no seed phrase. Passport holds profile, wallet bindings, verification status, and **Access** (consent receipts).

Partners never see a document folder by default. They see an **outcome**.

### W3C Verifiable Credentials

After identity verification (Veriff or manual review), Abraxas issues Ed25519-signed credentials — outcome only, never raw documents in partner responses.

Credentials can be presented to any relying party that trusts the issuer registry.

### Policy engine

Partners configure policies: required claims, assurance levels, max age. The engine evaluates live credential status and returns:

- **Approved**
- **Denied**
- **Manual review**

Every decision is logged with a reference ID.

### Selective disclosure

Users approve what gets shared per request. Consent ceremonies capture purpose, claims authorized, and expiry — stored in Access for audit.

### Trust registry (assets)

Real assets publish assurance levels L1–L4 with dated sources. [Browse the public registry](/#registry) without login — Cielo Sunrise, Smyrna Townhome, Naj Tulum.

## What changes for each participant

| Participant | Before | With reusable trust |
|-------------|--------|---------------------|
| Guest / investor | Upload ID per platform | Verify once, reuse permissioned proof |
| Operator | Store sensitive docs | Receive eligibility outcome only |
| Lender | Re-run full KYC | Evaluate policy against live credentials |
| Marketplace | Custom onboarding stack | Integrate policy API (~4 lines) |
| Asset owner | Re-prove title per deal | Registry record with assurance timeline |

## Live today (honest scope)

- Passport, AIL public API, Cielo stablecoin checkout — **pilot / live first-party surfaces**
- Design partners in **final onboarding** — external relying parties publishing when approved
- Genesis proof: [Cielo Sunrise](/case-studies/cielo) — $1.1M appraisal, Superhost, USDC on Sui

We do not claim every integration is production-scale. We claim the **architecture works** on our own asset and partners are onboarding now.

## Integrate

- [Integrations hub](/integrations) — SDK snippet, policy engine, relying party program
- [Credential portability spec](/docs/credential-portability)
- [Partner verification requests](/docs/partner-verification-requests)
