import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Mainnet Readiness | Institutional RWA & RWA Compliance. Abraxas",
  description:
    "Honest mainnet gates for real-world assets. blockchain verification, asset verification, and RWA compliance on the path to production-grade real world asset tokenization.",
  path: "/mainnet",
});

export default function MainnetLayout({ children }: { children: React.ReactNode }) {
  return children;
}
