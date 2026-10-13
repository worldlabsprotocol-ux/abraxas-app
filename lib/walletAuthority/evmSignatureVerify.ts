// FILE: lib/walletAuthority/evmSignatureVerify.ts
// EOA (EIP-191) and contract wallet (EIP-1271) verification for SIWE-bound messages.

import {
  createPublicClient,
  getAddress,
  hashMessage,
  http,
  verifyMessage,
  type Hex,
} from "viem";
import { mainnet, sepolia } from "viem/chains";
import { validateSiweMessage } from "./evmSiwe";

const EIP1271_MAGIC = "0x1626ba7e" as const;

const ERC1271_ABI = [
  {
    name: "isValidSignature",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "_hash", type: "bytes32" },
      { name: "_signature", type: "bytes" },
    ],
    outputs: [{ name: "magicValue", type: "bytes4" }],
  },
] as const;

function chainFromId(chainId: number) {
  if (chainId === 1) return mainnet;
  if (chainId === 11155111) return sepolia;
  return { id: chainId, name: `chain-${chainId}`, nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [] } } };
}

/** Trusted platform RPC — never honor request-supplied RPC URLs. */
export function resolveTrustedEvmRpcUrl(chainId: number): string | null {
  const byChain = process.env[`ABRAXAS_EVM_RPC_URL_${chainId}`]?.trim()
    ?? process.env[`NEXT_PUBLIC_EVM_RPC_URL_${chainId}`]?.trim();
  if (byChain) return byChain;
  const generic = process.env.ABRAXAS_PASSPORT_EVM_RPC_URL?.trim()
    ?? process.env.NEXT_PUBLIC_EVM_RPC_URL?.trim();
  return generic || null;
}

export async function verifySiweWalletSignature(input: {
  message: string;
  signature: Hex;
  expectedAddress: string;
  expectedDomain: string;
  expectedChainId: number;
  expectedNonce: string;
  nowMs?: number;
}): Promise<{ ok: true } | { ok: false; code: string }> {
  const validation = validateSiweMessage(
    input.message,
    {
      domain: input.expectedDomain,
      chainId: input.expectedChainId,
      nonce: input.expectedNonce,
      address: input.expectedAddress,
    },
    input.nowMs,
  );
  if (!validation.ok) return { ok: false, code: validation.reason };

  const address = getAddress(input.expectedAddress);
  const signature = input.signature.startsWith("0x")
    ? input.signature
    : (`0x${input.signature}` as Hex);

  try {
    const eoaValid = await verifyMessage({
      address,
      message: input.message,
      signature,
    });
    if (eoaValid) return { ok: true };
  } catch {
    return { ok: false, code: "invalid_signature" };
  }

  const rpcUrl = resolveTrustedEvmRpcUrl(input.expectedChainId);
  if (!rpcUrl) return { ok: false, code: "rpc_unconfigured" };

  const client = createPublicClient({
    chain: chainFromId(input.expectedChainId),
    transport: http(rpcUrl, { timeout: 12_000 }),
  });

  let bytecode: Hex | undefined;
  try {
    bytecode = await client.getBytecode({ address });
  } catch {
    return { ok: false, code: "rpc_error" };
  }

  const isContract = bytecode && bytecode !== "0x";
  if (!isContract) {
    return { ok: false, code: "invalid_signature" };
  }

  const digest = hashMessage(input.message);
  try {
    const magic = await client.readContract({
      address,
      abi: ERC1271_ABI,
      functionName: "isValidSignature",
      args: [digest, signature],
    });
    if (magic === EIP1271_MAGIC) return { ok: true };
    return { ok: false, code: "invalid_contract_signature" };
  } catch {
    return { ok: false, code: "rpc_error" };
  }
}
