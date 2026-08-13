// FILE: scripts/demo/lib/demoSigningKeyBootstrap.ts
// Local demo-only Ed25519 signing-key generation and verification (no network).

import { timingSafeEqual } from "node:crypto";
import {
  closeSync,
  constants,
  existsSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import nacl from "tweetnacl";
import { SignJWT, importJWK, jwtVerify } from "jose";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import {
  signReceiptPayload,
  verifyReceiptSignature,
} from "@/lib/decisionReceipts/signing";
import {
  canonicalPublicJwkThumbprint,
  publicJwkFromPrivateJwk,
} from "./demoProvisionerSigning";

export const DEMO_SIGNING_KEY_SCHEMA_VERSION = 1 as const;
export const DEMO_SIGNING_KEY_PRIVATE_FILENAME = "demo-signing-private.jwk";
export const DEMO_SIGNING_KEY_PUBLIC_FILENAME = "demo-signing-public.jwk";
export const DEMO_SIGNING_KEY_METADATA_FILENAME = "demo-signing-bootstrap.json";
export const DEMO_SIGNING_KEY_DEFAULT_ID = "abraxas-demo-primary";
export const DEMO_SIGNING_KEY_MAX_FILE_BYTES = 4096;

export const DEMO_SIGNING_KEY_EXIT = {
  success: 0,
  failure: 2,
} as const;

const PRIVATE_JWK_ALLOWED_KEYS = new Set(["kty", "crv", "x", "d"]);
const PUBLIC_JWK_ALLOWED_KEYS = new Set(["kty", "crv", "x"]);
const METADATA_ALLOWED_KEYS = new Set([
  "schema_version",
  "signing_key_id",
  "thumbprint",
  "generated_at",
  "private_jwk_filename",
  "public_jwk_filename",
  "metadata_filename",
]);

const DEFAULT_DISPOSABLE_PREFIXES = ["/tmp", "/var/tmp", "/dev/shm", "/private/tmp"];

const JWT_VERIFICATION_CLAIMS = {
  purpose: "demo_signing_key_bootstrap_verification",
  schema_version: DEMO_SIGNING_KEY_SCHEMA_VERSION,
} as const;

export class DemoSigningKeyBootstrapError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "DemoSigningKeyBootstrapError";
    this.code = code;
  }
}

export interface DemoSigningKeyBootstrapDeps {
  repositoryRoots?: string[];
  disposablePathPrefixes?: string[];
  allowDisposableOutputDir?: boolean;
  writeExclusiveFile?: (path: string, content: string, mode: number) => void;
  fsyncFile?: (fd: number) => void;
  unlinkFile?: (path: string) => void;
}

export interface GenerateDemoSigningKeyInput {
  outputDir: string;
  signingKeyId?: string;
  deps?: DemoSigningKeyBootstrapDeps;
}

export interface GenerateDemoSigningKeyResult {
  signingKeyId: string;
  thumbprint: string;
  privateJwkPath: string;
  publicJwkPath: string;
  metadataPath: string;
}

export interface VerifyDemoSigningKeyInput {
  privateJwkPath: string;
  publicJwkPath: string;
  metadataPath?: string;
  signingKeyId?: string;
  deps?: DemoSigningKeyBootstrapDeps;
}

export interface VerifyDemoSigningKeyResult {
  signingKeyId: string;
  thumbprint: string;
}

export interface DemoSigningKeyMetadataV1 {
  schema_version: typeof DEMO_SIGNING_KEY_SCHEMA_VERSION;
  signing_key_id: string;
  thumbprint: string;
  generated_at: string;
  private_jwk_filename: string;
  public_jwk_filename: string;
  metadata_filename: string;
}

function timingSafeEqualString(left: string, right: string): boolean {
  const leftBuf = Buffer.from(left, "utf8");
  const rightBuf = Buffer.from(right, "utf8");
  if (leftBuf.length !== rightBuf.length) return false;
  return timingSafeEqual(leftBuf, rightBuf);
}

