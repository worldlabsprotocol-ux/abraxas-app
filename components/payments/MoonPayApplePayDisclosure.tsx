"use client";
// MoonPay compliance copy — visible above Apple Pay frame (Going Live requirements).

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export function MoonPayApplePayDisclosure({
  compact = false,
  accepted,
  onAcceptChange,
  showCheckbox = false,
}: {
  compact?: boolean;
  accepted?: boolean;
  onAcceptChange?: (v: boolean) => void;
  showCheckbox?: boolean;
}) {
  return (
    <div style={{
      marginBottom: compact ? "0.5rem" : "0.65rem",
      padding: compact ? "0.5rem 0" : "0.65rem 0.75rem",
      borderRadius: 10,
      background: "rgba(0,0,0,0.04)",
      border: "1px solid var(--border)",
    }}>
      {showCheckbox && onAcceptChange && (
        <label style={{
          display: "flex", gap: "0.5rem", alignItems: "flex-start",
          cursor: "pointer", marginBottom: "0.45rem",
        }}>
          <input
            type="checkbox"
            checked={accepted ?? false}
            onChange={e => onAcceptChange(e.target.checked)}
            style={{ marginTop: 3, flexShrink: 0 }}
          />
          <span style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 600, color: "var(--text-primary)" }}>
            I accept MoonPay terms to pay with Apple Pay
          </span>
        </label>
      )}
      <p style={{
        fontFamily: FONT,
        fontSize: "0.65rem",
        color: "var(--text-muted)",
        lineHeight: 1.55,
        margin: 0,
      }}>
        I agree to MoonPay&apos;s{" "}
        <a href="https://www.moonpay.com/legal/terms" target="_blank" rel="noopener noreferrer"
          style={{ color: "#10B981", fontWeight: 600 }}>
          Terms of Use
        </a>
        {" "}and understand that, once executed, this transaction cannot be cancelled, recalled,
        refunded, or otherwise undone. Fraudulent transactions may result in the loss of funds with no recourse.
      </p>
      <p style={{
        fontFamily: FONT, fontSize: "0.58rem", color: "var(--text-muted)",
        margin: "0.35rem 0 0", opacity: 0.85,
      }}>
        Powered by MoonPay · Test mode uses mock Apple Pay when <code>sk_test_</code> key is set.
      </p>
    </div>
  );
}
