export function testnetGateDeploymentExample(): string {
  return `// Server/CLI only. Never call deploy from a browser, API route, Vercel, or CI.
// npx tsx scripts/abraxas-gate.ts plan evm
// npx tsx scripts/abraxas-gate.ts deploy evm-testnet --confirm
// npx tsx scripts/abraxas-gate.ts plan institutional-evm-sepolia
// npx tsx scripts/abraxas-gate.ts plan institutional-solana-devnet
// npx tsx scripts/abraxas-gate.ts validate-plan ./plan.json
// npx tsx scripts/abraxas-gate.ts deploy institutional-evm-sepolia --confirm
// npx tsx scripts/abraxas-gate.ts verify ./deployment-manifest.json
// npx tsx scripts/abraxas-gate.ts register ./deployment-manifest.json
export const TESTNET_GATE_COMMANDS = [
  "abraxas-gate plan solana",
  "abraxas-gate plan evm",
  "abraxas-gate deploy solana-devnet --confirm",
  "abraxas-gate deploy evm-testnet --confirm",
  "abraxas-gate plan institutional-evm-sepolia",
  "abraxas-gate plan institutional-solana-devnet",
  "abraxas-gate validate-plan ./plan.json",
  "abraxas-gate deploy institutional-evm-sepolia --confirm",
  "abraxas-gate deploy institutional-solana-devnet --confirm",
];
`;
}
