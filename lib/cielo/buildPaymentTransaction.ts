// FILE: lib/cielo/buildPaymentTransaction.ts
// Build a Sui transfer to the Cielo treasury (USDC or devnet SUI fallback).

import { Transaction } from "@mysten/sui/transactions";
import type { SuiClient } from "@mysten/sui/client";
import { usdcBaseUnits } from "@/lib/cielo/treasury";

export interface PaymentTxParams {
  sender: string;
  treasury: string;
  amountUsdc: number;
  usdcCoinType: string | null;
}

/** Devnet test fallback when SUI_USDC_COIN_TYPE is not configured. */
const DEVNET_SUI_MIST = BigInt(10_000_000); // 0.01 SUI

export async function buildCieloPaymentTransaction(
  client: SuiClient,
  params: PaymentTxParams,
): Promise<Transaction> {
  const tx = new Transaction();
  tx.setSender(params.sender);

  if (params.usdcCoinType) {
    const amountBase = usdcBaseUnits(params.amountUsdc);
    const coins = await client.getCoins({
      owner: params.sender,
      coinType: params.usdcCoinType,
    });

    if (coins.data.length === 0) {
      throw new Error(`No USDC in your wallet. Fund your zkLogin address with USDC on Sui.`);
    }

    const coinIds = coins.data.map(c => c.coinObjectId);
    const primary = coinIds[0];
    if (coinIds.length > 1) {
      tx.mergeCoins(primary, coinIds.slice(1));
    }

    const [paymentCoin] = tx.splitCoins(primary, [tx.pure.u64(amountBase)]);
    tx.transferObjects([paymentCoin], params.treasury);
    return tx;
  }

  const [paymentCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(DEVNET_SUI_MIST)]);
  tx.transferObjects([paymentCoin], params.treasury);
  return tx;
}
