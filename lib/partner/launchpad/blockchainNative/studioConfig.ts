import { PROOF_CONTINUITY_PROGRAM_ID } from "@/lib/solana/proofContinuity/constants";
import { resolvePrepareBindingHmacSecret } from "./prepareBindingSecret";

export function blockchainNativeStudioRpcUrl(): string | null {
  const raw = process.env.ABRAXAS_PROOF_CONTINUITY_RPC_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function blockchainNativeRegistryAdmin(): string | null {
  return process.env.ABRAXAS_PROOF_CONTINUITY_REGISTRY_ADMIN?.trim() || null;
}

export function blockchainNativeFinalitySlots(): number {
  const raw = Number(process.env.ABRAXAS_PROOF_CONTINUITY_FINALITY_SLOTS ?? "32");
  if (!Number.isFinite(raw) || raw < 0) return 32;
  return Math.floor(raw);
}

export function isBlockchainNativeStudioConfigured(): boolean {
  return Boolean(
    blockchainNativeStudioRpcUrl()
    && blockchainNativeRegistryAdmin()
    && resolvePrepareBindingHmacSecret(),
  );
}

export const BLOCKCHAIN_NATIVE_STUDIO_PROGRAM_ID = PROOF_CONTINUITY_PROGRAM_ID;