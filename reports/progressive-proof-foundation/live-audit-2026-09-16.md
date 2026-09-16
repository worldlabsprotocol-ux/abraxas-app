# PR #293 Live Audit — continuation (2026-09-16T22:25Z)

## Deployment & DEMO

| Check | Status | Evidence |
|-------|--------|----------|
| Preview deployed SHA | **PASS** | `bdd0cd78` — GitHub Preview deployment `2026-09-16T22:15:43Z`; CI 6/6 green |
| PR head (harness) | `21a66ed3` | Interactive handoff script (preview redeploy pending) |
| DEMO Supabase | **PASS** | `ocntwbxarpjeixdnzide` — callback allowlisted |
| MAIN Supabase | **PASS** | Not queried (`bztwutzprwsdrtqdpymf`) |

## Runtime access

| Check | Status | Evidence |
|-------|--------|----------|
| `VERCEL_PROTECTION_BYPASS` in this VM | **FAIL** | `printenv` — unset; probe `302 → vercel.com/sso-api` |
| Bypass in `.env.local` | **FAIL** | Not present (and must not be committed) |

### Where to add the secret (THIS task)

The active Cloud Agent environment for this run is:

- **Name:** `worldlabsprotocol-ux/abraxas-app`
- **Environment ID:** `005f024d-7339-11f1-a8a0-cafc5ef88358`
- **Dashboard:** https://cursor.com/dashboard/cloud-agents/environments/e/005f024d-7339-11f1-a8a0-cafc5ef88358
- **Source:** Personal (not a repo `.cursor/environment.json` override)

**Steps:**

1. Open **Cursor Dashboard → Cloud Agents → Environments**.
2. Select **`worldlabsprotocol-ux/abraxas-app`** (link above).
3. Open the **Secrets** tab for that environment.
4. Add **`VERCEL_PROTECTION_BYPASS`** (value from Vercel → Project **abraxas-app** → Settings → Deployment Protection → **Protection Bypass for Automation**).
5. Scope: **environment-scoped** secret on this environment (not a different repo environment or team-global secret unless also scoped here).
6. **Start a new message/run** on this agent (or restart) so the VM picks up the secret.

Do not paste the value in chat. The agent uses it only as header `x-vercel-protection-bypass`.

If the secret was added to another environment (e.g. team default or a different saved environment), it will **not** inject into this run — only secrets on environment `005f024d-7339-11f1-a8a0-cafc5ef88358`.

## Same-session Google sign-in handoff

**Invalid:** opening the preview URL in your local browser (different session from Playwright).

**Valid:** after bypass is configured, the agent runs:

```bash
PREVIEW_URL=https://abraxas-app-git-cursor-pr-296681-worldlabsprotocol-uxs-projects.vercel.app \
DEPLOYED_SHA=<sha> \
npm run walkthrough:progressive-proof:browse-e2e -- --interactive
```

1. Agent opens **headed Chromium** on this VM (`DISPLAY=:1`).
2. You open **this agent run** → **Desktop** panel: https://cursor.com/agents/bc-dbc1a061-611f-47da-8196-b4029a82d541
3. Complete **Continue with Google** in **that** Chromium window only.
4. Same process continues: DOB → `/demo/reference-partner/browse-callback` → live verify API → retail denial.

No `auth-state.json`, cookies, or tokens exported.

## Live journey (blocked)

| Step | Live status |
|------|-------------|
| Google zkLogin, no KYC at sign-in | **BLOCKED** — no bypass |
| GT browse DOB-only | **BLOCKED** |
| DEMO callback + `browse_receipt` | **BLOCKED** |
| Live `valid_for_purchase=false` | **BLOCKED** |
| Live retail denial | **BLOCKED** |

## Unit / route evidence (completed)

| Gate | Status |
|------|--------|
| Policy fail-closed suite | PASS |
| `browse-receipt/verify/route.test.ts` | PASS (8) |
| `npm run build` | PASS |

PR #293 **unmerged**. MAIN untouched.
