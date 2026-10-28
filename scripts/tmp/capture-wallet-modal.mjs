import { chromium, devices } from "playwright";

const base = "http://127.0.0.1:3000";
const outDir = "/opt/cursor/artifacts/build-895";

async function capture(viewport, outPath) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext(viewport);
  const page = await context.newPage();
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 120_000 });
  const signIn = page.getByRole("button", { name: /sign in/i }).first();
  if (await signIn.isVisible().catch(() => false)) {
    await signIn.click();
  } else {
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("abraxas:wallet-sign-in-dialog", { detail: { open: true } }),
      );
    });
  }
  await page.waitForTimeout(2000);
  const emblem = page.locator("img.abx-processing-emblem__mark--living-sphere").first();
  await emblem.waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
  await page.screenshot({ path: outPath, fullPage: false });
  await browser.close();
}

await capture({ viewport: { width: 1280, height: 800 } }, `${outDir}/wallet-modal-desktop.png`);
await capture(devices["iPhone 13"], `${outDir}/wallet-modal-mobile.png`);
console.log("saved");
