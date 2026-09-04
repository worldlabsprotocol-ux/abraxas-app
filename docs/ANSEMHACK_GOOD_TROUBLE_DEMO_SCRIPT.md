# AnsemHack Demo Script — Good Trouble × Abraxas (60–90 seconds)

**Audience:** Hackathon judges, technical partners  
**Mode:** Sandbox / demo environment only — never production gates

---

## Setup (before recording)

1. Open Good Trouble site age gate (popup) on desktop and mobile viewports.
2. Confirm Abraxas preview or sandbox origin is configured in Wix constants.
3. Use a test Google account without an existing Abraxas credential for the “new user” path, or a returning account for the fast path.

---

## Script

**[0:00–0:10] Good Trouble entry**  
“Good Trouble needs to confirm a retail eligibility requirement without collecting unnecessary ID data on every visit. The customer taps **Verify with Abraxas** on the age gate.”

**[0:10–0:25] Abraxas handoff**  
“The customer lands on Abraxas partner verification — not the Passport dashboard. The screen explains that Good Trouble uses Abraxas for a policy result, and that **signing in is not age verification**.”

**[0:25–0:40] Sign-in and resume**  
“After Google sign-in, Abraxas restores the original partner request automatically — no second click. The server evaluates the registered Good Trouble policy.”

**[0:40–0:55] Evidence (if needed)**  
“If reusable proof already exists, Abraxas issues a short-lived signed receipt immediately. If not, the customer completes only the required evidence step on the partner continue screen — wallet confirmation and identity verification when the policy requires it.”

**[0:55–1:15] Return and server verify**  
“Abraxas redirects back to Good Trouble with a receipt ID. **Good Trouble’s backend** fetches and validates the receipt — it never trusts URL parameters alone. On success, the customer returns to their original shopping destination.”

**[1:15–1:30] Close**  
“Abraxas returns a policy result, not PII. In-store ID checks at pickup or POS may still apply. This pilot runs on sandbox infrastructure until operators publish production policy versions.”

---

## What to show on screen

1. Good Trouble age popup → Abraxas partner screen  
2. Sign-in → automatic resume (no duplicate click)  
3. Approval → automatic redirect to Good Trouble callback  
4. Success message → return to original page  
5. Optional: receipt validation in Wix backend logs (no PII)

---

## Do not claim

- Universal acceptance or live production partners  
- That Google sign-in proves age  
- That Abraxas replaces legal transaction-time ID checks  
- Production compliance or regulator approval
