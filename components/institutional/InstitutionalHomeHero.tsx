"use client";

import { Btn } from "@/components/redesign/ui";
import { ProtocolReceiptDemo } from "@/components/institutional/ProtocolReceiptDemo";
import {
  V2_HOME_CTA_BUILD,
  V2_HOME_CTA_BUILD_HREF,
  V2_HOME_CTA_PROTOCOL,
  V2_HOME_CTA_PROTOCOL_HREF,
  V2_HOME_EYEBROW,
  V2_HOME_HEADLINE,
  V2_HOME_LEAD,
} from "@/lib/home/v2HomeCopy";

export function InstitutionalHomeHero() {
  return (
    <section className="abx-v2-hero" aria-label="Abraxas trust infrastructure">
      <div className="abx-v2-hero__copy">
        <p className="abx-v2-eyebrow">{V2_HOME_EYEBROW}</p>
        <h1 className="abx-v2-hero__title">{V2_HOME_HEADLINE}</h1>
        <p className="abx-v2-hero__lead">{V2_HOME_LEAD}</p>
        <div className="abx-v2-hero__actions">
          <Btn href={V2_HOME_CTA_PROTOCOL_HREF} size="md">
            {V2_HOME_CTA_PROTOCOL}
          </Btn>
          <Btn href={V2_HOME_CTA_BUILD_HREF} variant="secondary" size="md">
            {V2_HOME_CTA_BUILD}
          </Btn>
        </div>
      </div>
      <div className="abx-v2-hero__demo">
        <ProtocolReceiptDemo />
      </div>
    </section>
  );
}
