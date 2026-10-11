# Build #519 — Partner-ready experience + continuous trust foundation

Stacked on #631 (`cursor/unified-product-experience-518-5ffe` @ `5c874551`).

## Stop-ship repairs

- `decisionReceiptDisplay.test.ts`: fixture `expires_at` moved to 2099 so “valid production receipt” reflects real time-based expiry logic.
- Playwright UX harness: isolated port **3100** (`PLAYWRIGHT_PORT`), `reuseExistingServer: false` to avoid `:3000` EADDRINUSE.

## Product

- Continuous trust plain language on `DecisionReceiptCard` (signature ≠ sole validity).
- Solana-native holder sign-in copy in partner verify orchestration.
- Wallet-aware session recovery copy.
- Holder journey state catalog (`holderJourneyStates.ts`) for consistent messaging.
- Judge tour: continuous trust callout on simulated receipt step.

## Tests

- `lib/product/continuousTrustPlainLanguage.test.ts`
- `tests/ux/acceptance-matrix.spec.ts` (+ existing UX specs via playwright.ux.config)
