# Execution Mode (Effective Immediately)

**Status:** Active until v1.0.0-beta exit criteria pass.  
**Supersedes:** ad-hoc planning, architecture proposals, tokenomics revisions, UI redesigns.

Architecture, roadmap, and tokenomics are **frozen** until after the production walkthrough and release audit — unless explicitly requested.

---

## Role

**Implementation and validation only.** Not strategy, not redesign, not extension.

Every change must fall into **one** of these categories:

1. **Validate the system**
2. **Resolve a validated defect**
3. **Improve operational readiness**
4. **Address a verified security issue**

Everything else is deferred until after **v1.0.0-beta**.

Do **not** create new strategy documents, roadmap updates, tokenomics revisions, or architectural proposals unless explicitly requested.

---

## Frontend freeze

The current UI/UX is **feature complete**.

### Do not

- Redesign layouts
- Change typography, spacing, alignment, colors, or animations
- Replace or remove imagery
- Remove Protocol in Action assets
- Recentre the homepage
- Refactor frontend because it "looks cleaner"

The homepage and design system are **frozen**.

### Frontend changes allowed only when strictly required to

- Connect backend functionality
- Surface backend data
- Fix a **verified** bug
- Resolve an accessibility issue
- Resolve a **verified** security issue

### Rules when UI change is unavoidable

- If the task can be completed **without** modifying UI → do not touch frontend files
- Preserve existing design language
- Change the **smallest possible** surface area
- Explain exactly why the change is required
- Do **not** refresh the homepage baseline unless an explicit redesign is approved (`[ui-change]`)

### Homepage protection

The homepage is a protected product surface. Use `npm run check:homepage-guard` and CI enforcement. See `docs/UI_PRESERVATION.md`.

---

## Current priority (in order)

No feature work. No redesigns. No token implementation.

1. Merge and deploy PR #89
2. Configure production environment variables (`ADMIN_PIN`, `NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID`, etc.)
3. Execute production walkthrough — Paths A–D (`docs/PRODUCTION_WALKTHROUGH_CHECKLIST.md`)
4. Record evidence (`docs/PRODUCTION_WALKTHROUGH_RESULTS.md`)
5. Fix validated defects only
6. Produce v1.0.0-beta release audit
7. **Stop**

Phase 2 hardening begins **only** after walkthrough passes and release audit is complete. See exit criteria in `docs/ENGINEERING_ROADMAP.md`.

---

## What to build (stable design, execution focus)

- Identity flow
- Passport issuance
- Credential lifecycle
- Partner APIs
- Security
- Production validation

The UI changes only when a **UI redesign phase** is explicitly started — not because a component could be structured differently.

---

## Response format

Do **not** generate new planning documents when reporting work.

Report:

| Section | Content |
|---------|---------|
| Files changed | List only |
| Code added/removed | Summary |
| Tests executed | Commands + results |
| Walkthrough progress | Path A–D status |
| Production blockers | None / listed |
| Remaining action items | Concrete next steps |

Keep responses concise and execution-focused.

**Objective:** Prove the existing protocol works in production — not redesign or extend it.
