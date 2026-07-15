// FILE: lib/content/types.ts

export type BlogCategory = "problem" | "proof" | "product" | "partnerships" | "founder" | "template";

export interface ContentFrontmatter {
  title: string;
  description: string;
  category: BlogCategory;
  date: string;
  slug: string;
  author?: string;
  readingTime?: string;
  republishNote?: string;
  draft?: boolean;
}

export interface ContentPost extends ContentFrontmatter {
  body: string;
}

export const BLOG_CATEGORY_LABELS: Record<BlogCategory, string> = {
  problem: "Problem",
  proof: "Proof",
  product: "Product",
  partnerships: "Partnerships",
  founder: "From the builder",
  template: "Template",
};
