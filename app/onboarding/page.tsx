import { redirect } from "next/navigation";
import { CANONICAL_SANDBOX_STUDIO_PATH } from "@/lib/integrate/partnerJourney";

export default function OnboardingAliasPage() {
  redirect(`${CANONICAL_SANDBOX_STUDIO_PATH}?source=onboarding`);
}
