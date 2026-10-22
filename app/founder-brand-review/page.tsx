import type { Metadata } from "next";
import "./founder-brand-review.css";
import { FounderBrandReviewClient } from "./FounderBrandReviewClient";

export const metadata: Metadata = {
  title: "Founder brand review (internal)",
  robots: { index: false, follow: false },
};

export default function FounderBrandReviewPage() {
  return <FounderBrandReviewClient />;
}
