import { Suspense } from "react";
import { RedesignHome } from "@/components/redesign/RedesignHome";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Abraxas | RWA Verification App — Real World Asset Tokenization",
  description:
    "The RWA website for real world asset tokenization — verification infrastructure, reusable asset verification, and blockchain verification for tokenized real-world assets. Built for tokenization companies and institutional RWA.",
  path: "/",
});

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <RedesignHome />
    </Suspense>
  );
}
