import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "node",
    include: [
      "lib/**/*.test.ts",
      "components/**/*.test.tsx",
      "scripts/demo/**/*.test.ts",
      "scripts/trust-contract-drift/**/*.test.ts",
      "examples/partner-access-nextjs-starter/**/*.test.ts",
      "examples/good-trouble-wix/**/*.test.js",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "server-only": path.resolve(__dirname, "test/mocks/server-only.ts"),
    },
  },
});
