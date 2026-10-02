// FILE: lib/custody/index.ts

export * from "./types";
export * from "./storageClassification";
export * from "./dataCustodyMap";
export * from "./guardrails";
export * from "./chainCommitmentAdapter";
export * from "./token2022Evaluation";
export * from "./recoveryModel";
export * from "./trustModel";
export * from "./holderCredentialBoundary";
export * from "./zkBoundary";
export * from "./goodTroubleCustody";
export * from "./provenanceCustody";
export * from "./privacyThreatModel";

export const CUSTODY_ARCHITECTURE_VERSION = "1.0.0" as const;

export const CUSTODY_PRINCIPLE =
  "Abraxas should know enough to verify the answer without unnecessarily possessing the underlying data forever.";
