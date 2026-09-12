require("@nomicfoundation/hardhat-ethers");
require("dotenv").config();

const accounts = process.env.DEPLOYER_PRIVATE_KEY
  ? [process.env.DEPLOYER_PRIVATE_KEY]
  : [];

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "shanghai",
      viaIR: true,
    },
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://sepolia-proxy-rpc.creditcoin.network",
      chainId: 11155111,
      accounts,
    },
    creditcoinUscTestnet: {
      url: process.env.CREDITCOIN_RPC_URL || "https://rpc.cc3-testnet.creditcoin.network/",
      chainId: 102031,
      accounts,
      timeout: 360000,
    },
  },
};
