# Browse E2E — same-session interactive handoff (PR #293)

**Preview SHA:** `bdd0cd78`  
**DEMO:** `ocntwbxarpjeixdnzide`

## Prerequisites

1. `VERCEL_PROTECTION_BYPASS` on **this** Cloud Agent environment (see audit report for exact UI path).
2. Agent runs: `npm run walkthrough:progressive-proof:browse-e2e -- --interactive`

## Same-session Google sign-in (required)

Do **not** open the preview URL in your local browser. Sessions are not shared.

1. Open this agent run: https://cursor.com/agents/bc-dbc1a061-611f-47da-8196-b4029a82d541  
2. Open the **Desktop** panel (headed Chromium on the agent VM).  
3. In **that** Chromium window: click **Continue with Google** and complete OAuth.  
4. The script waits in the same process, then runs DOB self-attest → DEMO callback → live API checks.

No cookie export, no `auth-state.json`, no tokens in chat.
