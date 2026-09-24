import { spawn } from "node:child_process";
import nacl from "tweetnacl";

const port = 3199;
const seed = Buffer.alloc(32, 7); // CI fixture only, never a deployed signing key.
const verifier = `0x${Buffer.from(nacl.sign.keyPair.fromSeed(seed).publicKey).toString("hex")}`;
const keyId = "cask_0123456789abcdef01234567";
const registry = [{
  key_id: keyId, algorithm: "ed25519", public_verifier: verifier,
  environment: "sandbox", allowed_networks: ["solana_devnet"],
  allowed_gate_types: ["solana"], schema_versions: ["2"], status: "active",
  reason_class: "active", issued_at: "2020-01-01T00:00:00.000Z",
  not_before: "2020-01-01T00:00:00.000Z", expires_at: "2099-01-01T00:00:00.000Z",
}];
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
  env: {
    ...process.env,
    ABRAXAS_RUNTIME_ENVIRONMENT: "sandbox",
    ABRAXAS_SOLANA_ATTESTATION_PRIVATE_KEY: seed.toString("hex"),
    ABRAXAS_SOLANA_ATTESTATION_SIGNER_KEY_ID: keyId,
    ABRAXAS_CHAIN_ATTESTATION_SIGNER_REGISTRY: JSON.stringify(registry),
    NEXT_PUBLIC_SUPABASE_URL: "https://placeholder.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ci-placeholder",
    SUPABASE_SERVICE_ROLE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ci-placeholder",
    NEXTAUTH_SECRET: "ci-build-placeholder-secret",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
child.stdout.on("data", (chunk) => { output += chunk.toString(); });
child.stderr.on("data", (chunk) => { output += chunk.toString(); });
try {
  let response;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`next_start_exited: ${output}`);
    try {
      response = await fetch(`http://127.0.0.1:${port}/api/chain-attestations/verification-keys/solana`);
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  if (!response) throw new Error(`next_start_timeout: ${output}`);
  const body = await response.json();
  if (response.status !== 200 || body.keys?.[0]?.key_id !== keyId || body.keys?.[0]?.public_verifier !== verifier) {
    throw new Error(`bundled_route_failed: ${response.status} ${JSON.stringify(body)} ${output}`);
  }
  console.log("Bundled Solana verification-key route: 200, expected public signer");
} finally {
  child.kill();
  seed.fill(0);
}
