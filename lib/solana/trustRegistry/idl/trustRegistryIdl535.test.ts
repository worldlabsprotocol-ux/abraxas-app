import { describe, expect, it } from "vitest";
import { anchorAccountDiscriminator, anchorGlobalDiscriminator, discriminatorHex } from "@/lib/solana/trustRegistry/idl/anchorDiscriminator";
import { buildTrustRegistryIdl535, trustRegistryIdlDiscriminatorManifest535 } from "@/lib/solana/trustRegistry/idl/buildTrustRegistryIdl";
import { ABRAXAS_TRUST_REGISTRY_PROGRAM_ID } from "@/lib/solana/trustRegistry/constants";

describe("trust registry IDL integrity (Build #535)", () => {
  it("binds program id and instruction/account discriminators", () => {
    const idl = buildTrustRegistryIdl535();
    expect(idl.address).toBe(ABRAXAS_TRUST_REGISTRY_PROGRAM_ID);
    expect(idl.instructions).toHaveLength(12);
    const manifest = trustRegistryIdlDiscriminatorManifest535();
    expect(manifest.instructions.initialize_registry).toBe(
      discriminatorHex(anchorGlobalDiscriminator("initialize_registry")),
    );
    expect(manifest.accounts.TrustRegistry).toBe(discriminatorHex(anchorAccountDiscriminator("TrustRegistry")));
  });
});
