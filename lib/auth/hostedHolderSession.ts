// FILE: lib/auth/hostedHolderSession.ts
// Server-authoritative Abraxas-native holder bootstrap for hosted partner flows.

import { createHash, randomBytes, randomUUID } from "crypto";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import {
  attachBrowserSessionCookie,
  issueBrowserSessionToken,
} from "@/lib/auth/browserSession";
import type { NextResponse } from "next/server";

export const HOSTED_HOLDER_PROVIDER = "abraxas_hosted" as const;

export function hostedOAuthSub(sessionId: string): string {
  return `hosted:${sessionId}`;
}

export function deriveHostedSuiAddress(sessionId: string): string {
  const secret =
    process.env.ABRAXAS_BROWSER_SESSION_SECRET
    ?? process.env.ABRAXAS_SIGNING_KEY
    ?? "";
  if (!secret) {
    throw new Error("hosted_holder_secret_unavailable");
  }
  const hash = createHash("sha256")
    .update(`abraxas-hosted-v1:${secret}:${sessionId}`)
    .digest("hex");
  return normalizeSuiAddress(`0x${hash}`);
}

function generateUserSalt(): string {
  return BigInt(`0x${randomBytes(16).toString("hex")}`).toString();
}

export interface HostedHolderBootstrapRecord {
  sessionId: string;
  oauthSub: string;
  suiAddress: string;
  provider: typeof HOSTED_HOLDER_PROVIDER;
}

export async function createHostedHolderIdentity(): Promise<HostedHolderBootstrapRecord> {
  const sessionId = randomUUID();
  const oauthSub = hostedOAuthSub(sessionId);
  const suiAddress = deriveHostedSuiAddress(sessionId);
  const userSalt = generateUserSalt();

  const sb = requireSupabaseAdmin();
  const { error } = await sb.from("sui_zklogin_identities").insert({
    oauth_sub: oauthSub,
    provider: HOSTED_HOLDER_PROVIDER,
    sui_address: suiAddress,
    user_salt: userSalt,
    email: null,
    max_epoch: null,
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("hosted_holder_identity_conflict");
    }
    throw new Error("hosted_holder_identity_persist_failed");
  }

  return {
    sessionId,
    oauthSub,
    suiAddress,
    provider: HOSTED_HOLDER_PROVIDER,
  };
}

export async function findHostedHolderBySuiAddress(
  suiAddress: string,
): Promise<{ provider: string; oauth_sub: string } | null> {
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!sbUrl || !sbKey) return null;

  const sb = createClient(sbUrl, sbKey, { auth: { persistSession: false } });
  const normalized = normalizeSuiAddress(suiAddress);
  const { data } = await sb
    .from("sui_zklogin_identities")
    .select("provider, oauth_sub")
    .eq("sui_address", normalized)
    .maybeSingle();

  if (!data) return null;
  return {
    provider: String(data.provider),
    oauth_sub: String(data.oauth_sub),
  };
}

export function isHostedHolderProvider(provider: string | null | undefined): boolean {
  return provider === HOSTED_HOLDER_PROVIDER;
}

export async function attachHostedHolderBrowserSession(
  res: NextResponse,
  suiAddress: string,
): Promise<boolean> {
  const token = await issueBrowserSessionToken(suiAddress);
  if (!token) return false;
  attachBrowserSessionCookie(res, token);
  return true;
}
