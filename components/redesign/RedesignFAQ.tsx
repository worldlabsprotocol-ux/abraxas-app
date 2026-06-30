"use client";
// FILE: components/redesign/RedesignFAQ.tsx
// Founder-voice FAQ (Jeff Yan / Ansem / Alex Becker tone). Original
// copy grounded in the real thesis + the real Genesis Asset (Cielo
// Sunrise). No fabricated metrics or third-party names.

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";
const VIOLET = "#8B5CF6";

interface QA { q: string; a: string[]; }
interface Group { group: string; items: QA[]; }

const GROUPS: Group[] = [
  {
    group: "On the beginning",
    items: [
      {
        q: "How did World Labs start, and what problem were you personally frustrated by?",
        a: [
          "We didn't start with \u201Clet's tokenize real estate.\u201D We started annoyed. We owned a real, cash-flowing property and watched every platform that touched it \u2014 lenders, marketplaces, payment rails \u2014 re-run the exact same KYC on the same person and the same documents, every single time.",
          "That's verification debt. It compounds with every integration and it quietly kills everything before it starts. World Labs is what we built to delete that tax. Verify the person once, verify the asset once, and issue a credential that travels. Abraxas is that credential layer.",
        ],
      },
      {
        q: "Why RWA, and why now?",
        a: [
          "Two things finally lined up. Verification rails got good enough — Sui zkLogin means anyone can get a holder address with Google, no seed phrase. And the demand showed up: real yield beats farm yield that evaporates by Monday.",
          "RWA isn't early because of the tech anymore. It's early because nobody solved trust. That's the whole gap, and it's the only part that matters. We're not here for the narrative pump \u2014 we're here because the boring part, verification, is the unlock, and we'd rather own the unlock than the hype.",
        ],
      },
    ],
  },
  {
    group: "On the verification problem",
    items: [
      {
        q: "What actually breaks downstream when you tokenize an asset without proper verification?",
        a: [
          "Everything \u2014 just later. A token is a claim. If the claim underneath it is garbage (no clear title, no real cash flow, no confirmed owner), you've just made garbage liquid and easier to offload onto someone else.",
          "The break shows up downstream: a lender can't underwrite it, a marketplace can't price it, and the first real dispute turns the whole thing into a lawsuit with a JPEG attached. Most \u201CRWA\u201D is a wrapper around a trust-me. We invert it \u2014 nothing gets a token until the thing it represents is actually verified.",
        ],
      },
      {
        q: "What does your verification process actually look like?",
        a: [
          "Two tracks, both real. Identity: government ID plus liveness via Veriff, then a W3C credential with did:sui — your Sui address from zkLogin is the anchor.",
          "Asset: title chain, ownership, revenue, appraisal, risk score — reviewed and attested. Stamps mirror to a Sui Passport object on-chain. Integrators verify via one API call without re-running KYC.",
        ],
      },
    ],
  },
  {
    group: "On tokenizing a real rental",
    items: [
      {
        q: "Walk me through the first cash-flowing rental you verified on Abraxas.",
        a: [
          "Cielo Sunrise. A mountain wellness retreat in Mineral Bluff, Georgia — real cabin, real Airbnb listing, real revenue. Held in a single-member LLC with clear title, independently appraised at $1.1M against roughly $109.5K of annual NOI.",
          "We ran it through the full pipeline: entity, title, insurance, revenue history, appraisal — then issued an AAS-1 verification certificate. It's our Genesis Asset: verified, collateral-eligible, cash-flowing. Not a rendering — a building you can actually book.",
        ],
      },
      {
        q: "What does an investor actually get when they hold a token backed by a rental?",
        a: [
          "Clarity first, because that's the part that's usually missing. The token represents a verified claim on a specific, attested asset \u2014 you can see the title status, the NOI, the appraisal, the collateral score, and the on-chain certificate before you ever touch it.",
          "Where structures are live, that claim maps to economic rights in the underlying entity and its cash flow. Where they're not open yet, we say so plainly instead of selling you a maybe. The entire point of Abraxas is that you stop trusting a listing and start verifying the asset.",
        ],
      },
    ],
  },
  {
    group: "On Sui",
    items: [
      {
        q: "Why Sui for verification — what does zkLogin give you?",
        a: [
          "Frictionless identity. Users sign in with Google; Abraxas derives a Sui address without a seed phrase or browser wallet. That address holds the Passport stamp bitmask and did:sui credentials.",
          "Sui also enables sponsored transactions — verified tiers get gas paid from a growth-fee treasury — and intent messaging to prove control without spending SUI. See /docs/sui for the full map.",
        ],
      },
      {
        q: "How do you handle the gap between on-chain speed and off-chain legal reality?",
        a: [
          "You respect the gap instead of pretending it doesn't exist. On-chain is the record and the rails; the legal wrapper is what makes it enforceable. Assets sit in real entities with clear title and a named custodian, so the token points at something a court recognizes.",
          "On-chain, the credential and the economic claim move instantly. The legal transfer is handled by the wrapper and custodian on its own clock. Disputes resolve where they actually resolve — in the jurisdiction — and the on-chain provenance trail is the cleanest evidence in the room.",
        ],
      },
    ],
  },
  {
    group: "On the legal and regulatory side",
    items: [
      {
        q: "How do you navigate property law across jurisdictions \u2014 is this market-by-market?",
        a: [
          "Yes, and anyone who says otherwise is hand-waving. Property and securities law are local. Our move is to standardize the verification layer \u2014 identity, ownership, the credential format, the on-chain attestation \u2014 and keep the legal wrapper modular per jurisdiction.",
          "Wyoming LLCs are fastest in the US. Coastal Mexico holds through a fideicomiso. The next market has its own structure. The credential and the standard travel; the wrapper localizes. That's how you scale without lying about the law.",
        ],
      },
      {
        q: "What's the liability structure when something goes wrong with an underlying asset?",
        a: [
          "Liability lives where the asset lives \u2014 in the entity that holds it, with real insurance and a named custodian, not in a vague \u201Cprotocol.\u201D Abraxas's job is to attest what was verified and when, and to keep that record honest and on-chain.",
          "We're explicit about what we verified versus what's reference data or a third party's projection, so nobody confuses an attestation with a guarantee. When something goes wrong, the structure tells you exactly who's responsible \u2014 which is the opposite of how most of crypto handles it.",
        ],
      },
    ],
  },
  {
    group: "On the market",
    items: [
      {
        q: "Who's buying these tokens \u2014 crypto natives or traditional real estate investors?",
        a: [
          "Both, from opposite directions. Crypto natives are tired of yield that's really just emissions and want something backed by a building that actually rents. Traditional real estate people want the liquidity and transparency they never had \u2014 they're done with 1031 gymnastics and decade-long lockups.",
          "Verification is the bridge. The crypto side trusts the on-chain proof; the trad side trusts the title and the appraisal. Give both a credential they can check and you stop running two separate markets.",
        ],
      },
      {
        q: "What does the conversation look like when you approach a property owner?",
        a: [
          "It's not \u201Cput your house on the blockchain.\u201D Owners don't want that, and it sets off every alarm bell. It's: \u201CYou've got equity locked in a paid-off, cash-flowing asset, and your only doors today are a bank refi or selling. We verify it and open a third door \u2014 bring in verified capital, unlock liquidity, keep long-term ownership.\u201D",
          "The second it's framed as control and options instead of crypto, the conversation changes. We lead with verification, because that's the part they actually trust.",
        ],
      },
      {
        q: "Where does RWA have real traction right now vs where is it still narrative?",
        a: [
          "Real traction: stablecoins (the original RWA), tokenized treasuries, and private credit \u2014 boring, yield-bearing, institution-friendly. That's real volume, not slides.",
          "Mostly narrative: fractionalized luxury everything, \u201Ctokenize the world\u201D decks with no clear title and no cash flow, and secondary markets that don't exist yet. The tell is always the same \u2014 is there verified collateral and real cash flow underneath, or is there a token and a vibe? We're deliberately building on the boring, real side.",
        ],
      },
    ],
  },
  {
    group: "On building",
    items: [
      {
        q: "What does most of the industry get wrong about RWA that you're trying to fix?",
        a: [
          "They start with the token. The token is the easy 5%. The hard 95% is proving the thing is real, owned, and worth what you say \u2014 and making that proof portable so it isn't redone at every step.",
          "Most teams ship the wrapper and bolt on trust later, which is backwards, and it's why most RWA is a demo. We built the verification layer first and treat the token as the last step, not the first. Verification isn't a feature on top of RWA. It is the product.",
        ],
      },
      {
        q: "What surprised you most once you got deep into actually doing this?",
        a: [
          "How much of the friction is pure redundancy. The same owner, the same documents, the same asset, re-verified from scratch by every counterparty as if the last five checks never happened. It's not a hard problem \u2014 it's an un-coordinated one. Nobody's credential is trusted by the next guy.",
          "Once you see that, the whole thing flips. The winning move isn't a flashier marketplace; it's becoming the verification everyone else accepts. That's a quieter game than most of crypto plays, and it's the one that actually compounds.",
        ],
      },
    ],
  },
  {
    group: "The final question",
    items: [
      {
        q: "If verification becomes the standard, what does the RWA market look like in five years?",
        a: [
          "Re-KYC dies. You verify once, and that credential opens every door \u2014 lend against a property in the morning, list it in the afternoon, sell a piece at night, all on one proof, never re-proving who you are at each stop.",
          "Real estate stops being the most illiquid asset on earth and starts trading like it has a pulse, globally, because trust is portable and the asset is legible to anyone. The winners won't be the platforms with the most listings. They'll be the ones whose verification everyone else decided to trust. We intend to be that layer.",
        ],
      },
    ],
  },
];

