// FILE: app/auth/signin/page.tsx
// Auth is not implemented yet — redirects to terminal.
import { redirect } from "next/navigation";

export default function SignInPage() {
  redirect("/terminal");
}
