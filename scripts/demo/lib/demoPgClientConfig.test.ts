import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildDemoPgClientConfig } from "./demoPgClientConfig";
import { DEMO_SUPABASE_SSL_ROOT_CERT_ENV } from "./demoSslRootCert";

const DEMO_REF = "ocntwbxarpjeixdnzide";
const POOLER_HOST = "aws-0-us-east-1.pooler.supabase.com";
const VALID_POOLER_URL = `postgresql://postgres.${DEMO_REF}:secret@${POOLER_HOST}:5432/postgres`;
const VALID_DIRECT_URL = `postgresql://postgres:secret@db.${DEMO_REF}.supabase.co:5432/postgres`;
const VALID_PEM = `-----BEGIN CERTIFICATE-----
MIICpzCCAY8CAQAwDQYJKoZIhvcNAQELBQAwFjEUMBIGA1UEAwwLVGVzdCBDQSBD
QTAeFw0yNDAxMDEwMDAwMDBaFw0zNDAxMDEwMDAwMDBaMBYxFDASBgNVBAMMC1Rl
c3QgQ0EgQ0EwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC7
-----END CERTIFICATE-----`;

describe("demoPgClientConfig", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  function makeCertFile(): string {
    const dir = mkdtempSync(join(tmpdir(), "demo-pg-client-"));
    tempDirs.push(dir);
    const certPath = join(dir, "supabase-ca.pem");
    writeFileSync(certPath, VALID_PEM, "utf8");
    return certPath;
  }

  it("configures verified TLS with rejectUnauthorized true and pooler SNI", () => {
    const certPath = makeCertFile();
    const config = buildDemoPgClientConfig({
      databaseUrl: VALID_POOLER_URL,
      env: { [DEMO_SUPABASE_SSL_ROOT_CERT_ENV]: certPath },
    });

    expect(config.parsed.transport).toBe("supabase_session_pooler");
    expect(config.clientOptions.connectionString).toBe(VALID_POOLER_URL);
    expect(config.clientOptions.ssl).toEqual({
      rejectUnauthorized: true,
      ca: VALID_PEM,
      servername: POOLER_HOST,
    });
  });

  it("rejects TLS query parameters on pooler URLs before client construction", () => {
    const certPath = makeCertFile();
    expect(() =>
      buildDemoPgClientConfig({
        databaseUrl: `${VALID_POOLER_URL}?sslmode=require`,
        env: { [DEMO_SUPABASE_SSL_ROOT_CERT_ENV]: certPath },
      }),
    ).toThrow(/must not include TLS query parameters/i);
  });

  it("does not require a certificate for direct transport", () => {
    const config = buildDemoPgClientConfig({
      databaseUrl: VALID_DIRECT_URL,
      env: {},
    });
    expect(config.clientOptions.ssl).toBeUndefined();
    expect(config.clientOptions.connectionString).toBe(VALID_DIRECT_URL);
  });

  it("never exposes certificate contents in thrown configuration errors", () => {
    const dir = mkdtempSync(join(tmpdir(), "demo-pg-client-error-"));
    tempDirs.push(dir);
    const directoryPath = join(dir, "cert-dir");
    mkdirSync(directoryPath, { recursive: true });
    try {
      buildDemoPgClientConfig({
        databaseUrl: VALID_POOLER_URL,
        env: { [DEMO_SUPABASE_SSL_ROOT_CERT_ENV]: directoryPath },
      });
      expect.unreachable("expected configuration to fail");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).not.toContain(VALID_PEM);
      expect(message).not.toContain("BEGIN CERTIFICATE");
      expect(message).not.toContain(directoryPath);
    }
  });
});
