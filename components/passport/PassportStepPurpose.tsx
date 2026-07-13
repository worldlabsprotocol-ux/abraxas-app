"use client";
// FILE: components/passport/PassportStepPurpose.tsx

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export function PassportStepPurpose({
  title,
  purpose,
}: {
  title: string;
  purpose: string;
}) {
  return (
    <div style={{ marginBottom: "0.85rem" }}>
      <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
        {title}
      </div>
      <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
        {purpose}
      </p>
    </div>
  );
}
