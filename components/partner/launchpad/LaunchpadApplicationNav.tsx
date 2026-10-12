"use client";

import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import Link from "next/link";
import { EnvironmentBadge } from "@/components/product/EnvironmentBadge";

const FONT = ABRAXAS_FONT_SANS;

type AppSummary = {
  id: string;
  application_name: string;
  display_name: string;
  environment: string;
};

export function LaunchpadApplicationNav({
  applications,
  activeAppId,
  onSelect,
}: {
  applications: AppSummary[];
  activeAppId: string | null;
  onSelect: (id: string) => void;
}) {
  if (!applications.length) return null;

  return (
    <nav className="abx-launchpad-nav" aria-label="Applications">
      <h2 style={{ fontFamily: FONT, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 0.5rem" }}>
        Applications
      </h2>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.35rem" }}>
        {applications.map((app) => {
          const active = app.id === activeAppId;
          return (
            <li key={app.id}>
              <button
                type="button"
                onClick={() => onSelect(app.id)}
                className={active ? "abx-launchpad-nav__item abx-launchpad-nav__item--active" : "abx-launchpad-nav__item"}
                aria-current={active ? "true" : undefined}
                style={{ width: "100%", textAlign: "left" }}
              >
                <span style={{ display: "block", fontFamily: FONT, fontSize: "0.74rem", fontWeight: 700 }}>
                  {app.display_name || app.application_name}
                </span>
                <span style={{ display: "inline-flex", marginTop: "0.25rem" }}>
                  <EnvironmentBadge environment={app.environment === "production" ? "production" : "sandbox"} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {activeAppId && (
        <p style={{ fontFamily: FONT, fontSize: "0.65rem", marginTop: "0.65rem" }}>
          <Link href={`/developers/integration-studio?app=${activeAppId}`} style={{ color: "var(--accent)", fontWeight: 700 }}>
            Open in Integration Studio
          </Link>
        </p>
      )}
    </nav>
  );
}
