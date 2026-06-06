// FILE: lib/vos/wyomingRequestStore.ts
// Local store for Wyoming LLC tokenization requests.
// Mirrors what is persisted in Supabase so the dashboard can display
// all submissions without a SELECT RLS policy on the remote table.

const KEY = "abraxas_wyoming_requests_v1";

export type WyomingLifecycleState =
  | "SUBMITTED"
  | "IDENTITY_REVIEW"
  | "OWNERSHIP_REVIEW"
  | "LEGAL_REVIEW"
  | "DUE_DILIGENCE"
  | "RISK_SCORING"
  | "APPROVAL_COMMITTEE"
  | "TOKENIZATION_AUTH"
  | "MINTED"
  | "MARKETPLACE_LIVE"
  | "REJECTED";

export interface WyomingTimelineEntry {
  state:     WyomingLifecycleState;
  at:        string;
  actor:     string;
  note:      string;
}

export interface WyomingRequest {
  id:                  string;
  companyName:         string;
  estimatedValuation:  string;
  walletAddress:       string;
  description:         string;
  jurisdiction:        string;
  tier:                "starter" | "growth" | "enterprise";
  assetId:             string;
  supabaseId?:         string;
  lifecycleState:      WyomingLifecycleState;
  timeline:            WyomingTimelineEntry[];
  createdAt:           string;
  viewed:              boolean;
}

export interface CreateWyomingRequestInput {
  companyName:         string;
  estimatedValuation:  string;
  walletAddress?:      string;
  description?:        string;
  jurisdiction?:       string;
  tier?:               WyomingRequest["tier"];
  assetId:             string;
  supabaseId?:         string;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readAll(): WyomingRequest[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as WyomingRequest[]) : [];
  } catch {
    return [];
  }
}

function writeAll(reqs: WyomingRequest[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(KEY, JSON.stringify(reqs));
}

function genId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return (
    "WY-" +
    Array.from({ length: 6 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("")
  );
}

export const wyomingRequestStore = {
  create(input: CreateWyomingRequestInput): WyomingRequest {
    const now = new Date().toISOString();
    const req: WyomingRequest = {
      id:                 genId(),
      companyName:        input.companyName,
      estimatedValuation: input.estimatedValuation,
      walletAddress:      input.walletAddress ?? "",
      description:        input.description ?? "",
      jurisdiction:       input.jurisdiction ?? "Wyoming, USA",
      tier:               input.tier ?? "starter",
      assetId:            input.assetId,
      supabaseId:         input.supabaseId,
      lifecycleState:     "SUBMITTED",
      timeline: [
        {
          state:  "SUBMITTED",
          at:     now,
          actor:  "user",
          note:   "Wyoming LLC tokenization request submitted.",
        },
      ],
      createdAt: now,
      viewed:    false,
    };
    writeAll([req, ...readAll()]);
    return req;
  },

  /** All requests — used for admin/dashboard view. */
  listAll(): WyomingRequest[] {
    return readAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  get(id: string): WyomingRequest | undefined {
    return readAll().find(r => r.id === id);
  },

  /** Link the Supabase row ID once the remote insert succeeds. */
  linkSupabaseId(localId: string, supabaseId: string): void {
    writeAll(
      readAll().map(r => (r.id === localId ? { ...r, supabaseId } : r))
    );
  },

  advanceLifecycle(
    id: string,
    state: WyomingLifecycleState,
    actor: string,
    note: string
  ): WyomingRequest | undefined {
    const all = readAll();
    const idx = all.findIndex(r => r.id === id);
    if (idx === -1) return undefined;
    const entry: WyomingTimelineEntry = {
      state,
      at:    new Date().toISOString(),
      actor,
      note,
    };
    all[idx] = {
      ...all[idx],
      lifecycleState: state,
      timeline:       [...all[idx].timeline, entry],
    };
    writeAll(all);
    return all[idx];
  },

  markViewed(id: string): void {
    writeAll(readAll().map(r => (r.id === id ? { ...r, viewed: true } : r)));
  },

  markAllViewed(): void {
    writeAll(readAll().map(r => ({ ...r, viewed: true })));
  },

  getUnreadCount(): number {
    return readAll().filter(r => !r.viewed).length;
  },

  clear(): void {
    if (isBrowser()) localStorage.removeItem(KEY);
  },
};
