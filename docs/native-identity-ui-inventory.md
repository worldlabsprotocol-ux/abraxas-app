# Native identity UI inventory (2026-10-17)

Classification: **A** required auth/consent disclosure · **B** technical documentation · **C** internal identifier · **D** unnecessary primary messaging (rewrite/remove).

## Summary

| Class | Approx. TS/TSX hits (`Google` in app/components/lib) | Action this PR |
|-------|------------------------------------------------------|----------------|
| A | OAuth footnotes, legacy recovery errors, admin operator Google allowlist | Kept accurate; moved to secondary text |
| B | `app/docs/zklogin-setup`, passport-spec, progressive-proof | Unchanged |
| C | `useGoogleSignIn`, `verifyGoogleZkLoginIdToken`, env client IDs | Unchanged |
| D | Passport reauth headline/button, primary sign-in buttons, holder IDV errors | **Rewritten** |

## Authentication dependency map

```
User → Abraxas UI (Passport / Account / Nav)
  → zkLogin startLogin → Google OAuth hosted account picker (A)
  → id_token → POST /api/auth/browser-session → abraxas_browser_session (HttpOnly)
  → Sui wallet derivation (unchanged)

Partner Launchpad (separate, PR #727)
  → API key → abraxas_partner_console_session (HttpOnly)
  → No holder session merge
```

## Root cause: conflicting Passport states

`resolvePassportCustomerStatus` treated unsigned wallet and expired HttpOnly session both as **Needs attention**, while `buildPassportProofSummary` could still show **Secure account connection needed** alongside **Sign in again with Google**. Session expiry is now **`Sign in to continue`** with proof line **`Secure session renewal required`**, and verification trust chips hide until the session is valid.

## Category D rewrites (this PR)

- `lib/passport/passportCustomerCopy.ts` — session recovery via `abraxasIdentityExperienceCopy`
- `components/passport/PassportReauthenticationPanel.tsx` — Continue securely + OAuth footnote
- `components/passport/PassportHolderWorkspace.tsx` — 4 primary sections + collapsible advanced
- `components/passport/PassportCustomerView.tsx` — session-aware layout and gating
- `lib/passport/passportCustomerStatus.ts` — separate session vs wallet vs verification
- `lib/sui/zklogin/signInCopy.ts` — primary button **Continue securely**
- `lib/sui/holderAccessCopy.ts`, `lib/nav/navSignInButtonState.ts`
- `components/passport/AbraxasIdentityCapture.tsx` — holder-facing errors

## Retained Google references (examples)

| Location | Class | Reason |
|----------|-------|--------|
| `ABRAXAS_OAUTH_PROVIDER_FOOTNOTE` | A | Accurate at OAuth boundary |
| `signInCopy.errors.*` (legacy paths) | A | Recovery diagnostics reference Google identity |
| `lib/admin/productionAdminSessionUi` | A | Operator allowlist tied to Google workspace |
| `app/docs/zklogin-setup` | B | Operator setup |
| `LanguageSelector` “Google Translate” | B | Third-party translation service |
| `useGoogleSignIn` hook name | C | Implementation |

## Cannot rebrand without architecture change

- Google-hosted OAuth account selection screen (external)
- JWT `aud` / client ID configuration (`lib/sui/zklogin/*`)
- zkLogin address derivation pipeline

## Follow-up (not in this PR)

- `components/sui/SuiSignInNavButton.tsx` — still shows “Sign in with Google” on some nav surfaces
- Cielo checkout flows — Google-forward copy
- Admin panels — “authorized Google account” for production operators
- Marketing/terminal preview copy (`ZkLoginPreview`, `TokenizationRequestModal`)
