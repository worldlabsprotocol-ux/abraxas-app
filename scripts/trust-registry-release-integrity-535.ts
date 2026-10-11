#!/usr/bin/env npx tsx
/**
 * Build #535 Phase 1 — release integrity (artifact, keypair pubkey, IDL digest).
 * Never reads or prints private key bytes.
 */
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { ABRAXAS_TRUST_REGISTRY_PROGRAM_ID } from "@/lib/solana/trustRegistry/constants";
import { buildTrustRegistryIdl535, trustRegistryIdlDiscriminatorManifest535 } from "@/lib/solana/trustRegistry/idl/buildTrustRegistryIdl";

const ROOT = "/workspace/solana/abraxas-eligibility-gate";
const SO = `${ROOT}/target/deploy/abraxas_trust_registry.so`;
const KEYPAIR = `${ROOT}/target/deploy/abraxas_trust_registry-keypair.json`;
const ARTIFACT = `${ROOT}/release/trust-registry-v534.artifact.json`;
const IDL_COMMIT = `${ROOT}/idl/abraxas_trust_registry.json`;
const IDL_TARGET = `${ROOT}/target/idl/abraxas_trust_registry.json`;
const EXPECTED_DIGEST = "fc7780abd4f413505cb04fd0323fb958649311aa8d8ac8899e302fd3ded5b986";

function sha256File(path: string): string | null {
  if (!existsSync(path)) return null;
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function sha256Json(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function toolchainVersions() {
  let solana = "unknown";
  let rustc = "unknown";
  try {
    solana = execSync("solana --version", { encoding: "utf8" }).trim();
  } catch {
    /* ignore */
  }
  try {
    rustc = execSync("rustc --version", { encoding: "utf8" }).trim();
  } catch {
    /* ignore */
  }
  return { solana, rustc, anchor_crate: "0.30.1" };
}

async function main() {
  mkdirSync(`${ROOT}/idl`, { recursive: true });
  mkdirSync(`${ROOT}/target/idl`, { recursive: true });

  const idl = buildTrustRegistryIdl535();
  writeFileSync(IDL_COMMIT, `${JSON.stringify(idl, null, 2)}\n`);
  copyFileSync(IDL_COMMIT, IDL_TARGET);

  const digest = sha256File(SO);
  const artifact = existsSync(ARTIFACT) ? JSON.parse(readFileSync(ARTIFACT, "utf8")) : null;
  let programPubkey: string | null = null;
  if (existsSync(KEYPAIR)) {
    programPubkey = execSync(`solana-keygen pubkey "${KEYPAIR}"`, { encoding: "utf8" }).trim();
  }

  const report = {
    schema: "trust_registry_release_integrity_v535",
    integration_base_sha: "71ac9efa6efa92f652d54a99ea974aba23bfd2ed",
    program_id: ABRAXAS_TRUST_REGISTRY_PROGRAM_ID,
    elf_sha256: digest,
    expected_elf_sha256: EXPECTED_DIGEST,
    digest_match: digest === EXPECTED_DIGEST && artifact?.elf_sha256 === EXPECTED_DIGEST,
    program_keypair_pubkey: programPubkey,
    program_id_keypair_match: programPubkey === ABRAXAS_TRUST_REGISTRY_PROGRAM_ID,
    idl_path_committed: IDL_COMMIT,
    idl_sha256: sha256Json(idl),
    idl_discriminators: trustRegistryIdlDiscriminatorManifest535(),
    idl_generation: "compilation_method_substitute_anchor_idl_build_blocked_in_ci",
    toolchain: toolchainVersions(),
    status: digest === EXPECTED_DIGEST && programPubkey === ABRAXAS_TRUST_REGISTRY_PROGRAM_ID ? "pass" : "fail",
  };

  const out = "/opt/cursor/artifacts/trust-registry-release-integrity-v535.json";
  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (report.status !== "pass") process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
