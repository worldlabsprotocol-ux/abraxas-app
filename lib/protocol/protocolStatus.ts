// FILE: lib/protocol/protocolStatus.ts
// Public protocol health summary for /status (server-only).

import { getVerificationLayerStatus, type VerificationItemStatus } from "@/lib/authenticationProof/verificationLayerStatus";
import { getIndependentIdvStatus } from "@/lib/idv/independentIdvStatus";
import { getUnifiedRegistryStats } from "@/lib/registry/unifiedStats";
import type { ProtocolHealthLabel, ProtocolStatusPayload, ProtocolSubsystemStatus } from "./protocolStatusShared";

export type { ProtocolHealthLabel, ProtocolStatusPayload, ProtocolSubsystemStatus } from "./protocolStatusShared";
export { protocolHealthLabel } from "./protocolStatusShared";

function mapStatus(status: VerificationItemStatus | "live" | "partial" | "not_configured"): ProtocolHealthLabel {
  if (status === "live") return "operational";
  if (status === "partial") return "degraded";
  return "not_configured";
}

export async function getProtocolStatus(): Promise<ProtocolStatusPayload> {
  const [layer, idv, stats] = await Promise.all([
    getVerificationLayerStatus(),
    getIndependentIdvStatus(),
    getUnifiedRegistryStats(),
  ]);

  const biometric = idv.biometric_engine;
  const vn = stats.verification_network;

  const subsystems: ProtocolSubsystemStatus[] = [
    {
      id: "biometric-engine",
      label: "Biometric Engine",
      status: mapStatus(biometric.status),
      detail: biometric.summary,
    },
    {
      id: "identity-review",
      label: "Identity Review",
      status: mapStatus(idv.status),
      detail: idv.review_queue,
    },
    {
      id: "credential-issuance",
      label: "Credential Issuance",
      status: idv.signing_key_configured ? "operational" : "degraded",
      detail: idv.signing_key_configured
        ? "Signing key configured — credentials can be issued after approval."
        : "ABRAXAS_SIGNING_KEY required for credential issuance.",
    },
    {
      id: "verification-api",
      label: "Verification API",
      status: mapStatus(layer.items.find((i) => i.id === "credentials-verify")?.status ?? "not_configured"),
      detail: layer.items.find((i) => i.id === "credentials-verify")?.detail ?? "POST /api/credentials/verify",
    },
  ];

  return {
    ok: subsystems.every((s) => s.status === "operational"),
    updatedAt: new Date().toISOString(),
    subsystems,
    metrics: {
      verified_identities: vn?.manual_idv_approved ?? null,
      pending_reviews: vn?.manual_idv_pending ?? null,
      credentials_issued_30d: vn?.credentials_issued_30d ?? stats.active_credentials ?? null,
      verified_assets: stats.verified_assets ?? null,
    },
  };
}
