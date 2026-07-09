// FILE: app/api/wallet/binding/confirm/route.ts
// Step 2: verify signed wallet binding challenge → upgrade claim to signed_challenge.

import { NextRequest, NextResponse } from "next/server";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { verifyIntentSignature } from "@/lib/sui/intent/personalMessage";
import { getBindingChallenge, consumeBindingChallenge } from "@/lib/walletBinding/challenge";
import { upsertClaims, upsertWalletBinding } from "@/lib/credentials/claimsService";
import { walletBindingClaim, CLAIM_ISSUERS } from "@/lib/credentials/claimSchema";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    challenge_id?: string;
    sui_address?: string;
    message?: string;
    signature?: string;
    public_key?: string;
  };

  if (!body.challenge_id || !body.sui_address || !body.message || !body.signature || !body.public_key) {
    return NextResponse.json({
      error: "challenge_id, sui_address, message, signature, public_key required",
    }, { status: 400 });
  }

  const wallet = normalizeSuiAddress(body.sui_address);

  const stored = getBindingChallenge(body.challenge_id);
  if (!stored || stored.wallet !== wallet || stored.message !== body.message) {
    return NextResponse.json({ error: "Invalid or expired challenge" }, { status: 400 });
  }

  if (!verifyIntentSignature(body.message, body.signature, body.public_key)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (!consumeBindingChallenge(body.challenge_id, wallet)) {
    return NextResponse.json({ error: "Challenge already used" }, { status: 409 });
  }

  await upsertWalletBinding(wallet, wallet, "signed_challenge");

  const claim = walletBindingClaim({
    subjectId: wallet,
    walletAddress: wallet,
    bindingMethod: "signed_challenge",
  });
  await upsertClaims([{
    ...claim,
    claim_value: {
      ...claim.claim_value,
      proof_signature: body.signature.slice(0, 32) + "…",
      challenge_id: body.challenge_id,
    },
    issuer_id: CLAIM_ISSUERS.abraxas,
    assurance_level: "L3",
  }]);

  return NextResponse.json({
    ok: true,
    wallet_binding_confirmed: true,
    binding_method: "signed_challenge",
    sui_address: wallet,
  });
}
