# Sandbox and verification lifetime controls

Abraxas uses **separate TTL and validity mechanisms**. The Developer Workspace UI must not imply that a sandbox retention window defines real-world credential validity.

## Controls (code)

| Item | Purpose | Where defined | Typical expiration |
| --- | --- | --- | --- |
| Wallet signing challenge | Authorize a specific request (single-use) | `lib/auth/ephemeralWallet/retention.ts` → `authChallengeSec` | 5 minutes |
| Wallet session capability | Short-lived session JWT / active session marker | `walletSessionSec` | 30 minutes |
| Sandbox workspace metadata | Ephemeral developer workspace (not a personal account) | `sandboxWorkspaceSec` | 24 hours |
| Sandbox test credential / presentation commit | Sandbox-only API credential metadata | `sandboxTestCredentialSec` | 24 hours |
| Sandbox test result record | Signed test verification result reference in ephemeral storage | `sandboxTestReceiptSec` | 24 hours |
| Verification decision receipt | Whether an action was allowed at evaluation time | Receipt payload + policy | Policy- and receipt-dependent |
| Underlying credential | Issuer-backed evidence | Issuer validity, revocation, policy | Issuer-defined |

Implementation references:

- TTL constants: `lib/auth/ephemeralWallet/retention.ts`
- Workspace persistence: `lib/auth/ephemeralWallet/sandboxWorkspace.ts`
- Test result persistence: `lib/auth/ephemeralWallet/sandboxTestVerification.ts`
- Challenge persistence: `lib/auth/ephemeralWallet/challengeStore.ts`, `actionAuth.ts`

## User-facing copy

Developer Workspace uses `EPHEMERAL_WORKSPACE_SANDBOX_EXPIRY_NOTE` in `lib/developers/ephemeralWorkspaceCopy.ts` to describe **sandbox record retention only**, not credential validity.

## Production relying parties

- Treat receipt **cryptographic verification** and **current acceptability** (`currently_valid` / policy gates) as distinct checks.
- Honor revocation and policy version changes; do not assume sandbox TTL applies to production receipts.
- Do not extend signing challenge TTL or weaken replay protection to avoid expiration messaging.

See also: `docs/connect/EPHEMERAL_WALLET_AUTH.md`.
