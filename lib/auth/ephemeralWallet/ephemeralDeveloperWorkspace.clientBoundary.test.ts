// FILE: lib/auth/ephemeralWallet/ephemeralDeveloperWorkspace.clientBoundary.test.ts

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const DEVELOPER_WORKSPACE_CLIENT_FILES = [
  "components/account/EphemeralSandboxWorkspaceClient.tsx",
  "app/developers/ephemeral-sandbox/page.tsx",
] as const;

const FORBIDDEN_CLIENT_IMPORT_MARKERS = [
  "sandboxPolicyAvailability.server",
  "ephemeralAuthorizedTestIssuer",
  "lib/protocol/portableRevocation",
  "sandboxPolicyAvailability.ts",
  'from "@/lib/auth/ephemeralWallet/sandboxPolicyAvailability"',
  "from './sandboxPolicyAvailability'",
  "from \"./sandboxPolicyAvailability\"",
] as const;

describe("ephemeral developer workspace client import boundary", () => {
  it("does not import server-only policy availability or issuer modules", () => {
    for (const relativePath of DEVELOPER_WORKSPACE_CLIENT_FILES) {
      const source = readFileSync(resolve(process.cwd(), relativePath), "utf8");
      for (const marker of FORBIDDEN_CLIENT_IMPORT_MARKERS) {
        expect(source, `${relativePath} must not reference ${marker}`).not.toContain(marker);
      }
    }
    const workspaceClient = readFileSync(
      resolve(process.cwd(), "components/account/EphemeralSandboxWorkspaceClient.tsx"),
      "utf8",
    );
    expect(workspaceClient).toContain("sandboxPolicyAvailability.shared");
  });

  it("keeps shared policy availability module free of node and server imports", () => {
    const source = readFileSync(
      resolve(process.cwd(), "lib/auth/ephemeralWallet/sandboxPolicyAvailability.shared.ts"),
      "utf8",
    );
    expect(source).not.toContain("server-only");
    expect(source).not.toContain("node:");
    expect(source).not.toContain("ephemeralAuthorizedTestIssuer");
    expect(source).not.toContain("portableRevocation");
  });

  it("marks authoritative resolver as server-only", () => {
    const source = readFileSync(
      resolve(process.cwd(), "lib/auth/ephemeralWallet/sandboxPolicyAvailability.server.ts"),
      "utf8",
    );
    expect(source).toContain("server-only");
    expect(source).toContain("isSandboxTestIssuerRuntimeAllowed");
  });
});
