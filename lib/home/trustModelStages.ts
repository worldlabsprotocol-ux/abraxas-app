export type TrustModelStageId = "holder" | "evaluate" | "receipt" | "verify";

export type TrustModelStage = {
  id: TrustModelStageId;
  index: string;
  title: string;
  summary: string;
  boundary: string;
  detail: string;
};

export const TRUST_MODEL_STAGES: TrustModelStage[] = [
  {
    id: "holder",
    index: "01",
    title: "Holder retains evidence",
    summary: "Personal evidence stays in holder custody until a policy-specific request is approved.",
    boundary: "Consent boundary",
    detail:
      "Passport surfaces assurance state, approved disclosures, and partner access history. Underlying documents are not exported as a default profile.",
  },
  {
    id: "evaluate",
    index: "02",
    title: "Policy evaluation",
    summary: "Abraxas evaluates the live request against partner policy, not a static credential dump.",
    boundary: "Evaluation boundary",
    detail:
      "The engine checks claim freshness, issuer trust, assurance level, and binding rules configured for the application environment.",
  },
  {
    id: "receipt",
    index: "03",
    title: "Signed decision receipt",
    summary: "Partners receive a signed permit, deny, or review outcome suitable for server-side enforcement.",
    boundary: "Distribution boundary",
    detail:
      "Receipts carry policy identifiers, expiration, and cryptographic signatures. They intentionally omit underlying identity payloads.",
  },
  {
    id: "verify",
    index: "04",
    title: "Independent verification",
    summary: "Verifiers re-check signatures, policy authorization, and current revocation without trusting Abraxas UI.",
    boundary: "Trust boundary",
    detail:
      "Signature validity and current authorization are distinct checks. A valid signature can still yield DENY when evidence is revoked or expired.",
  },
];
