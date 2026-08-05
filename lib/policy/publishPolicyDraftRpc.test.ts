import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  mapPublishPolicyDraftRpcError,
  parsePublishPolicyDraftRpcResult,
} from "@/lib/policy/publishPolicyDraftRpc";
import { PolicyImmutabilityError } from "@/lib/policy/policyLifecycle";

const POLICY_ID = "good-trouble-retail-v1";

describe("publish_partner_policy_draft RPC contract", () => {
  const rpcSql = readFileSync(
    resolve(process.cwd(), "supabase/migrations/056_publish_partner_policy_draft_rpc.sql"),
    "utf8",
  );

  it("migration defines atomic publish with family lock and post-condition", () => {
    expect(rpcSql).toContain("for update");
    expect(rpcSql).toContain("set status = 'deprecated'");
    expect(rpcSql).toContain("set status = 'active'");
    expect(rpcSql).toMatch(/expected exactly one active version/);
    expect(rpcSql).toContain("jsonb_build_object");
  });

  it("parses successful publish payload with deprecated version", () => {
    const result = parsePublishPolicyDraftRpcResult({
      published: {
        id: POLICY_ID,
        partner_id: "good-trouble-cannabis",
        version: 2,
        name: "Good Trouble retail v2",
        rules_json: { minimum_age: 21 },
        status: "active",
      },
      deprecated_version: 1,
    });

    expect(result.published.version).toBe(2);
    expect(result.published.status).toBe("active");
    expect(result.deprecatedVersion).toBe(1);
  });

  it("parses first publish when no prior active version exists", () => {
    const result = parsePublishPolicyDraftRpcResult({
      published: {
        id: POLICY_ID,
        partner_id: "good-trouble-cannabis",
        version: 1,
        name: "Good Trouble retail",
        rules_json: {},
        status: "active",
      },
      deprecated_version: null,
    });

    expect(result.deprecatedVersion).toBeNull();
  });

  it("maps invalid publish attempts to PolicyImmutabilityError", () => {
    const err = mapPublishPolicyDraftRpcError({
      message: "publish_partner_policy_draft: only draft versions can be published (good-trouble-retail-v1 v2 is active)",
    });
    expect(err).toBeInstanceOf(PolicyImmutabilityError);

    const concurrent = mapPublishPolicyDraftRpcError({
      message: "publish_partner_policy_draft: failed to activate draft good-trouble-retail-v1 v2 (concurrent publish?)",
    });
    expect(concurrent).toBeInstanceOf(PolicyImmutabilityError);

    const invariant = mapPublishPolicyDraftRpcError({
      message: "publish_partner_policy_draft: invariant violated — expected exactly one active version for good-trouble-retail-v1",
    });
    expect(invariant).toBeInstanceOf(PolicyImmutabilityError);
  });

  it("maps unexpected database failures to generic Error (rollback leaves prior active intact)", () => {
    const err = mapPublishPolicyDraftRpcError({
      message: "connection reset by peer",
    });
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(PolicyImmutabilityError);
  });
});
