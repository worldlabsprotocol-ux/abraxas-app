import { describe, expect, it } from "vitest";
import { buildTrustRegistryIdl536, trustRegistryIdlDiscriminatorManifest536 } from "@/lib/solana/trustRegistry/idl/buildTrustRegistryIdl536";
import { buildTrustRegistryIdl535 } from "@/lib/solana/trustRegistry/idl/buildTrustRegistryIdl";

describe("trust registry IDL integrity (Build #536)", () => {
  it("extends #535 with governance instructions", () => {
    const idl536 = buildTrustRegistryIdl536();
    const idl535 = buildTrustRegistryIdl535();
    expect(idl536.instructions.length).toBe(idl535.instructions.length + 5);
    const names = idl536.instructions.map((ix) => ix.name);
    expect(names).toContain("nominate_governance_authority");
    expect(names).toContain("extend_registry_governance_layout");
  });

  it("manifest includes governance discriminators", () => {
    const m = trustRegistryIdlDiscriminatorManifest536();
    expect(m.instructions.nominate_governance_authority).toHaveLength(16);
    expect(m.instructions.extend_registry_governance_layout).toHaveLength(16);
  });
});
