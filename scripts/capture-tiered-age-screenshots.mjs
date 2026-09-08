// scripts/capture-tiered-age-screenshots.mjs
import { chromium, devices } from "playwright";
import { mkdir } from "fs/promises";

const BASE = process.env.PREVIEW_BASE ?? "http://localhost:3000";
const OUT = process.env.ARTIFACT_DIR ?? "/opt/cursor/artifacts/screenshots";

async function capture() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const [name, device] of [
    ["desktop", null],
    ["mobile", devices["iPhone 13"]],
  ]) {
    const context = await browser.newContext(device ? { ...device } : {});
    const page = await context.newPage();
    await page.goto(`${BASE}/partner/release-gate-preview#browse_self_attest`, { waitUntil: "networkidle" });
    await page.waitForSelector("text=Continue browsing");
    await page.screenshot({ path: `${OUT}/tiered-age-browse-form-${name}.png`, fullPage: true });
    await context.close();
  }
  await browser.close();
  console.log(`Saved screenshots to ${OUT}`);
}

capture().catch((e) => {
  console.error(e);
  process.exit(1);
});
