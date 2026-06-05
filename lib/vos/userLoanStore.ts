// FILE: lib/vos/userLoanStore.ts
// Loans originated against verified+tokenized assets.
import { sessionStore } from "./sessionStore";

const KEY = "abraxas_user_loans_v1";

export type LoanState = "OPEN" | "PARTIAL" | "REPAID" | "LIQUIDATED";

export interface LoanEvent {
  state: LoanState | "OPENED" | "REPAID_PARTIAL";
  at:    string;
  note:  string;
}

export interface Loan {
  id:           string;
  assetId:      string;
  sessionId:    string;
  principalUsd: number;
  outstandingUsd: number;
  aprBps:       number;        // annualized rate in basis points
  ltvBps:       number;        // loan-to-value at origination
  collateralValueUsd: number;
  openedAt:     string;
  state:        LoanState;
  events:       LoanEvent[];
}

function isBrowser(): boolean { return typeof window !== "undefined" && typeof window.localStorage !== "undefined"; }
function readAll(): Loan[] {
  if (!isBrowser()) return [];
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as Loan[]; } catch { return []; }
}
function writeAll(loans: Loan[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(KEY, JSON.stringify(loans));
}
function genId(): string {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "LN-";
  for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

export const userLoanStore = {
  open(assetId: string, principalUsd: number, collateralValueUsd: number, aprBps = 850): Loan {
    const session = sessionStore.get();
    const now = new Date().toISOString();
    const loan: Loan = {
      id:                 genId(),
      assetId,
      sessionId:          session.id,
      principalUsd,
      outstandingUsd:     principalUsd,
      aprBps,
      ltvBps:             Math.round((principalUsd / collateralValueUsd) * 10000),
      collateralValueUsd,
      openedAt:           now,
      state:              "OPEN",
      events: [{
        state: "OPENED",
        at:    now,
        note:  `Loan originated · $${principalUsd.toLocaleString()} USDC against $${collateralValueUsd.toLocaleString()} collateral`,
      }],
    };
    const all = readAll();
    all.push(loan);
    writeAll(all);
    return loan;
  },

  repay(loanId: string, amountUsd: number): Loan | undefined {
    const session = sessionStore.get();
    const all = readAll();
    const i = all.findIndex(l => l.id === loanId && l.sessionId === session.id);
    if (i === -1) return undefined;
    const l = all[i];
    const repayAmount = Math.min(amountUsd, l.outstandingUsd);
    l.outstandingUsd -= repayAmount;
    const isFull = l.outstandingUsd <= 0.01;
    l.state = isFull ? "REPAID" : "PARTIAL";
    l.events.push({
      state: isFull ? "REPAID" : "REPAID_PARTIAL",
      at:    new Date().toISOString(),
      note:  `Repaid $${repayAmount.toLocaleString()}${isFull ? " · loan closed" : ` · $${l.outstandingUsd.toLocaleString()} remaining`}`,
    });
    all[i] = l;
    writeAll(all);
    return l;
  },

  listMine(): Loan[] {
    const s = sessionStore.get();
    return readAll().filter(l => l.sessionId === s.id)
      .sort((a, b) => b.openedAt.localeCompare(a.openedAt));
  },

  get(id: string): Loan | undefined {
    const s = sessionStore.get();
    return readAll().find(l => l.id === id && l.sessionId === s.id);
  },

  forAsset(assetId: string): Loan[] {
    const s = sessionStore.get();
    return readAll().filter(l => l.sessionId === s.id && l.assetId === assetId);
  },

  clearMine(): number {
    const s = sessionStore.get();
    const all = readAll();
    const kept = all.filter(l => l.sessionId !== s.id);
    writeAll(kept);
    return all.length - kept.length;
  },
};
