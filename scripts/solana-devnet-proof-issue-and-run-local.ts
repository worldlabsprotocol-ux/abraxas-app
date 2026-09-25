#!/usr/bin/env npx tsx
// Ubuntu operator only: read-only precheck, authenticated issuance, then local devnet proof.
// No API key or signed attestation is printed or committed.
import { chmodSync, mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, isAbsolute } from "node:path";
import { spawnSync } from "node:child_process";
import { automatedEnvironmentForbidden } from "@/lib/partner/testnetGateDeploymentKit/deploy";

export const INSTITUTIONAL_DEVNET_ISSUANCE = {
  action_type: "activate_protocol_access",
  action_scope: "sandbox:protocol_access",
  network_id: "solana_devnet",
  wallet_binding_mode: "required",
} as const;

function localScript(script: string, args: string[], capture = false) {
  return spawnSync("npx", ["tsx", script, ...args], {
    cwd: process.cwd(), env: process.env, shell: false,
    stdio: capture ? ["inherit", "pipe", "pipe"] as const : "inherit",
    encoding: "utf8", timeout: 120_000, maxBuffer: 65536,
  });
}

async function main(): Promise<void> {
  const fail = (reason: string): never => {
    process.stderr.write(`${reason}\n`);
    process.exit(1);
  };
  const args = process.argv.slice(2);
  if (args.length !== 5 || args[3] !== "--ownership-reviewed" || args[4] !== "--confirm") {
    process.stderr.write("usage: npx tsx scripts/solana-devnet-proof-issue-and-run-local.ts <receipt-id> <deployment-ref> <public-signer-document.json> --ownership-reviewed --confirm\n");
    process.exit(2);
  }
  if (process.platform !== "linux" || automatedEnvironmentForbidden() || !process.stdin.isTTY || !process.stdout.isTTY) {
    fail("interactive_ubuntu_only");
  }
  const [receiptId, deploymentRef, signerDocument] = args;
  if (!receiptId || receiptId.length > 128 || !deploymentRef || deploymentRef.length > 128
    || !isAbsolute(signerDocument)) fail("invalid_input");
  const applicationId = process.env.ABRAXAS_GATE_APPLICATION_ID?.trim() ?? "";
  const key = process.env.ABRAXAS_SANDBOX_PARTNER_API_KEY?.trim() ?? "";
  if (!applicationId || !/^abx_test_[A-Za-z0-9_-]+$/.test(key)) fail("missing_sandbox_partner_key_or_application");
  if (!process.env.ABRAXAS_GATE_ADMIN_KEYPAIR_PATH) fail("missing_admin_keypair_path");

  // Fail before consuming a server nonce if the reviewed chain state is unavailable.
  const precheck = localScript("scripts/solana-protocol-access-postcheck.ts", [signerDocument], true);
  if (precheck.error || precheck.status !== 0) fail("deployment_postcheck_failed");
  let precheckJson: { ok?: boolean; config_digest?: string };
  try { precheckJson = JSON.parse(precheck.stdout ?? ""); } catch { fail("deployment_postcheck_failed"); }
  if (precheckJson.ok !== true || precheckJson.config_digest !== "0xdccb2101a22ce8affbcde3b5923cea06ffe6225ceb72f368e83ff796cc1c6103") {
    fail("deployment_postcheck_failed");
  }

  let response: Response;
  try {
    response = await fetch("https://demo.abraxasworld.xyz/api/v1/chain-attestations", {
      method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(20_000),
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ receipt_id: receiptId, deployment_ref: deploymentRef,
        application_id: applicationId, ...INSTITUTIONAL_DEVNET_ISSUANCE,
        ...(process.env.ABRAXAS_GATE_WALLET_BINDING_HASH?.trim()
          ? { wallet_binding_hash: process.env.ABRAXAS_GATE_WALLET_BINDING_HASH.trim() } : {}),
      }),
    });
  } catch { fail("issuance_unavailable"); }
  if (!response.ok) {
    let reason = "unavailable";
    try {
      const denied = await response.json() as Record<string, unknown>;
      if (typeof denied.reason === "string" && /^[a-z_]{1,64}$/.test(denied.reason)) reason = denied.reason;
    } catch { /* Keep the status without exposing response content. */ }
    fail(`issuance_http_${response.status}_${reason}`);
  }
  let result: Record<string, unknown>;
  try { result = await response.json() as Record<string, unknown>; } catch { fail("issuance_invalid_response"); }
  if (result.allowed !== true || result.encoding !== "solana"
    || typeof result.solana_message !== "string" || !/^0x[0-9a-fA-F]{936}$/.test(result.solana_message)
    || typeof result.solana_signature !== "string" || !/^0x[0-9a-fA-F]{128}$/.test(result.solana_signature)) {
    fail("issuance_invalid_response");
  }

  const temp = mkdtempSync(join(tmpdir(), "abraxas-devnet-proof-"));
  chmodSync(temp, 0o700);
  const attestationPath = join(temp, "issued-attestation.json");
  try {
    writeFileSync(attestationPath, JSON.stringify({
      solana_message: result.solana_message, solana_signature: result.solana_signature,
    }), { flag: "wx", mode: 0o600 });
    const run = localScript("scripts/solana-devnet-proof-run-local.ts", [
      attestationPath, signerDocument, "--ownership-reviewed", "--confirm",
    ]);
    if (run.error || run.status !== 0) process.exitCode = 1;
  } finally {
    unlinkSync(attestationPath);
    rmdirSync(temp);
  }
}

void main().catch(() => {
  process.stderr.write("proof_issuance_or_run_failed; inspect devnet state before retrying\n");
  process.exitCode = 1;
});

