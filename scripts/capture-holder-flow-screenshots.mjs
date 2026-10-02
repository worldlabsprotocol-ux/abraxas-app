#!/usr/bin/env node
import { chromium } from "@playwright/test";
import { mkdir } from "fs/promises";
import { readFileSync } from "fs";
import path from "path";

const OUT = "/opt/cursor/artifacts/screenshots";
await mkdir(OUT, { recursive: true });

const css = readFileSync("/workspace/app/globals.css", "utf8")
  + readFileSync("/workspace/app/globals.receipt-live.css", "utf8");

const holderRequestHtml = `<!DOCTYPE html><html data-theme="dark"><head><style>${css}</style></head><body style="background:#090f1a;padding:2rem;color:#e2e8f0;font-family:system-ui">
<h1 style="font-size:0.75rem;color:#94a3b8;margin:0 0 1rem">Holder request (presentation)</h1>
<p style="font-weight:800;margin:0 0 0.75rem">Good Trouble wants to confirm age eligibility for retail.</p>
<div class="abx-holder-flow-strip" role="img" aria-label="Good Trouble asks a question; your Passport returns 21+ eligibility only">
  <div class="abx-holder-flow-strip__step"><strong>Good Trouble</strong><br/>Are you 21 or older?</div>
  <span class="abx-holder-flow-strip__arrow">→</span>
  <div class="abx-holder-flow-strip__step">Your Passport</div>
  <span class="abx-holder-flow-strip__arrow">→</span>
  <div class="abx-holder-flow-strip__step"><strong style="color:#10B981">21+ eligibility</strong></div>
</div>
<div style="border:1px solid rgba(16,185,129,0.35);border-radius:12px;padding:1rem;margin-top:1rem;background:rgba(16,185,129,0.06)">
  <p style="font-size:0.58rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#10B981;margin:0 0 0.5rem">Shared</p>
  <p style="margin:0;font-size:0.82rem">21+ eligibility: Yes</p>
  <p style="font-size:0.58rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;margin:1rem 0 0.5rem">Not shared</p>
  <p style="margin:0;font-size:0.82rem;color:#94a3b8">Date of birth · Identity document · Document number</p>
</div>
</body></html>`;

const holderSuccessHtml = `<!DOCTYPE html><html data-theme="dark"><head><style>${css}</style></head><body style="background:#090f1a;padding:2rem;color:#e2e8f0;font-family:system-ui">
<section class="abx-holder-decision-complete">
  <header class="abx-holder-decision-complete__header">
    <p class="abx-holder-decision-complete__eyebrow">Verification complete</p>
    <h2 class="abx-holder-decision-complete__title">Good Trouble can now confirm that you meet its age eligibility requirement.</h2>
    <p class="abx-holder-decision-complete__subtitle">Only the approved result was shared. Sensitive evidence stayed inside Abraxas.</p>
  </header>
  <button style="margin:1rem 0;padding:0.6rem 1.2rem;border-radius:999px;border:none;background:#10B981;color:#000;font-weight:800">Return to partner</button>
  <p class="abx-holder-decision-complete__reuse">Your Passport supported this request. Existing verified evidence may satisfy eligible future requests when consent, freshness, and policy rules allow.</p>
  <details><summary style="color:#2DD4BF;font-weight:700;cursor:pointer">Verification details</summary></details>
</section>
</body></html>`;

const browser = await chromium.launch({ headless: true });
for (const [name, html, width] of [
  ["09-holder-request-desktop", holderRequestHtml, 1440],
  ["10-holder-success-desktop", holderSuccessHtml, 1440],
  ["11-holder-request-mobile", holderRequestHtml, 390],
]) {
  const page = await browser.newPage();
  await page.setViewportSize({ width, height: 900 });
  await page.setContent(html, { waitUntil: "load" });
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  await page.close();
  console.log("saved", name);
}
await browser.close();
