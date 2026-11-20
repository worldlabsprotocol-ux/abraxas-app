import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

export type StructuralVerifyOutcome =
  | { ok: true; stdout: string; source: "cargo_partner_verify" }
  | { ok: false; reason: string; stdout?: string };

export function canRunPartnerVerifyBinary(): boolean {
  const manifest = join(process.cwd(), "solana/abraxas-eligibility-gate/integration-tests/Cargo.toml");
  return existsSync(manifest) && Boolean(process.env.CARGO_HOME || process.env.HOME);
}

export function runPartnerVerifyAuthorizedArtifact(): StructuralVerifyOutcome {
  if (!canRunPartnerVerifyBinary()) {
    return { ok: false, reason: "partner_verify_not_available_in_this_runtime" };
  }
  const result = spawnSync(
    "cargo",
    ["run", "--quiet", "--bin", "partner-verify", "authorized"],
    {
      cwd: join(process.cwd(), "solana/abraxas-eligibility-gate"),
      encoding: "utf8",
      timeout: 120_000,
      env: { ...process.env, PARTNER_VERIFY_RPC_URL: "" },
    },
  );
  if (result.status !== 0) {
    return {
      ok: false,
      reason: "partner_verify_structural_failed",
      stdout: `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim(),
    };
  }
  const stdout = `${result.stdout ?? ""}`.trim();
  if (!stdout.includes("Structural verification") && !stdout.includes("structural/semantic PASS")) {
    return { ok: false, reason: "partner_verify_unexpected_output", stdout };
  }
  if (stdout.includes("authenticated on-chain PASS")) {
    return { ok: false, reason: "mislabeled_chain_proof_in_programtest", stdout };
  }
  return { ok: true, stdout, source: "cargo_partner_verify" };
}