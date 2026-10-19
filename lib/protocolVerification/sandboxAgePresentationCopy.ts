// FILE: lib/protocolVerification/sandboxAgePresentationCopy.ts

export const SANDBOX_AGE_PRESENTATION_DISCLOSURE = {
  experience_kind: "age_21_test" as const,
  headline: "Age 21 test",
  requested_attribute: "Simulated age 21 eligibility outcome",
  disclosed_to_partner: ["Signed sandbox policy decision only", "No date of birth", "No government ID images"],
  withheld: ["Legal name", "Email", "Biometric templates", "Raw identity documents"],
  sandbox_notice:
    "This is a test of the verification process using an authorized test issuer. It does not prove your real world age and is not Production trusted eligibility.",
} as const;
