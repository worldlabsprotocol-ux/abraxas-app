// FILE: lib/persistence/boundary/issuerAuthority/signVerify.ts

import type { IssuerAuthorityStatementPayload, SignedIssuerAuthorityStatement } from "./contract";
import {
  signIssuerAuthorityPayloadForTests,
  verifySignedIssuerAuthorityStatement as verifySignedIssuerAuthorityStatementStandalone,
} from "@abraxas/independent-verifier";

export function signIssuerAuthorityPayload(
  payload: IssuerAuthorityStatementPayload,
  anchorPrivateJwk: JsonWebKey,
): SignedIssuerAuthorityStatement {
  return signIssuerAuthorityPayloadForTests({ payload, anchorPrivateJwk });
}

export function verifySignedIssuerAuthorityStatement(input: {
  statement: SignedIssuerAuthorityStatement;
  trustAnchorPublicJwk: JsonWebKey;
  minimumRegistryVersion?: number;
  acceptedRegistryVersion?: number;
  expectedAuthorityStateDigest?: string;
}): { ok: true } | { ok: false; reason: string } {
  return verifySignedIssuerAuthorityStatementStandalone(input);
}
