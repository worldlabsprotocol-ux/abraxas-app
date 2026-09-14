#!/usr/bin/env node
// Wraps legacy app page.tsx files with AbxSectionLayout via segment layout.tsx
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const APP = join(ROOT, "app");

const SHELL_PATTERNS = [
  /AbxPageShell/,
  /RedesignPage/,
  /RedesignShell/,
  /PartnerJourneyLayout/,
  /PartnerVerifyShell/,
  /PartnerContinueClient/,
  /PartnerEnterClient/,
  /RedesignHome/,
];

const REDIRECT_PATTERN = /\bredirect\s*\(/;

function walk(dir, files = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) {
      if (e === "api") continue;
      walk(p, files);
    } else if (e === "page.tsx") files.push(p);
  }
  return files;
}

function classify(file) {
  const src = readFileSync(file, "utf8");
  const rel = relative(ROOT, file);
  if (REDIRECT_PATTERN.test(src) && !src.includes("return (") && !src.includes("return(")) {
    return { rel, status: "redirect" };
  }
  if (SHELL_PATTERNS.some((re) => re.test(src))) {
    return { rel, status: "migrated" };
  }
  if (rel.startsWith("app/admin/")) {
    return { rel, status: "admin" };
  }
  return { rel, status: "legacy", src };
}

const pages = walk(APP);
const inventory = pages.map(classify);

const legacy = inventory.filter((p) => p.status === "legacy");
console.log(`Total pages: ${pages.length}`);
console.log(`Legacy needing wrap: ${legacy.length}`);
for (const l of legacy) console.log(`  ${l.rel}`);

// Group legacy by parent directory for layout creation
const layoutDirs = new Map();
for (const l of legacy) {
  const dir = dirname(join(ROOT, l.rel));
  if (!layoutDirs.has(dir)) layoutDirs.set(dir, []);
  layoutDirs.get(dir).push(l.rel);
}

const LAYOUT_TEMPLATE = `"use client";
// Auto migrated segment layout — premium Abraxas shell
import { AbxSectionLayout } from "@/components/design/AbxSectionLayout";

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return <AbxSectionLayout>{children}</AbxSectionLayout>;
}
`;

let created = 0;
for (const [dir, routes] of layoutDirs) {
  const layoutPath = join(dir, "layout.tsx");
  if (existsSync(layoutPath)) {
    const existing = readFileSync(layoutPath, "utf8");
    if (existing.includes("AbxSectionLayout") || existing.includes("AdminShell")) continue;
    // metadata-only layout — prepend shell wrapper
    if (existing.includes("export default function") && existing.includes("return children")) {
      const upgraded = existing.replace(
        /export default function (\w+)\(\{ children \}[^)]*\)\s*\{\s*return children;\s*\}/,
        `import { AbxSectionLayout } from "@/components/design/AbxSectionLayout";

export default function $1({ children }: { children: React.ReactNode }) {
  return <AbxSectionLayout>{children}</AbxSectionLayout>;
}`,
      );
      if (upgraded !== existing) {
        writeFileSync(layoutPath, upgraded);
        console.log(`Upgraded layout: ${relative(ROOT, layoutPath)}`);
        created++;
      }
    }
    continue;
  }
  // Only create layout if ALL pages in dir are legacy (avoid double shell)
  const allPagesInDir = readdirSync(dir).filter((f) => f === "page.tsx" || f.endsWith("/page.tsx"));
  writeFileSync(layoutPath, LAYOUT_TEMPLATE);
  console.log(`Created layout: ${relative(ROOT, layoutPath)} (${routes.length} routes)`);
  created++;
}

console.log(`Layouts created/upgraded: ${created}`);
