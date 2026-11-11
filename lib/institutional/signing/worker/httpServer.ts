import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { InstitutionalSigningWorkerSurface } from "../signingDeploymentBoundary";
import {
  approveRecordedAuthorityChange,
  publishAuthoritativeReceiptStatus,
  signRecordedIssuerAuthorityStatement,
} from "../recordedWorkflow";
import type { IssuerAuthorityStatementPayload } from "@abraxas/independent-verifier";
import type { OpenedInstitutionalSigning } from "../institutionalSigner";
import type { AuthorityGovernanceApproval } from "@/lib/persistence/boundary/issuerAuthority/governanceApproval";
import type { SignedIssuerAuthorityStatement } from "@abraxas/independent-verifier";

export type InstitutionalSigningHttpHandlers = {
  surface: InstitutionalSigningWorkerSurface;
  opened: Extract<OpenedInstitutionalSigning, { ok: true }>;
  env: Record<string, string | undefined>;
};

async function readJsonBody(req: IncomingMessage, limitBytes = 256_000): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = Buffer.from(chunk);
    size += buf.length;
    if (size > limitBytes) throw new Error("body_too_large");
    chunks.push(buf);
  }
  if (chunks.length === 0) return null;
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

function authorize(req: IncomingMessage, bearerToken: string): boolean {
  const header = req.headers.authorization?.trim() ?? "";
  if (!header.startsWith("Bearer ")) return false;
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 && token === bearerToken;
}

export function createInstitutionalSigningHttpServer(input: {
  handlers: InstitutionalSigningHttpHandlers;
  bearerToken: string;
  host?: string;
  port?: number;
}): Server {
  const host = input.host ?? "127.0.0.1";
  const server = createServer(async (req, res) => {
    try {
      if (req.method !== "POST") {
        sendJson(res, 405, { ok: false, reason: "method_not_allowed" });
        return;
      }
      if (!authorize(req, input.bearerToken)) {
        sendJson(res, 401, { ok: false, reason: "worker_unauthorized" });
        return;
      }
      const path = req.url?.split("?")[0] ?? "";
      if (path === "/v1/signRawDigest" || path.includes("signRawDigest")) {
        sendJson(res, 403, { ok: false, reason: "institutional_rpc_forbidden" });
        return;
      }

      const body = await readJsonBody(req);

      if (path === "/v1/authoritative/recorded-issuer-authority-statement") {
        const record = body as { anchorKeyId?: string; issuedAt?: string };
        const result = await signRecordedIssuerAuthorityStatement({
          env: input.handlers.env,
          issuer: input.handlers.opened.issuer,
          anchorKeyId: record.anchorKeyId ?? "",
          issuedAt: record.issuedAt ?? new Date().toISOString(),
        });
        sendJson(res, result.ok ? 200 : 400, result);
        return;
      }

      if (path === "/v1/authoritative/authority-change-approval") {
        const record = body as {
          proposed?: IssuerAuthorityStatementPayload;
          assertedAuthorityStateDigest?: string;
          governanceApproval?: AuthorityGovernanceApproval;
          governanceSignatureBase64Url?: string;
        };
        if (!record.proposed || !record.assertedAuthorityStateDigest) {
          sendJson(res, 400, { ok: false, reason: "invalid_request" });
          return;
        }
        const result = await approveRecordedAuthorityChange({
          env: input.handlers.env,
          issuer: input.handlers.opened.issuer,
          proposed: record.proposed,
          assertedAuthorityStateDigest: record.assertedAuthorityStateDigest,
          governanceApproval: record.governanceApproval ?? null,
          governanceSignatureBase64Url: record.governanceSignatureBase64Url ?? null,
        });
        sendJson(res, result.ok ? 200 : 400, result);
        return;
      }

      if (path === "/v1/authoritative/receipt-status") {
        const record = body as {
          receiptId?: string;
          signedIssuerAuthority?: SignedIssuerAuthorityStatement;
          statusSignerKeyId?: string;
          statementTtlSeconds?: number;
        };
        if (!record.receiptId || !record.signedIssuerAuthority || !record.statusSignerKeyId) {
          sendJson(res, 400, { ok: false, reason: "invalid_request" });
          return;
        }
        const result = await publishAuthoritativeReceiptStatus({
          env: input.handlers.env,
          status: input.handlers.opened.status,
          statusSignerKeyId: record.statusSignerKeyId,
          receiptId: record.receiptId,
          signedIssuerAuthority: record.signedIssuerAuthority,
          statementTtlSeconds: record.statementTtlSeconds,
        });
        sendJson(res, result.ok ? 200 : 400, result);
        return;
      }

      if (path === "/v1/health") {
        sendJson(res, 200, {
          ok: true,
          issuerIdentity: input.handlers.surface.issuer.identityId,
          statusIdentity: input.handlers.surface.status.identityId,
        });
        return;
      }

      sendJson(res, 404, { ok: false, reason: "route_not_found" });
    } catch {
      sendJson(res, 500, { ok: false, reason: "worker_internal_error" });
    }
  });
  server.listen(input.port ?? 0, host);
  return server;
}

export function getServerAddress(server: Server): Promise<{ host: string; port: number }> {
  return new Promise((resolve, reject) => {
    const onListening = () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("server_address_unavailable"));
        return;
      }
      resolve({ host: address.address, port: address.port });
    };
    if (server.listening) onListening();
    else server.once("listening", onListening);
  });
}
