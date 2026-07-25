import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "RWA Blog | Real World Asset Tokenization & Verification",
  description:
    "Articles on real world asset tokenization, RWA infrastructure, tokenization companies, digital asset verification, and reusable verification for institutional RWA.",
  path: "/blog",
});

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
