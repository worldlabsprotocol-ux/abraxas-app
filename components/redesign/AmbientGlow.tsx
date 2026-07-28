// FILE: components/redesign/AmbientGlow.tsx
// Static vignette — no pulsing gradients (reads as template otherwise).

export function AmbientGlow() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        overflow: "hidden",
        pointerEvents: "none",
        background: `
          radial-gradient(ellipse 70% 45% at 50% -5%, rgba(232, 197, 71, 0.07) 0%, transparent 55%),
          radial-gradient(ellipse 50% 35% at 100% 100%, rgba(167, 139, 250, 0.04) 0%, transparent 50%)
        `,
      }}
    />
  );
}
