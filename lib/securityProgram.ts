// FILE: lib/securityProgram.ts
// Audit tracker + bug bounty program — honest in-progress states.

export type AuditStatus = "complete" | "in_progress" | "scheduled" | "planned";

export interface AuditItem {
  id: string;
  name: string;
  scope: string;
  status: AuditStatus;
  statusLabel: string;
  firm?: string;
  started?: string;
  expected?: string;
  reportHref?: string;
  notes: string;
}

export const AUDIT_TRACKER: AuditItem[] = [
  {
    id: "sui-passport",
    name: "Sui Passport Move module",
    scope: "On-chain stamp issuance, object ownership, revocation hooks",
    status: "in_progress",
    statusLabel: "In progress",
    notes: "Required before external CPI integrations and mainnet Passport deployment. Results will publish here when complete.",
  },
  {
    id: "credential-api",
    name: "Credential verification API",
    scope: "POST /api/credentials/verify, JWT validation, presentation logging, RLS",
    status: "in_progress",
    statusLabel: "In progress",
    notes: "Formal review of relying-party endpoint security and rate limiting before first external production gate.",
  },
  {
    id: "zklogin-prover",
    name: "zkLogin prover proxy",
    scope: "/api/zklogin/prover, salt handling, session binding",
    status: "scheduled",
    statusLabel: "Scheduled",
    notes: "Queued after Passport module review.",
  },
  {
    id: "payment-verify",
    name: "Cielo payment verification",
    scope: "On-chain USDC matching, memo validation, booking state machine",
    status: "planned",
    statusLabel: "Planned",
    notes: "Aligns with asset-specific escrow migration roadmap.",
  },
];

export const AUDIT_STATUS_COLOR: Record<AuditStatus, string> = {
  complete: "#10B981",
  in_progress: "#F59E0B",
  scheduled: "#3B82F6",
  planned: "#6B7280",
};

export const BUG_BOUNTY = {
  phase: "pre_registration" as const,
  phaseLabel: "Pre-registration open · full launch post-audit",
  reportEmail: "security@worldlabsprotocol.com",
  reportSubject: "[Abraxas Bug Bounty] ",
  maxRewardNote: "Tiered rewards published at formal launch. Critical findings reported in good faith during pre-registration will be honored retroactively.",
  inScope: [
    "POST /api/credentials/verify — JWT forgery, claim injection, replay",
    "GET /api/trust/status — unauthorized data exposure",
    "GET /api/verify/registry — registry poisoning (write paths require admin auth)",
    "POST /api/credentials/issue — unauthorized issuance",
    "/api/idv/* — session hijacking, webhook forgery",
    "/api/intent/* — challenge replay, signature bypass",
    "/api/zklogin/prover — salt leakage, prover abuse",
    "Cielo payment verification — amount/memo mismatch acceptance",
    "Supabase RLS bypass on identity or credential tables",
  ],
  outOfScope: [
    "Social engineering of team members or asset owners",
    "DDoS, rate-limit exhaustion without demonstrated impact",
    "Third-party infrastructure (Veriff, Google OAuth, Vercel platform)",
    "Issues in deprecated / archived routes not linked from production nav",
    "Self-XSS, missing security headers without exploitable impact",
  ],
  severityTiers: [
    { level: "Critical", examples: "Unauthorized credential issuance, RLS bypass exposing PII, key exfiltration", reward: "TBD at launch — highest tier" },
    { level: "High", examples: "JWT validation bypass, payment verification accept wrong amount", reward: "TBD at launch" },
    { level: "Medium", examples: "IDOR on non-PII resources, intent replay within window", reward: "TBD at launch" },
    { level: "Low", examples: "Information disclosure without PII, non-exploitable misconfig", reward: "TBD at launch" },
  ],
  safeHarbor:
    "Good-faith security research on in-scope endpoints is welcome during pre-registration. Do not access data you do not own, exfiltrate user PII, or disrupt production bookings.",
  launchCriteria: [
    "Sui Passport Move module audit complete",
    "Credential API formal review complete",
    "Dedicated security@ inbox + response SLA documented",
    "Public rewards table published",
  ],
} as const;

export const SECURITY_PROGRAM_LINKS = [
  { label: "Bug bounty program", href: "/security/bounty" },
  { label: "Public verifier", href: "/verify" },
  { label: "Credential public key", href: "/api/credentials/public-key" },
  { label: "Privacy policy", href: "/legal/privacy" },
] as const;
