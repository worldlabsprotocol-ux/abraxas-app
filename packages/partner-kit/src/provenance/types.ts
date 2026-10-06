export interface ProvenancePartnerFacts {
  creator_attested: boolean;
  ai_assistance_disclosed: string;
  source_integrity_verified: boolean;
  assertion_classes: {
    creator_attested: "attestation";
    ai_assistance_disclosed: "disclosure";
    source_integrity_verified: "integrity";
  };
}
