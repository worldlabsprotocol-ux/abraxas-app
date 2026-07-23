import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Abraxas Passport | Reusable Verification for Real-World Assets",
  description:
    "Verify once for tokenized real-world assets. digital asset verification, blockchain verification, and portable proof for institutional RWA workflows.",
  path: "/passport",
});

export default function PassportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
