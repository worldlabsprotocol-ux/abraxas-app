// FILE: lib/openid4vp/presentation.ts
// OpenID4VP presentation request scaffold — standards-based credential presentation.

import { randomBytes } from "crypto";
import { resolveProtocolAppOrigin } from "@/lib/app/publicAppOrigin";

export interface OpenId4VpPresentationRequest {
  request_id: string;
  response_type: "vp_token";
  client_id: string;
  response_mode: "direct_post";
  presentation_definition: {
    id: string;
    input_descriptors: {
      id: string;
      name: string;
      purpose: string;
      constraints: {
        fields: { path: string[]; filter?: { type: string } }[];
      };
    }[];
  };
  nonce: string;
  redirect_uri?: string;
}

export function buildPresentationRequest(input: {
  partnerId: string;
  policyId: string;
  requestedClaims: string[];
  redirectUri?: string;
  appOrigin?: string;
}): OpenId4VpPresentationRequest {
  const base = resolveProtocolAppOrigin(input.appOrigin);
  const requestId = randomBytes(12).toString("hex");
  const nonce = randomBytes(16).toString("hex");

  return {
    request_id: requestId,
    response_type: "vp_token",
    client_id: `${base}/integrations`,
    response_mode: "direct_post",
    presentation_definition: {
      id: input.policyId,
      input_descriptors: input.requestedClaims.map((claim, i) => ({
        id: `claim-${i}`,
        name: claim,
        purpose: `Policy ${input.policyId} requires ${claim}`,
        constraints: {
          fields: [{ path: [`$.vc.credentialSubject.${claim}`], filter: { type: "boolean" } }],
        },
      })),
    },
    nonce,
    redirect_uri: input.redirectUri,
  };
}

export function presentationRequestUrl(
  request: OpenId4VpPresentationRequest,
  appOrigin?: string,
): string {
  const base = resolveProtocolAppOrigin(appOrigin);
  const params = new URLSearchParams({
    client_id: request.client_id,
    request_uri: `${base}/api/openid4vp/request/${request.request_id}`,
  });
  return `openid4vp://?${params.toString()}`;
}
