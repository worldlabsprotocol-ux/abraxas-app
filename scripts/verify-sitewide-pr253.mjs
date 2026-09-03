import { chromium } from "playwright";
import { mkdir, writeFile } from "fs/promises";
import { readFileSync } from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const axePath = require.resolve("axe-core/axe.min.js");
const axeSource = readFileSync(axePath, "utf8");

const base = process.env.SCREENSHOT_BASE ?? "http://localhost:3000";
const outDir = process.env.VERIFY_DIR ?? "/opt/cursor/artifacts/verify-pr253";

const ROUTES = [
  { slug: "home", path: "/", boot: true },
  { slug: "passport", path: "/passport" },
  { slug: "for-businesses", path: "/integrate" },
  { slug: "developer-receipt-tester", path: "/verify" },
  { slug: "partner-flow-docs", path: "/docs/partner-flow" },
  { slug: "pilot-journey", path: "/pilot-journey" },
];

const VIEWPORTS = [
  { label: "1440x900", width: 1440, height: 900 },
  { label: "1024", width: 1024, height: 900 },
  { label: "768", width: 768, height: 900 },
  { label: "390x844", width: 390, height: 844 },
];

const PRIMARY_NAV = ["Home", "Passport", "For businesses", "Docs"];
const FORBIDDEN_PRIMARY_NAV = ["Partner verify", "Verify proofs"];

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const report = {
  axe: {},
  responsive: {},
  fonts: {},
  navigation: {},
  pilotJourneyAudit: {},
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
    // @ts-expect-error axe injected
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
        overflowX: getComputedStyle(body).overflowX,
        hasHorizontalOverflow: doc.scrollWidth > doc.clientWidth + 2,
      };
    });

    const fontCheck = await page.evaluate(() => {
      const h1 = document.querySelector("h1");
      const body = document.body;
      const target = h1 ?? body;
      if (!target) return { loaded: false, family: null };
      const family = getComputedStyle(target).fontFamily;
      const rootFamily = getComputedStyle(document.documentElement).getPropertyValue("--font-sans").trim();
      const hasJakarta = family.toLowerCase().includes("jakarta") || family.includes("var(--font-sans)");
      const fontFaces = [...document.fonts].map((f) => f.family);
      return {
        computedFamily: family,
        rootVar: rootFamily || "(unset)",
        hasJakartaVar: family.includes("var(--font-sans)") || family.toLowerCase().includes("plus jakarta"),
        loadedFontFamilies: [...new Set(fontFaces)].slice(0, 8),
        fontFaceCount: document.fonts.size,
      };
    });

    if (vp.label === "1440x900") {
      report.fonts[route.slug] = fontCheck;
    }

    report.responsive[route.slug][vp.label] = {
      ...metrics,
      overflow: metrics.hasHorizontalOverflow,
      font: fontCheck,
    };

    if (metrics.hasHorizontalOverflow) {
      report.errors.push(`${route.slug}@${vp.label}: horizontal overflow (${metrics.scrollWidth} > ${metrics.clientWidth})`);
    }

    await context.close();
  }
}

