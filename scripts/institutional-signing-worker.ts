#!/usr/bin/env node
/**
 * Isolated institutional signing process. Not for Vercel receipt runtime.
 *
 * Required: ABRAXAS_INSTITUTIONAL_SIGNING_WORKER=1
 * Caller secrets (one per scope): ABRAXAS_WORKER_CALLER_{STATUS,ISSUER,AUTHORITY,HEALTH}_SECRET
 * Listen: ABRAXAS_INSTITUTIONAL_WORKER_LISTEN_HOST (default 127.0.0.1), PORT (default 3848)
 */
import { bootstrapInstitutionalSigningWorker } from "../lib/institutional/signing/worker/workerBootstrap";
import { createInstitutionalSigningHttpServer, getServerAddress } from "../lib/institutional/signing/worker/httpServer";
import { DEFAULT_WORKER_LOOPBACK_PORT } from "../lib/institutional/signing/worker/transportValidation";
import { loadWorkerCredentialRegistry } from "../lib/institutional/signing/worker/workerCredentialRegistry";
import { validateInstitutionalWorkerStartup } from "../lib/institutional/signing/worker/workerStartup";

async function main() {
  const host = process.env.ABRAXAS_INSTITUTIONAL_WORKER_LISTEN_HOST?.trim() || "127.0.0.1";
  const startup = validateInstitutionalWorkerStartup({ env: process.env, listenHost: host });
  if (!startup.ok) {
    console.error(JSON.stringify({ ok: false, reason: startup.reason }));
    process.exit(1);
  }
  const credentials = loadWorkerCredentialRegistry({
    env: process.env,
    workerEnvironment: startup.workerEnvironment,
  });
  if (!credentials.ok) {
    console.error(JSON.stringify({ ok: false, reason: credentials.reason }));
    process.exit(1);
  }
  const boot = await bootstrapInstitutionalSigningWorker(process.env);
  if (!boot.ok) {
    console.error(JSON.stringify({ ok: false, reason: boot.reason }));
    process.exit(1);
  }
  const port = Number(process.env.ABRAXAS_INSTITUTIONAL_WORKER_LISTEN_PORT ?? String(DEFAULT_WORKER_LOOPBACK_PORT));
  const server = createInstitutionalSigningHttpServer({
    workerEnvironment: startup.workerEnvironment,
    listenHost: host,
    loopbackOnly: startup.loopbackOnly,
    registry: credentials.registry,
    verifyBearer: credentials.verifyBearer,
    host,
    port,
    handlers: {
      surface: boot.surface,
      opened: boot.opened,
      env: boot.env,
    },
    custodyReady: true,
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
