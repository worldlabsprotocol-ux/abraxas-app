import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "For businesses | Abraxas",
  description:
    "Add private verification to your product. Request eligibility results without collecting more personal information than necessary.",
  path: "/integrate",
});

export default function IntegrateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
