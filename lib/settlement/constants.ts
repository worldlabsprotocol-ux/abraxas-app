// FILE: lib/settlement/constants.ts
// Official Arc Testnet configuration. Production Arc is intentionally unavailable.

export const ARC_TESTNET_CHAIN_ID = 5042002;
export const ARC_TESTNET_RPC_URL = "https://rpc.testnet.arc.network";
export const ARC_TESTNET_EXPLORER_URL = "https://testnet.arcscan.app";
export const ARC_TESTNET_USDC_ERC20 = "0x3600000000000000000000000000000000000000" as const;

/** USDC ERC20 on Arc uses 6 decimal places. Never mix with native USDC precision. */
export const ARC_USDC_DECIMALS = 6;
export const MICRO_USDC_FACTOR = BigInt(1_000_000);

export type ArcEnvironment = "arc_testnet";

export const ARC_ENVIRONMENTS: Record<
  ArcEnvironment,
  {
    label: string;
    chainId: number;
    rpcUrl: string;
    explorerUrl: string;
    usdcTokenAddress: `0x${string}`;
    testnet: boolean;
  }
> = {
  arc_testnet: {
    label: "Arc Testnet",
    chainId: ARC_TESTNET_CHAIN_ID,
    rpcUrl: ARC_TESTNET_RPC_URL,
    explorerUrl: ARC_TESTNET_EXPLORER_URL,
    usdcTokenAddress: ARC_TESTNET_USDC_ERC20,
    testnet: true,
  },
};

export const SETTLEMENT_EIP712_DOMAIN_NAME = "AbraxasSettlement";
export const SETTLEMENT_EIP712_DOMAIN_VERSION = "1";

export const SETTLEMENT_ACTION_TYPES = {
  USDC_TRANSFER: "usdc_transfer",
} as const;
