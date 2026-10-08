// FILE: lib/goodTrouble/seekerAcceptanceChecklist.ts
// Physical Solana Seeker acceptance checklist for canonical Good Trouble age_eligible_21 purchase.
// Manual steps — run on-device with sandbox credentials after preflight passes.

import {
  GOOD_TROUBLE_CANONICAL_HANDOFF,
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
  GOOD_TROUBLE_CANONICAL_RESULT_FAMILY,
  GOOD_TROUBLE_EXPECTED_CALLBACK_URL,
} from "@/lib/goodTrouble/canonicalProductionConfig";
import { HOSTED_HANDOFF_TTL_MS } from "@/lib/partner/hostedHandoff/contract";

export const SEEKER_ACCEPTANCE_SECTION_IDS = [
  "DEVICE_SETUP",
  "PARTNER_HANDOFF",
  "HOLDER_AUTH",
  "DISCLOSURE",
  "FIRST_VERIFICATION",
  "RECEIPT_AND_RETURN",
  "PARTNER_VERIFY",
  "EVIDENCE_REUSE",
  "EDGE_CASES",
  "PRIVACY",
] as const;

export type SeekerAcceptanceSectionId = (typeof SEEKER_ACCEPTANCE_SECTION_IDS)[number];

export type SeekerCheckStatus = "pending" | "pass" | "fail" | "blocked" | "skipped";

export interface SeekerAcceptanceCheck {
  id: string;
  section: SeekerAcceptanceSectionId;
  label: string;
  steps: readonly string[];
  expected: string;
  status: SeekerCheckStatus;
  notes: string | null;
}

export interface SeekerAcceptanceContext {
  device: "solana_seeker";
  appId: "xyz.abraxasworld.app";
  hostedOrigin: "https://abraxasworld.xyz";
  partnerId: typeof GOOD_TROUBLE_CANONICAL_PARTNER_ID;
  policyId: typeof GOOD_TROUBLE_CANONICAL_POLICY_ID;
  resultFamily: typeof GOOD_TROUBLE_CANONICAL_RESULT_FAMILY;
  callbackUrl: typeof GOOD_TROUBLE_EXPECTED_CALLBACK_URL;
  handoffTtlMinutes: number;
  evidenceMethod: "L0_self_attested_dob";
  idvRequired: false;
}

export function buildSeekerAcceptanceContext(): SeekerAcceptanceContext {
  return {
    device: "solana_seeker",
    appId: "xyz.abraxasworld.app",
    hostedOrigin: "https://abraxasworld.xyz",
    partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
    policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
    resultFamily: GOOD_TROUBLE_CANONICAL_RESULT_FAMILY,
    callbackUrl: GOOD_TROUBLE_EXPECTED_CALLBACK_URL,
    handoffTtlMinutes: HOSTED_HANDOFF_TTL_MS / 60_000,
    evidenceMethod: "L0_self_attested_dob",
    idvRequired: false,
  };
}

