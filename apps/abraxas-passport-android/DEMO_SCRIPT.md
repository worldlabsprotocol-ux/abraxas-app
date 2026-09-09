# Abraxas Passport — 3-minute demo script (Clock In)

**Audience:** Hackathon judges on a physical Android device.

## Setup (before recording)

1. Install debug APK (`app-debug.apk`).
2. Ensure `DEMO_MODE=true` (default) or install Seed Vault / Phantom Mobile for live MWA.
3. Close other apps; enable Do Not Disturb.

## Script (≈3:00)

| Time | Action | Say |
|------|--------|-----|
| 0:00 | Open **Abraxas Passport** | “Abraxas lets users verify once and share only the minimum proof an app needs—not a full profile.” |
| 0:15 | Tap **Connect Solana wallet** | “We use Solana Mobile Wallet Adapter—the approved Seeker wallet flow—not a WebView wrapper.” |
| 0:30 | Show **Passport claims** | “These are reusable credentials: L2 verified over-21, L0 browse-only self-attestation, and wallet binding. No DOB or ID images are stored on device.” |
| 0:50 | Tap **Demo partner requests over_21** | “Good Trouble needs only eligibility for regulated purchase—not identity evidence.” |
| 1:05 | Read **Consent** will share / will NOT share | “The holder sees exactly what crosses the boundary. Date of birth, ID photos, and address never leave Abraxas.” |
| 1:25 | Tap **Approve selective disclosure** | “The partner receives a signed eligibility result—purpose purchase, policy retail-v1, assurance L2.” |
| 1:45 | Show **receipt + consent history** | “Privacy-safe receipt ID and consent history—no PII in the payload.” |
| 2:00 | Tap **Show L0 browse rejected for purchase** | “Browse self-attestation is L0. It cannot authorize checkout—fail closed.” |
| 2:20 | Point at rejection code | “`browse_receipt_not_valid_for_purchase`—same boundary as our production Wix integration.” |
| 2:40 | Closing | “Proofs, not profiles. Reusable Passport on Solana Mobile.” |

## Backup if MWA wallet missing

Sandbox mode connects a demo wallet automatically—state this clearly: “Sandbox fallback for judges without a wallet app; production uses live MWA.”
