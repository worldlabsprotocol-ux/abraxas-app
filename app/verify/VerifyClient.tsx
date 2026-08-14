"use client";
// FILE: app/verify/VerifyClient.tsx

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PublicVerifierPanel } from "@/components/verify/PublicVerifierPanel";
import { RelyingPartyVerifyPanel } from "@/components/verify/RelyingPartyVerifyPanel";
import { PartnerReceiptVerifyPanel } from "@/components/verify/PartnerReceiptVerifyPanel";
import { useSuiAuth } from "@/components/sui/SuiAuthProvider";

export type VerifyTab = "receipt" | "registry" | "credential";
export type VerifyAudience = "integrator" | "holder";

function tabFromParams(mode: string | null, audience: VerifyAudience): VerifyTab {
  if (mode === "receipt") return audience === "integrator" ? "receipt" : "registry";
  if (mode === "credential" || mode === "policy") return "credential";
  if (mode === "registry") return "registry";
  return audience === "integrator" ? "receipt" : "registry";
}

export function VerifyClient({ audience = "integrator" }: { audience?: VerifyAudience }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const basePath = audience === "holder" ? "/passport" : "/verify";

  const initial = tabFromParams(searchParams.get("mode"), audience);
  const [tab, setTab] = useState<VerifyTab>(initial);

  useEffect(() => {
    setTab(tabFromParams(searchParams.get("mode"), audience));
  }, [searchParams, audience]);

  const selectTab = useCallback((next: VerifyTab) => {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", next);
    if (audience === "holder") {
      params.set("view", "verify");
    } else {
      params.delete("view");
    }
    const path = audience === "holder" && !pathname?.startsWith("/passport") ? "/passport" : basePath;
    router.replace(`${path}?${params.toString()}`, { scroll: false });
  }, [audience, basePath, pathname, router, searchParams]);

  const partnerLink = audience === "holder" ? (
    <p style={{
      fontFamily: "'Inter',system-ui,sans-serif",
      fontSize: "0.72rem",
      color: "var(--text-muted)",
      lineHeight: 1.55,
      margin: "0 0 1rem",
    }}>
      Are you a partner testing a receipt?{" "}
      <Link href="/verify?mode=receipt" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
        Open the Partner Receipt Verifier
      </Link>
      .
    </p>
  ) : null;

  return (
    <>
      {partnerLink}
      <VerifyTabs tab={tab} setTab={selectTab} audience={audience} />
    </>
  );
}

function VerifyTabs({
  tab,
  setTab,
  audience,
}: {
  tab: VerifyTab;
  setTab: (t: VerifyTab) => void;
  audience: VerifyAudience;
}) {
  const { suiAddress } = useSuiAuth();

  const tabs = useMemo(() => {
    if (audience === "holder") {
      return [
        { id: "registry" as const, label: "Registry lookup", hint: "Records" },
        { id: "credential" as const, label: "Credential JWT", hint: "Your proof" },
      ];
    }
    return [
      { id: "receipt" as const, label: "Partner receipt", hint: "Integrators" },
      { id: "registry" as const, label: "Registry lookup", hint: "Assets" },
      { id: "credential" as const, label: "Credential JWT", hint: "RP demo" },
    ];
  }, [audience]);

  const activeTab = audience === "holder" && tab === "receipt" ? "registry" : tab;
  const activeMeta = tabs.find((t) => t.id === activeTab);

  return (
    <>
      <p style={{
        fontFamily: "'Inter',system-ui,sans-serif",
        fontSize: "0.78rem",
        color: "var(--text-secondary)",
        lineHeight: 1.6,
        margin: "0 0 1rem",
        maxWidth: 640,
      }}>
        {audience === "holder" ? (
          <>
            Look up registry records tied to your Passport, or test how a credential JWT verifies against Abraxas claims.
          </>
        ) : (
          <>
            <strong style={{ color: "var(--text-primary)" }}>Partner integrators:</strong> verify Partner Flow session receipts server-side (test here).
            {" "}<strong style={{ color: "var(--text-primary)" }}>Asset viewers:</strong> look up registry records by ABX ID.
            {" "}<strong style={{ color: "var(--text-primary)" }}>Credential testers:</strong> validate a JWT against Abraxas claims.
          </>
        )}
      </p>
      <div style={{
        display: "flex", gap: "0.35rem", flexWrap: "wrap",
        padding: "0.25rem", borderRadius: 999, marginBottom: "0.5rem",
        background: "var(--surface-inset)", border: "1px solid var(--border)",
      }}>
        {tabs.map(({ id, label, hint }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            style={{
              padding: "0.5rem 1rem", borderRadius: 999, border: "none", cursor: "pointer",
              fontFamily: "'Inter',system-ui,sans-serif", fontSize: "0.78rem", fontWeight: 700,
              background: activeTab === id ? "#10B981" : "transparent",
              color: activeTab === id ? "#04130C" : "var(--text-secondary)",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            {label}
            <span style={{
              fontSize: "0.58rem",
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              opacity: activeTab === id ? 0.75 : 0.55,
            }}>
              {hint}
            </span>
          </button>
        ))}
      </div>
      {activeMeta && (
        <p style={{
          fontFamily: "'Inter',system-ui,sans-serif",
          fontSize: "0.72rem",
          color: "var(--text-muted)",
          margin: "0 0 1.25rem",
        }}>
          {activeTab === "receipt" && "Fetch GET /api/receipts/{receipt_id}/public — the same path your backend calls after a Partner Flow callback."}
          {activeTab === "registry" && (audience === "holder"
            ? "Look up asset records and on-registry attestations — holder-facing registry tools."
            : "Look up tokenized asset records, Passport DIDs, or on-registry attestations — not Partner Flow session receipts.")}
          {activeTab === "credential" && (audience === "holder"
            ? "Test your Abraxas credential JWT and required claims before sharing with a partner."
            : "Test POST /api/credentials/verify with a holder JWT and required claims — separate from Partner Flow receipts.")}
        </p>
      )}

      {activeTab === "receipt" && audience === "integrator" && <PartnerReceiptVerifyPanel />}
      {activeTab === "registry" && (
        <Suspense fallback={null}>
          <PublicVerifierPanel />
        </Suspense>
      )}
      {activeTab === "credential" && <RelyingPartyVerifyPanel suiAddress={suiAddress} showPolicyCheck />}
    </>
  );
}
