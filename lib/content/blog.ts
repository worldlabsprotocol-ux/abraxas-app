// FILE: lib/content/blog.ts
// Blog + founder content loader (server-only).

import fs from "fs";
import path from "path";
import { parseMarkdownFile } from "./parseMarkdown";
import type { BlogCategory, ContentPost } from "./types";

const CONTENT_DIR = path.join(process.cwd(), "content", "blog");
const FOUNDER_DIR = path.join(process.cwd(), "content", "founder");

function loadDir(dir: string): ContentPost[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter(f => f.endsWith(".md"))
    .map(file => {
      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      const slug = file.replace(/\.md$/, "");
      return parseMarkdownFile(raw, slug);
    })
    .filter(p => !p.draft);
}

export function getAllBlogPosts(): ContentPost[] {
  const posts = [...loadDir(CONTENT_DIR), ...loadDir(FOUNDER_DIR)];
  return posts.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

export function getBlogPost(slug: string): ContentPost | null {
  for (const dir of [CONTENT_DIR, FOUNDER_DIR]) {
    const filePath = path.join(dir, `${slug}.md`);
    if (fs.existsSync(filePath)) {
      return parseMarkdownFile(fs.readFileSync(filePath, "utf8"), slug);
    }
  }
  return null;
}

export function getBlogSlugs(): string[] {
  return getAllBlogPosts().map(p => p.slug);
}

export function getPostsByCategory(category: BlogCategory): ContentPost[] {
  return getAllBlogPosts().filter(p => p.category === category);
}

export function getFounderPosts(): ContentPost[] {
  return loadDir(FOUNDER_DIR);
}
