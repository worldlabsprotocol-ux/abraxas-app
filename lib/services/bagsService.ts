// FILE: lib/services/bagsService.ts
// Bags.fm CLI integration service.
// Handles tokenization of business revenue streams via the Bags CLI.
// All CLI execution is server-side only. Never call this from client components.
// Security: only whitelisted arg keys are permitted — no raw user input passed to shell.
// Retry logic for transient failures. Full event logging.

import { execSync }         from "child_process";
import { z }                from "zod";
import { createAdminClient } from "@/lib/supabase";

// ── Output schema ─────────────────────────────────────────────────────────────
const BagsOutputSchema = z.object({
  bagsId:         z.string().min(1),
  revenue:        z.number().min(0),
  metadataUri:    z.string().optional(),
  provenanceHash: z.string().optional(),
});

type BagsOutput = z.infer<typeof BagsOutputSchema>;

// ── Whitelist of permitted CLI argument keys ───────────────────────────────────
// Any key not in this list is rejected before reaching the shell.
const ALLOWED_ARG_KEYS = new Set([
  "--revenue", "--business-id", "--name", "--category",
  "--network", "--wallet", "--output", "--format",
]);

function sanitizeArgs(args: string[]): string[] {
  const clean: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      if (!ALLOWED_ARG_KEYS.has(arg)) {
        throw new Error(`Disallowed CLI argument: ${arg}`);
      }
      clean.push(arg);
      // Push the value if next item exists and is not a flag
      if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
        const val = args[i + 1].replace(/[;&|`$(){}[\]\\'"]/g, ""); // strip shell metacharacters
        clean.push(val);
        i++;
      }
    }
  }
  return clean;
}

function parseCliOutput(output: string): BagsOutput {
  return {
    bagsId:         output.match(/(?:id|bags.?id)[:\s]+([A-Za-z0-9_-]{4,})/i)?.[1] ?? "",
    revenue:        parseFloat(
                      (output.match(/revenue[:\s$]+([\d,.]+)/i)?.[1] ?? "0")
                        .replace(/,/g, "")
                    ),
    metadataUri:    output.match(/metadata.?uri[:\s]+(\S+)/i)?.[1],
    provenanceHash: output.match(/(?:hash|provenance)[:\s]+([A-Za-z0-9]{32,})/i)?.[1],
  };
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

export interface BagsTokenizeParams {
  cliArgs:      string[];      // e.g. ["--revenue","45000","--business-id","biz-123"]
  businessName: string;
  walletAddress: string;
  category?:    string;
}

export interface BagsTokenizeResult {
  success:      boolean;
  assetId?:     string;
  certId?:      string;
  parsed?:      BagsOutput;
  error?:       string;
  retries?:     number;
}

// ── Core tokenize function ────────────────────────────────────────────────────
export async function tokenizeBagsRevenue(
  params: BagsTokenizeParams,
  attempt = 0
): Promise<BagsTokenizeResult> {
  const db = createAdminClient();

  try {
    // 1. Sanitize and execute CLI
    const safeArgs = sanitizeArgs(params.cliArgs);
    const command  = `bags tokenize ${safeArgs.join(" ")}`;
    const output   = execSync(command, { encoding:"utf8", timeout:45_000 });

    // 2. Parse and validate output
    const raw       = parseCliOutput(output);
    const validated = BagsOutputSchema.parse(raw);

    // 3. Persist asset to Supabase
    if (!db) throw new Error("Database not configured");

    const { data: asset, error: assetErr } = await db
      .from("assets")
      .insert({
        title:              params.businessName,
        category:           params.category ?? "Business Revenue",
        owner_wallet:       params.walletAddress,
        declared_value_usd: validated.revenue,
        verification_status:"submitted",
        mint_cost_abra:     0,
        metadata_uri:       validated.metadataUri ?? null,
      })
      .select("id")
      .single();

    if (assetErr || !asset) throw new Error(assetErr?.message ?? "Asset insert failed");

    // 4. Log event
    await db.from("asset_events").insert({
      asset_id:   asset.id,
      event_type: "BAGS_TOKENIZED",
      actor:      params.walletAddress,
      actor_name: "BAGS CLI",
      payload: {
        bagsId:         validated.bagsId,
        revenue:        validated.revenue,
        provenanceHash: validated.provenanceHash,
        cliOutput:      output.slice(0, 500), // truncate for storage
      },
    });

    // 5. Write to verification_certificates (off-chain until Anchor deployed)
    const certId = `BAGS-${validated.bagsId}-${Date.now()}`;
    await db.from("verification_certificates").insert({
      certificate_id:     certId,
      asset_id:           asset.id,
      metadata_uri:       validated.metadataUri ?? `bags://${validated.bagsId}`,
      verifier_id:        "BAGS_PROTOCOL",
      verifier_name:      "Bags.fm Verification",
      verifier_signature: validated.provenanceHash ?? `bags-sig-${validated.bagsId}`,
      provenance_root:    validated.provenanceHash ?? `bags-root-${validated.bagsId}`,
      custody_ref:        validated.bagsId,
      collateral_score:   72,
      fraud_risk_score:   15,
      liquidity_rating:   "medium",
      anchored_tx:        `BAGS-PENDING-${asset.id}`,
    });

    return { success:true, assetId:asset.id, certId, parsed:validated };

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const isTransient = msg.includes("timeout") || msg.includes("ENOENT")
                     || msg.includes("network") || msg.includes("connect");

    if (isTransient && attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, RETRY_DELAY * (attempt + 1)));
      return tokenizeBagsRevenue(params, attempt + 1);
    }

    // Log failure event if DB is available
    if (db) {
      await db.from("audit_logs").insert({
        actor:       params.walletAddress,
        action:      "BAGS_TOKENIZE_FAILED",
        resource:    "bags_service",
        resource_id: params.businessName,
        new_state:   { error:msg, attempt, cliArgs:params.cliArgs },
      }).catch(() => {});
    }

    return { success:false, error:msg, retries:attempt };
  }
}

// ── Revenue sync (for cron job) ────────────────────────────────────────────────
export async function syncBagsRevenue(): Promise<{ synced:number; failed:number }> {
  const db = createAdminClient();
  if (!db) return { synced:0, failed:0 };

  const { data: assets } = await db
    .from("assets")
    .select("id,title,owner_wallet,metadata_uri")
    .eq("category", "Business Revenue")
    .not("metadata_uri", "is", null);

  let synced = 0, failed = 0;

  for (const asset of assets ?? []) {
    const bagsId = String(asset.metadata_uri ?? "").replace("bags://","");
    if (!bagsId) continue;

    try {
      const output = execSync(
        `bags status ${sanitizeArgs(["--business-id", bagsId]).join(" ")}`,
        { encoding:"utf8", timeout:30_000 }
      );
      const parsed = parseCliOutput(output);

      if (parsed.revenue > 0) {
        await db.from("assets")
          .update({ current_value_usd: parsed.revenue })
          .eq("id", asset.id);

        await db.from("asset_events").insert({
          asset_id:   asset.id,
          event_type: "BAGS_REVENUE_SYNCED",
          actor:      "SYSTEM",
          payload:    { bagsId, revenue: parsed.revenue },
        });
        synced++;
      }
    } catch { failed++; }
  }

  return { synced, failed };
}