function assertBase64UrlNoPadding(value: string, label: string): void {
  if (value.includes("=")) {
    throw new DemoSigningKeyBootstrapError(
      "jwk_malformed",
      `${label} must use unpadded base64url encoding`,
    );
  }
}

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Uint8Array.from(Buffer.from(padded + pad, "base64"));
}

function base64UrlEncode(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

function resolveDeps(deps?: DemoSigningKeyBootstrapDeps) {
  return {
    repositoryRoots: (deps?.repositoryRoots ?? [process.cwd(), "/workspace"]).map((p) =>
      resolve(p),
    ),
    disposablePathPrefixes: deps?.disposablePathPrefixes ?? DEFAULT_DISPOSABLE_PREFIXES,
    allowDisposableOutputDir: deps?.allowDisposableOutputDir ?? false,
  };
}

function safeErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/"d"\s*:\s*"[^"]+"/g, '"d":"<redacted>"')
    .replace(/"x"\s*:\s*"[^"]+"/g, '"x":"<redacted>"');
}

export function redactSigningKeyMaterial(text: string): string {
  return safeErrorMessage(text);
}

function assertAbsolutePath(path: string, label: string): string {
  if (!isAbsolute(path)) {
    throw new DemoSigningKeyBootstrapError(
      "output_path_not_absolute",
      `${label} must be an absolute path`,
    );
  }
  return resolve(path);
}

function isPathInside(parent: string, child: string): boolean {
  const resolvedParent = resolve(parent);
  const resolvedChild = resolve(child);
  return (
    resolvedChild === resolvedParent || resolvedChild.startsWith(`${resolvedParent}/`)
  );
}

function assertNoSymlinkInPath(path: string): void {
  const parts = resolve(path).split("/").filter(Boolean);
  let current = path.startsWith("/") ? "/" : "";
  for (const part of parts) {
    current = resolve(current, part);
    if (!existsSync(current)) break;
    if (lstatSync(current).isSymbolicLink()) {
      throw new DemoSigningKeyBootstrapError(
        "path_contains_symlink",
        "Path must not traverse a symlink component",
      );
    }
  }
}

function assertNotInsideRepository(path: string, deps?: DemoSigningKeyBootstrapDeps): void {
  const resolved = resolve(path);
  for (const root of resolveDeps(deps).repositoryRoots) {
    if (isPathInside(root, resolved)) {
      throw new DemoSigningKeyBootstrapError(
        "output_inside_repository",
        "Output directory must be outside the repository workspace",
      );
    }
  }
}

function assertDurableOutputDirectory(path: string, deps?: DemoSigningKeyBootstrapDeps): void {
  const resolved = resolve(path);
  const config = resolveDeps(deps);
  if (!config.allowDisposableOutputDir) {
    for (const prefix of config.disposablePathPrefixes) {
      if (isPathInside(prefix, resolved)) {
        throw new DemoSigningKeyBootstrapError(
          "output_disposable_path",
          "Output directory must use durable local storage, not a disposable temp location",
        );
      }
    }
  }
}

export function assertSafeOutputDirectory(
  outputDir: string,
  deps?: DemoSigningKeyBootstrapDeps,
): string {
  const resolved = assertAbsolutePath(outputDir, "Output directory");
  assertNoSymlinkInPath(resolved);
  assertNotInsideRepository(resolved, deps);
  assertDurableOutputDirectory(resolved, deps);

  if (!existsSync(resolved)) {
    throw new DemoSigningKeyBootstrapError(
      "output_directory_missing",
      "Output directory must exist before generation",
    );
  }

  const stat = lstatSync(resolved);
  if (stat.isSymbolicLink()) {
    throw new DemoSigningKeyBootstrapError("path_contains_symlink", "Output directory is a symlink");
  }
  if (!stat.isDirectory()) {
    throw new DemoSigningKeyBootstrapError(
      "output_not_directory",
      "Output path must be a real directory",
    );
  }

  return resolved;
}

