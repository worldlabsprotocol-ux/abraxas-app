// FILE: lib/cielo/paymentEvents.ts
// Event-based payment discovery — scan recent treasury inbound transactions on Sui.

import { normalizeSuiAddress } from "@mysten/sui/utils";
import { getSuiClient } from "@/lib/sui/serverClient";
import { getCieloTreasuryAddress, getUsdcCoinType, humanUsdcFromBaseUnits } from "@/lib/cielo/treasury";

export interface InboundPaymentMatch {
  tx_digest: string;
  sender: string | null;
  amount_human: number;
  coin_type: string;
}

/** Find a recent inbound payment to treasury matching amount + optional sender. */
export async function findInboundTreasuryPayment(
  expectedUsdc: number,
  expectedSender?: string | null,
  lookback = 50,
): Promise<InboundPaymentMatch | null> {
  const treasury = getCieloTreasuryAddress();
  if (!treasury) return null;

  const client = getSuiClient();
  const treasuryNorm = normalizeSuiAddress(treasury);
  const usdcType = getUsdcCoinType();
  const minBase = usdcType
    ? BigInt(Math.floor(expectedUsdc * 0.98 * 1_000_000))
    : BigInt(Math.floor(0.01 * 1e9));

  let cursor: string | null | undefined = undefined;

  for (let page = 0; page < 3; page++) {
    const result = await client.queryTransactionBlocks({
      filter: { ToAddress: treasuryNorm },
      order: "descending",
      limit: Math.min(lookback, 50),
      cursor: cursor ?? undefined,
    });

    for (const item of result.data) {
      const digest = typeof item === "string" ? item : item.digest;
      const tx = await client.getTransactionBlock({
        digest,
        options: { showBalanceChanges: true, showEffects: true },
      });

      if (tx.effects?.status?.status !== "success") continue;

      let receivedBase = BigInt(0);
      let sender: string | null = null;
      let matchedCoin = usdcType ?? "0x2::sui::SUI";

      for (const change of tx.balanceChanges ?? []) {
        const owner = change.owner as { AddressOwner?: string } | undefined;
        const ownerAddr = owner?.AddressOwner ? normalizeSuiAddress(owner.AddressOwner) : null;
        if (!ownerAddr) continue;

        const amt = BigInt(change.amount);

        if (ownerAddr === treasuryNorm && amt > BigInt(0)) {
          if (usdcType && change.coinType !== usdcType) continue;
          if (!usdcType && change.coinType !== "0x2::sui::SUI") continue;
          receivedBase += amt;
          matchedCoin = change.coinType;
        }

        if (amt < BigInt(0) && !sender) {
          if (usdcType && change.coinType !== usdcType) continue;
          if (!usdcType && change.coinType !== "0x2::sui::SUI") continue;
          sender = ownerAddr;
        }
      }

      if (receivedBase < minBase) continue;

      if (expectedSender) {
        const exp = normalizeSuiAddress(expectedSender);
        if (sender && sender !== exp) continue;
      }

      const amountHuman = usdcType
        ? humanUsdcFromBaseUnits(receivedBase)
        : Number(receivedBase) / 1e9;

      return {
        tx_digest: digest,
        sender,
        amount_human: amountHuman,
        coin_type: matchedCoin,
      };
    }

    if (!result.hasNextPage) break;
    cursor = result.nextCursor;
  }

  return null;
}
