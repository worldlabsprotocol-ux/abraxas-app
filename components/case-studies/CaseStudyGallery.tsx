"use client";
// FILE: components/case-studies/CaseStudyGallery.tsx
// Photo evidence strip — fixed aspect ratios, no white letterboxing.

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const BG = "#06090B";

const OBJECT_POSITIONS: Record<string, string> = {
  "/assets/cielo/04.jpg": "78% center",
  "/assets/cielo/01.jpg": "50% 20%",
  "/assets/cielo/08.jpg": "center 35%",
};

export function CaseStudyGallery({
  images,
  altPrefix,
  maxImages,
}: {
  images: readonly string[];
  altPrefix: string;
  maxImages?: number;
}) {
  const shown = maxImages != null ? images.slice(0, maxImages) : images;
  if (!shown.length) return null;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: "0.75rem",
      marginBottom: "0.5rem",
    }}>
      {shown.map((src, i) => (
        <div key={src} style={{
          borderRadius: 12, overflow: "hidden",
          border: "1px solid var(--border-strong)",
          aspectRatio: "4/3",
          background: BG,
          position: "relative",
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={`${altPrefix} ${i + 1}`}
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%",
              objectFit: "cover", display: "block",
              objectPosition: OBJECT_POSITIONS[src] ?? "center",
            }}
          />
        </div>
      ))}
    </div>
  );
}

export function CaseStudyPhotoHero({
  src,
  alt,
  badge,
  title,
  subtitle,
  objectPosition = "center",
}: {
  src: string;
  alt: string;
  badge: string;
  title: string;
  subtitle?: string;
  objectPosition?: string;
}) {
  return (
    <div style={{
      position: "relative", borderRadius: 18, overflow: "hidden",
      marginBottom: "1.25rem",
      border: "1px solid var(--border-strong)",
      aspectRatio: "16/9",
      background: BG,
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} style={{
        position: "absolute", inset: 0,
        width: "100%", height: "100%",
        objectFit: "cover", display: "block",
        objectPosition,
      }} />
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to top, rgba(6,9,11,0.92) 0%, rgba(6,9,11,0.35) 50%, rgba(6,9,11,0.15) 100%)",
      }} />
      <div style={{ position: "absolute", bottom: 20, left: 20, right: 20 }}>
        <span style={{
          display: "inline-block", fontFamily: FONT, fontSize: "0.62rem", fontWeight: 700,
          padding: "0.3rem 0.6rem", borderRadius: 999, marginBottom: "0.5rem",
          background: "rgba(16,185,129,0.2)", color: "#10B981", border: "1px solid rgba(16,185,129,0.4)",
        }}>
          {badge}
        </span>
        <div style={{ fontFamily: FONT, fontSize: "clamp(1.4rem, 4vw, 2rem)", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontFamily: FONT, fontSize: "0.85rem", color: "rgba(255,255,255,0.75)", marginTop: "0.35rem" }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
