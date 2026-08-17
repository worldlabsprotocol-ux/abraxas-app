// FILE: scripts/trust-contract-drift/manifest.ts
// Surface index and canonical contract anchors for report-only drift checks.

export type DriftSeverity = "proven" | "review_needed";

export interface DriftRuleDefinition {
  id: string;
  surfaces: string[];
  /** Changed files matching any pattern activate this rule. */
  watchPatterns: RegExp[];
  /** Files this rule may scan once activated (subset of changed files unless canonical). */
  scanPatterns: RegExp[];
}

/** Canonical anchors — approved copy and integration contract sources. */
export const CANONICAL_ANCHORS = {
  manualProvisioning: {
    file: "lib/activation/activationCopy.ts",
    excerpt: "There is no self-serve production access.",
    lineHint: 47,
  },
  partnerOnboarding: {
    file: "docs/PARTNER_ONBOARDING_CHECKLIST.md",
    excerpt: "no self-serve partner portal",
    lineHint: 3,
  },
  receiptSecurityFields: {
    file: "lib/partner/partnerFlowOpenApiContract.ts",
    exportName: "PARTNER_FLOW_RECEIPT_SECURITY_FIELDS",
  },
  receiptDocChecks: {
    file: "lib/partner/partnerFlowIntegratorKit.ts",
    exportName: "PARTNER_FLOW_RECEIPT_CHECKS",
  },
  callbackPrivacy: {
    file: "lib/partner/partnerFlowIntegratorKit.ts",
    exportName: "PARTNER_FLOW_CALLBACK_PII_NOTE",
  },
  sandboxAvailability: {
    file: "lib/activation/activationCopy.ts",
    excerpt: "sandbox and production policies are issued manually after review",
    lineHint: 12,
  },
  activationForbiddenTerms: {
    file: "lib/activation/activationCopy.ts",
    exportName: "ACTIVATION_FORBIDDEN_TERMS",
  },
} as const;

export const DRIFT_RULES: DriftRuleDefinition[] = [
  {
    id: "provisioning.self_serve_conflict",
    surfaces: ["Partner Flow manual/operator provisioning"],
    watchPatterns: [
      /^lib\/activation\//,
      /^lib\/integrate\//,
      /^components\/home\//,
      /^app\/(design-partner|integrate)\//,
      /^docs\/PARTNER/i,
    ],
    scanPatterns: [
      /^lib\/activation\//,
      /^lib\/integrate\//,
      /^components\/home\//,
      /^app\/(design-partner|integrate)\//,
      /^docs\/PARTNER/i,
    ],
  },
  {
    id: "receipt.public_verification_drift",
    surfaces: ["Public receipt verification contract"],
    watchPatterns: [
      /^lib\/partner\/partnerFlow(OpenApiContract|IntegratorKit)\.ts$/,
      /^lib\/partner\/verifyPartnerFlowReceipt\.ts$/,
      /^app\/docs\/partner-flow\//,
      /^app\/verify\//,
    ],
    scanPatterns: [
      /^lib\/partner\/partnerFlow(OpenApiContract|IntegratorKit)\.ts$/,
      /^lib\/partner\/verifyPartnerFlowReceipt\.ts$/,
      /^app\/docs\/partner-flow\//,
    ],
  },
  {
    id: "privacy.callback_wording_review",
    surfaces: ["Partner callback/receipt payload privacy wording"],
    watchPatterns: [
      /^lib\/partner\/partnerFlowIntegratorKit\.ts$/,
      /^lib\/protocol\/partnerFlowCompatibilityManifest\.ts$/,
      /^components\/home\//,
      /^app\/docs\/partner-flow\//,
    ],
    scanPatterns: [
      /^lib\/partner\/partnerFlowIntegratorKit\.ts$/,
      /^lib\/protocol\/partnerFlowCompatibilityManifest\.ts$/,
      /^components\/home\//,
      /^app\/docs\/partner-flow\//,
    ],
  },
  {
    id: "availability.sandbox_production_wording",
    surfaces: ["Sandbox versus production availability wording"],
    watchPatterns: [
      /^lib\/activation\//,
      /^lib\/integrate\//,
      /^components\/home\//,
      /^app\/(design-partner|integrate)\//,
    ],
    scanPatterns: [
      /^lib\/activation\//,
      /^lib\/integrate\//,
      /^components\/home\//,
      /^app\/(design-partner|integrate)\//,
    ],
  },
  {
    id: "activation.risky_commercial_claim",
    surfaces: ["Approved activation/commercial claims"],
    watchPatterns: [
      /^lib\/activation\//,
      /^components\/home\//,
      /^components\/redesign\/RedesignHome\.tsx$/,
    ],
    scanPatterns: [
      /^lib\/activation\//,
      /^components\/home\//,
      /^components\/redesign\/RedesignHome\.tsx$/,
    ],
  },
];

/** Paths never scanned — avoids secrets and credentials. */
export const EXCLUDED_PATH_PATTERNS = [
  /^\.env/,
  /\.pem$/,
  /\.key$/,
  /credentials?\./i,
  /secret/i,
  /^scripts\/demo\//,
];

export const SELF_SERVE_CONFLICT_PATTERNS: RegExp[] = [
  /\bself-serve production\b/i,
  /\bautomatic api[- ]key issuance\b/i,
  /\binstant (production|api key)\b/i,
  /\bself-serve partner portal\b(?![\s\S]{0,40}\bno\b)/i,
];

export const RISKY_ACTIVATION_TERMS = [
  "kyc",
  "compliance certified",
  "audited",
  "soc ",
  "iso ",
  "thousands of",
  "n/a",
] as const;

export const ABSOLUTE_PRIVACY_PATTERNS: RegExp[] = [
  /\bzero pii\b/i,
  /\bnever (collect|store|share) (any )?(personal|private) data\b/i,
  /\bguarantee[ds]? (complete )?privacy\b/i,
  /\bno pii\b(?![\s\S]{0,60}\breceipt\b)/i,
];

export const PRODUCTION_AVAILABILITY_REVIEW_PATTERNS: RegExp[] = [
  /\bproduction (is )?available now\b/i,
  /\binstant production access\b/i,
  /\bopen production access\b/i,
];

/** Anchors that must exist and parse before the tool can run. */
export const REQUIRED_CANONICAL_ANCHOR_KEYS = [
  "manualProvisioning",
  "receiptSecurityFields",
  "receiptDocChecks",
] as const;

export type RequiredCanonicalAnchorKey = (typeof REQUIRED_CANONICAL_ANCHOR_KEYS)[number];

export function isExcludedPath(path: string): boolean {
  return EXCLUDED_PATH_PATTERNS.some((pattern) => pattern.test(path));
}

export function validateManifestConfiguration(): void {
  const ids = new Set<string>();
  for (const rule of DRIFT_RULES) {
    if (!rule.id?.trim()) {
      throw new Error("Drift rule is missing an id.");
    }
    if (ids.has(rule.id)) {
      throw new Error(`Duplicate drift rule id: ${rule.id}`);
    }
    ids.add(rule.id);
    if (rule.watchPatterns.length === 0 || rule.scanPatterns.length === 0) {
      throw new Error(`Drift rule ${rule.id} has empty watch/scan patterns.`);
    }
  }
}
