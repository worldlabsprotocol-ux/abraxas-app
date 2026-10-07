import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(__dirname, "../..");
const RELEASE_DIR = join(ROOT, "dist/partner-kit-release");
const TGZ = join(RELEASE_DIR, "abraxas-partner-kit-0.1.0.tgz");
const FIXTURE = join(ROOT, "examples/partner-kit-external-consumer");

describe("partnerKit external artifact distribution", () => {
  it("packs a versioned tarball with checksum", { timeout: 120_000 }, () => {
    execSync("bash scripts/partner-kit-pack-release.sh", {
      cwd: ROOT,
      stdio: "pipe",
    });
    expect(existsSync(TGZ)).toBe(true);
    expect(existsSync(`${TGZ}.sha256`)).toBe(true);
    const checksum = readFileSync(`${TGZ}.sha256`, "utf8");
    expect(checksum).toContain("abraxas-partner-kit-0.1.0.tgz");
  });

  it("installs from tarball without workspace link and imports all entry points", { timeout: 120_000 }, () => {
    if (!existsSync(TGZ)) {
      execSync("bash scripts/partner-kit-pack-release.sh", { cwd: ROOT, stdio: "pipe" });
    }
    execSync("npm install --ignore-scripts", {
      cwd: FIXTURE,
      stdio: "pipe",
      env: { ...process.env, npm_config_audit: "false", npm_config_fund: "false" },
    });
    const out = execSync("npm test", { cwd: FIXTURE, encoding: "utf8" });
    expect(out).toContain("partner-kit external consumer imports: ok");
  });
});
