// FILE: lib/cielo/payFromWallet.ts
// Phase 3: one-click Cielo payment from zkLogin wallet.

import { getSuiClient } from "@/lib/sui/client";
import { signAndExecuteZkLoginTransaction } from "@/lib/sui/zklogin/signAndExecuteTransaction";
import { buildCieloPaymentTransaction } from "@/lib/cielo/buildPaymentTransaction";

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

  const client = getSuiClient();
  const tx = await buildCieloPaymentTransaction(client, {
    sender: params.senderAddress,
    treasury: params.treasuryAddress,
    amountUsdc: params.amountUsdc,
    usdcCoinType: params.usdcCoinType,
  });

  const { digest } = await signAndExecuteZkLoginTransaction(tx);
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
