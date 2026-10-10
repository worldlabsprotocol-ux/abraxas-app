// Read-only Demo preflight for Solana-native stack (Build #510). Never prints secrets.

import { Connection, PublicKey } from "@solana/web3.js";
import { loadSolanaReceiptCommitter } from "@/lib/decisionReceipts/solanaCommitment/signer";
import {
  SOLANA_RECEIPT_COMMITMENTS_FLAG_ENV,
  SOLANA_RECEIPT_COMMITMENT_RPC_ENV,
  solanaReceiptCommitmentsEnabled,
  resolveSolanaCommitmentRpcUrl,
} from "@/lib/decisionReceipts/solanaCommitment/config";
import { isSolanaNativeProductEnabled } from "@/lib/auth/solanaNative/featureFlag";

export type PreflightStatus = "pass" | "fail" | "warn" | "blocked";

export interface PreflightCheck {
  id: string;
  status: PreflightStatus;
  detail: string;
}

export interface SolanaNativeDemoPreflightResult {
  checks: PreflightCheck[];
  exitCode: number;
}

const DEMO_SUPABASE_PROJECT_REF = "ocntwbxarpjeixdnzide";

const REQUIRED_MIGRATIONS = [
  "134_holder_wallet_login.sql",
  "135_canonical_holder_accounts.sql",
  "136_cielo_verified_guest_solana_policy.sql",
  "137_good_trouble_age_21_solana_idv.sql",
  "138_decision_receipt_solana_commitments.sql",
];

