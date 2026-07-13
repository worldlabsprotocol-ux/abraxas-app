"use client";
// FILE: components/portal/OwnerAssetLaunchWizard.tsx
// Self-serve owner launch — zkLogin account → name asset → instant registry listing.

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSuiAuth, truncateSuiAddress } from "@/components/sui/SuiAuthProvider";
import { ZkLoginSignIn } from "@/components/sui/ZkLoginSignIn";
import { savePostLoginReturn } from "@/lib/auth/postLoginReturn";
import { saveLocalPortalApplication } from "@/lib/portal/localApplications";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

const ASSET_CLASSES = [
  { value: "REAL_ESTATE_LAND", label: "Land parcel / development site", emoji: "🌲" },
  { value: "REAL_ESTATE", label: "Real estate (building, STR, etc.)", emoji: "🏠" },
  { value: "MINERAL_RIGHTS", label: "Mineral / subsurface rights", emoji: "⛏️" },
  { value: "TRIBAL_LAND", label: "Tribal land & stewardship", emoji: "🪶" },
  { value: "BUSINESS_ENTITY", label: "Business or operating entity", emoji: "🏢" },
  { value: "OTHER", label: "Other asset class", emoji: "📋" },
] as const;

type Step = "account" | "asset" | "details" | "launch";

