// FILE: lib/circuitEngine.ts
// Circuit Safety Engine — deterministic risk scoring.
// Server-side only. Called from /api/circuit/*.
// No AI dependencies. Pure rule-based signal evaluation.
//
// Architecture:
//   Signal input → threshold evaluation → risk score → state classification → action trigger

export type RiskState = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface SignalInput {
  vaultId:          string;
  priceVelocity:    number;   // % change per hour — positive or negative
  liquidityDepth:   number;   // 0–100 (100 = deep liquidity)
  volumeDeviation:  number;   // % deviation from 7d rolling average
  counterpartyScore:number;   // 0–100 (100 = highest credit quality)
  streamingVelocity:number;   // royalty: streams per hour vs 7d baseline
  drawdown:         number;   // peak-to-current % drawdown
}

export interface RiskResult {
  vaultId:    string;
  score:      number;       // 0–100 (100 = maximum risk)
  state:      RiskState;
  signals:    SignalBreak[];
  action:     ActionTrigger | null;
  evaluatedAt:string;
}

export interface SignalBreak {
  signal:    string;
  value:     number;
  threshold: number;
  breached:  boolean;
  weight:    number;        // contribution to total score
}

export interface ActionTrigger {
  type:        "reduce_position" | "raise_reserve" | "hedge" | "rotate" | "pause";
  description: string;
  magnitude:   number;      // % of position affected
  urgent:      boolean;
}

// ─── Thresholds — deterministic, documented ───────────────────────────────────
// Each threshold is a boundary. Crossing it contributes `weight` points to the score.

const THRESHOLDS = {
  priceVelocity:     { warn: 5,   critical: 15,  weight: 25 },  // >5%/hr warn, >15% critical
  liquidityDepth:    { warn: 40,  critical: 20,  weight: 20 },  // <40 warn, <20 critical
  volumeDeviation:   { warn: 20,  critical: 40,  weight: 15 },  // >20% dev warn, >40 critical
  counterpartyScore: { warn: 60,  critical: 40,  weight: 20 },  // <60 warn, <40 critical
  streamingVelocity: { warn: -15, critical: -30, weight: 10 },  // -15% warn, -30% critical
  drawdown:          { warn: 8,   critical: 20,  weight: 10 },  // >8% warn, >20% critical
} as const;

function classifyState(score: number): RiskState {
  if (score >= 75) return "CRITICAL";
  if (score >= 50) return "HIGH";
  if (score >= 25) return "MEDIUM";
  return "LOW";
}

