import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const failures = [];

const packageJson = JSON.parse(read("package.json"));
const expectedNodeMajor = "24";
const expectedRust = "1.88.0";
const expectedAnchor = "0.30.1";
const expectedSolana = "2.2.20";
const expectedSbfTools = "v1.53";

if (packageJson.engines?.node !== `${expectedNodeMajor}.x`) {
  failures.push(`package.json engines.node must be ${expectedNodeMajor}.x`);
}

for (const selector of [".nvmrc", ".node-version"]) {
  if (read(selector).trim() !== expectedNodeMajor) {
    failures.push(`${selector} must select Node ${expectedNodeMajor}`);
  }
}

const rustToolchain = read("solana/abraxas-eligibility-gate/rust-toolchain.toml");
if (!rustToolchain.includes(`channel = "${expectedRust}"`)) {
  failures.push(`Solana workspace Rust must remain pinned to ${expectedRust}`);
}

const anchorConfig = read("solana/abraxas-eligibility-gate/Anchor.toml");
if (!anchorConfig.includes(`anchor_version = "${expectedAnchor}"`)) {
  failures.push(`Anchor must remain pinned to ${expectedAnchor}`);
}

const workflow = read(".github/workflows/ci.yml");
const nodeVersions = [...workflow.matchAll(/node-version:\s*["']?(\d+)/g)].map((match) => match[1]);
const nonCanonicalNodeVersions = [...new Set(nodeVersions.filter((version) => version !== expectedNodeMajor))];
if (nonCanonicalNodeVersions.length > 0) {
  failures.push(`CI contains non-canonical Node versions: ${nonCanonicalNodeVersions.join(", ")}`);
}
if (!workflow.includes(`Install Solana CLI ${expectedSolana}`)) {
  failures.push(`CI must install the reviewed Solana CLI ${expectedSolana}`);
}
if (!workflow.includes(`--tools-version ${expectedSbfTools}`)) {
  failures.push(`CI must build SBF artifacts with platform tools ${expectedSbfTools}`);
}

const report = {
  contract: "abraxas_release_toolchain_v1",
  node: expectedNodeMajor,
  rust: expectedRust,
  anchor: expectedAnchor,
  solana_cli: expectedSolana,
  sbf_platform_tools: expectedSbfTools,
  ci_node_jobs_checked: nodeVersions.length,
  status: failures.length === 0 ? "pass" : "fail",
  failures,
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (failures.length > 0) process.exitCode = 1;
