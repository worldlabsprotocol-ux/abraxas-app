// FILE: lib/release/releaseReadinessTypes.ts

export type ReleaseReadinessStatus =
  | "pass"
  | "fail"
  | "pending"
  | "human_required"
  | "blocked";

export type ReleaseReadinessSection =
  | "implemented_and_deployed"
  | "iat_evidence_recorded"
  | "human_evidence_required"
  | "security_review_pending"
  | "second_partner_pilot_pending"
  | "beta_tag_pending";

export interface ReleaseReadinessCheck {
  id: string;
  section: ReleaseReadinessSection;
  label: string;
  status: ReleaseReadinessStatus;
  evidence: string;
}

export interface ReleaseReadinessSummary {
  pass: number;
  fail: number;
  pending: number;
  human_required: number;
  blocked: number;
}

export interface ReleaseReadinessResult {
  generatedAt: string;
  baseUrl: string | null;
  checks: ReleaseReadinessCheck[];
  summary: ReleaseReadinessSummary;
  bySection: Record<ReleaseReadinessSection, ReleaseReadinessCheck[]>;
  exitCode: number;
  /** Never true unless walkthrough evidence parser validates full IAT artifacts. */
  fullIatClaimed: boolean;
  /** Never true unless independent review artifact is present. */
  securityReviewClaimed: boolean;
}

export interface ReleaseReadinessOptions {
  baseUrl: string | null;
  rootDir: string;
  walkthroughPath: string;
  securityReviewArtifactPath: string | null;
  runRegression: boolean;
  runIatAutomated: boolean;
}
