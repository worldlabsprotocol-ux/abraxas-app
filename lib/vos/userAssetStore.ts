// FILE: lib/vos/userAssetStore.ts
// User-submitted asset registry. Append-only event log per asset.
// Each state transition is immutable — exactly how a real protocol behaves.
// Free: localStorage. Backend-ready: drop in Supabase later.

import { sessionStore } from "./sessionStore";

const KEY = "abraxas_user_assets_v1";

export type LifecycleState =
  | "DRAFT"
  | "SUBMITTED"
  | "IN_REVIEW"
  | "VERIFIED"
  | "COMPLETED"
  | "REJECTED";

export interface LifecycleEvent {
  state:     LifecycleState;
  at:        string;     // ISO timestamp
  actor:     string;     // who triggered it (system, user, verifier)
  note?:     string;
}

export interface UserAsset {
  id:             string;
  sessionId:      string;
  assetType:      string;            // e.g. "real_estate", "minerals"
  estimatedValue: string;            // user-entered, string for flexibility
  jurisdiction:   string;
  hasLiens:       string;
  hasAppraisal:   string;
  hasCustody:     string;
  createdAt:      string;
  state:          LifecycleState;    // current state
  timeline:       LifecycleEvent[];  // append-only log
}

export interface UserAssetDraft {
  assetType:      string;
  estimatedValue: string;
  jurisdiction:   string;
  hasLiens:       string;
  hasAppraisal:   string;
  hasCustody:     string;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readAll(): UserAsset[] {
  if (!isBrowser()) return [];
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as UserAsset[]; } catch { return []; }
}

function writeAll(assets: UserAsset[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(KEY, JSON.stringify(assets));
}

function genAssetId(): string {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing chars
  let s = "USR-";
  for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

export const userAssetStore = {
  // Create a new asset from onboarding form, default state = SUBMITTED
  create(draft: UserAssetDraft): UserAsset {
    const session = sessionStore.get();
    const now = new Date().toISOString();
    const asset: UserAsset = {
      id:             genAssetId(),
      sessionId:      session.id,
      ...draft,
      createdAt:      now,
      state:          "SUBMITTED",
      timeline: [
        { state: "DRAFT",     at: now, actor: "user",   note: "Asset draft created" },
        { state: "SUBMITTED", at: now, actor: "user",   note: "Documentation request submitted" },
      ],
    };
    const all = readAll();
    all.push(asset);
    writeAll(all);
    return asset;
  },

  // List assets for current session only (anonymous user isolation)
  listMine(): UserAsset[] {
    const session = sessionStore.get();
    return readAll()
      .filter(a => a.sessionId === session.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  // Get any asset by id (current session only — privacy)
  get(id: string): UserAsset | undefined {
    const session = sessionStore.get();
    return readAll().find(a => a.id === id && a.sessionId === session.id);
  },

  // Advance lifecycle (append-only — never mutate prior state)
  advance(id: string, state: LifecycleState, actor: string, note?: string): UserAsset | undefined {
    const session = sessionStore.get();
    const all = readAll();
    const idx = all.findIndex(a => a.id === id && a.sessionId === session.id);
    if (idx === -1) return undefined;
    const asset = all[idx];
    const ev: LifecycleEvent = { state, at: new Date().toISOString(), actor, note };
    asset.timeline = [...asset.timeline, ev];
    asset.state    = state;
    all[idx] = asset;
    writeAll(all);
    return asset;
  },

  // Simulated demo progression — moves an asset forward one state at a time
  simulateAdvance(id: string): UserAsset | undefined {
    const a = this.get(id);
    if (!a) return undefined;
    const next: Record<LifecycleState, LifecycleState | null> = {
      DRAFT:      "SUBMITTED",
      SUBMITTED:  "IN_REVIEW",
      IN_REVIEW:  "VERIFIED",
      VERIFIED:   "COMPLETED",
      COMPLETED:  null,
      REJECTED:   null,
    };
    const n = next[a.state];
    if (!n) return a;
    const notes: Record<LifecycleState, string> = {
      DRAFT:     "Asset drafted",
      SUBMITTED: "Submitted for documentation review",
      IN_REVIEW: "Documentation review in progress · legal + custody verification",
      VERIFIED:  "AAS-1 attestation issued · ready for on-chain anchor",
      COMPLETED: "Anchored on-chain · collateral eligible",
      REJECTED:  "Review failed",
    };
    return this.advance(id, n, "verifier", notes[n]);
  },

  // Stats for dashboard
  stats() {
    const mine = this.listMine();
    const byState: Record<LifecycleState, number> = {
      DRAFT: 0, SUBMITTED: 0, IN_REVIEW: 0, VERIFIED: 0, COMPLETED: 0, REJECTED: 0,
    };
    mine.forEach(a => { byState[a.state]++; });
    return { total: mine.length, byState };
  },

  // Delete an asset (current session only)
  remove(id: string): boolean {
    const session = sessionStore.get();
    const all = readAll();
    const filtered = all.filter(a => !(a.id === id && a.sessionId === session.id));
    if (filtered.length === all.length) return false;
    writeAll(filtered);
    return true;
  },

  // Wipe all assets for current session
  clearMine(): number {
    const session = sessionStore.get();
    const all = readAll();
    const kept = all.filter(a => a.sessionId !== session.id);
    const removed = all.length - kept.length;
    writeAll(kept);
    return removed;
  },
};

// Asset class labels for display
export const ASSET_LABELS: Record<string, string> = {
  real_estate: "Real Estate",
  minerals:    "Mineral Rights",
  energy:      "Energy Reserves",
  metals:      "Precious Metals",
  land:        "Land & Timber",
  other:       "Other Asset",
};

// State display
export const STATE_LABELS: Record<LifecycleState, { label: string; color: string }> = {
  DRAFT:     { label: "DRAFT",     color: "#94A3B8" },
  SUBMITTED: { label: "SUBMITTED", color: "#3B82F6" },
  IN_REVIEW: { label: "IN REVIEW", color: "#F59E0B" },
  VERIFIED:  { label: "VERIFIED",  color: "#10B981" },
  COMPLETED: { label: "ON-CHAIN",  color: "#10B981" },
  REJECTED:  { label: "REJECTED",  color: "#EF4444" },
};
