// FILE: app/loading.tsx
// Replaces the old "sovereign terminal boot sequence" loading screen
// (gradients, purple/gold palette, "Circuit engine armed," "Sophia
// agents online," "Arena initialized") that was rendering on every
// single page transition site-wide, completely separately from
// everything else that's been simplified. This is intentionally
// boring on purpose, a loading screen shouldn't be doing any selling.
export default function Loading() {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "#0A0C10",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999,
    }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%",
                     border: "2px solid #1C2333", borderTopColor: "#10B981",
                     animation: "abraxasSpin 0.7s linear infinite" }} />
      <style>{`@keyframes abraxasSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
