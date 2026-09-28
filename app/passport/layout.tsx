import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Abraxas Passport | Reusable private eligibility",
  description:
    "Verify once. Carry reusable eligibility in your Abraxas Passport. Partners receive a signed policy result, not your underlying documents.",
  path: "/passport",
});

export default function PassportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