// Navigation + CTA checks from Home
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${base}/`, { waitUntil: "networkidle", timeout: 120000 });
  await dismissBoot(page);

  const navLinks = await page.locator("nav a").allTextContents();
  report.navigation.homeNavLabels = navLinks.map((t) => t.trim()).filter(Boolean);
  report.navigation.hasForbiddenPrimary = FORBIDDEN_PRIMARY_NAV.some((f) =>
    report.navigation.homeNavLabels.some((l) => l.includes(f)),
  );
  report.navigation.missingPrimary = PRIMARY_NAV.filter(
    (p) => !report.navigation.homeNavLabels.some((l) => l.includes(p)),
  );

  const ctaChecks = {};
  const pilotCta = page.getByRole("link", { name: /see the pilot journey/i });
  ctaChecks.pilotJourney = (await pilotCta.count()) > 0;
  if (ctaChecks.pilotJourney) {
    const href = await pilotCta.first().getAttribute("href");
    ctaChecks.pilotJourneyHref = href;
    await pilotCta.first().click();
    await page.waitForURL(/pilot-journey/, { timeout: 15000 });
    ctaChecks.pilotJourneyReached = page.url().includes("/pilot-journey");
  }

  await page.goto(`${base}/docs/partner-flow`, { waitUntil: "networkidle" });
  const receiptLink = page.getByRole("link", { name: /receipt tester/i });
  ctaChecks.docsReceiptTester = (await receiptLink.count()) > 0;
  if (ctaChecks.docsReceiptTester) {
    ctaChecks.docsReceiptTesterHref = await receiptLink.first().getAttribute("href");
  }

  await page.goto(`${base}/passport`, { waitUntil: "networkidle" });
  const advancedBtn = page.getByRole("button", { name: /advanced details/i });
  ctaChecks.passportAdvancedDetails = (await advancedBtn.count()) > 0;
  if (ctaChecks.passportAdvancedDetails) {
    await advancedBtn.first().click();
    const devLink = page.getByRole("link", { name: /developer receipt tester/i });
    ctaChecks.passportDevTesterLink = (await devLink.count()) > 0;
    if (ctaChecks.passportDevTesterLink) {
      ctaChecks.passportDevTesterHref = await devLink.first().getAttribute("href");
    }
  }

  report.navigation.ctaChecks = ctaChecks;
  await context.close();
}

// Mobile nav check
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  await dismissBoot(page);
  await page.getByRole("button", { name: "Menu" }).click();
  const drawerLinks = await page.locator("#rd-nav-mobile-drawer a").allTextContents();
  report.navigation.mobileDrawer = drawerLinks.map((t) => t.trim()).filter(Boolean);
  report.navigation.mobileHasVerify = drawerLinks.some((l) => /verify/i.test(l));
  await context.close();
}

// Pilot journey copy audit
{
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${base}/pilot-journey`, { waitUntil: "networkidle" });
  const text = await page.locator("main").first().innerText();
  const lower = text.toLowerCase();
  report.pilotJourneyAudit = {
    hasGoodTrouble: /good trouble/i.test(text),
    hasLogo: (await page.locator('img[alt*="Good Trouble" i], img[src*="good-trouble"]').count()) > 0,
    claimsLivePartner: /live partner|paying customer|production partner/i.test(lower),
    claimsProductionVerification: /production age verification|production verification|legally certified|regulator approved/i.test(lower),
    claimsZkLoginProvesAge: /zklogin.*age|sign.?in.*proves.*age|google.*proves.*age/i.test(lower),
    replacesLegalIdCheck: /replaces.*id check|substitute for.*legally required/i.test(lower) && !/not a substitute/i.test(lower),
    hasDisclaimerNotSubstitute: /not a substitute for any legally required/i.test(lower),
    hasNotRegulatory: /not a claim of regulatory approval/i.test(lower),
  };
  await context.close();
}

await browser.close();
await writeFile(`${outDir}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

const axeFail = Object.entries(report.axe).some(([, v]) => v.serious > 0);
const navFail = report.navigation.hasForbiddenPrimary || report.navigation.mobileHasVerify || report.navigation.missingPrimary?.length > 0;
const pilotFail = report.pilotJourneyAudit.hasGoodTrouble || report.pilotJourneyAudit.hasLogo || report.pilotJourneyAudit.claimsLivePartner || report.pilotJourneyAudit.claimsProductionVerification || report.pilotJourneyAudit.claimsZkLoginProvesAge || report.pilotJourneyAudit.replacesLegalIdCheck;

if (axeFail || navFail || pilotFail || report.errors.length > 0) {
  console.error("VERIFICATION FAILED");
  process.exit(1);
}
console.log("VERIFICATION PASSED");
