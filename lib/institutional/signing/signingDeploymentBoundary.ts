// Permitted institutional signing surface for a co-located worker. No arbitrary digest RPC.

import type { IssuerAnchorSigner, OpenedInstitutionalSigning, StatusStatementSigner } from "./institutionalSigner";
import { SIGNING_DEPLOYMENT_MODEL } from "./custodyImplementation";

export const FORBIDDEN_INSTITUTIONAL_RPC_OPERATIONS = [
  "signRawDigest",
  "getPrivateKey",
  "exportKey",
  "sign",
] as const;

export type InstitutionalSigningWorkerSurface = {
  readonly issuer: Pick<
    IssuerAnchorSigner,
    "signIssuerAuthorityStatement" | "signAuthorityChangeApproval" | "role" | "identityId" | "keyId" | "publicJwk"
  >;
  readonly status: Pick<
    StatusStatementSigner,
    "signReceiptStatusStatement" | "role" | "identityId" | "keyId" | "publicJwk"
  >;
};

export function exposeInstitutionalSigningWorkerSurface(
  opened: Extract<OpenedInstitutionalSigning, { ok: true }>,
): InstitutionalSigningWorkerSurface {
  return {
    issuer: {
      role: opened.issuer.role,
      identityId: opened.issuer.identityId,
      keyId: opened.issuer.keyId,
      publicJwk: opened.issuer.publicJwk,
      signIssuerAuthorityStatement: opened.issuer.signIssuerAuthorityStatement.bind(opened.issuer),
      signAuthorityChangeApproval: opened.issuer.signAuthorityChangeApproval.bind(opened.issuer),
    },
    status: {
      role: opened.status.role,
      identityId: opened.status.identityId,
      keyId: opened.status.keyId,
      publicJwk: opened.status.publicJwk,
      signReceiptStatusStatement: opened.status.signReceiptStatusStatement.bind(opened.status),
    },
  };
}

export function assertPermittedWorkerOperations(names: readonly string[]): void {
  const forbidden = new Set<string>(FORBIDDEN_INSTITUTIONAL_RPC_OPERATIONS);
  for (const name of names) {
    if (forbidden.has(name)) {
      throw new Error(`institutional_rpc_forbidden:${name}`);
    }
  }
  const allowed = new Set<string>(SIGNING_DEPLOYMENT_MODEL.permittedRemoteOperations);
  for (const name of names) {
    if (!allowed.has(name)) {
      throw new Error(`institutional_rpc_not_allowlisted:${name}`);
    }
  }
}
