import { chromium, devices } from "playwright";
import { mkdir } from "fs/promises";

const base = process.env.SCREENSHOT_BASE ?? "http://localhost:3000";
const outDir = process.env.SCREENSHOT_DIR ?? "/opt/cursor/artifacts/screenshots/homepage-restore";

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();

async function capture(label, viewport, device) {
  const context = device
    ? await browser.newContext({ ...devices[device] })
    : await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto(`${base}/`, { waitUntil: "networkidle", timeout: 120000 });
  const enter = page.getByRole("button", { name: /enter abraxas/i });
  if (await enter.count()) {
    await enter.click();
    await page.waitForTimeout(1500);
  } else {
    await page.waitForTimeout(2500);
  }
  await page.screenshot({ path: `${outDir}/${label}-full.png`, fullPage: true });
  const protocol = page.locator("#ecosystem");
  if (await protocol.count()) {
    await protocol.screenshot({ path: `${outDir}/${label}-protocol-in-action.png` });
  }
  const hero = page.locator("#top");
  if (await hero.count()) {
    await hero.screenshot({ path: `${outDir}/${label}-hero.png` });
  }
  await context.close();
}

await capture("desktop", { width: 1440, height: 900 });
await capture("mobile", null, "iPhone 13");

await browser.close();
console.log(`Screenshots saved to ${outDir}`);