function Item({ qa, open, onToggle }: { qa: QA; open: boolean; onToggle: () => void }) {
  const reduce = useReducedMotion();
  return (
    <div style={{ borderBottom: "1px solid var(--border)" }}>
      <button onClick={onToggle}
        style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: "1rem",
                 padding: "1.15rem 0", background: "transparent", border: "none",
                 cursor: "pointer", textAlign: "left" }}>
        <span style={{ flex: 1, fontFamily: FONT, fontSize: "1.02rem", fontWeight: 600,
                        letterSpacing: "-0.01em",
                        color: open ? "var(--text-primary)" : "var(--text-secondary)",
                        lineHeight: 1.4 }}>
          {qa.q}
        </span>
        <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }}
          style={{ flexShrink: 0, fontSize: "1.3rem", lineHeight: 1, marginTop: 2,
                   color: open ? ACCENT : "var(--text-muted)" }}>
          +
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: "hidden" }}>
            <div style={{ paddingBottom: "1.25rem", maxWidth: 680,
                          display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {qa.a.map((p, i) => (
                <p key={i} style={{ margin: 0, fontFamily: FONT, fontSize: "0.92rem",
                                    color: "var(--text-secondary)", lineHeight: 1.75 }}>
                  {p}
                </p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function RedesignFAQ() {
  // First item open by default (the origin story).
  const [open, setOpen] = useState<string>("0-0");

  return (
    <section>
      <div style={{ fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
                     letterSpacing: "0.14em", textTransform: "uppercase",
                     color: ACCENT, marginBottom: "0.75rem" }}>
        FAQ
      </div>
      <h2 style={{ fontFamily: FONT, fontSize: "var(--fs-h1)", fontWeight: 800,
                    letterSpacing: "-0.03em", lineHeight: 1.05,
                    color: "var(--text-primary)", margin: "0 0 0.75rem", maxWidth: 720 }}>
        Straight answers, <span style={{ color: VIOLET }}>no narrative.</span>
      </h2>
      <p style={{ fontFamily: FONT, fontSize: "var(--fs-body)", color: "var(--text-secondary)",
                   lineHeight: 1.7, maxWidth: 600, margin: "0 0 2rem" }}>
        The thesis, the asset, the law, and the market, told the way we'd tell a builder
        across the table, not an investor deck.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {GROUPS.map((g, gi) => (
          <div key={g.group}>
            <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
                           letterSpacing: "0.12em", textTransform: "uppercase",
                           color: "var(--text-muted)", marginBottom: "0.25rem",
                           paddingBottom: "0.5rem", borderBottom: `1px solid ${ACCENT}33` }}>
              {g.group}
            </div>
            {g.items.map((qa, ii) => {
              const id = `${gi}-${ii}`;
              return (
                <Item key={id} qa={qa} open={open === id}
                  onToggle={() => setOpen(open === id ? "" : id)} />
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
