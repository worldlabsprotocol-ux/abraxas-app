# Incident response plan v0

| Field | Value |
|-------|-------|
| **Status** | Draft v0 · internal · beta-stage · engineering-owned · **not legal advice** |
| **Base** | `origin/main` at `136bac31be96b90845e0a6c62852ef315e76a871` |
| **Last reconciled** | 2026-08-13 |

## Founder-operated beta (required)

**Current support and incident escalation are founder-operated beta processes.**

This plan is an **internal draft**. It has not been exercised, tabletop-tested, or approved by counsel. It is **not** a regulatory breach-notification policy.

## Fact tiers

| Label | Meaning |
|-------|---------|
| **Verified in repo** | Containment procedure exists in cited doc/code. |
| **Draft / planned** | Orchestration in this document only. |
| **Requires external validation** | Mature IR program, independent review. |
| **Requires counsel** | Customer/regulator communications. |

---

## Purpose and scope

| In scope | Out of scope |
|----------|--------------|
| Production origin `https://abraxasworld.xyz` (canonical per `docs/RELEASE_READINESS.md` L4) | Demo environment (`docs/demo/*`) unless incident spills over |
| Partner Flow, Passport, credentials, receipts, signing keys | Third-party platform security (Veriff, Vercel, Supabase platform) — coordinate with vendors separately |
| Webhook pipeline operational failures | On-chain Move contract incidents (separate tracker — `lib/securityProgram.ts`) |

---

## Severity levels

| Level | Definition | Examples |
|-------|------------|----------|
| **SEV-1** | Active compromise or critical widespread outage | Suspected `ABRAXAS_SIGNING_KEY` leak; mass invalid receipt acceptance; complete Partner Flow outage |
| **SEV-2** | Major degradation or isolated compromise | Webhook outbox stalled; single partner key abuse; elevated error rate on evaluate/complete |
| **SEV-3** | Limited impact | Misconfigured partner return URL; non-exploitable vulnerability report |
| **SEV-4** | Informational | Scanner noise; low-severity bug bounty |

---

## Roles and owners (draft)

| Role | Primary | Backup | Evidence |
|------|---------|--------|----------|
| Incident commander | Founder | — | `lib/teamProfile.ts` CURRENT_TEAM |
| Technical lead | Engineering (available contributor) | Founder | — |
| Communications | Founder | — | No comms staff in repo |
| Legal counsel | **External — not staffed in repo** | — | `lib/teamProfile.ts` PLANNED_ROLES |
| Security engineer | **Planned — "Post audit"** | Founder | `lib/teamProfile.ts` L39–42 |

---

## First-response objectives (internal beta only)

**Internal beta objectives only; not historical performance, a guarantee, a contractual SLA, or a service-credit commitment.**

| Severity | Acknowledge | Containment start | Updates to active pilots |
|----------|-------------|-------------------|--------------------------|
| SEV-1 | 1 hour (best effort) | 4 hours | As soon as scope known — **counsel review before external statements** |
| SEV-2 | 4 business hours | 1 business day | Daily until resolved |
| SEV-3 | 1 business day | As scheduled | If partner-impacting |
| SEV-4 | 5 business days | N/A | N/A |

---

## Detection sources (verified)

| Source | Evidence |
|--------|----------|
| Webhook alert emails | `docs/PARTNER_WEBHOOKS.md`; `lib/partner/webhooks/webhookAlerts.ts` — **technical operational signals only**, not a guaranteed detection or response system |
| Partner Flow health panel | `app/admin/partner-flow/` |
| Bug bounty reports | `security@worldlabsprotocol.com` — `lib/securityProgram.ts` L64 |
| Production audit script | `npm run audit:production` — `scripts/production-readiness-audit.ts` |
| Manual reports | Integrator email, founder monitoring |

---

## Containment playbooks (verified procedures)

### Signing key compromise (SEV-1)

**Verified in repo:** `docs/TRUST_MODEL_V1.md` §10.4

1. Rotate `ABRAXAS_SIGNING_KEY` and `ABRAXAS_PUBLIC_KEY` via env + redeploy
2. Publish new `signing_key_id`
3. Old receipts verifiable only with archived public key
4. Review decisions issued during compromise window
5. Post-incident review within 5 business days

### Credential / receipt revocation (SEV-1 / SEV-2)

**Verified:** `docs/TRUST_MODEL_V1.md` §10.1–10.2; `lib/decisionReceipts/revocationControlPlane.ts`

1. Revoke credential or mark receipt `revoked`
2. Public verification returns `currently_valid: false`
3. Notify affected partners if scope requires — **counsel review**

### Partner API key compromise (SEV-2)

**Verified:** `docs/TRUST_MODEL_V1.md` §10.3

1. Revoke key in admin (`partner_api_keys.revoked_at`)
2. Issue new key; partner updates integration
3. Review `partner_api_usage` and `audit_events` for abuse window

### Policy misconfiguration (SEV-2 / SEV-3)

**Verified:** `docs/TRUST_MODEL_V1.md` §10.5

1. Identify affected `partner_policies` version
2. Publish corrected policy version per `docs/POLICY_VERSION_OPERATOR.md`
3. Assess receipts issued under misconfiguration — manual review

### Webhook pipeline failure (SEV-2)

**Verified:** `docs/PARTNER_WEBHOOKS.md`

1. Check cron dispatch routes — `app/api/cron/partner-webhook-dispatch/route.ts`
2. Inspect dead-letter state — `lib/partner/webhooks/webhookDeadLetter.ts`
3. Resolve upstream delivery errors; replay if supported
4. Alert emails are **technical operational signals only** — operator must act manually

### Public IDV sync endpoint abuse (SEV-2 / SEV-3)

**Known beta limitation:** `POST /api/idv/sync-decision` lacks authentication — `docs/external-security-review/BETA_LIMITATIONS_AND_SCOPE.md`

1. Assess logs and affected sessions
2. Containment may require code change + deploy — track as remediation item
3. **Requires external validation** after fix

---

## Customer and partner communications

| Rule | Detail |
|------|--------|
| Draft templates | Metadata-only status updates; no holder PII in email |
| Counsel review | **Required** before regulatory, press, or contractual breach notices |
| Active pilots | Contact via founder-held application email — no automated status page for incidents |

**This document does not specify legal breach notification timelines.**

---

## Postmortem

| Severity | Target |
|----------|--------|
| SEV-1, SEV-2 | Within 5 business days of resolution |
| SEV-3 | Optional short write-up |

Store postmortems outside git (e.g. operator wiki) or in untracked `reports/`. Blameless format: timeline, root cause, remediation, follow-ups.

---

## Gaps (honest)

| Gap | Status |
|-----|--------|
| Formal IR plan exercised | **Draft only** — this document |
| DR / BCP (RTO/RPO, Supabase restore) | **Missing** — planned future doc |
| Regulator notification playbook | **Requires counsel** |
| 24/7 on-call rotation | **Missing** — founder-operated |
| Independent security validation of IR readiness | **Requires external validation** |

---

## External next steps

| Action | Owner |
|--------|-------|
| Tabletop exercise of SEV-1 signing-key scenario | Founder + engineering |
| Breach notification obligations | Counsel |
| DR/BCP runbook | Engineering (future) |
| Complete independent security review | Security firm |
