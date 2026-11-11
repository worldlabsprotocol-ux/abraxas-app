import type { IncomingMessage } from "node:http";
import type { WorkerCredentialRegistry } from "./workerCredentialRegistry";
import type { WorkerPrincipal, WorkerScope } from "./workerScopes";
import { WORKER_PRIVILEGED_ROUTES, WORKER_ROUTE_SCOPES, type WorkerPrivilegedRoute } from "./workerScopes";
import { validateRequestTransport } from "./transportValidation";

export type WorkerAuthenticationResult =
  | { ok: true; principal: WorkerPrincipal; requiredScope: WorkerScope; route: WorkerPrivilegedRoute }
  | { ok: false; status: 401 | 403 | 404 | 405 | 503; reason: string };

function extractBearer(req: IncomingMessage): string | null {
  const header = req.headers.authorization?.trim() ?? "";
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token || null;
}

export function authenticateWorkerRequest(input: {
  req: IncomingMessage;
  method: string;
  path: string;
  workerEnvironment: "demo" | "production";
  listenHost: string;
  loopbackOnly: boolean;
  verifyBearer: (token: string) => WorkerPrincipal | null;
  registry: WorkerCredentialRegistry;
}): WorkerAuthenticationResult {
  const transport = validateRequestTransport({
    req: input.req,
    listenHost: input.listenHost,
    loopbackOnly: input.loopbackOnly,
  });
  if (!transport.ok) {
    return { ok: false, status: transport.status, reason: transport.reason };
  }

  if (input.path === "/v1/signRawDigest" || input.path.includes("signRawDigest")) {
    return { ok: false, status: 403, reason: "institutional_rpc_forbidden" };
  }

  const isKnownRoute = WORKER_PRIVILEGED_ROUTES.includes(input.path as WorkerPrivilegedRoute);
  if (!isKnownRoute) {
    return { ok: false, status: 404, reason: "route_not_found" };
  }

  const route = input.path as WorkerPrivilegedRoute;
  if (input.method !== "POST") {
    return { ok: false, status: 405, reason: "method_not_allowed" };
  }

  const bearer = extractBearer(input.req);
  if (!bearer) {
    return { ok: false, status: 401, reason: "worker_authentication_required" };
  }

  const principal = input.verifyBearer(bearer);
  if (!principal) {
    return { ok: false, status: 401, reason: "worker_authentication_invalid" };
  }

  if (principal.environment !== input.workerEnvironment) {
    return { ok: false, status: 403, reason: "worker_environment_mismatch" };
  }

  const requiredScope = WORKER_ROUTE_SCOPES[route];
  if (!principal.scopes.includes(requiredScope)) {
    return { ok: false, status: 403, reason: "worker_scope_forbidden" };
  }

  if (input.req.headers["x-role"] || input.req.headers["x-scope"]) {
    // Ignored — never elevates privileges.
  }

  return { ok: true, principal, requiredScope, route };
}

export function auditWorkerAuthorization(input: {
  principal: WorkerPrincipal | null;
  route: string;
  outcome: "allowed" | "denied";
  reason: string;
  correlationId: string;
}) {
  console.error(JSON.stringify({
    audit: "institutional_worker_authorization",
    at: new Date().toISOString(),
    identityId: input.principal?.identityId ?? null,
    environment: input.principal?.environment ?? null,
    route: input.route,
    outcome: input.outcome,
    reason: input.reason,
    correlationId: input.correlationId,
  }));
}
