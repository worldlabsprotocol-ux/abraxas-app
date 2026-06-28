"use client";
// FILE: components/LiveBackground.tsx
// Subtle animated dot-network in page margins only. Theme-aware accent.

const DOT_COUNT = 20;

function seededPositions(count: number) {
  const positions: { side: "left" | "right"; xPct: number; y: number; delay: number; duration: number }[] = [];
  let seed = 42;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let i = 0; i < count; i++) {
    positions.push({
      side: i % 2 === 0 ? "left" : "right",
      xPct: rand() * 7,
      y: rand() * 100,
      delay: rand() * 8,
      duration: 16 + rand() * 10,
    });
  }
  return positions;
}

const DOTS = seededPositions(DOT_COUNT);

export function LiveBackground() {
  return (
    <div aria-hidden="true" className="abraxas-live-bg" style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 0, overflow: "hidden", pointerEvents: "none",
    }}>
      <div className="abraxas-live-streak" style={{
        position: "absolute",
        top: "38%",
        left: "-10%",
        right: "-10%",
        height: 2,
        background: "#10B981",
        opacity: 0.12,
        transform: "rotate(-8deg)",
      }} />
      {DOTS.map((d, i) => {
        const positionStyle: React.CSSProperties = d.side === "left"
          ? { left: `${d.xPct}%` }
          : { right: `${d.xPct}%` };
        return (
          <div key={i} className="abraxas-live-dot" style={{
            position: "absolute",
            ...positionStyle,
            top: `${d.y}%`,
            width: 6, height: 6, borderRadius: "50%",
            background: "#10B981",
            opacity: 0.18,
            animation: `abraxasDrift${i % 3} ${d.duration}s ease-in-out infinite`,
            animationDelay: `${d.delay}s`,
          }} />
        );
      })}
      <style>{`
        @keyframes abraxasDrift0 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-24px); }
        }
        @keyframes abraxasDrift1 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(18px); }
        }
        @keyframes abraxasDrift2 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        [data-theme="dark"] .abraxas-live-dot { opacity: 0.28; }
        [data-theme="dark"] .abraxas-live-streak { opacity: 0.22; }
        @media (max-width: 1180px) {
          .abraxas-live-bg { display: none; }
        }
      `}</style>
    </div>
  );
}
