"use client";
// FILE: components/LiveBackground.tsx
// A subtle, fixed, animated dot-network background, rendered once
// behind every page. Deliberately monochrome and low-opacity, no
// gradients, no glow, this is the "feels alive" quality without
// walking back the institutional clarity work from earlier rounds.
// Pure CSS animation, no canvas, so it's cheap to render on every page.
//
// Made meaningfully more visible than the first version, the light
// theme is mostly filled with opaque white cards, so anything too
// subtle just disappears in the thin gaps between them.

const DOT_COUNT = 36;

// Deterministic pseudo-random positions, same on every render, no
// hydration mismatch between server and client.
function seededPositions(count: number) {
  const positions: { x: number; y: number; delay: number; duration: number }[] = [];
  let seed = 42;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let i = 0; i < count; i++) {
    positions.push({
      x: rand() * 100,
      y: rand() * 100,
      delay: rand() * 8,
      duration: 14 + rand() * 10,
    });
  }
  return positions;
}

const DOTS = seededPositions(DOT_COUNT);

// Connect nearby dots with thin lines for a real network feel
function buildLines(dots: typeof DOTS) {
  const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 0; i < dots.length; i++) {
    for (let j = i + 1; j < dots.length; j++) {
      const dx = dots[i].x - dots[j].x;
      const dy = dots[i].y - dots[j].y;
      if (Math.sqrt(dx * dx + dy * dy) < 16) {
        lines.push({ x1: dots[i].x, y1: dots[i].y, x2: dots[j].x, y2: dots[j].y });
      }
    }
  }
  return lines;
}
const LINES = buildLines(DOTS);

export function LiveBackground() {
  return (
    <div aria-hidden="true" style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 0, overflow: "hidden", pointerEvents: "none",
    }}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}
           preserveAspectRatio="none">
        {LINES.map((l, i) => (
          <line key={`l${i}`}
            x1={`${l.x1}%`} y1={`${l.y1}%`} x2={`${l.x2}%`} y2={`${l.y2}%`}
            stroke="#10B981" strokeWidth="1" opacity="0.15" />
        ))}
        {DOTS.map((d, i) => (
          <circle key={i}
            cx={`${d.x}%`} cy={`${d.y}%`} r="3.5"
            fill="#10B981"
            opacity="0.35"
            style={{
              animation: `abraxasDrift${i % 3} ${d.duration}s ease-in-out infinite`,
              animationDelay: `${d.delay}s`,
              transformOrigin: "center",
            }}
          />
        ))}
      </svg>
      <style>{`
        @keyframes abraxasDrift0 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(18px, -22px); }
        }
        @keyframes abraxasDrift1 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-20px, 14px); }
        }
        @keyframes abraxasDrift2 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(12px, 20px); }
        }
      `}</style>
    </div>
  );
}