function assertReadableRegularFile(path: string, label: string): void {
  const resolved = assertAbsolutePath(path, label);
  assertNoSymlinkInPath(resolved);
  if (!existsSync(resolved)) {
    throw new DemoSigningKeyBootstrapError("file_missing", `${label} does not exist`);
  }
  const stat = lstatSync(resolved);
  if (stat.isSymbolicLink()) {
    throw new DemoSigningKeyBootstrapError("path_contains_symlink", `${label} must not be a symlink`);
  }
  if (!stat.isFile()) {
    throw new DemoSigningKeyBootstrapError("file_not_regular", `${label} must be a regular file`);
  }
}

function readBoundedUtf8(path: string, label: string): string {
  assertReadableRegularFile(path, label);
  const content = readFileSync(path, "utf8");
  if (Buffer.byteLength(content, "utf8") > DEMO_SIGNING_KEY_MAX_FILE_BYTES) {
    throw new DemoSigningKeyBootstrapError("file_too_large", `${label} exceeds maximum size`);
  }
  return content;
}

function fsyncDirectoryBestEffort(dir: string): void {
  let dirFd: number | undefined;
  try {
    dirFd = openSync(dir, constants.O_RDONLY | constants.O_DIRECTORY);
    fsyncSync(dirFd);
  } catch {
    // best-effort across platforms
  } finally {
    if (dirFd !== undefined) {
      try {
        closeSync(dirFd);
      } catch {
        // ignore
      }
    }
  }
}

export function writeExclusiveFile(
  path: string,
  content: string,
  mode: number,
  hooks?: {
    fsyncFile?: (fd: number) => void;
    fsyncDirectory?: (dir: string) => void;
  },
): void {
  const resolved = resolve(path);
  assertNoSymlinkInPath(resolved);
  if (existsSync(resolved)) {
    const stat = lstatSync(resolved);
    if (stat.isSymbolicLink() || stat.isFile()) {
      throw new DemoSigningKeyBootstrapError(
        "target_file_exists",
        "Refusing to overwrite an existing output file",
      );
    }
    throw new DemoSigningKeyBootstrapError(
      "target_path_exists",
      "Refusing to write because the target path already exists",
    );
  }

  const bytes = Buffer.from(content, "utf8");
  if (bytes.byteLength > DEMO_SIGNING_KEY_MAX_FILE_BYTES) {
    throw new DemoSigningKeyBootstrapError("file_too_large", "Output payload exceeds maximum size");
  }

  let fd: number | undefined;
  const fsyncFile = hooks?.fsyncFile ?? ((fileFd: number) => fsyncSync(fileFd));
  const fsyncDirectory = hooks?.fsyncDirectory ?? fsyncDirectoryBestEffort;
  try {
    fd = openSync(resolved, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, mode);
    writeSync(fd, bytes);
    fsyncFile(fd);
    fstatSync(fd);
    closeSync(fd);
    fd = undefined;
    fsyncDirectory(dirname(resolved));
  } catch (error) {
    if (fd !== undefined) {
      try {
        closeSync(fd);
      } catch {
        // ignore
      }
    }
    if (existsSync(resolved)) {
      try {
        unlinkSync(resolved);
      } catch {
        // ignore cleanup errors
      }
    }
    throw error;
  }
}

function cleanupCreatedFiles(
  paths: string[],
  unlinkFile: (path: string) => void = unlinkSync,
): string[] {
  const remaining: string[] = [];
  for (const path of paths) {
    if (!existsSync(path)) continue;
    try {
      unlinkFile(path);
    } catch {
      remaining.push(path);
    }
  }
  return remaining;
}

function parseStrictJsonObject(
  raw: string,
  label: string,
  allowedKeys: Set<string>,
): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new DemoSigningKeyBootstrapError("invalid_json", `${label} is not valid JSON`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new DemoSigningKeyBootstrapError("invalid_json", `${label} must be a JSON object`);
  }
  const record = parsed as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!allowedKeys.has(key)) {
      throw new DemoSigningKeyBootstrapError(
        "jwk_unknown_field",
        `${label} contains unknown field: ${key}`,
      );
    }
  }
  return record;
}

