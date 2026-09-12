const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const issuer = process.env.ABRAXAS_ISSUER_ADDRESS || deployer.address;
  const Factory = await ethers.getContractFactory("SourceEligibilityRegistry");
  const registry = await Factory.deploy(issuer);
  await registry.waitForDeployment();
  console.log(JSON.stringify({
    network: "sepolia",
    deployer: deployer.address,
    issuer,
    sourceRegistry: await registry.getAddress(),
    transactionHash: registry.deploymentTransaction().hash,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
