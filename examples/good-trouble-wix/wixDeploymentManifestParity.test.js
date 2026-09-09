// FILE: examples/good-trouble-wix/wixDeploymentManifestParity.test.js
// Ensures WIX_DEPLOYMENT_MANIFEST.md inventory and Section C copy-ready blocks match the repo.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "examples/good-trouble-wix");
const MANIFEST_PATH = join(ROOT, "WIX_DEPLOYMENT_MANIFEST.md");
const MANIFEST = readFileSync(MANIFEST_PATH, "utf8");

const PHANTOM_WIX_FILES = [
  "backend/browseReceiptMetadataValidator.js",
];

const AUTHORITATIVE_BROWSE_VALIDATORS = [
  "backend/browseReceiptValidator.js",
  "backend/browseReceiptRemoteValidator.js",
];

function parseSectionAInventoryPaths(manifest) {
  const sectionA = manifest.split("## B.")[0];
  const matches = [...sectionA.matchAll(/`(examples\/good-trouble-wix\/[^`]+)`/g)];
  return matches.map((match) => match[1]);
}

function parseSectionCBlocks(manifest) {
  const sectionC = manifest.split("## C. Copy-ready source")[1]?.split("\n## D.")[0] ?? "";
  const headers = [...sectionC.matchAll(/^### (public|pages|backend)\/([^\n]+)$/gm)];
  const blocks = new Map();

  for (const header of headers) {
    const relativePath = `${header[1]}/${header[2]}`;
    const repoPath = `examples/good-trouble-wix/${relativePath}`;
    const headerIndex = header.index ?? sectionC.indexOf(header[0]);
    const nextHeaderIndex = sectionC.indexOf("\n### ", headerIndex + header[0].length);
    const chunk = nextHeaderIndex === -1
      ? sectionC.slice(headerIndex)
      : sectionC.slice(headerIndex, nextHeaderIndex);
    const codeMatch = chunk.match(/```javascript\n([\s\S]*?)\n```/);
    blocks.set(repoPath, codeMatch?.[1] ?? null);
  }

  return blocks;
}

describe("WIX_DEPLOYMENT_MANIFEST parity", () => {
  it("does not list the phantom browseReceiptMetadataValidator in Section A inventory", () => {
    const sectionA = MANIFEST.split("## B.")[0];
    expect(sectionA).not.toMatch(/`examples\/good-trouble-wix\/backend\/browseReceiptMetadataValidator\.js`/);
    for (const phantom of PHANTOM_WIX_FILES) {
      expect(existsSync(join(ROOT, phantom))).toBe(false);
    }
  });

  it("warns operators not to deploy the phantom browseReceiptMetadataValidator filename", () => {
    expect(MANIFEST).toContain("Never create `browseReceiptMetadataValidator.js` on Wix");
  });

  it("documents authoritative browse receipt validator modules", () => {
    for (const file of AUTHORITATIVE_BROWSE_VALIDATORS) {
      expect(MANIFEST).toContain(file);
      expect(existsSync(join(ROOT, file))).toBe(true);
    }
  });

  it("lists only existing deployable source files in Section A inventory", () => {
    const inventoryPaths = parseSectionAInventoryPaths(MANIFEST);
    expect(inventoryPaths.length).toBeGreaterThan(0);

    for (const repoPath of inventoryPaths) {
      const absolute = join(process.cwd(), repoPath);
      expect(existsSync(absolute), `missing inventory file: ${repoPath}`).toBe(true);
    }
  });

  it("includes Section C copy-ready blocks for every Section A inventory file", () => {
    const inventoryPaths = parseSectionAInventoryPaths(MANIFEST);
    const sectionCBlocks = parseSectionCBlocks(MANIFEST);

    for (const repoPath of inventoryPaths) {
      const block = sectionCBlocks.get(repoPath);
      expect(block, `missing Section C block for ${repoPath}`).toBeTruthy();
      expect(block).toContain(`// FILE: ${repoPath}`);
    }
  });

  it("matches Section C browseReceiptValidator.js to repository source", () => {
    const repoPath = "examples/good-trouble-wix/backend/browseReceiptValidator.js";
    const disk = readFileSync(join(process.cwd(), repoPath), "utf8").trim();
    const block = parseSectionCBlocks(MANIFEST).get(repoPath)?.trim();
    expect(block).toBe(disk);
  });

  it("matches Section C browseReceiptRemoteValidator.js to repository source", () => {
    const repoPath = "examples/good-trouble-wix/backend/browseReceiptRemoteValidator.js";
    const disk = readFileSync(join(process.cwd(), repoPath), "utf8").trim();
    const block = parseSectionCBlocks(MANIFEST).get(repoPath)?.trim();
    expect(block).toBe(disk);
  });

  it("browseReceiptRemoteValidator imports browseReceiptValidator with exact case", () => {
    const source = readFileSync(join(ROOT, "backend/browseReceiptRemoteValidator.js"), "utf8");
    expect(source).toContain('from "./browseReceiptValidator.js"');
    expect(source).not.toMatch(/browseReceiptMetadataValidator/i);
  });
});
