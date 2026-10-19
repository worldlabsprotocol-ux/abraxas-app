// FILE: lib/protocolVerification/sandboxAgePresentationCopy.ts

export const SANDBOX_AGE_PRESENTATION_DISCLOSURE = {
  requested_attribute: "Age 21 eligibility threshold",
  disclosed_to_partner: ["Signed policy decision only", "No date of birth", "No government ID images"],
  withheld: ["Legal name", "Email", "Biometric templates", "Raw identity documents"],
  sandbox_notice:
    "Authorized test issuer credential. Demonstrates verification mechanics only. Not a Production eligibility decision.",
} as const;
