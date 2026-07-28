// FILE: app/api/sui/passport/provision/route.ts
// Phase 2: create on-chain Passport + issue stamps (sponsor wallet).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import {
  isPassportIssuerConfigured,
  provisionOnChainPassport,
  VERIFF_PASSPORT_STAMPS,
} from "@/lib/sui/passportIssuer";
import { getSuiClient } from "@/lib/sui/serverClient";
import { getSuiDeployment, getActiveSuiNetwork, passportTypeFilter, suiExplorerObject, suiExplorerTx } from "@/lib/sui/config";
import { parseSuiPassportObject } from "@/lib/sui/parsePassport";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

async function loadDbRecord(sui: string) {
  if (!SB_URL || !SB_KEY) return null;
  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data } = await sb
    .from("sui_passport_objects")
    .select("*")
    .eq("sui_address", sui)
    .maybeSingle();
  return data;
}

async function holderIsVerified(sui: string): Promise<boolean> {
  if (!SB_URL || !SB_KEY) return false;
  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data } = await sb
    .from("identity_verifications")
    .select("status")
    .or(`sui_address.eq.${sui},wallet_address.eq.${sui}`)
    .eq("status", "approved")
    .maybeSingle();
  return Boolean(data);
}

async function saveDbRecord(
  sui: string,
  result: Awaited<ReturnType<typeof provisionOnChainPassport>>,
) {
  if (!SB_URL || !SB_KEY) return;
  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  await sb.from("sui_passport_objects").upsert({
    sui_address: sui,
    object_id: result.objectId,
    network: getActiveSuiNetwork(),
    stamp_bitmask: result.stampBitmask,
    create_tx_digest: result.createTxDigest ?? null,
    stamps_tx_digest: result.stampsTxDigest ?? null,
    provisioned_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "sui_address" });
}

async function readOnChainPassport(
  sui: string,
  db: Awaited<ReturnType<typeof loadDbRecord>>,
) {
  const client = getSuiClient();
  if (db?.object_id) {
    const obj = await client.getObject({ id: db.object_id, options: { showContent: true, showType: true } });
    if (obj.data) {
      return parseSuiPassportObject(db.object_id, {
        ...obj.data,
        objType: obj.data.type,
        content: obj.data.content,
      });
    }
  }
  const owned = await client.getOwnedObjects({
    owner: sui,
    filter: { StructType: passportTypeFilter() },
    options: { showContent: true, showType: true },
  });
  const first = owned.data[0]?.data;
  if (!first) return null;
  return parseSuiPassportObject(first.objectId, {
    ...first,
    objType: first.type,
    content: first.content,
  });
}

function statusPayload(
  sui: string,
  db: Awaited<ReturnType<typeof loadDbRecord>>,
  onChain: ReturnType<typeof parseSuiPassportObject> | null,
  issuerConfigured: boolean,
  eligibleForProvision: boolean,
) {
  const stampsComplete = onChain
    ? (onChain.stampBitmask & VERIFF_PASSPORT_STAMPS) === VERIFF_PASSPORT_STAMPS
    : false;

  return {
    network: getActiveSuiNetwork(),
    sui_address: sui,
    issuer_configured: issuerConfigured,
    eligible_for_provision: eligibleForProvision,
    provisioned: Boolean(db?.object_id || onChain),
    object_id: db?.object_id ?? onChain?.objectId ?? null,
    stamp_bitmask: onChain?.stampBitmask ?? db?.stamp_bitmask ?? 0,
    stamp_ids: onChain?.stampIds ?? [],
    stamps_complete: stampsComplete,
    needs_provision: eligibleForProvision && issuerConfigured && !stampsComplete,
    create_tx_digest: db?.create_tx_digest ?? null,
    stamps_tx_digest: db?.stamps_tx_digest ?? null,
    explorer_object: (db?.object_id ?? onChain?.objectId)
      ? suiExplorerObject(db?.object_id ?? onChain!.objectId)
      : null,
    explorer_create_tx: db?.create_tx_digest ? suiExplorerTx(db.create_tx_digest) : null,
    explorer_stamps_tx: db?.stamps_tx_digest ? suiExplorerTx(db.stamps_tx_digest) : null,
  };
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("sui");
  if (!raw) {
    return NextResponse.json({ error: "sui param required" }, { status: 400 });
  }

  const sui = normalizeSuiAddress(raw);
  const db = await loadDbRecord(sui);
  const issuerConfigured = isPassportIssuerConfigured();
  const eligibleForProvision = await holderIsVerified(sui);

  let onChain: ReturnType<typeof parseSuiPassportObject> | null = null;
  try {
    onChain = await readOnChainPassport(sui, db);
  } catch {
    /* best-effort chain read */
  }

  return NextResponse.json(
    statusPayload(sui, db, onChain, issuerConfigured, eligibleForProvision),
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { sui_address?: string; sui?: string };
  const raw = body.sui_address ?? body.sui;
  if (!raw) {
    return NextResponse.json({ error: "sui_address required" }, { status: 400 });
  }

  if (!isPassportIssuerConfigured()) {
    return NextResponse.json(
      { error: "SUI_SPONSOR_SECRET_KEY and SUI_ISSUANCE_CAP_OBJECT_ID not configured" },
      { status: 503 },
    );
  }

  const sui = normalizeSuiAddress(raw);

  if (!(await holderIsVerified(sui))) {
    return NextResponse.json(
      { error: "Holder must complete identity verification before on-chain provision" },
      { status: 403 },
    );
  }

  try {
    const result = await provisionOnChainPassport(sui);
    await saveDbRecord(sui, result);
    const db = await loadDbRecord(sui);
    const onChain = await readOnChainPassport(sui, db);

    return NextResponse.json({
      ok: true,
      already_existed: result.alreadyExisted,
      ...statusPayload(sui, db, onChain, true, true),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Provision failed";
    console.error("[provision]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
