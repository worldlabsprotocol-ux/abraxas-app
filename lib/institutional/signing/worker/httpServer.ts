import { randomUUID } from "node:crypto";
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
import { authenticateWorkerRequest, auditWorkerAuthorization } from "./authenticateWorkerRequest";
import type { WorkerCredentialRegistry } from "./workerCredentialRegistry";
import type { WorkerPrincipal } from "./workerScopes";

export type InstitutionalSigningHttpHandlers = {
  surface: InstitutionalSigningWorkerSurface;
  opened: Extract<OpenedInstitutionalSigning, { ok: true }>;
  env: Record<string, string | undefined>;
};

export type InstitutionalSigningHttpServerConfig = {
  handlers: InstitutionalSigningHttpHandlers;
  workerEnvironment: "demo" | "production";
  listenHost: string;
  loopbackOnly: boolean;
  registry: WorkerCredentialRegistry;
  verifyBearer: (token: string) => WorkerPrincipal | null;
  host?: string;
  port?: number;
  custodyReady?: boolean;
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

function sendJson(res: ServerResponse, status: number, body: unknown, headers?: Record<string, string>) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  if (headers) {
    for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
  }
  res.end(JSON.stringify(body));
}

export function createInstitutionalSigningHttpServer(input: InstitutionalSigningHttpServerConfig): Server {
  const host = input.host ?? "127.0.0.1";
  const custodyReady = input.custodyReady ?? true;
  const server = createServer(async (req, res) => {
    const correlationId = randomUUID();
    const path = req.url?.split("?")[0] ?? "";
  const method = req.method ?? "GET";

    try {
      const auth = authenticateWorkerRequest({
        req,
        method,
        path,
        workerEnvironment: input.workerEnvironment,
        listenHost: input.listenHost,
        loopbackOnly: input.loopbackOnly,
        verifyBearer: input.verifyBearer,
        registry: input.registry,
      });

      if (!auth.ok) {
        auditWorkerAuthorization({
          principal: null,
          route: path,
          outcome: "denied",
          reason: auth.reason,
          correlationId,
        });
        if (auth.status === 405) {
          sendJson(res, auth.status, { ok: false, reason: auth.reason }, { Allow: "POST" });
          return;
        }
        sendJson(res, auth.status, { ok: false, reason: auth.reason });
        return;
      }

      auditWorkerAuthorization({
        principal: auth.principal,
        route: path,
        outcome: "allowed",
        reason: auth.requiredScope,
        correlationId,
      });

      const body = await readJsonBody(req);

      if (auth.route === "/v1/health") {
        if (!custodyReady) {
          sendJson(res, 503, { ok: false, status: "unavailable" });
          return;
        }
        sendJson(res, 200, { ok: true, status: "ready" });
        return;
      }

      if (auth.route === "/v1/authoritative/recorded-issuer-authority-statement") {
        const record = body as { anchorKeyId?: string; issuedAt?: string; environment?: string };
        if (record.environment && record.environment !== input.workerEnvironment) {
          sendJson(res, 403, { ok: false, reason: "worker_environment_mismatch" });
          return;
        }
        const result = await signRecordedIssuerAuthorityStatement({
          env: input.handlers.env,
          issuer: input.handlers.opened.issuer,
          anchorKeyId: record.anchorKeyId ?? "",
          issuedAt: record.issuedAt ?? new Date().toISOString(),
        });
        sendJson(res, result.ok ? 200 : 400, result);
        return;
      }

      if (auth.route === "/v1/authoritative/authority-change-approval") {
        const record = body as {
          proposed?: IssuerAuthorityStatementPayload;
          assertedAuthorityStateDigest?: string;
          governanceApproval?: AuthorityGovernanceApproval;
          governanceSignatureBase64Url?: string;
          environment?: string;
        };
        if (record.environment && record.environment !== input.workerEnvironment) {
          sendJson(res, 403, { ok: false, reason: "worker_environment_mismatch" });
          return;
        }
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

      if (auth.route === "/v1/authoritative/receipt-status") {
        const record = body as {
          receiptId?: string;
          signedIssuerAuthority?: SignedIssuerAuthorityStatement;
          statusSignerKeyId?: string;
          statementTtlSeconds?: number;
          environment?: string;
        };
        if (record.environment && record.environment !== input.workerEnvironment) {
          sendJson(res, 403, { ok: false, reason: "worker_environment_mismatch" });
          return;
        }
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
        if (result.ok && auth.principal.partnerId) {
          const payloadPartner = result.statement?.payload.partner_id;
          if (payloadPartner && payloadPartner !== auth.principal.partnerId) {
            sendJson(res, 403, { ok: false, reason: "worker_partner_scope_forbidden" });
            return;
          }
        }
        sendJson(res, result.ok ? 200 : 400, result);
        return;
      }

      sendJson(res, 404, { ok: false, reason: "route_not_found" });
    } catch {
      sendJson(res, 503, { ok: false, reason: "worker_internal_error" });
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
