# First external design partner — secure handoff (internal)

**Build #831 complete.** Use Demo only. **No** public GitHub Release, **no** npm publish, **no** Production DB or billing for this pilot.

**Partner-facing entry (single link):** [`docs/integration/design-partner/START_HERE.md`](../integration/design-partner/START_HERE.md)

**Developer assignment (copy to partner after handoff):**

> Integrate one wallet-control verification into your application on Abraxas Demo. Enforce the signed result independently with the provided verifier package. Report setup time, what required assistance, and what failed. Success: real holder flow completes and your app correctly handles **permit**, **deny**, and **indeterminate**.

---

## Preconditions (founder — do not skip)

| # | Gate | Owner |
|---|------|--------|
| 1 | **Named partner** — legal entity and primary engineer contact | Founder |
| 2 | **Evaluation agreement** executed ([DRAFT_VERIFIER_SANDBOX_EVALUATION_AGREEMENT.md](../legal/DRAFT_VERIFIER_SANDBOX_EVALUATION_AGREEMENT.md) after legal review) | Founder + Legal |
| 3 | **Authorization to distribute** Evaluation Software privately to that entity | Founder |
| 4 | Pilot scoped to **wallet-control on Demo** — not Production | Founder |

Automation and agents **must not** provision credentials, send tarballs, or execute agreements without explicit founder authorization for a **identified** organization.

---

## Information required from the chosen partner (minimum)

Collect before provisioning:

| Field | Why |
|-------|-----|
| Legal entity name + jurisdiction | Agreement counterparty |
| Technical lead (name, email, secure channel) | Handoff and support |
| Product name + one-line description | Pilot record |
| **Exact HTTPS callback URL(s)** (staging preferred) | Allowlist — character-for-character match |
| Wallet-control gate description (where enforcement runs) | Confirm pilot fit |
| Confirmation: secrets server-side only; no keys in client/repos | Security baseline |

Optional but useful: expected pilot start date, framework/language (Node example is reference only).

---

## Secure handoff bundle (one encrypted or founder-approved channel)

Deliver **after** agreement execution. Never in public chat, tickets, or git.

| # | Item | Notes |
|---|------|--------|
| 1 | **START_HERE link** | Same as above — only public doc link partner needs |
| 2 | **Example folder** | Copy `examples/external-node-partner/` or instruct clone path; partner adds `.env` locally |
| 3 | **Evaluation Software** | `abraxas-independent-verifier-0.1.1.tgz` + `.sha256` (from `artifacts/npm/` or example `vendor/` on main @ Build #831) |
| 4 | **Integrity instruction** | Partner runs `shasum -a 256 -c abraxas-independent-verifier-0.1.1.tgz.sha256` before `npm install` |
| 5 | **Demo trust anchor JSON** | Out-of-band; partner verifies fingerprint per [TRUST_ANCHOR.md](../integration/design-partner/TRUST_ANCHOR.md) — **not** bundled with tarball |
| 6 | **Sandbox credentials** | `ABRAXAS_BASE_URL=https://demo.abraxasworld.xyz`, `abx_test_…` (show once), `application_id`, `partner_id`, `policy_id` |
| 7 | **Allowlist confirmation** | Written confirmation their callback URL is allowlisted on **Demo** Integration Studio app |
| 8 | **Support boundary** | Abraxas supports sandbox blockers (allowlist, env, export 503); partner implements their own access enforcement |

**Do not** conflate downloading the tarball with trusting the issuer — anchor install remains a separate step ([TRUST_ANCHOR.md](../integration/design-partner/TRUST_ANCHOR.md)).

---

## Founder operational checklist (Demo Integration Studio)

Execute in order:

1. [ ] Partner identified and minimum information collected  
2. [ ] Legal review of evaluation agreement complete  
3. [ ] Agreement signed  
4. [ ] Create or designate **wallet-control** sandbox **application** on **Demo** ([Integration Studio](https://demo.abraxasworld.xyz/developers/integration-studio))  
5. [ ] Allowlist partner **exact** callback URL(s)  
6. [ ] Issue **Demo-only** `abx_test_…` key with scopes appropriate to Partner Flow + portable export (record id in internal runbook only)  
7. [ ] Generate or export **Demo trust anchor**; record fingerprint you expect partner to verify  
8. [ ] Private transfer: tarball + checksum + anchor + credentials + START_HERE  
9. [ ] Record pilot start date; share [PILOT_ACCEPTANCE_CHECKLIST.md](../integration/design-partner/PILOT_ACCEPTANCE_CHECKLIST.md) for partner self-measurement  
10. [ ] Track assists and failures — no “external adoption” claim until partner demonstrates live enforcement  

Reference: [DESIGN_PARTNER_PILOT_FOUNDER_RUNBOOK.md](./DESIGN_PARTNER_PILOT_FOUNDER_RUNBOOK.md)

---

## Distribution policy for this pilot

| Channel | Use for first partner? |
|---------|-------------------------|
| Private `.tgz` + SHA-256 under evaluation agreement | **Yes** |
| Public GitHub Release | **No** (not required for one partner) |
| npm `@abraxas` publish | **No** |
| `UNLICENSED` in package metadata | **Yes** — written agreement grants pilot rights |

---

## Success (Abraxas acceptance)

Partner demonstrates on **Demo**:

1. Authorized verification request created via hosted Partner Flow / handoff API.  
2. Holder completes real wallet authorization.  
3. Partner server verifies with **Evaluation Software** (not query params alone).  
4. **Permit / deny / indeterminate** enforced in partner’s app.  
5. Stale or invalid status fails closed where applicable ([SANDBOX_TEST_CASES.md](../integration/design-partner/SANDBOX_TEST_CASES.md)).

Record evidence in internal pilot notes; partner fills measured columns in PILOT_ACCEPTANCE_CHECKLIST.

---

## Explicit non-actions

- Do not invent or name a partner in automation  
- Do not create API keys or allowlists without founder authorization for a named entity  
- Do not send Evaluation Software before agreement execution  
- Do not enable Production, billing, or new infrastructure for this track
