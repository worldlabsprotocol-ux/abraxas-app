// FILE: lib/walletBinding/schemaPreflight.ts
// Read-only wallet_binding_challenges schema compatibility checks.

import type { SupabaseClient } from "@supabase/supabase-js";

export const WALLET_BINDING_SCHEMA_MIGRATION = "057_wallet_binding_challenges_connect.sql";

export const WALLET_BINDING_REQUIRED_COLUMNS = [
  "id",
  "wallet_address",
  "chain",
  "message",
  "domain",
  "expires_at",
] as const;

export type WalletBindingSchemaStatus = "compatible" | "missing_chain" | "missing_id" | "table_missing" | "unknown";

export interface WalletBindingSchemaCheck {
  status: WalletBindingSchemaStatus;
  compatible: boolean;
  userMessage: string;
  operatorMessage: string;
  migration: string;
  missingColumns: string[];
}

export function evaluateWalletBindingSchema(columns: readonly string[]): WalletBindingSchemaCheck {
  const normalized = new Set(columns.map(c => c.toLowerCase()));
  const missing = WALLET_BINDING_REQUIRED_COLUMNS.filter(col => !normalized.has(col));

  if (missing.length === 0) {
    return {
      status: "compatible",
      compatible: true,
      userMessage: "Wallet binding is available.",
      operatorMessage: "wallet_binding_challenges schema is compatible.",
      migration: WALLET_BINDING_SCHEMA_MIGRATION,
      missingColumns: [],
    };
  }

  if (!normalized.has("id") && normalized.has("challenge_id")) {
    return {
      status: "missing_id",
      compatible: false,
      userMessage: "Wallet binding is temporarily unavailable. Your verified identity still works without it.",
      operatorMessage:
        "wallet_binding_challenges still uses legacy challenge_id PK. Apply migration "
        + WALLET_BINDING_SCHEMA_MIGRATION
        + " (renames challenge_id → id and adds chain/domain).",
      migration: WALLET_BINDING_SCHEMA_MIGRATION,
      missingColumns: missing,
    };
  }

  if (!normalized.has("chain")) {
    return {
      status: "missing_chain",
      compatible: false,
      userMessage: "Wallet binding is temporarily unavailable. Your verified identity still works without it.",
      operatorMessage:
        "wallet_binding_challenges.chain is missing (020-era table). Apply migration "
        + WALLET_BINDING_SCHEMA_MIGRATION
        + " then refresh the Supabase schema cache.",
      migration: WALLET_BINDING_SCHEMA_MIGRATION,
      missingColumns: missing,
    };
  }

  return {
    status: "unknown",
    compatible: false,
    userMessage: "Wallet binding is temporarily unavailable. Your verified identity still works without it.",
    operatorMessage:
      "wallet_binding_challenges is missing required columns: "
      + missing.join(", ")
      + ". Apply migration "
      + WALLET_BINDING_SCHEMA_MIGRATION
      + ".",
    migration: WALLET_BINDING_SCHEMA_MIGRATION,
    missingColumns: missing,
  };
}

export function isSchemaCacheChainError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("chain") && lower.includes("wallet_binding_challenges");
}

export async function probeWalletBindingSchema(
  sb: SupabaseClient,
): Promise<WalletBindingSchemaCheck> {
  const { error } = await sb
    .from("wallet_binding_challenges")
    .select("id, chain, domain, subject_id, wallet_address, message, expires_at")
    .limit(1);

  if (!error) {
    return evaluateWalletBindingSchema([...WALLET_BINDING_REQUIRED_COLUMNS, "subject_id"]);
  }

  const msg = error.message ?? "";
  if (msg.includes("does not exist") || msg.includes("relation") && msg.includes("wallet_binding_challenges")) {
    return {
      status: "table_missing",
      compatible: false,
      userMessage: "Wallet binding is temporarily unavailable. Your verified identity still works without it.",
      operatorMessage: "wallet_binding_challenges table is missing. Apply migrations 020 and "
        + WALLET_BINDING_SCHEMA_MIGRATION
        + ".",
      migration: WALLET_BINDING_SCHEMA_MIGRATION,
      missingColumns: [...WALLET_BINDING_REQUIRED_COLUMNS],
    };
  }

  if (isSchemaCacheChainError(msg)) {
    return evaluateWalletBindingSchema(["id", "wallet_address", "message", "expires_at"]);
  }

  if (msg.toLowerCase().includes("challenge_id") && !msg.toLowerCase().includes("column id")) {
    return evaluateWalletBindingSchema(["challenge_id", "wallet_address", "message", "expires_at"]);
  }

  return {
    status: "unknown",
    compatible: false,
    userMessage: "Wallet binding is temporarily unavailable. Your verified identity still works without it.",
    operatorMessage: `wallet_binding_challenges probe failed: ${msg}`,
    migration: WALLET_BINDING_SCHEMA_MIGRATION,
    missingColumns: [],
  };
}
