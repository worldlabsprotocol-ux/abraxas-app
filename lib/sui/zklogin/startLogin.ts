// FILE: lib/sui/zklogin/startLogin.ts
// Start Google zkLogin — ephemeral key + nonce + OAuth redirect.

import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { generateNonce, generateRandomness } from "@mysten/sui/zklogin";
import { getSuiClient } from "@/lib/sui/client";
import { buildGoogleOAuthUrl, isZkLoginConfigured } from "./config";
import { savePendingSession } from "./session";

const EPOCH_BUFFER = 10;

export async function startGoogleZkLogin(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isZkLoginConfigured()) {
    return {
      ok: false,
      error: "Google OAuth not configured. Set NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID — see docs/ZKLOGIN_BACKEND_SETUP.md",
    };
  }

  const sui = getSuiClient();
  const { epoch } = await sui.getLatestSuiSystemState();
  const maxEpoch = Number(epoch) + EPOCH_BUFFER;

  const ephemeralKeypair = Ed25519Keypair.generate();
  const randomness = generateRandomness();
  const nonce = generateNonce(ephemeralKeypair.getPublicKey(), maxEpoch, randomness);

  savePendingSession({
    ephemeralSecretKey: ephemeralKeypair.getSecretKey(),
    randomness,
    maxEpoch,
    provider: "google",
    startedAt: new Date().toISOString(),
  });

  const url = buildGoogleOAuthUrl(nonce);
  if (!url) {
    return { ok: false, error: "Could not build OAuth URL" };
  }

  window.location.href = url;
  return { ok: true };
}
