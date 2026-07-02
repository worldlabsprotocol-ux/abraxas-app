"use client";
// FILE: components/passport/VerifyStepRail.tsx

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

const STEPS = [
  { id: "wallet", label: "Sui wallet", sub: "Google sign-in" },
  { id: "ready", label: "Ready", sub: "Browse & transact" },
  { id: "identity", label: "Identity", sub: "Veriff (optional)" },
  { id: "business", label: "Business", sub: "KYB docs" },
  { id: "asset_owner", label: "Asset owner", sub: "Title review" },
] as const;

export function VerifyStepRail({
  walletDone,
  active,
  earned,
  enhancedTrust,
}: {
  walletDone: boolean;
  active: string | null;
  earned: Record<string, "earned" | "in_progress" | "not_started">;
  enhancedTrust?: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
      {STEPS.map((step, i) => {
        const done =
          step.id === "wallet" ? walletDone
          : step.id === "ready" ? walletDone
          : earned[step.id] === "earned";
        const current = active === step.id || (step.id === "wallet" && !walletDone);
        const inProgress = step.id !== "wallet" && step.id !== "ready" && earned[step.id] === "in_progress";
        const optional = step.id === "identity" && walletDone && !enhancedTrust && !inProgress && !done;
        const col = done ? ACCENT : inProgress ? "#F59E0B" : current ? ACCENT : "var(--text-muted)";

        return (
          <div key={step.id} style={{
            flex: "1 1 110px", minWidth: 96,
            padding: "0.65rem 0.75rem", borderRadius: 10,
            border: `1px solid ${current ? `${ACCENT}55` : "var(--border)"}`,
            background: done ? `${ACCENT}10` : "var(--surface)",
            opacity: step.id === "wallet" || walletDone || step.id === "ready" || step.id === "identity" ? 1 : 0.65,
          }}>
            <div style={{ fontFamily: MONO, fontSize: "0.5rem", color: col, fontWeight: 700, marginBottom: "0.2rem" }}>
              {i + 1}. {done ? "DONE" : inProgress ? "IN REVIEW" : optional ? "OPTIONAL" : current ? "NOW" : "NEXT"}
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {step.label}
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.62rem", color: "var(--text-muted)" }}>{step.sub}</div>
          </div>
        );
      })}
    </div>
  );
}
