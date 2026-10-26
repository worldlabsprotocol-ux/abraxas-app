"use client";
// FILE: components/home/HomeProtocolSignalMarquee.tsx
// Continuous protocol ticker — identity motion, not navigation.

import { useReducedMotion } from "framer-motion";
import {
  HOMEPAGE_PROTOCOL_MARQUEE_PHRASES,
  HOMEPAGE_PROTOCOL_MARQUEE_SEPARATOR,
} from "@/lib/home/homepageProtocolMarqueeCopy";

function MarqueeSequence() {
  const items: string[] = [];
  for (const phrase of HOMEPAGE_PROTOCOL_MARQUEE_PHRASES) {
    items.push(phrase.toUpperCase());
    items.push(HOMEPAGE_PROTOCOL_MARQUEE_SEPARATOR);
  }
  return (
    <span className="abx-protocol-signal-marquee__sequence" aria-hidden="true">
      {items.map((token, i) =>
        token === HOMEPAGE_PROTOCOL_MARQUEE_SEPARATOR ? (
          <span key={`sep-${i}`} className="abx-protocol-signal-marquee__mark">
            {token}
          </span>
        ) : (
          <span key={`${token}-${i}`} className="abx-protocol-signal-marquee__phrase">
            {token}
          </span>
        ),
      )}
    </span>
  );
}

export function HomeProtocolSignalMarquee() {
  const reduce = useReducedMotion();
  const staticLabel = HOMEPAGE_PROTOCOL_MARQUEE_PHRASES.map((p) => p.toUpperCase()).join(
    ` ${HOMEPAGE_PROTOCOL_MARQUEE_SEPARATOR} `,
  );

  return (
    <div className="abx-protocol-signal-marquee" role="presentation" aria-hidden="true">
      <div className="abx-protocol-signal-marquee__bar">
        {reduce ? (
          <p className="abx-protocol-signal-marquee__static">{staticLabel}</p>
        ) : (
          <div className="abx-protocol-signal-marquee__viewport">
            <div className="abx-protocol-signal-marquee__track">
              <MarqueeSequence />
              <MarqueeSequence />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