/** Default checklist — all checks start pending until operator records pass/fail on device. */
export function buildSeekerAcceptanceChecklist(): SeekerAcceptanceCheck[] {
  const ctx = buildSeekerAcceptanceContext();

  return [
    {
      id: "setup_apk_installed",
      section: "DEVICE_SETUP",
      label: "Abraxas holder APK installed on Seeker",
      steps: [
        "Install signed Abraxas holder APK (xyz.abraxasworld.app).",
        "Confirm app opens to hosted Passport at abraxasworld.xyz/passport.",
      ],
      expected: "Passport loads inside Capacitor WebView without certificate errors.",
      status: "pending",
      notes: null,
    },
    {
      id: "setup_app_links",
      section: "DEVICE_SETUP",
      label: "App Links open native shell for partner continue",
      steps: [
        `Open ${ctx.hostedOrigin}${GOOD_TROUBLE_CANONICAL_HANDOFF.hosted_flow_path} from Good Trouble or adb.`,
        "Confirm Abraxas native app opens (not Chrome Custom Tab only).",
      ],
      expected: "Verified App Link or custom scheme opens holder shell with authenticated session preserved.",
      status: "pending",
      notes: "Blocked until assetlinks.json ships with release signing fingerprint.",
    },
    {
      id: "handoff_partner_initiates",
      section: "PARTNER_HANDOFF",
      label: "Partner creates hosted handoff server-side",
      steps: [
        `POST ${ctx.hostedOrigin}${GOOD_TROUBLE_CANONICAL_HANDOFF.endpoint} with abx_test_* sandbox key.`,
        "Body: { runtime: universal_https, binding_id: <age_21_retail binding> }.",
        "Redirect holder to hosted_url only — never embed API key in client.",
      ],
      expected: "Response includes verify_request and hosted Partner Flow URL; no receipt grant.",
      status: "pending",
      notes: null,
    },
    {
      id: "auth_passport_google",
      section: "HOLDER_AUTH",
      label: "Holder authenticates Passport on Seeker",
      steps: [
        "If unauthenticated, tap Continue with Google.",
        "Complete Google OAuth in Custom Tab; app resumes without permanent Redirecting… state.",
        "Passport dashboard shows authenticated holder (not anonymous).",
      ],
      expected: "Authenticated session with account_required satisfied; Passport sign-in alone is NOT age proof.",
      status: "pending",
      notes: null,
    },
    {
      id: "disclosure_partner_identity",
      section: "DISCLOSURE",
      label: "Holder sees partner identity, purpose, and disclosure",
      steps: [
        "On /partner/continue, confirm requester shows Good Trouble.",
        "Confirm purpose is 21+ purchase eligibility (not browse).",
        "Confirm copy states DOB and ID stay private; partner receives only age_eligible_21.",
      ],
      expected: "GoodTroublePrivacySequence / share step shows truthful L0 disclosure — not government-ID verification.",
      status: "pending",
      notes: null,
    },
    {
      id: "first_dob_self_attest",
      section: "FIRST_VERIFICATION",
      label: "First request: DOB self-attestation when no prior evidence",
      steps: [
        "With no prior over_21 ledger row, holder sees DOB form (not IDV/camera).",
        "Enter valid DOB ≥21; submit.",
        "Proceed through Share 21+ result with explicit consent.",
      ],
      expected: "L0 self_attested_age_band qualified; no AbraxasIdentityCapture or camera prompt on canonical path.",
      status: "pending",
      notes: "Scope item 4 (native camera IDV) applies to legacy good-trouble-retail-v1 only, not canonical L0 pilot.",
    },
    {
      id: "receipt_narrow_result",
      section: "RECEIPT_AND_RETURN",
      label: "Narrow signed receipt issued after policy pass",
      steps: [
        "After consent, holder sees DecisionReceiptCard with age_eligible_21.",
        "Confirm receipt has signature_valid and currently_valid (sandbox receipt; production_usable not required).",
        "Tap Return to Good Trouble explicitly (no auto-redirect before review).",
      ],
      expected: `Callback ${ctx.callbackUrl} receives receipt_id and gtv; no DOB, ID images, or email in receipt.`,
      status: "pending",
      notes: null,
    },
    {
      id: "partner_server_verify",
      section: "PARTNER_VERIFY",
      label: "Partner verifies receipt server-side before access",
      steps: [
        "Good Trouble backend calls GET /api/receipts/{receipt_id}/public.",
        "Run AbraxasPartnerKit.verifyForAction with sandbox binding and policyVersion pin.",
        "Record permit/deny access decision with request correlation.",
      ],
      expected: "permit only when signature_valid, approved, active, and policy/binding match.",
      status: "pending",
      notes: null,
    },
    {
      id: "reuse_second_request",
      section: "EVIDENCE_REUSE",
      label: "Second request reuses qualifying evidence",
      steps: [
        "Initiate a new hosted handoff from Good Trouble.",
        "Holder opens continue flow with same authenticated Passport.",
        "Confirm reuse prompt (Use existing 21+ result) appears when ledger row is fresh.",
        "Fresh consent still required; complete share and return.",
      ],
      expected: "Skip DOB entry; new receipt issued with evidence_reuse_accepted telemetry.",
      status: "pending",
      notes: null,
    },
    {
      id: "edge_expired_handoff",
      section: "EDGE_CASES",
      label: "Expired handoff (>15 min) fails closed",
      steps: [
        "Create handoff; wait past TTL or use expired verify_request token.",
        "Attempt to open hosted continue URL.",
      ],
      expected: "Holder sees safe recovery message; no receipt issued; partner must create new handoff.",
      status: "pending",
      notes: null,
    },
    {
      id: "edge_under_21",
      section: "EDGE_CASES",
      label: "Under-21 DOB rejected",
      steps: ["Enter DOB indicating age <21 on first verification."],
      expected: "Not eligible banner; no receipt; partner verify returns deny if attempted.",
      status: "pending",
      notes: null,
    },
    {
      id: "edge_duplicate_request",
      section: "EDGE_CASES",
      label: "Duplicate completion is idempotent",
      steps: [
        "Complete verification once; note receipt_id.",
        "Retry purchase-return or re-open completed handoff.",
      ],
      expected: "Same receipt_id returned (idempotent_replay); no duplicate grants.",
      status: "pending",
      notes: null,
    },
    {
      id: "edge_interrupted_session",
      section: "EDGE_CASES",
      label: "Interrupted session fails closed",
      steps: [
        "Start verification; force-close app mid-flow.",
        "Re-open continue URL without valid session cookie.",
      ],
      expected: "auth_required or safe recovery — holder must re-authenticate; no partial receipt.",
      status: "pending",
      notes: null,
    },
    {
      id: "edge_revoked_receipt",
      section: "EDGE_CASES",
      label: "Revoked receipt denies partner access",
      steps: [
        "After issuance, operator revokes receipt (admin path).",
        "Partner re-runs verifyForAction on same receipt_id.",
      ],
      expected: "deny with receipt_revoked / currently_valid false; fail-closed.",
      status: "pending",
      notes: "Requires operator revocation tooling in target environment.",
    },
    {
      id: "privacy_no_pii_in_receipt",
      section: "PRIVACY",
      label: "Partner receipt contains no holder PII",
      steps: [
        "Inspect public receipt JSON from partner backend.",
        "Confirm disclosed fields are narrow result only.",
      ],
      expected: "No date_of_birth, legal_name, government ID, email, or wallet in partner-visible payload.",
      status: "pending",
      notes: null,
    },
  ];
}

/** Sandbox Seeker checks must never require live credentials or production-usable receipts. */
export function seekerChecklistRequiresLiveCredentials(checks: SeekerAcceptanceCheck[]): boolean {
  const serialized = JSON.stringify(checks);
  if (serialized.includes("abx_live_")) return true;
  const lower = serialized.toLowerCase();
  if (lower.includes("production_usable not required")) return false;
  return /\bproduction[_-]?usable\b/.test(lower)
    && /\b(must have|must include|requires|required)\b/.test(lower);
}

export function seekerChecklistSummary(checks: SeekerAcceptanceCheck[]): {
  total: number;
  pending: number;
  pass: number;
  fail: number;
  blocked: number;
  complete: boolean;
} {
  const pending = checks.filter((c) => c.status === "pending").length;
  const pass = checks.filter((c) => c.status === "pass").length;
  const fail = checks.filter((c) => c.status === "fail").length;
  const blocked = checks.filter((c) => c.status === "blocked").length;
  return {
    total: checks.length,
    pending,
    pass,
    fail,
    blocked,
    complete: pending === 0 && fail === 0 && blocked === 0 && pass > 0,
  };
}
