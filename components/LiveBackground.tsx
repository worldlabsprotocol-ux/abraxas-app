"use client";
// FILE: components/LiveBackground.tsx
// A subtle, fixed, animated dot-network background, rendered once
// behind every page. Deliberately monochrome and low-opacity, no
// gradients, no glow, this is the "feels alive" quality without
// walking back the institutional clarity work from earlier rounds.
// Pure CSS animation, no canvas, so it's cheap to render on every page.

const DOT_COUNT = 24;

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

export function LiveBackground() {
  return (
    <div aria-hidden="true" style={{
      position: "fixed", inset: 0, zIndex: -1, overflow: "hidden",
      pointerEvents: "none",
    }}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        {DOTS.map((d, i) => (
          <circle key={i}
            cx={`${d.x}%`} cy={`${d.y}%`} r="2"
            fill="#10B981"
            opacity="0.12"
            style={{
              animation: `abraxasDrift${i % 3} ${d.duration}s ease-in-out infinite`,
              animationDelay: `${d.delay}s`,
            }}
          />
        ))}
      </svg>
      <style>{`
        @keyframes abraxasDrift0 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(12px, -16px); }
        }
        @keyframes abraxasDrift1 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-14px, 10px); }
        }
        @keyframes abraxasDrift2 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(8px, 14px); }
        }
      `}</style>
    </div>
  );
}
