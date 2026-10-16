/**
 * Non-mutating interaction smoke for Integration Studio + Launchpad (local or preview).
 */
import { chromium, devices } from "playwright";

const BASE = process.env.ABRAXAS_BASE ?? "http://127.0.0.1:3122";
const BYPASS = process.env.BYPASS_SECRET ?? process.env.VERCEL_PROTECTION_BYPASS;
const extraHeaders = BYPASS ? { "x-vercel-protection-bypass": BYPASS } : {};

const browser = await chromium.launch({ headless: true, args: ["--disable-dev-shm-usage"] });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  extraHTTPHeaders: extraHeaders,
});
const page = await ctx.newPage();
const results = [];

async function check(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
  } catch (e) {
    results.push({ name, ok: false, error: String(e) });
  }
}

await page.goto(`${BASE}/developers/integration-studio`, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForTimeout(1500);

await check("studio inspector heading", async () => {
  await page.getByRole("heading", { name: "Integration inspector" }).waitFor();
});

await check("studio inspector tabs keyboard", async () => {
  const tabs = page.getByRole("tab");
  const count = await tabs.count();
  if (count < 3) throw new Error(`expected tabs, got ${count}`);
  await tabs.nth(1).focus();
  await tabs.nth(1).click();
});

await check("studio lifecycle nav links", async () => {
  const nav = page.getByRole("navigation").filter({ hasText: /Policy|Sandbox|Production/i });
  if ((await nav.count()) === 0) throw new Error("lifecycle nav missing");
});

await page.goto(`${BASE}/developers/launchpad`, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForTimeout(1500);

await check("launchpad shell present", async () => {
  const text = await page.locator("body").innerText();
  if (!/launchpad|application|sandbox/i.test(text)) throw new Error("launchpad content missing");
});

await check("launchpad no horizontal overflow", async () => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  if (overflow) throw new Error("horizontal overflow");
});

const mobileCtx = await browser.newContext({ ...devices["iPhone 12"], extraHTTPHeaders: extraHeaders });
const mobile = await mobileCtx.newPage();
await mobile.goto(`${BASE}/developers/integration-studio`, { waitUntil: "domcontentloaded", timeout: 120000 });
await mobile.waitForTimeout(1500);
await check("mobile studio inspector visible", async () => {
  await mobile.getByRole("heading", { name: "Integration inspector" }).waitFor();
});
await mobileCtx.close();

await ctx.close();
await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(JSON.stringify({ base: BASE, results, passed: failed.length === 0 }, null, 2));
process.exit(failed.length ? 1 : 0);
