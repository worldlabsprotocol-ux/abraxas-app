// FILE: lib/cielo/paymentVerify.ts
// Verify USDC (or devnet SUI) payment to Cielo treasury on Sui.

import { normalizeSuiAddress } from "@mysten/sui/utils";
import { getSuiClient } from "@/lib/sui/serverClient";
import { suiExplorerTxUrl } from "@/lib/sui/network";
import { getCieloTreasuryAddress, getUsdcCoinType, humanUsdcFromBaseUnits, usdcBaseUnits } from "@/lib/cielo/treasury";

export interface PaymentVerification {
  ok: boolean;
  tx_digest: string;
  treasury: string;
  sender: string | null;
  amount_human: number;
  coin_type: string;
  explorer_url: string | null;
  error?: string;
}

export async function verifyCieloPayment(
  txDigest: string,
  expectedUsdc: number,
  expectedSender?: string | null,
): Promise<PaymentVerification> {
  const treasury = getCieloTreasuryAddress();
  if (!treasury) {
    return {
      ok: false,
      tx_digest: txDigest,
      treasury: "",
      sender: null,
      amount_human: 0,
      coin_type: "",
      explorer_url: null,
      error: "SUI_TREASURY_ADDRESS not configured on server",
    };
  }

  const client = getSuiClient();
  const usdcType = getUsdcCoinType();
  const minBase = usdcType
    ? usdcBaseUnits(expectedUsdc * 0.98)
    : BigInt(Math.floor(0.01 * 1e9)); // devnet: 0.01 SUI minimum when USDC not configured

  let tx;
  try {
    tx = await client.getTransactionBlock({
      digest: txDigest,
      options: { showBalanceChanges: true, showEffects: true },
    });
  } catch (e) {
    return {
      ok: false,
      tx_digest: txDigest,
      treasury: normalizeSuiAddress(treasury),
      sender: null,
      amount_human: 0,
      coin_type: usdcType ?? "0x2::sui::SUI",
      explorer_url: null,
      error: e instanceof Error ? e.message : "Could not fetch transaction",
    };
  }

  if (tx.effects?.status?.status !== "success") {
    return {
      ok: false,
      tx_digest: txDigest,
      treasury: normalizeSuiAddress(treasury),
      sender: null,
      amount_human: 0,
      coin_type: usdcType ?? "0x2::sui::SUI",
      explorer_url: null,
      error: "Transaction failed on-chain",
    };
  }

  const treasuryNorm = normalizeSuiAddress(treasury);
  let receivedBase = BigInt(0);
  let matchedCoin = usdcType ?? "0x2::sui::SUI";
  let sender: string | null = null;

  for (const change of tx.balanceChanges ?? []) {
    const owner = change.owner as { AddressOwner?: string } | undefined;
    const ownerAddr = owner?.AddressOwner ? normalizeSuiAddress(owner.AddressOwner) : null;
    if (!ownerAddr) continue;

    const amt = BigInt(change.amount);

    if (ownerAddr === treasuryNorm && amt > BigInt(0)) {
      if (usdcType) {
        if (change.coinType !== usdcType) continue;
      } else if (change.coinType !== "0x2::sui::SUI") {
        continue;
      }
      receivedBase += amt;
      matchedCoin = change.coinType;
    }

    if (amt < BigInt(0) && !sender) {
      if (usdcType && change.coinType !== usdcType) continue;
      if (!usdcType && change.coinType !== "0x2::sui::SUI") continue;
      sender = ownerAddr;
    }
  }

  if (expectedSender) {
    const exp = normalizeSuiAddress(expectedSender);
    if (sender && sender !== exp) {
      return {
        ok: false,
        tx_digest: txDigest,
        treasury: treasuryNorm,
        sender,
        amount_human: usdcType ? humanUsdcFromBaseUnits(receivedBase) : Number(receivedBase) / 1e9,
        coin_type: matchedCoin,
        explorer_url: null,
        error: "Sender wallet does not match booking wallet",
      };
    }
  }

  const amountHuman = usdcType
    ? humanUsdcFromBaseUnits(receivedBase)
    : Number(receivedBase) / 1e9;

  if (receivedBase < minBase) {
    return {
      ok: false,
      tx_digest: txDigest,
      treasury: treasuryNorm,
      sender,
      amount_human: amountHuman,
      coin_type: matchedCoin,
      explorer_url: null,
      error: usdcType
        ? `Payment too low. Expected ~${expectedUsdc} USDC, received ~${amountHuman}`
        : `Devnet SUI payment too low for test threshold`,
    };
  }

  return {
    ok: true,
    tx_digest: txDigest,
    treasury: treasuryNorm,
    sender,
    amount_human: amountHuman,
    coin_type: matchedCoin,
    explorer_url: suiExplorerTxUrl(txDigest),
  };
}
