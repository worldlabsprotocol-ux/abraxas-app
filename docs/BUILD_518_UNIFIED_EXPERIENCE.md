# Build #518 — Unified product experience

Stacked on #630 (`cursor/product-clarity-overhaul-517-5ffe`).

## Routes and surfaces touched

| Area | Change |
|------|--------|
| `/passport` | Tab labels and view headings distinguish identity home, partner requests, confirmations, and proofs/registry. |
| `/cielo/verified-rate` | Solana-native copy avoids Sui/Google detours; no Google session refresh when Solana-native flag is on. |
| `/partner/launchpad` | Five-step guided labels + shared operator subtitle; advanced panels behind explicit disclosure label. |
| `/developers/integration-studio` | Visible guided path strip (what / why / now / next). |
| Partner verify shell | Holder success uses shared receipt confirmation language (#517 labels). |
| Good Trouble purchase continue | Shared privacy boundary banner aligned with Cielo-style plain language. |

## Legacy compatibility

- Google / Sui paths remain for non–Solana-native sessions.
- No schema or production changes.

## Tests

- `tests/ux/unified-experience.spec.ts`
- `lib/cielo/cieloHolderCopy.test.ts`
