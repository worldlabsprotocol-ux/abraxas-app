import { chromium } from "playwright";

const base = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3035";
const shots = [
  { file: "integration-studio-recovery-desktop-policy.png", width: 1440, height: 900, hash: "" },
  { file: "integration-studio-recovery-laptop-sandbox.png", width: 1280, height: 800, hash: "#sandbox" },
  { file: "integration-studio-acceptance-tablet-configuration-empty.png", width: 768, height: 1024, hash: "#configuration" },
  { file: "integration-studio-acceptance-desktop-policy-refined.png", width: 1440, height: 900, hash: "" },
  { file: "integration-studio-recovery-mobile-policy.png", width: 390, height: 844, hash: "" },
];

const browser = await chromium.launch();
for (const shot of shots) {
  const page = await browser.newPage({ viewport: { width: shot.width, height: shot.height } });
  await page.goto(`${base}/developers/integration-studio${shot.hash}`, { waitUntil: "networkidle" });
  await page.screenshot({
    path: `/opt/cursor/artifacts/screenshots/${shot.file}`,
    fullPage: true,
  });
  await page.close();
}
await browser.close();
