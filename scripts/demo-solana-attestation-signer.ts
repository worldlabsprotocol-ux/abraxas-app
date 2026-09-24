import { readFileSync } from "node:fs";
import { checkDemoSolanaSignerDocument, DEMO_SOLANA_SIGNER_URL, provisionDemoSolanaSigner } from "../lib/partner/chainAttestationSignerLifecycle/demoSolanaProvision";

async function main() {
  const [command, path] = process.argv.slice(2);
  if (!path || !["generate", "check"].includes(command)) throw new Error("usage: demo-solana-attestation-signer <generate|check> <absolute-outside-repo-json-path>");
  if (command === "generate") {
    const publicView = provisionDemoSolanaSigner(path);
    process.stdout.write(`${JSON.stringify({ ok: true, output_path: path, ...publicView, next: "Set the three signer env values from the local file in DEMO Vercel only, redeploy DEMO, then run check." })}\n`);
    return;
  }
  const local = JSON.parse(readFileSync(path, "utf8")) as Record<string, string>;
  const registry = JSON.parse(local.ABRAXAS_CHAIN_ATTESTATION_SIGNER_REGISTRY ?? "null");
  if (!Array.isArray(registry) || registry.length !== 1 || registry[0].key_id !== local.ABRAXAS_SOLANA_ATTESTATION_SIGNER_KEY_ID) throw new Error("invalid_local_record");
  const response = await fetch(DEMO_SOLANA_SIGNER_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`public_endpoint_${response.status}`);
  const reason = checkDemoSolanaSignerDocument(await response.json(), { key_id: registry[0].key_id, public_verifier: registry[0].public_verifier });
  process.stdout.write(`${JSON.stringify({ ok: reason === null, reason, key_id: registry[0].key_id })}\n`);
  if (reason) process.exitCode = 1;
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "signer_check_failed"}\n`);
  process.exitCode = 1;
});
