"use client";
// FILE: components/passport/VeriffDeviceHint.tsx
// Veriff iframe footer is vendor-controlled. we surface a clear on-page cue.

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const AMBER = "#F59E0B";

export function VeriffDeviceHint({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      padding: "1rem 1.25rem",
      background: "linear-gradient(180deg, transparent 0%, rgba(6,8,16,0.92) 24%, rgba(6,8,16,0.98) 100%)",
      borderTop: `2px solid ${AMBER}66`,
      pointerEvents: "none",
    }}>
      <div style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "1rem 1.25rem",
        borderRadius: 14,
        background: `${AMBER}18`,
        border: `2px solid ${AMBER}`,
        pointerEvents: "auto",
      }}>
        <div style={{
          fontFamily: FONT,
          fontSize: "1rem",
          fontWeight: 800,
          color: AMBER,
          marginBottom: "0.35rem",
        }}>
          Continue on this device
        </div>
        <div style={{
          fontFamily: FONT,
          fontSize: "0.88rem",
          color: "var(--text-primary, #fff)",
          lineHeight: 1.6,
        }}>
          Scroll to the <strong>bottom of the Veriff window</strong> and tap the green button to finish on this phone or laptop.
          You do not need another device.
        </div>
      </div>
    </div>
  );
}
