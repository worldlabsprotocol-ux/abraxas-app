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
  _env: Record<string, string | undefined> = {},
  _workerEnvironment: "demo" | "production" = "demo",
):
  | { ok: true; loopbackOnly: true }
  | { ok: false; reason: "worker_loopback_bind_required" } {
  const trimmed = host.trim();
  if (!isLoopbackHost(trimmed)) {
    return { ok: false, reason: "worker_loopback_bind_required" };
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
  if (!input.loopbackOnly) {
    return { ok: false, status: 503, reason: "worker_insecure_transport" };
  }
  if (!isLoopbackAddress(input.req.socket)) {
    return { ok: false, status: 503, reason: "worker_untrusted_remote_address" };
  }
  return { ok: true };
}
