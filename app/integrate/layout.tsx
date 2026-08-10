import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Build with Abraxas | Integrate eligibility infrastructure",
  description:
    "Designed to reduce repeated identity collection. Integrate signed, revocable eligibility decisions with Partner Flow, APIs, and audit-ready receipts.",
  path: "/integrate",
});

export default function IntegrateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
