// FILE: lib/protocolVerification/sandboxAgePresentationCopy.ts

export const SANDBOX_AGE_PRESENTATION_DISCLOSURE = {
  experience_kind: "age_21_test" as const,
  headline: "Age 21 demonstration",
  requested_attribute: "Simulated age eligibility predicate (21 or older), not real world age",
  disclosed_to_partner: ["Signed sandbox policy decision only", "No date of birth", "No government ID images"],
  withheld: ["Legal name", "Email", "Biometric templates", "Raw identity documents"],
  sandbox_notice:
    "Issuer backed verification demonstration only. Abraxas validates cryptographic evidence from an authorized sandbox test issuer. This does not establish real world age eligibility and is not acceptable for Production policy outcomes.",
} as const;
