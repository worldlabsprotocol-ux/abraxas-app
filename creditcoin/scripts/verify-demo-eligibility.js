const { ethers } = require("hardhat");
const { chainInfo, proofProvider } = require("@gluwa/usc-sdk");

async function main() {
  const chainKey = Number(process.env.SOURCE_CHAIN_KEY || "0");
  const sourceTxHash = process.env.SOURCE_TX_HASH;
  const uscAddress = process.env.ELIGIBILITY_USC_ADDRESS;
  const proofBuilderUrl = process.env.CREDITCOIN_PROOF_BUILDER_URL;
  const sourceRpcUrl = process.env.SEPOLIA_RPC_URL || "https://sepolia-proxy-rpc.creditcoin.network";

  if (!chainKey) throw new Error("Set SOURCE_CHAIN_KEY");
  if (!ethers.isHexString(sourceTxHash, 32)) throw new Error("Set SOURCE_TX_HASH");
  if (!ethers.isAddress(uscAddress)) throw new Error("Set ELIGIBILITY_USC_ADDRESS");
  if (!proofBuilderUrl) throw new Error("Set CREDITCOIN_PROOF_BUILDER_URL from the current official Creditcoin environment");

  const sourceProvider = new ethers.JsonRpcProvider(sourceRpcUrl, 11155111, { staticNetwork: true });
  const sourceReceipt = await sourceProvider.getTransactionReceipt(sourceTxHash);
  if (!sourceReceipt) throw new Error("Source transaction receipt not found");

  const creditcoinProvider = ethers.provider;
  const info = new chainInfo.PrecompileChainInfoProvider(creditcoinProvider);
  await info.waitUntilHeightAttested(chainKey, sourceReceipt.blockNumber);

  const builder = new proofProvider.service.ProofBuilder(chainKey, proofBuilderUrl);
  const result = await builder.getProof(sourceTxHash);
  if (!result.success || !result.data) {
    throw new Error(`Proof generation failed: ${result.error || "unknown error"}`);
  }

  const proof = result.data;
  const usc = await ethers.getContractAt("AbraxasEligibilityUSC", uscAddress);
  const subjectHash = await usc.verifyAndRecord.staticCall(
    proof.chainKey,
    proof.headerNumber,
    proof.txBytes,
    proof.merkleProof,
    proof.continuityProof
  );
  const tx = await usc.verifyAndRecord(
    proof.chainKey,
    proof.headerNumber,
    proof.txBytes,
    proof.merkleProof,
    proof.continuityProof
  );
  await tx.wait();

  const policyHash = ethers.id(process.env.DEMO_POLICY_ID || "abraxas-rwa-us-v1");
  console.log(JSON.stringify({
    creditcoinTransactionHash: tx.hash,
    sourceTransactionHash: sourceTxHash,
    subjectHash,
    policyHash,
    eligible: await usc.isEligible(subjectHash, policyHash),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
