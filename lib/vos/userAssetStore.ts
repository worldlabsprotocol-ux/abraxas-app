// FILE: lib/vos/userAssetStore.ts
// Full 10-stage Asset Lifecycle Engine. Append-only event log.
// Backend-ready: same interface, swap localStorage → Supabase.

import { sessionStore } from "./sessionStore";
const KEY = "abraxas_user_assets_v2";

// Full institutional lifecycle — 10 stages
export type LifecycleState =
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

export interface LifecycleEvent {
  state:     LifecycleState;
  at:        string;
  actor:     "user" | "system" | "verifier" | "attester" | "committee" | "ai_engine";
  note?:     string;
  progress?: number; // 0-100
}

export interface AssetScores {
  verification:   number; // 0-100
  liquidity:      number; // 0-100
  fraud:          number; // 0-100 (lower = higher risk)
  marketability:  number; // 0-100
  overall:        number; // composite
}

export interface UserAsset {
  id:             string;
  sessionId:      string;
  assetType:      string;
  estimatedValue: string;
  jurisdiction:   string;
  hasLiens:       string;
  hasAppraisal:   string;
  hasCustody:     string;
  createdAt:      string;
  state:          LifecycleState;
  timeline:       LifecycleEvent[];
  scores:         AssetScores;
  assignedVerifier?: string;
  aiNotes?:       string;
  progressPct:    number; // overall 0-100
}

export interface UserAssetDraft {
  assetType:      string;
  estimatedValue: string;
  jurisdiction:   string;
  hasLiens:       string;
  hasAppraisal:   string;
  hasCustody:     string;
}

// Stage metadata
export const STAGE_META: Record<LifecycleState, {
  label: string; shortLabel: string; color: string;
  verifier: string; description: string; progressPct: number;
  requiredDocs: string[]; aiNote: string;
}> = {
  SUBMITTED:          { label:"Asset Submitted",          shortLabel:"Submitted",      color:"#94A3B8", verifier:"Intake System",         description:"Submission received and queued for review",                  progressPct:5,  requiredDocs:["Asset overview","Estimated value","Jurisdiction"], aiNote:"Asset intake complete. Initial classification confirmed." },
  IDENTITY_REVIEW:    { label:"Identity Verification",    shortLabel:"Identity",       color:"#3B82F6", verifier:"KYC/AML Analyst",        description:"Verifying submitter identity and AML compliance",             progressPct:15, requiredDocs:["Government-issued ID","Proof of address","Entity formation docs"], aiNote:"KYC/AML screening initiated. Submitter identity cross-referenced against OFAC." },
  OWNERSHIP_REVIEW:   { label:"Ownership Verification",   shortLabel:"Ownership",      color:"#8B5CF6", verifier:"Title Analyst",          description:"Confirming legal ownership and title chain",                  progressPct:28, requiredDocs:["Deed","Title insurance","Corporate ownership records","LLC docs"], aiNote:"Title chain analysis in progress. Preliminary ownership confirmed." },
  LEGAL_REVIEW:       { label:"Legal Structure Review",   shortLabel:"Legal",          color:"#6366F1", verifier:"Legal Counsel",          description:"Reviewing entity structure, encumbrances, and compliance",    progressPct:42, requiredDocs:["Entity structure docs","Existing liens","Encumbrance disclosures","Compliance certification"], aiNote:"Legal structure assessment complete. Lien search results pending." },
  DUE_DILIGENCE:      { label:"Asset Due Diligence",      shortLabel:"Due Diligence",  color:"#F59E0B", verifier:"Asset Analyst",          description:"Physical inspection, appraisal, and third-party valuation",   progressPct:55, requiredDocs:["Independent appraisal","Inspection report","Third-party valuation","Insurance certificate"], aiNote:"Appraisal cross-referenced against market comparables. Valuation confidence: high." },
  RISK_SCORING:       { label:"AI Risk Scoring",          shortLabel:"Risk Score",     color:"#EF4444", verifier:"Abraxas AI Engine",       description:"Automated risk analysis and score generation",                progressPct:68, requiredDocs:[], aiNote:"Running multi-variable risk model. Computing Verification, Liquidity, Fraud, and Marketability scores." },
  APPROVAL_COMMITTEE: { label:"Approval Committee",       shortLabel:"Committee",      color:"#F97316", verifier:"Verification Committee",  description:"Final review by multi-sig approval committee",                progressPct:80, requiredDocs:["Complete verification package","Risk summary","Attestation bundle"], aiNote:"Committee review initiated. Quorum required: 3/5. Current votes: 0/5." },
  TOKENIZATION_AUTH:  { label:"Tokenization Authorized",  shortLabel:"Auth'd",         color:"#10B981", verifier:"Protocol Authority",      description:"Asset approved for on-chain tokenization",                    progressPct:90, requiredDocs:["Signed authorization","Wallet verification","Custody agreement"], aiNote:"Authorization issued. Token parameters computed. Mint tx construction in progress." },
  MINTED:             { label:"Asset Minted",             shortLabel:"Minted",         color:"#20DCA5", verifier:"Sui Network",          description:"Passport anchored on Sui devnet",        progressPct:97, requiredDocs:[], aiNote:"Mint confirmed on-chain. AAS-1 attestation anchored on Sui." },
  MARKETPLACE_LIVE:   { label:"Marketplace Live",         shortLabel:"Live",           color:"#10B981", verifier:"Abraxas Protocol",        description:"Collateral eligible. Marketplace and lending active.",        progressPct:100, requiredDocs:[], aiNote:"Asset fully operational. Collateralization enabled. Lending facilities available." },
  REJECTED:           { label:"Verification Failed",      shortLabel:"Rejected",       color:"#EF4444", verifier:"Review Board",            description:"Asset did not meet verification requirements",                progressPct:0,  requiredDocs:[], aiNote:"Review complete. See rejection notes for remediation guidance." },
};