function assertEd25519PrivateJwk(record: Record<string, unknown>, label: string): JsonWebKey {
  for (const key of ["kty", "crv", "x", "d"]) {
    if (typeof record[key] !== "string" || !record[key]) {
      throw new DemoSigningKeyBootstrapError(
        "jwk_malformed",
        `${label} is missing required field ${key}`,
      );
    }
  }
  if (record.kty !== "OKP" || record.crv !== "Ed25519") {
    throw new DemoSigningKeyBootstrapError(
      "jwk_malformed",
      `${label} must be an Ed25519 OKP private JWK`,
    );
  }
  assertBase64UrlNoPadding(record.d as string, `${label} field d`);
  assertBase64UrlNoPadding(record.x as string, `${label} field x`);
  const seed = base64UrlDecode(record.d as string);
  if (seed.length !== 32) {
    throw new DemoSigningKeyBootstrapError("jwk_malformed", `${label} seed d must decode to 32 bytes`);
  }
  const publicBytes = base64UrlDecode(record.x as string);
  if (publicBytes.length !== 32) {
    throw new DemoSigningKeyBootstrapError(
      "jwk_malformed",
      `${label} public x must decode to 32 bytes`,
    );
  }
  return {
    kty: "OKP",
    crv: "Ed25519",
    x: record.x as string,
    d: record.d as string,
  };
}

function assertEd25519PublicJwk(record: Record<string, unknown>, label: string): JsonWebKey {
  for (const key of ["kty", "crv", "x"]) {
    if (typeof record[key] !== "string" || !record[key]) {
      throw new DemoSigningKeyBootstrapError(
        "jwk_malformed",
        `${label} is missing required field ${key}`,
      );
    }
  }
  if (record.kty !== "OKP" || record.crv !== "Ed25519") {
    throw new DemoSigningKeyBootstrapError(
      "jwk_malformed",
      `${label} must be an Ed25519 OKP public JWK`,
    );
  }
  assertBase64UrlNoPadding(record.x as string, `${label} field x`);
  const publicBytes = base64UrlDecode(record.x as string);
  if (publicBytes.length !== 32) {
    throw new DemoSigningKeyBootstrapError(
      "jwk_malformed",
      `${label} public x must decode to 32 bytes`,
    );
  }
  return {
    kty: "OKP",
    crv: "Ed25519",
    x: record.x as string,
  };
}

export function derivePublicXFromPrivateSeed(privateJwk: JsonWebKey): string {
  if (!privateJwk.d) {
    throw new DemoSigningKeyBootstrapError("jwk_malformed", "Private JWK missing seed d");
  }
  const seed = base64UrlDecode(privateJwk.d);
  if (seed.length !== 32) {
    throw new DemoSigningKeyBootstrapError("jwk_malformed", "Private JWK seed d must be 32 bytes");
  }
  const keyPair = nacl.sign.keyPair.fromSeed(seed);
  return base64UrlEncode(keyPair.publicKey);
}

export function generateEd25519DemoKeypairJwks(): {
  privateJwk: JsonWebKey;
  publicJwk: JsonWebKey;
} {
  const keyPair = nacl.sign.keyPair();
  const privateJwk: JsonWebKey = {
    kty: "OKP",
    crv: "Ed25519",
    x: base64UrlEncode(keyPair.publicKey),
    d: base64UrlEncode(keyPair.secretKey.slice(0, 32)),
  };
  const publicJwk: JsonWebKey = {
    kty: "OKP",
    crv: "Ed25519",
    x: base64UrlEncode(keyPair.publicKey),
  };
  return { privateJwk, publicJwk };
}

function buildMetadata(input: {
  signingKeyId: string;
  thumbprint: string;
  generatedAt: string;
}): DemoSigningKeyMetadataV1 {
  return {
    schema_version: DEMO_SIGNING_KEY_SCHEMA_VERSION,
    signing_key_id: input.signingKeyId,
    thumbprint: input.thumbprint,
    generated_at: input.generatedAt,
    private_jwk_filename: DEMO_SIGNING_KEY_PRIVATE_FILENAME,
    public_jwk_filename: DEMO_SIGNING_KEY_PUBLIC_FILENAME,
    metadata_filename: DEMO_SIGNING_KEY_METADATA_FILENAME,
  };
}

