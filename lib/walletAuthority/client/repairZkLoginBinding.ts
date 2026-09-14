// FILE: lib/walletAuthority/client/repairZkLoginBinding.ts
// Client helper for canonical zkLogin wallet binding repair.

export type RepairZkLoginBindingResult =
  | { ok: true; wallet_binding_status: "ok" | "repaired" }
  | { ok: false; status?: number; code?: string; error?: string };

export async function repairZkLoginBinding(): Promise<RepairZkLoginBindingResult> {
  const res = await fetch("/api/wallet-authority/repair", {
    method: "POST",
    credentials: "include",
  });
  const data = await res.json() as {
    ok?: boolean;
    wallet_binding_status?: string;
    reason_code?: string;
    error?: string;
    persisted?: boolean;
  };

  if (!res.ok || !data.ok || data.persisted !== true) {
    return {
      ok: false,
      status: res.status,
      code: data.reason_code ?? data.error,
      error: data.error ?? "Wallet binding repair failed",
    };
  }

  return {
    ok: true,
    wallet_binding_status: data.wallet_binding_status === "repaired" ? "repaired" : "ok",
  };
}
