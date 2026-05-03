// FILE: lib/agentEngine.ts
// Sophia Agent System — rule-based autonomous logic.
// Server-side only. No AI inference. Deterministic strategies.
//
// Each agent has: assigned vault, strategy type, evaluation rules, output actions.
// Decision logic: if signal > threshold → execute strategy action.

export type AgentStrategy = "yield_optimize" | "rebalance" | "hedge" | "circuit_guard";
export type AgentStatus   = "active" | "paused" | "evaluating" | "executing";

export interface AgentDefinition {
  id:          string;   // AGENT-001
  name:        string;
  vaultId:     string;
  strategy:    AgentStrategy;
  status:      AgentStatus;
  assignedAt:  string;
  lastAction:  string;
  actionsToday:number;
  description: string;
}

export interface AgentDecision {
  agentId:    string;
  vaultId:    string;
  rule:       string;          // the rule that fired
  input:      number;          // the signal value
  threshold:  number;          // the threshold compared against
  fired:      boolean;         // did the rule trigger?
  action:     string;          // what happens
  rationale:  string;          // plain English reasoning trace
  timestamp:  string;
}

// ─── Agent definitions ────────────────────────────────────────────────────────
// Each agent is scoped to one vault. Strategy is fixed at assignment.

export const AGENTS: AgentDefinition[] = [
  {
    id: "AGENT-001", name: "Sophia-α", vaultId: "490",
    strategy: "yield_optimize", status: "active",
    assignedAt: "2026-02-14", lastAction: "Catalog weight adjusted +0.19%",
    actionsToday: 14, description: "Optimizes royalty yield capture timing and reinvestment windows.",
  },
  {
    id: "AGENT-002", name: "Sophia-β", vaultId: "491",
    strategy: "rebalance", status: "active",
    assignedAt: "2026-02-22", lastAction: "Hedge ratio recalculated 0.41→0.38",
    actionsToday: 11, description: "Maintains exposure balance across streaming revenue cycles.",
  },
  {
    id: "AGENT-003", name: "Sophia-γ", vaultId: "492",
    strategy: "rebalance", status: "active",
    assignedAt: "2026-03-01", lastAction: "Rent flow reinvested — vacancy buffer stable",
    actionsToday: 8, description: "Manages rental income deployment between distribution windows.",
  },
  {
    id: "AGENT-004", name: "Sophia-δ", vaultId: "493",
    strategy: "hedge", status: "active",
    assignedAt: "2026-03-15", lastAction: "Counterparty risk scored — A-grade maintained",
    actionsToday: 9, description: "Monitors invoice counterparty credit and rotates on downgrade.",
  },
  {
    id: "AGENT-005", name: "Sophia-ε", vaultId: "494",
    strategy: "circuit_guard", status: "active",
    assignedAt: "2026-04-02", lastAction: "Bonding checkpoint passed — 15.1%",
    actionsToday: 6, description: "Guards graduating vault against liquidity events during graduation.",
  },
];

// ─── Strategy rules ───────────────────────────────────────────────────────────
// Each strategy has explicit if/then rules. No black-box logic.

const STRATEGY_RULES: Record<AgentStrategy, Array<{
  rule: string; signal: string; threshold: number; comparison: "gt" | "lt";
  action: string; rationale: (val: number, thr: number) => string;
}>> = {
  yield_optimize: [
    {
      rule: "royalty_reinvest_window",
      signal: "distributionGap",
      threshold: 14,
      comparison: "gt",
      action: "Reinvest accrued royalties into short-term deployment",
      rationale: (v, t) => `Distribution gap is ${v.toFixed(0)}d (threshold: ${t}d) — reinvestment window active`,
    },
    {
      rule: "streaming_velocity_drop",
      signal: "streamingVelocity",
      threshold: -10,
      comparison: "lt",
      action: "Reduce catalog exposure by 15% — protect principal",
      rationale: (v, t) => `Streaming velocity ${v.toFixed(1)}% below threshold ${t}% — defensive reduction triggered`,
    },
  ],
  rebalance: [
    {
      rule: "exposure_drift",
      signal: "exposureDrift",
      threshold: 5,
      comparison: "gt",
      action: "Rebalance portfolio weights back to target allocation",
      rationale: (v, t) => `Exposure drift ${v.toFixed(1)}% exceeds ${t}% tolerance — rebalance executed`,
    },
    {
      rule: "hedge_ratio_drift",
      signal: "hedgeRatioDrift",
      threshold: 0.05,
      comparison: "gt",
      action: "Recalculate hedge ratio and adjust derivative position",
      rationale: (v, t) => `Hedge ratio drifted ${v.toFixed(3)} from target — recalibrated`,
    },
  ],
  hedge: [
    {
      rule: "counterparty_downgrade",
      signal: "counterpartyScore",
      threshold: 60,
      comparison: "lt",
      action: "Rotate position to A-grade counterparty — exit B-rated exposure",
      rationale: (v, t) => `Counterparty score ${v.toFixed(0)} dropped below ${t} — rotation executed`,
    },
    {
      rule: "concentration_risk",
      signal: "concentrationRatio",
      threshold: 0.4,
      comparison: "gt",
      action: "Diversify — split concentration across 3 counterparties",
      rationale: (v, t) => `Single counterparty concentration ${(v * 100).toFixed(0)}% exceeds ${(t * 100).toFixed(0)}% limit`,
    },
  ],
  circuit_guard: [
    {
      rule: "liquidity_drop",
      signal: "liquidityDepth",
      threshold: 40,
      comparison: "lt",
      action: "Halt new deployments — preserve liquidity buffer",
      rationale: (v, t) => `Liquidity depth ${v.toFixed(0)} below safety threshold ${t} — deployment paused`,
    },
    {
      rule: "drawdown_trigger",
      signal: "drawdown",
      threshold: 10,
      comparison: "gt",
      action: "Activate circuit breaker — pause agent until drawdown recovers",
      rationale: (v, t) => `Drawdown ${v.toFixed(1)}% exceeds circuit threshold ${t}% — breaker activated`,
    },
  ],
};

// ─── Public API ───────────────────────────────────────────────────────────────

export function runAgentEvaluation(agent: AgentDefinition, signals: Record<string, number>): AgentDecision[] {
  const rules = STRATEGY_RULES[agent.strategy] ?? [];
  return rules.map((r) => {
    const val = signals[r.signal] ?? 0;
    const fired = r.comparison === "gt" ? val > r.threshold : val < r.threshold;
    return {
      agentId:   agent.id,
      vaultId:   agent.vaultId,
      rule:      r.rule,
      input:     val,
      threshold: r.threshold,
      fired,
      action:    fired ? r.action : "No action — signal within normal range",
      rationale: fired ? r.rationale(val, r.threshold) : `Signal ${val.toFixed(2)} within threshold ${r.threshold} — holding`,
      timestamp: new Date().toISOString(),
    };
  });
}

// Simulate realistic signals for agent evaluation
export function simulateAgentSignals(strategy: AgentStrategy): Record<string, number> {
  const base: Record<AgentStrategy, Record<string, number>> = {
    yield_optimize:  { distributionGap: 11, streamingVelocity: -4.2 },
    rebalance:       { exposureDrift: 3.1, hedgeRatioDrift: 0.03 },
    hedge:           { counterpartyScore: 72, concentrationRatio: 0.28 },
    circuit_guard:   { liquidityDepth: 68, drawdown: 4.1 },
  };
  return base[strategy] ?? {};
}