// FILE: lib/cielo/payFromWallet.ts
// Phase 3: one-click Cielo payment from zkLogin wallet (no browser Sui RPC).

import { signAndExecuteZkLoginTransaction } from "@/lib/sui/zklogin/signAndExecuteTransaction";

export interface PayCieloFromWalletParams {
  senderAddress: string;
  treasuryAddress: string;
  amountUsdc: number;
  usdcCoinType: string | null;
}

export interface PayCieloFromWalletResult {
  txDigest: string;
}

export async function payCieloFromWallet(
  params: PayCieloFromWalletParams,
): Promise<PayCieloFromWalletResult> {
  if (!params.treasuryAddress) {
    throw new Error("Treasury address not configured");
  }

  const buildRes = await fetch("/api/cielo/build-payment-tx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sender_address: params.senderAddress,
      treasury_address: params.treasuryAddress,
      amount_usdc: params.amountUsdc,
      usdc_coin_type: params.usdcCoinType,
    }),
  });

  const buildData = (await buildRes.json()) as {
    ok?: boolean;
    transaction_block?: string;
    error?: string;
  };

  if (!buildRes.ok || !buildData.transaction_block) {
    throw new Error(buildData.error ?? "Could not build payment transaction");
  }

  const { digest } = await signAndExecuteZkLoginTransaction(buildData.transaction_block);
  return { txDigest: digest };
}

export async function verifyCieloPaymentOnServer(
  bookingId: string,
  txDigest: string,
): Promise<{ ok: boolean; explorer?: string | null; error?: string }> {
  const res = await fetch("/api/cielo/payment/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ booking_id: bookingId, tx_digest: txDigest }),
  });
  const data = (await res.json()) as {
    ok?: boolean;
    error?: string;
    verification?: { explorer_url?: string | null };
  };
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error ?? "Verification failed" };
  }
  return { ok: true, explorer: data.verification?.explorer_url };
}
