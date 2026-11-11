#!/usr/bin/env node
/**
 * Isolated institutional signing process. Not for Vercel receipt runtime.
 *
 * Required: ABRAXAS_INSTITUTIONAL_SIGNING_WORKER=1
 * Optional demo: ABRAXAS_INSTITUTIONAL_WORKER_DEMO_MEMORY=1 (demo env only)
 * HTTP: ABRAXAS_INSTITUTIONAL_WORKER_BEARER_TOKEN, ABRAXAS_INSTITUTIONAL_WORKER_LISTEN_HOST,
 *       ABRAXAS_INSTITUTIONAL_WORKER_LISTEN_PORT
 */
import { bootstrapInstitutionalSigningWorker } from "../lib/institutional/signing/worker/workerBootstrap";
import { createInstitutionalSigningHttpServer, getServerAddress } from "../lib/institutional/signing/worker/httpServer";

async function main() {
  const boot = await bootstrapInstitutionalSigningWorker(process.env);
  if (!boot.ok) {
    console.error(JSON.stringify({ ok: false, reason: boot.reason }));
    process.exit(1);
  }
  const bearer = process.env.ABRAXAS_INSTITUTIONAL_WORKER_BEARER_TOKEN?.trim();
  if (!bearer) {
    console.error(JSON.stringify({ ok: false, reason: "worker_bearer_token_required" }));
    process.exit(1);
  }
  const host = process.env.ABRAXAS_INSTITUTIONAL_WORKER_LISTEN_HOST?.trim() || "127.0.0.1";
  const port = Number(process.env.ABRAXAS_INSTITUTIONAL_WORKER_LISTEN_PORT ?? "9471");
  const server = createInstitutionalSigningHttpServer({
    bearerToken: bearer,
    host,
    port,
    handlers: {
      surface: boot.surface,
      opened: boot.opened,
      env: boot.env,
    },
  });
  const address = await getServerAddress(server);
  console.error(
    JSON.stringify({
      ok: true,
      message: "institutional_signing_worker_listening",
      host: address.host,
      port: address.port,
      environment: boot.environment,
    }),
  );
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, reason: err instanceof Error ? err.message : String(err) }));
  process.exit(1);
});