function selectAction(state: RiskState, signals: SignalBreak[], input: SignalInput): ActionTrigger | null {
  if (state === "LOW") return null;

  const topBreached = signals.filter((s) => s.breached).sort((a, b) => b.weight - a.weight)[0];
  if (!topBreached) return null;

  if (state === "CRITICAL") {
    return { type: "pause",          description: "Multiple critical thresholds breached — agent pausing deployment", magnitude: 100, urgent: true };
  }
  if (state === "HIGH") {
    if (topBreached.signal === "liquidityDepth")
      return { type: "rotate",        description: "Liquidity depth critical — rotating to higher-quality counterparty", magnitude: 60, urgent: true };
    if (topBreached.signal === "priceVelocity")
      return { type: "reduce_position", description: "Price velocity spike — reducing deployed position 40%", magnitude: 40, urgent: true };
    return { type: "raise_reserve",  description: "Risk elevated — raising reserve buffer from 15% to 28%", magnitude: 28, urgent: false };
  }
  // MEDIUM
  if (topBreached.signal === "streamingVelocity")
    return { type: "hedge",          description: "Streaming velocity declining — adjusting hedge ratio", magnitude: 15, urgent: false };
  return { type: "raise_reserve",    description: "Signal threshold crossed — reserve buffer raised", magnitude: 20, urgent: false };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function evaluateRisk(input: SignalInput): RiskResult {
  let totalScore = 0;

  const signals: SignalBreak[] = [
    {
      signal: "priceVelocity",
      value: Math.abs(input.priceVelocity),
      threshold: THRESHOLDS.priceVelocity.warn,
      breached: Math.abs(input.priceVelocity) > THRESHOLDS.priceVelocity.warn,
      weight: Math.abs(input.priceVelocity) > THRESHOLDS.priceVelocity.critical
        ? THRESHOLDS.priceVelocity.weight
        : Math.abs(input.priceVelocity) > THRESHOLDS.priceVelocity.warn
          ? THRESHOLDS.priceVelocity.weight * 0.5 : 0,
    },
    {
      signal: "liquidityDepth",
      value: input.liquidityDepth,
      threshold: THRESHOLDS.liquidityDepth.warn,
      breached: input.liquidityDepth < THRESHOLDS.liquidityDepth.warn,
      weight: input.liquidityDepth < THRESHOLDS.liquidityDepth.critical
        ? THRESHOLDS.liquidityDepth.weight
        : input.liquidityDepth < THRESHOLDS.liquidityDepth.warn
          ? THRESHOLDS.liquidityDepth.weight * 0.5 : 0,
    },
    {
      signal: "volumeDeviation",
      value: Math.abs(input.volumeDeviation),
      threshold: THRESHOLDS.volumeDeviation.warn,
      breached: Math.abs(input.volumeDeviation) > THRESHOLDS.volumeDeviation.warn,
      weight: Math.abs(input.volumeDeviation) > THRESHOLDS.volumeDeviation.critical
        ? THRESHOLDS.volumeDeviation.weight
        : Math.abs(input.volumeDeviation) > THRESHOLDS.volumeDeviation.warn
          ? THRESHOLDS.volumeDeviation.weight * 0.5 : 0,
    },
    {
      signal: "counterpartyScore",
      value: input.counterpartyScore,
      threshold: THRESHOLDS.counterpartyScore.warn,
      breached: input.counterpartyScore < THRESHOLDS.counterpartyScore.warn,
      weight: input.counterpartyScore < THRESHOLDS.counterpartyScore.critical
        ? THRESHOLDS.counterpartyScore.weight
        : input.counterpartyScore < THRESHOLDS.counterpartyScore.warn
          ? THRESHOLDS.counterpartyScore.weight * 0.5 : 0,
    },
    {
      signal: "streamingVelocity",
      value: input.streamingVelocity,
      threshold: THRESHOLDS.streamingVelocity.warn,
      breached: input.streamingVelocity < THRESHOLDS.streamingVelocity.warn,
      weight: input.streamingVelocity < THRESHOLDS.streamingVelocity.critical
        ? THRESHOLDS.streamingVelocity.weight
        : input.streamingVelocity < THRESHOLDS.streamingVelocity.warn
          ? THRESHOLDS.streamingVelocity.weight * 0.5 : 0,
    },
    {
      signal: "drawdown",
      value: input.drawdown,
      threshold: THRESHOLDS.drawdown.warn,
      breached: input.drawdown > THRESHOLDS.drawdown.warn,
      weight: input.drawdown > THRESHOLDS.drawdown.critical
        ? THRESHOLDS.drawdown.weight
        : input.drawdown > THRESHOLDS.drawdown.warn
          ? THRESHOLDS.drawdown.weight * 0.5 : 0,
    },
  ];

  totalScore = Math.min(100, Math.round(signals.reduce((s, sig) => s + sig.weight, 0)));
  const state = classifyState(totalScore);
  const action = selectAction(state, signals, input);

  return {
    vaultId:     input.vaultId,
    score:       totalScore,
    state,
    signals,
    action,
    evaluatedAt: new Date().toISOString(),
  };
}

// Generate realistic simulated signal input for a vault
export function simulateSignals(vaultId: string, seed?: number): SignalInput {
  const r = (min: number, max: number) => {
    const s = seed ?? Date.now();
    const x = Math.sin(s * 9301 + parseInt(vaultId) * 49297 + min) * 0.5 + 0.5;
    return Math.round((min + x * (max - min)) * 100) / 100;
  };
  return {
    vaultId,
    priceVelocity:     r(-3, 3),
    liquidityDepth:    r(55, 95),
    volumeDeviation:   r(-12, 12),
    counterpartyScore: r(65, 92),
    streamingVelocity: r(-8, 5),
    drawdown:          r(0, 6),
  };
}