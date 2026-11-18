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

// 2) Run execute_harness_run against pinned local RPC (wallet + authorized issuer)
//    Use scripts/proof-continuity-studio-execute.ts with prepared.receipt_id

// 3) Confirm with real RPC account fetch + independent verification
const confirm = await fetch("/api/launchpad/applications/${applicationId}/blockchain-native-execution", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    phase: "confirm",
    portable_receipt: prepared.portable_receipt,
    transaction_signature: "<finalized_solana_signature>",
  }),
});
const bundle = await confirm.json();
console.log(bundle.independent_verification, bundle.chain_status_version);`;
}