function parseMetadata(raw: string): DemoSigningKeyMetadataV1 {
  const record = parseStrictJsonObject(raw, "Metadata file", METADATA_ALLOWED_KEYS);
  if (record.schema_version !== DEMO_SIGNING_KEY_SCHEMA_VERSION) {
    throw new DemoSigningKeyBootstrapError("metadata_invalid", "Unsupported metadata schema_version");
  }
  for (const field of [
    "signing_key_id",
    "thumbprint",
    "generated_at",
    "private_jwk_filename",
    "public_jwk_filename",
    "metadata_filename",
  ] as const) {
    if (typeof record[field] !== "string" || !record[field]) {
      throw new DemoSigningKeyBootstrapError(
        "metadata_invalid",
        `Metadata field ${field} is required`,
      );
    }
  }
  if (!/^[0-9a-f]{64}$/i.test(record.thumbprint as string)) {
    throw new DemoSigningKeyBootstrapError("metadata_invalid", "Metadata thumbprint is invalid");
  }
  return record as DemoSigningKeyMetadataV1;
}

export function generateDemoSigningKeyFiles(
  input: GenerateDemoSigningKeyInput,
): GenerateDemoSigningKeyResult {
  const signingKeyId = input.signingKeyId?.trim() || DEMO_SIGNING_KEY_DEFAULT_ID;
  if (!signingKeyId) {
    throw new DemoSigningKeyBootstrapError("signing_key_id_invalid", "signing_key_id is required");
  }

  const outputDir = assertSafeOutputDirectory(input.outputDir, input.deps);
  const privateJwkPath = resolve(outputDir, DEMO_SIGNING_KEY_PRIVATE_FILENAME);
  const publicJwkPath = resolve(outputDir, DEMO_SIGNING_KEY_PUBLIC_FILENAME);
  const metadataPath = resolve(outputDir, DEMO_SIGNING_KEY_METADATA_FILENAME);

  for (const target of [privateJwkPath, publicJwkPath, metadataPath]) {
    if (existsSync(target)) {
      throw new DemoSigningKeyBootstrapError(
        "target_file_exists",
        "Refusing to overwrite an existing output file",
      );
    }
  }

  const { privateJwk, publicJwk } = generateEd25519DemoKeypairJwks();
  const thumbprint = canonicalPublicJwkThumbprint(publicJwk);
  const generatedAt = new Date().toISOString();
  const metadata = buildMetadata({ signingKeyId, thumbprint, generatedAt });

  const created: string[] = [];
  const writeFile =
    input.deps?.writeExclusiveFile
    ?? ((path, content, mode) =>
      writeExclusiveFile(path, content, mode, {
        fsyncFile: input.deps?.fsyncFile,
        fsyncDirectory: input.deps?.fsyncDirectory,
      }));
  try {
    writeFile(
      privateJwkPath,
      `${JSON.stringify(privateJwk)}\n`,
      0o600,
    );
    created.push(privateJwkPath);

    writeFile(
      publicJwkPath,
      `${JSON.stringify(publicJwk)}\n`,
      0o600,
    );
    created.push(publicJwkPath);

    writeFile(
      metadataPath,
      `${JSON.stringify(metadata, null, 2)}\n`,
      0o600,
    );
    created.push(metadataPath);
  } catch (error) {
    const remaining = cleanupCreatedFiles(created, input.deps?.unlinkFile);
    if (remaining.length > 0) {
      throw new DemoSigningKeyBootstrapError(
        "signing_key_partial_cleanup_required",
        `Failed to remove files created during this invocation: ${remaining.join(", ")}`,
      );
    }
    if (error instanceof DemoSigningKeyBootstrapError) throw error;
    throw new DemoSigningKeyBootstrapError(
      "write_failed",
      "Failed to write demo signing-key output files",
    );
  }

  return {
    signingKeyId,
    thumbprint,
    privateJwkPath,
    publicJwkPath,
    metadataPath,
  };
}

