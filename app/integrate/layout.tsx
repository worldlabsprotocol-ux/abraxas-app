import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Integrate RWA Infrastructure | Asset Tokenization Platform. Abraxas",
  description:
    "Embed reusable verification for tokenization companies. RWA infrastructure, digital asset verification, and RWA compliance without rebuilding KYC on every asset tokenization platform.",
  path: "/integrate",
});

export default function IntegrateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
