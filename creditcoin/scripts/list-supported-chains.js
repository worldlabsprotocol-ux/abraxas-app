const { ethers } = require("ethers");
const { chainInfo } = require("@gluwa/usc-sdk");

async function main() {
  const rpcUrl = process.env.CREDITCOIN_RPC_URL || "https://rpc.cc3-testnet.creditcoin.network/";
  const rpc = new ethers.JsonRpcProvider(rpcUrl, 102031, { staticNetwork: true });
  const provider = new chainInfo.PrecompileChainInfoProvider(rpc);
  const chains = await provider.getSupportedChains();
  const results = await Promise.all(chains.map(async (chain) => {
    const latest = await provider.getLatestAttestedHeightAndHash(chain.chainKey);
    return {
      chainKey: chain.chainKey,
      chainId: chain.chainId,
      chainName: chain.chainName,
      chainEncoding: chain.chainEncoding,
      latestAttestedHeight: latest.exists ? latest.height : null,
    };
  }));
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