export async function verifyCredentialJwtRoundTrip(
  privateJwk: JsonWebKey,
  publicJwk: JsonWebKey,
): Promise<void> {
  const signingKey = await importJWK(privateJwk, "EdDSA");
  const jwt = await new SignJWT({ ...JWT_VERIFICATION_CLAIMS })
    .setProtectedHeader({ alg: "EdDSA", typ: "JWT" })
    .setIssuedAt()
    .sign(signingKey);
  const publicKey = await importJWK(publicJwk, "EdDSA");
  await jwtVerify(jwt, publicKey);
}

export function verifyReceiptRoundTrip(
  privateJwk: JsonWebKey,
  publicJwk: JsonWebKey,
): void {
  const payload = buildCanonicalPayload({
    receipt_id: "dr_demo_signing_key_bootstrap",
    decision_id: "vd_demo_signing_key_bootstrap",
    policy_id: "abraxas-partner-sandbox",
    policy_version: 1,
    partner_id: "abraxas-partner-sandbox",
    subject_pseudonym_id: "ps_demo_signing_key_bootstrap",
    wallet_binding_ref: null,
    consent_receipt_id: null,
    decision_result: "approved",
    reason_codes: [],
    evaluated_claim_refs: [],
    issuer_refs: [],
    decision_context: "sandbox_only",
    evaluated_at: "2026-08-13T00:00:00.000Z",
    expires_at: "2099-01-01T00:00:00.000Z",
  });
  const { signature } = signReceiptPayload(payload, privateJwk);
  const verified = verifyReceiptSignature(payload, signature, publicJwk);
  if (!verified) {
    throw new DemoSigningKeyBootstrapError(
      "receipt_roundtrip_failed",
      "Decision receipt sign/verify round trip failed",
    );
  }
}

export async function verifyDemoSigningKeyFiles(
  input: VerifyDemoSigningKeyInput,
): Promise<VerifyDemoSigningKeyResult> {
  const privateJwkPath = assertAbsolutePath(input.privateJwkPath, "Private JWK path");
  const publicJwkPath = assertAbsolutePath(input.publicJwkPath, "Public JWK path");
  assertNotInsideRepository(privateJwkPath, input.deps);
  assertNotInsideRepository(publicJwkPath, input.deps);

  const privateRaw = readBoundedUtf8(privateJwkPath, "Private JWK file");
  const publicRaw = readBoundedUtf8(publicJwkPath, "Public JWK file");

  const privateJwk = assertEd25519PrivateJwk(
    parseStrictJsonObject(privateRaw, "Private JWK file", PRIVATE_JWK_ALLOWED_KEYS),
    "Private JWK file",
  );
  const publicJwk = assertEd25519PublicJwk(
    parseStrictJsonObject(publicRaw, "Public JWK file", PUBLIC_JWK_ALLOWED_KEYS),
    "Public JWK file",
  );

  const derivedX = derivePublicXFromPrivateSeed(privateJwk);
  if (!timingSafeEqualString(derivedX, privateJwk.x!)) {
    throw new DemoSigningKeyBootstrapError(
      "jwk_seed_mismatch",
      "Private JWK seed d does not match private x",
    );
  }
  if (!timingSafeEqualString(derivedX, publicJwk.x!)) {
    throw new DemoSigningKeyBootstrapError(
      "jwk_public_mismatch",
      "Public JWK x does not match private seed derivation",
    );
  }

  const derivedPublic = publicJwkFromPrivateJwk(privateJwk);
  const thumbprint = canonicalPublicJwkThumbprint(derivedPublic);
  if (thumbprint !== canonicalPublicJwkThumbprint(publicJwk)) {
    throw new DemoSigningKeyBootstrapError(
      "thumbprint_mismatch",
      "Public JWK thumbprint does not match derived public key",
    );
  }

  await verifyCredentialJwtRoundTrip(privateJwk, publicJwk);
  verifyReceiptRoundTrip(privateJwk, publicJwk);

  let signingKeyId = input.signingKeyId?.trim() || DEMO_SIGNING_KEY_DEFAULT_ID;
  if (input.metadataPath) {
    const metadata = parseMetadata(
      readBoundedUtf8(assertAbsolutePath(input.metadataPath, "Metadata path"), "Metadata file"),
    );
    if (metadata.thumbprint.toLowerCase() !== thumbprint.toLowerCase()) {
      throw new DemoSigningKeyBootstrapError(
        "metadata_thumbprint_mismatch",
        "Metadata thumbprint does not match derived public thumbprint",
      );
    }
    signingKeyId = metadata.signing_key_id;
  }

  return { signingKeyId, thumbprint };
}

