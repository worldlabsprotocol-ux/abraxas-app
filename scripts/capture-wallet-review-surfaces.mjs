import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const outDir = "/opt/cursor/artifacts/pr770-screenshots";
const base = process.env.CAPTURE_BASE_URL ?? "http://127.0.0.1:3025";

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

await page.goto(`${base}/`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /^Sign in$/i }).first().click({ timeout: 8000 }).catch(() => {});
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(outDir, "sign-in-modal-initial.png"), fullPage: false });

await browser.close();
console.log("wrote", outDir);
