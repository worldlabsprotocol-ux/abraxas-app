// FILE: lib/auth/holderBrowserSession.ts
// Extended browser session claims for wallet-first holders (v2 JWT).

import { SignJWT, jwtVerify } from "jose";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { createClient } from "@supabase/supabase-js";
import type { NextRequest, NextResponse } from "next/server";
import {
  attachBrowserSessionCookie,
  BROWSER_SESSION_COOKIE,
} from "@/lib/auth/browserSession";
import { normalizeSolanaAddress } from "@/lib/auth/walletLogin/solanaSignIn";

const SESSION_TTL_SEC = 60 * 60 * 24 * 7;

export type HolderLoginMethod = "zklogin" | "solana_wallet";

export interface HolderSessionView {
  loginMethod: HolderLoginMethod;
  suiAddress: string | null;
  solanaAddress: string | null;
  holderWalletId: string | null;
  holderAccountId: string | null;
  claimsSubjectKey: string | null;
  passportSubjectReady: boolean;
}

function sessionSecret(): Uint8Array | null {
  const raw = process.env.ABRAXAS_BROWSER_SESSION_SECRET ?? process.env.ABRAXAS_SIGNING_KEY;
  if (!raw) return null;
  return new TextEncoder().encode(raw);
}

export async function issueWalletHolderSessionToken(input: {
  holderWalletId: string;
  solanaAddress: string;
  linkedSuiAddress?: string | null;
  holderAccountId?: string | null;
  claimsSubjectKey?: string | null;
}): Promise<string | null> {
  const secret = sessionSecret();
  if (!secret) return null;

  const sol = normalizeSolanaAddress(input.solanaAddress);
  const linked = input.linkedSuiAddress?.trim()
    ? normalizeSuiAddress(input.linkedSuiAddress.trim())
    : null;
  const hid = input.holderAccountId?.trim() || null;
  const csk = input.claimsSubjectKey?.trim() || null;

  return new SignJWT({
    ver: hid && csk ? 3 : 2,
    login: "solana_wallet",
    hwid: input.holderWalletId,
    sol,
    ...(hid ? { hid } : {}),
    ...(csk ? { csk } : {}),
    ...(linked ? { sui: linked } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(`sol:${sol}`)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SEC}s`)
    .sign(secret);
}

export function attachHolderSessionCookie(res: NextResponse, token: string): void {
  attachBrowserSessionCookie(res, token);
}

export async function resolveHolderSession(req: NextRequest): Promise<HolderSessionView | null> {
  const secret = sessionSecret();
  if (!secret) return null;

  const token =
    req.cookies.get(BROWSER_SESSION_COOKIE)?.value
    ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();

  if (!token || token.startsWith("abx_")) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    const ver = payload.ver;

    if ((payload.ver === 2 || payload.ver === 3) && payload.login === "solana_wallet") {
      const hwid = typeof payload.hwid === "string" ? payload.hwid : null;
      const solRaw = typeof payload.sol === "string" ? payload.sol : null;
      if (!hwid || !solRaw) return null;

      let sol: string;
      try {
        sol = normalizeSolanaAddress(solRaw);
      } catch {
        return null;
      }

      const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
      const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
      if (sbUrl && sbKey) {
        const sb = createClient(sbUrl, sbKey, { auth: { persistSession: false } });
        const { data } = await sb
          .from("holder_wallet_accounts")
          .select("id, solana_address, linked_sui_address, holder_account_id")
          .eq("id", hwid)
          .maybeSingle();
        if (!data || (data.solana_address as string) !== sol) return null;

        const linked = (data.linked_sui_address as string | null) ?? null;
        const holderAccountId = (data.holder_account_id as string | null) ?? null;
        let claimsSubjectKey: string | null =
          typeof payload.csk === "string" ? payload.csk : null;

        if (holderAccountId) {
          const { data: account } = await sb
            .from("holder_accounts")
            .select("claims_subject_key")
            .eq("id", holderAccountId)
            .maybeSingle();
          claimsSubjectKey = (account?.claims_subject_key as string) ?? claimsSubjectKey;
        }

        const passportSubjectReady = Boolean(holderAccountId) || Boolean(linked);
        return {
          loginMethod: "solana_wallet",
          solanaAddress: sol,
          holderWalletId: hwid,
          holderAccountId,
          claimsSubjectKey,
          suiAddress: linked,
          passportSubjectReady,
        };
      }

      return {
        loginMethod: "solana_wallet",
        solanaAddress: sol,
        holderWalletId: hwid,
        holderAccountId: typeof payload.hid === "string" ? payload.hid : null,
        claimsSubjectKey: typeof payload.csk === "string" ? payload.csk : null,
        suiAddress: typeof payload.sui === "string" ? payload.sui : null,
        passportSubjectReady: Boolean(payload.hid) || Boolean(payload.sui),
      };
    }

    const sui = typeof payload.sui === "string" ? payload.sui : payload.sub;
    if (!sui || typeof sui !== "string") return null;
    const normalized = normalizeSuiAddress(sui);

    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (sbUrl && sbKey) {
      const sb = createClient(sbUrl, sbKey, { auth: { persistSession: false } });
      const { data } = await sb
        .from("sui_zklogin_identities")
        .select("sui_address")
        .eq("sui_address", normalized)
        .maybeSingle();
      if (!data) return null;
    }

    return {
      loginMethod: "zklogin",
      suiAddress: normalized,
      solanaAddress: null,
      holderWalletId: null,
      holderAccountId: null,
      claimsSubjectKey: normalized,
      passportSubjectReady: true,
    };
  } catch {
    return null;
  }
}

export { BROWSER_SESSION_COOKIE };
