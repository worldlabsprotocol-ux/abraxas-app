export function blockchainNativeStudioServerExample(applicationId = "your-application-id"): string {
  return `// Blockchain-native Integration Studio (prepare → on-chain execute → confirm)

// 1) Prepare portable receipt + PDA targets (Launchpad session cookie required)
const prepare = await fetch("/api/launchpad/applications/${applicationId}/blockchain-native-execution", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ phase: "prepare", scenario_id: "approved" }),
});
const prepared = await prepare.json();

// 2) Build unsigned transaction (issuer Ed25519 + execute_harness_run)
const built = await fetch("/api/launchpad/applications/${applicationId}/blockchain-native-execution", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    phase: "build_transaction",
    prepare_token: prepared.prepare_token,
    holder_wallet_address: prepared.holder_wallet,
  }),
});

// 3) Wallet signs and sends, then confirm with finalized signature
const confirm = await fetch("/api/launchpad/applications/${applicationId}/blockchain-native-execution", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    phase: "confirm",
    prepare_token: prepared.prepare_token,
    holder_wallet_address: prepared.holder_wallet,
    transaction_signature: "<finalized_solana_signature>",
  }),
});
const bundle = await confirm.json();
console.log(bundle.independent_verification, bundle.chain_status_version);`;
}