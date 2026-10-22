"use client";

import { useEffect, useState } from "react";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { ABRAXAS_FONT_MONO, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

type ReadinessPayload = {
  ok?: boolean;
  error?: string;
  unavailable?: boolean;
  checks?: Array<{ id: string; label: string; status: string; detail?: string }>;
};

type AppPayload = {
  application?: {
    id: string;
    policy_id: string;
    policy_version: number;
    key_prefix: string | null;
    allowed_return_urls: string[];
    environment: string;
  };
  error?: string;
};

export function IntegrationStudioConfigurationPanel({
  applicationId,
  signedIn,
}: {
  applicationId: string | null;
  signedIn: boolean;
}) {
  const [app, setApp] = useState<AppPayload["application"] | null>(null);
  const [readiness, setReadiness] = useState<ReadinessPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!applicationId || !signedIn) {
      setApp(null);
      setReadiness(null);
      setError("");
      return;
    }
    let cancelled = false;
    void (async () => {
      setError("");
      try {
        const [appRes, readyRes] = await Promise.all([
          fetch(`/api/launchpad/applications/${applicationId}`, { credentials: "include", cache: "no-store" }),
          fetch(`/api/launchpad/applications/${applicationId}/sandbox-readiness`, {
            credentials: "include",
            cache: "no-store",
          }),
        ]);
        const appData = (await appRes.json()) as AppPayload;
        const readyData = (await readyRes.json()) as ReadinessPayload;
        if (cancelled) return;
        if (!appRes.ok) {
          setApp(null);
          setError(appData.error ?? "Application configuration unavailable");
        } else {
          setApp(appData.application ?? null);
        }
        setReadiness(readyRes.ok ? readyData : { unavailable: true, error: readyData.error });
      } catch {
        if (!cancelled) setError("Configuration fetch failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applicationId, signedIn]);

  if (!applicationId) return null;

  return (
    <ContentCard title="Sandbox configuration" id="configuration">
      {!signedIn && (
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--warning, #f59e0b)" }}>
          Attach a Launchpad session to load live policy pins, callback URLs, and readiness checks.
        </p>
      )}
      {error && <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--danger, #f87171)" }}>{error}</p>}
      {signedIn && app && (
        <dl style={{ fontFamily: FONT, fontSize: "0.72rem", display: "grid", gap: "0.35rem", margin: 0 }}>
          <div>
            <dt style={{ fontWeight: 700, display: "inline" }}>Policy </dt>
            <dd style={{ fontFamily: MONO, display: "inline", margin: 0 }}>
              {app.policy_id} v{app.policy_version}
            </dd>
          </div>
          <div>
            <dt style={{ fontWeight: 700, display: "inline" }}>Credential </dt>
            <dd style={{ display: "inline", margin: 0 }}>
              {app.key_prefix ? `prefix ${app.key_prefix}… (full key never stored in UI)` : "not issued"}
            </dd>
          </div>
          <div>
            <dt style={{ fontWeight: 700 }}>Callback URLs</dt>
            <dd style={{ margin: "0.15rem 0 0", paddingLeft: "1rem" }}>
              {app.allowed_return_urls.length ? (
                <ul style={{ margin: 0 }}>
                  {app.allowed_return_urls.map((url) => (
                    <li key={url} style={{ fontFamily: MONO, fontSize: "0.62rem", wordBreak: "break-all" }}>{url}</li>
                  ))}
                </ul>
              ) : (
                <span style={{ color: "var(--text-muted)" }}>None configured</span>
              )}
            </dd>
          </div>
        </dl>
      )}
      {signedIn && readiness && (
        <div style={{ marginTop: "0.85rem" }}>
          <p style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, margin: "0 0 0.35rem" }}>Sandbox readiness</p>
          {readiness.unavailable ? (
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)" }}>
              Readiness telemetry unavailable{readiness.error ? `: ${readiness.error}` : ""}.
            </p>
          ) : readiness.checks?.length ? (
            <ul style={{ fontFamily: FONT, fontSize: "0.68rem", paddingLeft: "1rem", margin: 0 }}>
              {readiness.checks.map((check) => (
                <li key={check.id}>
                  {check.label}: {check.status.replace(/_/g, " ")}
                  {check.detail ? `. ${check.detail}` : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)" }}>No readiness checks returned.</p>
          )}
        </div>
      )}
    </ContentCard>
  );
}
