#!/usr/bin/env node
// Rewrites em dash, en dash, and sentence punctuation dashes in user facing string literals.

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const EXCLUDED = new Set(["node_modules", ".next", "api"]);

function walk(dir, files = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) {
      if (EXCLUDED.has(e)) continue;
      walk(p, files);
    } else if (/\.(tsx|ts)$/.test(e) && !/\.test\.(tsx|ts)$/.test(e)) {
      files.push(p);
    }
  }
  return files;
}

function shouldProcess(rel) {
  if (rel.startsWith("app/api/")) return false;
  if (rel.startsWith("app/") || rel.startsWith("components/")) return true;
  if (!rel.startsWith("lib/")) return false;
  if (/\.test\.(ts|tsx)$/.test(rel) || /\/server\//.test(rel)) return false;
  if (/Copy|partnerJourney|businessPage|goodTrouble|passportCustomer|simplifiedHome|assuranceNetwork|identityCapture|docsHub|teamProfile|signInCopy|partnerHolder|reasonCodes|identityVerificationStates|adminReviewService|biometricStatus|clientPreflight|publicMetrics|consumerCopy|activationCopy/.test(rel)) {
    return true;
  }
  if (rel.startsWith("lib/idv/") && !/\.test\./.test(rel)) return true;
  if (rel.startsWith("lib/home/")) return true;
  if (rel.startsWith("lib/passport/") && !/\.test\./.test(rel)) return true;
  if (rel.startsWith("lib/partner/") && !/\.test\./.test(rel)) return true;
  if (rel.startsWith("lib/home/")) return true;
  if (rel.startsWith("lib/passport/") && !/\.test\./.test(rel)) return true;
  if (rel.startsWith("lib/sui/") && /signInCopy/.test(rel)) return true;
  return false;
}

function fixProse(text) {
  let out = text;
  if (/L\d–L\d/.test(out) || /L\d–L\d/.test(out)) return out;
  out = out.replace(/\s—\s/g, ", ");
  out = out.replace(/\s–\s/g, (m, _i, s) => {
    const idx = s.indexOf(m);
    const ctx = s.slice(Math.max(0, idx - 4), idx + m.length + 4);
    if (/L\d–L\d/.test(ctx)) return m;
    return ", ";
  });
  out = out.replace(/\s-\s/g, (m, _i, s) => {
    const idx = s.indexOf(m);
    const ctx = s.slice(Math.max(0, idx - 6), idx + m.length + 6);
    if (/next=|method|path|GET |POST |curl|example/i.test(ctx)) return m;
    if (/L\d–L\d|L\d-L\d/.test(ctx)) return m;
    return ". ";
  });
  out = out.replace(/\b(age|non|pre|self|on|off|real|full|higher|low|high|cross|multi|partner|third|server|password|operator|design|sandbox|production|closed|open)-([a-z]{3,})\b/gi, "$1 $2");
  out = out.replace(/"—"/g, '"n/a"');
  out = out.replace(/'—'/g, "'n/a'");
  return out;
}

function fixLine(line) {
  if (/^\s*\/\//.test(line) || /^\s*\/\*/.test(line) || /^\s*\*/.test(line)) return line;
  if (/\/\*\*/.test(line)) return line;
  if (/fontFamily|font-family|animation:|strokeWidth|gridTemplate|minmax\(|clamp\(/.test(line)) return line;

  return line.replace(/("([^"\\]|\\.)*"|'([^'\\]|\\.)*'|`([^`\\]|\\.)*`)/g, (literal) => {
    const inner = literal.slice(1, -1);
    if (inner.length < 6 || !/[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(inner)) return literal;
    const fixed = fixProse(inner);
    if (fixed === inner) return literal;
    const quote = literal[0];
    return `${quote}${fixed}${quote}`;
  });
}

const files = [
  ...walk(join(ROOT, "app")),
  ...walk(join(ROOT, "components")),
  ...walk(join(ROOT, "lib")),
].filter((f) => shouldProcess(relative(ROOT, f)));

let changed = 0;
for (const file of files) {
  const rel = relative(ROOT, file);
  const src = readFileSync(file, "utf8");
  const lines = src.split("\n");
  const next = lines.map(fixLine);
  const out = next.join("\n");
  if (out !== src) {
    writeFileSync(file, out);
    changed += 1;
    console.log("fixed", rel);
  }
}
console.log(`Updated ${changed} files`);
