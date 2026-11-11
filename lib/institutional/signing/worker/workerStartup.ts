import { assertInstitutionalWorkerProcessEnv } from "./runtimeGuards";
import { assertWorkerListenHostAllowed } from "./transportValidation";
import { loadWorkerCredentialRegistry } from "./workerCredentialRegistry";

export function validateInstitutionalWorkerStartup(input: {
  env: Record<string, string | undefined>;
  listenHost: string;
}):
  | { ok: true; workerEnvironment: "demo" | "production"; loopbackOnly: boolean }
  | { ok: false; reason: string } {
  const processGuard = assertInstitutionalWorkerProcessEnv(input.env);
  if (!processGuard.ok) return processGuard;

  const workerEnvironment = input.env.ABRAXAS_INSTITUTIONAL_WORKER_ENVIRONMENT?.trim() === "production"
    ? "production"
    : "demo";

  if (workerEnvironment === "production" && input.env.ABRAXAS_INSTITUTIONAL_WORKER_DEMO_MEMORY?.trim() === "1") {
    return { ok: false, reason: "worker_demo_memory_forbidden_in_production" };
  }

  if (input.env.ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PRIVATE_JWK?.trim()
    || input.env.ABRAXAS_STATUS_SIGNER_PRIVATE_JWK?.trim()) {
    return { ok: false, reason: "worker_exportable_private_jwk_forbidden" };
  }

  const listen = assertWorkerListenHostAllowed(input.listenHost, input.env, workerEnvironment);
  if (!listen.ok) return listen;

  const credentials = loadWorkerCredentialRegistry({ env: input.env, workerEnvironment });
  if (!credentials.ok) return credentials;

  return { ok: true, workerEnvironment, loopbackOnly: listen.loopbackOnly };
}
