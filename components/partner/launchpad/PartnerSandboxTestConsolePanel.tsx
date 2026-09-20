"use client";
// FILE: components/partner/launchpad/PartnerSandboxTestConsolePanel.tsx
// Local fixture console inside Launchpad. No live receipts or provider calls.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_MONO, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  SANDBOX_TEST_CONSOLE_CAPABILITIES,
  SANDBOX_TEST_CONSOLE_ENTRY,
} from "@/lib/partner/launchpad/sandboxTestConsole/contract";
import type { buildSandboxTestConsoleView } from "@/lib/partner/launchpad/sandboxTestConsole/view";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.8rem",
  color: "var(--text-secondary)",
  lineHeight: 1.65,
  margin: 0,
};

type ConsoleView = ReturnType<typeof buildSandboxTestConsoleView>;

export function PartnerSandboxTestConsolePanel({ applicationId }: { applicationId: string }) {
  const [caps, setCaps] = useState<string[]>([]);
  const [view, setView] = useState<ConsoleView | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const query = useMemo(() => caps.map((cap) => `capability=${encodeURIComponent(cap)}`).join("&"), [caps]);

  useEffect(() => {
    void (async () => {
      setError("");
      try {
        const res = await fetch(
          `/api/launchpad/applications/${applicationId}/sandbox-test-console${query ? `?${query}` : ""}`,
          { credentials: "include" },
        );
        const data = await res.json() as ConsoleView & { error?: string };
        if (!res.ok) {
          setError(data.error ?? "Could not load the integration test console");
          setView(null);
          return;
        }
        setView(data);
      } catch {
        setError("Could not load the integration test console");
      }
    })();
  }, [applicationId, query]);

  function toggle(cap: string) {
    setCaps((current) => current.includes(cap) ? current.filter((item) => item !== cap) : [...current, cap]);
  }

  function copy(contents: string, id: string) {
    void navigator.clipboard.writeText(contents).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(""), 1400);
    });
  }

  function download(filename: string, contents: string) {
    const blob = new Blob([contents], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <ContentCard title={SANDBOX_TEST_CONSOLE_ENTRY}>
      <p style={{ ...body, marginBottom: "0.75rem" }}>
        Confirm local wiring with placeholder fixtures. These files are not live, cannot be submitted to a provider, and do not grant Production.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.85rem" }}>
        {SANDBOX_TEST_CONSOLE_CAPABILITIES.map((cap) => (
          <button
            key={cap}
            type="button"
            onClick={() => toggle(cap)}
            style={{
              padding: "0.4rem 0.7rem",
              borderRadius: 999,
              border: caps.includes(cap) ? "1px solid rgba(45,212,191,0.5)" : "1px solid var(--border)",
              background: caps.includes(cap) ? "rgba(45,212,191,0.12)" : "var(--surface-inset)",
              color: "var(--text-primary)",
              fontFamily: FONT,
              fontSize: "0.72rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {cap.replace(/_/g, " ")}
          </button>
        ))}
      </div>
      {error && <p style={{ ...body, color: "var(--danger, #f87171)" }}>{error}</p>}
      {view && (
        <>
          <ol style={{ ...body, paddingLeft: "1.1rem", display: "grid", gap: "0.4rem", marginBottom: "1rem" }}>
            {view.checks.filter((check) => check.status !== "not_selected").map((check) => (
              <li key={check.id}>
                <strong>{check.label}.</strong> {check.status.replace(/_/g, " ")}. {check.next_step}
              </li>
            ))}
          </ol>
          <div style={{ display: "grid", gap: "0.5rem", marginBottom: "1rem" }}>
            {view.fixtures.map((fixture) => (
              <div key={fixture.id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "0.65rem 0.75rem" }}>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "0.45rem" }}>
                  <strong style={{ fontFamily: FONT, fontSize: "0.78rem" }}>{fixture.title}</strong>
                  <span>
                    <button type="button" onClick={() => copy(fixture.contents, fixture.id)} style={{ marginRight: 8, cursor: "pointer" }}>
                      {copied === fixture.id ? "Copied" : "Copy"}
                    </button>
                    <button type="button" onClick={() => download(fixture.filename, fixture.contents)} style={{ cursor: "pointer" }}>
                      Download
                    </button>
                  </span>
                </div>
                <pre className="abx-code-scroll" style={{ fontFamily: MONO, fontSize: "0.64rem", overflowX: "auto", maxWidth: "100%", margin: "0.45rem 0 0" }}>
                  {fixture.contents}
                </pre>
              </div>
            ))}
          </div>
          <ol style={{ ...body, paddingLeft: "1.1rem", display: "grid", gap: "0.45rem" }}>
            {view.checklist.map((item) => (
              <li key={item.id}>
                <strong>{item.title}.</strong>{" "}
                <Link href={item.href} style={{ color: "var(--accent)", fontWeight: 700 }}>{item.href}</Link>
                {item.kit_file ? ` · ${item.kit_file}` : ""}
              </li>
            ))}
          </ol>
          <p style={{ ...body, marginTop: "0.85rem" }}>{view.production.notice}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
            <Btn href="/docs/starter-kit" size="sm" variant="secondary">Starter Kit docs →</Btn>
            <Btn href="/developers/integration-studio" size="sm" variant="ghost">Integration Studio →</Btn>
          </div>
        </>
      )}
    </ContentCard>
  );
}
