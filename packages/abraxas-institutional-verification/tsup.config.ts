import { defineConfig } from "tsup";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export default defineConfig({
  entry: {
    index: "src/index.ts",
    consumption: "src/consumption.ts",
    "fixtures/synthetic": "src/fixtures/synthetic.ts",
  },
  format: ["esm", "cjs"],
  dts: { resolve: true },
  tsconfig: "tsconfig.json",
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  target: "node20",
  outDir: "dist",
  esbuildOptions(options) {
    const shims = path.join(path.dirname(fileURLToPath(import.meta.url)), "shims");
    options.alias = {
      ...(options.alias as Record<string, string> | undefined),
      "@": repoRoot,
      "@/lib/supabase/admin": path.join(shims, "supabase-admin.ts"),
      "@/lib/partner/onchainVerifierConformance/verify": path.join(shims, "onchain-conformance-verify.ts"),
      "@/lib/partner/onchainVerifierConformance/vectors": path.join(shims, "onchain-conformance-vectors.ts"),
    };
  },
  external: ["pg"],
});
