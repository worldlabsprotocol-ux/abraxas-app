"use client";
// FILE: components/content/MarkdownBody.tsx
// Lightweight markdown renderer for blog articles.

import Link from "next/link";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

function inlineFormat(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) {
      parts.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      parts.push(
        <code key={key++} style={{ fontFamily: MONO, fontSize: "0.85em", background: "var(--surface)", padding: "0.1rem 0.35rem", borderRadius: 4 }}>
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const [, label, href] = linkMatch;
        const external = href.startsWith("http");
        if (external) {
          parts.push(<a key={key++} href={href} style={{ color: ACCENT, fontWeight: 600 }}>{label}</a>);
        } else {
          parts.push(<Link key={key++} href={href} style={{ color: ACCENT, fontWeight: 600 }}>{label}</Link>);
        }
      }
    }
    last = m.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function MarkdownBody({ markdown }: { markdown: string }) {
  const blocks = markdown.split(/\n\n+/);
  const nodes: React.ReactNode[] = [];

  blocks.forEach((block, i) => {
    const trimmed = block.trim();
    if (!trimmed) return;

    if (trimmed.startsWith("### ")) {
      nodes.push(
        <h3 key={i} style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)", margin: "1.25rem 0 0.5rem" }}>
          {inlineFormat(trimmed.slice(4))}
        </h3>,
      );
      return;
    }
    if (trimmed.startsWith("## ")) {
      nodes.push(
        <h2 key={i} style={{ fontFamily: FONT, fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", margin: "1.5rem 0 0.65rem" }}>
          {inlineFormat(trimmed.slice(3))}
        </h2>,
      );
      return;
    }
    if (trimmed.startsWith("> ")) {
      nodes.push(
        <blockquote key={i} style={{
          margin: "1rem 0", padding: "0.75rem 1rem", borderLeft: `3px solid ${ACCENT}`,
          background: "var(--surface)", borderRadius: "0 8px 8px 0",
          fontFamily: FONT, fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.65,
        }}>
          {inlineFormat(trimmed.replace(/^>\s?/gm, ""))}
        </blockquote>,
      );
      return;
    }
    if (trimmed.split("\n").every(l => l.startsWith("- "))) {
      nodes.push(
        <ul key={i} style={{ fontFamily: FONT, fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: "0.5rem 0", paddingLeft: "1.25rem" }}>
          {trimmed.split("\n").map((line, j) => (
            <li key={j} style={{ marginBottom: "0.35rem" }}>{inlineFormat(line.slice(2))}</li>
          ))}
        </ul>,
      );
      return;
    }
    if (trimmed.split("\n").every(l => /^\d+\.\s/.test(l))) {
      nodes.push(
        <ol key={i} style={{ fontFamily: FONT, fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: "0.5rem 0", paddingLeft: "1.25rem" }}>
          {trimmed.split("\n").map((line, j) => (
            <li key={j} style={{ marginBottom: "0.35rem" }}>{inlineFormat(line.replace(/^\d+\.\s/, ""))}</li>
          ))}
        </ol>,
      );
      return;
    }

    nodes.push(
      <p key={i} style={{ fontFamily: FONT, fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: "0 0 0.85rem" }}>
        {inlineFormat(trimmed.replace(/\n/g, " "))}
      </p>,
    );
  });

  return <article>{nodes}</article>;
}
