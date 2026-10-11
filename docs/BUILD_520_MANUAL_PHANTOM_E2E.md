# Build #520 — Manual Phantom E2E (founder / operator)

**Environment:** https://demo.abraxasworld.xyz only. Never production Supabase (`bztwutzprwsdrtqdpymf`).

## Cielo verified-rate (priority path)

1. Open https://demo.abraxasworld.xyz/cielo/verified-rate
2. Connect **Phantom** (Solana devnet/mainnet as configured on Demo).
3. Expect copy: not a hotel booking/payment; Abraxas Passport step.
4. Complete profile + wallet signature if prompted — wallet alone must **not** show as fully verified guest.
5. Grant **explicit consent** — nothing sends automatically.
6. Submit request; note public reference on confirmation.
7. Refresh mid-flow — partner context and session should recover (resume storage + server session).
8. Verify return/callback only goes to registered allowlist destinations.

**Pass:** signed session, consent receipt, policy evaluation, no Google zkLogin detour on Solana-native Demo.

**Fail signals:** sign-in loop, Sui onboarding copy, “verified” without qualifying evidence, auto-consent.

## Good Trouble (when L2 available)

Use Launchpad-hosted verify link for **age-21 L2** policy — not browse L0 self-attest.

## Not validated in CI

Phantom signature, Veriff human review, and live partner callback require this manual script or Demo credentials.
