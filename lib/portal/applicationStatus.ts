// FILE: lib/portal/applicationStatus.ts
// Owner-facing lifecycle for external asset applications (land, mineral, etc.).

export type ApplicationDbStatus =
  | "pending_review"
  | "under_review"
  | "verified"
  | "declined";

export interface ApplicationStatusStep {
  id: string;
  label: string;
  detail: string;
  complete: boolean;
  current: boolean;
}

export interface ApplicationLifecycle {
  status: ApplicationDbStatus;
  steps: ApplicationStatusStep[];
  verified: boolean;
  listed: boolean;
  verify_url: string | null;
  status_url: string;
}

export interface ApplicationRowFields {
  id: string;
  status: string;
  asset_name: string;
  asset_class: string;
  jurisdiction?: string | null;
  evidence_scope?: string | null;
  named_reviewer?: string | null;
  review_signed_at?: string | null;
  public_verify_slug?: string | null;
  registry_published_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export function normalizeApplicationStatus(raw: string): ApplicationDbStatus {
  if (raw === "under_review" || raw === "verified" || raw === "declined") return raw;
  return "pending_review";
}

export function buildApplicationLifecycle(
  applicationId: string,
  row: ApplicationRowFields,
): ApplicationLifecycle {
  const status = normalizeApplicationStatus(row.status);
  const declined = status === "declined";
  const hasReviewer = Boolean(row.named_reviewer?.trim());
  const signed = Boolean(row.review_signed_at);
  const hasSlug = Boolean(row.public_verify_slug?.trim());
  const verified = status === "verified" || (signed && hasSlug);
  const listed = hasSlug;

  const statusUrl = `/portal/status?application_id=${encodeURIComponent(applicationId)}`;
  const verifyUrl = hasSlug
    ? `/verify/${encodeURIComponent(row.public_verify_slug!.trim())}`
    : null;

  const submitted = true;
  const registryLive = listed;
  const evidenceReviewed = hasReviewer || status !== "pending_review" || signed || verified;
  const reviewerSigned = signed || verified;
  const recordVerified = verified;

  const steps: ApplicationStatusStep[] = [
    {
      id: "submitted",
      label: "Application received",
      detail: row.created_at
        ? `Submitted ${formatShortDate(row.created_at)} — you will not need to re-send this intake to every counterparty.`
        : "Your intake is on file. Abraxas holds the evidence scope you defined.",
      complete: submitted,
      current: !declined && !registryLive,
    },
    {
      id: "registry",
      label: "Registry listing live",
      detail: registryLive && hasSlug
        ? `Public reference ${row.public_verify_slug} — visible on the registry now. L1 owner-listed until Abraxas review upgrades assurance.`
        : "Your listing publishes immediately after launch — no waiting to get started.",
      complete: registryLive,
      current: !declined && submitted && !registryLive,
    },
    {
      id: "evidence",
      label: declined ? "Application closed" : "Evidence scope review",
      detail: declined
        ? "This application was not approved for verification."
        : hasReviewer
          ? `Reviewer assigned: ${row.named_reviewer}`
          : "Optional upgrade — Abraxas validates jurisdiction, asset class, and what you agreed to share.",
      complete: evidenceReviewed && !declined,
      current: !declined && registryLive && !evidenceReviewed,
    },
    {
      id: "signoff",
      label: "Named verification sign-off",
      detail: declined
        ? "Contact Abraxas if you believe this was in error."
        : signed
          ? `Signed ${formatShortDate(row.review_signed_at!)}`
          : "Full Abraxas VERIFIED status requires named reviewer sign-off — not required to start.",
      complete: reviewerSigned && !declined,
      current: !declined && evidenceReviewed && !reviewerSigned,
    },
    {
      id: "share",
      label: "You control what partners see",
      detail: recordVerified
        ? "Share minimum proof with approved investors, lenders, and developers — consent stays with you."
        : listed
          ? "Your listing is live. Partners can discover you — scoped attestations unlock after verification upgrade."
          : "After verification, you choose which relying parties receive scoped attestations.",
      complete: recordVerified || listed,
      current: listed && !recordVerified,
    },
  ];

  return {
    status,
    steps,
    verified: recordVerified,
    listed,
    verify_url: verifyUrl,
    status_url: statusUrl,
  };
}

export function sanitizeApplicationForOwner(row: ApplicationRowFields) {
  return {
    application_id: row.id,
    asset_name: row.asset_name,
    asset_class: row.asset_class,
    jurisdiction: row.jurisdiction ?? null,
    evidence_scope: row.evidence_scope ?? null,
    status: normalizeApplicationStatus(row.status),
    listed: Boolean(row.public_verify_slug?.trim()),
    public_verify_slug: row.public_verify_slug ?? null,
    named_reviewer: row.named_reviewer ?? null,
    review_signed_at: row.review_signed_at ?? null,
    registry_published_at: row.registry_published_at ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