export function formatGenerateSuccessOutput(result: GenerateDemoSigningKeyResult): string {
  return [
    "demo_signing_key_generated",
    `signing_key_id: ${result.signingKeyId}`,
    `public_thumbprint: ${result.thumbprint}`,
    `private_jwk_path: ${result.privateJwkPath}`,
    `public_jwk_path: ${result.publicJwkPath}`,
    `metadata_path: ${result.metadataPath}`,
    "signing_key_backup_required",
  ].join("\n");
}

export function formatVerifySuccessOutput(result: VerifyDemoSigningKeyResult): string {
  return [
    "demo_signing_key_verified",
    `signing_key_id: ${result.signingKeyId}`,
    `public_thumbprint: ${result.thumbprint}`,
  ].join("\n");
}

export function parseGenerateArgs(argv: string[]): GenerateDemoSigningKeyInput {
  let outputDir: string | undefined;
  let signingKeyId: string | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--output-dir") {
      outputDir = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--output-dir=")) {
      outputDir = arg.slice("--output-dir=".length);
      continue;
    }
    if (arg === "--key-id") {
      signingKeyId = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--key-id=")) {
      signingKeyId = arg.slice("--key-id=".length);
      continue;
    }
    throw new DemoSigningKeyBootstrapError("invalid_args", `Unsupported argument: ${arg}`);
  }

  if (!outputDir?.trim()) {
    throw new DemoSigningKeyBootstrapError(
      "output_path_not_absolute",
      "--output-dir <absolute-path> is required",
    );
  }

  return { outputDir: outputDir.trim(), signingKeyId };
}

export function parseVerifyArgs(argv: string[]): VerifyDemoSigningKeyInput {
  let privateJwkPath: string | undefined;
  let publicJwkPath: string | undefined;
  let metadataPath: string | undefined;
  let signingKeyId: string | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--private-jwk") {
      privateJwkPath = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--private-jwk=")) {
      privateJwkPath = arg.slice("--private-jwk=".length);
      continue;
    }
    if (arg === "--public-jwk") {
      publicJwkPath = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--public-jwk=")) {
      publicJwkPath = arg.slice("--public-jwk=".length);
      continue;
    }
    if (arg === "--metadata") {
      metadataPath = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--metadata=")) {
      metadataPath = arg.slice("--metadata=".length);
      continue;
    }
    if (arg === "--key-id") {
      signingKeyId = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--key-id=")) {
      signingKeyId = arg.slice("--key-id=".length);
      continue;
    }
    throw new DemoSigningKeyBootstrapError("invalid_args", `Unsupported argument: ${arg}`);
  }

  if (!privateJwkPath?.trim() || !publicJwkPath?.trim()) {
    throw new DemoSigningKeyBootstrapError(
      "invalid_args",
      "--private-jwk and --public-jwk absolute paths are required",
    );
  }

  return {
    privateJwkPath: privateJwkPath.trim(),
    publicJwkPath: publicJwkPath.trim(),
    metadataPath: metadataPath?.trim(),
    signingKeyId,
  };
}

export function mapBootstrapErrorToExitCode(error: unknown): number {
  return DEMO_SIGNING_KEY_EXIT.failure;
}

export function formatBootstrapError(error: unknown): string {
  if (error instanceof DemoSigningKeyBootstrapError) {
    return `Configuration error [${error.code}]: ${safeErrorMessage(error.message)}`;
  }
  return `Configuration error [bootstrap_failed]: ${safeErrorMessage(error)}`;
}
