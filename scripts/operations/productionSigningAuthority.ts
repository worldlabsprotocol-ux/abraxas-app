// Local Production signing-authority custody. Never prints private JWK material.
// The cloud agent must not run `generate` for the real ceremony.

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import {
  chmodSync,
  closeSync,
  constants,
  existsSync,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  statSync,
  writeSync,
} from "node:fs";
import { userInfo } from "node:os";
import { isAbsolute, join, parse, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import nacl from "tweetnacl";
import { publicEd25519JwkFingerprint, validateTrustAnchorBundle } from "@abraxas/independent-verifier";
import { buildTrustAnchorBundleV1 } from "@/lib/persistence/boundary/trustDistribution/buildTrustAnchorBundle";

export const ANCHOR_KEY_ID = "abraxas-production-issuer-anchor";
export const STATUS_SIGNER_KEY_ID = "abraxas-production-status-signer";
export const RECEIPT_KEY_ID = "abraxas-primary";
export const RECEIPT_KEY_FINGERPRINT = "6f3adfcbb0c710e0e78d3e5c24af276d5893e735a564e8829074fd0ba5796786";
export const RECEIPT_KEY_DOCUMENT_DIGEST = "4b4dc882928403fc622299d932b80aa985aaa990d6474cfa76a044dddfbb5489";
export const INITIAL_REGISTRY_VERSION = 854;
export const RECOVERY_PASSPHRASE_ENV = "ABRAXAS_SIGNING_RECOVERY_PASSPHRASE";

export const PRIVATE_ANCHOR_FILE = "anchor.private.jwk";
export const PUBLIC_ANCHOR_FILE = "anchor.public.jwk";
export const ANCHOR_KEY_ID_FILE = "anchor.keyid";
export const PRIVATE_STATUS_FILE = "status.private.jwk";
export const PUBLIC_STATUS_FILE = "status.public.jwk";
export const STATUS_KEY_ID_FILE = "status.keyid";
export const PUBLIC_PIN_FILE = "production-trust-pin.json";
export const RECOVERY_FILE = "production-signing-recovery.enc.json";

const PRODUCTION_ENV_NAMES = [
  "ABRAXAS_ISSUER_AUTHORITY_ANCHOR_KEY_ID",
  "ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PUBLIC_JWK",
  "ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PRIVATE_JWK",
  "ABRAXAS_STATUS_SIGNER_KEY_ID",
  "ABRAXAS_STATUS_SIGNER_PUBLIC_JWK",
  "ABRAXAS_STATUS_SIGNER_PRIVATE_JWK",
] as const;

const PRIVATE_ENV_NAMES = new Set([
  "ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PRIVATE_JWK",
  "ABRAXAS_STATUS_SIGNER_PRIVATE_JWK",
]);

export class ProductionSigningAuthorityError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ProductionSigningAuthorityError";
    this.code = code;
  }
}

export type PublicAuthoritySummary = {
  anchor_key_id: string;
  anchor_fingerprint: string;
  status_signer_key_id: string;
  status_signer_fingerprint: string;
  receipt_key_id: string;
  receipt_key_fingerprint: string;
  receipt_key_document_digest: string;
  institutional_approval: "not_approved";
  registry_version_initial: number;
  registry_rotation: "blocked_until_version_advances";
  output_dir: string;
  private_files_retained: string[];
};

function fail(code: string, message: string): never {
  throw new ProductionSigningAuthorityError(code, message);
}

