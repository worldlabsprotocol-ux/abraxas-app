# Beta service level appendix

| Field | Value |
|-------|-------|
| **Status** | Draft · beta-stage · engineering-owned · **not legal advice** |
| **Base** | `origin/main` at `136bac31be96b90845e0a6c62852ef315e76a871` |
| **Last reconciled** | 2026-08-13 |

## Non-contractual disclaimer (required)

**Internal beta objective only; not historical performance, a guarantee, a contractual SLA, or a service-credit commitment.**

This appendix describes **internal planning targets** for beta-stage design-partner pilots. It is superseded only by a separately executed written agreement (not in this repository).

## Fact tiers

| Label | Meaning |
|-------|---------|
| **Verified in repo** | Measurement source or endpoint exists. |
| **Internal beta objective** | Target below — not a promise. |

---

## Applicability

| Audience | Applies? |
|----------|----------|
| Beta design-partner / pilot integrators (age-gated digital commerce wedge) | Yes — as **discussion reference only** |
| Production enterprise contracts | No — requires counsel-drafted SLA |
| Holders / consumers | No |

---

## Availability objectives (internal beta only)

All figures below are **internal beta objectives only; not historical performance, a guarantee, a contractual SLA, or a service-credit commitment.**

| Surface | Internal beta objective (monthly) | Measurement source (verified) |
|---------|-----------------------------------|-------------------------------|
| Partner Flow `evaluate` / `complete` / `refresh` | 99.0% | Vercel deployment availability; synthetic checks; `app/api/protocol/status/route.ts` |
| Public receipt verification `GET /api/receipts/[receiptId]/public` | 99.0% | `npm run audit:production` HTTP probes |
| Passport holder sign-in (`/passport`, zkLogin) | Best-effort internal objective | No formal metric defined in repo |
| Admin operator consoles | Best-effort internal objective | No formal metric defined in repo |

**Verified in repo:** Public status page is informational — `app/status/page.tsx`; not a contractual commitment.

---

## Incident acknowledgment objectives (internal beta only)

Aligned with `docs/commercial/SUPPORT_AND_ESCALATION_v0.md`. **Internal beta objectives only** — founder-operated processes.

| Severity | Internal beta objective (acknowledgment) |
|----------|------------------------------------------|
| P0 | 1 hour (best effort) |
| P1 | 4 business hours |
| P2 | 1 business day |
| P3 | 2 business days |

Follow `docs/commercial/INCIDENT_RESPONSE_PLAN_v0.md` for security incidents.

---

## Maintenance windows

| Topic | Status |
|-------|--------|
| Published maintenance schedule | **Missing** in repo |
| Planned notice | Best-effort internal objective — no documented procedure |
| Emergency maintenance | Founder notification to active pilot contacts (manual) |

---

## Exclusions

Outages or degradation caused by (non-exhaustive):

| Exclusion | Notes |
|-----------|-------|
| Third-party infrastructure | Supabase, Vercel, Google OAuth, Veriff (when enabled) — **requires operator and counsel confirmation** of production deps |
| Partner misconfiguration | Invalid return URLs, API key errors, client-side integration bugs |
| DDoS or abuse without demonstrated exploit | Bug bounty out-of-scope note — `lib/securityProgram.ts` L80–81 |
| Holder device or browser issues | Outside Abraxas control |
| Demo / sandbox environments | Isolated from production SLA discussion — `docs/demo/*` |

---

## Service credits

**None** during beta. No service-credit commitment is offered or implied by this document.

---

## Researcher SLAs (not customer SLAs)

`lib/securityProgram.ts` L91–98 defines **bug bounty researcher** acknowledgment targets (e.g. Critical: 24h ack). These apply to security@ reports only — **not** to integrator or holder support.

---

## External next steps

| Action | Owner |
|--------|-------|
| Contractual SLA for paid pilots | Counsel |
| Historical uptime reporting from Vercel/Supabase | Operator |
| Status page communication policy | Founder |
