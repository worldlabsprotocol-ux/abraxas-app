// FILE: lib/protocol/policyLayer.ts
// Layer 2 — Policy Layer
// Predefined rules determine what actions are PERMITTED based on risk signals.
// Agents do not decide execution — they emit signals.
// Policies decide what is allowed. Execution layer enforces it.
// All policy logic is deterministic and auditable — no black boxes.

import type { RiskSignal } from "./observationLayer";

export type ActionType =
  | "rotate_to_stable"   // move % of vault into Ondo $USDY
  | "raise_reserve"      // increase reserve buffer
  | "reduce_exposure"    // cut position size
  | "pause_deployment"   // halt new capital deployment
  | "trigger_repay"      // repay lending position
  | "rebalance"          // adjust weights back to target
  | "hold";              // no action permitted

export interface PolicyDecision {
  permitted:   boolean;
  actionType:  ActionType;
  magnitude:   number;       // % of vault affected
  rationale:   string;       // exactly which policy rule fired
  signals:     string[];     // signal IDs that triggered this decision
  requiresMultisig: boolean; // true if action > threshold requiring extra approval
  ts:          number;
}

// ─── Policy rules ─────────────────────────────────────────────────────────────
// Each rule takes the signal set and returns a decision.
// Rules are evaluated in priority order — first match wins.
// CRITICAL severity always requires multisig for safety.

const MULTISIG_THRESHOLD_PCT = 20; // actions affecting >20% of vault need multisig

export function evaluatePolicy(
  signals:         RiskSignal[],
  vaultSizeUsd:    number,
  liquidityPref:   "HIGH" | "MEDIUM" | "LOW" = "MEDIUM",
): PolicyDecision {
  const critical  = signals.filter((s) => s.severity === "critical" && s.breached);
  const warnings  = signals.filter((s) => s.severity === "warn"     && s.breached);
  const sigIds    = signals.filter((s) => s.breached).map((s) => s.id);

  // Rule 1: Multiple critical signals → pause all deployment
  if (critical.length >= 2) {
    return {
      permitted: true, actionType: "pause_deployment", magnitude: 100,
      rationale: `Policy Rule 1: ${critical.length} critical signals — pausing deployment`,
      signals: sigIds, requiresMultisig: true, ts: Date.now(),
    };
  }

  // Rule 2: Liquidity critical → trigger repay on lending positions
  const liqCrit = critical.find((s) => s.metric === "liquidity_depth");
  if (liqCrit) {
    return {
      permitted: true, actionType: "trigger_repay", magnitude: 50,
      rationale: `Policy Rule 2: Liquidity depth ${liqCrit.value} critical — repay 50% of lending`,
      signals: [liqCrit.id], requiresMultisig: true, ts: Date.now(),
    };
  }

  // Rule 3: NFT velocity critical + Ondo yield spike → rotate to stable
  const velocityCrit = critical.find((s) => s.metric === "nft_floor_velocity");
  const ondoSignal   = signals.find((s) => s.metric === "ondo_yield_delta" && s.breached);
  if (velocityCrit && ondoSignal) {
    const magnitude = liquidityPref === "HIGH" ? 25 : 15;
    return {
      permitted: true, actionType: "rotate_to_stable", magnitude,
      rationale: `Policy Rule 3: NFT velocity critical + Ondo yield spike — rotate ${magnitude}% to $USDY`,
      signals: [velocityCrit.id, ondoSignal.id],
      requiresMultisig: magnitude > MULTISIG_THRESHOLD_PCT,
      ts: Date.now(),
    };
  }

  // Rule 4: NFT velocity warn → raise reserve
  const velocityWarn = warnings.find((s) => s.metric === "nft_floor_velocity");
  if (velocityWarn) {
    return {
      permitted: true, actionType: "raise_reserve", magnitude: 10,
      rationale: `Policy Rule 4: NFT velocity warning — raising reserve buffer 10%`,
      signals: [velocityWarn.id], requiresMultisig: false, ts: Date.now(),
    };
  }

  // Rule 5: Liquidity warn → reduce exposure
  const liqWarn = warnings.find((s) => s.metric === "liquidity_depth");
  if (liqWarn) {
    return {
      permitted: true, actionType: "reduce_exposure", magnitude: 15,
      rationale: `Policy Rule 5: Liquidity warning — reducing exposure 15%`,
      signals: [liqWarn.id], requiresMultisig: false, ts: Date.now(),
    };
  }

  // Default: no breach → hold
  return {
    permitted: false, actionType: "hold", magnitude: 0,
    rationale: "No policy rules triggered — all signals within bounds",
    signals: [], requiresMultisig: false, ts: Date.now(),
  };
}