"use client";
// FILE: components/LiveBackground.tsx
// Full-page ambient layer: green light streak + margin dot network.

export function LiveBackground() {
  return (
    <div aria-hidden="true" className="abr-live-bg" style={{
      position: "fixed",
      inset: 0,
      zIndex: 0,
      overflow: "hidden",
      pointerEvents: "none",
    }}>
      <div style={{
        position: "absolute",
        top: "18%",
        left: "-15%",
        width: "130%",
        height: 180,
        background: "var(--hero-glow)",
        transform: "rotate(-12deg)",
        filter: "blur(60px)",
        opacity: 0.9,
      }} />
      <div style={{
        position: "absolute",
        bottom: "22%",
        right: "-20%",
        width: "80%",
        height: 120,
        background: "rgba(16,185,129,0.08)",
        transform: "rotate(8deg)",
        filter: "blur(50px)",
      }} />
      {Array.from({ length: 14 }).map((_, i) => (
        <div key={i} className="abr-live-dot" style={{
          position: "absolute",
          left: i % 2 === 0 ? `${2 + (i * 3) % 8}%` : undefined,
          right: i % 2 === 1 ? `${2 + (i * 3) % 8}%` : undefined,
          top: `${8 + (i * 17) % 84}%`,
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: "#10B981",
          opacity: 0.22,
          boxShadow: "0 0 12px rgba(16,185,129,0.5)",
        }} />
      ))}
      <style>{`
        [data-theme="dark"] .abr-live-dot { opacity: 0.38; }
        @media (max-width: 720px) {
          .abr-live-bg { opacity: 0.65; }
        }
      `}</style>
    </div>
  );
}
