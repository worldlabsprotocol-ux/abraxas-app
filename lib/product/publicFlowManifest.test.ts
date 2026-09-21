import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PUBLIC_NAV_EXPLORE_LINKS, PUBLIC_NAV_LINKS, PUBLIC_NAV_MAP_LINKS } from "@/lib/design/publicSurface";
import { PUBLIC_PRODUCT_ROUTES, publicPageFile } from "./publicRouteManifest";
import {
  PUBLIC_FLOW_FORBIDDEN_CLAIM,
  PUBLIC_HOME_FLOWS,
  publicFlowHrefPath,
} from "./publicFlowManifest";
import { COMMAND_CENTER_CARDS, COMMAND_CENTER_USE_CASES } from "@/lib/home/commandCenter";
import { PROTOCOL_IN_ACTION_PROOFS } from "@/lib/home/ecosystemContent";
import { HOME_GOOD_TROUBLE_INTEGRATION } from "@/lib/home/goodTroubleIntegrationDemo";
import { readFileSync } from "node:fs";

const ROOT = process.cwd();

function pageFor(href: string): string {
  const path = publicFlowHrefPath(href);
  if (path === "/") return "app/page.tsx";
  return publicPageFile(path as (typeof PUBLIC_PRODUCT_ROUTES)[number]);
}

describe("public home flow manifest", () => {
  it("gives every homepage flow a route, status, audience, action, and end-state", () => {
    for (const flow of PUBLIC_HOME_FLOWS) {
      expect(flow.route).toMatch(/^\//);
      expect(["available", "sandbox", "planned"]).toContain(flow.status);
      expect(flow.audience).toMatch(/person|partner|explorer/);
      expect(flow.actionLabel.length).toBeGreaterThan(3);
      expect(flow.endState.length).toBeGreaterThan(8);
      const rel = pageFor(flow.route);
      expect(existsSync(join(ROOT, rel)), rel).toBe(true);
    }
  });

  it("wires capability cards and protocol-in-action items to the manifest", () => {
    for (const card of COMMAND_CENTER_CARDS) {
      const flow = PUBLIC_HOME_FLOWS.find((item) => item.id === card.id);
      expect(flow, card.id).toBeTruthy();
      expect(card.href).toBe(flow!.route);
      expect(card.status).toBe(flow!.status);
    }
    expect(PROTOCOL_IN_ACTION_PROOFS[0]?.id).toBe("good-trouble");
    expect(PROTOCOL_IN_ACTION_PROOFS[0]?.status).toBe("sandbox");
    expect(PROTOCOL_IN_ACTION_PROOFS.find((item) => item.id === "cielo")?.status).toBe("planned");
  });

  it("blocks unsupported live, USDC, booking, and partner claims on public home copy", () => {
    const corpus = [
      ...PUBLIC_HOME_FLOWS.map((flow) => `${flow.title} ${flow.summary} ${flow.endState}`),
      ...COMMAND_CENTER_USE_CASES.map((item) => `${item.title} ${item.summary} ${item.availabilityLabel}`),
      ...PROTOCOL_IN_ACTION_PROOFS.map((item) => `${item.title} ${item.summary} ${item.demonstrates}`),
      HOME_GOOD_TROUBLE_INTEGRATION.headline,
      HOME_GOOD_TROUBLE_INTEGRATION.body,
      HOME_GOOD_TROUBLE_INTEGRATION.eyebrow,
      readFileSync(join(ROOT, "components/redesign/RedesignHome.tsx"), "utf8"),
      readFileSync(join(ROOT, "components/home/HomeProtocolInAction.tsx"), "utf8"),
      readFileSync(join(ROOT, "components/home/HomeGoodTroubleIntegration.tsx"), "utf8"),
      readFileSync(join(ROOT, "lib/home/partnerNetwork.ts"), "utf8"),
    ].join("\n");
    expect(corpus).not.toMatch(PUBLIC_FLOW_FORBIDDEN_CLAIM);
    expect(corpus).not.toMatch(/LIVE INTEGRATION/);
    expect(corpus).not.toMatch(/Try the live experience/);
  });

  it("keeps former top-level nav destinations one click away", () => {
    expect(PUBLIC_NAV_LINKS.map((link) => link.label)).toEqual(["Home", "Passport", "Build"]);
    expect(PUBLIC_NAV_EXPLORE_LINKS.map((link) => link.label)).toEqual([
      "Verify",
      "Launchpad",
      "Partner Flow",
      "Docs",
      "Capability map",
    ]);
    expect(PUBLIC_NAV_MAP_LINKS.some((link) => link.href === "/integrate")).toBe(true);
  });
});
