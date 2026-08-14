# Security review outreach email

| Field | Value |
|-------|-------|
| **Status** | Draft · beta-stage · founder-owned · **not legal advice** |
| **Base** | `origin/main` at `3a92bd44ab1bfa64d4e8edf9cd71b4934a1e085a` |
| **Last reconciled** | 2026-08-13 |

Use this template to contact security firms. Customize bracketed fields. **Do not** claim an audit has occurred or that Abraxas is secure, certified, or audit-ready.

---

## Subject line options

1. `RFP: Independent security review — beta B2B trust platform (age-gated commerce pilots)`
2. `Scoped appsec / pentest proposal request — Abraxas Verify`
3. `Security review proposal — reviewer package ready, no prior independent review`

---

## Email body

```
Hi [Name / Team],

I'm [Founder Name] at Abraxas (World Labs Protocol). We operate a beta-stage B2B
trust and authorization platform for age-gated digital commerce pilots — not a KYC
provider. Holders verify through Abraxas Passport; relying partners receive
policy-bound derived claims and cryptographically signed decision receipts.

We have prepared an internal reviewer package (architecture docs, STRIDE threat
model, reproducible verification commands) but **no independent security review or
penetration test has been completed**. Abraxas is seeking an independent security
review before onboarding additional relying-party pilots. Independent security
review is planned and not yet completed.

I'm attaching our RFP (docs/commercial/SECURITY_REVIEW_RFP_v1.md) and can provide
repository access under NDA. The default test environment is controlled
staging/demo with synthetic data only. Any production testing would require
separate written authorization.

Could you send a scoped proposal covering methodology, timeline, price range,
retest terms, severity definitions, and NDA requirements?

Thank you,
[Founder Name]
[Title]
security@worldlabsprotocol.com
```

**Verified in repo:** `security@worldlabsprotocol.com` — `lib/securityProgram.ts` L64.

---

## Attachments / links

| Item | Path |
|------|------|
| RFP | `docs/commercial/SECURITY_REVIEW_RFP_v1.md` |
| Reviewer package | `docs/external-security-review/README.md` |
| Honest gate status | `docs/RELEASE_READINESS.md` L18 |

---

## Do not say

- "We are audited" / "security review in progress" (use **seeking** or **planned and not yet completed**)
- "Enterprise-grade" / "production-certified" / "SOC 2"
- That `over_21` or Partner Flow outputs are legally sufficient for age verification
- That cannabis is the initial pilot scope (age-gated digital commerce is primary)

---

## Follow-up checklist (operator)

| Step | Action |
|------|--------|
| 1 | Compare 2–3 proposals on scope, retest, and staging-only default |
| 2 | Confirm mutual NDA before repo access |
| 3 | Confirm no real holder PII in testing or reports |
| 4 | Record selected vendor and SHA in `docs/RELEASE_DECISION.md` when engaged — **Requires external validation** |
