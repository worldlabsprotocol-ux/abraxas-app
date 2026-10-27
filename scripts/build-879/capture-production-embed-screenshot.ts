#!/usr/bin/env npx tsx
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const base = (process.env.BUILD879_WALLET_HOST ?? "https://abraxasworld.xyz").replace(/\/$/, "");
const url = `${base}/developers/ephemeral-sandbox?integration=1&source=developer-workspace&pack=wallet_control&path=verify_with_abraxas&step=create_sandbox#sandbox`;
const outDir = resolve("/opt/cursor/artifacts/build-879/screenshots");
mkdirSync(outDir, { recursive: true });

async function main() {
  const browser = await chromium.launch();
  for (const [name, width] of [
    ["desktop-1440", 1440],
    ["mobile-375", 375],
  ] as const) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: resolve(outDir, `unified-embed-${name}.png`), fullPage: true });
    await page.close();
  }
  await browser.close();
  console.log(`Saved screenshots under ${outDir}`);
}

void main();
