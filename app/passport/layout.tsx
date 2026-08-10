import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Abraxas Passport | Verify once. Prove what matters.",
  description:
    "Verify once and receive a reusable Abraxas Passport. Share signed eligibility outcomes with approved partners—designed for minimum necessary disclosure.",
  path: "/passport",
});

export default function PassportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
