#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");

function walk(dir, files = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) {
      if (e === "node_modules" || e === ".next") continue;
      walk(p, files);
    } else if (e.endsWith(".tsx") || e.endsWith(".ts")) files.push(p);
  }
  return files;
}

function accentForFile(rel) {
  if (rel.includes("/docs/") || rel.includes("/developers/") || rel.includes("/design-partner")) return "developer";
  if (rel.includes("/legal/")) return "legal";
  if (rel.includes("/integrate/") || rel.includes("/integrations/")) return "developer";
  if (rel.includes("/passport/")) return "passport";
  if (rel.includes("/good-trouble/") || rel.includes("/partner/")) return "partner";
  if (rel.includes("/verify/")) return "verify";
  if (rel.includes("/admin/")) return "admin";
  if (rel.includes("/security/") || rel.includes("/investors/")) return "home";
  return "neutral";
}

let updated = 0;
for (const file of walk(join(ROOT, "app"))) {
  const rel = relative(ROOT, file);
  let src = readFileSync(file, "utf8");
  if (!src.includes("RedesignPage") && !src.includes("RedesignShell")) continue;
  const accent = accentForFile(rel);

  // RedesignPage without accent
  if (src.includes("<RedesignPage") && !src.includes("accent=")) {
    src = src.replace(/<RedesignPage(\s+)/g, `<RedesignPage accent="${accent}"$1`);
    src = src.replace(/<RedesignPage>/g, `<RedesignPage accent="${accent}">`);
    writeFileSync(file, src);
    updated++;
    console.log(`accent RedesignPage: ${rel}`);
  }

  // RedesignShell -> AbxPageShell
  if (src.includes("RedesignShell") && !src.includes("AbxPageShell")) {
    if (!src.includes('from "@/components/design/AbxPageShell"')) {
      src = src.replace(
        /import \{ RedesignShell \} from "@\/components\/redesign\/RedesignShell";?\n/,
        `import { AbxPageShell } from "@/components/design/AbxPageShell";\n`,
      );
    }
    src = src.replace(/<RedesignShell>/g, `<AbxPageShell accent="${accent}">`);
    src = src.replace(/<\/RedesignShell>/g, "</AbxPageShell>");
    writeFileSync(file, src);
    updated++;
    console.log(`AbxPageShell: ${rel}`);
  }
}

console.log(`Updated ${updated} files`);
