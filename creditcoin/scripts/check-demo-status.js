const { ethers } = require("hardhat");
const { proofProvider } = require("@gluwa/usc-sdk");

async function main() {
  const chainKey = Number(process.env.SOURCE_CHAIN_KEY || "0");
  const sourceTxHash = process.env.SOURCE_TX_HASH;
  const uscAddress = process.env.ELIGIBILITY_USC_ADDRESS;
  const proofBuilderUrl = process.env.CREDITCOIN_PROOF_BUILDER_URL;

  if (!chainKey) throw new Error("Set SOURCE_CHAIN_KEY");
  if (!ethers.isHexString(sourceTxHash, 32)) throw new Error("Set SOURCE_TX_HASH");
  if (!ethers.isAddress(uscAddress)) throw new Error("Set ELIGIBILITY_USC_ADDRESS");
  if (!proofBuilderUrl) throw new Error("Set CREDITCOIN_PROOF_BUILDER_URL");

  const builder = new proofProvider.service.ProofBuilder(chainKey, proofBuilderUrl);
  const result = await builder.getProof(sourceTxHash);
  if (!result.success || !result.data) {
    throw new Error(`Proof lookup failed: ${result.error || "unknown error"}`);
  }

  const proof = result.data;
  const usc = await ethers.getContractAt("AbraxasEligibilityUSC", uscAddress);
  const verifier = await ethers.getContractAt("INativeQueryVerifier", await usc.verifier());
  const transactionIndex = await verifier.calculateTxIndex(proof.merkleProof);
  const transactionKey = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint64", "uint64", "uint64"],
      [proof.chainKey, proof.headerNumber, transactionIndex]
    )
  );
  const subjectHash = ethers.id(process.env.DEMO_SUBJECT_ID || "abraxas-demo-pairwise-holder-001");
  const policyHash = ethers.id(process.env.DEMO_POLICY_ID || "abraxas-rwa-us-v1");
  const alreadyProcessed = await usc.processedTransactions(transactionKey);

  console.log(JSON.stringify({
    sourceTransactionHash: sourceTxHash,
    transactionKey,
    replayProtected: alreadyProcessed,
    eligible: await usc.isEligible(subjectHash, policyHash),
  }, null, 2));

  if (!alreadyProcessed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
