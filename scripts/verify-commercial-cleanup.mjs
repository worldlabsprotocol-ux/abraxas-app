import { chromium } from "playwright";
import { mkdir, writeFile } from "fs/promises";
import { readFileSync } from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const axePath = require.resolve("axe-core/axe.min.js");
const axeSource = readFileSync(axePath, "utf8");

const base = process.env.SCREENSHOT_BASE ?? "http://localhost:3000";
const outDir = process.env.VERIFY_DIR ?? "/opt/cursor/artifacts/verify-commercial-cleanup";

const ROUTES = [
  { slug: "home", path: "/", boot: true },
  { slug: "passport", path: "/passport" },
  { slug: "passport-advanced", path: "/passport/advanced" },
  { slug: "for-businesses", path: "/integrate" },
  { slug: "partner-flow-docs", path: "/docs/partner-flow" },
  { slug: "pilot-journey", path: "/pilot-journey" },
];

const VIEWPORTS = [
  { label: "1440x900", width: 1440, height: 900 },
  { label: "1024", width: 1024, height: 900 },
  { label: "768", width: 768, height: 900 },
  { label: "390x844", width: 390, height: 844 },
];

const PRIMARY_NAV = ["Home", "Passport", "For businesses"];
const FORBIDDEN_PRIMARY_NAV = ["Docs", "Partner verify", "Verify proofs", "Developer Receipt Tester"];

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const report = {
  axe: {},
  responsive: {},
  navigation: {},
  footer: {},
  docsAccess: {},
  errors: [],
};

async function dismissBoot(page) {
  const enter = page.getByRole("button", { name: /enter abraxas/i });
  if (await enter.count()) {
    await enter.click();
    await page.waitForTimeout(1200);
  }
}

async function runAxe(page) {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => {
    const root = document.querySelector("[data-theme]") || document.body;
    return window.axe.run(root, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    });
  });
}

function seriousViolations(results) {
  return results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
}

for (const route of ROUTES) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${base}${route.path}`, { waitUntil: "networkidle", timeout: 120000 });
  if (route.boot) await dismissBoot(page);
  else await page.waitForTimeout(1500);

  await page.evaluate(() => {
    document.querySelectorAll("nextjs-portal, #__next-build-watcher").forEach((el) => el.remove());
  });

  const axeResults = await runAxe(page);
  const serious = seriousViolations(axeResults);
  report.axe[route.slug] = {
    violations: axeResults.violations.length,
    serious: serious.length,
    moderate: axeResults.violations.filter((v) => v.impact === "moderate").length,
    minor: axeResults.violations.filter((v) => v.impact === "minor").length,
    details: serious.map((v) => ({ id: v.id, impact: v.impact, description: v.description, nodes: v.nodes.length })),
  };

  await context.close();
}

for (const route of ROUTES) {
  report.responsive[route.slug] = {};
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    await page.goto(`${base}${route.path}`, { waitUntil: "networkidle", timeout: 120000 });
    if (route.boot) await dismissBoot(page);
    else await page.waitForTimeout(1000);

    const metrics = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      return {
        scrollWidth: Math.max(doc.scrollWidth, body?.scrollWidth ?? 0),
        clientWidth: doc.clientWidth,
        hasHorizontalOverflow: doc.scrollWidth > doc.clientWidth + 2,
      };
    });

    report.responsive[route.slug][vp.label] = metrics;
    await context.close();
  }
}

{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${base}/`, { waitUntil: "networkidle", timeout: 120000 });
  await dismissBoot(page);

  const navLinks = await page.locator("header nav a").allTextContents();
  const navTrimmed = navLinks.map((t) => t.trim()).filter(Boolean);
  report.navigation.primary = navTrimmed;
  report.navigation.missing = PRIMARY_NAV.filter((l) => !navTrimmed.some((t) => t.includes(l)));
  report.navigation.forbiddenPresent = FORBIDDEN_PRIMARY_NAV.filter((l) =>
    navTrimmed.some((t) => t.toLowerCase().includes(l.toLowerCase())),
  );

  const footerText = await page.locator("footer").innerText();
  report.footer.hasDocumentation = /documentation/i.test(footerText);
  report.footer.hasPartnerFlow = /partner flow/i.test(footerText);
  report.footer.hasReceiptVerification = /receipt verification/i.test(footerText);
  report.footer.hasPilotJourney = /pilot journey/i.test(footerText);

  await context.close();
}

for (const docPath of ["/docs/partner-flow", "/docs"]) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const response = await page.goto(`${base}${docPath}`, { waitUntil: "networkidle", timeout: 120000 });
  report.docsAccess[docPath] = { status: response?.status() ?? 0, ok: (response?.status() ?? 500) < 400 };
  await context.close();
}

{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${base}/passport/advanced`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(1000);
  const advancedLink = page.getByRole("link", { name: /advanced details/i });
  report.navigation.advancedRouteReachable = (await page.locator("h1").first().textContent())?.includes("Advanced") ?? false;
  await page.goto(`${base}/passport`, { waitUntil: "networkidle", timeout: 120000 });
  const linkCount = await page.getByRole("link", { name: /advanced details/i }).count();
  report.navigation.passportHasAdvancedLink = linkCount > 0;
  await context.close();
}

await browser.close();

const axeFail = Object.entries(report.axe).some(([, v]) => v.serious > 0);
const navFail =
  report.navigation.missing.length > 0 ||
  report.navigation.forbiddenPresent.length > 0 ||
  !report.footer.hasDocumentation;
const overflowFail = Object.values(report.responsive).some((route) =>
  Object.values(route).some((m) => m.hasHorizontalOverflow),
);
const docsFail = Object.values(report.docsAccess).some((d) => !d.ok);

report.summary = {
  axeFail,
  navFail,
  overflowFail,
  docsFail,
  pass: !axeFail && !navFail && !overflowFail && !docsFail,
};

await writeFile(`${outDir}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary, null, 2));

if (!report.summary.pass) {
  process.exit(1);
}
