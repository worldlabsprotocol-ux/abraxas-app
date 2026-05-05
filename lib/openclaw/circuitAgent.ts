// FILE: lib/openclaw/circuitAgent.ts
// OpenClaw-pattern autonomous agent for Circuit Shield execution.
// Architecture: user signs a one-time "delegate" transaction granting
// the agent authority to execute bounded repayments (max 70% LTV, never full withdrawal).
// The agent runs in the /api/agent/tick Vercel Cron — no user interaction required.
//
// OpenClaw TEE model:
//   User → signs DelegateInstruction → grants agent a scoped session key
//   Agent → monitors Circuit state → executes repay/rotate within bounds
//   User → can revoke at any time
//
// CURRENT STATE: Delegation is simulated. Session key logic documented for
// when OpenClaw SDK is importable (no public npm package yet as of May 2026).
// Replace simulateDelegate() with real OpenClaw.createSession() call.

export type AgentAuthorization = "none" | "delegated" | "revoked";

export interface OpenClawSession {
  vaultId:        string;
  agentId:        string;
  authorization:  AgentAuthorization;
  sessionKey:     string;          // scoped signing key (simulated)
  grantedAt:      number;
  expiresAt:      number;          // 24h rolling window
  maxLtvCap:      number;          // hard cap enforced on-chain (0.70)
  actionsLog:     AgentAction[];
}

export interface AgentAction {
  id:          string;
  ts:          number;
  type:        "repay" | "rotate" | "hedge" | "monitor";
  trigger:     string;             // what caused this action
  amount?:     number;             // SOL/USDC
  txSignature?: string;
  status:      "executed" | "simulated" | "blocked";
  reason:      string;
}

// ─── Session store ─────────────────────────────────────────────────────────────
const SESSION_KEY = "abraxas_openclaw_v1";

function readSessions(): Record<string, OpenClawSession> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) ?? "{}"); } catch { return {}; }
}
function writeSessions(s: Record<string, OpenClawSession>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getSession(vaultId: string): OpenClawSession | null {
  const sessions = readSessions();
  const s = sessions[vaultId];
  if (!s) return null;
  if (Date.now() > s.expiresAt) {
    // Expired — revoke
    s.authorization = "revoked";
    writeSessions({ ...sessions, [vaultId]: s });
    return null;
  }
  return s;
}

export function delegateAgent(vaultId: string, agentId: string, maxLtvCap = 0.70): OpenClawSession {
  // In production: call OpenClaw.createSession({ vaultId, agentId, bounds: { maxLtv: maxLtvCap } })
  // This returns a scoped session key the agent uses to sign bounded transactions
  const session: OpenClawSession = {
    vaultId, agentId,
    authorization: "delegated",
    sessionKey: `sk_openclaw_${Math.random().toString(36).slice(2, 18)}`,
    grantedAt:  Date.now(),
    expiresAt:  Date.now() + 24 * 60 * 60 * 1000, // 24h
    maxLtvCap,
    actionsLog: [],
  };
  const sessions = readSessions();
  writeSessions({ ...sessions, [vaultId]: session });
  return session;
}

export function revokeSession(vaultId: string): void {
  const sessions = readSessions();
  if (sessions[vaultId]) {
    sessions[vaultId].authorization = "revoked";
    writeSessions(sessions);
  }
}

// Called by /api/agent/tick when Circuit detects a risk threshold breach.
// Executes autonomously — no user prompt needed once delegated.
export function executeAutonomousAction(params: {
  vaultId:    string;
  trigger:    string;
  actionType: AgentAction["type"];
  amount?:    number;
}): AgentAction {
  const session = getSession(params.vaultId);
  const action: AgentAction = {
    id:     `oa-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,5)}`,
    ts:     Date.now(),
    type:   params.actionType,
    trigger:params.trigger,
    amount: params.amount,
    status: "simulated",
    reason: "",
  };

  if (!session || session.authorization !== "delegated") {
    action.status = "blocked";
    action.reason = "No valid delegation — user must authorize OpenClaw session";
    return action;
  }

  // Bounds check — never exceed maxLtvCap
  if (params.amount && params.amount > session.maxLtvCap) {
    action.status = "blocked";
    action.reason = `Amount ${params.amount} exceeds maxLtvCap ${session.maxLtvCap}`;
    return action;
  }

  // Simulate execution — in production: session.sessionKey signs the tx
  action.txSignature = `oc${Math.random().toString(36).slice(2,46)}`;
  action.status      = "simulated";
  action.reason      = `Autonomous ${params.actionType} via OpenClaw session ${session.sessionKey.slice(0,12)}…`;

  // Append to session log
  session.actionsLog = [action, ...session.actionsLog].slice(0, 50);
  const sessions = readSessions();
  writeSessions({ ...sessions, [params.vaultId]: session });

  return action;
}