# Good Trouble PKCE session continuity (Seeker / mobile)

## Flow trace

1. **Wix ORDER NOW** (`PurchaseVerificationEntry.js`) → `createPurchaseVerificationStart` web method.
2. **`buildVerificationStartPayload`** (`nonceLifecycle.js`) generates `flowId` (`gtf_*`), PKCE **verifier**, stores **verifierChallenge** in `AbraxasVerificationNonces`, seals verifier server-side (`verifierSealed` + `ownershipProofHash`).
3. **Client (TLS response only)** receives `verifier` + `flowOwnershipSecret`; stores verifier in **sessionStorage** (`abraxas_gt_purchase_verifier_${flowId}`) and ownership secret in a **short-lived first-party cookie** (`gt_pkce_flow_own`, SameSite=Lax, 10m).
4. **Abraxas** hosted handoff / Passport / Share / Return — same-window navigation (`wixLocation.to`, Abraxas `window.location.href`).
5. **Wix callback** `/age-verification-result?gtv=…&receipt_id=…` — `AgeVerificationResult.js` loads PKCE material from sessionStorage **or** cookie-bound ownership secret; calls `completePurchaseVerification(receiptId, flowId, verifier, flowOwnershipSecret)`.
6. **Backend** unseals verifier only after ownership proof + PKCE claim + **independent receipt validation** → redirect `/goods` (or captured return destination).

## Root risk (pre-hardening)

`gtv` could be restored (PR #604) while **sessionStorage verifier** was lost on a **different tab or WebView context**. Wix would hang or show generic failure — PKCE proof unavailable. **status=approved alone never authorizes.**

## Secure design (chosen)

- **PKCE verifier** remains proof-of-possession; not placed in URLs, logs, or receipts.
- **Server-side escrow** (encrypted `verifierSealed`) + **ownership secret** (high-entropy, returned once at start).
- **Cookie carries ownership secret only** (not verifier) so **same browser, cross-tab** callbacks can complete.
- **Fail closed** without ownership proof: no escrow release, no receipt shortcut.
- **No cross-device / cross-browser continuity** (no proof of flow ownership without start-time binding).

**Required:** create Wix Secrets Manager secret `GOOD_TROUBLE_PKCE_ESCROW_PEPPER` (≥32 random bytes). Backend loads it via `wix-secrets-backend` (`pkceEscrowPepperWix.js`) — not `process.env`. Purchase start and escrow recovery **fail closed** if the secret is missing, invalid, or unavailable.

## CMS migration

Add optional fields to **AbraxasVerificationNonces** (Admin-only):

- `ownershipProofHash` (string)
- `verifierSealed` (string)

Existing rows without escrow continue to require sessionStorage verifier until flows expire.
