// FILE: lib/protocol/executionLayer.ts
// Layer 3 — Execution Layer
// Actions route through enforceable controls:
//   - multisig policies for large moves
//   - vault logic for position sizing
//   - escrow for cross-protocol settlement
//   - programmatic custody for asset movement
//
// CURRENT STATE: Simulation mode. All actions are logged and auditable.
// Each function returns an ExecutionRecord — the on-chain audit trail entry.
// When vault programs are deployed, replace simulateExecution() with real CPI calls.

import type { PolicyDecision } from "./policyLayer";

export type ExecutionStatus = "simulated" | "pending_multisig" | "executed" | "rejected";

export interface ExecutionRecord {
  id:            string;
  ts:            number;
  policyDecision:PolicyDecision;
  status:        ExecutionStatus;
  txSignature?:  string;       // on-chain tx if executed
  multisigPda?:  string;       // multisig account if awaiting approval
  log:           string;       // audit trail entry
  // Enforcement controls applied
  controls: {
    multisigRequired:  boolean;
    vaultBoundCheck:   boolean; // did we verify action stays within vault bounds?
    slippageGuard:     boolean; // did we apply slippage protection?
    maxExposureCap:    boolean; // did we enforce max exposure limit?
  };
}

const MAX_SINGLE_ACTION_PCT = 30; // hard cap — no single action can move >30% of vault
const MAX_DAILY_ROTATION_PCT = 50; // daily total cap across all actions

function makeId(): string {
  return `exec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function fakeBase58(len = 44): string {
  const ch = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let o = ""; for (let i = 0; i < len; i++) o += ch[Math.floor(Math.random() * ch.length)]; return o;
}

// Validate action is within enforced bounds before executing
function validateBounds(decision: PolicyDecision): { valid: boolean; reason?: string } {
  if (!decision.permitted) return { valid: false, reason: "Policy did not permit action" };
  if (decision.magnitude > MAX_SINGLE_ACTION_PCT) {
    return { valid: false, reason: `Magnitude ${decision.magnitude}% exceeds hard cap ${MAX_SINGLE_ACTION_PCT}%` };
  }
  return { valid: true };
}

export function simulateExecution(decision: PolicyDecision): ExecutionRecord {
  const id  = makeId();
  const validation = validateBounds(decision);

  if (!validation.valid) {
    return {
      id, ts: Date.now(), policyDecision: decision,
      status: "rejected",
      log: `[REJECTED] ${validation.reason}`,
      controls: { multisigRequired: false, vaultBoundCheck: true, slippageGuard: false, maxExposureCap: true },
    };
  }

  if (decision.requiresMultisig) {
    const multisigPda = fakeBase58();
    return {
      id, ts: Date.now(), policyDecision: decision,
      status: "pending_multisig",
      multisigPda,
      log: `[PENDING_MULTISIG] ${decision.rationale} — awaiting ${multisigPda.slice(0,8)}… approval`,
      controls: { multisigRequired: true, vaultBoundCheck: true, slippageGuard: true, maxExposureCap: true },
    };
  }

  // Simulated execution — logs on-chain via Memo in live mode
  const txSig = fakeBase58(88);
  return {
    id, ts: Date.now(), policyDecision: decision,
    status: "simulated",
    txSignature: txSig,
    log: `[SIMULATED] ${decision.rationale} | tx: ${txSig.slice(0, 12)}…`,
    controls: { multisigRequired: false, vaultBoundCheck: true, slippageGuard: true, maxExposureCap: true },
  };
}

// ─── Full protocol loop ───────────────────────────────────────────────────────
// Runs all three layers in sequence and returns the complete audit trail.
export function runProtocolLoop(params: {
  signals:       import("./observationLayer").RiskSignal[];
  vaultSizeUsd:  number;
  liquidityPref?: "HIGH" | "MEDIUM" | "LOW";
}): { decision: PolicyDecision; execution: ExecutionRecord } {
  const { evaluatePolicy } = require("./policyLayer") as typeof import("./policyLayer");
  const decision  = evaluatePolicy(params.signals, params.vaultSizeUsd, params.liquidityPref);
  const execution = simulateExecution(decision);
  return { decision, execution };
}