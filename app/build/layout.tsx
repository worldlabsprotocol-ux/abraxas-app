import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Tokenize Real-World Assets | Asset Tokenization Platform. Abraxas",
  description:
    "Start real world asset tokenization with verification first. the RWA app path for asset verification, Wyoming structures, and tokenized real-world assets on-chain.",
  path: "/build",
});

export default function BuildLayout({ children }: { children: React.ReactNode }) {
  return children;
}