function pathInside(parent: string, child: string): boolean {
  const rel = relative(resolve(parent), resolve(child));
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function assertNoSymlink(target: string): void {
  const resolved = resolve(target);
  const root = parse(resolved).root;
  const parts = resolved.slice(root.length).split(sep).filter(Boolean);
  let current = root;
  for (const part of parts) {
    current = join(current, part);
    if (!existsSync(current)) break;
    if (lstatSync(current).isSymbolicLink()) {
      fail("path_contains_symlink", "Custody path must not traverse a symlink");
    }
  }
}

export function assertCustodyDirectory(
  outputDir: string,
  repositoryRoot = process.cwd(),
  options?: { disposableAllowed?: boolean },
): string {
  if (!isAbsolute(outputDir)) fail("output_path_not_absolute", "Output directory must be an absolute path");
  const resolved = resolve(outputDir);
  assertNoSymlink(resolved);
  if (pathInside(repositoryRoot, resolved)) {
    fail("output_inside_repository", "Output directory must be outside the repository");
  }
  const temp = resolve(process.env.TEMP || process.env.TMP || "/tmp");
  if (!options?.disposableAllowed && pathInside(temp, resolved)) {
    fail("output_disposable_path", "Output directory must be durable storage, not a temp folder");
  }
  if (!existsSync(resolved) || !lstatSync(resolved).isDirectory() || lstatSync(resolved).isSymbolicLink()) {
    fail("output_directory_missing", "Create the custody directory before running the ceremony");
  }
  return resolved;
}

function writeExclusive(path: string, content: string | Buffer, mode: number): void {
  if (existsSync(path)) fail("target_file_exists", `Refusing to overwrite ${path}`);
  const bytes = typeof content === "string" ? Buffer.from(content, "utf8") : content;
  const fd = openSync(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, mode);
  try {
    writeSync(fd, bytes);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  chmodSync(path, mode);
  if (mode === 0o600) restrictToOwner(path);
}

const BROAD_WINDOWS_PRINCIPALS = new Set([
  "everyone",
  "users",
  "authenticated users",
  "s-1-1-0",
  "s-1-5-11",
  "s-1-5-32-545",
]);

function principalIsBroad(principal: string): boolean {
  const normalized = principal.trim().toLowerCase().replace(/^\*/, "");
  const leaf = (normalized.split("\\").at(-1) ?? normalized).replace(/^\*/, "");
  return BROAD_WINDOWS_PRINCIPALS.has(normalized) || BROAD_WINDOWS_PRINCIPALS.has(leaf);
}

export function assertWindowsPrivateFileAcl(filePath: string, icaclsOutput: string, username: string): void {
  const output = icaclsOutput.replaceAll("/", "\\");
  const file = filePath.replaceAll("/", "\\");
  const outputLower = output.toLowerCase();
  const fileLower = file.toLowerCase();
  if (!outputLower.includes(fileLower)) {
    fail("acl_target_mismatch", "Windows ACL output did not describe the private-key file");
  }
  let remainder = "";
  let cursor = 0;
  while (cursor < output.length) {
    const at = outputLower.indexOf(fileLower, cursor);
    if (at < 0) {
      remainder += output.slice(cursor);
      break;
    }
    remainder += output.slice(cursor, at);
    cursor = at + file.length;
  }
  const principals: string[] = [];
  for (const match of remainder.matchAll(/([^\r\n:]+):\([^)\r\n]*\)/g)) {
    const principal = match[1]?.trim();
    if (principal) principals.push(principal);
  }
  const broad = principals.find(principalIsBroad);
  if (broad) {
    fail("acl_broad_principal", `Private-key file grants access to ${broad}`);
  }
  const owner = username.trim().toLowerCase();
  const ownerPresent = principals.some((principal) => {
    const normalized = principal.toLowerCase();
    return normalized === owner || normalized.endsWith(`\\${owner}`);
  });
  if (!ownerPresent) {
    fail("acl_owner_missing", "Private-key file ACL does not include the current Windows user");
  }
}

export function assertPrivateFileRestricted(path: string): void {
  if (process.platform === "win32") {
    const listed = spawnSync("icacls", [path], { encoding: "utf8", windowsHide: true });
    if (listed.status !== 0) {
      fail("acl_unreadable", "Windows could not read the private-key file ACL");
    }
    assertWindowsPrivateFileAcl(path, `${listed.stdout ?? ""}\n${listed.stderr ?? ""}`, userInfo().username);
    return;
  }
  if ((statSync(path).mode & 0o077) !== 0) {
    fail("private_file_permissions", "Private custody file must be readable and writable only by its owner");
  }
}

function restrictToOwner(path: string): void {
  if (process.platform === "win32") {
    const user = userInfo().username;
    const restricted = spawnSync(
      "icacls",
      [path, "/inheritance:r", "/grant:r", `${user}:(R,W)`],
      { encoding: "utf8", windowsHide: true },
    );
    if (restricted.status !== 0) {
      fail("acl_failed", "Windows could not restrict the custody file to the current user");
    }
    for (const principal of [
      "Everyone",
      "Users",
      "Authenticated Users",
      "BUILTIN\\Users",
      "NT AUTHORITY\\Authenticated Users",
      "*S-1-1-0",
      "*S-1-5-11",
      "*S-1-5-32-545",
    ]) {
      spawnSync("icacls", [path, "/remove:g", principal], { encoding: "utf8", windowsHide: true });
    }
  }
  assertPrivateFileRestricted(path);
}

function b64url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

function fromB64url(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

type PublicJwk = { kty: "OKP"; crv: "Ed25519"; x: string };
type PrivateJwk = PublicJwk & { d: string };

function generateIdentity(keyId: string): { keyId: string; privateJwk: PrivateJwk; publicJwk: PublicJwk; fingerprint: string } {
  const pair = nacl.sign.keyPair();
  const seed = pair.secretKey.subarray(0, 32);
  const derived = nacl.sign.keyPair.fromSeed(seed);
  if (!timingSafeEqual(Buffer.from(derived.publicKey), Buffer.from(pair.publicKey))) {
    fail("key_derivation_mismatch", "Ed25519 seed did not reproduce its public key");
  }
  const publicJwk: PublicJwk = { kty: "OKP", crv: "Ed25519", x: b64url(pair.publicKey) };
  const privateJwk: PrivateJwk = { ...publicJwk, d: b64url(seed) };
  assertSeedMatchesPublic(privateJwk, publicJwk);
  const fingerprint = publicEd25519JwkFingerprint(publicJwk);
  if (!fingerprint) fail("fingerprint_failed", `Could not fingerprint ${keyId}`);
  const message = Buffer.from(`abraxas-production-authority-format-check:${keyId}`);
  const signature = nacl.sign.detached(message, pair.secretKey);
  if (!nacl.sign.detached.verify(message, signature, pair.publicKey)) {
    fail("format_check_failed", `Ed25519 sign and verify failed for ${keyId}`);
  }
  return { keyId, privateJwk, publicJwk, fingerprint };
}

function assertSeedMatchesPublic(privateJwk: PrivateJwk, publicJwk: PublicJwk): void {
  if (privateJwk.kty !== "OKP" || privateJwk.crv !== "Ed25519") {
    fail("unexpected_jwk_type", "JWK must be OKP Ed25519");
  }
  if ("d" in publicJwk) fail("public_jwk_has_private", "Public JWK must not contain a private seed");
  const seed = fromB64url(privateJwk.d);
  if (seed.length !== 32) fail("unexpected_seed_length", "Private seed must be 32 bytes");
  const derived = nacl.sign.keyPair.fromSeed(seed);
  if (b64url(derived.publicKey) !== publicJwk.x || privateJwk.x !== publicJwk.x) {
    fail("seed_public_mismatch", "Private seed does not match the public JWK");
  }
}

function assertDistinct(anchorFingerprint: string, statusFingerprint: string): void {
  if (anchorFingerprint === statusFingerprint) fail("fingerprints_not_distinct", "The two new fingerprints match");
  if (anchorFingerprint === RECEIPT_KEY_FINGERPRINT || statusFingerprint === RECEIPT_KEY_FINGERPRINT) {
    fail("fingerprint_matches_receipt_key", "A new fingerprint matches abraxas-primary");
  }
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function requirePassphrase(env: NodeJS.ProcessEnv, argv: readonly string[]): string {
  const passphrase = env[RECOVERY_PASSPHRASE_ENV] ?? "";
  if (passphrase.length < 16) {
    fail("recovery_passphrase_missing", `${RECOVERY_PASSPHRASE_ENV} must be set in the environment and be at least 16 characters`);
  }
  if (argv.some((arg) => arg.includes(passphrase))) {
    fail("passphrase_on_command_line", "Refusing to run because the recovery passphrase was passed as an argument");
  }
  return passphrase;
}

function encryptRecovery(plaintext: Buffer, passphrase: string): Buffer {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = scryptSync(passphrase, salt, 32);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  key.fill(0);
  return Buffer.from(JSON.stringify({
    document: "abraxas_production_signing_recovery",
    version: 1,
    kdf: "scrypt",
    cipher: "aes-256-gcm",
    salt: salt.toString("base64url"),
    iv: iv.toString("base64url"),
    tag: tag.toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
  }));
}

function decryptRecovery(file: Buffer, passphrase: string): Buffer {
  const envelope = JSON.parse(file.toString("utf8")) as {
    salt?: string;
    iv?: string;
    tag?: string;
    ciphertext?: string;
  };
  if (!envelope.salt || !envelope.iv || !envelope.tag || !envelope.ciphertext) {
    fail("recovery_envelope_invalid", "Recovery file is not the expected encrypted envelope");
  }
  const key = scryptSync(passphrase, Buffer.from(envelope.salt, "base64url"), 32);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(envelope.iv, "base64url"));
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64url"));
  try {
    return Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, "base64url")),
      decipher.final(),
    ]);
  } catch {
    key.fill(0);
    fail("recovery_decrypt_failed", "Recovery backup could not be decrypted with the supplied passphrase");
  } finally {
    key.fill(0);
  }
}