// Ordered pipeline (not including REJECTED)
export const PIPELINE_STAGES: LifecycleState[] = [
  "SUBMITTED","IDENTITY_REVIEW","OWNERSHIP_REVIEW","LEGAL_REVIEW",
  "DUE_DILIGENCE","RISK_SCORING","APPROVAL_COMMITTEE",
  "TOKENIZATION_AUTH","MINTED","MARKETPLACE_LIVE",
];

const VERIFIERS = ["Dr. M. Chen","J. Harmon, Esq.","T. Vasquez CPA","Dr. A. Singh",
                   "K. Oduya, Title","L. Freeman, RE","M. Patel, AML","R. Okafor, JD"];
function randomVerifier() { return VERIFIERS[Math.floor(Math.random() * VERIFIERS.length)]; }

function calcScores(draft: UserAssetDraft): AssetScores {
  let v = 55, liq = 50, fraud = 75, mkt = 55;
  if (draft.hasAppraisal === "recent") v += 18;
  else if (draft.hasAppraisal === "old")   v += 8;
  if (draft.hasLiens === "no")    { v += 12; fraud += 10; }
  if (draft.hasCustody === "yes") { v += 8;  fraud += 8; }
  const stateScore: Record<string, number> = {
    georgia: 8, texas: 10, wyoming: 12, florida: 7, california: 6,
  };
  const jur = draft.jurisdiction?.toLowerCase() || "";
  for (const [k, val] of Object.entries(stateScore)) {
    if (jur.includes(k)) { v += val; liq += 5; break; }
  }
  if (draft.assetType === "metals")     { v += 10; fraud += 8; liq += 15; }
  if (draft.assetType === "real_estate") liq += 8;
  if (draft.assetType === "minerals")   { liq += 12; mkt += 10; }
  v   = Math.min(v, 99); liq = Math.min(liq, 99);
  fraud = Math.min(fraud, 99); mkt = Math.min(mkt, 99);
  return { verification: v, liquidity: liq, fraud, marketability: mkt,
           overall: Math.round((v + liq + fraud + mkt) / 4) };
}

