import Link from "next/link";
import {
  HOMEPAGE_FOUR_PILLARS,
  HOMEPAGE_HERO_DISCLAIMER,
  HOMEPAGE_RECEIPT_SCOPE_NOTE,
} from "@/lib/home/homepageAlignment565Copy";

/** Four capability pillars — Builds #550–#565 product truth. */
export function HomeProtocolPillarsSection() {
  return (
    <section className="abx-home-pillars" aria-labelledby="home-pillars-heading">
      <p className="abx-v2-eyebrow">What Abraxas is now</p>
      <h2 id="home-pillars-heading" className="abx-v2-section-title">
        Holder-controlled trust, independently verifiable
      </h2>
      <p className="abx-v2-section-lead abx-v2-section-lead--tight">
        Four layers work together: Passport for holders, sovereign issuance standards, cryptographic partner verification,
        and privacy boundaries that withhold raw identity by default.
      </p>
      <ul className="abx-home-pillars__grid">
        {HOMEPAGE_FOUR_PILLARS.map((pillar) => (
          <li key={pillar.id} className="abx-home-pillars__card">
            <h3 className="abx-home-pillars__title">{pillar.title}</h3>
            <p className="abx-home-pillars__summary">{pillar.summary}</p>
            <p className="abx-home-pillars__detail">{pillar.detail}</p>
            <Link href={pillar.href} className="abx-home-pillars__cta">
              {pillar.cta} →
            </Link>
          </li>
        ))}
      </ul>
      <p className="abx-home-pillars__scope" role="note">
        {HOMEPAGE_RECEIPT_SCOPE_NOTE}
      </p>
      <p className="abx-home-pillars__disclaimer" role="note">
        {HOMEPAGE_HERO_DISCLAIMER}
      </p>
    </section>
  );
}