export function generateProductionAuthorities(
  outputDir: string,
  repositoryRoot = process.cwd(),
  options?: { disposableAllowed?: boolean },
): PublicAuthoritySummary {
  const dir = assertCustodyDirectory(outputDir, repositoryRoot, options);
  const anchor = generateIdentity(ANCHOR_KEY_ID);
  const status = generateIdentity(STATUS_SIGNER_KEY_ID);
  assertDistinct(anchor.fingerprint, status.fingerprint);

  const bundle = buildTrustAnchorBundleV1({
    anchorKeyId: ANCHOR_KEY_ID,
    anchorPublicJwk: anchor.publicJwk,
    environment: "production",
    effectiveFrom: "2026-11-09T00:00:00.000Z",
    minimumRegistryVersionHint: INITIAL_REGISTRY_VERSION,
  });
  const validated = validateTrustAnchorBundle(bundle);
  if (!validated.ok) fail("trust_pin_invalid", validated.reason);

  const pin = {
    document: "abraxas_production_trust_pin",
    institutional_approval: "not_approved" as const,
    approval_note: "Generating these keys does not approve them as an institutional trust anchor. Pin this public file out of band and record a separate founder approval.",
    environment: "production",
    receipt_key: {
      key_id: RECEIPT_KEY_ID,
      fingerprint: RECEIPT_KEY_FINGERPRINT,
      document_digest: RECEIPT_KEY_DOCUMENT_DIGEST,
      unchanged: true,
    },
    issuer_authority_anchor: {
      key_id: ANCHOR_KEY_ID,
      fingerprint: anchor.fingerprint,
      bundle,
    },
    status_signer: {
      key_id: STATUS_SIGNER_KEY_ID,
      fingerprint: status.fingerprint,
      public_jwk: status.publicJwk,
    },
    relationships: [
      "The issuer anchor signs issuer-authority statements.",
      "Those statements name abraxas-primary as the receipt signing key.",
      "Those statements name abraxas-production-status-signer as the status signer.",
      "The status signer signs current-validity statements.",
      "A verifier pins this anchor out of band and rejects an anchor that arrived only inside a receipt.",
    ],
    registry_version_initial: INITIAL_REGISTRY_VERSION,
    registry_rotation: "blocked_until_version_advances" as const,
    registry_note: "Trust execution currently signs issuer statements at hardcoded registry version 854. The first statement can verify. A later rotation that reuses 854 is not rejected, because verifiers are not given a stored higher minimum. Do not declare the authority operational for rotation until issuance uses a monotonic version.",
  };

  writeExclusive(join(dir, PRIVATE_ANCHOR_FILE), `${JSON.stringify(anchor.privateJwk)}\n`, 0o600);
  writeExclusive(join(dir, PUBLIC_ANCHOR_FILE), `${JSON.stringify(anchor.publicJwk)}\n`, 0o644);
  writeExclusive(join(dir, ANCHOR_KEY_ID_FILE), `${ANCHOR_KEY_ID}\n`, 0o644);
  writeExclusive(join(dir, PRIVATE_STATUS_FILE), `${JSON.stringify(status.privateJwk)}\n`, 0o600);
  writeExclusive(join(dir, PUBLIC_STATUS_FILE), `${JSON.stringify(status.publicJwk)}\n`, 0o644);
  writeExclusive(join(dir, STATUS_KEY_ID_FILE), `${STATUS_SIGNER_KEY_ID}\n`, 0o644);
  writeExclusive(join(dir, PUBLIC_PIN_FILE), `${JSON.stringify(pin, null, 2)}\n`, 0o644);

  return summaryFromFingerprints(dir, anchor.fingerprint, status.fingerprint);
}

