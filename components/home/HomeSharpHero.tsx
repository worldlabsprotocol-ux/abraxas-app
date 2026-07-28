"use client";
// FILE: components/home/HomeSharpHero.tsx
// Hero — headline with live proof mosaic (photography over template cards).

import Image from "next/image";
import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_DISPLAY, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { PROTOCOL_IN_ACTION_PROOFS } from "@/lib/home/ecosystemContent";

const FONT = ABRAXAS_FONT_SANS;
const DISPLAY = ABRAXAS_FONT_DISPLAY;

export function HomeSharpHero() {
  return (
    <section
      id="top"
      aria-labelledby="home-hero-heading"
      className="abx-home-hero"
    >
      <div className="abx-home-hero__copy">
        <p className="abx-section-label" style={{ marginBottom: "0.65rem" }}>
          Reusable verification layer
        </p>

        <h1 id="home-hero-heading" className="abx-home-hero__title">
          Verify once. Transact everywhere.
        </h1>

        <p className="abx-home-lead" style={{ marginBottom: "0.45rem", maxWidth: 520 }}>
          Users verify once. Applications consume trusted credentials instead of rebuilding identity flows.
        </p>
        <p style={{
          fontFamily: FONT,
          fontSize: "0.92rem",
          fontWeight: 600,
          color: "var(--text-primary)",
          margin: "0 0 1.25rem",
          lineHeight: 1.5,
          maxWidth: 520,
        }}>
          Identity becomes portable instead of repetitive.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem" }}>
          <Btn href="/passport" size="lg">Create Passport</Btn>
          <Btn href="/integrate" variant="secondary" size="lg">Integrate</Btn>
        </div>
      </div>

      <div className="abx-home-hero__proof" aria-label="Live protocol deployments">
        {PROTOCOL_IN_ACTION_PROOFS.map((proof, index) => (
          <Link
            key={proof.id}
            href={proof.href}
            className={`abx-home-hero__proof-link${index === 0 ? " abx-home-hero__proof-link--lead" : ""}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <span className="abx-home-hero__proof-media">
              <Image
                src={proof.image.src}
                alt={proof.image.alt}
                fill
                sizes="(min-width: 960px) 220px, 33vw"
                priority={index === 0}
                style={{ objectFit: "cover", objectPosition: proof.image.objectPosition ?? "center" }}
              />
            </span>
            <span className="abx-home-hero__proof-caption">
              <span className="abx-section-label">{proof.category}</span>
              <span className="abx-home-hero__proof-title">{proof.title}</span>
            </span>
          </Link>
        ))}
      </div>

      <style jsx>{`
        .abx-home-hero {
          display: grid;
          gap: 1.75rem;
          padding: clamp(1.25rem, 4vw, 2.5rem) 0 clamp(0.5rem, 2vw, 1rem);
        }
        @media (min-width: 960px) {
          .abx-home-hero {
            grid-template-columns: minmax(0, 1fr) minmax(280px, 420px);
            align-items: center;
            gap: 2.5rem;
          }
        }
        .abx-home-hero__title {
          font-family: ${DISPLAY};
          font-size: clamp(2rem, 5.2vw, var(--fs-display));
          font-weight: 900;
          letter-spacing: -0.04em;
          line-height: 1.02;
          color: var(--text-primary);
          margin: 0 0 0.85rem;
        }
        .abx-home-hero__proof {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.55rem;
        }
        @media (max-width: 959px) {
          .abx-home-hero__proof {
            grid-template-columns: 1fr;
          }
          .abx-home-hero__proof-link--lead {
            grid-column: auto;
          }
        }
        .abx-home-hero__proof-link {
          display: flex;
          flex-direction: column;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid var(--border);
          background: var(--surface-raised);
        }
        .abx-home-hero__proof-link--lead {
          grid-column: span 1;
        }
        @media (min-width: 960px) {
          .abx-home-hero__proof {
            grid-template-rows: 1fr 1fr;
            grid-template-columns: 1.1fr 0.9fr;
          }
          .abx-home-hero__proof-link--lead {
            grid-row: span 2;
          }
        }
        .abx-home-hero__proof-media {
          position: relative;
          display: block;
          width: 100%;
          aspect-ratio: 4 / 3;
          background: #0a0a0b;
        }
        .abx-home-hero__proof-link--lead .abx-home-hero__proof-media {
          aspect-ratio: auto;
          flex: 1;
          min-height: 140px;
        }
        .abx-home-hero__proof-caption {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          padding: 0.55rem 0.65rem 0.65rem;
        }
        .abx-home-hero__proof-title {
          font-family: ${FONT};
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.01em;
        }
      `}</style>
    </section>
  );
}
