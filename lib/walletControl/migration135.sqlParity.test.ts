import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION = readFileSync(
  join(process.cwd(), "supabase/migrations/135_wallet_control_post_revocation_contamination.sql"),
  "utf8",
);

/** Columns present on public.wallet_bindings through migrations 018 + 036 (+ 083 upsert). */
const WALLET_BINDINGS_COLUMNS = [
  "id",
  "subject_id",
  "chain",
  "wallet_address",
  "binding_method",
  "proof_signature",
  "verified_at",
  "revoked_at",
  "risk_status",
  "binding_status",
  "chain_id",
  "verified_domain",
] as const;

/** Columns present on public.credential_claims through migrations 018 + 034. */
const CREDENTIAL_CLAIMS_COLUMNS = [
  "id",
  "subject_id",
  "claim_type",
  "claim_value",
  "issued_at",
  "status",
  "evidence_reference",
  "revocation_reference",
  "updated_at",
] as const;

/** Columns present on public.audit_events (018). */
const AUDIT_EVENTS_COLUMNS = [
  "action",
  "object_type",
  "object_id",
  "metadata",
  "created_at",
] as const;

describe("migration 135 wallet_control_post_revocation_contamination", () => {
  it("runs inside an explicit transaction with temp tables dropped on commit", () => {
    expect(MIGRATION).toMatch(/\bbegin;/i);
    expect(MIGRATION).toMatch(/commit;/i);
    expect(MIGRATION).toContain("on commit drop");
    expect(MIGRATION).toContain("_wc_holder_revocations");
    expect(MIGRATION).toContain("_wc_contaminated_claims");
  });

  it("does not reference wallet_bindings.updated_at (column does not exist)", () => {
    const bindingUpdate = MIGRATION.match(
      /update public\.wallet_bindings[\s\S]*?from _wc_holder_revocations/i,
    )?.[0] ?? "";
    expect(bindingUpdate).not.toMatch(/updated_at/i);
    expect(WALLET_BINDINGS_COLUMNS).not.toContain("updated_at");
  });

  it("uses canonical wallet_bindings revocation columns only", () => {
    expect(MIGRATION).toMatch(/binding_status\s*=\s*'revoked'/);
    expect(MIGRATION).toMatch(/revoked_at\s*=\s*hr\.holder_revoked_at/);
  });

  it("references only schema-valid audit_events columns", () => {
    for (const column of AUDIT_EVENTS_COLUMNS) {
      expect(MIGRATION).toContain(column);
    }
    expect(MIGRATION).toMatch(/ae\.action\s*=\s*'wallet\.revoked'/);
    expect(MIGRATION).toMatch(/ae\.object_type\s*=\s*'wallet_binding'/);
    expect(MIGRATION).toMatch(/ae\.metadata->>'reason'/);
  });

  it("references only schema-valid credential_claims columns", () => {
    const usedClaimColumns = [
      "id",
      "claim_type",
      "claim_value",
      "issued_at",
      "status",
      "evidence_reference",
      "revocation_reference",
      "updated_at",
    ] as const;
    for (const column of usedClaimColumns) {
      expect(MIGRATION).toContain(column);
      expect(CREDENTIAL_CLAIMS_COLUMNS).toContain(column);
    }
    expect(MIGRATION).toMatch(/status\s*=\s*'expired'/);
    expect(MIGRATION).toMatch(/revocation_reference\s*=\s*'wallet_control_provenance_insufficient'/);
    expect(MIGRATION).toMatch(/revocation_reference\s*=\s*coalesce/);
  });

  it("compares uuid binding ids via text (audit_events.object_id is text)", () => {
    expect(MIGRATION).toMatch(/b\.id::text\s*=\s*hr\.binding_id/);
    expect(MIGRATION).toMatch(/hr\.binding_id::text/);
    expect(MIGRATION).toMatch(/'wb:'\s*\|\|\s*hr\.binding_id/);
    expect(MIGRATION).toMatch(/'wb:'\s*\|\|\s*b\.id::text/);
  });

  it("uses jsonb text extraction for claim_value proof artifacts", () => {
    expect(MIGRATION).toMatch(/claim_value->>'binding_method'/);
    expect(MIGRATION).toMatch(/claim_value->>'control_method'/);
    expect(MIGRATION).toMatch(/claim_value->>'challenge_id'/);
    expect(MIGRATION).toMatch(/claim_value->>'proof_signature'/);
    expect(MIGRATION).toMatch(/claim_value->>'wallet_binding_id'/);
  });

  it("is idempotent via active-status guards", () => {
    expect(MIGRATION).toMatch(/where c\.id = cc\.claim_id\s*\n\s*and c\.status = 'active'/);
    expect(MIGRATION).toMatch(/and c\.status = 'active'/g);
    expect(MIGRATION).toMatch(/and b\.revoked_at is null/);
    expect(MIGRATION).toMatch(/and b\.binding_status = 'active'/);
  });
});