function summaryFromFingerprints(dir: string, anchorFingerprint: string, statusFingerprint: string): PublicAuthoritySummary {
  return {
    anchor_key_id: ANCHOR_KEY_ID,
    anchor_fingerprint: anchorFingerprint,
    status_signer_key_id: STATUS_SIGNER_KEY_ID,
    status_signer_fingerprint: statusFingerprint,
    receipt_key_id: RECEIPT_KEY_ID,
    receipt_key_fingerprint: RECEIPT_KEY_FINGERPRINT,
    receipt_key_document_digest: RECEIPT_KEY_DOCUMENT_DIGEST,
    institutional_approval: "not_approved",
    registry_version_initial: INITIAL_REGISTRY_VERSION,
    registry_rotation: "blocked_until_version_advances",
    output_dir: dir,
    private_files_retained: [PRIVATE_ANCHOR_FILE, PRIVATE_STATUS_FILE],
  };
}

export function verifyProductionAuthorities(
  outputDir: string,
  repositoryRoot = process.cwd(),
  options?: { disposableAllowed?: boolean },
): PublicAuthoritySummary {
  const dir = assertCustodyDirectory(outputDir, repositoryRoot, options);
  const anchorPrivate = readJson(join(dir, PRIVATE_ANCHOR_FILE)) as PrivateJwk;
  const anchorPublic = readJson(join(dir, PUBLIC_ANCHOR_FILE)) as PublicJwk;
  const statusPrivate = readJson(join(dir, PRIVATE_STATUS_FILE)) as PrivateJwk;
  const statusPublic = readJson(join(dir, PUBLIC_STATUS_FILE)) as PublicJwk;
  assertSeedMatchesPublic(anchorPrivate, anchorPublic);
  assertSeedMatchesPublic(statusPrivate, statusPublic);
  const anchorFingerprint = publicEd25519JwkFingerprint(anchorPublic);
  const statusFingerprint = publicEd25519JwkFingerprint(statusPublic);
  if (!anchorFingerprint || !statusFingerprint) fail("fingerprint_failed", "Public JWK fingerprint failed");
  assertDistinct(anchorFingerprint, statusFingerprint);
  if (readFileSync(join(dir, ANCHOR_KEY_ID_FILE), "utf8").trim() !== ANCHOR_KEY_ID) {
    fail("unexpected_key_id", "Anchor key id file does not match abraxas-production-issuer-anchor");
  }
  if (readFileSync(join(dir, STATUS_KEY_ID_FILE), "utf8").trim() !== STATUS_SIGNER_KEY_ID) {
    fail("unexpected_key_id", "Status signer key id file does not match abraxas-production-status-signer");
  }
  const pin = readJson(join(dir, PUBLIC_PIN_FILE)) as {
    issuer_authority_anchor?: { bundle?: Parameters<typeof validateTrustAnchorBundle>[0]; fingerprint?: string };
    institutional_approval?: string;
  };
  if (pin.institutional_approval !== "not_approved") {
    fail("approval_overclaim", "The public pin must not claim institutional approval");
  }
  const bundle = pin.issuer_authority_anchor?.bundle;
  if (!bundle) fail("trust_pin_missing", "Public pin is missing the anchor bundle");
  const validated = validateTrustAnchorBundle(bundle);
  if (!validated.ok) fail("trust_pin_invalid", validated.reason);
  if (bundle.environment !== "production" || bundle.public_key_fingerprint !== anchorFingerprint) {
    fail("trust_pin_mismatch", "Public pin fingerprint does not match the anchor public JWK");
  }
  const publicText = [
    readFileSync(join(dir, PUBLIC_ANCHOR_FILE), "utf8"),
    readFileSync(join(dir, PUBLIC_STATUS_FILE), "utf8"),
    readFileSync(join(dir, PUBLIC_PIN_FILE), "utf8"),
  ].join("\n");
  if (publicText.includes(anchorPrivate.d) || publicText.includes(statusPrivate.d)) {
    fail("public_file_contains_secret", "A public custody file contains a private seed");
  }
  return summaryFromFingerprints(dir, anchorFingerprint, statusFingerprint);
}

