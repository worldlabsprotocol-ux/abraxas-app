// FILE: lib/infrastructure/offlineVerificationContract.ts
// What relying parties can verify without Abraxas database access.

export type VerificationMode = "offline_cryptographic" | "requires_fresh_authoritative_state";

export type VerificationCapability = {
  id: string;
  label: string;
  mode: VerificationMode;
  description: string;
};

export const RECEIPT_VERIFICATION_CAPABILITIES: VerificationCapability[] = [
  {
    id: "signature_authenticity",
    label: "Signature authenticity",
    mode: "offline_cryptographic",
    description:
      "Ed25519 signature over canonical receipt payload using trusted issuer public material (ABRAXAS_SIGNING_KEY / published JWK).",
  },
  {
    id: "payload_integrity",
    label: "Payload integrity and binding fields",
    mode: "offline_cryptographic",
    description: "Tamper detection on signed fields; policy_id, partner_id, and application binding checked against signed payload.",
  },
  {
    id: "expiration_static",
    label: "Static expiration (signed exp)",
    mode: "offline_cryptographic",
    description: "Compare signed exp / not_after to verifier clock without database.",
  },
  {
    id: "revocation_current",
    label: "Current revocation status",
    mode: "requires_fresh_authoritative_state",
    description: "Requires recent registry or Abraxas current-validity API; stale evidence must not approve protected actions.",
  },
  {
    id: "supersession",
    label: "Supersession / replacement receipts",
    mode: "requires_fresh_authoritative_state",
    description: "Requires authoritative receipt registry or freshness-bounded cache.",
  },
  {
    id: "partner_operational",
    label: "Partner suspension / application active",
    mode: "requires_fresh_authoritative_state",
    description: "Operational authorization — not embedded in signature alone.",
  },
  {
    id: "evidence_freshness",
    label: "Evidence freshness and IDV dependency validity",
    mode: "requires_fresh_authoritative_state",
    description: "Linked evidence may expire or be withdrawn; requires current claims store or holder presentation.",
  },
  {
    id: "replay_consumption",
    label: "Presentation replay consumption",
    mode: "requires_fresh_authoritative_state",
    description: "One-time or scoped consumption tracked in PostgreSQL — offline verify cannot mark consumed.",
  },
];

export function offlineCapableVerificationIds(): string[] {
  return RECEIPT_VERIFICATION_CAPABILITIES.filter((c) => c.mode === "offline_cryptographic").map(
    (c) => c.id,
  );
}
