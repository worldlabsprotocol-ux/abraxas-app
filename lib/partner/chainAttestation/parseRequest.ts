// Allowed issuance request keys only. Extra keys fail closed.
// verifying_contract and chain_id are not partner authority.

const ALLOWED = [
  "receipt_id",
  "action_type",
  "action_scope",
  "network_id",
  "deployment_ref",
  "wallet_binding_hash",
  "wallet_binding_mode",
  "application_id",
  "organization_binding_hash",
] as const;

export interface ParsedChainAttestationRequest {
  receipt_id: string;
  action_type: string;
  action_scope: string;
  network_id: string;
  deployment_ref: string;
  wallet_binding_hash: string | null;
  wallet_binding_mode: "not_attached" | "optional" | "required";
  application_id: string | null;
  organization_binding_hash: string | null;
}

export function parseChainAttestationRequest(
  body: unknown,
): { ok: true; value: ParsedChainAttestationRequest } | { ok: false; reason: "invalid" } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, reason: "invalid" };
  const rec = body as Record<string, unknown>;
  if (Object.keys(rec).some((key) => !(ALLOWED as readonly string[]).includes(key))) {
    return { ok: false, reason: "invalid" };
  }
  const receiptId = typeof rec.receipt_id === "string" ? rec.receipt_id.trim() : "";
  const actionType = typeof rec.action_type === "string" ? rec.action_type.trim() : "";
  const actionScope = typeof rec.action_scope === "string" ? rec.action_scope.trim() : "";
  const networkId = typeof rec.network_id === "string" ? rec.network_id.trim() : "";
  const deploymentRef = typeof rec.deployment_ref === "string" ? rec.deployment_ref.trim() : "";
  if (!receiptId || !actionType || !actionScope || !networkId || !deploymentRef) return { ok: false, reason: "invalid" };
  const mode = rec.wallet_binding_mode === undefined ? "not_attached" : rec.wallet_binding_mode;
  if (mode !== "not_attached" && mode !== "optional" && mode !== "required") {
    return { ok: false, reason: "invalid" };
  }
  const binding = rec.wallet_binding_hash === undefined || rec.wallet_binding_hash === null
    ? null
    : rec.wallet_binding_hash;
  if (binding !== null && typeof binding !== "string") return { ok: false, reason: "invalid" };
  const applicationId = rec.application_id === undefined || rec.application_id === null
    ? null
    : rec.application_id;
  if (applicationId !== null && typeof applicationId !== "string") return { ok: false, reason: "invalid" };
  const organizationBinding = rec.organization_binding_hash === undefined || rec.organization_binding_hash === null
    ? null
    : rec.organization_binding_hash;
  if (organizationBinding !== null && typeof organizationBinding !== "string") return { ok: false, reason: "invalid" };
  return {
    ok: true,
    value: {
      receipt_id: receiptId,
      action_type: actionType,
      action_scope: actionScope,
      network_id: networkId,
      deployment_ref: deploymentRef,
      wallet_binding_hash: binding,
      wallet_binding_mode: mode,
      application_id: applicationId,
      organization_binding_hash: organizationBinding,
    },
  };
}