export function writeEncryptedRecovery(
  outputDir: string,
  env: NodeJS.ProcessEnv = process.env,
  argv: readonly string[] = process.argv,
  repositoryRoot = process.cwd(),
  options?: { disposableAllowed?: boolean },
): string {
  const summary = verifyProductionAuthorities(outputDir, repositoryRoot, options);
  const dir = summary.output_dir;
  const passphrase = requirePassphrase(env, argv);
  const plaintext = Buffer.from(JSON.stringify({
    anchor_private_jwk: readJson(join(dir, PRIVATE_ANCHOR_FILE)),
    status_private_jwk: readJson(join(dir, PRIVATE_STATUS_FILE)),
    anchor_fingerprint: summary.anchor_fingerprint,
    status_signer_fingerprint: summary.status_signer_fingerprint,
  }));
  const encrypted = encryptRecovery(plaintext, passphrase);
  plaintext.fill(0);
  const path = join(dir, RECOVERY_FILE);
  writeExclusive(path, encrypted, 0o600);
  return path;
}

export function restoreCheckRecovery(
  outputDir: string,
  env: NodeJS.ProcessEnv = process.env,
  argv: readonly string[] = process.argv,
  repositoryRoot = process.cwd(),
  options?: { disposableAllowed?: boolean },
): PublicAuthoritySummary {
  const summary = verifyProductionAuthorities(outputDir, repositoryRoot, options);
  const passphrase = requirePassphrase(env, argv);
  const decrypted = decryptRecovery(readFileSync(join(summary.output_dir, RECOVERY_FILE)), passphrase);
  try {
    const payload = JSON.parse(decrypted.toString("utf8")) as {
      anchor_private_jwk: PrivateJwk;
      status_private_jwk: PrivateJwk;
      anchor_fingerprint: string;
      status_signer_fingerprint: string;
    };
    const anchorPublic = readJson(join(summary.output_dir, PUBLIC_ANCHOR_FILE)) as PublicJwk;
    const statusPublic = readJson(join(summary.output_dir, PUBLIC_STATUS_FILE)) as PublicJwk;
    assertSeedMatchesPublic(payload.anchor_private_jwk, anchorPublic);
    assertSeedMatchesPublic(payload.status_private_jwk, statusPublic);
    if (
      payload.anchor_fingerprint !== summary.anchor_fingerprint
      || payload.status_signer_fingerprint !== summary.status_signer_fingerprint
    ) {
      fail("recovery_fingerprint_mismatch", "Decrypted backup fingerprints do not match the public files");
    }
    return summary;
  } finally {
    decrypted.fill(0);
  }
}

