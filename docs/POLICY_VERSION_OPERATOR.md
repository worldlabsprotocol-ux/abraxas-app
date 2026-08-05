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
select conname, conrelid::regclass
  from pg_constraint
 where confrelid = 'public.partner_policies'::regclass;
```

Confirm:
- Every policy has `version >= 1`
- At most one `status = 'active'` row per `id` (today enforced by PK=id; migration adds partial unique index)

---

## Apply migration

1. Paste `supabase/migrations/055_policy_immutable_versions.sql` into Supabase SQL editor (or run via migration tooling).
2. Verify:

```sql
\d public.partner_policies
select id, version, status from public.partner_policies order by id, version;
```

3. Immutability probe (expect **ERROR**):

```sql
update public.partner_policies
   set rules_json = jsonb_set(rules_json, '{minimum_age}', '99')
 where status = 'active'
 limit 1;
```

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

### Publish draft (activates vN, deprecates prior active)

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
