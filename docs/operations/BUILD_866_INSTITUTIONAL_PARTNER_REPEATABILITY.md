# Build #866 — Institutional partner repeatability (Demo)

## Phase 1 — PR reconciliation (#861–#865)

| PR | Title | Status (2026-10-27) |
| --- | --- | --- |
| #861 | Integration Studio sandbox create | **Merged** to `main` |
| #862 | Authoritative sandbox execution | **Merged** |
| #863 | Launchpad session continuity | **Merged** |
| #864 | Institutional receipt acceptance runner | **Merged** |
| #865 | Evidence continuity + migration 154 | **Merged** |

Production configuration was not changed. Demo host: `https://demo.abraxasworld.xyz` (Supabase `ocntwbxarpjeixdnzide`).

## Phase 2 — Evidence continuity (post-promotion)

Re-run after #864/#865 land on the deployed Demo commit:

```bash
export LAUNCHPAD_STAGING_URL=https://demo.abraxasworld.xyz
export LAUNCHPAD_EXPECTED_SUPABASE_REF=ocntwbxarpjeixdnzide
npm run build864:demo-institutional-receipt-acceptance
```

Regression (primary vs reuse-derived, fail-closed store errors):

```bash
npm run test:build-865-evidence-continuity
```

## Phase 3–5 — Two-partner repeatability

```bash
export LAUNCHPAD_STAGING_URL=https://demo.abraxasworld.xyz
export LAUNCHPAD_EXPECTED_SUPABASE_REF=ocntwbxarpjeixdnzide
npm run build866:demo-institutional-partner-repeatability
```

Artifact: `/opt/cursor/artifacts/build-866-demo-partner-repeatability.json`

### Policy template note

Automated wallet-control holder authorization on Demo is validated against catalog pack **`wallet_control`**. A second partner uses a **separate provisioned** `partner_id`, `application_id`, and `policy_id` (distinct authorization scope). Override templates with `BUILD866_PARTNER_A_POLICY` / `BUILD866_PARTNER_B_POLICY` only when the catalog pack supports the same qualification path.

### Manual intervention

- Demo env vars above (and optional `VERCEL_PROTECTION_BYPASS`)
- No operator UI steps inside the runner
- No custom verifier or adapter code per partner

## Completion criterion

Both partners: signed receipt, independent verification **currently acceptable: yes**, `evidence_current: true` for primary wallet-control issuance; cross-partner audience and cross-application handoff rejected.
