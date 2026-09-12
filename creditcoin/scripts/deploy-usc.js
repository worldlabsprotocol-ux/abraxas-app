const { ethers } = require("hardhat");

const PRECOMPILE = "0x0000000000000000000000000000000000000FD2";

async function main() {
  const sourceChainKey = BigInt(process.env.SOURCE_CHAIN_KEY || "0");
  const sourceRegistry = process.env.SOURCE_REGISTRY_ADDRESS;
  if (sourceChainKey === 0n) throw new Error("Set SOURCE_CHAIN_KEY to the value reported by Creditcoin ChainInfo");
  if (!ethers.isAddress(sourceRegistry)) throw new Error("Set SOURCE_REGISTRY_ADDRESS");

  const [deployer] = await ethers.getSigners();
  const Factory = await ethers.getContractFactory("AbraxasEligibilityUSC");
  const usc = await Factory.deploy(PRECOMPILE, sourceChainKey, sourceRegistry);
  await usc.waitForDeployment();
  console.log(JSON.stringify({
    network: "creditcoin-usc-testnet",
    deployer: deployer.address,
    verifier: PRECOMPILE,
    sourceChainKey: sourceChainKey.toString(),
    sourceRegistry,
    eligibilityUsc: await usc.getAddress(),
    transactionHash: usc.deploymentTransaction().hash,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
