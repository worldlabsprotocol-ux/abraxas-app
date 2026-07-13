import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cielo Verified Rate — Hospitality pilot",
  description:
    "Cielo Sunrise reference loop: sign in, approve minimum proof, complete verified guest eligibility. Genesis pilot — USDC settles on Sui.",
  openGraph: {
    title: "Cielo Verified Rate · Abraxas",
    description:
      "Live hospitality pilot on Cielo Sunrise — reusable guest verification with consent receipts.",
    type: "website",
  },
};

export default function CieloVerifiedRateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
