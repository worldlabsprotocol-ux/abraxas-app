import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertNodeTlsVerificationEnabled,
  assertSslRootCertPathConfigured,
  DEMO_SUPABASE_SSL_ROOT_CERT_ENV,
  loadDemoSslRootCertPem,
  loadDemoSslRootCertFromEnv,
} from "./demoSslRootCert";

const VALID_PEM = `-----BEGIN CERTIFICATE-----
MIICpzCCAY8CAQAwDQYJKoZIhvcNAQELBQAwFjEUMBIGA1UEAwwLVGVzdCBDQSBD
QTAeFw0yNDAxMDEwMDAwMDBaFw0zNDAxMDEwMDAwMDBaMBYxFDASBgNVBAMMC1Rl
c3QgQ0EgQ0EwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC7
-----END CERTIFICATE-----`;

describe("demoSslRootCert", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
    delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  });

  function makeTempDir(): string {
    const dir = mkdtempSync(join(tmpdir(), "demo-ssl-cert-"));
    tempDirs.push(dir);
    return dir;
  }

  it("loads a valid PEM certificate file", () => {
    const dir = makeTempDir();
    const certPath = join(dir, "supabase-ca.pem");
    writeFileSync(certPath, VALID_PEM, "utf8");
    expect(loadDemoSslRootCertPem(certPath)).toBe(VALID_PEM);
  });

  it("requires the CA path environment variable for session pooler apply", () => {
    expect(() => assertSslRootCertPathConfigured({})).toThrow(
      /DEMO_SUPABASE_SSL_ROOT_CERT_PATH is required/i,
    );
  });

  it("rejects missing, empty, malformed, directory, and oversized CA files", () => {
    expect(() => loadDemoSslRootCertPem(join(makeTempDir(), "missing.pem"))).toThrow(
      /not readable/i,
    );

    const dir = makeTempDir();
    const emptyPath = join(dir, "empty.pem");
    writeFileSync(emptyPath, "", "utf8");
    expect(() => loadDemoSslRootCertPem(emptyPath)).toThrow(/empty/i);

    const malformedPath = join(dir, "malformed.pem");
    writeFileSync(malformedPath, "not a certificate", "utf8");
    expect(() => loadDemoSslRootCertPem(malformedPath)).toThrow(/PEM certificate/i);

    const directoryPath = join(dir, "cert-dir");
    mkdirSync(directoryPath);
    expect(() => loadDemoSslRootCertPem(directoryPath)).toThrow(/regular file/i);

    const oversizedPath = join(dir, "oversized.pem");
    writeFileSync(oversizedPath, `-----BEGIN CERTIFICATE-----\n${"A".repeat(300_000)}\n-----END CERTIFICATE-----\n`, "utf8");
    expect(() => loadDemoSslRootCertPem(oversizedPath)).toThrow(/maximum allowed size/i);
  });

  it("rejects symlink certificate paths", () => {
    const dir = makeTempDir();
    const realPath = join(dir, "real.pem");
    const linkPath = join(dir, "link.pem");
    writeFileSync(realPath, VALID_PEM, "utf8");
    symlinkSync(realPath, linkPath);
    expect(() => loadDemoSslRootCertPem(linkPath)).toThrow(/symlink/i);
  });

  it("rejects NODE_TLS_REJECT_UNAUTHORIZED=0", () => {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    expect(() => assertNodeTlsVerificationEnabled()).toThrow(/NODE_TLS_REJECT_UNAUTHORIZED=0/i);
  });

  it("loads from env without echoing certificate contents in configuration errors", () => {
    const dir = makeTempDir();
    const certPath = join(dir, "supabase-ca.pem");
    writeFileSync(certPath, VALID_PEM, "utf8");

    expect(
      loadDemoSslRootCertFromEnv({
        [DEMO_SUPABASE_SSL_ROOT_CERT_ENV]: certPath,
      }),
    ).toBe(VALID_PEM);

    expect(() =>
      loadDemoSslRootCertFromEnv({
        [DEMO_SUPABASE_SSL_ROOT_CERT_ENV]: join(dir, "missing.pem"),
      }),
    ).toThrow(/not readable/i);
  });
});
