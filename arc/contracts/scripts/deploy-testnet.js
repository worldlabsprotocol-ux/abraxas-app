// FILE: arc/contracts/scripts/deploy-testnet.js
// Deploy ProofGatedSettlement to Arc Testnet. Operator run only.

const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const signerAddress = process.env.ABRAXAS_SETTLEMENT_SIGNER_ADDRESS ?? deployer.address;

  const token = process.env.ARC_TESTNET_USDC_TOKEN_ADDRESS
    ?? "0x3600000000000000000000000000000000000000";
  const recipient = process.env.ARC_TESTNET_SETTLEMENT_RECIPIENT;
  if (!recipient) {
    throw new Error("ARC_TESTNET_SETTLEMENT_RECIPIENT is required");
  }

  const Settlement = await hre.ethers.getContractFactory("ProofGatedSettlement");
  const settlement = await Settlement.deploy(true, signerAddress, token, recipient);
  await settlement.waitForDeployment();

  const address = await settlement.getAddress();
  console.log("ProofGatedSettlement deployed:", address);
  console.log("Arc Testnet chain ID:", 5042002);
  console.log("Initial authorized signer:", signerAddress);
  console.log("Set ABRAXAS_SETTLEMENT_SIGNER_ADDRESS and ARC_TESTNET_SETTLEMENT_CONTRACT_ADDRESS in server env.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
