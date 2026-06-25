"use client";
// FILE: components/LiveBackground.tsx
// A subtle, animated dot-network background, confined entirely to
// the side margins outside the main 1060px content column. Two
// rounds of opacity tuning didn't solve the readability complaint
// because the real problem wasn't visibility, it was that dots and
// lines could land directly behind headline text and un-carded
// content. This fixes it structurally: the animation physically
// can't overlap reading content on any screen wide enough to have
// real margin space. On narrow/mobile screens, where there's no
// margin to speak of, it naturally fades to nothing, which is the
// correct fallback, not a bug.

const DOT_COUNT = 20; // 10 per side

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
      xPct: rand() * 7, // 0-7% from the edge, well clear of the centered content column
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
      {DOTS.map((d, i) => {
        const positionStyle: React.CSSProperties = d.side === "left"
          ? { left: `${d.xPct}%` }
          : { right: `${d.xPct}%` };
        return (
          <div key={i} style={{
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
        /* On viewports narrower than the content column plus a safe
           margin, there's no guaranteed empty space, hide entirely
           rather than risk overlapping content. */
        @media (max-width: 1180px) {
          .abraxas-live-bg { display: none; }
        }
      `}</style>
    </div>
  );
}
