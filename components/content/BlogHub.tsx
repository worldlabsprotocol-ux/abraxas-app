"use client";
// FILE: components/content/BlogHub.tsx

import Link from "next/link";
import { useMemo, useState } from "react";
import { BLOG_CATEGORY_LABELS, type BlogCategory, type ContentPost } from "@/lib/content/types";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

const CATEGORIES: (BlogCategory | "all")[] = ["all", "problem", "proof", "product", "partnerships", "founder"];

export function BlogHub({ posts }: { posts: ContentPost[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<BlogCategory | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter(p => {
      if (category !== "all" && p.category !== category) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.body.toLowerCase().includes(q)
      );
    });
  }, [posts, query, category]);

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", marginBottom: "1.25rem" }}>
        <input
          type="search"
          placeholder="Search articles…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Search articles"
          style={{
            flex: "1 1 200px", padding: "0.55rem 0.75rem", borderRadius: 10,
            border: "1px solid var(--border)", background: "var(--surface)",
            fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-primary)",
          }}
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
          {CATEGORIES.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              style={{
                padding: "0.4rem 0.7rem", borderRadius: 999, cursor: "pointer",
                border: `1px solid ${category === c ? "rgba(16,185,129,0.45)" : "var(--border)"}`,
                background: category === c ? "rgba(16,185,129,0.12)" : "var(--surface)",
                fontFamily: FONT, fontSize: "0.68rem", fontWeight: 600,
                color: category === c ? ACCENT : "var(--text-muted)",
              }}
            >
              {c === "all" ? "All" : BLOG_CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gap: "0.85rem" }}>
        {filtered.map(post => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            style={{
              display: "block", padding: "1rem 1.1rem", borderRadius: 14,
              border: "1px solid var(--border-strong)", background: "var(--surface-raised)",
              textDecoration: "none", color: "inherit",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.35rem" }}>
              <span style={{
                fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700, textTransform: "uppercase",
                color: ACCENT, letterSpacing: "0.08em",
              }}>
                {BLOG_CATEGORY_LABELS[post.category]}
              </span>
              <span style={{ fontFamily: MONO, fontSize: "0.58rem", color: "var(--text-muted)" }}>
                {post.date}{post.readingTime ? ` · ${post.readingTime}` : ""}
              </span>
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
              {post.title}
            </div>
            <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
              {post.description}
            </p>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-muted)" }}>No articles match.</p>
        )}
      </div>
    </div>
  );
}
