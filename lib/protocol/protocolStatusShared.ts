// FILE: lib/protocol/protocolStatusShared.ts
// Client-safe types and labels for protocol status UI.

export type ProtocolHealthLabel = "operational" | "degraded" | "not_configured";

export interface ProtocolSubsystemStatus {
  id: string;
  label: string;
  status: ProtocolHealthLabel;
  detail: string;
}

export interface ProtocolStatusPayload {
  ok: boolean;
  updatedAt: string;
  subsystems: ProtocolSubsystemStatus[];
  metrics: {
    verified_identities: number | null;
    pending_reviews: number | null;
    credentials_issued_30d: number | null;
    verified_assets: number | null;
  };
}

export function protocolHealthLabel(status: ProtocolHealthLabel): string {
  if (status === "operational") return "Operational";
  if (status === "degraded") return "Degraded";
  return "Not configured";
}
