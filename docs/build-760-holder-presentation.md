# Build #760 — Holder controlled credential presentation

## Implemented

Developer Workspace age demonstration flow now runs the Passport presentation protocol end to end:

1. Choose policy
2. Prepare presentation (credential selection + disclosure + possession challenge)
3. Authorize presentation (holder possession proof, wallet bound key, no Phantom)
4. Review and sign test verification request (wallet action)
5. Protocol verification, policy execution, signed receipt
6. Independent receipt validation (no wallet)

## Holder binding

- Credential `holder_subject_id` remains the wallet pseudonym (`subjectPseudonymId(wallet)`).
- Possession uses a wallet derived ephemeral Ed25519 key (`sandboxHolderPossessionKey.shared.ts`), embedded in the sandbox test credential at prepare time.
- Presentations without a valid possession proof on the prepared commit are rejected (`presentation_possession_not_authorized`).

This possession model applies to **sandbox test issuer credentials minted during prepare**. It demonstrates the presentation protocol; it does not prove possession of an independent third party issuer credential.

Private possession material is derived in the browser (or test client) from the connected wallet address and is never sent to the server except as a signature over the server issued challenge.

## Server boundary preserved

- `POST /api/auth/wallet/sandbox/recognized-issuer/evaluate` remains evaluate only (no possession, no policy receipt). Do not treat its response as authorization.

## Status labels

| Status | Build #760 |
| --- | --- |
| Implemented | Yes (workspace journey + APIs) |
| Cryptographically tested | Yes (Vitest possession + existing sandbox security suite) |
| Issuer operational | No (sandbox test issuer only) |
| Production authorized | No |