function supabaseProjectRef(url: string): string | null {
  try {
    const host = new URL(url).hostname;
    const m = host.match(/^([a-z0-9]+)\.supabase\.co$/i);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

export async function runSolanaNativeDemoPreflight(deps: {
  env: NodeJS.ProcessEnv;
  tableExists?: (table: string) => Promise<boolean>;
  migrationApplied?: (file: string) => Promise<boolean>;
  fetchRpc?: (url: string) => Promise<Response>;
}): Promise<SolanaNativeDemoPreflightResult> {
  const checks: PreflightCheck[] = [];
  const env = deps.env;

  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  if (!url || !serviceKey) {
    checks.push({ id: "supabase_config", status: "fail", detail: "NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing" });
  } else {
    const ref = supabaseProjectRef(url);
    if (ref === DEMO_SUPABASE_PROJECT_REF) {
      checks.push({ id: "demo_supabase_project", status: "pass", detail: `Demo project ref ${ref}` });
    } else if (ref) {
      checks.push({
        id: "demo_supabase_project",
        status: "warn",
        detail: `Supabase ref ${ref} is not the canonical Demo ref ${DEMO_SUPABASE_PROJECT_REF}`,
      });
    } else {
      checks.push({ id: "demo_supabase_project", status: "fail", detail: "Supabase URL is not a *.supabase.co host" });
    }
  }

  if (isSolanaNativeProductEnabled(env)) {
    checks.push({ id: "flag_solana_native", status: "pass", detail: "ABRAXAS_SOLANA_NATIVE enabled" });
  } else {
    checks.push({ id: "flag_solana_native", status: "fail", detail: "ABRAXAS_SOLANA_NATIVE not enabled" });
  }

  if (env.ABRAXAS_WALLET_FIRST_AUTH === "true" || env.NEXT_PUBLIC_ABRAXAS_WALLET_FIRST_AUTH === "true") {
    checks.push({ id: "flag_wallet_first", status: "pass", detail: "Wallet-first auth flag on" });
  } else {
    checks.push({ id: "flag_wallet_first", status: "warn", detail: "Wallet-first flags not set" });
  }

  if (solanaReceiptCommitmentsEnabled(env)) {
    checks.push({ id: "flag_receipt_commitments", status: "pass", detail: `${SOLANA_RECEIPT_COMMITMENTS_FLAG_ENV}=enabled` });
  } else {
    checks.push({ id: "flag_receipt_commitments", status: "warn", detail: "Receipt commitments disabled" });
  }

  const appUrl = env.NEXT_PUBLIC_APP_URL?.trim() ?? "";
  if (appUrl.includes("demo.abraxasworld.xyz") || appUrl.includes("localhost")) {
    checks.push({ id: "phantom_auth_origin", status: "pass", detail: `App origin ${appUrl || "(unset)"}` });
  } else {
    checks.push({ id: "phantom_auth_origin", status: "warn", detail: `Verify Phantom allowlist for ${appUrl || "unset origin"}` });
  }

  const rpc = resolveSolanaCommitmentRpcUrl(env);
  try {
    const parsed = new URL(rpc);
    if (parsed.protocol !== "https:") throw new Error("rpc_not_https");
    checks.push({ id: "solana_devnet_rpc", status: "pass", detail: `RPC host ${parsed.host}` });
  } catch {
    checks.push({ id: "solana_devnet_rpc", status: "fail", detail: "Invalid Solana RPC URL" });
  }

  if (env.ABRAXAS_SIGNING_KEY?.trim() || env.ABRAXAS_PUBLIC_KEY?.trim()) {
    checks.push({ id: "receipt_signing_key", status: "pass", detail: "Receipt signing material present (not printed)" });
  } else {
    checks.push({ id: "receipt_signing_key", status: "fail", detail: "ABRAXAS_SIGNING_KEY / ABRAXAS_PUBLIC_KEY missing" });
  }

  const committer = loadSolanaReceiptCommitter(env);
  if (committer.ok) {
    checks.push({
      id: "committer_key",
      status: "pass",
      detail: `Committer pubkey ${committer.committer.publicKey.toBase58()}`,
    });
    try {
      const connection = new Connection(rpc, "confirmed");
      const lamports = await connection.getBalance(committer.committer.publicKey);
      if (lamports >= 5_000_000) {
        checks.push({ id: "committer_funding", status: "pass", detail: `Balance ${lamports} lamports` });
      } else {
        checks.push({
          id: "committer_funding",
          status: "fail",
          detail: `Low balance (${lamports} lamports) — devnet airdrop required`,
        });
      }
    } catch {
      checks.push({ id: "committer_funding", status: "blocked", detail: "Could not query committer balance (RPC)" });
    }
  } else {
    checks.push({
      id: "committer_key",
      status: "blocked",
      detail: "ABRAXAS_SOLANA_RECEIPT_COMMITMENT_PRIVATE_KEY not configured",
    });
  }

  if (env.VERIFF_DISABLED === "true" || env.IDV_PROVIDER === "manual") {
    checks.push({ id: "veriff_readiness", status: "warn", detail: "Veriff disabled or manual IDV — use authorized reviewer path" });
  } else if (env.VERIFF_API_KEY?.trim()) {
    checks.push({ id: "veriff_readiness", status: "pass", detail: "Veriff API key present (not printed)" });
  } else {
    checks.push({ id: "veriff_readiness", status: "fail", detail: "Veriff not configured" });
  }

  if (env.ABRAXAS_ADMIN_EMAILS?.trim()) {
    checks.push({ id: "reviewer_availability", status: "pass", detail: "Admin reviewer emails configured" });
  } else {
    checks.push({ id: "reviewer_availability", status: "warn", detail: "ABRAXAS_ADMIN_EMAILS unset" });
  }

  if (deps.tableExists) {
    for (const file of REQUIRED_MIGRATIONS) {
      const table = file.startsWith("138")
        ? "decision_receipt_solana_commitments"
        : file.startsWith("135")
          ? "holder_accounts"
          : file.startsWith("134")
            ? "holder_wallet_login_sessions"
            : null;
      if (!table) continue;
      const exists = await deps.tableExists(table);
      checks.push({
        id: `migration_${file}`,
        status: exists ? "pass" : "fail",
        detail: exists ? `${table} present` : `${table} missing — apply ${file}`,
      });
    }
  } else {
    checks.push({
      id: "migrations_134_138",
      status: "blocked",
      detail: "Provide tableExists hook or apply migrations manually",
    });
  }

  const fail = checks.some(c => c.status === "fail");
  const blocked = checks.some(c => c.status === "blocked");
  return { checks, exitCode: fail ? 1 : blocked ? 2 : 0 };
}

export function formatSolanaNativeDemoPreflightReport(result: SolanaNativeDemoPreflightResult): string {
  const lines = result.checks.map(c => `[${c.status.toUpperCase()}] ${c.id}: ${c.detail}`);
  lines.push(`exit_code=${result.exitCode}`);
  return lines.join("\n");
}
