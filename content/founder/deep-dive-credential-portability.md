---
title: "Deep Dive: Credential Portability on Sui + W3C VCs"
description: Technical operator post — how Abraxas issues, stores, and presents credentials partners can verify without re-KYC.
category: founder
date: 2026-07-11
slug: deep-dive-credential-portability
author: World Labs Protocol
readingTime: 6 min
republishNote: Copy to LinkedIn/X — technical audience — link to /docs/credential-portability
---

## One sentence

We issue W3C Verifiable Credentials v2.0 (Ed25519, Abraxas issuer) after IDV; partners verify via API or present credentials against the trust registry — **outcome only, never raw documents**.

## Stack

| Layer | Implementation |
|-------|----------------|
| Account | Google OAuth → zkLogin → deterministic Sui address |
| IDV | Veriff (when configured) or manual review |
| Credential | W3C VC, stored client-side + server reference |
| On-chain | Sui Move Passport stamp bitmask after approval |
| Partner check | POST policy evaluate · GET decision status |
| Asset proof | Public registry + GET /verify/{abxId} |

## Why Sui + W3C (not either/or)

- **zkLogin** removes seed-phrase friction for mainstream users
- **W3C VCs** give portability outside our app — partners verify cryptographically
- **Policy engine** lets each relying party ask different questions without bespoke integrations

## What partners integrate

```text
1. Create verification request (policy_id, action)
2. User consents via Passport
3. Poll decision status before settlement
```

Full spec: [/docs/partner-verification-requests](/docs/partner-verification-requests)

## Honest limits

- MetaMask EVM binding optional — Sui/zkLogin first
- Not every partner policy is seeded for production yet
- Genesis asset is first-party dogfood — external relying parties onboarding

## Read more

[/docs/credential-portability](/docs/credential-portability) · [/docs/ail](/docs/ail) · [GitHub](https://github.com/worldlabsprotocol-ux/abraxas-app)
