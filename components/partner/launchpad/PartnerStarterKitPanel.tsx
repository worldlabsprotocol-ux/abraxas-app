"use client";
// FILE: components/partner/launchpad/PartnerStarterKitPanel.tsx

import { useState } from "react";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { PartnerBindingSelector } from "@/components/partner/launchpad/PartnerBindingSelector";
import { ABRAXAS_FONT_MONO, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { MERCHANT_CONNECT_PLATFORMS } from "@/lib/partner/launchpad/platformOptions";
import {
  STARTER_KIT_PLATFORM_MATRIX,
  isStarterKitPlatform,
  type StarterKitPlatform,
} from "@/lib/partner/starterKit/contract";
import type { IntegrationStudioPathId } from "@/lib/partner/integrationStudio/contract";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

const PATH_OPTIONS: Array<{ id: IntegrationStudioPathId; label: string }> = [
  { id: "hosted_partner_flow", label: "Hosted Partner Flow" },
  { id: "server_receipt_verify", label: "Server verification" },
  { id: "webhook_events", label: "Webhooks" },
];

const MERCHANT_PLATFORMS = MERCHANT_CONNECT_PLATFORMS.map((item) => item.starterKitPlatform);

export function PartnerStarterKitPanel({
  applicationId,
  defaultPlatform = "universal_https",
  merchantMode = false,
}: {
  applicationId: string;
  defaultPlatform?: StarterKitPlatform;
  merchantMode?: boolean;
}) {
  const [bindingId, setBindingId] = useState<string | null>(null);
  const [pathId, setPathId] = useState<IntegrationStudioPathId>("hosted_partner_flow");
  const [platform, setPlatform] = useState<StarterKitPlatform>(defaultPlatform);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState<Array<{ path: string; contents: string }>>([]);
  const [archive, setArchive] = useState("");
  const [filename, setFilename] = useState("abraxas-starter-kit.zip");
  const [bindingSummary, setBindingSummary] = useState<{
    pack_id: string;
    result_family: string;
    environment: string;
  } | null>(null);

  const visiblePlatforms = merchantMode
    ? STARTER_KIT_PLATFORM_MATRIX.filter((item) => MERCHANT_PLATFORMS.includes(item.id))
    : STARTER_KIT_PLATFORM_MATRIX;

  async function generate() {
    setError("");
    setBusy(true);
    setFiles([]);
    setArchive("");
    try {
      const res = await fetch(`/api/launchpad/applications/${applicationId}/starter-kit`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          binding_id: bindingId ?? "",
          path: pathId,
          platform,
          capabilities: [],
        }),
      });
      const data = await res.json() as {
        ok?: boolean;
        code?: string;
        error?: string;
        files?: Array<{ path: string; contents: string }>;
        archive_base64?: string;
        filename?: string;
        binding?: { pack_id: string; result_family: string; environment: string };
      };
      if (!res.ok || !data.ok || !data.files || !data.archive_base64) {
        setError(data.code ?? data.error ?? "Could not generate integration files");
        return;
      }
      setFiles(data.files);
      setArchive(data.archive_base64);
      setFilename(data.filename ?? "abraxas-starter-kit.zip");
      if (data.binding) setBindingSummary(data.binding);
    } catch {
      setError("Could not generate integration files");
    } finally {
      setBusy(false);
    }
  }

  function downloadArchive() {
    if (!archive) return;
    const bytes = Uint8Array.from(atob(archive), (char) => char.charCodeAt(0));
    const blob = new Blob([bytes], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <ContentCard title={merchantMode ? "Set up integration" : "Starter kit"}>
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0 0 0.65rem", lineHeight: 1.55 }}>
        {merchantMode
          ? "Download the integration files for your platform. Secrets stay on your server — Abraxas never exposes live credentials here."
          : "Generate a binding-pinned integration contract. Policy metadata is server-resolved from the selected binding."}
      </p>
      {!merchantMode && (
        <PartnerBindingSelector
          applicationId={applicationId}
          selectedBindingId={bindingId}
          onSelect={setBindingId}
          label="Integration policy"
        />
      )}
      {merchantMode && (
        <PartnerBindingSelector
          applicationId={applicationId}
          selectedBindingId={bindingId}
          onSelect={setBindingId}
          label="Verification policy"
        />
      )}
      {!merchantMode && bindingSummary && (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0.55rem 0 0" }}>
          Pack <code style={{ fontFamily: MONO }}>{bindingSummary.pack_id}</code>
          {" · "}
          Result <code style={{ fontFamily: MONO }}>{bindingSummary.result_family}</code>
          {" · "}
          {bindingSummary.environment}
        </p>
      )}
      {!merchantMode && (
        <>
          <p style={{ fontFamily: FONT, fontSize: "0.74rem", fontWeight: 700, margin: "0.85rem 0 0.45rem" }}>Integration path</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginBottom: "0.65rem" }}>
            {PATH_OPTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPathId(item.id)}
                style={pillStyle(pathId === item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
      {!merchantMode && (
        <p style={{ fontFamily: FONT, fontSize: "0.74rem", fontWeight: 700, margin: "0 0 0.45rem" }}>Platform</p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginBottom: "0.75rem" }}>
        {visiblePlatforms.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => isStarterKitPlatform(item.id) && setPlatform(item.id)}
            style={pillStyle(platform === item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <Btn size="sm" loading={busy} disabled={busy} onClick={() => void generate()}>
          {merchantMode ? "Generate integration files" : "Generate starter kit"}
        </Btn>
        {archive && (
          <Btn size="sm" variant="secondary" onClick={downloadArchive}>
            Download zip
          </Btn>
        )}
      </div>
      {error && (
        <p role="alert" style={{ fontFamily: FONT, fontSize: "0.74rem", color: "#f87171", marginTop: "0.65rem" }}>
          {error}
        </p>
      )}
      {files.length > 0 && (
        <details style={{ marginTop: "0.75rem" }}>
          <summary style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}>
            View generated starter kit
          </summary>
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "0.55rem" }}>
            {files.length} files generated with binding-pinned policy metadata.
          </p>
        </details>
      )}
    </ContentCard>
  );
}

function pillStyle(active: boolean): React.CSSProperties {
  return {
    padding: "0.4rem 0.7rem",
    borderRadius: 999,
    border: active ? "1px solid rgba(99,102,241,0.55)" : "1px solid var(--border)",
    background: active ? "rgba(99,102,241,0.14)" : "var(--surface-inset)",
    fontFamily: FONT,
    fontSize: "0.72rem",
    fontWeight: 600,
    cursor: "pointer",
  };
}
