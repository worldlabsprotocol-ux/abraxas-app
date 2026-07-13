import { describe, expect, it } from "vitest";
import { parseMarkdownFile } from "./parseMarkdown";

describe("parseMarkdownFile", () => {
  it("parses frontmatter and body", () => {
    const raw = `---
title: Test Article
description: A test
category: problem
date: 2026-07-12
slug: test-article
---

## Hello

Body paragraph.
`;
    const post = parseMarkdownFile(raw, "fallback");
    expect(post.title).toBe("Test Article");
    expect(post.slug).toBe("test-article");
    expect(post.category).toBe("problem");
    expect(post.body).toContain("## Hello");
  });
});
