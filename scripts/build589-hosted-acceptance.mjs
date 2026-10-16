/**
 * Hosted visual acceptance for PR #718: requires Ready preview (not building placeholder).
 * Loads real fonts/CSS; blocks only heavy media (video) optional.
 *
 * Usage:
 *   EXPECTED_SHA=ad80fa1b7e5c73b5efbf1a5dc7270ecf4e8ae3b1 \
 *   PREVIEW_BASE=https://....vercel.app \
 *   BYPASS_SECRET=... \
 *   node scripts/build589-hosted-acceptance.mjs
 */
import { chromium, devices } from "playwright";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const OUT = process.env.OUT_DIR ?? "/opt/cursor/artifacts/build589-hosted";
const BASE = process.env.PREVIEW_BASE;
const EXPECTED_SHA = (process.env.EXPECTED_SHA ?? "").toLowerCase();
const BYPASS = process.env.BYPASS_SECRET ?? process.env.VERCEL_PROTECTION_BYPASS;

if (!BASE) {
  console.error("PREVIEW_BASE required");
  process.exit(1);
}

const extraHeaders = BYPASS ? { "x-vercel-protection-bypass": BYPASS } : {};

await mkdir(OUT, { recursive: true });

function rejectPlaceholder(title, text) {
  if (/deployment is building/i.test(title + text)) return "deployment_building";
  if (/vercel.*login|authenticate to access/i.test(title + text)) return "auth_wall";
  if (!/integration studio|launchpad|integration inspector/i.test(text)) return "not_workspace";
  return null;
}

async function fetchDeployedSha(request) {
  const res = await request.get(`${BASE}/api/launchpad/staging/environment`, {
    headers: extraHeaders,
    timeout: 60000,
  });
  const raw = await res.text();
  if (/deployment is building|<!doctype html/i.test(raw)) {
    return { ok: false, status: res.status(), sha: null, reason: "deployment_building" };
  }
  let body = {};
  try {
    body = JSON.parse(raw);
  } catch {
    return { ok: false, status: res.status(), sha: null, reason: "non_json_response" };
  }
  if (!res.ok()) return { ok: false, status: res.status(), sha: null, reason: "http_error" };
  return { ok: true, status: res.status(), sha: String(body.commit_sha ?? "").toLowerCase() };
}

const browser = await chromium.launch({
  headless: true,
  args: ["--disable-dev-shm-usage", "--no-sandbox"],
});

const report = { base: BASE, expectedSha: EXPECTED_SHA, deploymentGate: null, shaCheck: null, fonts: null, captures: [], interactions: [] };

const ctx0 = await browser.newContext({ extraHTTPHeaders: extraHeaders });
report.shaCheck = await fetchDeployedSha(ctx0.request);
await ctx0.close();

async function auditFonts(page) {
  return page.evaluate(() => {
    const el = document.querySelector("h1, h2, .abx-studio-inspector__header, main") ?? document.body;
    const cs = getComputedStyle(el);
    const bodyCs = getComputedStyle(document.body);
    const fontRequests = performance.getEntriesByType("resource").filter((e) => /\.woff2?|font/i.test(e.name));
    return {
      sampleFontFamily: cs.fontFamily,
      bodyFontFamily: bodyCs.fontFamily,
      fontResourceCount: fontRequests.length,
      fontResourcesOk: fontRequests.filter((e) => e.transferSize > 0 || e.duration > 0).length,
    };
  });
}

async function runRoute(routeKey, routePath, viewportName, viewport, isMobile) {
  const ctx = await browser.newContext({ viewport, isMobile, colorScheme: "dark", extraHTTPHeaders: extraHeaders });
  const page = await ctx.newPage();
  await page.route("**/*", (route) => {
    if (route.request().resourceType() === "media") void route.abort();
    else void route.continue();
  });
  const resp = await page.goto(`${BASE}${routePath}`, { waitUntil: "networkidle", timeout: 180000 });
  await page.waitForTimeout(1500);
  const title = await page.title();
  const text = await page.locator("body").innerText().catch(() => "");
  const gate = rejectPlaceholder(title, text);
  if (gate) {
    await ctx.close();
    return { routeKey, viewportName, gate, status: resp?.status() };
  }
  const fonts = await auditFonts(page);
  report.fonts = report.fonts ?? fonts;
  const first = `${routeKey}-${viewportName}-first.png`;
  await page.screenshot({ path: path.join(OUT, first), fullPage: false });
  await page.evaluate(() => window.scrollBy(0, Math.min(520, document.documentElement.scrollHeight - window.innerHeight)));
  await page.waitForTimeout(700);
  const workspace = `${routeKey}-${viewportName}-workspace.png`;
  await page.screenshot({ path: path.join(OUT, workspace), fullPage: false });
  await ctx.close();
  return { routeKey, viewportName, gate: null, status: resp?.status(), first, workspace, fonts };
}

const routes = [
  ["integration-studio", "/developers/integration-studio"],
  ["launchpad", "/developers/launchpad"],
];
for (const [key, p] of routes) {
  report.captures.push(await runRoute(key, p, "desktop-1440", { width: 1440, height: 900 }, false));
}
const iphone = devices["iPhone 12"];
for (const [key, p] of routes) {
  report.captures.push(await runRoute(key, p, "mobile-390", iphone.viewport, true));
}

// Interaction smoke on hosted build
const smokeCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, extraHTTPHeaders: extraHeaders });
const smoke = await smokeCtx.newPage();
await smoke.goto(`${BASE}/developers/integration-studio`, { waitUntil: "networkidle", timeout: 180000 });
const smokeText = await smoke.locator("body").innerText();
if (!rejectPlaceholder(await smoke.title(), smokeText)) {
  for (const name of ["studio inspector heading", "studio inspector tabs", "studio lifecycle nav"]) {
    try {
      if (name === "studio inspector heading") await smoke.getByRole("heading", { name: "Integration inspector" }).waitFor();
      if (name === "studio inspector tabs") {
        const tabs = smoke.getByRole("tab");
        await tabs.nth(1).click();
      }
      if (name === "studio lifecycle nav") {
        const nav = smoke.getByRole("navigation").filter({ hasText: /Policy|Sandbox|Production/i });
        if ((await nav.count()) === 0) throw new Error("missing lifecycle nav");
      }
      report.interactions.push({ name, ok: true });
    } catch (e) {
      report.interactions.push({ name, ok: false, error: String(e) });
    }
  }
  await smoke.goto(`${BASE}/developers/launchpad`, { waitUntil: "networkidle" });
  try {
    const overflow = await smoke.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    if (overflow) throw new Error("horizontal overflow");
    report.interactions.push({ name: "launchpad overflow", ok: true });
  } catch (e) {
    report.interactions.push({ name: "launchpad overflow", ok: false, error: String(e) });
  }
}
await smokeCtx.close();
await browser.close();

if (EXPECTED_SHA && report.shaCheck?.sha && !report.shaCheck.sha.startsWith(EXPECTED_SHA.slice(0, 7))) {
  report.deploymentGate = "sha_mismatch";
}
if (report.captures.some((c) => c.gate)) {
  report.deploymentGate = report.captures.find((c) => c.gate)?.gate ?? "capture_failed";
}

await writeFile(path.join(OUT, "hosted-acceptance.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

const failed =
  report.deploymentGate ||
  report.captures.some((c) => c.gate) ||
  report.interactions.some((i) => !i.ok) ||
  (EXPECTED_SHA && report.shaCheck?.sha && !report.shaCheck.sha.startsWith(EXPECTED_SHA.slice(0, 12)));

process.exit(failed ? 2 : 0);