function isBrowser() { return typeof window !== "undefined" && typeof window.localStorage !== "undefined"; }
function readAll(): UserAsset[] {
  if (!isBrowser()) return [];
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as UserAsset[]; } catch { return []; }
}
function writeAll(a: UserAsset[]) { if (isBrowser()) localStorage.setItem(KEY, JSON.stringify(a)); }
function genId() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return "USR-" + Array.from({length:6}, () => a[Math.floor(Math.random()*a.length)]).join("");
}

export const userAssetStore = {
  create(draft: UserAssetDraft): UserAsset {
    const session = sessionStore.get();
    const now = new Date().toISOString();
    const scores = calcScores(draft);
    const asset: UserAsset = {
      id: genId(), sessionId: session.id,
      ...draft, createdAt: now, state: "SUBMITTED",
      scores, progressPct: 5,
      assignedVerifier: randomVerifier(),
      aiNotes: STAGE_META.SUBMITTED.aiNote,
      timeline: [
        { state: "SUBMITTED", at: now, actor: "user", note: "Documentation request submitted", progress: 5 },
      ],
    };
    const all = readAll(); all.push(asset); writeAll(all);
    return asset;
  },

  listMine(): UserAsset[] {
    const s = sessionStore.get();
    return readAll().filter(a => a.sessionId === s.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  get(id: string): UserAsset | undefined {
    const s = sessionStore.get();
    return readAll().find(a => a.id === id && a.sessionId === s.id);
  },

  advance(id: string, toState: LifecycleState, actor: UserAsset["timeline"][0]["actor"], note?: string): UserAsset | undefined {
    const s = sessionStore.get();
    const all = readAll();
    const i = all.findIndex(a => a.id === id && a.sessionId === s.id);
    if (i === -1) return undefined;
    const meta = STAGE_META[toState];
    all[i] = {
      ...all[i],
      state: toState,
      progressPct: meta.progressPct,
      assignedVerifier: meta.verifier,
      aiNotes: meta.aiNote,
      timeline: [...all[i].timeline, {
        state: toState, at: new Date().toISOString(), actor,
        note: note ?? meta.description, progress: meta.progressPct,
      }],
    };
    writeAll(all);
    return all[i];
  },

  simulateAdvance(id: string): UserAsset | undefined {
    const a = this.get(id);
    if (!a) return undefined;
    const i = PIPELINE_STAGES.indexOf(a.state);
    if (i === -1 || i >= PIPELINE_STAGES.length - 1) return a;
    const next = PIPELINE_STAGES[i + 1];
    const actors: UserAsset["timeline"][0]["actor"][] = ["system","verifier","ai_engine","committee","verifier","ai_engine","committee","system","system","system"];
    return this.advance(id, next, actors[i + 1] ?? "system");
  },

  stats() {
    const mine = this.listMine();
    const byState: Partial<Record<LifecycleState, number>> = {};
    mine.forEach(a => { byState[a.state] = (byState[a.state] ?? 0) + 1; });
    return { total: mine.length, byState };
  },

  remove(id: string): boolean {
    const s = sessionStore.get();
    const all = readAll();
    const f = all.filter(a => !(a.id === id && a.sessionId === s.id));
    if (f.length === all.length) return false;
    writeAll(f); return true;
  },

  clearMine(): number {
    const s = sessionStore.get();
    const all = readAll();
    const kept = all.filter(a => a.sessionId !== s.id);
    writeAll(kept);
    return all.length - kept.length;
  },
};

export const ASSET_LABELS: Record<string, string> = {
  real_estate: "Real Estate",
  minerals:    "Mineral Rights",
  energy:      "Energy Reserves",
  metals:      "Precious Metals",
  land:        "Land & Timber",
  other:       "Other Asset",
  wyoming_llc: "Wyoming LLC",
};

export const STATE_COLORS: Record<LifecycleState, string> = Object.fromEntries(
  Object.entries(STAGE_META).map(([k,v]) => [k, v.color])
) as Record<LifecycleState, string>;