export function restorePrivateFiles(
  outputDir: string,
  env: NodeJS.ProcessEnv = process.env,
  argv: readonly string[] = process.argv,
  repositoryRoot = process.cwd(),
  options?: { disposableAllowed?: boolean },
): PublicAuthoritySummary {
  const dir = assertCustodyDirectory(outputDir, repositoryRoot, options);
  const anchorPath = join(dir, PRIVATE_ANCHOR_FILE);
  const statusPath = join(dir, PRIVATE_STATUS_FILE);
  if (existsSync(anchorPath) && existsSync(statusPath)) {
    fail("private_files_present", "Private files are still present. Run restore-check instead of replacing them.");
  }
  const passphrase = requirePassphrase(env, argv);
  const decrypted = decryptRecovery(readFileSync(join(dir, RECOVERY_FILE)), passphrase);
  try {
    const payload = JSON.parse(decrypted.toString("utf8")) as {
      anchor_private_jwk: PrivateJwk;
      status_private_jwk: PrivateJwk;
    };
    const anchorPublic = readJson(join(dir, PUBLIC_ANCHOR_FILE)) as PublicJwk;
    const statusPublic = readJson(join(dir, PUBLIC_STATUS_FILE)) as PublicJwk;
    assertSeedMatchesPublic(payload.anchor_private_jwk, anchorPublic);
    assertSeedMatchesPublic(payload.status_private_jwk, statusPublic);
    if (!existsSync(anchorPath)) {
      writeExclusive(anchorPath, `${JSON.stringify(payload.anchor_private_jwk)}\n`, 0o600);
    }
    if (!existsSync(statusPath)) {
      writeExclusive(statusPath, `${JSON.stringify(payload.status_private_jwk)}\n`, 0o600);
    }
  } finally {
    decrypted.fill(0);
  }
  return verifyProductionAuthorities(outputDir, repositoryRoot, options);
}

