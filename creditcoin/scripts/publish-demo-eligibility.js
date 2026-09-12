const { ethers } = require("hardhat");

async function main() {
  const registryAddress = process.env.SOURCE_REGISTRY_ADDRESS;
  if (!ethers.isAddress(registryAddress)) throw new Error("Set SOURCE_REGISTRY_ADDRESS");

  const receiptHash = ethers.id(process.env.DEMO_RECEIPT_ID || "abraxas-demo-receipt-001");
  const subjectHash = ethers.id(process.env.DEMO_SUBJECT_ID || "abraxas-demo-pairwise-holder-001");
  const policyHash = ethers.id(process.env.DEMO_POLICY_ID || "abraxas-rwa-us-v1");
  const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 24 * 60 * 60);

  const registry = await ethers.getContractAt("SourceEligibilityRegistry", registryAddress);
  const tx = await registry.publishEligibility(
    receiptHash,
    subjectHash,
    policyHash,
    expiresAt,
    true
  );
  const receipt = await tx.wait();
  console.log(JSON.stringify({
    sourceTransactionHash: tx.hash,
    sourceBlockHeight: receipt.blockNumber,
    receiptHash,
    subjectHash,
    policyHash,
    expiresAt: expiresAt.toString(),
    approved: true,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
