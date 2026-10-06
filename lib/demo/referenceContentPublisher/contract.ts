// FILE: lib/demo/referenceContentPublisher/contract.ts
// Canonical reference publisher/creator relying application contract.

import { CONTENT_ORIGIN_DISCLOSURE_PACK_ID } from "@/lib/provenance/constants";

export const REFERENCE_PUBLISHER_ROUTE = "/demo/reference-publisher" as const;
export const REFERENCE_PUBLISHER_CALLBACK_PATH = "/demo/reference-publisher/callback" as const;
export const REFERENCE_PUBLISHER_PREPARE_API = "/api/demo/reference-publisher/prepare" as const;
export const REFERENCE_PUBLISHER_VERIFY_API = "/api/demo/reference-publisher/verify" as const;

export const REFERENCE_PUBLISHER_PACK_ID = CONTENT_ORIGIN_DISCLOSURE_PACK_ID;
export const REFERENCE_PUBLISHER_PURPOSE = "content_provenance" as const;

export const REFERENCE_PUBLISHER_ENV = {
  partnerId: "REFERENCE_PUBLISHER_PARTNER_ID",
  policyId: "REFERENCE_PUBLISHER_POLICY_ID",
  appSlug: "REFERENCE_PUBLISHER_APP_SLUG",
  displayName: "REFERENCE_PUBLISHER_DISPLAY_NAME",
} as const;

export type ReferencePublisherPublicationState =
  | "draft"
  | "awaiting_proof"
  | "published"
  | "proof_failed";

export interface ReferencePublisherDraft {
  publish_attempt_id: string;
  title: string;
  body: string;
  content_hash: string;
  byte_length: number;
  created_at: string;
  state: ReferencePublisherPublicationState;
  provenance?: {
    creator_attested: boolean;
    ai_assistance_disclosed: string;
    source_integrity_verified: boolean;
  };
  receipt_id?: string;
  failure_reason?: string;
}