export function formatPublicSummary(summary: PublicAuthoritySummary): string {
  return [
    "institutional_approval: not_approved",
    `anchor_key_id: ${summary.anchor_key_id}`,
    `anchor_fingerprint: ${summary.anchor_fingerprint}`,
    `status_signer_key_id: ${summary.status_signer_key_id}`,
    `status_signer_fingerprint: ${summary.status_signer_fingerprint}`,
    `receipt_key_id: ${summary.receipt_key_id}`,
    `receipt_key_fingerprint: ${summary.receipt_key_fingerprint}`,
    `receipt_key_document_digest: ${summary.receipt_key_document_digest}`,
    `registry_version_initial: ${summary.registry_version_initial}`,
    `registry_rotation: ${summary.registry_rotation}`,
    "private files were retained. Keep them until restore-check passes and a second encrypted copy exists.",
    `output_dir: ${summary.output_dir}`,
  ].join("\n");
}

export function assertVercelScopeLists(input: { production: string; preview: string; demo: string }): void {
  for (const name of PRODUCTION_ENV_NAMES) {
    if (!input.production.includes(name)) fail("production_secret_missing", `${name} is not listed for Production`);
    if (input.preview.includes(name) || input.demo.includes(name)) {
      fail("secret_outside_production", `${name} is listed outside Production`);
    }
  }
  for (const name of PRIVATE_ENV_NAMES) {
    const line = input.production.split(/\r?\n/).find((entry) => entry.includes(name)) ?? "";
    if (line.includes("\"d\"") || line.includes("{")) {
      fail("vercel_list_leaked_secret", "Vercel list output included private material. Stop and treat that output as sensitive.");
    }
  }
}

