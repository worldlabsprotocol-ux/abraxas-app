# Policy Version Operator Workflow (P1-1)

**Status:** Migration `055_policy_immutable_versions.sql` ships with this PR. **Do not apply in production until reviewed.** Operator applies via Supabase SQL editor or `supabase db push`.

---

## Immutability boundary

| Status | Editable fields | Allowed transitions |
|--------|-----------------|---------------------|
| `draft` | All (`name`, `rules_json`, etc.) | → `active`, → `deprecated` (cancel) |
| `active` | `status` only | → `deprecated` |
| `deprecated` | None (fully frozen) | — |

**Immutable once published:** `id`, `version`, `partner_id`, `name`, `rules_json`, `effective_at`.

Changing rules requires a **new version row** — never `UPDATE rules_json` on an active or deprecated row.

---

## Preflight (before migration)

```sql
select id, version, status from public.partner_policies order by id, version;

-- List every inbound FK referencing partner_policies.
-- STOP if any constraint_name is not in the permitted list below.
select con.conname as constraint_name,
       conrelid::regclass as referencing_table
  from pg_constraint con
 where con.contype = 'f'
   and con.confrelid = 'public.partner_policies'::regclass
 order by 1;
```

**Permitted inbound FK names** (must match `lib/policy/partnerPoliciesFkAllowlist.ts`):

- `verification_requests_policy_id_fkey`
- `partner_issuer_trust_rules_policy_id_fkey`

**Stop condition:** If the FK query returns any other `constraint_name`, **do not apply migration 055**. Review the new FK, update the allowlist in code + migration guard, then re-run preflight.

Migration 055 runs inside `BEGIN … COMMIT` and **raises before any destructive DDL** when an unexpected FK is present.

Confirm:
- Every policy has `version >= 1`
- At most one `status = 'active'` row per `id` (today enforced by PK=id; migration adds partial unique index)

---

## Apply migrations (in order)

1. `supabase/migrations/055_policy_immutable_versions.sql` — composite PK + immutability trigger + FK guard
2. `supabase/migrations/056_publish_partner_policy_draft_rpc.sql` — atomic publish RPC

Paste into Supabase SQL editor (or run via migration tooling). **Do not apply in production until reviewed.**

Verify:

```sql
\d public.partner_policies
select id, version, status from public.partner_policies order by id, version;
```

3. Immutability probe (self-contained; no persisted mutation):

```sql
do $$
declare
  active_row record;
begin
  select id, version into active_row
    from public.partner_policies
   where status = 'active'
   order by id, version
   limit 1;
  if not found then
    raise notice 'no active policy rows — probe skipped';
    return;
  end if;
  savepoint manual_immutability_probe;
  begin
    update public.partner_policies
       set rules_json = rules_json || jsonb_build_object('__manual_probe', true)
     where id = active_row.id
       and version = active_row.version
       and status = 'active';
  exception
    when others then
      rollback to savepoint manual_immutability_probe;
      if sqlerrm not like '%cannot mutate rules_json%' then
        raise;
      end if;
      raise notice 'immutability trigger rejected mutation as expected';
      return;
  end;
  rollback to savepoint manual_immutability_probe;
  raise exception 'immutability probe failed — mutation succeeded';
end $$;
```

Expect `NOTICE: immutability trigger rejected mutation as expected` (or skip notice when no active rows). **Do not** use `rules_json = rules_json` — that is a no-op and does not exercise the trigger.

---

## Rollback (manual)

See rollback section at top of `055_policy_immutable_versions.sql`. Rollback removes triggers and restores `PRIMARY KEY (id)` — only safe if no multi-version rows exist.

---

## Operator API (admin session required)

`POST /api/admin/policies/versions`

### Create draft from active

```json
{
  "action": "create_draft",
  "policy_id": "good-trouble-retail-v1",
  "rules_json": { "minimum_age": 21, "sandbox_only": true }
}
```

### Edit draft (while still draft)

```json
{
  "action": "update_draft",
  "policy_id": "good-trouble-retail-v1",
  "version": 2,
  "rules_json": { "minimum_age": 21, "sandbox_only": true, "required_claims": [] }
}
```

### Publish draft (activates vN, deprecates prior active — atomic RPC)

Uses `publish_partner_policy_draft` (migration 056). Deprecation + activation occur in one database transaction; rollback on any error prevents a policy family with zero active versions.

```json
{
  "action": "publish",
  "policy_id": "good-trouble-retail-v1",
  "version": 2
}
```

### Deprecate active without replacement (emergency only)

```json
{
  "action": "deprecate",
  "policy_id": "good-trouble-retail-v1",
  "version": 1
}
```

### List versions

`GET /api/admin/policies/versions?policy_id=good-trouble-retail-v1`

---

## Historical reproducibility

- `verification_decisions` and `decision_receipts` pin `policy_id` + `policy_version` at issuance.
- After migration, load frozen rules via `getPartnerPolicyAtVersion(policyId, version)`.
- Partner Flow audit traces reject mixed `policy_version` values within one `flow_trace_id`.

**Not in P1-1 scope:** `getDecisionStatus()` live re-evaluation (P1-2); embedding `rules_json` inside signed receipt payloads.

---

## Partner onboarding

This workflow is **operator-only**. Partners cannot self-publish policy versions. New relying parties are onboarded via admin assignment of an existing active policy (`partners.assigned_policy_id`).
