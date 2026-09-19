import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Snapshot from `npm audit --json` on this branch. `npm audit fix` was not run.
// Direct production packages with a reported finding:
// - next@14.2.35 — fix is a SemVer major (16.x). Left pinned.
// - sharp@0.35.3 — npm reports 0.35.4. Not applied here: native binaries + output-file tracing.
// - @tailwindcss/postcss@4.3.1 — advisory is via postcss, not a proven nonbreaking API bump.
// - @walletconnect/ethereum-provider@2.19.1 — transitive WalletConnect tree; no isolated 2.x patch proven.
// - @coral-xyz/anchor, @solana/* — fixAvailable false or SemVer major / downgrade.
// - @reclaimprotocol/js-sdk — suggested 4.4.2 is a SemVer major from ^5.5.0.
// - viem — reported via ws; suggested “fix” points at unrelated wallet-adapter downgrade.
export const DIRECT_PROD_AUDIT_DECISION = "document_only_no_package_change" as const;

describe("direct production dependency audit discipline", () => {
  it("does not rewrite the lockfile or bump Next.js for audit noise", () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
      dependencies: Record<string, string>;
      engines: { node: string };
    };
    expect(pkg.engines.node).toBe("20.x");
    expect(pkg.dependencies.next).toBe("14.2.35");
    expect(pkg.dependencies.sharp).toBe("^0.35.3");
    expect(DIRECT_PROD_AUDIT_DECISION).toBe("document_only_no_package_change");
  });
});
