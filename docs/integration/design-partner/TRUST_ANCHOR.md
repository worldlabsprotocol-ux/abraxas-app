# Trust anchor installation (public procedure)

Integrators **must not** trust `bundled_trust_anchor` from portable export downloads. Install authority out-of-band.

## 1. Receive material

Abraxas provides (secure channel):

- `abraxas_trust_anchor_bundle` JSON for your target environment (`demo` or `production`)
- `public_key_fingerprint` for your change-control ticket
- Optional: registry JSON with `active` + `overlap` during rotation windows

Demo template in-repo ( **not** a secret — public Ed25519 **verify** key only):

`examples/portable-relying-party/trust-config.demo.template.json`

Fingerprint: `de6e0d6c238236e5f095d4e9a426579d5305ffeabdb8d68071acebc4f90ce047`

## 2. Validate before install

```typescript
import { validateTrustAnchorBundle } from "@abraxas/independent-verifier";
const validated = validateTrustAnchorBundle(anchor);
if (!validated.ok) throw new Error(validated.reason);
```

Confirm `environment` matches your deployment (`demo` vs `production`).

## 3. Install

- Store in secret manager or hardened config volume (not client-side).
- Wire via `loadIntegratorTrustAnchorFromEnv()` or `RP_TRUST_ANCHOR_PATH` in standalone examples.

## 4. Rotation (#827)

- **Operator approval:** documented change ticket + `applyAuthorizedAnchorRotation` with `integrator_operator` approval.
- **Cryptographic:** prior anchor signs `abraxas_integrator_anchor_rotation/1.0.0` authorization.
- **Emergency:** `distrustAnchorFingerprint` — fail closed for that fingerprint.
- Never accept a new anchor present only inside a downloaded receipt bundle.

## 5. Verify pin at runtime

Bundled export must match installed pin (or registry active/overlap). Mismatch → indeterminate / deny; see [ERRORS_AND_RECOVERY.md](./ERRORS_AND_RECOVERY.md).
