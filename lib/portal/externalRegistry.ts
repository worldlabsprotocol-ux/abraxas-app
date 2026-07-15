// FILE: lib/portal/externalRegistry.ts
// Owner self-serve listings — DB → public registry + explorer surfaces.

import { createClient } from "@supabase/supabase-js";
import type { AssuranceBreakdown } from "@/lib/assuranceTaxonomy";
import type { ExploreAsset, VerifyState } from "@/lib/data/exploreAssets";
import type { RegistryAssetDef } from "@/lib/data/registryAssets";
import { resolveRegistryAsset } from "@/lib/data/registryAssets";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const DEFAULT_IMAGE = "/assets/worldwearables/naj.jpg";

export interface ExternalApplicationRow {
  id: string;
  asset_name: string;
  asset_class: string;
  jurisdiction?: string | null;
  estimated_value?: string | null;
  evidence_scope?: string | null;
  description?: string | null;
  status: string;
  public_verify_slug?: string | null;
  named_reviewer?: string | null;
  review_signed_at?: string | null;
  is_demo_sample?: boolean | null;
  registry_published_at?: string | null;
  created_at?: string | null;
}

const ASSET_CLASS_LABEL: Record<string, string> = {
  REAL_ESTATE_LAND: "Real Estate · Land",
  REAL_ESTATE: "Real Estate",
  MINERAL_RIGHTS: "Mineral Rights",
  TRIBAL_LAND: "Tribal Land & Stewardship",
  BUSINESS_ENTITY: "Business · Operating entity",
  OTHER: "Asset · Owner listed",
};

function isFullyVerified(row: ExternalApplicationRow): boolean {
  return row.status === "verified" || Boolean(row.review_signed_at?.trim());
}

function verifyStateForRow(row: ExternalApplicationRow): VerifyState {
  if (isFullyVerified(row)) return "open";
  return "listed";
}

function assuranceForRow(row: ExternalApplicationRow): AssuranceBreakdown {
  const ts = row.registry_published_at ?? row.created_at ?? new Date().toISOString();
  if (isFullyVerified(row)) {
    return {
      L1_IdentityClaim: { status: "VERIFIED", timestamp: ts, provider: "Owner_Intake" },
      L2_LegalReview: { status: "VERIFIED", timestamp: ts, provider: "Abraxas_Review" },
    };
  }
  return {
    L1_IdentityClaim: { status: "OWNER_LISTED", timestamp: ts, provider: "Self_Serve_Launch" },
    L2_LegalReview: { status: "PENDING", timestamp: ts, provider: "Abraxas_Review" },
  };
}

function noticeForRow(row: ExternalApplicationRow): string {
  if (row.is_demo_sample) {
    return "DEMO / SAMPLE — illustrates owner intake. Not verified.";
  }
  if (isFullyVerified(row)) {
    return "Abraxas reviewed evidence scope — partners may request eligibility checks against this record.";
  }
  return "Owner-listed on Abraxas (L1). Not Abraxas-verified — upgrade path available after evidence review. Metrics are owner-provided unless labeled otherwise.";
}

export function externalRowToRegistryAsset(row: ExternalApplicationRow): RegistryAssetDef {
  const slug = row.public_verify_slug!.trim();
  const verified = isFullyVerified(row);
  return {
    abxId: slug,
    slug: slug.toLowerCase(),
    name: row.asset_name,
    assetClass: row.asset_class,
    location: row.jurisdiction?.trim() || "Jurisdiction on file",
    image: DEFAULT_IMAGE,
    verifyState: verifyStateForRow(row),
    pipelineStage: verified ? "OWNER_VERIFIED" : "OWNER_LISTED",
    assuranceLevel: verified ? 2 : 1,
    assuranceTaxonomy: assuranceForRow(row),
    metadataUri: `/portal/status?application_id=${encodeURIComponent(row.id)}`,
    notice: noticeForRow(row),
    tokenization: {
      standard: "Abraxas Registry Entry",
      chain: "Off-chain record · Sui settlement rail",
      status: verified ? "REVIEW_COMPLETE" : "OWNER_LISTED",
    },
    aliases: [row.id],
  };
}

export function externalRowToExploreAsset(row: ExternalApplicationRow): ExploreAsset {
  const slug = row.public_verify_slug!.trim();
  const verified = isFullyVerified(row);
  return {
    id: slug.toLowerCase(),
    name: row.asset_name,
    assetClass: ASSET_CLASS_LABEL[row.asset_class] ?? row.asset_class,
    location: row.jurisdiction?.trim() || "On file with owner",
    image: DEFAULT_IMAGE,
    primaryLabel: verified ? "Status" : "Listing",
    primaryValue: verified ? "Reviewed" : "Owner listed",
    primaryMeta: { level: verified ? 2 : 1, type: "reference", asOf: row.registry_published_at ?? row.created_at ?? undefined },
    secondaryLabel: "Value",
    secondaryValue: row.estimated_value?.trim() || "Owner provided",
    secondaryMeta: { level: 1, type: "estimated" },
    state: verifyStateForRow(row),
    note: verified
      ? "Abraxas evidence review complete — partners can request scoped eligibility."
      : "Self-serve listing — not Abraxas-verified yet. Owner can upgrade after evidence review.",
    href: `/verify/${encodeURIComponent(slug)}`,
    cta: "View record",
  };
}

