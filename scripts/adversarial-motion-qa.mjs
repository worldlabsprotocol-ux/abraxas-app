#!/usr/bin/env node
/**
 * Adversarial motion QA for PR #535 — scroll physics, overflow, reduced motion.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";

const OUT = "/opt/cursor/artifacts";
mkdirSync(`${OUT}/screenshots`, { recursive: true });
mkdirSync(`${OUT}/qa`, { recursive: true });

const base = process.env.BASE_URL ?? "http://localhost:3000";
const findings = [];

function record(severity, area, issue, detail = "") {
  findings.push({ severity, area, issue, detail });
}

async function measureScrollUpdates(page, label, scrollSteps) {
  const samples = [];
  await page.exposeFunction("__recordProgress", (p) => samples.push(p));
  await page.evaluate(() => {
    window.__progressSamples = [];
    document.querySelectorAll("[data-scroll-progress]").forEach((el) => {
      new MutationObserver(() => {
        const v = el.getAttribute("data-scroll-progress");
        if (v) window.__progressSamples?.push(parseFloat(v));
      }).observe(el, { attributes: true, attributeFilter: ["data-scroll-progress"] });
    });
  }).catch(() => {});

  for (const y of scrollSteps) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(120);
  }
  return samples;
}

async function checkOverflow(page, viewport, path = "/") {
  await page.setViewportSize(viewport);
  await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1500);
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    hasHorizontal: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
  }));
  if (overflow.hasHorizontal) {
    record("high", path, "Horizontal overflow", `${overflow.scrollWidth}px > ${overflow.clientWidth}px @ ${viewport.width}`);
  }
  return overflow;
}

async function homepageScrollPass(page, viewport, { reducedMotion = false, label }) {
  await page.setViewportSize(viewport);
  await page.emulateMedia({ reducedMotion: reducedMotion ? "reduce" : "no-preference" });
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2000);

  const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const stickySections = await page.evaluate(() =>
    [...document.querySelectorAll(".abx-cinematic-story--sticky, .abx-cinematic-transaction--sticky, .abx-cinematic-orbit--sticky, .abx-home-good-trouble--narrative")]
      .map((el) => ({
        className: el.className.split(" ").find((c) => c.includes("sticky") || c.includes("narrative")) ?? el.className,
        height: el.offsetHeight,
        minHeight: getComputedStyle(el).minHeight,
        stickyPos: el.querySelector("[class*='__sticky']")
          ? getComputedStyle(el.querySelector("[class*='__sticky']")).position
          : "none",
      })),
  );

  for (const s of stickySections) {
    if (reducedMotion && s.stickyPos === "sticky") {
      record("high", "reduced-motion", "Sticky still active under prefers-reduced-motion", s.className);
    }
    if (!reducedMotion && s.height > viewport.height * 2.2) {
      record("medium", "sticky", "Excessive sticky scroll distance", `${s.className}: ${s.height}px (${(s.height / viewport.height).toFixed(1)}x viewport)`);
    }
  }

  const scrollPattern = [0, 400, 800, 1200, 1600, 2000, 2400, 2800, 3200, 3600, 4000, docHeight * 0.5, docHeight * 0.75, docHeight - viewport.height];
  const uniqueHeights = [...new Set(scrollPattern.map((y) => Math.round(Math.min(y, docHeight))))];

  // forward
  for (const y of uniqueHeights) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(100);
  }
  await page.screenshot({ path: `${OUT}/screenshots/qa-${label}-mid.png` });

  // reverse
  for (const y of [...uniqueHeights].reverse()) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(80);
  }

  // fast flick
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(200);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);

  const bridgeCount = await page.locator(".abx-narrative-bridge").count();
  if (bridgeCount > 4) {
    record("low", "bridges", "Many narrative bridges may feel decorative", `count=${bridgeCount}`);
  }

  const longTasks = await page.evaluate(() => {
    return new Promise((resolve) => {
      const tasks = [];
      const obs = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (e.duration > 50) tasks.push({ name: e.name, duration: Math.round(e.duration) });
        }
      });
      try {
        obs.observe({ entryTypes: ["longtask"] });
      } catch {
        resolve([]);
        return;
      }
      setTimeout(() => {
        obs.disconnect();
        resolve(tasks.slice(0, 10));
      }, 3000);
    });
  }).catch(() => []);

  if (longTasks.length > 3) {
    record("medium", "performance", "Multiple long tasks during scroll", JSON.stringify(longTasks.slice(0, 3)));
  }
}

async function productSurfaces(page) {
  const routes = [
    ["/passport", "Passport"],
    ["/developers/integration-studio", "Integration Studio"],
    ["/developers/launchpad", "Launchpad"],
  ];
  for (const [path, name] of routes) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(1200);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    if (overflow) record("high", name, "Horizontal overflow on desktop");
    await page.screenshot({ path: `${OUT}/screenshots/qa-${name.toLowerCase().replace(/\s+/g, "-")}.png`, fullPage: false });
  }
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await checkOverflow(page, { width: 1280, height: 900 });
  await checkOverflow(page, { width: 390, height: 844 });
  await homepageScrollPass(page, { width: 1280, height: 900 }, { reducedMotion: false, label: "desktop" });
  await homepageScrollPass(page, { width: 390, height: 844 }, { reducedMotion: false, label: "mobile" });
  await homepageScrollPass(page, { width: 390, height: 844 }, { reducedMotion: true, label: "mobile-rm" });
  await productSurfaces(page);
} finally {
  await browser.close();
}

writeFileSync(`${OUT}/qa/adversarial-motion-findings.json`, JSON.stringify(findings, null, 2));
console.log(JSON.stringify(findings, null, 2));
console.log(`\n${findings.length} findings written to ${OUT}/qa/adversarial-motion-findings.json`);
