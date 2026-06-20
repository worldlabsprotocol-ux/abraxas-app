"use client";
// FILE: components/terminal/WhyVerificationStory.tsx
// From the original audit: "a short, plain-language explanation of why
// verification matters, told as a story, not a spec sheet." Never
// built until now.

import { S, G, W } from "./tokens";
import { ScrollFade } from "./ui";

export function WhyVerificationStory() {
  return (
    <ScrollFade>
      <div>
        <div style={{ fontFamily:S, fontSize:"0.95rem", fontWeight:700,
                       color:W, marginBottom:"1rem" }}>
          Why verification actually matters
        </div>
        <div style={{ display:"grid",
                       gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",
                       gap:"1rem" }}>
          <div style={{ padding:"1.125rem", borderRadius:12,
                         background:"rgba(255,255,255,0.02)" }}>
            <div style={{ fontFamily:S, fontSize:"0.78rem", fontWeight:600,
                           color:G, marginBottom:"0.5rem" }}>
              The missed royalty check
            </div>
            <p style={{ fontFamily:S, fontSize:"0.78rem",
                         color:"rgba(255,255,255,0.5)", lineHeight:1.7, margin:0 }}>
              An artist's catalog sat for years generating royalties nobody
              was tracking. No platform had ever verified who owned what, so
              nobody could prove a claim worth chasing. Once it's verified
              once, that proof doesn't expire, the next check doesn't get missed.
            </p>
          </div>
          <div style={{ padding:"1.125rem", borderRadius:12,
                         background:"rgba(255,255,255,0.02)" }}>
            <div style={{ fontFamily:S, fontSize:"0.78rem", fontWeight:600,
                           color:G, marginBottom:"0.5rem" }}>
              The property that couldn't get a loan
            </div>
            <p style={{ fontFamily:S, fontSize:"0.78rem",
                         color:"rgba(255,255,255,0.5)", lineHeight:1.7, margin:0 }}>
              A paid-off property with real income still has to prove its
              value from scratch to every bank it approaches. Verify it once,
              and that proof becomes something any lender can actually trust,
              instead of starting the appraisal process over every time.
            </p>
          </div>
        </div>
      </div>
    </ScrollFade>
  );
}
