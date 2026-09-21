// FILE: lib/partner/policyReleaseCandidate/spec.ts

import {
  POLICY_RC_ACTION_LABELS,
  POLICY_RC_CHECKLIST,
  POLICY_RC_COMPATIBILITY_LABELS,
  POLICY_RC_DISCLOSURE_LABELS,
  POLICY_RC_ENVIRONMENT_LABELS,
  POLICY_RC_METHOD_LABELS,
  POLICY_RC_NOTICE,
  POLICY_RC_PRIVATE_LABELS,
  POLICY_RC_RECEIVE_LABELS,
  POLICY_RC_RESULT_LABELS,
} from "./contract";
import type { SanitizedReleaseShape } from "./sanitize";

export function buildReleaseSpecification(shape: SanitizedReleaseShape): {
  notice: string;
  copyable: string;
  checklist: readonly string[];
} {
  const withheld = shape.withheld.map((id) => POLICY_RC_PRIVATE_LABELS[id]).join("; ");
  const shared = shape.shared_result.map((id) => POLICY_RC_RECEIVE_LABELS[id]).join("; ");
  const copyable = [
    "Policy release candidate specification",
    POLICY_RC_NOTICE,
    `Label: ${shape.policy_label}`,
    `Action: ${POLICY_RC_ACTION_LABELS[shape.action]}`,
    `Result: ${POLICY_RC_RESULT_LABELS[shape.result_category]}`,
    `Partner receives: ${shared}`,
    `Stays private: ${withheld}`,
    `Method: ${POLICY_RC_METHOD_LABELS[shape.method_category]}`,
    `Minimum assurance: ${shape.minimum_assurance}`,
    `Environment intent: ${POLICY_RC_ENVIRONMENT_LABELS[shape.environment]}`,
    `Action scopes: ${shape.action_scopes.join(", ")}`,
    `Disclosure: ${POLICY_RC_DISCLOSURE_LABELS[shape.disclosure_profile]}`,
    `Compatibility: ${POLICY_RC_COMPATIBILITY_LABELS[shape.compatibility_impact]}`,
    "Live policy: no. Catalog publish: no. Compatibility-edge write: no.",
    "A separately reviewed source-code PR is required to publish any policy.",
  ].join("\n");
  return { notice: POLICY_RC_NOTICE, copyable, checklist: POLICY_RC_CHECKLIST };
}
