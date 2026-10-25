import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "node",
    setupFiles: ["./test/setup/jsdom.ts"],
    include: [
      "lib/**/*.test.ts",
      "components/**/*.test.tsx",
      "app/api/**/*.test.ts",
      "scripts/demo/**/*.test.ts",
      "scripts/launchpad-staging-smoke/**/*.test.ts",
      "scripts/trust-contract-drift/**/*.test.ts",
      "examples/partner-access-nextjs-starter/**/*.test.ts",
      "examples/integration-first-relying-party/**/*.test.ts",
      "examples/portable-relying-party/**/*.test.ts",
      "examples/design-partner-sandbox/**/*.test.ts",
      "examples/external-node-partner/**/*.test.ts",
      "examples/good-trouble-wix/**/*.test.js",
      "packages/**/*.test.ts",
    ],
  },
  resolve: {
    alias: {
      "@abraxas/independent-verifier": path.resolve(
        __dirname,
        "packages/abraxas-independent-verifier/src/index.ts",
      ),
      "@": path.resolve(__dirname, "."),
      "server-only": path.resolve(__dirname, "test/mocks/server-only.ts"),
      "wix-data": path.resolve(__dirname, "test/mocks/wix-data.js"),
      "@ledgerhq/errors": path.resolve(__dirname, "test/mocks/ledgerhq-errors.ts"),
      "@ledgerhq/errors/lib-es/helpers": path.resolve(__dirname, "test/mocks/ledgerhq-errors.ts"),
    },
  },
});
