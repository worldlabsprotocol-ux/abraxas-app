// FILE: scripts/demo/lib/demoSigningKeyBootstrap.test.ts

import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertSafeOutputDirectory,
  DEMO_SIGNING_KEY_METADATA_FILENAME,
  DEMO_SIGNING_KEY_PRIVATE_FILENAME,
  DEMO_SIGNING_KEY_PUBLIC_FILENAME,
  DemoSigningKeyBootstrapError,
  derivePublicXFromPrivateSeed,
  formatBootstrapError,
  formatGenerateSuccessOutput,
  generateDemoSigningKeyFiles,
  generateEd25519DemoKeypairJwks,
  parseGenerateArgs,
  parseVerifyArgs,
  verifyCredentialJwtRoundTrip,
  verifyDemoSigningKeyFiles,
  verifyReceiptRoundTrip,
  writeExclusiveFile,
} from "./demoSigningKeyBootstrap";
import { canonicalPublicJwkThumbprint } from "./demoProvisionerSigning";

const REPO_ROOT = resolve(process.cwd());

function makeOutsideOutputDir(name: string): string {
  const base = mkdtempSync(join(tmpdir(), "abraxas-demo-signing-"));
  const dir = join(base, name);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function testDeps(outputDir: string) {
  return {
    repositoryRoots: [REPO_ROOT, "/workspace"],
    allowDisposableOutputDir: true,
    disposablePathPrefixes: ["/tmp", "/var/tmp", "/dev/shm", "/private/tmp", dirname(outputDir)],
  };
}

describe("demoSigningKeyBootstrap", () => {
  const createdRoots: string[] = [];

  afterEach(() => {
    for (const root of createdRoots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  it("generates and verifies a valid keypair with JWT and receipt round trips", async () => {
    const outputDir = makeOutsideOutputDir("valid");
    createdRoots.push(dirname(outputDir));

    const generated = generateDemoSigningKeyFiles({
      outputDir,
      signingKeyId: "abraxas-demo-primary",
      deps: testDeps(outputDir),
    });

    const verified = await verifyDemoSigningKeyFiles({
      privateJwkPath: generated.privateJwkPath,
      publicJwkPath: generated.publicJwkPath,
      metadataPath: generated.metadataPath,
      deps: testDeps(outputDir),
    });

    expect(verified.thumbprint).toBe(generated.thumbprint);
    expect(verified.signingKeyId).toBe("abraxas-demo-primary");

    const privateMode = lstatSync(generated.privateJwkPath).mode & 0o777;
    expect(privateMode).toBe(0o600);
  });

  it("preserves exact private/public relationship and deterministic thumbprint", () => {
    const { privateJwk, publicJwk } = generateEd25519DemoKeypairJwks();
    const derivedX = derivePublicXFromPrivateSeed(privateJwk);
    expect(derivedX).toBe(privateJwk.x);
    expect(derivedX).toBe(publicJwk.x);
    expect(canonicalPublicJwkThumbprint(publicJwk)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("runs credential JWT and receipt round trips directly", async () => {
    const { privateJwk, publicJwk } = generateEd25519DemoKeypairJwks();
    await verifyCredentialJwtRoundTrip(privateJwk, publicJwk);
    verifyReceiptRoundTrip(privateJwk, publicJwk);
  });

  it("does not print private material in success or error formatting", async () => {
    const outputDir = makeOutsideOutputDir("stdout");
    createdRoots.push(dirname(outputDir));

    const generated = generateDemoSigningKeyFiles({
      outputDir,
      deps: testDeps(outputDir),
    });
    const stdout = formatGenerateSuccessOutput(generated);
    expect(stdout).toContain("signing_key_backup_required");
    expect(stdout).not.toMatch(/"d"\s*:/);
    expect(stdout).not.toMatch(/"x"\s*:/);

    const badMessage = formatBootstrapError(
      new DemoSigningKeyBootstrapError(
        "jwk_malformed",
        `bad {"d":"${"a".repeat(40)}","x":"${"b".repeat(40)}"}`,
      ),
    );
    expect(badMessage).not.toContain("a".repeat(40));
    expect(badMessage).toContain("<redacted>");
  });

  it("rejects output directories inside the repository", () => {
    const insideRepo = join(REPO_ROOT, "tmp-signing-output");
    mkdirSync(insideRepo, { recursive: true });
    createdRoots.push(insideRepo);

    expect(() =>
      assertSafeOutputDirectory(insideRepo, { repositoryRoots: [REPO_ROOT] }),
    ).toThrow(/outside the repository/i);
  });

  it("rejects disposable output directories unless explicitly allowed for tests", () => {
    const disposable = mkdtempSync(join(tmpdir(), "abraxas-demo-signing-disposable-"));
    createdRoots.push(disposable);

    expect(() =>
      assertSafeOutputDirectory(disposable, {
        repositoryRoots: [REPO_ROOT],
        allowDisposableOutputDir: false,
        disposablePathPrefixes: [tmpdir()],
      }),
    ).toThrow(/durable local storage/i);
  });

  it("rejects symlink parents and symlink targets", () => {
    const root = makeOutsideOutputDir("symlink-root");
    createdRoots.push(dirname(root));
    const linkParent = join(dirname(root), "link-parent");
    symlinkSync(root, linkParent);

    expect(() =>
      assertSafeOutputDirectory(linkParent, testDeps(root)),
    ).toThrow(/symlink/i);

    const outputDir = makeOutsideOutputDir("symlink-target");
    createdRoots.push(dirname(outputDir));
    writeFileSync(join(outputDir, DEMO_SIGNING_KEY_PRIVATE_FILENAME), "{}\n", { mode: 0o600 });

    expect(() =>
      generateDemoSigningKeyFiles({ outputDir, deps: testDeps(outputDir) }),
    ).toThrow(/existing output file/i);
  });

  it("rejects existing output files and enforces exclusive creation", () => {
    const outputDir = makeOutsideOutputDir("existing");
    createdRoots.push(dirname(outputDir));
    writeFileSync(join(outputDir, DEMO_SIGNING_KEY_PRIVATE_FILENAME), "{}\n", { mode: 0o600 });

    expect(() =>
      generateDemoSigningKeyFiles({ outputDir, deps: testDeps(outputDir) }),
    ).toThrow(/existing output file/i);
  });

  it("uses fixed filenames regardless of key-id", () => {
    const outputDir = makeOutsideOutputDir("key-id");
    createdRoots.push(dirname(outputDir));

    const generated = generateDemoSigningKeyFiles({
      outputDir,
      signingKeyId: "custom-demo-key-id",
      deps: testDeps(outputDir),
    });

    expect(generated.privateJwkPath.endsWith(`/${DEMO_SIGNING_KEY_PRIVATE_FILENAME}`)).toBe(true);
    expect(generated.publicJwkPath.endsWith(`/${DEMO_SIGNING_KEY_PUBLIC_FILENAME}`)).toBe(true);
    expect(generated.metadataPath.endsWith(`/${DEMO_SIGNING_KEY_METADATA_FILENAME}`)).toBe(true);
  });

  it("rejects generation before any file when output directory is missing", () => {
    const missingDir = join(dirname(makeOutsideOutputDir("parent")), "missing-child");
    createdRoots.push(dirname(missingDir));

    expect(() =>
      generateDemoSigningKeyFiles({
        outputDir: missingDir,
        deps: testDeps(missingDir),
      }),
    ).toThrow(/must exist/i);
  });

  it("cleans up after public-file write failure", () => {
    const outputDir = makeOutsideOutputDir("fail-public");
    createdRoots.push(dirname(outputDir));

    expect(() =>
      generateDemoSigningKeyFiles({
        outputDir,
        deps: {
          ...testDeps(outputDir),
          writeExclusiveFile(path, content, mode) {
            if (path.endsWith(DEMO_SIGNING_KEY_PUBLIC_FILENAME)) {
              throw new DemoSigningKeyBootstrapError("write_failed", "simulated public failure");
            }
            writeExclusiveFile(path, content, mode);
          },
        },
      }),
    ).toThrow(/simulated public failure/i);

    expect(existsSync(join(outputDir, DEMO_SIGNING_KEY_PRIVATE_FILENAME))).toBe(false);
    expect(existsSync(join(outputDir, DEMO_SIGNING_KEY_PUBLIC_FILENAME))).toBe(false);
  });

  it("cleans up partial writes on metadata failure", () => {
    const outputDir = makeOutsideOutputDir("partial");
    createdRoots.push(dirname(outputDir));

    let writeCount = 0;
    expect(() =>
      generateDemoSigningKeyFiles({
        outputDir,
        deps: {
          ...testDeps(outputDir),
          writeExclusiveFile(path, content, mode) {
            writeCount += 1;
            if (writeCount === 3) {
              throw new Error("simulated write failure");
            }
            writeExclusiveFile(path, content, mode);
          },
        },
      }),
    ).toThrow();

    expect(existsSync(join(outputDir, DEMO_SIGNING_KEY_PRIVATE_FILENAME))).toBe(false);
    expect(existsSync(join(outputDir, DEMO_SIGNING_KEY_PUBLIC_FILENAME))).toBe(false);
    expect(existsSync(join(outputDir, DEMO_SIGNING_KEY_METADATA_FILENAME))).toBe(false);
  });

  it("fails safely when file fsync fails", () => {
    const outputDir = makeOutsideOutputDir("fail-fsync");
    createdRoots.push(dirname(outputDir));

    expect(() =>
      generateDemoSigningKeyFiles({
        outputDir,
        deps: {
          ...testDeps(outputDir),
          fsyncFile() {
            throw new DemoSigningKeyBootstrapError("write_failed", "simulated fsync failure");
          },
        },
      }),
    ).toThrow(/simulated fsync failure/i);

    expect(existsSync(join(outputDir, DEMO_SIGNING_KEY_PRIVATE_FILENAME))).toBe(false);
  });

  it("fails safely when directory fsync fails", () => {
    const outputDir = makeOutsideOutputDir("fail-dir-fsync");
    createdRoots.push(dirname(outputDir));

    expect(() =>
      generateDemoSigningKeyFiles({
        outputDir,
        deps: {
          ...testDeps(outputDir),
          fsyncDirectory() {
            throw new DemoSigningKeyBootstrapError("write_failed", "simulated directory fsync failure");
          },
        },
      }),
    ).toThrow(/simulated directory fsync failure/i);

    expect(existsSync(join(outputDir, DEMO_SIGNING_KEY_PRIVATE_FILENAME))).toBe(false);
  });

  it("reports signing_key_partial_cleanup_required when cleanup fails", () => {
    const outputDir = makeOutsideOutputDir("cleanup-fail");
    createdRoots.push(dirname(outputDir));

    try {
      generateDemoSigningKeyFiles({
        outputDir,
        deps: {
          ...testDeps(outputDir),
          writeExclusiveFile(path, content, mode) {
            if (path.endsWith(DEMO_SIGNING_KEY_PUBLIC_FILENAME)) {
              throw new DemoSigningKeyBootstrapError("write_failed", "simulated public failure");
            }
            writeExclusiveFile(path, content, mode);
          },
          unlinkFile() {
            throw new Error("simulated unlink failure");
          },
        },
      });
      throw new Error("expected generate to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(DemoSigningKeyBootstrapError);
      expect((error as DemoSigningKeyBootstrapError).code).toBe(
        "signing_key_partial_cleanup_required",
      );
    }

    const message = formatBootstrapError(
      new DemoSigningKeyBootstrapError(
        "signing_key_partial_cleanup_required",
        `Failed to remove files created during this invocation: ${join(outputDir, DEMO_SIGNING_KEY_PRIVATE_FILENAME)}`,
      ),
    );
    expect(message).toContain(DEMO_SIGNING_KEY_PRIVATE_FILENAME);
    expect(message).not.toMatch(/"d"\s*:/);
  });

  it("serializes only allowed JWK keys in generated files", () => {
    const outputDir = makeOutsideOutputDir("jwk-shape");
    createdRoots.push(dirname(outputDir));

    const generated = generateDemoSigningKeyFiles({
      outputDir,
      deps: testDeps(outputDir),
    });

    const privateParsed = JSON.parse(readFileSync(generated.privateJwkPath, "utf8")) as Record<
      string,
      unknown
    >;
    const publicParsed = JSON.parse(readFileSync(generated.publicJwkPath, "utf8")) as Record<
      string,
      unknown
    >;

    expect(Object.keys(privateParsed).sort()).toEqual(["crv", "d", "kty", "x"]);
    expect(Object.keys(publicParsed).sort()).toEqual(["crv", "kty", "x"]);
    expect(String(privateParsed.d)).not.toContain("=");
  });

  it("rejects malformed, oversized, and mismatched JWK files", async () => {
    const outputDir = makeOutsideOutputDir("verify-bad");
    createdRoots.push(dirname(outputDir));

    const { privateJwk, publicJwk } = generateEd25519DemoKeypairJwks();
    const privatePath = join(outputDir, "private.jwk");
    const publicPath = join(outputDir, "public.jwk");
    writeFileSync(privatePath, `${"x".repeat(5000)}\n`, { mode: 0o600 });
    writeFileSync(publicPath, `${JSON.stringify(publicJwk)}\n`, { mode: 0o600 });

    await expect(
      verifyDemoSigningKeyFiles({
        privateJwkPath: privatePath,
        publicJwkPath: publicPath,
        deps: testDeps(outputDir),
      }),
    ).rejects.toThrow(/maximum size/i);

    writeFileSync(privatePath, `${JSON.stringify({ kty: "RSA", alg: "RS256" })}\n`, { mode: 0o600 });
    await expect(
      verifyDemoSigningKeyFiles({
        privateJwkPath: privatePath,
        publicJwkPath: publicPath,
        deps: testDeps(outputDir),
      }),
    ).rejects.toThrow(/unknown field|missing required field|Ed25519/i);

    const mismatchedPublic = { ...publicJwk, x: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" };
    writeFileSync(privatePath, `${JSON.stringify(privateJwk)}\n`, { mode: 0o600 });
    writeFileSync(publicPath, `${JSON.stringify(mismatchedPublic)}\n`, { mode: 0o600 });
    await expect(
      verifyDemoSigningKeyFiles({
        privateJwkPath: privatePath,
        publicJwkPath: publicPath,
        deps: testDeps(outputDir),
      }),
    ).rejects.toThrow(/does not match/i);
  });

  it("parses CLI args", () => {
    expect(parseGenerateArgs(["--output-dir", "/secure/out", "--key-id", "demo-key"])).toEqual({
      outputDir: "/secure/out",
      signingKeyId: "demo-key",
    });
    expect(
      parseVerifyArgs([
        "--private-jwk",
        "/secure/private.jwk",
        "--public-jwk",
        "/secure/public.jwk",
        "--metadata",
        "/secure/meta.json",
      ]),
    ).toEqual({
      privateJwkPath: "/secure/private.jwk",
      publicJwkPath: "/secure/public.jwk",
      metadataPath: "/secure/meta.json",
      signingKeyId: undefined,
    });
  });

  it("imports no network clients in bootstrap modules", async () => {
    const bootstrapSource = readFileSync(
      resolve(REPO_ROOT, "scripts/demo/lib/demoSigningKeyBootstrap.ts"),
      "utf8",
    );
    const generateSource = readFileSync(
      resolve(REPO_ROOT, "scripts/demo/generate-demo-signing-key.ts"),
      "utf8",
    );
    const verifySource = readFileSync(
      resolve(REPO_ROOT, "scripts/demo/verify-demo-signing-key.ts"),
      "utf8",
    );

    for (const source of [bootstrapSource, generateSource, verifySource]) {
      expect(source).not.toMatch(/@supabase|vercel|node:dns|from ['"]https?:/i);
      expect(source).not.toMatch(/\bfetch\s*\(/);
    }
  });

  it("performs zero network calls during generation and verification", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network forbidden"));
    const outputDir = makeOutsideOutputDir("offline");
    createdRoots.push(dirname(outputDir));

    const generated = generateDemoSigningKeyFiles({
      outputDir,
      deps: testDeps(outputDir),
    });
    await verifyDemoSigningKeyFiles({
      privateJwkPath: generated.privateJwkPath,
      publicJwkPath: generated.publicJwkPath,
      metadataPath: generated.metadataPath,
      deps: testDeps(outputDir),
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
