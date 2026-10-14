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
      "Passport surfaces assurance state, partner requests, and exportable policy-scoped presentations (Build #565). Underlying documents are not the default reuse payload.",
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
      "Relying parties re-check signatures, audience binding, freshness, and authenticated revocation (#564). No Abraxas identity API is required on the strict proof-first path demonstrated in tests.",
  },
];
