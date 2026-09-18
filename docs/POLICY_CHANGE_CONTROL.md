# Policy Change Control

Partners can evolve eligibility policies over time without silently changing what old signed receipts mean, and without switching an active integration onto a newer version until they explicitly adopt it.

**Status:** Code is in this PR. Schema migration `088_policy_change_control.sql` is **DEMO-only**. Do not apply to MAIN / Production Supabase. Do not merge this PR to enable production activation.

---

## What is real vs fixture

| Surface | Classification |
|---|---|
| Published policy versions, Launchpad pins, receipt `policy_id` + `policy_version` | **Real** |
| Partner Kit evaluation of a fetched public receipt | **Real** (fail-closed) |
| Lifecycle audit and adoption rows (after DEMO migration) | **Real** in DEMO |
| Launchpad draft fixture panel | **Offline / simulated** — labeled, never issues a receipt |
| Google zkLogin | **Account-only** — never proves eligibility |

---

## Version lifecycle

- `draft` — editable and fixture-evaluable. Cannot issue production receipts.
- `active` — immutable identity/rules. At most one active version per policy id.
- `deprecated` — immutable historical snapshot. Pinned integrations may keep issuing until `deprecate_effective_at`.
- Publish runs server-side validation, then the existing atomic `publish_partner_policy_draft` RPC.
- Deprecate may take an optional future `deprecate_effective_at`. Until that timestamp the version can remain issuable for pinned integrations.
- Published rows are never mutated in place (`id`, `version`, `partner_id`, `name`, `rules_json`, `effective_at`).

## Compatibility

- Every receipt stays bound to the policy id and version that issued it.
- Existing receipts are evaluated against that original version.
- Launchpad applications pin `policy_version`. Publishing v2 does **not** move them. They must **Adopt**.
- Missing, unknown, draft, deprecated-effective, mismatched, future, and wrong-partner versions fail closed with typed codes.
- Versions with issued receipts or active Launchpad bindings cannot be deleted.

## Partner Launchpad

The Policies area shows:

- current active version
- draft successor
- comparison of required claims, assurance, purpose, result fields, and withheld fields
- per-application compatibility
- safe next action and exact blocker
- offline/simulated fixture panel

No raw credentials, PII, DOB, document data, OAuth tokens, wallet secrets, or signing secrets.

## Partner Integration Kit 1.1.0

Partners pin `policyVersion` (and `requirePolicyVersion: true` when the use case needs a pin). Only `outcome === permitted` authorizes an action.

New typed outcomes: `policy_version_missing`, `policy_version_unknown`, `policy_version_draft`, `policy_version_deprecated`, `policy_version_not_yet_effective`, `policy_version_not_adopted`.

## DEMO-only migration runbook

Authorized target: isolated demo project `ocntwbxarpjeixdnzide`.

SQL Editor: https://supabase.com/dashboard/project/ocntwbxarpjeixdnzide/sql/new

1. Confirm you are in the DEMO project, not Production.
2. Paste `supabase/migrations/088_policy_change_control.sql`.
3. Run.
4. Verify:

```sql
select column_name
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'partner_policies'
   and column_name = 'deprecate_effective_at';

select to_regclass('public.partner_policy_lifecycle_audit'),
       to_regclass('public.partner_policy_adoptions');
```

Do not apply this file to MAIN / Production.
