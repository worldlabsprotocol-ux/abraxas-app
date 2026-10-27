import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig({
  ...base,
  use: {
    ...base.use,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  },
});
