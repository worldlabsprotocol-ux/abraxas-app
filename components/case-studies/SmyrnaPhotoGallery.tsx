"use client";
// FILE: components/case-studies/SmyrnaPhotoGallery.tsx
// Smyrna Townhome. canonical owner exterior + optional supplemental angles.

import { useEffect, useState } from "react";
import { SMYRNA_TOWNHOME_IMAGE, SMYRNA_LEGACY_STADIUM_PATH } from "@/lib/data/registryAssetImages";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

const SUPPLEMENTAL_IMAGES = Array.from({ length: 7 }, (_, i) =>
  `/assets/smyrna/${String(i + 12).padStart(3, "0")}.webp`,
);

function probeImage(src: string): Promise<boolean> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

export function SmyrnaPhotoGallery({ altPrefix }: { altPrefix: string }) {
  const [loaded, setLoaded] = useState<string[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const canonical = await probeImage(SMYRNA_TOWNHOME_IMAGE.src);
      const supplemental: string[] = [];
      for (const src of SUPPLEMENTAL_IMAGES) {
        if (await probeImage(src)) supplemental.push(src);
      }

      const images = canonical
        ? [SMYRNA_TOWNHOME_IMAGE.src, ...supplemental.filter(s => s !== SMYRNA_LEGACY_STADIUM_PATH)]
        : supplemental.length
          ? supplemental
          : (await probeImage(SMYRNA_LEGACY_STADIUM_PATH) ? [SMYRNA_LEGACY_STADIUM_PATH] : []);

      if (!cancelled) setLoaded(images);
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  if (!loaded.length) return null;

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
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: SMYRNA_TOWNHOME_IMAGE.objectPosition, display: "block" }}
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

      {loaded.length === 1 && (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0 0 0.65rem", lineHeight: 1.55 }}>
          Additional property angles can be added under <code style={{ fontFamily: "monospace", color: "var(--accent-2)" }}>/public/assets/smyrna/012.webp</code> and up.
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.5rem" }}>
        {[
          { label: "Truist Park", value: "~6 min drive", sub: "Braves · concerts · events" },
          { label: "The Battery", value: "$1B+ district", sub: "3M+ visitors / year" },
          { label: "Title", value: "Clear · Paid off", sub: "Fulton/Cobb records" },
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