export type CommandResult = { status: number | null; stdout: string; stderr: string };
export type CommandRunner = (command: string, args: readonly string[], input: string) => CommandResult;

const INSTALL_PLAN = [
  { name: "ABRAXAS_ISSUER_AUTHORITY_ANCHOR_KEY_ID", file: ANCHOR_KEY_ID_FILE, type: "config" },
  { name: "ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PUBLIC_JWK", file: PUBLIC_ANCHOR_FILE, type: "secret" },
  { name: "ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PRIVATE_JWK", file: PRIVATE_ANCHOR_FILE, type: "secret" },
  { name: "ABRAXAS_STATUS_SIGNER_KEY_ID", file: STATUS_KEY_ID_FILE, type: "config" },
  { name: "ABRAXAS_STATUS_SIGNER_PUBLIC_JWK", file: PUBLIC_STATUS_FILE, type: "secret" },
  { name: "ABRAXAS_STATUS_SIGNER_PRIVATE_JWK", file: PRIVATE_STATUS_FILE, type: "secret" },
] as const;

export function redactCommandOutput(text: string): string {
  const safe: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line) continue;
    if (line.includes("{") || line.includes("\"d\"") || line.includes("-----BEGIN")) {
      fail("command_output_leaked_secret", "A command printed private material. Stop and clear that terminal scrollback.");
    }
    safe.push(line);
  }
  return safe.join("\n");
}

function readInstallValue(dir: string, file: string): string {
  const value = readFileSync(join(dir, file), "utf8").trim();
  if (!value || value.includes("\n") || value.includes("\r")) {
    fail("install_value_invalid", `${file} must be a single line`);
  }
  return value;
}

export function installProductionSecrets(
  outputDir: string,
  runner: CommandRunner,
  repositoryRoot = process.cwd(),
  options?: { disposableAllowed?: boolean },
): string[] {
  const summary = verifyProductionAuthorities(outputDir, repositoryRoot, options);
  const saved: string[] = [];
  for (const item of INSTALL_PLAN) {
    const value = readInstallValue(summary.output_dir, item.file);
    const args = ["env", "add", item.name, "--environment", "production", "--type", item.type, "--yes"] as const;
    if (args.join(" ").includes(value)) fail("install_value_in_arguments", "Refusing to pass a secret on the command line");
    const result = runner("vercel", args, value);
    redactCommandOutput(result.stdout);
    redactCommandOutput(result.stderr);
    if (result.status !== 0) {
      fail("vercel_env_add_failed", `${item.name} was not saved. This tool does not overwrite an existing variable.`);
    }
    saved.push(item.name);
  }
  return saved;
}

export function verifyVercelScopes(runner: CommandRunner): void {
  const listings: { production?: string; preview?: string; demo?: string } = {};
  for (const environment of ["production", "preview", "demo"] as const) {
    const args = ["env", "ls", "--environment", environment] as const;
    const result = runner("vercel", args, "");
    redactCommandOutput(result.stdout);
    redactCommandOutput(result.stderr);
    if (result.status !== 0) fail("vercel_env_ls_failed", `Could not list the ${environment} environment`);
    listings[environment] = result.stdout;
  }
  assertVercelScopeLists({
    production: listings.production ?? "",
    preview: listings.preview ?? "",
    demo: listings.demo ?? "",
  });
}
