#!/usr/bin/env node
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);

const offenders = await page.evaluate(() => {
  const vw = document.documentElement.clientWidth;
  const out = [];
  document.querySelectorAll("*").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1) return;
    if (r.right > vw + 2 || r.left < -2) {
      const cls = el.className && typeof el.className === "string" ? el.className.slice(0, 80) : el.tagName;
      out.push({ tag: el.tagName, class: cls, left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) });
    }
  });
  return out.slice(0, 25);
});

console.log(JSON.stringify(offenders, null, 2));
await browser.close();
