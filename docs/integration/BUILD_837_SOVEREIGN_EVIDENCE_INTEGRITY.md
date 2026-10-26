# Build #837 — Sovereign evidence integrity

## Defect

Reuse issuance (`reuse_existing_proof`) persisted evidence dependencies in Supabase only. The sovereign PostgreSQL slice had no mirror of source receipts, claim status, or evidence dependencies, so `evaluateClaimEvidenceOnSovereignPg` could not enforce source revocation on portable and sovereign first validity paths.

## Correction

1. **`evidenceIntegrityContract.ts`**: Storage agnostic verdict for source, claims, and subject binding.
2. **`evidenceIntegrityWrite.server.ts`**: Mirror reuse evidence into `sovereign_evidence_sources`, `sovereign_receipt_evidence_dependencies`, and `sovereign_claim_status` when sovereign PG is configured.
3. **`recordReceiptEvidenceDependencies`**: Fail closed on operational write errors.
4. **`requestsService`**: Invoke mirror after approved reuse issuance.

## Independent verification boundary

Receipt verification still does not prove factual truth of every underlying assertion. Underlying private evidence is not exposed in portable bundles.

## Homepage

Protocol positioning section added per founder direction. Hero leads with infrastructure value; privacy principle retained as supporting copy.

## CI

```bash
npm run sovereign:build-837-evidence-integrity
```

## Limitations

- Mirror runs on reuse issuance only when sovereign staging PG is configured.
- Receipt schema unchanged. No cryptographic evidence commitment in canonical payload yet.
- Operational PostgREST remains authoritative where sovereign pool is absent.