export function OwnerAssetLaunchWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, suiAddress, session } = useSuiAuth();
  const email = session?.email ?? "";

  const [step, setStep] = useState<Step>(() => (isAuthenticated ? "asset" : "account"));
  const [form, setForm] = useState({
    asset_name: "",
    asset_class: "REAL_ESTATE_LAND" as string,
    jurisdiction: "",
    estimated_value: "",
    description: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const returnPath = "/portal/apply?step=asset";
  const steps: Step[] = ["account", "asset", "details", "launch"];
  const stepIndex = steps.indexOf(step);

  const selectedClass = useMemo(
    () => ASSET_CLASSES.find(c => c.value === form.asset_class) ?? ASSET_CLASSES[0],
    [form.asset_class],
  );

  useEffect(() => {
    if (searchParams.get("step") === "asset" && isAuthenticated) {
      setStep("asset");
    }
  }, [searchParams, isAuthenticated]);

  async function publish() {
    if (!form.asset_name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/external-assets/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          originator: "external",
          launch_mode: "self_serve",
          contact_email: email || undefined,
          contact_name: session?.email?.split("@")[0] ?? undefined,
          linked_wallet: suiAddress ?? undefined,
          evidence_scope: form.description.trim() || "Owner self-serve launch — evidence scope to be expanded.",
        }),
      });
      const json = await res.json() as {
        error?: string;
        application_id?: string;
        public_verify_slug?: string;
        verify_url?: string;
        status?: string;
      };
      if (!res.ok || !json.application_id) throw new Error(json.error ?? "Launch failed");

      if (json.application_id.startsWith("local-")) {
        saveLocalPortalApplication({
          application_id: json.application_id,
          contact_email: email || "owner@local",
          asset_name: form.asset_name.trim(),
          asset_class: form.asset_class,
          jurisdiction: form.jurisdiction.trim() || undefined,
          description: form.description.trim() || undefined,
          status: json.status ?? "pending_review",
          created_at: new Date().toISOString(),
        });
      }

      const params = new URLSearchParams({
        application_id: json.application_id,
        email: email || "owner@local",
        launched: "1",
      });
      if (json.verify_url) params.set("verify", json.verify_url);
      router.push(`/portal/journey?${params.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Launch failed");
    } finally {
      setBusy(false);
    }
  }

  function goAccount() {
    savePostLoginReturn(returnPath);
    setStep("account");
  }

  return (
    <div style={{
      borderRadius: 18,
      border: "2px solid rgba(16,185,129,0.35)",
      background: "var(--surface-raised)",
      overflow: "hidden",
    }}>
      <div style={{
        padding: "1rem 1.15rem",
        borderBottom: "1px solid var(--border)",
        background: "linear-gradient(135deg, rgba(16,185,129,0.1) 0%, transparent 100%)",
      }}>
        <div style={{
          fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700,
          letterSpacing: "0.12em", textTransform: "uppercase", color: ACCENT,
        }}>
          Step {stepIndex + 1} of {steps.length}
        </div>
        <h2 style={{
          fontFamily: FONT, fontSize: "1.05rem", fontWeight: 800,
          color: "var(--text-primary)", margin: "0.35rem 0 0",
        }}>
          {step === "account" && "Sign in — same flow as Passport"}
          {step === "asset" && "Name your asset or business"}
          {step === "details" && "Add context (optional)"}
          {step === "launch" && "Publish to the registry"}
        </h2>
        <p style={{
          fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)",
          margin: "0.35rem 0 0", lineHeight: 1.6,
        }}>
          No waiting queue. Your listing goes live on Abraxas immediately as L1 owner-listed —
          Abraxas review is an optional upgrade when you want full verification.
        </p>
      </div>

      <div style={{ padding: "1.1rem 1.15rem" }}>
        {step === "account" && (
          <div style={{ display: "grid", gap: "0.85rem" }}>
            <ZkLoginSignIn returnPath={returnPath} />
            {isAuthenticated && suiAddress && (
              <button type="button" onClick={() => setStep("asset")} style={primaryBtn(false)}>
                Continue as {truncateSuiAddress(suiAddress)} →
              </button>
            )}
          </div>
        )}

        {step === "asset" && (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {!isAuthenticated && (
              <button type="button" onClick={goAccount} style={ghostBtn}>
                Sign in with Google first →
              </button>
            )}
            {isAuthenticated && suiAddress && (
              <div style={{
                fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)",
                padding: "0.5rem 0.65rem", borderRadius: 8,
                background: "var(--surface)", border: "1px solid var(--border)",
              }}>
                Passport wallet · {truncateSuiAddress(suiAddress)}
                {email ? ` · ${email}` : ""}
              </div>
            )}

            <label style={fieldLabel}>
              <span style={labelStyle}>What are you listing? *</span>
              <input required value={form.asset_name}
                onChange={e => setForm(f => ({ ...f, asset_name: e.target.value }))}
                placeholder="e.g. Riverside 240-acre parcel, Blue Ridge Holdings LLC"
                style={inputStyle} />
            </label>

            <div>
              <span style={labelStyle}>Asset class *</span>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "0.45rem", marginTop: 6,
              }}>
                {ASSET_CLASSES.map(c => {
                  const active = form.asset_class === c.value;
                  return (
                    <button key={c.value} type="button"
                      onClick={() => setForm(f => ({ ...f, asset_class: c.value }))}
                      style={{
                        padding: "0.55rem 0.65rem", borderRadius: 10, cursor: "pointer",
                        border: active ? `2px solid ${ACCENT}` : "1px solid var(--border)",
                        background: active ? `${ACCENT}12` : "var(--surface)",
                        textAlign: "left",
                      }}>
                      <span style={{ fontSize: "1rem" }}>{c.emoji}</span>
                      <div style={{
                        fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700,
                        color: active ? ACCENT : "var(--text-primary)", marginTop: 4,
                      }}>
                        {c.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <label style={fieldLabel}>
              <span style={labelStyle}>Jurisdiction or location</span>
              <input value={form.jurisdiction}
                onChange={e => setForm(f => ({ ...f, jurisdiction: e.target.value }))}
                placeholder="US · Georgia, tribal nation, county APN…"
                style={inputStyle} />
            </label>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button type="button" onClick={() => setStep("details")} disabled={!form.asset_name.trim()} style={primaryBtn(!form.asset_name.trim())}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {step === "details" && (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <label style={fieldLabel}>
              <span style={labelStyle}>Estimated value (optional)</span>
              <input value={form.estimated_value}
                onChange={e => setForm(f => ({ ...f, estimated_value: e.target.value }))}
                placeholder="Range or order of magnitude — labeled owner-provided"
                style={inputStyle} />
            </label>
            <label style={fieldLabel}>
              <span style={labelStyle}>One-line summary</span>
              <textarea value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="Development stage, what partners should know, timeline…"
                style={{ ...inputStyle, resize: "vertical" }} />
            </label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button type="button" onClick={() => setStep("asset")} style={ghostBtn}>← Back</button>
              <button type="button" onClick={() => setStep("launch")} style={primaryBtn(false)}>Review & publish →</button>
            </div>
          </div>
        )}

        {step === "launch" && (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <div style={{
              padding: "0.85rem", borderRadius: 12,
              border: "1px solid var(--border)", background: "var(--surface)",
            }}>
              <div style={{ fontFamily: FONT, fontSize: "0.62rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {selectedClass.emoji} {selectedClass.label}
              </div>
              <div style={{ fontFamily: FONT, fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)", marginTop: 6 }}>
                {form.asset_name}
              </div>
              {form.jurisdiction && (
                <div style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: 4 }}>
                  {form.jurisdiction}
                </div>
              )}
              {form.description && (
                <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-muted)", margin: "0.5rem 0 0", lineHeight: 1.55 }}>
                  {form.description}
                </p>
              )}
            </div>

            <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>
              Publishes instantly to the public registry and homepage explorer as <strong style={{ color: "var(--text-secondary)" }}>Owner listed · L1</strong>.
              Not Abraxas-verified until you request review — honest labeling, no fake badges.
            </p>

            {error && (
              <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#EF4444", margin: 0 }}>{error}</p>
            )}

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button type="button" onClick={() => setStep("details")} style={ghostBtn}>← Back</button>
              <button type="button" disabled={busy} onClick={() => void publish()} style={primaryBtn(busy)}>
                {busy ? "Publishing…" : "Publish to registry →"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{
        padding: "0.65rem 1.15rem", borderTop: "1px solid var(--border)",
        fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)",
      }}>
        Already listed?{" "}
        <Link href="/portal/journey" style={{ color: ACCENT, fontWeight: 700, textDecoration: "none" }}>
          Continue your journey →
        </Link>
        {" · "}
        <Link href="/portal/status" style={{ color: ACCENT, fontWeight: 700, textDecoration: "none" }}>
          Track status
        </Link>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: "var(--text-secondary)",
};

const fieldLabel: React.CSSProperties = { display: "grid", gap: 4 };

const inputStyle: React.CSSProperties = {
  padding: "0.55rem 0.75rem", borderRadius: 8, border: "1px solid var(--border)",
  background: "var(--surface-inset)", color: "var(--text-primary)",
  fontFamily: FONT, fontSize: "0.78rem", width: "100%", boxSizing: "border-box",
};

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: "0.6rem 1rem", borderRadius: 999, border: "none",
    background: disabled ? `${ACCENT}55` : ACCENT, color: "#000",
    fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

const ghostBtn: React.CSSProperties = {
  padding: "0.6rem 1rem", borderRadius: 999,
  border: "1px solid var(--border)", background: "transparent",
  color: "var(--text-secondary)", fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
  cursor: "pointer",
};
