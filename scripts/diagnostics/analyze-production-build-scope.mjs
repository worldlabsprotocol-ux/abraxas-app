#!/usr/bin/env node
/**
 * Evidence snapshot for production compile scope (routes, deps, ONNX reachability).
 * Usage: node scripts/diagnostics/analyze-production-build-scope.mjs > report.json
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();

function walk(dir, acc, ext) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walk(p, acc, ext);
    } else if (p.endsWith(ext)) {
      acc.push(p.slice(ROOT.length + 1));
    }
  }
}

const pages = [];
walk(join(ROOT, "app"), pages, "page.tsx");
const apiRoutes = [];
walk(join(ROOT, "app"), apiRoutes, "route.ts");

const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const deps = Object.keys(pkg.dependencies ?? {});

function grepImport(substr) {
  const hits = [];
  for (const file of [...pages, ...apiRoutes]) {
    try {
      const text = readFileSync(join(ROOT, file), "utf8");
      if (text.includes(substr)) hits.push(file);
    } catch {
      /* ignore */
    }
  }
  return hits;
}

const onnxServerHits = [];
function walkTs(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".git") continue;
      walkTs(p);
    } else if (/\.(ts|tsx|js|mjs)$/.test(name)) {
      try {
        const text = readFileSync(p, "utf8");
        if (text.includes("onnxruntime-node")) {
          onnxServerHits.push(p.slice(ROOT.length + 1));
        }
      } catch {
        /* ignore */
      }
    }
  }
}
walkTs(ROOT);

const report = {
  generatedAt: new Date().toISOString(),
  counts: {
    appPages: pages.length,
    apiRoutes: apiRoutes.length,
    productionDependencies: deps.length,
  },
  heavyDependencyReachability: {
    onnxruntimeNodeFiles: onnxServerHits,
    rechartsPageImports: grepImport("recharts"),
    walletAdapterWalletsInPackageJson: deps.includes("@solana/wallet-adapter-wallets"),
  },
  vercelBuildCommand: pkg.scripts?.["build:vercel"],
  note: "Compile scope ≠ runtime memory. ONNX is server-only (IDV capture); not imported from client components in grep above.",
};

console.log(JSON.stringify(report, null, 2));
