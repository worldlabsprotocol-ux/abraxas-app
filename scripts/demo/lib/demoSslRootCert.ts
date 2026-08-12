// FILE: scripts/demo/lib/demoSslRootCert.ts
// Load and validate the local Supabase database CA for session pooler TLS.

import { lstatSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export const DEMO_SUPABASE_SSL_ROOT_CERT_ENV = "DEMO_SUPABASE_SSL_ROOT_CERT_PATH";
export const MAX_SSL_ROOT_CERT_BYTES = 256 * 1024;

const PEM_CERTIFICATE_PATTERN =
  /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/;

export class DemoSslRootCertError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DemoSslRootCertError";
  }
}

export function assertNodeTlsVerificationEnabled(): void {
  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0") {
    throw new DemoSslRootCertError(
      "NODE_TLS_REJECT_UNAUTHORIZED=0 is not permitted for demo database tooling",
    );
  }
}

export function assertSslRootCertPathConfigured(
  env: Record<string, string | undefined>,
): void {
  const configured = env[DEMO_SUPABASE_SSL_ROOT_CERT_ENV]?.trim();
  if (!configured) {
    throw new DemoSslRootCertError(
      `${DEMO_SUPABASE_SSL_ROOT_CERT_ENV} is required for supabase_session_pooler apply mode`,
    );
  }
}

export function loadDemoSslRootCertPem(certPath: string): string {
  const resolvedPath = resolve(certPath.trim());
  let stats;
  try {
    stats = lstatSync(resolvedPath);
  } catch {
    throw new DemoSslRootCertError(
      "Configured SSL root certificate path is not readable",
    );
  }

  if (stats.isSymbolicLink()) {
    throw new DemoSslRootCertError(
      "Configured SSL root certificate path must not be a symlink",
    );
  }
  if (!stats.isFile()) {
    throw new DemoSslRootCertError(
      "Configured SSL root certificate path must be a regular file",
    );
  }
  if (stats.size === 0) {
    throw new DemoSslRootCertError(
      "Configured SSL root certificate file is empty",
    );
  }
  if (stats.size > MAX_SSL_ROOT_CERT_BYTES) {
    throw new DemoSslRootCertError(
      "Configured SSL root certificate file exceeds the maximum allowed size",
    );
  }

  let pem: string;
  try {
    pem = readFileSync(resolvedPath, "utf8");
  } catch {
    throw new DemoSslRootCertError(
      "Configured SSL root certificate path is not readable",
    );
  }

  if (!PEM_CERTIFICATE_PATTERN.test(pem)) {
    throw new DemoSslRootCertError(
      "Configured SSL root certificate file does not contain PEM certificate data",
    );
  }

  return pem;
}

export function loadDemoSslRootCertFromEnv(
  env: Record<string, string | undefined>,
): string {
  assertSslRootCertPathConfigured(env);
  return loadDemoSslRootCertPem(env[DEMO_SUPABASE_SSL_ROOT_CERT_ENV]!.trim());
}
