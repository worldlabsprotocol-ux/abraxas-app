// FILE: app/loading.tsx
// Branded route transition loader for abraxas-app.vercel.app

export default function Loading() {
  return (
    <div data-theme="dark" style={{
      position: "fixed", inset: 0, background: "var(--bg, #06090B)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      zIndex: 9999, gap: "1.25rem",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 45% 35% at 50% 50%, rgba(16,185,129,0.1) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <svg width={36} height={36} viewBox="0 0 40 40" fill="none" style={{ position: "relative" }}>
        <polygon points="20,2 38,20 20,38 2,20" stroke="#10B981" strokeWidth="2" fill="none"
          style={{ animation: "abraxasPulse 1.8s ease-in-out infinite" }} />
        <circle cx="20" cy="20" r="3" fill="#10B981" />
      </svg>
      <div style={{
        fontFamily: "'Inter',system-ui,sans-serif",
        fontSize: "0.62rem", fontWeight: 700,
        letterSpacing: "0.18em", textTransform: "uppercase",
        color: "rgba(242,246,243,0.35)", position: "relative",
      }}>
        Loading
      </div>
      <style>{`
        @keyframes abraxasPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}
