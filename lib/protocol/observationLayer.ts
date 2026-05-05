// FILE: lib/protocol/observationLayer.ts
// Layer 1 — Observation Layer
// Agents monitor market, custody, oracle, and protocol state.
// Output: signed risk signals with source + confidence + timestamp.
// Signals are advisory only — they do NOT trigger execution directly.
// The Policy Layer consumes these signals and decides what is permitted.

export type SignalSource = "circuit" | "oracle" | "custody" | "market" | "protocol";
export type SignalSeverity = "info" | "warn" | "critical";

export interface RiskSignal {
  id:          string;
  ts:          number;
  source:      SignalSource;
  agentId:     string;
  vaultId:     string;
  metric:      string;        // what was measured
  value:       number;        // raw value
  threshold:   number;        // boundary that was evaluated against
  breached:    boolean;       // did value cross threshold?
  severity:    SignalSeverity;
  confidence:  number;        // 0–100 — how certain the agent is
  description: string;        // human-readable reasoning
}

// Market signal inputs consumed by the observation layer
export interface MarketState {
  vaultId:          string;
  nftFloorVelocity: number;   // % change per hour
  liquidityDepth:   number;   // 0–100
  volumeDeviation:  number;   // % from 7d baseline
  ondoYieldDelta:   number;   // bps change in Ondo $USDY yield
  realEstateIndex:  number;   // Parcl index value
}

// ─── Signal generators ────────────────────────────────────────────────────────
// Each function evaluates one dimension and emits a RiskSignal.
// Pure functions — no side effects, no execution, no state mutation.

function makeId(): string {
  return `sig-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function observeNFTVelocity(state: MarketState, agentId: string): RiskSignal {
  const threshold = -5; // -5%/hr triggers warning
  const breached  = state.nftFloorVelocity < threshold;
  return {
    id: makeId(), ts: Date.now(), source: "market", agentId,
    vaultId: state.vaultId, metric: "nft_floor_velocity",
    value: state.nftFloorVelocity, threshold,
    breached,
    severity:    breached && state.nftFloorVelocity < -15 ? "critical" : breached ? "warn" : "info",
    confidence:  92,
    description: breached
      ? `NFT floor velocity ${state.nftFloorVelocity.toFixed(1)}%/hr below threshold ${threshold}%/hr`
      : `NFT floor velocity nominal at ${state.nftFloorVelocity.toFixed(1)}%/hr`,
  };
}

export function observeLiquidity(state: MarketState, agentId: string): RiskSignal {
  const threshold = 40;
  const breached  = state.liquidityDepth < threshold;
  return {
    id: makeId(), ts: Date.now(), source: "oracle", agentId,
    vaultId: state.vaultId, metric: "liquidity_depth",
    value: state.liquidityDepth, threshold,
    breached,
    severity:    breached && state.liquidityDepth < 20 ? "critical" : breached ? "warn" : "info",
    confidence:  88,
    description: breached
      ? `Liquidity depth ${state.liquidityDepth} below safety threshold ${threshold}`
      : `Liquidity depth nominal at ${state.liquidityDepth}`,
  };
}

export function observeOndoYield(state: MarketState, agentId: string): RiskSignal {
  const threshold = 20; // 20bps spike = rotation opportunity
  const breached  = Math.abs(state.ondoYieldDelta) >= threshold;
  return {
    id: makeId(), ts: Date.now(), source: "oracle", agentId,
    vaultId: state.vaultId, metric: "ondo_yield_delta",
    value: state.ondoYieldDelta, threshold,
    breached,
    severity: breached ? "warn" : "info",
    confidence: 95,
    description: breached
      ? `Ondo $USDY yield delta ${state.ondoYieldDelta}bps — rotation signal active`
      : `Ondo $USDY yield stable`,
  };
}

// Run all observers and return the full signal set for a vault
export function runObservationCycle(state: MarketState, agentId: string): RiskSignal[] {
  return [
    observeNFTVelocity(state, agentId),
    observeLiquidity(state, agentId),
    observeOndoYield(state, agentId),
  ];
}