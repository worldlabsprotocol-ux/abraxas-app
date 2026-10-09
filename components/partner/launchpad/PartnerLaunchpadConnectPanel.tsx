"use client";
// FILE: components/partner/launchpad/PartnerLaunchpadConnectPanel.tsx

import { useState } from "react";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { PartnerStarterKitPanel } from "@/components/partner/launchpad/PartnerStarterKitPanel";
import {
  MERCHANT_CONNECT_PLATFORMS,
  WIX_MERCHANT_GUIDANCE,
  resolveMerchantPlatform,
} from "@/lib/partner/launchpad/platformOptions";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import type { StarterKitPlatform } from "@/lib/partner/starterKit/contract";

const FONT = ABRAXAS_FONT_SANS;

export function PartnerLaunchpadConnectPanel({
  applicationId,
  appName,
  initialPlatform,
  onIntegrationFilesGenerated,
}: {
  applicationId: string;
  appName: string;
  initialPlatform?: StarterKitPlatform | null;
  onIntegrationFilesGenerated?: () => void;
}) {
  const [selectedPlatform, setSelectedPlatform] = useState<string>(
    initialPlatform ?? "wix_velo",
  );
  const [showKit, setShowKit] = useState(false);
  const platform = resolveMerchantPlatform(selectedPlatform);

  return (
    <>
      <ContentCard title={`Connect ${appName}`}>
        <p style={bodyText}>
          What are you connecting? Choose the platform that matches your website. Abraxas generates the smallest integration path for that stack.
        </p>
        <div
          role="radiogroup"
          aria-label="Website platform"
          className="abx-responsive-stack-grid"
          style={{ marginBottom: "0.85rem" }}
        >
          {MERCHANT_CONNECT_PLATFORMS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={selectedPlatform === item.id}
              onClick={() => {
                setSelectedPlatform(item.id);
                setShowKit(false);
              }}
              style={{
                textAlign: "left",
                padding: "0.8rem 0.85rem",
                borderRadius: 12,
                border: selectedPlatform === item.id
                  ? "1px solid rgba(96,165,250,0.55)"
                  : "1px solid var(--border)",
                background: selectedPlatform === item.id
                  ? "rgba(96,165,250,0.08)"
                  : "var(--surface)",
                cursor: "pointer",
              }}
            >
              <p style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 800, margin: "0 0 0.25rem", color: "var(--text-primary)" }}>
                {item.label}
              </p>
              <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
                {item.description}
              </p>
            </button>
          ))}
        </div>

        {selectedPlatform === "wix_velo" && (
          <div style={guidanceBox}>
            <p style={{ ...bodyText, fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.45rem" }}>
              {WIX_MERCHANT_GUIDANCE.headline}
            </p>
            <ul style={{ ...bodyText, paddingLeft: "1.1rem", margin: "0 0 0.65rem" }}>
              {WIX_MERCHANT_GUIDANCE.principles.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p style={{ ...bodyText, fontWeight: 700, marginBottom: "0.35rem" }}>Typical files</p>
            <ul style={{ ...bodyText, paddingLeft: "1.1rem", margin: "0 0 0.65rem" }}>
              {WIX_MERCHANT_GUIDANCE.files.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p style={{ ...bodyText, fontWeight: 700, marginBottom: "0.35rem" }}>Avoid</p>
            <ul style={{ ...bodyText, paddingLeft: "1.1rem", margin: 0 }}>
              {WIX_MERCHANT_GUIDANCE.avoid.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <p style={bodyText}>
          {appName} receives the eligibility result, not the customer&apos;s birthday or identity documents.
        </p>

        <Btn size="sm" onClick={() => setShowKit(true)}>
          Set up integration
        </Btn>
      </ContentCard>

      {showKit && platform && (
        <PartnerStarterKitPanel
          applicationId={applicationId}
          defaultPlatform={platform.starterKitPlatform}
          merchantMode
          onGenerated={onIntegrationFilesGenerated}
        />
      )}
    </>
  );
}

const bodyText: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.78rem",
  color: "var(--text-secondary)",
  lineHeight: 1.65,
  margin: "0 0 0.75rem",
};

const guidanceBox: React.CSSProperties = {
  marginBottom: "0.85rem",
  padding: "0.75rem 0.85rem",
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--surface-inset)",
};
