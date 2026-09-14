// FILE: lib/design/userFacingCopyGuard.ts
// Scans user facing copy for forbidden dash punctuation in prose.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const REPO_ROOT = join(__dirname, "..", "..");

const EXCLUDED_DIRS = new Set(["node_modules", ".next", "api"]);
const EXCLUDED_FILE_PATTERNS = [
  /\.test\.(ts|tsx)$/,
  /\.spec\.(ts|tsx)$/,
  /routeInventory\.ts$/,
  /userFacingCopyGuard/,
  /fixtures\/copyGuardViolations/,
];

function shouldScanFile(absPath: string): boolean {
  const rel = relative(REPO_ROOT, absPath);
  if (EXCLUDED_FILE_PATTERNS.some((re) => re.test(rel))) return false;
  if (rel.startsWith("app/api/")) return false;
  if (!/\.(tsx|ts)$/.test(rel)) return false;

  if (rel.startsWith("app/") && rel.endsWith(".tsx")) return true;
  if (rel.startsWith("components/") && rel.endsWith(".tsx")) return true;
  if (rel.startsWith("lib/") && rel.endsWith(".ts") && !rel.includes("/server/")) {
    if (/Copy\.ts$|copy\.ts$|Profile\.ts$|signInCopy|businessPage|partnerHolder|goodTrouble|passportCustomer|simplifiedHome|assuranceNetwork|identityCapture|docsHub|teamProfile|partnerJourney/.test(rel)) {
      return true;
    }
    if (rel.includes("/home/") || rel.includes("/passport/") || rel.includes("/partner/") || rel.includes("/integrate/") || rel.includes("/idv/")) {
      return true;
    }
  }
  return false;
}

function walkScanFiles(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    if (statSync(abs).isDirectory()) {
      if (EXCLUDED_DIRS.has(entry)) continue;
      walkScanFiles(abs, files);
    } else if (shouldScanFile(abs)) {
      files.push(abs);
    }
  }
  return files;
}

function collectTargetFiles(): string[] {
  const roots = [
    join(REPO_ROOT, "app"),
    join(REPO_ROOT, "components"),
    join(REPO_ROOT, "lib"),
  ];
  const files = roots.flatMap((root) => {
    try {
      return walkScanFiles(root);
    } catch {
      return [];
    }
  });
  return Array.from(new Set(files)).sort();
}

function extractStringLiterals(line: string): string[] {
  const results: string[] = [];
  const patterns = [
    /"([^"\\]|\\.)*"/g,
    /'([^'\\]|\\.)*'/g,
    /`([^`\\]|\\.)*`/g,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      const inner = m[0].slice(1, -1);
      if (inner.length >= 6) results.push(inner);
    }
  }
  return results;
}

function isNonCopyLine(line: string): boolean {
  if (/fontFamily|font-family|fontSize|font-size|letterSpacing|lineHeight|borderRadius|gridTemplate|flexDirection|animation:|strokeWidth|stopColor|viewBox|textAnchor|Webkit|scrollbar|backdropFilter|minmax\(|clamp\(|repeat\(|textTransform|whiteSpace|wordBreak|boxShadow|background:|padding:|margin:|display:|gap:|color:\s*["']?#|rgba?\(/.test(line)) {
    return true;
  }
  return false;
}

function isTechnicalString(text: string): boolean {
  if (!/\s/.test(text)) return true;
  if (/^\/[a-z]/.test(text)) return true;
  if (/https?:\/\//.test(text)) return true;
  if (/Content-Type|application\/|abraxas:|abraxas-/.test(text)) return true;
  if (/^[a-z0-9]+(-[a-z0-9]+)+$/.test(text)) return true;
  if (/\b0x[a-fA-F0-9]{6,}\b/.test(text)) return true;
  if (/\bL[0-4]\b/.test(text) && /assurance|taxonomy|level/i.test(text)) return true;
  if (/\bRPC\b|\btuple\b|\bschema\b|\bmigration\b|\bpolicy engine\b/i.test(text)) return true;
  if (/\bW3C\b|\bJWT\b|\bzkLogin\b|\bGET\b|\bPOST\b|\bPUT\b|\bDELETE\b/.test(text)) return true;
  if (/\d+px|\d+rem|solid|var\(--|JetBrains|ui-monospace|sans-serif|monospace|system-ui|Space Grotesk|'Inter'|ease-in-out|ease-out|uppercase|lowercase|capitalize|\$\{/.test(text)) return true;
  if (/GET \/api|\/docs\/|npm run|allowSandbox|receipt_id/.test(text)) return true;
  if (/operator-provisioned|self-serve|api-key|callback allowlists/i.test(text)) return true;
  if (/^[A-Z_][A-Z0-9_]+$/.test(text)) return true;
  if (/\{[a-zA-Z_]+\}/.test(text)) return true;
  if (/`[a-z]+`/.test(text)) return true;
  if (/pulse\s+\d|infinite|stroke|gradient|viewBox/i.test(text)) return true;
  if (/[A-Z][A-Z0-9_]{4,}/.test(text)) return true;
  if (/IDV_PROVIDER=|YYYY-MM-DD|sui:deploy|\/api\//.test(text)) return true;
  if (/[a-z]+\/[a-z]/.test(text) && !/\s[a-z]{4,}/i.test(text)) return true;
  if (/^\$\{.*\}\s/.test(text) || /\s\$\{/.test(text)) return true;
  return false;
}

function shouldScanLine(_fileRel: string, line: string): boolean {
  if (/^\s*import\s/.test(line)) return false;
  if (/^\s*export\s+(type|interface)\s/.test(line)) return false;
  if (/console\.(log|warn|error)/.test(line)) return false;
  return true;
}

function isProseString(text: string): boolean {
  if (isTechnicalString(text)) return false;
  return /[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(text);
}

const MARKETING_HYPHEN_BLOCKLIST = /\b(age|higher|non|pre|self|multi|cross|on|off|real|full|low|high|open|closed|end|top|mid)-[a-z]{3,}\b/i;

function classifyDashViolation(text: string): CopyViolation["reason"] | null {
  if (text.includes("—")) return "em_dash";
  if (text.includes("–")) return "en_dash";
  if (/\s-\s/.test(text) && /[A-Za-z]/.test(text)) return "sentence_hyphen";
  if (MARKETING_HYPHEN_BLOCKLIST.test(text)) return "sentence_hyphen";
  return null;
}

export interface CopyViolation {
  file: string;
  line: number;
  text: string;
  reason: "em_dash" | "en_dash" | "sentence_hyphen";
}

export function scanStringForCopyViolations(text: string): CopyViolation["reason"] | null {
  if (!isProseString(text)) return null;
  return classifyDashViolation(text);
}

export function scanUserFacingCopy(): CopyViolation[] {
  const violations: CopyViolation[] = [];
  const files = collectTargetFiles();

  for (const file of files) {
    const rel = relative(REPO_ROOT, file);
    const lines = readFileSync(file, "utf8").split("\n");

    lines.forEach((line, idx) => {
      if (/^\s*\/\//.test(line) || /^\s*\/\*/.test(line) || /^\s*\*/.test(line)) return;
      if (/\/\*\*?/.test(line) || /\*\//.test(line)) return;
      if (!shouldScanLine(rel, line)) return;
      if (isNonCopyLine(line)) return;
      const literals = extractStringLiterals(line);
      for (const text of literals) {
        const reason = classifyDashViolation(text);
        if (reason && isProseString(text)) {
          violations.push({ file: rel, line: idx + 1, text, reason });
        }
      }
    });
  }

  return violations;
}

export function scannedFileCount(): number {
  return collectTargetFiles().length;
}
