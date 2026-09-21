// FILE: lib/eligibilityPresentation/schema.ts
// Versioned JSON Schema for the public eligibility presentation envelope.

import { ELIGIBILITY_PRESENTATION_MEDIA_TYPE, ELIGIBILITY_PRESENTATION_VERSION } from "./contract";

export const ELIGIBILITY_PRESENTATION_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://abraxasworld.xyz/api/v1/eligibility-presentations/schema",
  title: "Abraxas Eligibility Presentation",
  type: "object",
  additionalProperties: false,
  required: ["media_type", "payload", "signature"],
  properties: {
    media_type: { const: ELIGIBILITY_PRESENTATION_MEDIA_TYPE },
    signature: { type: "string", minLength: 16 },
    payload: {
      type: "object",
      additionalProperties: false,
      required: [
        "schema_version",
        "presentation_ref",
        "issuer",
        "audience_hash",
        "policy_id",
        "policy_version",
        "result_category",
        "currently_valid",
        "environment",
        "issued_at",
        "expires_at",
        "verifier_nonce",
        "signing_key_id",
        "receipt_verification_ref",
        "selective_disclosure_summary",
      ],
      properties: {
        schema_version: { const: ELIGIBILITY_PRESENTATION_VERSION },
        presentation_ref: { type: "string", minLength: 8 },
        issuer: { const: "abraxas" },
        audience_hash: { type: "string", minLength: 16 },
        policy_id: { type: "string", minLength: 3 },
        policy_version: { type: "integer", minimum: 1 },
        result_category: { type: "string", minLength: 3 },
        currently_valid: { type: "boolean" },
        environment: { enum: ["sandbox", "production"] },
        issued_at: { type: "string", format: "date-time" },
        expires_at: { type: "string", format: "date-time" },
        verifier_nonce: { type: "string", minLength: 8 },
        signing_key_id: { type: "string", minLength: 3 },
        receipt_verification_ref: { type: "string", minLength: 8 },
        selective_disclosure_summary: { type: "string", minLength: 8 },
      },
    },
  },
} as const;

export function eligibilityPresentationSchemaDocument() {
  return {
    media_type: ELIGIBILITY_PRESENTATION_MEDIA_TYPE,
    schema_version: ELIGIBILITY_PRESENTATION_VERSION,
    canonical_serialization: "UTF-8 JSON with recursively sorted object keys and no whitespace",
    schema: ELIGIBILITY_PRESENTATION_JSON_SCHEMA,
  };
}
