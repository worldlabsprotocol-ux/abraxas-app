"use client";
// FILE: components/case-studies/CaseStudyGallery.tsx
// Photo evidence — validates assets load; skips collage panels that read as placeholders.

import { useEffect, useState } from "react";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const BG = "#06090B";

const OBJECT_POSITIONS: Record<string, string> = {
  "/assets/cielo/04.jpg": "78% center",
  "/assets/cielo/01.jpg": "50% 20%",
  "/assets/cielo/06.jpg": "50% 30%",
  "/assets/cielo/14.jpg": "50% 40%",
  "/assets/cielo/20.jpg": "center",
};

/** Airbnb collage exports — crop badly in tight mosaics */
const SKIP_IMAGES = new Set(["/assets/cielo/07.jpg"]);

function probeImage(src: string): Promise<string | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function CaseStudyGallery({
  images,
  altPrefix,
  maxImages,
  variant = "mosaic",
}: {
  images: readonly string[];
  altPrefix: string;
  maxImages?: number;
  variant?: "mosaic" | "grid";
}) {
  const [valid, setValid] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const candidates = images.filter(src => !SKIP_IMAGES.has(src));
    Promise.all(candidates.map(probeImage)).then(results => {
      if (cancelled) return;
      const loaded = results.filter((r): r is string => r !== null);
      setValid(maxImages != null ? loaded.slice(0, maxImages) : loaded);
    });
    return () => { cancelled = true; };
  }, [images, maxImages]);

  if (valid === null) {
    return (
      <div style={{
        height: 120, borderRadius: 16, background: "var(--surface)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)" }}>Loading gallery…</span>
      </div>
    );
  }

  if (!valid.length) return null;

  if (variant === "grid") {
    return (
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "0.5rem",
      }}>
        {valid.map((src, i) => (
          <PhotoTile key={src} src={src} alt={`${altPrefix} ${i + 1}`} rounded />
        ))}
      </div>
    );
  }

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: valid.length === 1 ? "1fr" : valid.length === 2 ? "1fr 1fr" : "repeat(3, 1fr)",
      gap: 3,
      borderRadius: 16,
      overflow: "hidden",
      background: BG,
      aspectRatio: valid.length <= 2 ? "21/9" : "16/7",
      maxHeight: 280,
    }}>
      {valid.map((src, i) => (
        <div key={src} style={{ position: "relative", minHeight: 0, height: "100%" }}>
          <PhotoTile src={src} alt={`${altPrefix} ${i + 1}`} />
        </div>
      ))}
    </div>
  );
}

function PhotoTile({ src, alt, rounded }: { src: string; alt: string; rounded?: boolean }) {
  return (
    <div style={{
      position: "relative",
      minHeight: 0,
      minWidth: 0,
      background: BG,
      overflow: "hidden",
      borderRadius: rounded ? 12 : 0,
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          objectPosition: OBJECT_POSITIONS[src] ?? "center",
        }}
      />
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
      marginBottom: "0.65rem",
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
          background: "rgba(232,197,71,0.2)", color: "var(--accent, #E8C547)",
          border: "1px solid var(--accent-border, rgba(232,197,71,0.4))",
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

export function CaseStudyVideoHero({
  src,
  poster,
  alt,
  badge,
  title,
  subtitle,
}: {
  src: string;
  poster?: string;
  alt: string;
  badge: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div style={{
      position: "relative", borderRadius: 18, overflow: "hidden",
      marginBottom: "0.65rem",
      aspectRatio: "16/9",
      background: BG,
    }}>
      <video
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        aria-label={alt}
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit: "cover", display: "block",
        }}
      />
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to top, rgba(6,9,11,0.92) 0%, rgba(6,9,11,0.35) 50%, rgba(6,9,11,0.15) 100%)",
        pointerEvents: "none",
      }} />
      <div style={{ position: "absolute", bottom: 20, left: 20, right: 20, pointerEvents: "none" }}>
        <span style={{
          display: "inline-block", fontFamily: FONT, fontSize: "0.62rem", fontWeight: 700,
          padding: "0.3rem 0.6rem", borderRadius: 999, marginBottom: "0.5rem",
          background: "rgba(232,197,71,0.2)", color: "var(--accent, #E8C547)",
          border: "1px solid var(--accent-border, rgba(232,197,71,0.4))",
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
