# Abraxas Production Readiness Report

**Last updated:** 2026-07-27 (post PR #67 merge + launch hardening)  
**Production URL:** https://abraxas-app.vercel.app  
**Main commit:** `8b70d2d` (Abraxas Verify production deploy)

---

## Current readiness score: **8.2 / 10**

| Layer | Score | Status |
|-------|-------|--------|
| Infrastructure | 9/10 | Capture, admin, issuance, health APIs live |
| Biometric engine | 6/10 | v1 heuristics — human review backs pilot |
| Security | 8.5/10 | Session auth, rate limit, admin PIN hardening |
| Ops / monitoring | 7.5/10 | `/api/health` aggregator + JSON audit logs |
| Mainnet on-chain | 4/10 | Devnet ready; mainnet package not deployed |
| **Pilot validation** | **6/10** | Endpoints verified; one real E2E capture pending human run |

**Production policy (locked):** `ABRAXAS_BIOMETRIC_AUTO_APPROVE` must remain **OFF**. All captures queue for human review.

---

## Completed work (this launch cycle)

### Merge & deploy
- [x] PR #67 merged to `main` (`8b70d2d`)
- [x] Supabase migrations 036 + 037 applied (user-confirmed)
- [x] Vercel env configured (user-confirmed)
- [x] Production endpoints returning 200 on biometric/independent/verify layer

### Security hardening
- [x] `ADMIN_PIN` server-only in production — `NEXT_PUBLIC_ADMIN_PIN` no longer gates APIs
- [x] Fixed credential revoke auth bypass when public pin unset
- [x] Admin UI no longer pre-fills PIN in production
- [x] Upload route: MIME type + 8 MB size validation (parity with capture)
- [x] Cielo admin routes unified on `checkAdmin`
- [x] Added `/api/health` aggregated health endpoint
- [x] Added `lib/adminAuth.test.ts`

### Automated tests
- [x] 248 unit tests passing
- [x] Identity pipeline tests (provider default, auto-approve off, reject path)

---

## Production health report (2026-07-27)

| Endpoint | HTTP | Result |
|----------|------|--------|
| `GET /api/health` | 200/503 | Aggregated checks |
| `GET /api/idv/biometric/status` | 200 | `production_policy: human_review_only` |
| `GET /api/idv/independent/status` | 200 | `status: live` |
| `GET /api/idv/health` | 200 | DB reachable |
| `GET /api/verify/layer` | 200 | Independent biometric `live` |
| `GET /api/mainnet/readiness` | 200 | 3/7 gates (43%) |
| `POST /api/identity/documents/capture` (no session) | 401 | Sign in required |
| `GET /api/admin/identity/queue` (no pin) | 401 | Unauthorized |

```bash
ABRAXAS_HEALTH_BASE_URL=https://abraxas-app.vercel.app npm run biometric:health
```

---

## Identity flow checklist (production pilot)

| Step | Route / UI | Validated |
|------|------------|-----------|
| Passport sign-in | `/passport` → zkLogin | Manual |
| ID + selfie capture | Abraxas Verify UI | Manual |
| Biometric assessment | `POST /api/identity/documents/capture` | Manual |
| Human review | `/admin/identity` | Manual |
| Credential issuance | `POST /api/admin/identity/approve` | Manual |
| On-chain passport | Sponsor provision (devnet) | Manual |

**Blocker:** Full browser E2E requires a human operator with zkLogin.

---

## Remaining blockers

| Priority | Blocker | Action |
|----------|---------|--------|
| P0 | One real production capture → approve → credential | Human pilot run |
| P0 | `ADMIN_PIN` server-only in Vercel | Set `ADMIN_PIN`; remove public pin from prod |
| P1 | Hardening deploy | Merge and verify `/api/health` |
| P2 | Sui mainnet | Phase 2 |

---

## Recommended next action

1. Merge hardening branch and confirm Vercel deploy
2. Set `ADMIN_PIN` in Vercel (server-only)
3. Run one full identity pilot and document each HTTP response
4. Begin Phase 2 only after pilot sign-off
