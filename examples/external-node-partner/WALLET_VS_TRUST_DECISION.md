# Wallet signature vs policy-bound trust decision

Use this when scoping an institutional pilot. Abraxas is **not** selling “connect a wallet and get a boolean.”

## Wallet signature alone

| Property | Typical wallet sign-in |
| --- | --- |
| Proves | This key signed this message at this time |
| Binds to | Your app’s session or nonce |
| Revocation / freshness | Usually none — replay until session expires |
| Audit artifact | Server log line |
| Enforcement location | Your server trusts the wallet provider or your session store |

## Policy-bound trust decision (Abraxas pilot)

| Property | Abraxas outcome |
| --- | --- |
| Proves | Holder satisfied **policy** (e.g. wallet control) under **partner + policy** audience |
| Binds to | Signed **decision receipt** + **signed status** evidence |
| Revocation / freshness | Status statement; stale issuer cannot authorize (Build 870) |
| Audit artifact | Portable bundle verifiable with **pinned trust anchor** |
| Enforcement location | **Your application** runs independent verify + **permit / deny / indeterminate** |

## Pilot acceptance language

Success means the relying party:

1. Creates an authorized verification request (`POST /api/v1/partner-handoff`).
2. Receives a **signed receipt** after holder steps (wallet control may be one qualification method).
3. Fetches the **portable bundle** and verifies with `@abraxas/independent-verifier` (not Abraxas-hosted UI).
4. **Enforces** the result in their authorization path — including **deny** and **indeterminate** on wrong audience or stale evidence.

Wallet control is an **input** to the decision engine; the **product** is independently verifiable, current, policy-bound evidence your app can enforce without delegating trust to Abraxas UI.

## Build 883 / 885 — transaction mandate (relying party)

After independent Abraxas verification, enforce **issuer-backed mandate evidence** (`lib/institutional/mandate/`):

1. Verify mandate signature against **signed issuer authority** (mandate issuer `reason_class`, not receipt-only keys).
2. Match **transaction scope** (actor, tenant, policy version, amount, destination, action type, validity window).
3. Optionally bind the Abraxas receipt via **evidence commitment** to the `mandate_id`.

Build 885 uses a **controlled test issuer** (`abraxas_controlled_test_mandate_issuer_not_live_institution`) — not a live external institution. Wallet control and valid receipt signatures still **cannot** authorize if the mandate is invalid, out of scope, or issued by an unauthorized party.
