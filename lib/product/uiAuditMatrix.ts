// FILE: lib/product/uiAuditMatrix.ts
// Internal UI/UX audit matrix — drives redesign scope and regression tests.

export type ProductAudience = "public" | "holder" | "partner" | "operator";
export type AuditAction = "redesign" | "refine" | "preserve" | "consolidate";

export interface UiAuditEntry {
  route: string;
  audience: ProductAudience;
  primary_job: string;
  current_message: string;
  desired_message: string;
  current_data_source: string;
  trust_level: "canonical" | "derived" | "operator";
  ux_problems: string[];
  visual_problems: string[];
  duplication: string[];
  action: AuditAction;
}

export const UI_AUDIT_MATRIX: UiAuditEntry[] = [
  {
    route: "/",
    audience: "public",
    primary_job: "Understand category and mechanism in seconds",
    current_message: "Private eligibility protocol — prove only what a service needs",
    desired_message: "Reusable private eligibility infrastructure — verify once, signed answers, withheld identity data",
    current_data_source: "static copy",
    trust_level: "operator",
    ux_problems: ["Category buried below capability map", "Mechanism explained by copy not product UI"],
    visual_problems: ["Too many sections before core thesis"],
    duplication: ["Multiple protocol maps"],
    action: "redesign",
  },
  {
    route: "/passport",
    audience: "holder",
    primary_job: "See Passport status, evidence freshness, and authorizations",
    current_message: "KYC-style setup status",
    desired_message: "Private trust object with current/reusable evidence and recent authorizations",
    current_data_source: "passport session + verification APIs",
    trust_level: "canonical",
    ux_problems: ["Trust language too technical", "Authorization privacy pattern inconsistent"],
    visual_problems: ["Status card lacks evidence hierarchy"],
    duplication: [],
    action: "redesign",
  },
  {
    route: "/partner/continue",
    audience: "holder",
    primary_job: "Authorize a partner request with clear requested/shared/withheld",
    current_message: "Partner consent selective disclosure",
    desired_message: "WHO/WHAT/WHY with privacy contract before authorize",
    current_data_source: "verification-requests API",
    trust_level: "canonical",
    ux_problems: ["Shared/withheld not using standard primitive"],
    visual_problems: ["CTA copy generic"],
    duplication: [],
    action: "redesign",
  },
  {
    route: "/partner",
    audience: "partner",
    primary_job: "Integrate, test, pilot, and reach production",
    current_message: "Wizard with many advanced panels",
    desired_message: "Application overview + journey from real state + policy as business question",
    current_data_source: "launchpad APIs",
    trust_level: "canonical",
    ux_problems: ["No overview hierarchy", "Sandbox/production easy to confuse"],
    visual_problems: ["Dense wizard without next action"],
    duplication: ["Health panels overlap readiness"],
    action: "redesign",
  },
  {
    route: "/developers/integration-studio",
    audience: "partner",
    primary_job: "Describe requirement and generate smallest policy integration",
    current_message: "Create sandbox integration",
    desired_message: "What do you need to verify? Privacy contract before code",
    current_data_source: "policy packs + launchpad",
    trust_level: "derived",
    ux_problems: ["Privacy contract not first-class"],
    visual_problems: [],
    duplication: [],
    action: "refine",
  },
  {
    route: "/admin/value-evidence",
    audience: "operator",
    primary_job: "Portfolio diligence without raw JSON",
    current_message: "JSON dump",
    desired_message: "Executive operating interface with provenance",
    current_data_source: "value-evidence + design partner APIs",
    trust_level: "canonical",
    ux_problems: ["Fundraising evidence unreadable", "No funnel/portfolio cards"],
    visual_problems: ["Debug-first layout"],
    duplication: [],
    action: "redesign",
  },
];

export function routesForAudience(audience: ProductAudience): string[] {
  return UI_AUDIT_MATRIX.filter((e) => e.audience === audience).map((e) => e.route);
}

export function routesMarked(action: AuditAction): string[] {
  return UI_AUDIT_MATRIX.filter((e) => e.action === action).map((e) => e.route);
}
