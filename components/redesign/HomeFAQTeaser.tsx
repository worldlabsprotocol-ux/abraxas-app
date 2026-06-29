"use client";
// FILE: components/redesign/HomeFAQTeaser.tsx
// Three mass-adoption FAQs on homepage; full list at /faq.

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { FAQ_ITEMS } from "@/lib/protocolContent";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

const HOME_FAQ_KEYS = [
  "Do I need $ABRA to use Abraxas?",
  "Why Abraxas?",
  "How do partners integrate the Passport?",
];

const ITEMS = FAQ_ITEMS.filter(f => HOME_FAQ_KEYS.includes(f.q));

export function HomeFAQTeaser() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-end",
        flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem",
      }}>
        <div>
          <div style={{
            fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: ACCENT, marginBottom: "0.5rem",
          }}>
            Common questions
          </div>
          <h2 style={{
            fontFamily: FONT, fontSize: "var(--fs-h2)", fontWeight: 800,
            letterSpacing: "-0.02em", color: "var(--text-primary)", margin: 0,
          }}>
            Straight answers
          </h2>
        </div>
        <Link href="/faq" style={{
          fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
          color: ACCENT, textDecoration: "none",
        }}>
          All FAQs →
        </Link>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {ITEMS.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.q} style={{
              borderRadius: 14,
              border: `1px solid ${isOpen ? `${ACCENT}40` : "var(--border)"}`,
              background: "var(--surface-raised)",
              overflow: "hidden",
            }}>
              <button type="button" onClick={() => setOpen(isOpen ? null : i)}
                style={{
                  width: "100%", padding: "1rem 1.15rem",
                  background: "transparent", border: "none", cursor: "pointer",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  gap: "1rem", textAlign: "left",
                }}>
                <span style={{
                  fontFamily: FONT, fontSize: "0.88rem", fontWeight: 600,
                  color: "var(--text-primary)",
                }}>
                  {item.q}
                </span>
                <span style={{ color: ACCENT, fontSize: "1.1rem", flexShrink: 0 }}>
                  {isOpen ? "−" : "+"}
                </span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <p style={{
                      fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)",
                      lineHeight: 1.75, margin: 0, padding: "0 1.15rem 1.15rem",
                    }}>
                      {item.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
