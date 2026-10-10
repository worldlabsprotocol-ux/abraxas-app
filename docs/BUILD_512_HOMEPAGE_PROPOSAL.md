# Build #512 — Homepage proposal (protected; not implemented)

**Requires:** founder `[ui-change]` approval + `homepage:baseline:refresh` — do not merge without guard workflow.

## Goal

Make the judge tour discoverable in under 5 seconds without changing protected hero layout tokens.

## Minimal diff (proposed)

1. **Secondary CTA row** (below existing primary CTA, non-protected slot if available):
   - Label: **Take the 60-second product tour**
   - Href: `/experience/tour`
   - Subcopy: *Simulated walkthrough — no wallet or documents*

2. **Hero subhead alignment** (copy-only if slot is not protected):
   - Headline: *Verify once. Prove only what's needed.*
   - Sub: *Private eligibility verification — partners receive narrow signed decisions, not your documents.*

3. **Do not** change capability map, proof logos, or institutional motion blocks marked protected in homepage guard.

## Alternative (zero homepage touch)

Keep tour entry only on `/integrations` (already shipped in #511) and Demo operator link in release notes.
