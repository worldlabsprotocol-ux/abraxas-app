// FILE: lib/home/commandCenter.test.ts

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PUBLIC_PRODUCT_ROUTES, publicPageFile } from "@/lib/product/publicRouteManifest";
import { PUBLIC_NAV_LINKS } from "@/lib/design/publicSurface";
import {
  COMMAND_CENTER_CARDS,
  COMMAND_CENTER_FAKE_CLAIM,
  COMMAND_CENTER_GROUPS,
  COMMAND_CENTER_HEADLINE,
  COMMAND_CENTER_PRIMARY_PATHS,
  COMMAND_CENTER_PROTOCOL_STAGES,
  COMMAND_CENTER_SUBHEAD,
  COMMAND_CENTER_TRUST,
  COMMAND_CENTER_USE_CASES,
  commandCenterHrefErrors,
} from "./commandCenter";

const ROOT = process.cwd();
const JUDGE = /judge demo|Judge Demo|Public Judge Demo/i;

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("command-center homepage contract", () => {
  it("keeps every command-center href on the public route manifest and on disk", () => {
    expect(commandCenterHrefErrors()).toEqual([]);
    const hrefs = [
      ...COMMAND_CENTER_PRIMARY_PATHS.map((item) => item.href),
      ...COMMAND_CENTER_CARDS.map((item) => item.href),
      ...COMMAND_CENTER_PROTOCOL_STAGES.map((item) => item.href),
      ...COMMAND_CENTER_USE_CASES.map((item) => item.href),
    ];
    for (const href of hrefs) {
      expect(PUBLIC_PRODUCT_ROUTES).toContain(href);
      expect(existsSync(join(ROOT, publicPageFile(href as (typeof PUBLIC_PRODUCT_ROUTES)[number])))).toBe(true);
    }
  });

  it("surfaces the required capability cards in people, partner, and protocol groups", () => {
    expect(COMMAND_CENTER_CARDS.map((card) => card.title)).toEqual([
      "Passport",
      "Verify a result",
      "Reusable eligibility",
      "Partner Flow",
      "Integration Studio",
      "Partner Launchpad",
      "Developer docs",
      "Policy packs",
      "Trading access",
      "Payment authorization",
      "Multi-chain readiness",
    ]);
    expect(COMMAND_CENTER_GROUPS.map((group) => group.id)).toEqual(["people", "partners", "protocol"]);
    expect(COMMAND_CENTER_PRIMARY_PATHS.map((path) => path.href)).toEqual([
      "/passport",
      "/verification",
      "/developers/integration-studio",
    ]);
  });

  it("uses benefit-first copy without fake live claims or judge-demo language", () => {
    const corpus = [
      COMMAND_CENTER_HEADLINE,
      COMMAND_CENTER_SUBHEAD,
      COMMAND_CENTER_TRUST,
      ...COMMAND_CENTER_CARDS.map((card) => `${card.title} ${card.summary}`),
      ...COMMAND_CENTER_PROTOCOL_STAGES.map((stage) => `${stage.title} ${stage.body}`),
      ...COMMAND_CENTER_USE_CASES.map((item) => `${item.title} ${item.summary} ${item.availabilityLabel}`),
      read("components/redesign/RedesignHome.tsx"),
      read("components/home/HomeCapabilityMap.tsx"),
      read("components/home/HomeProtocolMap.tsx"),
      read("components/home/HomeUseCases.tsx"),
      read("components/home/HomeSharpHero.tsx"),
    ].join("\n");
    expect(corpus).not.toMatch(COMMAND_CENTER_FAKE_CLAIM);
    expect(corpus).not.toMatch(JUDGE);
    expect(corpus).toMatch(/Prove only what a service needs/);
    expect(corpus).toMatch(/Your evidence stays private/);
    expect(corpus).toMatch(/does not execute/);
  });

  it("labels planned versus available network use cases from the registry", () => {
    const trading = COMMAND_CENTER_USE_CASES.find((item) => item.id === "trading");
    const payment = COMMAND_CENTER_USE_CASES.find((item) => item.id === "payment");
    const protocol = COMMAND_CENTER_USE_CASES.find((item) => item.id === "protocol-access");
    expect(trading?.availability).toBe("sandbox");
    expect(payment?.availability).toBe("sandbox");
    expect(payment?.availabilityLabel).toMatch(/Sandbox preflight/i);
    expect(protocol?.availabilityLabel).toMatch(/Sandbox/i);
    expect(COMMAND_CENTER_USE_CASES.every((item) => ["available", "sandbox", "planned"].includes(item.availability))).toBe(true);
  });

  it("keeps cards and protocol stages keyboard-accessible", () => {
    const cards = read("components/home/HomeCapabilityMap.tsx");
    const protocol = read("components/home/HomeProtocolMap.tsx");
    const nav = read("components/redesign/RedesignNav.tsx");
    expect(cards).toContain("aria-label");
    expect(cards).toContain(":focus-visible");
    expect(protocol).toContain("aria-expanded");
    expect(protocol).toContain("aria-controls");
    expect(nav).toContain("rd-nav-mobile");
    expect(nav).toContain("aria-expanded={open}");
    expect(PUBLIC_NAV_LINKS.map((link) => link.label)).toEqual([
      "Home",
      "Passport",
      "Build",
    ]);
  });
});
