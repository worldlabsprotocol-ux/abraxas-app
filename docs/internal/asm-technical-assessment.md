# ASM technical assessment (internal — not product copy)

Date: 2026-10-22. Sources: ASM whitepaper (Brain / Memory / Form), public AMAs. Patents: treat as restricted — conceptual study only.

## What ASM actually built (documented)

| Layer | Role |
|-------|------|
| **Brain NFT** | Core agent; randomized Genome Matrix (trait heat map); immutable Memory Tree |
| **Memories** | Trained ML outputs (e.g. ONNX-like) from “Gyms”; world-specific behavior |
| **Form NFT** | Visual shell + world-specific modifiers; interchangeable “sleeve” |
| **ASTO** | Paid training / protocol economics |
| **Worlds** | Third-party apps map genome regions to local stats via Expression tables |

**Documented insight worth keeping:** intelligence (model + memory) separated from presentation (Form) and from authorization context (World expressions).

## What likely limited adoption (mix of fact and hypothesis)

- **Fact:** GTM centered NFT ownership and collectible Forms, not institutional verification.
- **Fact:** Training + portability tied to proprietary Gyms and NFT composability.
- **Hypothesis:** Relying parties needed **scoped, revocable delegation and audit**, not tradable brains.
- **Hypothesis:** Blockchain added ownership/trading, not fail-closed authorization for actions.

## 2026 landscape (use established patterns)

- **OAuth 2.0 / OIDC** — delegated access, expiry, revocation.
- **Workload identity (SPIFFE/SPIRE)** — software agent identity.
- **Verifiable credentials / selective disclosure** — evidence without over-sharing.
- **MCP / A2A** — tool interoperability; still needs trust boundary (who may invoke what).
- **NIST AI agent identity initiative (2026)** — emerging; not a finished standard.

## What Abraxas already does better/differently

- Wallet-native **qualification** and **explicit sharing consent** (server gate #788).
- **Policy-bound** partner flows and **signed decision receipts** with independent verification.
- **Separation of proof from presentation** in product copy — UI is not authority.

## Genuine gaps (only if pursuing “software agent” institutional flows)

1. **Artifact for delegated software identity** distinct from human holder.
2. **Verifier UX** for “agent acted under delegation D at time T” without model context leakage.
3. **Durable consent record** for wallet-control sharing (cookie gate ≠ long-lived evidence).

## Recommendation

**Research further; do not build** NFT agents, Gyms, or tokenized brains. **Integrate** OAuth/VC/workload identity if a design partner contracts a concrete agent-delegation workflow. **Reject** collectible assistant / marketplace direction for Abraxas.

**Valid outcome:** “Do not adopt ASM architecture” — Abraxas already aligns better with 2026 authorization primitives.
