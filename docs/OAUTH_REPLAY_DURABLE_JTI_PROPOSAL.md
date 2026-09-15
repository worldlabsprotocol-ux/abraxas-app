# Durable OAuth JTI Consumption Proposal (F-004)

## Problem

`lib/sui/zklogin/oauthLoginState.ts` tracks consumed JTIs in a process-local `Map`. In serverless and multi-instance deployments, replay protection does not survive cold starts, concurrency across instances, or deploy rollouts.

## Goals

- One-time JTI consumption for zkLogin OAuth state tokens
- Atomic consume under concurrent requests
- Automatic expiration cleanup
- Hashed identifiers at rest
- Fail closed on store errors during login

## Proposed Schema (separate PR)

Migration `084_zklogin_oauth_jti_consumed.sql` (next available number after current main):

```sql
create table if not exists public.zklogin_oauth_jti_consumed (
  jti_hash text primary key,
  consumed_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists zklogin_oauth_jti_consumed_expires_idx
  on public.zklogin_oauth_jti_consumed (expires_at);

alter table public.zklogin_oauth_jti_consumed enable row level security;
revoke all on public.zklogin_oauth_jti_consumed from anon, authenticated;
grant select, insert, delete on public.zklogin_oauth_jti_consumed to service_role;
```

`jti_hash = encode(digest(jti || ':' || issuer, 'sha256'), 'hex')` using pgcrypto.

## Atomic Consume

Postgres function `consume_zklogin_oauth_jti(jti_hash text, expires_at timestamptz)`:

1. `INSERT ... ON CONFLICT DO NOTHING RETURNING jti_hash`
2. If no row returned, treat as replay (`reason: replayed`)
3. Run inside the existing `consume-login-state` route transaction boundary

## Expiration Cleanup

- Scheduled job (Supabase cron or Vercel cron): `DELETE FROM zklogin_oauth_jti_consumed WHERE expires_at < now() - interval '1 hour'`
- TTL aligned with `ZKLOGIN_OAUTH_STATE_TTL_SEC` (10 minutes) plus buffer

## Serverless Concurrency

- Unique primary key on `jti_hash` gives exactly-once semantics
- Two parallel consumes for the same JTI: one insert wins, the other gets conflict → replay

## Failure Behavior

| Condition | Behavior |
|-----------|----------|
| Missing DB config | Fail closed, return `zklogin_sign_in_expired` |
| Insert error (non conflict) | Fail closed, do not mint session |
| Replay detected | Fail closed, clear OAuth cookies |
| Cleanup job failure | Log alert, reads unaffected |

## Deployment Ordering

1. Apply migration to staging Supabase
2. Deploy code that writes to `zklogin_oauth_jti_consumed` behind feature flag `ZKLOGIN_DURABLE_JTI=1`
3. Enable flag in preview, run zkLogin regression suite
4. Enable in production
5. Remove in-memory `consumedJtis` Map after 48h stable operation

## Rollback

1. Disable `ZKLOGIN_DURABLE_JTI`
2. Code falls back to in-memory map (weaker but functional for single instance)
3. Table can remain; no data dependency for rollback

## Tests (follow-up PR)

- Unit: hash helper, replay mapping
- Integration: parallel consume requests, expired JTI cleanup
- Route: `consume-login-state` returns 401 on second use

## Out of Scope for P2 Hardening PR

No Supabase migration is applied in the code-level hardening PR. This document is the implementation plan for the next isolated database PR.
