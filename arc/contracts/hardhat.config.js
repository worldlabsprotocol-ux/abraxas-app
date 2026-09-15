require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env.local") });

const ARC_TESTNET_CHAIN_ID = 5042002;
const accounts = process.env.ARC_DEPLOYER_PRIVATE_KEY
  ? [process.env.ARC_DEPLOYER_PRIVATE_KEY]
  : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "paris",
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: ARC_TESTNET_CHAIN_ID,
    },
    arcTestnet: {
      url: process.env.ARC_TESTNET_RPC_URL || "https://rpc.testnet.arc.network",
      chainId: ARC_TESTNET_CHAIN_ID,
      accounts,
      timeout: 360000,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
  },
};
