// FILE: app/identity/page.tsx
// This used to be a separate, duplicate implementation of the same
// Veriff verification flow that /passport has. Keeping two copies of
// the same logic is exactly how the in-context SDK fix almost didn't
// reach this page too, one redirect here means there's only one real
// implementation to maintain, on /passport.
import { redirect } from "next/navigation";

export default function IdentityPage() {
  redirect("/passport");
}
