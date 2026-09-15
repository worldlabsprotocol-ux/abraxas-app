// FILE: arc/contracts/scripts/deploy-testnet.js
// Deploy ProofGatedSettlement to Arc Testnet. Operator run only.

const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const signerAddress = process.env.ABRAXAS_SETTLEMENT_SIGNER_ADDRESS ?? deployer.address;

  const Settlement = await hre.ethers.getContractFactory("ProofGatedSettlement");
  const settlement = await Settlement.deploy(true, signerAddress);
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
