# Design partner candidate evaluation (internal)

**Use when:** Founder has not yet selected the first external wallet-control pilot partner.

**Do not** provision Demo credentials or send Evaluation Software until one entity is chosen and the evaluation agreement is executed.

Technical entry for the pilot remains separate: [`START_HERE.md`](../integration/design-partner/START_HERE.md).

---

## Minimum bar (all must be yes)

| Criterion | Question |
|-----------|----------|
| **Live product** | Do they operate an application with real users or a serious staging deployment (not a mock demo)? |
| **Existing gate** | Do they already have (or clearly own) a **wallet-control or eligibility gate** in **their** server path — not a net-new product Abraxas would need to build? |
| **Engineering owner** | Is there a named developer who can integrate HTTP + Node (or port the example) without Abraxas implementing their checkout or identity stack? |
| **Demo-only acceptance** | Will they run on `https://demo.abraxasworld.xyz` under evaluation terms and **no** Production/billing expectation for phase one? |
| **Security baseline** | Will they keep keys, anchor, and verifier tarball off clients and public repos? |

If any answer is **no**, defer until the gap is closed or pick another candidate.

---

## Scoring (qualitative — founder judgment)

Rate each **Low / Medium / High** and note evidence in one line.

| Dimension | What to look for |
|-----------|------------------|
| **Engineering readiness** | Server-side stack, HTTPS callback URL ready, can run `npm install` from handoff tarball, prior API integration experience |
| **Verification demand** | Real business need for signed permit/deny/indeterminate (regulatory, fraud, age, wallet policy — not curiosity) |
| **Completion likelihood** | Executive sponsor, engineer time boxed for pilot, history of finishing integrations |
| **Trust / review fit** | Willing to pin trust anchor OOB, run checksum on verifier, document independent verify path for their security team |
| **Friction honesty** | Commits to report blockers and setup time — success metric is learning, not marketing |

**Prefer** one strong candidate over a committee. The pilot proves **integration friction**, not protocol breadth.

---

## Disqualifiers (usually pass)

- Requires Abraxas to build their product surface, mobile app, or full checkout first  
- Expects public npm, open source, or Production keys in phase one  
- Cannot provide a stable allowlisted callback URL  
- Wants only a conceptual review with no holder wallet flow  

---

## Founder output (when ready)

1. Selected **legal entity** + technical lead  
2. One-paragraph **pilot scope** (which gate, which environment)  
3. Callback URL(s) for allowlisting  
4. Proceed to [FIRST_DESIGN_PARTNER_SECURE_HANDOFF.md](./FIRST_DESIGN_PARTNER_SECURE_HANDOFF.md)

No candidate is named in-repo until founder records an internal decision (outside git if preferred).
