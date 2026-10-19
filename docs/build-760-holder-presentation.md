# Build #760 — Holder controlled credential presentation

## Implemented

Developer Workspace age demonstration flow runs the Passport presentation protocol end to end:

1. Choose policy
2. Prepare presentation (client-generated session possession public key + credential + disclosure + challenge)
3. Authorize presentation (sign challenge with session secret key held only on device; no Phantom)
4. Review and sign test verification request (**Phantom wallet signature = authoritative wallet control**)
5. Protocol verification, policy execution, signed receipt
6. Independent receipt validation (no wallet)

## Holder binding (sandbox demonstration)

- Credential `holder_subject_id` = wallet pseudonym (`subjectPseudonymId(wallet)`), matched at evidence evaluation.
- **Session possession key:** random Ed25519 keypair generated in the browser at prepare; public key embedded in the sandbox test credential; private key never sent to the server.
- **Not wallet ownership proof:** possession signatures simulate the Passport presentation step for this test credential only. They do not prove control of an independent issuer credential.
- **Wallet control proof:** scoped Phantom signature on the test verification request (unchanged).

Presentations without valid possession authorization on the prepared commit are rejected (`presentation_possession_not_authorized`).

## Explicit non-goals

- Do not use public-wallet-derived private keys in production or genuine issuer presentation paths.
- Do not treat sandbox test issuer credentials as Production age eligibility.

## Server boundary preserved

- `POST /api/auth/wallet/sandbox/recognized-issuer/evaluate` remains evaluate only (no possession, no policy receipt).

## Status labels

| Status | Build #760 |
| --- | --- |
| Implemented | Yes |
| Cryptographically tested | Yes |
| Issuer operational | No (sandbox test issuer only) |
| Production authorized | No |
