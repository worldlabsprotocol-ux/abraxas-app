// FILE: app/api/auth/wallet-login/verify/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { isWalletFirstAuthEnabled } from "@/lib/auth/walletLogin/featureFlag";
import {
  consumeHolderWalletLoginChallenge,
  upsertHolderWalletAccount,
} from "@/lib/auth/walletLogin/service";
import {
  hashForAudit,
  normalizeSolanaAddress,
  verifySolanaSignInSignature,
} from "@/lib/auth/walletLogin/solanaSignIn";
import {
  attachHolderSessionCookie,
  issueWalletHolderSessionToken,
} from "@/lib/auth/holderBrowserSession";
import { normalizeHolderContinuePath } from "@/lib/auth/holderContinuePath";

const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" };

export async function POST(req: NextRequest) {
  if (!isWalletFirstAuthEnabled()) {
    return NextResponse.json({ error: "Wallet-first auth is not enabled" }, { status: 404, headers: NO_STORE });
  }

  const body = (await req.json().catch(() => ({}))) as {
    challenge_id?: string;
    signature?: string;
    solana_address?: string;
  };

  const challengeId = body.challenge_id?.trim();
  const signature = body.signature?.trim();
  const solanaAddressRaw = body.solana_address?.trim();

  if (!challengeId || !signature || !solanaAddressRaw) {
    return NextResponse.json({ error: "challenge_id, signature, and solana_address required" }, {
      status: 400,
      headers: NO_STORE,
    });
  }

  let solanaAddress: string;
  try {
    solanaAddress = normalizeSolanaAddress(solanaAddressRaw);
  } catch {
    return NextResponse.json({ error: "Invalid Solana address" }, { status: 400, headers: NO_STORE });
  }

  const sb = requireSupabaseAdmin();
  const row = await consumeHolderWalletLoginChallenge(sb, challengeId);
  if (!row) {
    return NextResponse.json({ error: "Challenge expired or already used", code: "challenge_invalid" }, {
      status: 401,
      headers: NO_STORE,
    });
  }

  if ((row.solana_address as string) !== solanaAddress) {
    return NextResponse.json({ error: "Wallet mismatch", code: "wallet_mismatch" }, {
      status: 403,
      headers: NO_STORE,
    });
  }

  const verify = verifySolanaSignInSignature({
    message: row.message as string,
    signatureBase64: signature,
    expectedAddress: solanaAddress,
    expectedDomain: row.domain as string,
    expectedNonce: row.nonce as string,
    expectedChainId: process.env.NEXT_PUBLIC_SOLANA_CLUSTER?.trim().toLowerCase() === "devnet"
      ? "devnet"
      : process.env.NEXT_PUBLIC_SOLANA_CLUSTER?.trim().toLowerCase() === "testnet"
        ? "testnet"
        : "mainnet",
  });

  if (!verify.ok) {
    console.info("wallet_login.verify_failed", {
      reason: verify.reason,
      challenge: hashForAudit(challengeId),
      wallet: hashForAudit(solanaAddress),
    });
    return NextResponse.json({ error: "Signature verification failed", code: verify.reason }, {
      status: 401,
      headers: NO_STORE,
    });
  }

  const account = await upsertHolderWalletAccount(solanaAddress);
  const token = await issueWalletHolderSessionToken({
    holderWalletId: account.id,
    solanaAddress: account.solana_address,
    linkedSuiAddress: account.linked_sui_address,
  });

  if (!token) {
    return NextResponse.json({ error: "Session signing unavailable" }, { status: 503, headers: NO_STORE });
  }

  const continuePath = normalizeHolderContinuePath(row.continue_path as string | null);

  const res = NextResponse.json({
    ok: true,
    login_method: "solana_wallet",
    solana_address: account.solana_address,
    sui_address: account.linked_sui_address,
    passport_subject_ready: Boolean(account.linked_sui_address),
    continue_path: continuePath,
  }, { headers: NO_STORE });

  attachHolderSessionCookie(res, token);
  return res;
}
