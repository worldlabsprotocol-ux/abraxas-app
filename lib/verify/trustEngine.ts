// FILE: lib/verify/trustEngine.ts
// Trust Engine — unified boundary for turning evidence into trust decisions.

export { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
export { loadPolicyTrustContext } from "@/lib/trust/loadPolicyTrustContext";
export { resolveClaimStatusAtRead } from "@/lib/trust/credentialStatusRegistry";
export { resolveReceiptValidity } from "@/lib/decisionReceipts/validityResolver";
export { issueReceiptForDecision, getReceiptByDecisionId } from "@/lib/decisionReceipts/service";
export { resolvePermissionForRelyingParty, PermissionResolutionError } from "@/lib/verify/resolvePermission";
export { buildTrustDecision } from "@/lib/verify/trustDecision";
export type { TrustDecision, TrustDecisionProof } from "@/lib/verify/trustDecision";
export type { ResolvedPermission } from "@/lib/verify/resolvePermission";
