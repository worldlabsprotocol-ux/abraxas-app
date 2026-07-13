// FILE: lib/content/parseMarkdown.ts
// Lightweight frontmatter parser — no extra dependencies.

import type { ContentFrontmatter, ContentPost } from "./types";

function parseFrontmatterBlock(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

export function parseMarkdownFile(raw: string, fallbackSlug: string): ContentPost {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    throw new Error(`Invalid markdown frontmatter: ${fallbackSlug}`);
  }
  const fm = parseFrontmatterBlock(match[1]);
  const body = match[2].trim();

  return {
    title: fm.title ?? fallbackSlug,
    description: fm.description ?? "",
    category: (fm.category ?? "product") as ContentPost["category"],
    date: fm.date ?? "2026-07-01",
    slug: fm.slug ?? fallbackSlug,
    author: fm.author,
    readingTime: fm.readingTime,
    republishNote: fm.republishNote,
    draft: fm.draft === "true",
    body,
  };
}
