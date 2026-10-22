import { redirect } from "next/navigation";

/** Retired presentation — minimal visual draft lives at /internal/visual-draft */
export default function FounderBrandReviewRedirect() {
  redirect("/internal/visual-draft");
}
