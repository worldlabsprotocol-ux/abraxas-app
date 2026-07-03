"use client";
// FILE: components/case-studies/CaseStudyGallery.tsx
// Photo evidence strip for institutional case studies.

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export function CaseStudyGallery({
  images,
  altPrefix,
}: {
  images: readonly string[];
  altPrefix: string;
}) {
  if (!images.length) return null;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
      gap: "0.65rem",
      marginBottom: "0.5rem",
    }}>
      {images.map((src, i) => (
        <div key={src} style={{
          borderRadius: 12, overflow: "hidden",
          border: "1px solid var(--border-strong)",
          aspectRatio: "4/3",
          background: "var(--surface)",
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={`${altPrefix} ${i + 1}`}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
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
}: {
  src: string;
  alt: string;
  badge: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div style={{
      position: "relative", borderRadius: 18, overflow: "hidden",
      marginBottom: "1.25rem", minHeight: 280,
      border: "1px solid var(--border-strong)",
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} style={{ width: "100%", height: "100%", minHeight: 280, objectFit: "cover", display: "block" }} />
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to top, rgba(6,9,11,0.92) 0%, rgba(6,9,11,0.2) 55%, transparent 100%)",
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