function supabaseAdmin() {
  if (!SB_URL || !SB_KEY) return null;
  return createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
}

export async function fetchPublishedExternalApplications(limit = 48): Promise<ExternalApplicationRow[]> {
  const sb = supabaseAdmin();
  if (!sb) return [];

  const { data } = await sb
    .from("external_asset_applications")
    .select(
      "id, asset_name, asset_class, jurisdiction, estimated_value, evidence_scope, description, status, public_verify_slug, named_reviewer, review_signed_at, is_demo_sample, registry_published_at, created_at",
    )
    .not("public_verify_slug", "is", null)
    .eq("is_demo_sample", false)
    .order("registry_published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as ExternalApplicationRow[];
}

export async function resolveExternalRegistryAsset(query: string): Promise<RegistryAssetDef | null> {
  const staticHit = resolveRegistryAsset(query);
  if (staticHit) return null;

  const sb = supabaseAdmin();
  if (!sb) return null;

  const q = query.trim();
  const qLower = q.toLowerCase();

  let row: ExternalApplicationRow | null = null;

  const bySlug = await sb
    .from("external_asset_applications")
    .select(
      "id, asset_name, asset_class, jurisdiction, estimated_value, evidence_scope, description, status, public_verify_slug, named_reviewer, review_signed_at, is_demo_sample, registry_published_at, created_at",
    )
    .eq("public_verify_slug", q)
    .maybeSingle();

  if (bySlug.data?.public_verify_slug) {
    row = bySlug.data as ExternalApplicationRow;
  }

  if (!row && /^abx-/i.test(q)) {
    const bySlugI = await sb
      .from("external_asset_applications")
      .select(
        "id, asset_name, asset_class, jurisdiction, estimated_value, evidence_scope, description, status, public_verify_slug, named_reviewer, review_signed_at, is_demo_sample, registry_published_at, created_at",
      )
      .ilike("public_verify_slug", q)
      .maybeSingle();
    if (bySlugI.data?.public_verify_slug) row = bySlugI.data as ExternalApplicationRow;
  }

  if (!row) {
    const byId = await sb
      .from("external_asset_applications")
      .select(
        "id, asset_name, asset_class, jurisdiction, estimated_value, evidence_scope, description, status, public_verify_slug, named_reviewer, review_signed_at, is_demo_sample, registry_published_at, created_at",
      )
      .eq("id", q)
      .maybeSingle();
    if (byId.data?.public_verify_slug) row = byId.data as ExternalApplicationRow;
  }

  if (!row && qLower.length >= 8) {
    const { data: recent } = await sb
      .from("external_asset_applications")
      .select(
        "id, asset_name, asset_class, jurisdiction, estimated_value, evidence_scope, description, status, public_verify_slug, named_reviewer, review_signed_at, is_demo_sample, registry_published_at, created_at",
      )
      .not("public_verify_slug", "is", null)
      .limit(200);

    row = (recent ?? []).find(r =>
      r.public_verify_slug?.toLowerCase() === qLower ||
      r.id === q,
    ) as ExternalApplicationRow | undefined ?? null;
  }

  if (!row?.public_verify_slug?.trim()) return null;
  return externalRowToRegistryAsset(row);
}

export async function resolveExternalApplicationBySlug(slug: string): Promise<ExternalApplicationRow | null> {
  const sb = supabaseAdmin();
  if (!sb) return null;
  const { data } = await sb
    .from("external_asset_applications")
    .select(
      "id, asset_name, asset_class, jurisdiction, estimated_value, evidence_scope, description, status, public_verify_slug, named_reviewer, review_signed_at, is_demo_sample, registry_published_at, created_at",
    )
    .eq("public_verify_slug", slug)
    .maybeSingle();
  return (data as ExternalApplicationRow | null) ?? null;
}

export async function fetchExploreAssetsMerged(): Promise<ExploreAsset[]> {
  const { EXPLORE_ASSETS } = await import("@/lib/data/exploreAssets");
  const published = await fetchPublishedExternalApplications();
  const staticIds = new Set(EXPLORE_ASSETS.map(a => a.id));
  const dynamic = published
    .filter(r => r.public_verify_slug?.trim())
    .map(externalRowToExploreAsset)
    .filter(a => !staticIds.has(a.id));
  return [...EXPLORE_ASSETS, ...dynamic];
}
