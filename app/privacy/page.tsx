import { redirect } from "next/navigation";

/** Legacy /privacy path — canonical policy lives at /legal/privacy. */
export default function PrivacyRedirectPage() {
  redirect("/legal/privacy");
}
