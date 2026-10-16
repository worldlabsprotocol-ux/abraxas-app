import { defineConfig } from "tsup";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const packageRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  entry: {
    index: "src/index.ts",
    consumption: "src/consumption.ts",
    "fixtures/synthetic": "src/fixtures/synthetic.ts",
  },
  format: ["esm", "cjs"],
  dts: { resolve: true },
  tsconfig: "tsconfig.json",
  /** Shipped tarballs must not embed repo sources — enable locally with SDK_SOURCEMAP=1. */
  sourcemap: process.env.SDK_SOURCEMAP === "1",
  clean: true,
  splitting: false,
  treeshake: true,
  minify: process.env.SDK_SOURCEMAP !== "1",
  target: "node20",
  outDir: "dist",
  onSuccess: async () => {
    if (process.env.SDK_SOURCEMAP !== "1") {
      const { unlinkSync, readdirSync, statSync } = await import("node:fs");
      const dist = path.join(packageRoot, "dist");
      const dropMaps = (dir: string) => {
        for (const name of readdirSync(dir)) {
          const p = path.join(dir, name);
          if (statSync(p).isDirectory()) dropMaps(p);
          else if (name.endsWith(".map")) unlinkSync(p);
        }
      };
      dropMaps(dist);
    }
  },
  esbuildOptions(options) {
    options.sourcesContent = false;
    options.legalComments = "none";
    const shims = path.join(packageRoot, "shims");
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
