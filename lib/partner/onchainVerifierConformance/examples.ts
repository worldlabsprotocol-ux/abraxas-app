export function onchainVerifierConformanceExample(): string {
  return `
# Verify your gate integration locally. Never from the browser.
npm run abraxas-conformance -- vectors
npm run abraxas-conformance -- evm ./deployment-manifest.json
npm run abraxas-conformance -- solana ./deployment-manifest.json
npm run abraxas-conformance -- report ./deployment-manifest.json

# Sequence
# 1. Download verifier package
# 2. Run conformance locally
# 3. Fix any failed binding or stale signer
# 4. Request a fresh sandbox attestation
`.trim();
}
