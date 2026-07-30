// FILE: scripts/homepage-guard/lib.ts
// Shared helpers for homepage baseline guard.

import { createHash } from "crypto";
import { readFileSync, existsSync } from "fs";
import { resolve, relative } from "path";

export const GUARD_ROOT = resolve(__dirname);
export const REPO_ROOT = resolve(GUARD_ROOT, "../..");

export interface Manifest {
  version: string;
  baselineCommit: string;
  referenceUrl: string;
  approvalMarkers: {
    envVar: string;
    envValue: string;
    prTag: string;
    commitTag: string;
  };
  protectedFiles: string[];
  protectedCss: {
    source: string;
    baseline: string;
    startMarker: string;
  };
  criticalMarkers: Array<{
    id: string;
    file: string;
    mustContain: string[];
  }>;
  protectedAssetPaths: string[];
}

export function loadManifest(): Manifest {
  const raw = readFileSync(resolve(GUARD_ROOT, "manifest.json"), "utf8");
  return JSON.parse(raw) as Manifest;
}

export function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function readRepoFile(relPath: string): string {
  const abs = resolve(REPO_ROOT, relPath);
  if (!existsSync(abs)) {
    throw new Error(`Missing file: ${relPath}`);
  }
  return readFileSync(abs, "utf8");
}

export function extractHomeCss(globalsContent: string, startMarker: string): string {
  const start = globalsContent.indexOf(startMarker);
  if (start < 0) {
    throw new Error(`Homepage CSS start marker not found: ${startMarker}`);
  }
  return globalsContent.slice(start).trimEnd();
}

export function baselinePath(relPath: string): string {
  return resolve(GUARD_ROOT, "baseline", relPath);
}

export function isUiChangeApproved(manifest: Manifest): boolean {
  const { envVar, envValue, prTag, commitTag } = manifest.approvalMarkers;

  if (process.env[envVar] === envValue) return true;
  if (process.env.GITHUB_PR_TITLE?.includes(prTag)) return true;
  if (process.env.GITHUB_PR_BODY?.includes(prTag)) return true;

  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (eventPath && existsSync(eventPath)) {
    try {
      const event = JSON.parse(readFileSync(eventPath, "utf8")) as {
        pull_request?: { title?: string; body?: string };
      };
      const title = event.pull_request?.title ?? "";
      const body = event.pull_request?.body ?? "";
      if (title.includes(prTag) || body.includes(prTag)) return true;
    } catch {
      // ignore malformed event payload
    }
  }

  if (process.env.GITHUB_COMMIT_MESSAGE?.includes(commitTag)) return true;

  return false;
}

export interface FileDiff {
  path: string;
  kind: "file" | "css" | "asset" | "marker";
  detail: string;
}

export function rel(repoPath: string): string {
  return relative(REPO_ROOT, repoPath);
}
