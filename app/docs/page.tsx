"use client";
// FILE: app/docs/page.tsx
// Documentation hub — section nav + short summaries with Read More links.

import Link from "next/link";
import { useEffect, useState } from "react";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { DOCS_HUB_GROUPS, DOCS_HUB_NAV, type DocTopic } from "@/lib/docs/docsHub";

const FONT = "'Inter',system-ui,sans-serif";
const ACCENT = "#10B981";

function DocTopicCard({ topic }: { topic: DocTopic }) {
  return (
    <article
      id={topic.id}
      style={{
        padding: "1rem 1.05rem",
        borderRadius: 12,
        border: "1px solid var(--border-strong)",
        background: "var(--surface)",
      }}
    >
      <h3 style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 0.45rem" }}>
        {topic.title}
      </h3>
      <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.75rem" }}>
        {topic.summary}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
        {topic.readMore && (
          <Link
            href={topic.readMore.href}
            style={{
              padding: "0.4rem 0.75rem", borderRadius: 999,
              border: `1px solid ${ACCENT}55`, background: `${ACCENT}14`, color: ACCENT,
              fontFamily: FONT, fontSize: "0.74rem", fontWeight: 700, textDecoration: "none",
            }}
          >
            Read more: {topic.readMore.label} →
          </Link>
        )}
        {topic.links?.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            style={{
              padding: "0.4rem 0.75rem", borderRadius: 999,
              border: "1px solid var(--border)", color: "var(--text-secondary)",
              fontFamily: FONT, fontSize: "0.74rem", fontWeight: 600, textDecoration: "none",
            }}
          >
            {link.label} →
          </Link>
        ))}
      </div>
    </article>
  );
}

export default function DocsPage() {
  const [activeGroup, setActiveGroup] = useState(DOCS_HUB_NAV[0]?.id ?? "overview");

  useEffect(() => {
    const onScroll = () => {
      const offset = 120;
      for (const group of DOCS_HUB_GROUPS) {
        const el = document.getElementById(`docs-group-${group.id}`);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top <= offset) setActiveGroup(group.id);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToGroup = (groupId: string) => {
    setActiveGroup(groupId);
    document.getElementById(`docs-group-${groupId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <RedesignPage maxWidth={900}>
      <header style={{ marginBottom: "1.25rem" }}>
        <div className="abx-eyebrow-violet" style={{ marginBottom: "0.35rem" }}>Documentation</div>
        <h1 style={{ fontFamily: FONT, fontSize: "1.75rem", fontWeight: 900, margin: "0 0 0.5rem", letterSpacing: "-0.03em" }}>
          Protocol docs
        </h1>
        <p style={{ fontFamily: FONT, fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
          Each section fits one screen. Jump to a topic or follow Read more for depth.
        </p>
      </header>

      <nav
        aria-label="Documentation sections"
        style={{
          position: "sticky",
          top: "clamp(60px, 8vw, 72px)",
          zIndex: 10,
          marginBottom: "1.25rem",
          padding: "0.5rem 0",
          background: "var(--bg)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          className="docs-hub-nav"
          style={{
            display: "flex",
            gap: "0.45rem",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            paddingBottom: 2,
            scrollbarWidth: "none",
          }}
        >
          {DOCS_HUB_NAV.map((item) => {
            const active = activeGroup === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToGroup(item.id)}
                aria-current={active ? "true" : undefined}
                style={{
                  flexShrink: 0,
                  padding: "0.45rem 0.85rem",
                  borderRadius: 999,
                  border: active ? `1px solid ${ACCENT}66` : "1px solid var(--border)",
                  background: active ? `${ACCENT}18` : "var(--surface)",
                  color: active ? ACCENT : "var(--text-secondary)",
                  fontFamily: FONT,
                  fontSize: "0.76rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {item.title}
              </button>
            );
          })}
        </div>
      </nav>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
        {DOCS_HUB_GROUPS.map((group) => (
          <section key={group.id} id={`docs-group-${group.id}`} style={{ scrollMarginTop: 130 }}>
            <h2 style={{
              fontFamily: FONT, fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)",
              margin: "0 0 0.75rem", letterSpacing: "-0.02em",
            }}>
              {group.title}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              {group.topics.map((topic) => (
                <DocTopicCard key={topic.id} topic={topic} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <style jsx global>{`
        .docs-hub-nav::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </RedesignPage>
  );
}
