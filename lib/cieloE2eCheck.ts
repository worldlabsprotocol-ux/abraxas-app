// FILE: lib/cieloE2eCheck.ts
// Cielo revenue loop health checks — shared by API route and CLI script.

import { createClient } from "@supabase/supabase-js";
import { getCieloTreasuryAddress, getUsdcCoinType } from "@/lib/cielo/treasury";
import { getSuiNetwork } from "@/lib/sui/network";
import { isPassportIssuerConfigured } from "@/lib/sui/passportIssuer";

export type CheckStatus = "pass" | "fail" | "warn";

export interface E2eCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  group: "env" | "api" | "data" | "flow";
}

function check(id: string, label: string, status: CheckStatus, detail: string, group: E2eCheck["group"]): E2eCheck {
  return { id, label, status, detail, group };
}

export async function runCieloE2eChecks(): Promise<{
  checks: E2eCheck[];
  passCount: number;
  warnCount: number;
  failCount: number;
  readyForDemo: boolean;
}> {
  const checks: E2eCheck[] = [];

  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  const treasury = getCieloTreasuryAddress();
  const usdc = getUsdcCoinType();
  const network = getSuiNetwork();
  const googleClient = process.env.GOOGLE_CLIENT_ID?.trim() ?? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  const zkProver = process.env.ZKLOGIN_PROVER_URL?.trim() ?? process.env.NEXT_PUBLIC_ZKLOGIN_PROVER_URL?.trim();

  checks.push(
    sbUrl && sbKey
      ? check("supabase", "Supabase configured", "pass", "URL + service role key present", "env")
      : check("supabase", "Supabase configured", "fail", "Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY", "env"),
  );

  checks.push(
    treasury
      ? check("treasury", "Sui treasury address", "pass", treasury.slice(0, 12) + "…", "env")
      : check("treasury", "Sui treasury address", "fail", "Set SUI_TREASURY_ADDRESS in Vercel", "env"),
  );

  checks.push(
    usdc
      ? check("usdc", "USDC coin type", "pass", usdc.split("::").slice(-1)[0] ?? usdc, "env")
      : check("usdc", "USDC coin type", "warn", "Set SUI_USDC_COIN_TYPE for mainnet USDC (fallback: 0.01 SUI)", "env"),
  );

  checks.push(
    network === "mainnet"
      ? check("network", "Sui network", "pass", "mainnet", "env")
      : check("network", "Sui network", "warn", `Currently ${network} — set SUI_NETWORK=mainnet for production`, "env"),
  );

  checks.push(
    googleClient
      ? check("zklogin", "Google zkLogin", "pass", "OAuth client configured", "env")
      : check("zklogin", "Google zkLogin", "fail", "Set GOOGLE_CLIENT_ID for one-click pay", "env"),
  );

  checks.push(
    zkProver || network !== "mainnet"
      ? check("prover", "zkLogin prover", zkProver ? "pass" : "warn", zkProver ?? "Using default Mysten prover URL", "env")
      : check("prover", "zkLogin prover", "warn", "Proxy via /api/zklogin/prover recommended", "env"),
  );

  checks.push(
    isPassportIssuerConfigured()
      ? check("issuer", "Passport issuer", "pass", "Move issuer configured", "env")
      : check("issuer", "Passport issuer", "warn", "Optional for booking; required for on-chain stamps", "env"),
  );

  if (sbUrl && sbKey) {
    const sb = createClient(sbUrl, sbKey, { auth: { persistSession: false } });
    try {
      const { count, error } = await sb.from("stay_requests").select("id", { count: "exact", head: true });
      checks.push(
        error
          ? check("stay_table", "stay_requests table", "fail", error.message, "data")
          : check("stay_table", "stay_requests table", "pass", `${count ?? 0} booking(s) total`, "data"),
      );
    } catch (e: unknown) {
      checks.push(check("stay_table", "stay_requests table", "fail", String(e), "data"));
    }

    try {
      const { count } = await sb.from("stay_requests").select("id", { count: "exact", head: true }).eq("status", "captured");
      checks.push(
        (count ?? 0) > 0
          ? check("captured", "Captured payment exists", "pass", `${count} captured stay(s) — loop proven`, "flow")
          : check("captured", "Captured payment exists", "warn", "No captured stays yet — run first E2E booking", "flow"),
      );
    } catch {
      checks.push(check("captured", "Captured payment exists", "warn", "Could not query captured stays", "flow"));
    }
  }

  checks.push(
    check("phase", "Revenue loop phase", "pass", "Phase 6 — book · pay · receipt · metrics", "flow"),
  );

  const passCount = checks.filter(c => c.status === "pass").length;
  const warnCount = checks.filter(c => c.status === "warn").length;
  const failCount = checks.filter(c => c.status === "fail").length;

  const critical = ["supabase", "treasury", "zklogin"];
  const readyForDemo = critical.every(id => checks.find(c => c.id === id)?.status === "pass");

  return { checks, passCount, warnCount, failCount, readyForDemo };
}
