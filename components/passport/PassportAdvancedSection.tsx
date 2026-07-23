"use client";
// FILE: components/passport/PassportAdvancedSection.tsx
// Secondary credentials. active, unlock when needed, not required.

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

const STAMPS = {
  active: [
    { id: "identity", label: "Identity Verified", status: "active" as const },
    { id: "wallet", label: "Wallet Bound", status: "active" as const },
  ],
  unlockWhenNeeded: [
    { id: "business", label: "Business Verified", note: "Entity asset submissions" },
    { id: "asset_owner", label: "Asset Owner", note: "Per-asset title review" },
    { id: "accredited", label: "Accredited Investor", note: "Securities-eligible actions" },
  ],
  notRequired: [
    { id: "source_of_funds", label: "Source of Funds", note: "Only for high-limit transfers" },
  ],
};

export function PassportAdvancedSection({
  identityEarned,
  walletBound,
  showStamps,
}: {
  identityEarned: boolean;
  walletBound: boolean;
  showStamps: boolean;
}) {
  if (!showStamps) return null;

  return (
    <details style={{ marginBottom: "2rem" }}>
      <summary style={{
        fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700,
        color: "var(--text-secondary)", cursor: "pointer", padding: "0.5rem 0",
      }}>
        Advanced credentials & stamps
      </summary>
      <div style={{ display: "grid", gap: "1rem", marginTop: "0.75rem" }}>
        <CredentialGroup
          title="Active credentials"
          items={STAMPS.active.map(s => ({
            ...s,
            done: s.id === "identity" ? identityEarned : walletBound,
          }))}
        />
        <CredentialGroup
          title="Unlock when needed"
          items={STAMPS.unlockWhenNeeded.map(s => ({ ...s, done: false }))}
          muted
        />
        <CredentialGroup
          title="Not required for your current activity"
          items={STAMPS.notRequired.map(s => ({ ...s, done: false }))}
          muted
        />
      </div>
    </details>
  );
}

function CredentialGroup({
  title,
  items,
  muted,
}: {
  title: string;
  items: Array<{ id: string; label: string; note?: string; done?: boolean; status?: string }>;
  muted?: boolean;
}) {
  return (
    <div style={{
      padding: "0.85rem 1rem", borderRadius: 12,
      background: "var(--surface-raised)", border: "1px solid var(--border)",
      opacity: muted ? 0.85 : 1,
    }}>
      <div style={{
        fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700,
        letterSpacing: "0.06em", textTransform: "uppercase",
        color: "var(--text-muted)", marginBottom: "0.5rem",
      }}>
        {title}
      </div>
      {items.map(item => (
        <div key={item.id} style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem",
          padding: "0.35rem 0", borderBottom: "1px solid var(--border)",
        }}>
          <div>
            <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600, color: "var(--text-primary)" }}>
              {item.label}
            </div>
            {item.note && (
              <div style={{ fontFamily: FONT, fontSize: "0.65rem", color: "var(--text-muted)" }}>{item.note}</div>
            )}
          </div>
          <span style={{
            fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700,
            color: item.done ? ACCENT : "var(--text-muted)",
          }}>
            {item.done ? "Active" : muted ? "Optional" : "Pending"}
          </span>
        </div>
      ))}
    </div>
  );
}
