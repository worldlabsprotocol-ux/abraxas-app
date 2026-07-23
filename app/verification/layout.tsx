import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "RWA Verification Layer | Digital Asset Verification. Abraxas",
  description:
    "Production scoreboard for the RWA verification app. asset verification, blockchain verification, and reusable verification infrastructure for tokenized real-world assets.",
  path: "/verification",
});

export default function VerificationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
