// FILE: lib/agenticFinancePositioning.ts
// Agentic finance ecosystem positioning — complementary to act-layer MCPs (e.g. Robinhood).
// Abraxas is not integrated with Robinhood; we verify before agents act.

import { siteUrl } from "@/lib/siteUrl";

/** Public Robinhood Agentic Trading MCP endpoint (their hosted server, OAuth). */
export const ROBINHOOD_TRADING_MCP_URL = "https://agent.robinhood.com/mcp/trading" as const;

export const AGENTIC_FINANCE_HEADLINE = "Verify before agents act.";

/** Homepage — names Robinhood explicitly so the movement is visible above the fold. */
export const AGENTIC_FINANCE_HOME_TITLE =
  "Robinhood opened agentic trading. Abraxas verifies before agents act.";

export const AGENTIC_FINANCE_HOME_BADGE = "Agentic finance · July 2026";

export const AGENTIC_FINANCE_HERO_PILL =
  "Robinhood Agentic Trading MCP is live — Abraxas is the verify layer upstream";

export const AGENTIC_FINANCE_SUBHEAD =
  "Robinhood's Agentic Trading MCP lets agents trade. Abraxas gives those agents cryptographic proof to check before they move capital or accept an asset.";

export const AGENTIC_FINANCE_STRIP_BODY =
  "Agentic finance is here — Robinhood opened its Trading MCP to Claude, ChatGPT, Cursor, and other agents. Abraxas sits upstream: verify identity and asset proof once, then let any MCP-connected agent gate on agent.valid before it acts.";

export const AGENTIC_FINANCE_INDEPENDENCE_NOTE =
  "Abraxas is independent verification infrastructure — not a Robinhood integration. We build alongside the same agentic stack so builders can compose verify → act without rebuilding trust per app.";

export const AGENTIC_FINANCE_STACK_LAYERS = [
  {
    id: "verify",
    label: "1 · Verify — Abraxas",
    role: "Cryptographic proof that a person or asset passed policy — agent.proceed / agent.valid",
    examples: "POST /api/credentials/verify · GET /api/proof/{id}",
    abraxas: true,
    step: 1,
  },
  {
    id: "act",
    label: "2 · Act — Robinhood MCP",
    role: "Agents place orders via Robinhood's Trading MCP — Claude, ChatGPT, Cursor, and more",
    examples: "agent.robinhood.com/mcp/trading · isolated Agentic account",
    abraxas: false,
    step: 2,
  },
] as const;

/** Factual reference about Robinhood Agentic Trading — for docs and JSON guides only. */
export const ROBINHOOD_AGENTIC_TRADING_REFERENCE = {
  product: "Robinhood Agentic Trading",
  mcp_url: ROBINHOOD_TRADING_MCP_URL,
  transport: "HTTP (Streamable HTTP / remote MCP)",
  auth: "OAuth via Robinhood — agents never handle user passwords",
  account_model:
    "Dedicated, separately funded Agentic account for order placement; other Robinhood accounts remain read-only to the agent",
  supported_actions: [
    "Read portfolio, positions, quotes, watchlists",
    "Review and place long equity orders (Agentic account)",
    "Options workflows rolling out per Robinhood eligibility",
  ],
  supported_clients: [
    "Claude / Claude Code",
    "ChatGPT",
    "Cursor",
    "Codex / Codex CLI",
    "Grok",
    "Other MCP-capable agents",
  ],
  docs: [
    "https://robinhood.com/us/en/support/articles/agentic-trading-overview/",
    "https://robinhood.com/us/en/support/articles/trading-with-your-agent/",
    "https://robinhood.com/us/en/newsroom/robinhood-is-now-open-to-agents/",
  ],
  disclaimer:
    "Reference only — Abraxas does not operate Robinhood's MCP and is not affiliated with Robinhood. Users remain responsible for trades their agents place per Robinhood's terms.",
} as const;

export const ABRAXAS_AGENTIC_ROLE = {
  layer: "verify-before-act",
  summary:
    "Issue a decision + signed authentication proof that any agent can GET and validate without trusting Abraxas's word alone.",
  gates: ["agent.proceed on verify response", "agent.valid on proof lookup"],
  endpoints: {
    verify: "POST /api/credentials/verify",
    proof: "GET /api/proof/{proof_id}",
    e2e_check: "GET /api/verify/e2e",
    agent_guide: "GET /api/docs/agents",
  },
  compose_pattern:
    "Before calling an execution MCP (e.g. Robinhood place_equity_order), call Abraxas verify → GET proof → require agent.valid === true, then proceed with your act-layer tools.",
} as const;

export const AGENTIC_FINANCE_COMPOSE_FLOW = [
  "Agent receives a task that touches a verified person or RWA (allocation, custody handoff, gated product access).",
  "POST /api/credentials/verify with record_id or credential — read response.agent.proceed.",
  "GET response.verify_url — require proof.agent.valid === true (fail closed).",
  "Only then invoke act-layer tools (e.g. Robinhood MCP order placement) per your policy.",
] as const;

export function getAgenticFinanceStack() {
  return {
    schema: "abraxas.agentic_finance.v1" as const,
    updated: "2026-07-20",
    headline: AGENTIC_FINANCE_HEADLINE,
    subhead: AGENTIC_FINANCE_SUBHEAD,
    independence: AGENTIC_FINANCE_INDEPENDENCE_NOTE,
    stack: AGENTIC_FINANCE_STACK_LAYERS,
    robinhood_reference: ROBINHOOD_AGENTIC_TRADING_REFERENCE,
    abraxas_role: ABRAXAS_AGENTIC_ROLE,
    recommended_compose_flow: AGENTIC_FINANCE_COMPOSE_FLOW,
    docs: {
      human: siteUrl("/docs/ai-agents"),
      json: siteUrl("/api/docs/agents"),
      integrate: siteUrl("/integrate"),
    },
  };
}
