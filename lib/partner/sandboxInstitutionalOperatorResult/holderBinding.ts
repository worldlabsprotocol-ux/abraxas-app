import { hashUtf8 } from "@/lib/partner/chainAttestation/hashes";

// Internal binding only. Neither the subject pseudonym nor this derivation input is public.
export function operatorSandboxHolderBinding(partnerId: string, subjectPseudonymId: string): `0x${string}` {
  if (!partnerId.trim() || !subjectPseudonymId.trim()) {
    throw Object.assign(new Error("consent_required"), { code: "consent_required" });
  }
  return hashUtf8(`operator-sandbox-institutional-holder:v1:${partnerId.trim()}:${subjectPseudonymId.trim()}`);
}
