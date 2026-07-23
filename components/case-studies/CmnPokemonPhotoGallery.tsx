"use client";
// FILE: components/case-studies/CmnPokemonPhotoGallery.tsx
// CMN Designs PSA slabs — cmn1.jpg … cmn29.jpg (no cmn8) under public/assets/cmn-designs/

import { useEffect, useState } from "react";
import { CMN_POKEMON_ASSET, CMN_POKEMON_GALLERY_PATHS } from "@/lib/cmnPokemonCaseStudy";
import { cmnDesignsSlideshowPaths } from "@/lib/cmnDesignsMedia";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

function probeImage(src: string): Promise<boolean> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

export function CmnPokemonPhotoGallery({ altPrefix }: { altPrefix: string }) {
  const [loaded, setLoaded] = useState<string[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const order = cmnDesignsSlideshowPaths();
      const found: string[] = [];
      for (const src of order) {
        if (await probeImage(src)) found.push(src);
      }
      if (!cancelled) setLoaded(found.length ? found : []);
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  if (!loaded.length) {
    return (
      <div style={{
        padding: "1.25rem", borderRadius: 14,
        background: "var(--surface)", border: "1px dashed var(--border-strong)",
      }}>
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", margin: "0 0 0.5rem", lineHeight: 1.55 }}>
          Add photos to <code style={{ fontFamily: "monospace" }}>public/assets/cmn-designs/</code> as{" "}
          <code style={{ fontFamily: "monospace" }}>cmn1.jpg</code> through <code style={{ fontFamily: "monospace" }}>cmn29.jpg</code> (no cmn8).
        </p>
      </div>
    );
  }

  const main = loaded[active] ?? loaded[0];

  return (
    <div>
      <div style={{
        borderRadius: 14, overflow: "hidden", marginBottom: "0.65rem",
        border: "1px solid var(--border-strong)", aspectRatio: "16/10",
        background: "var(--surface)",
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={main}
          alt={`${altPrefix} ${active + 1}`}
          style={{
            width: "100%", height: "100%", objectFit: "cover",
            objectPosition: CMN_POKEMON_ASSET.imageObjectPosition,
            display: "block",
          }}
        />
      </div>

      {loaded.length > 1 && (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.65rem" }}>
          {loaded.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              style={{
                padding: 0, border: `2px solid ${i === active ? "var(--accent)" : "var(--border)"}`,
                borderRadius: 8, overflow: "hidden", width: 72, height: 52, cursor: "pointer",
                opacity: i === active ? 1 : 0.7,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </button>
          ))}
        </div>
      )}

      <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0 0 0.65rem", lineHeight: 1.55 }}>
        {loaded.length} of {CMN_POKEMON_GALLERY_PATHS.length} CMN slab photos loaded · hero: cmn21.jpg
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.5rem" }}>
        {[
          { label: "Owner", value: CMN_POKEMON_ASSET.owner, sub: "Beneficial holder" },
          { label: "Grading", value: "PSA slabs", sub: "Per-card when disclosed" },
          { label: "Status", value: "Not for sale", sub: "Registry reference" },
        ].map(card => (
          <div key={card.label} style={{
            padding: "0.65rem", borderRadius: 10,
            background: "var(--surface)", border: "1px solid var(--border)",
          }}>
            <div style={{ fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>
              {card.label}
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700, color: "var(--accent)" }}>{card.value}</div>
            <div style={{ fontFamily: FONT, fontSize: "0.62rem", color: "var(--text-muted)", marginTop: 2 }}>{card.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
