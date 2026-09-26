"use client";
// FILE: components/partner/launchpad/HostedHandoffControls.tsx

import { useState } from "react";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { HOSTED_HANDOFF_CHECKLIST, HOSTED_HANDOFF_DOCS, HOSTED_HANDOFF_NOTICE } from "@/lib/partner/hostedHandoff/contract";

const FONT = ABRAXAS_FONT_SANS;

export function HostedHandoffControls({ applicationId }: { applicationId: string }) {
  const [url, setUrl] = useState("");
  const [handoffRef, setHandoffRef] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function createHandoff() {
    setBusy(true);
    setError("");
    setUrl("");
    setHandoffRef("");
    try {
      const res = await fetch(`/api/launchpad/applications/${applicationId}/hosted-handoff`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ runtime: "universal_https" }),
      });
      const data = await res.json() as { hosted_url?: string; handoff_ref?: string; error?: string };
      if (!res.ok || !data.hosted_url) {
        setError(data.error === "not_configured"
          ? "Save Partner Flow configuration and an approved callback first."
          : "Could not create a handoff.");
        return;
      }
      setUrl(data.hosted_url);
      if (data.handoff_ref) setHandoffRef(data.handoff_ref);
    } catch {
      setError("Could not create a handoff.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="hosted-handoff-heading" style={{ marginTop: "1.15rem" }}>
      <h3 id="hosted-handoff-heading" style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, margin: "0 0 0.4rem" }}>
        Create a secure handoff
      </h3>
      <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.55, margin: "0 0 0.65rem" }}>
        {HOSTED_HANDOFF_NOTICE} The holder URL contains only an opaque request reference.
      </p>
      {error && <p role="alert" style={{ fontFamily: FONT, fontSize: "0.76rem", color: "#f87171" }}>{error}</p>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.65rem" }}>
        <Btn size="sm" loading={busy} disabled={busy} onClick={() => void createHandoff()}>
          Create a secure handoff
        </Btn>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ alignSelf: "center", fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "var(--accent)" }}>
            Open sandbox verification ↗
          </a>
        )}
        {url && (
          <Btn
            size="sm"
            variant="secondary"
            onClick={() => {
              void navigator.clipboard.writeText(url).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1400);
              });
            }}
          >
            {copied ? "Hosted URL copied" : "Copy Hosted Partner Flow URL"}
          </Btn>
        )}
      </div>
      {url && (
        <p role="status" style={{ fontFamily: FONT, fontSize: "0.76rem", lineHeight: 1.55, color: "var(--text-secondary)" }}>
          Open the verification in a new tab. The person completing it reviews the request and gives consent before Abraxas can issue a receipt. Keep this handoff link private.
        </p>
      )}
      {handoffRef && (
        <p style={{ fontFamily: FONT, fontSize: "0.76rem", lineHeight: 1.55, color: "var(--text-secondary)" }}>
          Devnet proof handoff ref: <code style={{ userSelect: "text" }}>{handoffRef}</code>. Once verification is complete, use this ref in the local proof command; it is not a Solana transaction signature.
        </p>
      )}
      <ul style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.55, paddingLeft: "1.1rem" }}>
        {HOSTED_HANDOFF_CHECKLIST.map((item) => <li key={item}>{item}</li>)}
      </ul>
      <a href={HOSTED_HANDOFF_DOCS} style={{ fontFamily: FONT, fontSize: "0.74rem", fontWeight: 700, color: "var(--accent)" }}>
        Handoff docs
      </a>
    </section>
  );
}
