import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@abraxas/partner-kit/trust": path.resolve(__dirname, "src/trust/index.ts"),
      "@abraxas/partner-kit/webhooks": path.resolve(__dirname, "src/webhooks/index.ts"),
      "@abraxas/partner-kit": path.resolve(__dirname, "src/index.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
