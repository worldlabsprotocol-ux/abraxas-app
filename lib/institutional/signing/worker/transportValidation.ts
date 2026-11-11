import type { IncomingMessage } from "node:http";
import type { Socket } from "node:net";

export const DEFAULT_WORKER_LOOPBACK_PORT = 3848;

export function isLoopbackHost(host: string): boolean {
  const trimmed = host.trim();
  return trimmed === "127.0.0.1" || trimmed === "::1" || trimmed === "localhost";
}

function isLoopbackAddress(socket: Socket): boolean {
  const address = socket.remoteAddress ?? "";
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}

export function assertWorkerListenHostAllowed(
  host: string,
  env: Record<string, string | undefined>,
  workerEnvironment: "demo" | "production",
):
  | { ok: true; loopbackOnly: boolean }
  | { ok: false; reason: string } {
  const trimmed = host.trim();
  if (workerEnvironment === "production" && !isLoopbackHost(trimmed)) {
    return { ok: false, reason: "worker_production_requires_loopback_bind" };
  }
  if (trimmed === "0.0.0.0" || (!isLoopbackHost(trimmed) && trimmed.length > 0)) {
    const tlsConfigured = Boolean(
      env.ABRAXAS_INSTITUTIONAL_WORKER_TLS_KEY_PATH?.trim()
        && env.ABRAXAS_INSTITUTIONAL_WORKER_TLS_CERT_PATH?.trim(),
    );
    if (!tlsConfigured) {
      return { ok: false, reason: "worker_remote_bind_requires_tls" };
    }
    return { ok: true, loopbackOnly: false };
  }
  return { ok: true, loopbackOnly: true };
}

export function validateRequestTransport(input: {
  req: IncomingMessage;
  listenHost: string;
  loopbackOnly: boolean;
}):
  | { ok: true }
  | { ok: false; status: 503; reason: "worker_insecure_transport" | "worker_untrusted_remote_address" } {
  const encrypted = Boolean((input.req.socket as Socket & { encrypted?: boolean }).encrypted);
  if (input.loopbackOnly) {
    if (!isLoopbackAddress(input.req.socket)) {
      return { ok: false, status: 503, reason: "worker_untrusted_remote_address" };
    }
    return { ok: true };
  }
  if (!encrypted) {
    return { ok: false, status: 503, reason: "worker_insecure_transport" };
  }
  const roleHeader = input.req.headers["x-role"] ?? input.req.headers["x-scope"] ?? input.req.headers["x-authenticated-identity"];
  if (roleHeader) {
    // Headers are ignored for authorization; presence alone does not grant access.
  }
  return { ok: true };
}
